import { API_BASE_URL } from '../config';
import { pause } from './schedulers';

type FetchInput = string | URL | Request;

type CleanupAbortSignal = AbortSignal & { cleanup?: () => void };

const DEFAULT_TIMEOUT_MS = 30000;

// One attempt only — retrying 429s amplifies the ban window. Next poll cycle will try again.
// Applies to every throttled origin: an aggressive retry loop is what turns a transient rate-limit
// into a sustained ban on both public toncenter and our own proxy (nexus per-IP guard).
const THROTTLED_RETRIES = 1;

// Per-origin policy. Public toncenter tolerates ~1 rps without an API key; our own proxy runs a
// per-IP token bucket that copes with a real wallet burst but still returns 429 + Retry-After when
// exceeded — so we serialize per origin and honour Retry-After from the response headers below.
type ThrottlePolicy = {
  /** Minimum spacing between requests. Zero = no artificial delay, only respect Retry-After. */
  minDelayMs: number;
  /** Used when a 429 comes back without a Retry-After header. */
  fallbackRetryAfterMs: number;
};

const TONCENTER_POLICY: ThrottlePolicy = { minDelayMs: 2000, fallbackRetryAfterMs: 15_000 };
const NEXUS_POLICY: ThrottlePolicy = { minDelayMs: 0, fallbackRetryAfterMs: 5_000 };

const throttlePolicies = new Map<string, ThrottlePolicy>([
  ['https://toncenter.com', TONCENTER_POLICY],
  ['https://testnet.toncenter.com', TONCENTER_POLICY],
  // Our own proxy: origin taken from config so a self-hosted deployment (API_BASE_URL override)
  // also gets serialization and Retry-After semantics, not just the default nexus host.
  ...safeOrigin(API_BASE_URL).map((origin): [string, ThrottlePolicy] => [origin, NEXUS_POLICY]),
]);

const throttledFetchers = new Map<string, ThrottledFetcher>();

export type ProviderFetchRetryPolicy = {
  retries: number;
  fallbackRetryAfterMs?: number;
};

export class ThrottledFetcher {
  private lastRequestAt: number | undefined;
  private nextAllowedAt = 0;
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly minDelayMs: number,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly onResult?: (isSuccess: boolean) => void,
  ) {}

  async fetch(input: FetchInput, init?: RequestInit, timeoutMs = this.timeoutMs): Promise<Response> {
    await this.throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeAbortSignals(init?.signal, controller.signal);

    try {
      const response = await fetch(input, {
        ...init,
        signal,
      });
      this.onResult?.(response.ok);
      return response;
    } catch (err) {
      this.onResult?.(false);
      throw err;
    } finally {
      clearTimeout(timeoutId);
      signal.cleanup?.();
    }
  }

  delayNextRequest(delayMs: number) {
    this.nextAllowedAt = Math.max(this.nextAllowedAt, Date.now() + delayMs);
  }

  private async throttle() {
    this.pending = this.pending.then(async () => {
      const now = Date.now();
      const sinceLastRequestMs = this.lastRequestAt === undefined ? undefined : now - this.lastRequestAt;
      const minDelayRemainingMs = sinceLastRequestMs === undefined
        ? 0
        : this.minDelayMs - sinceLastRequestMs;
      const explicitDelayRemainingMs = this.nextAllowedAt - now;
      const waitMs = Math.max(0, minDelayRemainingMs, explicitDelayRemainingMs);

      if (waitMs > 0) {
        await pause(waitMs);
      }

      this.lastRequestAt = Date.now();
      this.nextAllowedAt = this.lastRequestAt;
    });

    await this.pending;
  }
}

export async function fetchWithThrottledProvider(
  input: FetchInput,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const url = getUrl(input);
  if (!url || !shouldThrottleUrl(url)) {
    return new ThrottledFetcher(0, timeoutMs).fetch(input, init, timeoutMs);
  }

  const fetcher = getProviderFetcher(url.origin);
  const response = await fetcher.fetch(input, init, timeoutMs);
  adjustProviderDelay(url.origin, response);
  return response;
}

export function getProviderFetchRetryPolicy(input: FetchInput): ProviderFetchRetryPolicy | undefined {
  const url = getUrl(input);
  const policy = url && throttlePolicies.get(url.origin);
  if (!policy) {
    return undefined;
  }

  return {
    retries: THROTTLED_RETRIES,
    fallbackRetryAfterMs: policy.fallbackRetryAfterMs,
  };
}

export function getRetryAfterMs(headers: Pick<Headers, 'get'>) {
  const header = headers.get('Retry-After');
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const timestamp = Date.parse(header);
  if (!Number.isNaN(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return undefined;
}

export function resetThrottledProviderFetchers() {
  throttledFetchers.clear();
}

function shouldThrottleUrl(url: URL) {
  return throttlePolicies.has(url.origin);
}

function getProviderFetcher(origin: string) {
  let fetcher = throttledFetchers.get(origin);
  if (!fetcher) {
    const policy = throttlePolicies.get(origin) ?? TONCENTER_POLICY;
    fetcher = new ThrottledFetcher(policy.minDelayMs);
    throttledFetchers.set(origin, fetcher);
  }

  return fetcher;
}

function adjustProviderDelay(origin: string, response: Response) {
  if (response.status !== 429) {
    return;
  }

  const policy = throttlePolicies.get(origin) ?? TONCENTER_POLICY;
  const retryAfterMs = getRetryAfterMs(response.headers) ?? policy.fallbackRetryAfterMs;
  const fetcher = throttledFetchers.get(origin);
  if (!fetcher) {
    return;
  }

  fetcher.delayNextRequest(Math.max(policy.minDelayMs, retryAfterMs));
}

function safeOrigin(url: string): string[] {
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

function getUrl(input: FetchInput): URL | undefined {
  try {
    if (typeof input === 'string' || input instanceof URL) {
      return new URL(input.toString());
    }

    return new URL(input.url);
  } catch {
    return undefined;
  }
}

function mergeAbortSignals(
  signalA?: AbortSignal | null,
  signalB?: AbortSignal | null,
): CleanupAbortSignal {
  if (!signalA) {
    return signalB as CleanupAbortSignal;
  }

  if (!signalB) {
    return signalA as CleanupAbortSignal;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  if (signalA.aborted || signalB.aborted) {
    controller.abort();
  } else {
    signalA.addEventListener('abort', abort, { once: true });
    signalB.addEventListener('abort', abort, { once: true });
  }

  const signal = controller.signal as CleanupAbortSignal;
  signal.cleanup = () => {
    signalA.removeEventListener('abort', abort);
    signalB.removeEventListener('abort', abort);
  };

  return signal;
}
