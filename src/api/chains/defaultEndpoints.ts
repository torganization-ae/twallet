import type {
  ApiChain,
  ApiNetwork,
  BuiltinEVMChain,
  EVMChain,
} from '../types';

import {
  getSharedBuiltinChains,
  getSharedChainConfig,
  getSharedDefaultEndpoint,
  getSharedDefaultEndpointHosts,
  getSharedEvmChainId,
  type SharedNetworkEndpoints,
} from './networksConfig';

/**
 * Hardcoded default RPC/API endpoints — now loaded from `shared/networks.json`.
 * Shown in Settings → Networks and used when the user has not set an override.
 *
 * EVM / Solana:
 * - `rpc` defaults point to public/keyless RPC nodes (send/balance work out of the box).
 * - `api` (enhanced/indexer: activities, NFT, simulation, token positions) defaults to empty —
 *   disabled until the user supplies their own Alchemy/Helius-compatible endpoint in Settings.
 */

export type RpcEndpointField = 'rpc' | 'api';

export type EvmEndpointDefaults = {
  url: string;
};

export type TronEndpointDefaults = {
  url: string;
};

export type SolanaEndpointDefaults = {
  rpcUrl: string;
  apiUrl: string;
  rpcApiKey?: string;
};

export type TonEndpointDefaults = {
  rpcUrl: string;
  apiUrl: string;
  rpcApiKey?: string;
};

export type ChainEndpointDefaults =
  | EvmEndpointDefaults
  | TronEndpointDefaults
  | SolanaEndpointDefaults
  | TonEndpointDefaults;

const BUILTIN_EVM = getSharedBuiltinChains().filter((chain) => {
  const cfg = getSharedChainConfig(chain);
  return Boolean(cfg?.evmChainId);
}) as BuiltinEVMChain[];

export const EVM_CHAINS: BuiltinEVMChain[] = BUILTIN_EVM;

function buildEvmEndpoints(network: ApiNetwork): Record<BuiltinEVMChain, EvmEndpointDefaults> {
  return Object.fromEntries(
    EVM_CHAINS.map((chain) => {
      const endpoints = getSharedDefaultEndpoint(chain, network);
      return [chain, { url: endpoints.rpc }];
    }),
  ) as Record<BuiltinEVMChain, EvmEndpointDefaults>;
}

export const DEFAULT_EVM_ENDPOINTS: Record<ApiNetwork, Record<BuiltinEVMChain, EvmEndpointDefaults>> = {
  mainnet: buildEvmEndpoints('mainnet'),
  testnet: buildEvmEndpoints('testnet'),
};

/**
 * Base URL used by Zerion-style wallet activity/positions paths (no /{chain} suffix).
 * Empty string = enhanced/indexer API disabled until the user sets an override.
 */
export const DEFAULT_EVM_API_BASE: Record<ApiNetwork, string> = {
  mainnet: getSharedChainConfig('ethereum')?.endpoints.mainnet.api ?? '',
  testnet: getSharedChainConfig('ethereum')?.endpoints.testnet.api ?? '',
};

/** TronGrid — the Tron Foundation's own public full-node API, free and keyless on both networks. */
export const DEFAULT_TRON_ENDPOINTS: Record<ApiNetwork, TronEndpointDefaults> = {
  mainnet: { url: getSharedDefaultEndpoint('tron', 'mainnet').rpc },
  testnet: { url: getSharedDefaultEndpoint('tron', 'testnet').rpc },
};

export const DEFAULT_SOLANA_ENDPOINTS: Record<ApiNetwork, SolanaEndpointDefaults> = {
  mainnet: {
    rpcUrl: getSharedDefaultEndpoint('solana', 'mainnet').rpc,
    apiUrl: getSharedDefaultEndpoint('solana', 'mainnet').api,
  },
  testnet: {
    rpcUrl: getSharedDefaultEndpoint('solana', 'testnet').rpc,
    apiUrl: getSharedDefaultEndpoint('solana', 'testnet').api,
  },
};

/** TON Center + tonapi.io — the official public TON infra. */
export const DEFAULT_TON_ENDPOINTS: Record<ApiNetwork, TonEndpointDefaults> = {
  mainnet: {
    rpcUrl: getSharedDefaultEndpoint('ton', 'mainnet').rpc,
    apiUrl: getSharedDefaultEndpoint('ton', 'mainnet').api,
  },
  testnet: {
    rpcUrl: getSharedDefaultEndpoint('ton', 'testnet').rpc,
    apiUrl: getSharedDefaultEndpoint('ton', 'testnet').api,
  },
};

/** Expected EIP-155 chain ids for live validation of EVM RPC endpoints. */
export const EVM_CHAIN_IDS: Record<ApiNetwork, Record<BuiltinEVMChain, number>> = {
  mainnet: Object.fromEntries(
    EVM_CHAINS.map((chain) => [chain, getSharedEvmChainId(chain, 'mainnet')!]),
  ) as Record<BuiltinEVMChain, number>,
  testnet: Object.fromEntries(
    EVM_CHAINS.map((chain) => [chain, getSharedEvmChainId(chain, 'testnet')!]),
  ) as Record<BuiltinEVMChain, number>,
};

export function isEvmChain(chain: ApiChain): chain is EVMChain {
  return (EVM_CHAINS as string[]).includes(chain);
}

export function getDefaultEndpoint(
  chain: ApiChain,
  network: ApiNetwork,
): ChainEndpointDefaults {
  if (chain === 'ton') return DEFAULT_TON_ENDPOINTS[network];
  if (chain === 'tron') return DEFAULT_TRON_ENDPOINTS[network];
  if (chain === 'solana') return DEFAULT_SOLANA_ENDPOINTS[network];
  if (isEvmChain(chain)) return DEFAULT_EVM_ENDPOINTS[network][chain];
  throw new Error(`Unsupported chain for endpoints: ${chain as string}`);
}

/** Hosts used to build CSP connect-src allow-lists at build time. */
export function getDefaultEndpointHosts(): string[] {
  return getSharedDefaultEndpointHosts();
}

/**
 * Resolve the JSON-RPC HTTP endpoint for ethers / eth_chainId checks.
 * Alchemy-style URLs that already end in `/v2` are left as-is; arbitrary custom RPCs are not altered.
 */
export function resolveEvmJsonRpcUrl(url: string): string {
  const base = url.replace(/\/$/, '');
  if (/\/v2$/i.test(base)) return base;
  return base;
}

/** Re-export for callers that need the raw shared endpoint shape. */
export type { SharedNetworkEndpoints };
