/*
 * This module is to be used instead of /src/util/environment.ts
 * when `window` is not available (e.g. in a web worker).
 */
import type { ApiInitArgs, ApiNetwork } from './types';

import {
  IS_AIR_APP,
  IS_EXTENSION,
} from '../config';

const ELECTRON_ORIGIN = 'file://';

export type AppEnvironment = ApiInitArgs & {
  isDappSupported?: boolean;
  isSseSupported?: boolean;
  apiHeaders?: AnyLiteral;
  byNetwork: Record<ApiNetwork, { toncenterKey?: string }>;
};

let environment: AppEnvironment;

function getAppOrigin(args: ApiInitArgs): string | undefined {
  if (args.isElectron) {
    return ELECTRON_ORIGIN;
  } else if (IS_AIR_APP || IS_EXTENSION) {
    return self?.origin;
  } else {
    return undefined;
  }
}

export function setEnvironment(args: ApiInitArgs) {
  const appOrigin = getAppOrigin(args);
  environment = {
    ...args,
    isDappSupported: true,
    isSseSupported: args.isElectron || IS_AIR_APP,
    apiHeaders: appOrigin ? { 'X-App-Origin': appOrigin } : {},
    byNetwork: {
      mainnet: {
        toncenterKey: undefined,
      },
      testnet: {
        toncenterKey: undefined,
      },
    },
  };
  return environment;
}

export function getEnvironment() {
  return environment;
}

// Hosts of our own proxies/backends that understand the `X-App-Origin` header
// and allow it in their CORS policy.
const OWN_API_HOSTS = ['mywallet.io'];

/**
 * Returns `apiHeaders` only when the target URL belongs to our own infra.
 * Public providers (toncenter.com, tonapi.io, Helius, ...) don't allow `X-App-Origin`
 * in the CORS preflight, so sending it to them breaks every request in CORS-enforcing
 * environments (web, iOS/Android WebView).
 */
export function getApiHeadersForUrl(url: string): AnyLiteral {
  try {
    const { hostname } = new URL(url);
    if (OWN_API_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      return environment.apiHeaders ?? {};
    }
  } catch {
    // Invalid URL — fall through to no headers
  }
  return {};
}
