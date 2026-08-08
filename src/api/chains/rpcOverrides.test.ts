import { DEFAULT_EVM_API_BASE, DEFAULT_EVM_ENDPOINTS, DEFAULT_TON_ENDPOINTS } from './defaultEndpoints';
import {
  __resetRpcOverridesForTests,
  applyApiKeyToUrl,
  clearRpcOverride,
  getEffectiveApiUrl,
  getEffectiveRpcApiKey,
  getEffectiveRpcUrl,
  isEvmEnhancedApiEnabled,
  isRpcFieldDefault,
  isSolanaEnhancedApiEnabled,
  writeRpcOverride,
} from './rpcOverrides';

jest.mock('../storages', () => ({
  storage: {
    getItem: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('rpcOverrides resolution', () => {
  beforeEach(() => {
    __resetRpcOverridesForTests();
  });

  it('returns defaults when rpcOverrides key is absent', () => {
    expect(getEffectiveRpcUrl('ethereum', 'mainnet')).toBe(
      DEFAULT_EVM_ENDPOINTS.mainnet.ethereum.url,
    );
    expect(getEffectiveRpcUrl('ton', 'mainnet')).toBe(DEFAULT_TON_ENDPOINTS.mainnet.rpcUrl);
    expect(getEffectiveApiUrl('ton', 'mainnet')).toBe(DEFAULT_TON_ENDPOINTS.mainnet.apiUrl);
    expect(getEffectiveApiUrl('ethereum', 'mainnet')).toBe(DEFAULT_EVM_API_BASE.mainnet);
    expect(DEFAULT_EVM_API_BASE.mainnet).toBe('');
    expect(isRpcFieldDefault('ethereum', 'mainnet', 'rpc')).toBe(true);
  });

  it('reports EVM enhanced API disabled by default and enabled after override', async () => {
    expect(isEvmEnhancedApiEnabled('ethereum', 'mainnet')).toBe(false);
    expect(isEvmEnhancedApiEnabled('base', 'testnet')).toBe(false);

    await writeRpcOverride('ethereum', 'mainnet', 'api', 'https://custom-enhanced.example');
    expect(isEvmEnhancedApiEnabled('ethereum', 'mainnet')).toBe(true);
    expect(isEvmEnhancedApiEnabled('base', 'mainnet')).toBe(false);

    await clearRpcOverride('ethereum', 'mainnet', 'api');
    expect(isEvmEnhancedApiEnabled('ethereum', 'mainnet')).toBe(false);
  });

  it('reports Solana enhanced API disabled by default and enabled after override', async () => {
    expect(isSolanaEnhancedApiEnabled('mainnet')).toBe(false);
    expect(isSolanaEnhancedApiEnabled('testnet')).toBe(false);

    await writeRpcOverride('solana', 'mainnet', 'api', 'https://helius.example');
    expect(isSolanaEnhancedApiEnabled('mainnet')).toBe(true);
    expect(isSolanaEnhancedApiEnabled('testnet')).toBe(false);

    await clearRpcOverride('solana', 'mainnet', 'api');
    expect(isSolanaEnhancedApiEnabled('mainnet')).toBe(false);
  });

  it('returns defaults when chain field is missing from a partial object', () => {
    __resetRpcOverridesForTests({
      mainnet: {
        solana: { rpc: { url: 'https://custom-solana.example' } },
      },
    });

    expect(getEffectiveRpcUrl('ethereum', 'mainnet')).toBe(
      DEFAULT_EVM_ENDPOINTS.mainnet.ethereum.url,
    );
    expect(getEffectiveRpcUrl('solana', 'mainnet')).toBe('https://custom-solana.example');
    expect(isRpcFieldDefault('solana', 'mainnet', 'api')).toBe(true);
  });

  it('applies and clears overrides per field', async () => {
    await writeRpcOverride('ton', 'mainnet', 'rpc', 'https://ton-rpc.example', 'secret-key');
    expect(getEffectiveRpcUrl('ton', 'mainnet')).toBe('https://ton-rpc.example');
    expect(getEffectiveRpcApiKey('ton', 'mainnet')).toBe('secret-key');
    expect(getEffectiveApiUrl('ton', 'mainnet')).toBe(DEFAULT_TON_ENDPOINTS.mainnet.apiUrl);

    await writeRpcOverride('ton', 'mainnet', 'api', 'https://ton-api.example');
    expect(getEffectiveApiUrl('ton', 'mainnet')).toBe('https://ton-api.example');

    await clearRpcOverride('ton', 'mainnet', 'rpc');
    expect(getEffectiveRpcUrl('ton', 'mainnet')).toBe(DEFAULT_TON_ENDPOINTS.mainnet.rpcUrl);
    expect(getEffectiveApiUrl('ton', 'mainnet')).toBe('https://ton-api.example');
  });

  it('resolves EVM enhanced API from api field override', async () => {
    await writeRpcOverride('ethereum', 'mainnet', 'rpc', 'https://custom-rpc.example');
    await writeRpcOverride('ethereum', 'mainnet', 'api', 'https://custom-enhanced.example');

    expect(getEffectiveRpcUrl('ethereum', 'mainnet')).toBe('https://custom-rpc.example');
    expect(getEffectiveApiUrl('ethereum', 'mainnet')).toBe('https://custom-enhanced.example');
  });

  it('clears stored api key when empty string is written', async () => {
    await writeRpcOverride('ethereum', 'mainnet', 'rpc', 'https://rpc.example', 'keep-me');
    expect(getEffectiveRpcApiKey('ethereum', 'mainnet')).toBe('keep-me');

    await writeRpcOverride('ethereum', 'mainnet', 'rpc', 'https://rpc.example', '');
    expect(getEffectiveRpcApiKey('ethereum', 'mainnet')).toBeUndefined();
  });

  it('applies api keys to Alchemy-style and generic URLs', () => {
    expect(applyApiKeyToUrl('https://eth-mainnet.g.alchemy.io/v2/', 'abc')).toBe(
      'https://eth-mainnet.g.alchemy.io/v2/abc',
    );
    expect(applyApiKeyToUrl('https://eth-mainnet.g.alchemy.io/v2/already', 'abc')).toBe(
      'https://eth-mainnet.g.alchemy.io/v2/already',
    );
    expect(applyApiKeyToUrl('https://rpc.example', 'abc')).toBe(
      'https://rpc.example?apiKey=abc',
    );
    expect(applyApiKeyToUrl('https://rpc.example', undefined)).toBe('https://rpc.example');
  });
});
