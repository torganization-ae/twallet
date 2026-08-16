import { Api, HttpClient } from 'tonapi-sdk-js';

import type { ApiNetwork } from '../../../types';

import { getChainConfig } from '../../../../util/chain';
import { fetchWithRetry } from '../../../../util/fetch';
import { getApiHeadersForUrl } from '../../../environment';
import { getEffectiveApiApiKey, onRpcOverrideChanged } from '../../rpcOverrides';
import { NETWORK_CONFIG } from '../constants';

const EVENTS_LIMIT = 100;

const apiCache = new Map<ApiNetwork, Api<unknown>>();

function getApi(network: ApiNetwork) {
  const cached = apiCache.get(network);
  if (cached) return cached;

  const apiKey = getEffectiveApiApiKey('ton', network);
  const headers = {
    ...getApiHeadersForUrl(NETWORK_CONFIG[network].tonApiIoUrl),
    'Content-Type': 'application/json',
    ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
  };

  const api = new Api(new HttpClient({
    baseUrl: NETWORK_CONFIG[network].tonApiIoUrl,
    baseApiParams: { headers },
    customFetch: fetchWithRetry as typeof fetch,
  }));
  apiCache.set(network, api);
  return api;
}

function invalidateTonApiIoClient(network?: ApiNetwork) {
  if (network) {
    apiCache.delete(network);
    return;
  }
  apiCache.clear();
}

onRpcOverrideChanged((chain, network, field) => {
  if (chain !== 'ton' || field !== 'api') return;
  invalidateTonApiIoClient(network);
});

export async function fetchNftItems(network: ApiNetwork, addresses: string[]) {
  return (await getApi(network).nft.getNftItemsByAddresses({
    account_ids: addresses,
  })).nft_items;
}

export async function fetchAccountNfts(network: ApiNetwork, address: string, options?: {
  collectionAddress?: string;
  offset?: number;
  limit?: number;
}) {
  const { collectionAddress, offset, limit } = options ?? {};
  const defaultLimit = getChainConfig('ton').nftBatchLimit!;

  return (await getApi(network).accounts.getAccountNftItems(
    address,
    {
      offset: offset ?? 0,
      limit: limit ?? defaultLimit,
      indirect_ownership: true,
      collection: collectionAddress,
    },
  )).nft_items;
}

export function fetchNftByAddress(network: ApiNetwork, nftAddress: string) {
  return getApi(network).nft.getNftItemByAddress(nftAddress);
}

export async function fetchAccountDnsExpiring(network: ApiNetwork, address: string, periodDays: number) {
  return (await getApi(network).accounts.getAccountDnsExpiring(address, {
    period: periodDays,
  })).items;
}

export async function fetchAccountEvents(network: ApiNetwork, address: string, fromSec: number, limit?: number) {
  return (await getApi(network).accounts.getAccountEvents(address, {
    limit: limit ?? EVENTS_LIMIT,
    start_date: fromSec,
  })).events;
}
