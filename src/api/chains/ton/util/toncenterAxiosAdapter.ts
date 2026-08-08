import type { AxiosAdapter, AxiosResponse } from 'axios';

import { fetchWithRetry } from '../../../../util/fetch';
import { getProviderFetchRetryPolicy } from '../../../../util/ThrottledFetcher';

/**
 * Routes `@ton/ton` HttpApi (axios) through the same throttled/retry path as the rest of the app.
 * Without this, `runMethod` / MFA polling bypasses ThrottledFetcher and stampedes public toncenter.
 */
export function createToncenterAxiosAdapter(): AxiosAdapter {
  return async (config) => {
    const url = resolveAxiosUrl(config);
    const method = (config.method ?? 'post').toUpperCase();
    const providerRetry = getProviderFetchRetryPolicy(url);

    const headers: Record<string, string> = {};
    const rawHeaders = config.headers;
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [key, value] of Object.entries(rawHeaders as Record<string, unknown>)) {
        if (value == undefined || typeof value === 'object') {
          continue;
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          headers[key] = String(value);
        }
      }
    }

    const response = await fetchWithRetry(url, {
      method,
      headers,
      body: typeof config.data === 'string' || config.data instanceof ArrayBuffer
        ? config.data
        : config.data !== undefined
          ? JSON.stringify(config.data)
          : undefined,
    }, {
      ...providerRetry,
      timeouts: typeof config.timeout === 'number' ? config.timeout : undefined,
      shouldSkipRetryFn: (_message, statusCode) => statusCode === 429,
    });

    const data = await response.json();
    const axiosResponse: AxiosResponse = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
      request: {},
    };
    return axiosResponse;
  };
}

function resolveAxiosUrl(config: { url?: string; baseURL?: string }) {
  if (config.url && /^https?:\/\//i.test(config.url)) {
    return config.url;
  }
  if (config.baseURL && config.url) {
    return new URL(config.url, config.baseURL).toString();
  }
  return config.url ?? config.baseURL ?? '';
}
