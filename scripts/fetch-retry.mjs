// Both prefetch scripts hit a remote API/CDN hundreds of times per run, where
// a stray ECONNRESET or a rate-limit response is normal background noise, not
// a real failure. Retrying those (with backoff) keeps the "crash on failure"
// behavior meaningful — it now means "this genuinely didn't work," not "one
// packet got dropped."

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(url, options = {}) {
  const { retries = 4, retry_delay_ms = 500, ...init } = options;

  let last_error;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || !RETRYABLE_STATUS.has(res.status)) return res;
      last_error = new Error(`${res.status} ${res.statusText}`);
    } catch (err) {
      last_error = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, retry_delay_ms * 2 ** attempt));
    }
  }
  throw last_error;
}
