// Client-side device fingerprint sent at login so the backend can show a
// real "Chrome on Windows" / "Safari on iPhone" label per session, instead
// of a bare session UUID. Purely descriptive — never used for auth itself.
export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
}

const DEVICE_ID_KEY = "cg_device_id";

function detectBrowserAndOs(ua: string): { browser: string; os: string; platform: string } {
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  let platform = "web";
  if (/Windows/.test(ua)) { os = "Windows"; platform = "windows"; }
  else if (/iPhone/.test(ua)) { os = "iPhone"; platform = "ios"; }
  else if (/iPad/.test(ua)) { os = "iPad"; platform = "ios"; }
  else if (/Android/.test(ua)) { os = "Android"; platform = "android"; }
  else if (/Mac OS X/.test(ua)) { os = "macOS"; platform = "macos"; }
  else if (/Linux/.test(ua)) { os = "Linux"; platform = "linux"; }

  return { browser, os, platform };
}

// Persist a random id per browser (localStorage) so returning-device
// detection is possible later — mirrors how most "your devices" pages work.
function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

// Chromium's User-Agent Client Hints expose a real marketing "model" string
// (e.g. "Pixel 7", "moto g power") — but ONLY on Android. Per spec it's
// hardcoded to an empty string on every desktop OS (Windows/macOS/Linux) and
// isn't implemented at all in Safari, so there's no equivalent for laptops
// or iPhones — this is a browser-enforced anti-fingerprinting limit, not
// something we can query around.
interface UADataWithHints {
  getHighEntropyValues(hints: string[]): Promise<{ model?: string }>;
}

async function detectAndroidModel(): Promise<string | null> {
  const uaData = (navigator as Navigator & { userAgentData?: UADataWithHints }).userAgentData;
  if (!uaData) return null;
  try {
    const { model } = await uaData.getHighEntropyValues(["model"]);
    return model || null;
  } catch {
    return null;
  }
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (typeof navigator === "undefined") {
    return { id: "", name: "Unknown device", platform: "unknown" };
  }
  const { browser, os, platform } = detectBrowserAndOs(navigator.userAgent);
  let name = `${browser} on ${os}`;
  if (platform === "android") {
    const model = await detectAndroidModel();
    if (model) name = `${model} (${browser})`;
  }
  return { id: getOrCreateDeviceId(), name, platform };
}
