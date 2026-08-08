import type { ApiBackendConfig } from '../types';

import Deferred from '../../util/Deferred';

let backendConfig: ApiBackendConfig | undefined;
const configDeferred = new Deferred();

export function setBackendConfigCache(config: ApiBackendConfig) {
  backendConfig = config;
  configDeferred.resolve();
}

/** Returns the config provided by the backend */
export async function getBackendConfigCache() {
  await configDeferred.promise;
  return backendConfig!;
}

/** Synchronous variant: returns the config only if it has already arrived, otherwise `undefined`. */
export function getBackendConfigCacheSync() {
  return backendConfig;
}

/**
 * Feature flag for the L1 retry-break (negative-verdict cache + EVM untrackable registry).
 * Reads synchronously; before the backend config arrives (or if it never does) this is `false`,
 * so the safe legacy behavior stays in force. Flipping the backend field kills it fleet-wide.
 */
export function getIsNegVerdictCacheEnabled() {
  return backendConfig?.isNegVerdictCacheEnabled ?? false;
}
