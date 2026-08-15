import {
  APP_ENV, APP_NAME, APP_VERSION, BRILLIANT_API_BASE_URL, NO_BACKEND, PRICES_API_BASE_URL,
} from '../../config';
import { bucketKey } from '../../util/circuit-breaker';
import { fetchJson, fetchWithRetry, fetchWithTimeout, handleFetchErrors } from '../../util/fetch';
import { getEnvironment } from '../environment';
import { getClientId } from './other';

const BAD_REQUEST_CODE = 400;

/** Thrown instead of hitting `BRILLIANT_API_BASE_URL` while `NO_BACKEND` is on. */
export class BackendDisabledError extends Error {
  constructor(path: string) {
    super(`Backend is disabled, skipped ${path}`);
  }
}

// Prices, token list and currency rates are also served by our own backend (`PRICES_API_BASE_URL`),
// with the same contract — those paths go there and stay alive while `NO_BACKEND` cuts the rest.
const PRICES_PATH_RE = /^\/(assets|currency-rates|prices\/)/;

/** The host to send `path` to, or `undefined` when no reachable backend serves it. */
function getBaseUrl(path: string) {
  if (PRICES_API_BASE_URL && PRICES_PATH_RE.test(path)) {
    return PRICES_API_BASE_URL;
  }

  return NO_BACKEND ? undefined : BRILLIANT_API_BASE_URL;
}

export async function callBackendPost<T>(path: string, data: AnyLiteral, options?: {
  authToken?: string;
  isAllowBadRequest?: boolean;
  method?: string;
  shouldRetry?: boolean;
  timeout?: number;
}): Promise<T> {
  const baseUrl = getBaseUrl(path);
  if (!baseUrl) {
    throw new BackendDisabledError(path);
  }

  const {
    authToken, isAllowBadRequest, method, shouldRetry, timeout,
  } = options ?? {};

  const url = new URL(`${baseUrl}${path}`);

  const init: RequestInit = {
    method: method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(baseUrl === BRILLIANT_API_BASE_URL && getBackendHeaders()),
      ...(authToken && { 'X-Auth-Token': authToken }),
    },
    body: JSON.stringify(data),
  };

  const response = shouldRetry
    ? await fetchWithRetry(url, init, {
      timeouts: timeout,
      shouldSkipRetryFn: (message) => !message?.includes('signal is aborted'),
      // Per-endpoint bucket: a slow /assets must not gate /swap or /currency-rates.
      bucketKey: bucketKey(url, { includePathPrefix: true }),
    })
    : await fetchWithTimeout(url.toString(), init, timeout);

  await handleFetchErrors(response, isAllowBadRequest ? [BAD_REQUEST_CODE] : undefined);

  return response.json();
}

export function callBackendGet<T extends AnyLiteral>(path: string, data?: AnyLiteral, headers?: HeadersInit) {
  const baseUrl = getBaseUrl(path);
  if (!baseUrl) {
    return Promise.reject(new BackendDisabledError(path)) as Promise<T>;
  }

  const url = new URL(`${baseUrl}${path}`);

  return fetchJson<T>(url, data, {
    headers: {
      ...headers,
      ...(baseUrl === BRILLIANT_API_BASE_URL && getBackendHeaders()),
    },
  }, {
    bucketKey: bucketKey(url, { includePathPrefix: true }),
  });
}

export function getBackendHeaders() {
  return {
    ...getEnvironment().apiHeaders,
    'X-App-ClientID': getClientId(),
    ...(APP_VERSION && APP_VERSION !== 'undefined' && { 'X-App-Version': APP_VERSION }),
    'X-App-Env': APP_ENV,
    'X-App-Name': APP_NAME,
  } as Record<string, string>;
}

export function addBackendHeadersToSocketUrl(url: URL) {
  for (const [name, value] of Object.entries(getBackendHeaders())) {
    const match = /^X-App-(.+)$/i.exec(name);
    if (match) {
      url.searchParams.append(match[1].toLowerCase(), value);
    }
  }
}

export async function fetchBackendReferrer() {
  if (NO_BACKEND) return undefined;

  return (await callBackendGet<{ referrer?: string }>('/referrer/get')).referrer;
}
