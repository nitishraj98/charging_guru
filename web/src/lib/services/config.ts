// Central config — reads from environment variables.
// Never hard-code keys here; they must live in .env.local
export const config = {
  apiBase:          process.env.NEXT_PUBLIC_API_URL          ?? "http://localhost:8000",
  googleMapsKey:    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY  ?? "",
  razorpayKeyId:    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID  ?? "",
  openChargeMapKey: process.env.NEXT_PUBLIC_OCM_KEY          ?? "",
  isDev:            process.env.NODE_ENV !== "production",
} as const;
