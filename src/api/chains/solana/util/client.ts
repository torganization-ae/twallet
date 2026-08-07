import { createSolanaRpc } from '@solana/kit';

import type { ApiNetwork } from '../../../types';

import { onRpcOverrideChanged } from '../../rpcOverrides';
import { NETWORK_CONFIG } from '../constants';

const clientCache = new Map<ApiNetwork, ReturnType<typeof createSolanaRpc>>();

export function getSolanaClient(network: ApiNetwork) {
  const cached = clientCache.get(network);
  if (cached) return cached;

  const client = createSolanaRpc(NETWORK_CONFIG[network].rpcUrl);
  clientCache.set(network, client);
  return client;
}

function invalidateSolanaClient(network?: ApiNetwork) {
  if (network) {
    clientCache.delete(network);
    return;
  }
  clientCache.clear();
}

onRpcOverrideChanged((chain, network, field) => {
  if (chain !== 'solana' || field !== 'rpc') return;
  invalidateSolanaClient(network);
});

export type SolanaClient = ReturnType<typeof getSolanaClient>;
