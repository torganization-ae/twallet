import type { ApiChain, ApiNetwork } from '../types';
import type { RpcEndpointField } from './defaultEndpoints';

import { IS_AIR_APP } from '../../config';
import { decryptSecret, encryptSecret } from '../common/mnemonic';
import { storage } from '../storages';
import {
  DEFAULT_EVM_API_BASE,
  DEFAULT_SOLANA_ENDPOINTS,
  DEFAULT_TON_ENDPOINTS,
  DEFAULT_TRON_ENDPOINTS,
  getDefaultEndpoint,
  isEvmChain,
} from './defaultEndpoints';

export type RpcFieldOverride = {
  url: string;
  apiKey?: string;
};

/** Prefix for password-encrypted API keys stored on web/extension/electron. */
export const ENCRYPTED_API_KEY_PREFIX = 'encv1:';

function cacheKey(chain: ApiChain, network: ApiNetwork, field: RpcEndpointField) {
  return `${network}:${chain}:${field}`;
}

/** In-memory plaintext API keys after unlock / save (web only). */
const decryptedApiKeyCache = new Map<string, string>();

export function shouldEncryptApiKeys() {
  // Mobile stores the entire storage blob in OS-protected Keychain / WSecureStorage.
  return !IS_AIR_APP;
}

export function isEncryptedApiKey(value: string | undefined): boolean {
  return Boolean(value?.startsWith(ENCRYPTED_API_KEY_PREFIX));
}

export function getCachedDecryptedApiKey(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField = 'rpc',
): string | undefined {
  return decryptedApiKeyCache.get(cacheKey(chain, network, field));
}

export function setCachedDecryptedApiKey(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
  apiKey: string | undefined,
) {
  const key = cacheKey(chain, network, field);
  if (apiKey === undefined || apiKey === '') {
    decryptedApiKeyCache.delete(key);
  } else {
    decryptedApiKeyCache.set(key, apiKey);
  }
}

export async function encryptApiKeyForStorage(apiKey: string, password: string): Promise<string> {
  const encrypted = await encryptSecret(apiKey, password);
  return `${ENCRYPTED_API_KEY_PREFIX}${encrypted}`;
}

export async function decryptApiKeyFromStorage(stored: string, password: string): Promise<string> {
  if (!isEncryptedApiKey(stored)) return stored;
  const decrypted = await decryptSecret(stored.slice(ENCRYPTED_API_KEY_PREFIX.length), password);
  return decrypted;
}

/**
 * Per-chain override blob stored in `storage` under `rpcOverrides`.
 * Only present fields are treated as overrides; missing fields fall back to defaults.
 */
export type ChainRpcOverride = {
  /** EVM / TRON single URL, or Solana/TON RPC URL */
  rpc?: RpcFieldOverride;
  /** Solana / TON API URL */
  api?: RpcFieldOverride;
};

export type RpcOverridesState = Partial<
  Record<ApiNetwork, Partial<Record<ApiChain, ChainRpcOverride>>>
>;

type OverrideListener = (chain: ApiChain, network: ApiNetwork, field: RpcEndpointField) => void;

const STORAGE_KEY = 'rpcOverrides' as const;

let overridesCache: RpcOverridesState = {};
const listeners = new Set<OverrideListener>();

function normalizeOverrides(raw: unknown): RpcOverridesState {
  if (!raw || typeof raw !== 'object') return {};
  return raw as RpcOverridesState;
}

export async function loadRpcOverrides(): Promise<void> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    overridesCache = normalizeOverrides(raw);
  } catch {
    overridesCache = {};
  }
}

async function persistOverrides(): Promise<void> {
  await storage.setItem(STORAGE_KEY, overridesCache);
}

function notify(chain: ApiChain, network: ApiNetwork, field: RpcEndpointField) {
  listeners.forEach((listener) => {
    try {
      listener(chain, network, field);
    } catch {
      // listener errors must not break the save path
    }
  });
}

export function onRpcOverrideChanged(listener: OverrideListener): NoneToVoidFunction {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getChainOverride(
  chain: ApiChain,
  network: ApiNetwork,
): ChainRpcOverride | undefined {
  return overridesCache[network]?.[chain];
}

function ensurePath(chain: ApiChain, network: ApiNetwork): ChainRpcOverride {
  if (!overridesCache[network]) {
    overridesCache[network] = {};
  }
  if (!overridesCache[network][chain]) {
    overridesCache[network][chain] = {};
  }
  return overridesCache[network][chain];
}

export async function writeRpcOverride(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
  url: string,
  apiKey?: string,
  options?: { clearApiKey?: boolean },
): Promise<void> {
  const entry = ensurePath(chain, network);
  const previous = field === 'rpc' ? entry.rpc : entry.api;
  const value: RpcFieldOverride = { url: url.trim() };

  // Native bridges can pass a JSON null here; normalize it so the stored key is preserved
  // the same way as when the argument is omitted entirely
  const effectiveApiKey = apiKey ?? undefined;

  if (options?.clearApiKey) {
    // leave apiKey unset
  } else if (effectiveApiKey) {
    value.apiKey = effectiveApiKey;
  } else if (previous?.apiKey) {
    value.apiKey = previous.apiKey;
  }

  if (field === 'rpc') {
    entry.rpc = value;
  } else {
    entry.api = value;
  }

  // Keep plaintext in session memory when we just wrote a non-encrypted key.
  if (!isEncryptedApiKey(effectiveApiKey) && effectiveApiKey !== undefined) {
    setCachedDecryptedApiKey(chain, network, field, effectiveApiKey || undefined);
  }

  await persistOverrides();
  notify(chain, network, field);
}

export async function clearRpcOverride(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
): Promise<void> {
  const entry = overridesCache[network]?.[chain];
  if (!entry) return;

  if (field === 'rpc') {
    delete entry.rpc;
  } else {
    delete entry.api;
  }

  setCachedDecryptedApiKey(chain, network, field, undefined);

  if (!entry.rpc && !entry.api) {
    delete overridesCache[network]![chain];
  }

  await persistOverrides();
  notify(chain, network, field);
}

/** Effective JSON-RPC / primary node URL for the chain. */
export function getEffectiveRpcUrl(chain: ApiChain, network: ApiNetwork): string {
  const override = getChainOverride(chain, network)?.rpc?.url;
  if (override) return override;

  const defaults = getDefaultEndpoint(chain, network);
  if ('rpcUrl' in defaults) return defaults.rpcUrl;
  return defaults.url;
}

/** Effective API / indexer URL (Solana Enhanced API, tonapi.io). Falls back to RPC URL for single-URL chains. */
export function getEffectiveApiUrl(chain: ApiChain, network: ApiNetwork): string {
  const override = getChainOverride(chain, network)?.api?.url;
  if (override) return override;

  if (isEvmChain(chain)) return DEFAULT_EVM_API_BASE[network];
  if (chain === 'solana') return DEFAULT_SOLANA_ENDPOINTS[network].apiUrl;
  if (chain === 'ton') return DEFAULT_TON_ENDPOINTS[network].apiUrl;
  if (chain === 'tron') return DEFAULT_TRON_ENDPOINTS[network].url;
  return getEffectiveRpcUrl(chain, network);
}

/**
 * Whether the EVM enhanced/indexer API (Zerion positions, Alchemy JSON-RPC, NFT REST, live WS)
 * is configured for this chain. Empty default means disabled until the user sets an override.
 */
export function isEvmEnhancedApiEnabled(chain: ApiChain, network: ApiNetwork): boolean {
  if (!isEvmChain(chain)) return false;
  return Boolean(getEffectiveApiUrl(chain, network));
}

/**
 * Whether Solana enhanced/indexer API (Helius searchAssets, parsed txs, NFTs, live WS extras)
 * is configured. Empty default means disabled — use native RPC balance only until the user
 * sets an override in Settings → Networks.
 */
export function isSolanaEnhancedApiEnabled(network: ApiNetwork): boolean {
  return Boolean(getEffectiveApiUrl('solana', network));
}

export function getEffectiveRpcApiKey(chain: ApiChain, network: ApiNetwork): string | undefined {
  const override = getChainOverride(chain, network)?.rpc?.apiKey;
  if (override !== undefined) {
    if (isEncryptedApiKey(override)) {
      return getCachedDecryptedApiKey(chain, network, 'rpc');
    }
    return override;
  }

  const defaults = getDefaultEndpoint(chain, network);
  if ('rpcApiKey' in defaults) return defaults.rpcApiKey;
  return undefined;
}

export function getEffectiveApiApiKey(chain: ApiChain, network: ApiNetwork): string | undefined {
  const override = getChainOverride(chain, network)?.api?.apiKey;
  if (override !== undefined) {
    if (isEncryptedApiKey(override)) {
      return getCachedDecryptedApiKey(chain, network, 'api');
    }
    return override;
  }

  const defaults = getDefaultEndpoint(chain, network);
  if ('rpcApiKey' in defaults) return defaults.rpcApiKey;
  return undefined;
}

export function getStoredRpcApiKey(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField = 'rpc',
): string | undefined {
  const entry = getChainOverride(chain, network);
  return field === 'rpc' ? entry?.rpc?.apiKey : entry?.api?.apiKey;
}

export function isRpcFieldDefault(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
): boolean {
  const entry = getChainOverride(chain, network);
  if (field === 'rpc') return !entry?.rpc?.url;
  return !entry?.api?.url;
}

/** Test helper — reset in-memory state without touching storage. */
export function __resetRpcOverridesForTests(state: RpcOverridesState = {}) {
  overridesCache = state;
  decryptedApiKeyCache.clear();
}
