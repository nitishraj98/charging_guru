const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Read access token from the cg_access cookie (non-HttpOnly, readable by JS).
// The cg_refresh cookie is HttpOnly and never touched by JS.
function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )cg_access=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let refreshing: Promise<boolean> | null = null;

// Calls the BFF /api/auth refresh action which rotates both cookies server-side.
async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (auth) {
    const tok = getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, init, auth, false);
    }
    // Refresh failed — BFF already cleared cookies
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail ?? res.statusText), { status: res.status, body: err });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth (routed via BFF /api/auth so tokens stay in HttpOnly cookies) ────────
async function bffPost<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  const r = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.detail ?? r.statusText), { status: r.status, body: data });
  return data as T;
}

export const auth = {
  otpRequest: (phone: string) =>
    bffPost<{ request_id: string; debug_code?: string }>("otp-request", { phone }),
  otpVerify: (request_id: string, code: string) =>
    bffPost<{ ok: true }>("otp-verify", { request_id, code }),
  logout: () => bffPost<{ ok: true }>("logout"),
  me: () => request<User>("/api/v1/users/me"),
};

// ── Stations ──────────────────────────────────────────────────────────────────
export const stations = {
  nearby: (lat: number, lng: number, radius_km = 10) =>
    request<Station[]>(`/api/v1/stations?lat=${lat}&lng=${lng}&radius_km=${radius_km}`, {}, false),
  get: (id: string) => request<Station>(`/api/v1/stations/${id}`, {}, false),
  slots: (chargerId: string, date?: string) => {
    const q = date ? `?date=${date}` : "";
    return request<Slot[]>(`/api/v1/chargers/${chargerId}/slots${q}`, {}, false);
  },
  stats: (id: string) => request<StationStats>(`/api/v1/stations/${id}/stats`, {}, false),
  reviews: {
    list: (stationId: string, page = 1, per_page = 20) =>
      request<PagedResult<Review>>(`/api/v1/stations/${stationId}/reviews?page=${page}&per_page=${per_page}`, {}, false),
    create: (stationId: string, bookingId: string, rating: number, comment?: string) =>
      request<Review>(`/api/v1/stations/${stationId}/reviews?booking_id=${bookingId}`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment || null }),
      }),
  },
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookings = {
  create: (charger_id: string, slot_start: string, duration_minutes = 60) =>
    request<Booking>("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({ charger_id, slot_start, duration_minutes }),
    }),
  list: () => request<Booking[]>("/api/v1/bookings"),
  get: (id: string) => request<Booking>(`/api/v1/bookings/${id}`),
  getQr: (id: string) => request<{ qr_token: string }>(`/api/v1/bookings/${id}/qr`),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehicles = {
  list: () => request<Vehicle[]>("/api/v1/vehicles"),
  create: (body: VehicleCreateRequest) =>
    request<Vehicle>("/api/v1/vehicles", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<VehicleCreateRequest>) =>
    request<Vehicle>(`/api/v1/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  setDefault: (id: string) =>
    request<Vehicle>(`/api/v1/vehicles/${id}/default`, { method: "POST" }),
  delete: (id: string) =>
    request<void>(`/api/v1/vehicles/${id}`, { method: "DELETE" }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  createOrder: (booking_id: string) =>
    request<PaymentOrder>("/api/v1/payments/order", {
      method: "POST",
      body: JSON.stringify({ booking_id }),
    }),
  verify: (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    request<PaymentVerify>("/api/v1/payments/verify", {
      method: "POST",
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    }),
  getByBooking: (booking_id: string) =>
    request<PaymentRecord>(`/api/v1/payments/booking/${booking_id}`),
  refund: (booking_id: string) =>
    request<Booking>(`/api/v1/payments/${booking_id}/refund`, { method: "POST" }),
};

// ── Route planning ────────────────────────────────────────────────────────────
export const routes = {
  plan: (body: RoutePlanRequest) => {
    const apiBody: RoutePlanApiBody = {
      source: resolveCoords(body.source),
      destination: resolveCoords(body.destination),
      vehicle_id: body.vehicle_id,
      soc_percent: body.battery_percent,
    };
    return request<RoutePlanResponse>("/api/v1/routes/plan", { method: "POST", body: JSON.stringify(apiBody) }, false);
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string; phone: string; full_name?: string; email?: string; roles?: string[];
  reward_points: number; membership_tier: "FREE" | "SILVER" | "GOLD"; referral_code: string;
}
export interface Charger {
  id: string; label: string; charger_type: string; connector_type: string;
  power_kw: number; price_per_kwh: number; status: string;
}
export interface Station {
  id: string; name: string; address: string; city?: string; lat: number; lng: number;
  status: string; rating_avg: number; rating_count: number; amenities: string[];
  chargers: Charger[]; distance_km?: number;
}
export interface Slot { slot_start: string; slot_end: string; available: boolean; }
export interface Review {
  id: string; user_id: string; rating: number; comment?: string | null; created_at: string;
}
export interface PagedResult<T> { items: T[]; total: number; page: number; per_page: number; pages: number; }
export interface StationStats { sessions_today: number; uptime_pct: number; }
export interface Booking {
  id: string; charger_id: string; station_id?: string; status: string; slot_start: string;
  slot_end: string; amount: number; qr_jti?: string;
  hold_expires_at?: string;
  charger?: Charger; station?: Station;
}
export interface PaymentOrder {
  razorpay_order_id: string; amount: number; currency: string; status: string;
}
export interface PaymentVerify {
  booking_id: string; booking_status: string; qr_token?: string;
}
export interface PaymentRecord {
  id: string; booking_id: string; amount: number; status: string;
  razorpay_order_id?: string; razorpay_payment_id?: string;
}
export interface Vehicle {
  id: string; brand: string; model: string;
  battery_kwh: number; range_km?: number;
  connector_type: string; is_default: boolean;
}
export interface VehicleCreateRequest {
  brand: string; model: string; battery_kwh: number;
  range_km?: number; connector_type: string;
}

// ── Route planning types ───────────────────────────────────────────────────────
export const VEHICLES: VehicleOption[] = [
  { id: "mg_zs_ev", label: "MG ZS EV",       range_km: 461, battery_kwh: 50.3, efficiency_km_per_kwh: 6.8 },
  { id: "tata_nexon", label: "Tata Nexon EV", range_km: 465, battery_kwh: 40.5, efficiency_km_per_kwh: 7.0 },
  { id: "hyundai_kona", label: "Hyundai Kona", range_km: 452, battery_kwh: 39.2, efficiency_km_per_kwh: 6.6 },
  { id: "byd_atto3", label: "BYD Atto 3",    range_km: 521, battery_kwh: 60.5, efficiency_km_per_kwh: 7.2 },
  { id: "tata_tigor", label: "Tata Tigor EV", range_km: 306, battery_kwh: 26.0, efficiency_km_per_kwh: 6.2 },
  { id: "mahindra_xuv", label: "Mahindra XUV400", range_km: 456, battery_kwh: 39.4, efficiency_km_per_kwh: 6.9 },
];

export interface VehicleOption {
  id: string; label: string; range_km: number; battery_kwh: number; efficiency_km_per_kwh: number;
}
// City name → approx lat/lng for popular Indian EV route cities
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "delhi":      { lat: 28.61, lng: 77.21 }, "noida":      { lat: 28.57, lng: 77.32 },
  "agra":       { lat: 27.18, lng: 78.01 }, "jaipur":     { lat: 26.91, lng: 75.79 },
  "udaipur":    { lat: 24.58, lng: 73.69 }, "ajmer":      { lat: 26.45, lng: 74.64 },
  "chittorgarh":{ lat: 24.88, lng: 74.62 }, "mathura":    { lat: 27.49, lng: 77.67 },
  "mumbai":     { lat: 19.08, lng: 72.88 }, "pune":       { lat: 18.52, lng: 73.86 },
  "surat":      { lat: 21.17, lng: 72.83 }, "bangalore":  { lat: 12.97, lng: 77.59 },
  "mysore":     { lat: 12.30, lng: 76.65 }, "mandya":     { lat: 12.52, lng: 76.89 },
  "chennai":    { lat: 13.08, lng: 80.27 }, "hyderabad":  { lat: 17.39, lng: 78.49 },
  "vellore":    { lat: 12.92, lng: 79.13 }, "kurnool":    { lat: 15.83, lng: 78.04 },
  "patna":      { lat: 25.59, lng: 85.13 }, "varanasi":   { lat: 25.32, lng: 83.00 },
  "prayagraj":  { lat: 25.44, lng: 81.84 }, "kanpur":     { lat: 26.46, lng: 80.35 },
  "lucknow":    { lat: 26.85, lng: 80.95 }, "kolkata":    { lat: 22.57, lng: 88.36 },
  "ahmedabad":  { lat: 23.03, lng: 72.59 }, "indore":     { lat: 22.72, lng: 75.86 },
  "bhopal":     { lat: 23.26, lng: 77.41 }, "nagpur":     { lat: 21.15, lng: 79.08 },
};

function resolveCoords(city: string): { lat: number; lng: number } {
  return CITY_COORDS[city.toLowerCase()] ?? { lat: 28.61, lng: 77.21 };
}

export interface RoutePlanRequest {
  source: string; destination: string;
  vehicle_id: string; battery_percent: number;
}

// Wire shape sent to the FastAPI /routes/plan endpoint (coords + soc_percent)
interface RoutePlanApiBody {
  source: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  vehicle_id: string;
  soc_percent: number;
}
export interface RecommendedStop {
  station_id?: string;
  station_name: string;
  city: string;
  distance_from_start_km: number;
  arrival_battery_pct: number;
  charge_to_pct: number;
  charge_time_min: number;
  charger_power_kw: number;
  price_per_kwh: number;
  availability: "available" | "limited" | "unavailable";
  charger_id?: string;
  connector_type: string;
}
export interface RoutePlanResponse {
  source: string; destination: string;
  total_distance_km: number;
  estimated_duration_min: number;
  stops_required: number;
  recommended_stops: RecommendedStop[];
  route_waypoints: Array<{ city: string; distance_km: number; is_stop: boolean }>;
  total_charging_cost_paise: number;
  total_charging_time_min: number;
}
// ── Rewards ───────────────────────────────────────────────────────────────────
export type MembershipTier = "FREE" | "SILVER" | "GOLD";
export interface RewardSummary {
  points: number; tier: MembershipTier; next_tier: MembershipTier | null;
  points_to_next: number; referral_code: string;
}
export interface RewardTransaction {
  id: string; type: "EARNED" | "REDEEMED" | "EXPIRED";
  points: number; description: string; created_at: string;
}
export const rewards = {
  summary: () => request<RewardSummary>("/api/v1/rewards/summary"),
  history: () => request<RewardTransaction[]>("/api/v1/rewards/history"),
  redeem: (points: number) =>
    request<RewardTransaction>("/api/v1/rewards/redeem", { method: "POST", body: JSON.stringify({ points }) }),
};

// ── Membership ───────────────────────────────────────────────────────────────
export interface MembershipTierInfo {
  tier: MembershipTier; price_paise: number; points_multiplier: number; discount_pct: number;
}
export interface MembershipOrder {
  id: string; tier: MembershipTier; razorpay_order_id: string; amount: number; created_at: string;
}
export const membership = {
  tiers: () => request<MembershipTierInfo[]>("/api/v1/membership/tiers", {}, false),
  me: () => request<MembershipTierInfo>("/api/v1/membership/me"),
  createOrder: (tier: MembershipTier) =>
    request<MembershipOrder>("/api/v1/membership/order", { method: "POST", body: JSON.stringify({ tier }) }),
  verify: (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string) =>
    request<MembershipTierInfo>("/api/v1/membership/verify", {
      method: "POST",
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    }),
};
