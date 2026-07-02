// Google Maps service — loads the JS SDK once, exposes Places + Directions.
// UI components must NOT import from @googlemaps/js-api-loader directly.

import { config } from "./config";

declare global {
  interface Window {
    google: typeof google;
    __cgMapsLoading?: Promise<void>;
  }
}

// Loads the Maps JS API exactly once across the whole app lifetime.
export async function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.maps) return;

  if (window.__cgMapsLoading) return window.__cgMapsLoading;

  window.__cgMapsLoading = new Promise<void>((resolve, reject) => {
    if (!config.googleMapsKey) {
      console.warn("[Maps] NEXT_PUBLIC_GOOGLE_MAPS_KEY not set — Maps features disabled");
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsKey}&libraries=places&language=en&region=IN`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return window.__cgMapsLoading;
}

export function mapsReady(): boolean {
  return typeof window !== "undefined" && !!window.google?.maps;
}

// ── Places Autocomplete ─────────────────────────────────────────────────────

export interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface PlaceDetail {
  place_id: string;
  formatted_address: string;
  name: string;
  lat: number;
  lng: number;
}

let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;

function getAutocompleteService(): google.maps.places.AutocompleteService {
  if (!autocompleteService) {
    autocompleteService = new window.google.maps.places.AutocompleteService();
  }
  return autocompleteService;
}

function getPlacesService(): google.maps.places.PlacesService {
  if (!placesService) {
    // PlacesService needs a DOM element or map instance
    const el = document.createElement("div");
    placesService = new window.google.maps.places.PlacesService(el);
  }
  return placesService;
}

export async function getPlacePredictions(
  input: string,
  signal?: AbortSignal,
): Promise<PlacePrediction[]> {
  if (!input.trim() || input.length < 2) return [];
  if (!mapsReady()) return [];

  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }

    getAutocompleteService().getPlacePredictions(
      { input, componentRestrictions: { country: "in" }, types: ["geocode", "establishment"] },
      (predictions, status) => {
        if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          resolve(predictions.map(p => ({
            place_id: p.place_id,
            description: p.description,
            main_text: p.structured_formatting.main_text,
            secondary_text: p.structured_formatting.secondary_text,
          })));
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Places API: ${status}`));
        }
      },
    );
  });
}

export async function getPlaceDetail(placeId: string): Promise<PlaceDetail> {
  if (!mapsReady()) throw new Error("Google Maps not loaded");

  return new Promise((resolve, reject) => {
    getPlacesService().getDetails(
      { placeId, fields: ["place_id", "formatted_address", "name", "geometry"] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          resolve({
            place_id: place.place_id ?? placeId,
            formatted_address: place.formatted_address ?? "",
            name: place.name ?? "",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        } else {
          reject(new Error(`Place detail: ${status}`));
        }
      },
    );
  });
}

// ── Directions ──────────────────────────────────────────────────────────────

export interface RouteResult {
  distance_m: number;
  duration_s: number;
  duration_traffic_s?: number;
  polyline: string;           // encoded polyline
  waypoint_order: number[];
  legs: RouteLeg[];
}

export interface RouteLeg {
  start_address: string;
  end_address: string;
  distance_m: number;
  duration_s: number;
}

export async function getDirections(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  waypoints?: Array<{ lat: number; lng: number } | string>,
): Promise<RouteResult> {
  if (!mapsReady()) throw new Error("Google Maps not loaded");

  const ds = new window.google.maps.DirectionsService();
  const toWaypoint = (w: { lat: number; lng: number } | string): google.maps.DirectionsWaypoint => ({
    location: typeof w === "string" ? w : new window.google.maps.LatLng(w.lat, w.lng),
    stopover: true,
  });

  return new Promise((resolve, reject) => {
    ds.route(
      {
        origin: typeof origin === "string" ? origin : new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: typeof destination === "string" ? destination : new window.google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypoints?.map(toWaypoint) ?? [],
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: window.google.maps.TrafficModel.BEST_GUESS },
        region: "IN",
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const totalDist = route.legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0);
          const totalDur  = route.legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0);
          const totalDurT = route.legs.reduce((s, l) => s + (l.duration_in_traffic?.value ?? l.duration?.value ?? 0), 0);
          resolve({
            distance_m: totalDist,
            duration_s: totalDur,
            duration_traffic_s: totalDurT,
            polyline: route.overview_polyline,
            waypoint_order: route.waypoint_order,
            legs: route.legs.map(l => ({
              start_address: l.start_address,
              end_address: l.end_address,
              distance_m: l.distance?.value ?? 0,
              duration_s: l.duration?.value ?? 0,
            })),
          });
        } else {
          reject(new Error(`Directions API: ${status}`));
        }
      },
    );
  });
}

// Geocode a free-text string to lat/lng (fallback when no place_id available)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  if (!mapsReady()) throw new Error("Google Maps not loaded");

  return new Promise((resolve, reject) => {
    const gc = new window.google.maps.Geocoder();
    gc.geocode({ address, region: "IN" }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        reject(new Error(`Geocode: ${status}`));
      }
    });
  });
}
