import type { ApiNetwork, ApiWalletInfo } from '../../../types';
import type { ApiTonWalletVersion } from '../types';
import type { AccountState, AddressBook, MetadataMap, WalletState, WalletVersion } from './types';

import { TONCENTER_ACTIONS_VERSION } from '../../../../config';
import { buildTxId } from '../../../../util/activities';
import { fetchJson } from '../../../../util/fetch';
import { buildCollectionByKey, split } from '../../../../util/iteratees';
import { toRawAddress } from '../util/tonCore';
import { getApiHeadersForUrl } from '../../../environment';
import { SEC } from '../../../constants';
import { getEffectiveRpcApiKey } from '../../rpcOverrides';
import { NETWORK_CONFIG } from '../constants';

const ADDRESS_BOOK_CHUNK_SIZE = 128;
/** Coalesce balance/domain/init callers that all hit /walletStates within the same window. */
const WALLET_STATES_CACHE_TTL_MS = 20 * SEC;
const walletStatesCache = new Map<string, { at: number; value: Record<string, ApiWalletInfo> }>();
const VERSION_MAP: Record<WalletVersion, ApiTonWalletVersion> = {
  'wallet v1 r1': 'simpleR1',
  'wallet v1 r2': 'simpleR2',
  'wallet v1 r3': 'simpleR3',
  'wallet v2 r1': 'v2R1',
  'wallet v2 r2': 'v2R2',
  'wallet v3 r1': 'v3R1',
  'wallet v3 r2': 'v3R2',
  // 'wallet v4 r1': '', // Not used in production, wrapper is missing
  'wallet v4 r2': 'v4R2',
  // 'wallet v5 beta': '', // Not used in production, wrapper is missing
  'wallet v5 r1': 'W5',
};

export async function fetchAddressBook(network: ApiNetwork, addresses: string[]): Promise<AddressBook> {
  const chunks = split(addresses, ADDRESS_BOOK_CHUNK_SIZE);

  const results = await Promise.all(chunks.map((chunk) => {
    return callToncenterV3(network, '/addressBook', {
      address: chunk,
    });
  }));

  return results.reduce((acc, value) => {
    return Object.assign(acc, value);
  }, {} as AddressBook);
}

export async function fixAddressFormat(network: ApiNetwork, address: string): Promise<string> {
  const result: { address_book: Record<string, string> } = await callToncenterV3(network, '/addressBook', { address });
  return result.address_book[address];
}

/**
 * The output dictionary is indexed by the input addresses.
 * Every input address is guaranteed to be a key of the dictionary.
 */
export async function getWalletInfos(network: ApiNetwork, addresses: string[]): Promise<Record<string, ApiWalletInfo>> {
  const rawKeys = addresses.map((a) => toRawAddress(a).toLowerCase());
  const cacheKey = `${network}:${[...rawKeys].sort().join(',')}`;
  const cached = walletStatesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < WALLET_STATES_CACHE_TTL_MS) {
    return Object.fromEntries(addresses.map((inputAddress, index) => {
      const hit = cached.value[rawKeys[index]];
      return [inputAddress, hit ? { ...hit, address: inputAddress } : {
        address: inputAddress,
        balance: 0n,
        isInitialized: false,
        seqno: 0,
      } satisfies ApiWalletInfo];
    }));
  }

  const { wallets: states, address_book: addressBook } = await callToncenterV3<{
    address_book: AddressBook;
    wallets: WalletState[];
  }>(network, '/walletStates', { address: addresses.join(',') });

  const walletInfoByRawAddress = Object.fromEntries(states.map((state) => [
    state.address.toLowerCase(),
    buildWalletInfo(state, addressBook),
  ]));

  const byRaw: Record<string, ApiWalletInfo> = {};
  const result = Object.fromEntries(addresses.map((inputAddress, index) => {
    const info = walletInfoByRawAddress[rawKeys[index]] ?? {
      address: inputAddress,
      balance: 0n,
      isInitialized: false,
      seqno: 0,
    } satisfies ApiWalletInfo;
    byRaw[rawKeys[index]] = info;
    return [inputAddress, info];
  }));

  walletStatesCache.set(cacheKey, { at: Date.now(), value: byRaw });
  return result;
}

function buildWalletInfo(state: WalletState, addressBook: AddressBook): ApiWalletInfo {
  return {
    address: addressBook[state.address].user_friendly,
    version: 'wallet_type' in state ? VERSION_MAP[state.wallet_type] : undefined,
    balance: BigInt(state.balance),
    isInitialized: state.status === 'active',
    seqno: 'seqno' in state ? state.seqno : 0,
    lastTxId: state.last_transaction_hash ? buildTxId(state.last_transaction_hash) : undefined,
    domain: addressBook[state.address].domain ?? undefined,
    interface: addressBook[state.address].interfaces
      ? addressBook[state.address]?.interfaces?.[0] ?? undefined
      : undefined,
  };
}

export async function getAccountStates(network: ApiNetwork, addresses: string[]) {
  const { accounts: states } = await callToncenterV3<{
    addressBook: AddressBook;
    accounts: AccountState[];
  }>(network, '/accountStates', { address: addresses.join(',') });

  const addressByRaw = Object.fromEntries(addresses.map((address) => [toRawAddress(address), address]));
  for (const state of states) {
    state.address = addressByRaw[state.address.toLowerCase()];
  }
  return buildCollectionByKey(states, 'address');
}

export function fetchMetadata(network: ApiNetwork, addresses: string[]): Promise<MetadataMap> {
  return callToncenterV3<MetadataMap>(network, '/metadata', { address: addresses.join(',') });
}

export function callToncenterV3<T = any>(network: ApiNetwork, path: string, data?: AnyLiteral) {
  const url = `${NETWORK_CONFIG[network].toncenterUrl}/api/v3${path}`;

  // Keep the WebView HTTP cache from storing or replaying toncenter responses.
  // The unique `_` changes the cache key (reliable, as the `cache` directive is
  // honored inconsistently); `no-store` also prevents storing. toncenter
  // ignores unknown query params.
  return fetchJson(url, { ...data, _: Date.now() }, {
    headers: getToncenterHeaders(network),
    cache: 'no-store',
  }) as Promise<T>;
}

export function getToncenterHeaders(network: ApiNetwork) {
  // Prefer the Settings → Networks override (or default endpoint key). The env
  // `toncenterKey` was wiped when we moved off the mytonwallet proxy — without
  // this, every V3 call hit public toncenter unauthenticated and got 429s.
  const apiKey = getEffectiveRpcApiKey('ton', network);
  const toncenterUrl = NETWORK_CONFIG[network].toncenterUrl;

  return {
    ...getApiHeadersForUrl(toncenterUrl),
    ...(apiKey && { 'X-Api-Key': apiKey }),
    // `X-Actions-Version` is a proprietary header of our own toncenter proxy.
    // Public toncenter.com doesn't allow it in the CORS preflight (and ignores it anyway),
    // so it must only be sent to hosts that understand it.
    ...(isOwnToncenterHost(toncenterUrl) && { 'X-Actions-Version': TONCENTER_ACTIONS_VERSION }),
  };
}

function isOwnToncenterHost(toncenterUrl: string) {
  try {
    const { hostname } = new URL(toncenterUrl);
    return hostname === 'mywallet.io' || hostname.endsWith('.mywallet.io');
  } catch {
    return false;
  }
}
