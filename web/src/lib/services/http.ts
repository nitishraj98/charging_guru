// Shared HTTP primitive with retry, abort, and deduplication.
// All services must use fetchWithRetry instead of raw fetch.

const inflight = new Map<string, Promise<Response>>();

export interface FetchOptions extends RequestInit {
  retries?: number;       // default 2
  retryDelay?: number;    // ms, doubles per attempt
  dedupe?: boolean;       // deduplicate identical GET requests
  signal?: AbortSignal;
}

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  const { retries = 2, retryDelay = 400, dedupe = false, ...init } = opts;
  const key = `${init.method ?? "GET"}:${url}`;

  // Deduplicate concurrent identical GET requests
  if (dedupe && (init.method ?? "GET") === "GET" && inflight.has(key)) {
    return inflight.get(key)!;
  }

  async function attempt(n: number): Promise<Response> {
    try {
      const res = await fetch(url, init);
      if (!res.ok && n > 0 && res.status >= 500) {
        await delay(retryDelay * (retries - n + 1));
        return attempt(n - 1);
      }
      return res;
    } catch (err) {
      if (n > 0 && !isAbort(err)) {
        await delay(retryDelay * (retries - n + 1));
        return attempt(n - 1);
      }
      throw err;
    }
  }

  const promise = attempt(retries).finally(() => inflight.delete(key));
  if (dedupe && (init.method ?? "GET") === "GET") inflight.set(key, promise);
  return promise;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function isAbort(e: unknown) { return e instanceof DOMException && e.name === "AbortError"; }

// Typed JSON wrapper
export async function jsonFetch<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.detail ?? data.message ?? res.statusText), { status: res.status, body: data });
  return data as T;
}
