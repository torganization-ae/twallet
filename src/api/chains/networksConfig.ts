/**
 * Thin typed loader over `shared/networks.json` — the single source of truth for
 * chain metadata and default endpoints across Web, iOS and Android.
 *
 * Rules encoded in the JSON:
 * - empty `endpoints.rpc` => chain is NOT enabled by default and NOT scanned until override
 * - `defaultEnabled[network] === false` => chain hidden on first run (zero-bloat)
 * - `apiKeyEligible` replaces hardcoded showApiKey lists
 * - `evmChainId` is the single source for live eth_chainId validation
 */

import type { ApiBuiltinChain, ApiNetwork } from '../types';

import networksJson from '../../../shared/networks.json';
import { API_BASE_URL } from '../../config';

export type SharedNetworkEndpoints = {
  rpc: string;
  api: string;
  failoverRpc?: string[];
};

export type SharedNativeToken = {
  name: string;
  symbol: string;
  slug: string;
  decimals: number;
  cmcSlug?: string;
  label?: string;
};

export type SharedExplorer = {
  id: string;
  name: string;
  baseUrl: Record<ApiNetwork, string | { url: string; param?: string }>;
  address: string;
  token: string;
  transaction: string;
  nft?: string;
  nftCollection?: string;
  doConvertHashFromBase64?: boolean;
};

export type SharedMarketplace = {
  id: string;
  name: string;
  baseUrl: Record<ApiNetwork, string>;
  nft: string;
  nftCollection?: string;
};

export type SharedChainFlags = {
  isDnsSupported: boolean;
  isOnchainSwapSupported: boolean;
  canSwapByBuyAmount?: boolean;
  isTransferPayloadSupported: boolean;
  isEncryptedCommentSupported: boolean;
  canTransferFullNativeBalance: boolean;
  isLedgerSupported: boolean;
  isSubwalletsSupported: boolean;
  isNftSupported: boolean;
  doesBackendSocketSupport: boolean;
  canImportTokens: boolean;
  shouldShowScamWarningIfNotEnoughGas: boolean;
  isNetWorthSupported: boolean;
};

export type SharedChainConfig = {
  title: string;
  chainStandard: string | null;
  displayColor: string;
  nativeToken: SharedNativeToken;
  derivationPath: string;
  addressRegex: string;
  addressRegexFlags?: string;
  addressPrefixRegex: string;
  addressPrefixRegexFlags?: string;
  endpoints: Record<ApiNetwork, SharedNetworkEndpoints>;
  defaultEnabled: Record<ApiNetwork, boolean>;
  apiKeyEligible: { rpc: boolean; api: boolean };
  evmChainId: Record<ApiNetwork, number> | null;
  explorers: SharedExplorer[];
  marketplaces: SharedMarketplace[];
  flags: SharedChainFlags;
  feeCheckAddress: string;
  buySwap: { tokenInSlug: string; amountIn: string } | null;
  usdtSlug: Record<ApiNetwork, string | null>;
  usdcSlug?: Record<ApiNetwork, string | null>;
  defaultEnabledSlugs: Record<ApiNetwork, string[]>;
  crosschainSwapSlugs: string[];
  tokenInfoSlugs: string[];
  nftBatchLimit?: number;
  nftBatchPauseMs?: number;
};

export type SharedNetworksFile = {
  meta: { version: number; description?: string; sources?: string[] };
  chainOrder: ApiBuiltinChain[];
  displayOrder: ApiBuiltinChain[];
  chains: Record<string, SharedChainConfig>;
};

const CONFIG = networksJson as SharedNetworksFile;

function resolveEndpointUrl(url: string): string {
  return url.startsWith('/') ? `${API_BASE_URL.replace(/\/+$/, '')}${url}` : url;
}

for (const chain of Object.values(CONFIG.chains)) {
  for (const endpoints of Object.values(chain.endpoints)) {
    endpoints.rpc = resolveEndpointUrl(endpoints.rpc);
    endpoints.api = resolveEndpointUrl(endpoints.api);
    endpoints.failoverRpc = endpoints.failoverRpc?.map(resolveEndpointUrl);
  }
}

export function getSharedNetworksConfig(): SharedNetworksFile {
  return CONFIG;
}

export function getSharedChainOrder(): ApiBuiltinChain[] {
  return CONFIG.chainOrder;
}

export function getSharedDisplayOrder(): ApiBuiltinChain[] {
  return CONFIG.displayOrder;
}

export function getSharedChainConfig(chain: string): SharedChainConfig | undefined {
  return CONFIG.chains[chain];
}

export function getSharedBuiltinChains(): ApiBuiltinChain[] {
  return CONFIG.chainOrder;
}

/** Default RPC/API endpoints for a builtin chain. Throws if the chain is unknown. */
export function getSharedDefaultEndpoint(chain: string, network: ApiNetwork): SharedNetworkEndpoints {
  const cfg = CONFIG.chains[chain];
  if (!cfg) {
    throw new Error(`Unsupported chain for endpoints: ${chain}`);
  }
  return cfg.endpoints[network];
}

export function getSharedEvmChainId(chain: string, network: ApiNetwork): number | undefined {
  return CONFIG.chains[chain]?.evmChainId?.[network];
}

export function isSharedApiKeyEligible(
  chain: string,
  field: 'rpc' | 'api',
): boolean {
  return Boolean(CONFIG.chains[chain]?.apiKeyEligible?.[field]);
}

/**
 * Whether the chain should be enabled/scanned by default for the given network.
 * Requires both `defaultEnabled[network]` and a non-empty `endpoints[network].rpc`.
 */
export function isSharedChainDefaultEnabled(chain: string, network: ApiNetwork): boolean {
  const cfg = CONFIG.chains[chain];
  if (!cfg) return false;
  return Boolean(cfg.defaultEnabled[network] && cfg.endpoints[network]?.rpc);
}

/** True when the chain has a usable default RPC URL (or would after an override). */
export function hasSharedDefaultRpc(chain: string, network: ApiNetwork): boolean {
  const cfg = CONFIG.chains[chain];
  if (!cfg) return false;
  return Boolean(cfg.endpoints[network]?.rpc);
}

/** Hosts used to build CSP connect-src allow-lists at build time. */
export function getSharedDefaultEndpointHosts(): string[] {
  const hosts = new Set<string>();
  const add = (url: string) => {
    if (!url) return;
    try {
      hosts.add(new URL(url).origin);
      hosts.add(new URL(url).origin.replace(/^http(s?):/, 'ws$1:'));
    } catch {
      // ignore invalid
    }
  };

  for (const chain of Object.values(CONFIG.chains)) {
    for (const net of Object.values(chain.endpoints)) {
      add(net.rpc);
      add(net.api);
      for (const failover of net.failoverRpc ?? []) {
        add(failover);
      }
    }
  }

  return [...hosts];
}
