import { TronWeb } from 'tronweb';

import type { ApiNetwork } from '../../../types';

import withCacheAsync from '../../../../util/withCacheAsync';
import { getEffectiveRpcApiKey, getEffectiveRpcUrl, onRpcOverrideChanged } from '../../rpcOverrides';

const clientCache = new Map<ApiNetwork, TronWeb>();

export function getTronClient(network: ApiNetwork) {
  const cached = clientCache.get(network);
  if (cached) return cached;

  const apiKey = getEffectiveRpcApiKey('tron', network);
  const client = new TronWeb({
    fullHost: getEffectiveRpcUrl('tron', network),
    // TronGrid allows any headers in CORS; without a key the public API is heavily rate-limited (HTTP 429)
    ...(apiKey && { headers: { 'TRON-PRO-API-KEY': apiKey } }),
  });
  clientCache.set(network, client);
  return client;
}

function invalidateTronClient(network?: ApiNetwork) {
  if (network) {
    clientCache.delete(network);
    return;
  }
  clientCache.clear();
}

onRpcOverrideChanged((chain, network) => {
  if (chain !== 'tron') return;
  invalidateTronClient(network);
});

export const getChainParameters = withCacheAsync(async (network: ApiNetwork) => {
  const chainParameters = await getTronClient(network).trx.getChainParameters();
  const energyUnitFee = chainParameters.find((param) => param.key === 'getEnergyFee')!.value;
  const bandwidthUnitFee = chainParameters.find((param) => param.key === 'getTransactionFee')!.value;
  return { energyUnitFee, bandwidthUnitFee };
});
