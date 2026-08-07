import { JsonRpcProvider, Network } from 'ethers';

import type { ApiNetwork, EVMChain } from '../../../types';

import { EVM_CHAIN_IDS, isEvmChain, resolveEvmJsonRpcUrl } from '../../defaultEndpoints';
import { getEffectiveRpcUrl, onRpcOverrideChanged } from '../../rpcOverrides';

const providerCache = new Map<string, JsonRpcProvider>();

function cacheKey(network: ApiNetwork, chain: EVMChain) {
  return `${network}_${chain}`;
}

function createProvider(network: ApiNetwork, chain: EVMChain) {
  // `staticNetwork` is required: without it ethers auto-polls `eth_blockNumber`
  // every 4s per chain, which DDoSes public RPCs once all EVM chains are active.
  const staticNetwork = Network.from(EVM_CHAIN_IDS[network][chain]);
  return new JsonRpcProvider(
    resolveEvmJsonRpcUrl(getEffectiveRpcUrl(chain, network)),
    staticNetwork,
    { staticNetwork, batchMaxCount: 1 },
  );
}

export function getEvmProvider(network: ApiNetwork, chain: EVMChain) {
  const key = cacheKey(network, chain);
  const cached = providerCache.get(key);
  if (cached) return cached;

  const provider = createProvider(network, chain);
  providerCache.set(key, provider);
  return provider;
}

export function invalidateEvmProvider(network?: ApiNetwork, chain?: EVMChain) {
  if (network && chain) {
    providerCache.delete(cacheKey(network, chain));
    return;
  }
  if (network) {
    for (const key of [...providerCache.keys()]) {
      if (key.startsWith(`${network}_`)) providerCache.delete(key);
    }
    return;
  }
  providerCache.clear();
}

onRpcOverrideChanged((changedChain, network, field) => {
  if (field !== 'rpc') return;
  if (!isEvmChain(changedChain)) return;
  invalidateEvmProvider(network, changedChain);
});

export type EvmProvider = JsonRpcProvider;
