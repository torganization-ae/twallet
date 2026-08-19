import { API_BASE_URL, APP_ENV, APP_NAME, APP_VERSION, NO_BACKEND } from '../../config';
import { bucketKey } from '../../util/circuit-breaker';
import { fetchJson, fetchWithRetry, fetchWithTimeout, handleFetchErrors } from '../../util/fetch';
import { getEnvironment } from '../environment';
import { rememberBackendUrl } from './backendHostMark';
import { BACKEND_NETWORK_ERROR_ASSETS, reportBackendNetworkError } from './backendNetworkError';
import { getClientId } from './other';

const BAD_REQUEST_CODE = 400;

/** Thrown instead of hitting `API_BASE_URL` with a path the backend doesn't serve yet. */
export class BackendDisabledError extends Error {
  constructor(path: string) {
    super(`Backend is disabled, skipped ${path}`);
  }
}

// Paths served while `NO_BACKEND` is on. Extend as the API grows;
// `NO_BACKEND = false` lifts the restriction entirely.
const SUPPORTED_PATHS_RE = /^\/(assets|currency-rates|prices\/)/;

function isPathSupported(path: string) {
  return !NO_BACKEND || SUPPORTED_PATHS_RE.test(path);
}

function reportAssetsFailure(path: string, err: unknown) {
  if (err instanceof BackendDisabledError) return;
  if (path === '/assets' || path.startsWith('/assets?') || path.startsWith('/assets/')) {
    reportBackendNetworkError(BACKEND_NETWORK_ERROR_ASSETS);
  }
}

export async function callBackendPost<T>(path: string, data: AnyLiteral, options?: {
  authToken?: string;
  isAllowBadRequest?: boolean;
  method?: string;
  shouldRetry?: boolean;
  timeout?: number;
}): Promise<T> {
  if (!isPathSupported(path)) {
    throw new BackendDisabledError(path);
  }

  const {
    authToken, isAllowBadRequest, method, shouldRetry, timeout,
  } = options ?? {};

  const url = new URL(`${API_BASE_URL}${path}`);
  rememberBackendUrl(url);

  const init: RequestInit = {
    method: method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(NO_BACKEND ? undefined : getBackendHeaders()),
      ...(authToken && { 'X-Auth-Token': authToken }),
    },
    body: JSON.stringify(data),
  };

  try {
    const response = shouldRetry
      ? await fetchWithRetry(url, init, {
        timeouts: timeout,
        shouldSkipRetryFn: (message) => !message?.includes('signal is aborted'),
        // Per-endpoint bucket: a slow /assets must not gate /swap or /currency-rates.
        bucketKey: bucketKey(url, { includePathPrefix: true }),
      })
      : await fetchWithTimeout(url.toString(), init, timeout);

    await handleFetchErrors(response, isAllowBadRequest ? [BAD_REQUEST_CODE] : undefined);
    if (response.url) {
      rememberBackendUrl(response.url);
    }

    return await response.json();
  } catch (err) {
    reportAssetsFailure(path, err);
    throw err;
  }
}

export function callBackendGet<T extends AnyLiteral>(path: string, data?: AnyLiteral, headers?: HeadersInit) {
  if (!isPathSupported(path)) {
    return Promise.reject(new BackendDisabledError(path));
  }

  const url = new URL(`${API_BASE_URL}${path}`);
  rememberBackendUrl(url);

  return fetchJson<T>(url, data, {
    headers: {
      ...headers,
      ...(NO_BACKEND ? undefined : getBackendHeaders()),
    },
  }, {
    bucketKey: bucketKey(url, { includePathPrefix: true }),
  }).catch((err) => {
    reportAssetsFailure(path, err);
    throw err;
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
