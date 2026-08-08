import type { RpcEndpointField } from '../chains/defaultEndpoints';
import type { ApiChain, ApiNetwork, EVMChain } from '../types';

import { parseAccountId } from '../../util/account';
import { getChainConfig, getDisplayOrderedChains } from '../../util/chain';
import {
  getHiddenChains,
  getHiddenChainsMap,
  getHiddenChainsStateSnapshot,
  setChainHidden,
  setVaultAccount,
  syncVaultAccounts as syncVaultAccountsInternal,
} from '../chains/chainVisibility';
import {
  DEFAULT_EVM_API_BASE,
  EVM_CHAIN_IDS,
  getDefaultEndpoint,
  isEvmChain,
  resolveEvmJsonRpcUrl,
} from '../chains/defaultEndpoints';
import {
  clearRpcOverride,
  decryptApiKeyFromStorage,
  encryptApiKeyForStorage,
  getCachedDecryptedApiKey,
  getChainOverride,
  getEffectiveApiApiKey,
  getEffectiveApiUrl,
  getEffectiveRpcApiKey,
  getEffectiveRpcUrl,
  getStoredRpcApiKey,
  isEncryptedApiKey,
  isRpcFieldDefault,
  setCachedDecryptedApiKey,
  shouldEncryptApiKeys,
  writeRpcOverride,
} from '../chains/rpcOverrides';
import {
  getCurrentAccountId,
} from '../common/accounts';
import { getCurrentUpdater } from '../common/helpers';
import { getLastActivePollingTimestamps, setActivePollingAccount } from './polling';
import { verifyPassword } from './wallet';

const TEST_TIMEOUT_MS = 6000;

export type RpcTestStatus = 'ok' | 'unreachable' | 'unexpected_response';

export type RpcTestResult = {
  status: RpcTestStatus;
  details?: string;
};

export type NetworkRpcFieldConfig = {
  field: RpcEndpointField;
  label: 'rpc' | 'api';
  url: string;
  apiKey?: string;
  /** True when a custom API key exists but is encrypted and not unlocked in this session. */
  isApiKeyLocked?: boolean;
  hasApiKey?: boolean;
  isDefault: boolean;
  defaultUrl: string;
};

export type NetworkRpcConfigItem = {
  chain: ApiChain;
  title: string;
  fields: NetworkRpcFieldConfig[];
  isHidden?: boolean;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    TEST_TIMEOUT_MS,
  );
  return response;
}

async function testEvmRpc(chain: EVMChain, network: ApiNetwork, url: string): Promise<RpcTestResult> {
  const endpoint = resolveEvmJsonRpcUrl(url);
  try {
    const response = await postJson(endpoint, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    });

    if (!response.ok) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }

    const data = await response.json() as { result?: string };
    if (!data?.result) {
      return { status: 'unexpected_response', details: 'Missing eth_chainId result' };
    }

    const chainId = Number.parseInt(data.result, 16);
    const expected = EVM_CHAIN_IDS[network][chain];
    if (Number.isNaN(chainId)) {
      return { status: 'unexpected_response', details: `Invalid chainId: ${data.result}` };
    }
    if (chainId !== expected) {
      return {
        status: 'unexpected_response',
        details: `Expected chainId ${expected}, got ${chainId}`,
      };
    }
    return { status: 'ok' };
  } catch (err: any) {
    if (err?.message === 'timeout' || err?.name === 'TypeError') {
      return { status: 'unreachable', details: err?.message || 'Network error' };
    }
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testEvmApi(url: string): Promise<RpcTestResult> {
  try {
    const response = await withTimeout(fetch(url.replace(/\/$/, '')), TEST_TIMEOUT_MS);
    // Enhanced APIs/proxies often return 401/404 on the root path.
    if (response.status >= 500) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testTronApi(url: string): Promise<RpcTestResult> {
  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/wallet/getnowblock`),
      TEST_TIMEOUT_MS,
    );
    if (!response.ok) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    const data = await response.json() as { blockID?: string; block_header?: unknown };
    if (!data?.blockID && !data?.block_header) {
      return { status: 'unexpected_response', details: 'Unexpected Tron response shape' };
    }
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testSolanaRpc(url: string): Promise<RpcTestResult> {
  try {
    const response = await postJson(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getVersion',
      params: [],
    });
    if (!response.ok) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    const data = await response.json() as { result?: unknown; error?: unknown };
    if (data.error || !data.result) {
      return { status: 'unexpected_response', details: 'Unexpected Solana RPC response' };
    }
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testSolanaApi(url: string): Promise<RpcTestResult> {
  try {
    const response = await withTimeout(fetch(url.replace(/\/$/, '')), TEST_TIMEOUT_MS);
    // Helius / enhanced APIs may return 404 on bare root — treat any HTTP response as reachable.
    if (response.status >= 500) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testTonRpc(url: string, apiKey?: string): Promise<RpcTestResult> {
  const endpoint = `${url.replace(/\/$/, '')}/api/v2/jsonRPC`;
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const response = await postJson(endpoint, {
      id: 1,
      jsonrpc: '2.0',
      method: 'getMasterchainInfo',
      params: {},
    }, headers);
    if (!response.ok) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    const data = await response.json() as { ok?: boolean; result?: unknown; error?: unknown };
    if (data.error || (data.ok === false)) {
      return { status: 'unexpected_response', details: 'Toncenter rejected getMasterchainInfo' };
    }
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

async function testTonApi(url: string): Promise<RpcTestResult> {
  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/v2/status`),
      TEST_TIMEOUT_MS,
    );
    if (response.status >= 500) {
      return { status: 'unexpected_response', details: `HTTP ${response.status}` };
    }
    // 401/404 still means the host is reachable and speaks HTTP.
    return { status: 'ok' };
  } catch (err: any) {
    return { status: 'unreachable', details: String(err?.message || err) };
  }
}

export async function testRpcEndpoint(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
  url: string,
  apiKey?: string,
): Promise<RpcTestResult> {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return { status: 'unreachable', details: 'URL must start with http:// or https://' };
  }

  if (isEvmChain(chain)) {
    return field === 'api' ? testEvmApi(trimmed) : testEvmRpc(chain, network, trimmed);
  }
  if (chain === 'tron') {
    return testTronApi(trimmed);
  }
  if (chain === 'solana') {
    return field === 'api' ? testSolanaApi(trimmed) : testSolanaRpc(trimmed);
  }
  if (chain === 'ton') {
    return field === 'api' ? testTonApi(trimmed) : testTonRpc(trimmed, apiKey);
  }
  return { status: 'unreachable', details: `Unsupported chain: ${chain as string}` };
}

function resolveApiKeyForConfig(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField = 'rpc',
): {
    apiKey?: string;
    isApiKeyLocked?: boolean;
    hasApiKey?: boolean;
  } {
  const stored = getStoredRpcApiKey(chain, network, field);
  if (!stored) {
    const effective = field === 'api'
      ? getEffectiveApiApiKey(chain, network)
      : getEffectiveRpcApiKey(chain, network);
    return effective ? { apiKey: effective, hasApiKey: true } : {};
  }
  if (isEncryptedApiKey(stored)) {
    const unlocked = getCachedDecryptedApiKey(chain, network, field);
    if (unlocked !== undefined) {
      return { apiKey: unlocked, hasApiKey: true, isApiKeyLocked: false };
    }
    return { hasApiKey: true, isApiKeyLocked: true };
  }
  return { apiKey: stored, hasApiKey: true, isApiKeyLocked: false };
}

function compareNetworkTitles(a: NetworkRpcConfigItem, b: NetworkRpcConfigItem) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

/** Active (shown) networks first, then inactive — each group A–Z by title. */
export function sortNetworkRpcConfigItems(items: NetworkRpcConfigItem[]): NetworkRpcConfigItem[] {
  return [...items].sort((a, b) => {
    const aHidden = Boolean(a.isHidden);
    const bHidden = Boolean(b.isHidden);
    if (aHidden !== bHidden) {
      return aHidden ? 1 : -1;
    }
    return compareNetworkTitles(a, b);
  });
}

export async function getRpcConfig(network: ApiNetwork): Promise<NetworkRpcConfigItem[]> {
  const hiddenMap = await getHiddenChainsMap(network);
  const items: NetworkRpcConfigItem[] = getDisplayOrderedChains(network).map((chain): NetworkRpcConfigItem => {
    const title = getChainConfig(chain).title;
    const defaults = getDefaultEndpoint(chain, network);
    const override = getChainOverride(chain, network);

    if (chain === 'solana' || chain === 'ton') {
      const rpcDefault = 'rpcUrl' in defaults ? defaults.rpcUrl : '';
      const apiDefault = 'apiUrl' in defaults ? defaults.apiUrl : '';
      const rpcApiKeyInfo = chain === 'ton' ? resolveApiKeyForConfig(chain, network, 'rpc') : {};
      const enhancedApiKeyInfo = chain === 'solana' ? resolveApiKeyForConfig(chain, network, 'api') : {};
      return {
        chain,
        title,
        isHidden: hiddenMap[chain],
        fields: [
          {
            field: 'rpc',
            label: 'rpc',
            url: getEffectiveRpcUrl(chain, network),
            ...rpcApiKeyInfo,
            isDefault: isRpcFieldDefault(chain, network, 'rpc'),
            defaultUrl: rpcDefault,
          },
          {
            field: 'api',
            label: 'api',
            url: getEffectiveApiUrl(chain, network),
            ...enhancedApiKeyInfo,
            isDefault: isRpcFieldDefault(chain, network, 'api'),
            defaultUrl: apiDefault,
          },
        ],
      };
    }

    if (isEvmChain(chain)) {
      const rpcDefault = 'url' in defaults ? defaults.url : getEffectiveRpcUrl(chain, network);
      const apiDefault = DEFAULT_EVM_API_BASE[network];
      return {
        chain,
        title,
        isHidden: hiddenMap[chain],
        fields: [
          {
            field: 'rpc',
            label: 'rpc',
            url: getEffectiveRpcUrl(chain, network),
            isDefault: isRpcFieldDefault(chain, network, 'rpc'),
            defaultUrl: rpcDefault,
          },
          {
            field: 'api',
            label: 'api',
            url: getEffectiveApiUrl(chain, network),
            ...resolveApiKeyForConfig(chain, network, 'api'),
            isDefault: isRpcFieldDefault(chain, network, 'api'),
            defaultUrl: apiDefault,
          },
        ],
      };
    }

    const defaultUrl = 'url' in defaults ? defaults.url : getEffectiveRpcUrl(chain, network);
    return {
      chain,
      title,
      isHidden: hiddenMap[chain],
      fields: [
        {
          field: 'rpc',
          label: 'rpc',
          url: getEffectiveRpcUrl(chain, network),
          apiKey: override?.rpc?.apiKey && !isEncryptedApiKey(override.rpc.apiKey)
            ? override.rpc.apiKey
            : undefined,
          isDefault: isRpcFieldDefault(chain, network, 'rpc'),
          defaultUrl,
        },
      ],
    };
  });

  return sortNetworkRpcConfigItems(items);
}

export async function unlockRpcApiKey(
  chain: ApiChain,
  network: ApiNetwork,
  password: string,
  field: RpcEndpointField = 'rpc',
): Promise<{ ok: boolean; apiKey?: string }> {
  const isValid = await verifyPassword(password);
  if (!isValid) return { ok: false };

  const stored = getStoredRpcApiKey(chain, network, field);
  if (!stored) {
    return {
      ok: true,
      apiKey: field === 'api'
        ? getEffectiveApiApiKey(chain, network)
        : getEffectiveRpcApiKey(chain, network),
    };
  }

  try {
    const apiKey = await decryptApiKeyFromStorage(stored, password);
    setCachedDecryptedApiKey(chain, network, field, apiKey);
    return { ok: true, apiKey };
  } catch {
    return { ok: false };
  }
}

export async function setRpcOverride(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
  url: string,
  apiKey?: string,
  force?: boolean,
  password?: string,
): Promise<RpcTestResult & { saved?: boolean }> {
  const test = await testRpcEndpoint(chain, network, field, url, apiKey);

  if (test.status === 'unreachable') {
    return { ...test, saved: false };
  }
  if (test.status === 'unexpected_response' && !force) {
    return { ...test, saved: false };
  }

  let storedApiKey = apiKey;
  if (apiKey !== undefined && apiKey !== '' && shouldEncryptApiKeys()) {
    if (!password) {
      return {
        status: 'unreachable',
        details: 'Password required to save API key',
        saved: false,
      };
    }
    const isValid = await verifyPassword(password);
    if (!isValid) {
      return { status: 'unreachable', details: 'Wrong password', saved: false };
    }
    storedApiKey = await encryptApiKeyForStorage(apiKey, password);
    setCachedDecryptedApiKey(chain, network, field, apiKey);
  }

  await writeRpcOverride(chain, network, field, url, storedApiKey);
  return { ...test, status: test.status === 'ok' ? 'ok' : test.status, saved: true };
}

export async function resetRpcOverride(
  chain: ApiChain,
  network: ApiNetwork,
  field: RpcEndpointField,
): Promise<{ ok: true }> {
  await clearRpcOverride(chain, network, field);
  return { ok: true };
}

export async function setChainVisibility(
  chain: ApiChain,
  network: ApiNetwork,
  isHidden: boolean,
): Promise<{ ok: true } | { ok: false; reason: 'last_visible' }> {
  if (isHidden) {
    const hidden = await getHiddenChains(network);
    const visible = getDisplayOrderedChains(network).filter((item) => !hidden.has(item));
    if (visible.length <= 1 && visible[0] === chain) {
      return { ok: false, reason: 'last_visible' };
    }
  }

  await setChainHidden(chain, network, isHidden);
  getCurrentUpdater()?.({
    type: 'updateChainVisibility',
    hiddenChainsByNetwork: getHiddenChainsStateSnapshot(),
  });

  const accountId = await getCurrentAccountId();
  if (accountId && parseAccountId(accountId).network === network) {
    getCurrentUpdater()?.({
      type: 'updateBalances',
      accountId,
      chain,
      balances: {},
    });
  }

  await restartCurrentAccountPolling(network);
  return { ok: true };
}

export async function setAccountVaultProfile(
  accountId: string,
  isVault: boolean,
): Promise<{ ok: true }> {
  await setVaultAccount(accountId, isVault);

  const { network } = parseAccountId(accountId);
  await restartCurrentAccountPolling(network);
  return { ok: true };
}

export async function syncVaultAccounts(accountIds: string[]): Promise<{ ok: true }> {
  await syncVaultAccountsInternal(accountIds);
  return { ok: true };
}

async function restartCurrentAccountPolling(network: ApiNetwork) {
  const accountId = await getCurrentAccountId();
  if (accountId && parseAccountId(accountId).network === network) {
    // Preserve activity cursors so a networks-settings edit does not force a full initial
    // activity reload for every chain.
    await setActivePollingAccount(accountId, getLastActivePollingTimestamps(accountId));
  }
}
