import { getEffectiveApiApiKey, getEffectiveApiUrl, getEffectiveRpcApiKey, getEffectiveRpcUrl } from '../rpcOverrides';

function buildQueryString(
  network: 'mainnet' | 'testnet',
  field: 'rpc' | 'api',
) {
  const apiKey = field === 'rpc'
    ? getEffectiveRpcApiKey('solana', network)
    : getEffectiveApiApiKey('solana', network);
  return apiKey ? `?api-key=${apiKey}` : '';
}

export const NETWORK_CONFIG = {
  get mainnet() {
    const rpcQuery = buildQueryString('mainnet', 'rpc');
    const apiQuery = buildQueryString('mainnet', 'api');
    const rpcBase = getEffectiveRpcUrl('solana', 'mainnet').replace(/\/$/, '');
    const apiBase = getEffectiveApiUrl('solana', 'mainnet').replace(/\/$/, '');
    return {
      // Keep historical `${rpc}/` + query shape used by consumers.
      rpcUrl: `${rpcBase}/${rpcQuery}`,
      // Empty string when indexer is disabled — never synthesize "/" or relative
      // `/v0/...` URLs (those hit the webpack origin and flood Network with 404s).
      apiUrl: apiBase ? `${apiBase}/${apiQuery}` : '',
      getApiUrl: (path: string) => (apiBase ? `${apiBase}${path}${apiQuery}` : ''),
    };
  },
  get testnet() {
    const rpcQuery = buildQueryString('testnet', 'rpc');
    const apiQuery = buildQueryString('testnet', 'api');
    const rpcBase = getEffectiveRpcUrl('solana', 'testnet').replace(/\/$/, '');
    const apiBase = getEffectiveApiUrl('solana', 'testnet').replace(/\/$/, '');
    return {
      rpcUrl: `${rpcBase}/${rpcQuery}`,
      apiUrl: apiBase ? `${apiBase}/${apiQuery}` : '',
      getApiUrl: (path: string) => (apiBase ? `${apiBase}${path}${apiQuery}` : ''),
    };
  },
};

export const DEFAULT_FEE = 5000n;

export const SOLANA_PROGRAM_IDS = {
  system: [
    '11111111111111111111111111111111',
  ],
  token: [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // classic SPL
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // token-2022
  ],
  ata: [
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  ],
  memo: [
    'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // v2
    'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo', // v1
  ],
  computeBudget: [
    'ComputeBudget111111111111111111111111111111',
  ],
  nft: [
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Metaplex legacy
    'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d', // Metaplex Core
    'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY', // Metaplex Bubblegum
    'wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM', // Wen new standard
  ],
  swap: [
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter Aggregator v6
    'DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH', // Dflow Aggregator v4
    'proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u', // OKX Router
  ],
};

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export const SOLANA_DEFAULT_DERIVATION_PATH = `m/44'/501'/0'/0'`; // default phantom

export const SOLANA_DERIVATION_PATHS = {
  phantom: `m/44'/501'/{index}'/0'`,
  trust: `m/44'/501'/{index}'`,
  legacy: `m/501'/{index}'/0'/0'`,
  default: `m/44'/501'`,
};

// TODO: switch to actual data fetching
export const ATA_RENT_LAMPORTS = 2039280n;
