import { getHiddenChainsMap } from '../chains/chainVisibility';
import {
  getEvmProvider,
  invalidateEvmProvider,
} from '../chains/evm/util/client';
import { __resetRpcOverridesForTests } from '../chains/rpcOverrides';
import {
  getRpcConfig,
  setChainVisibility,
  setRpcOverride,
  testRpcEndpoint,
} from './networks';

const mockStorageData: Record<string, unknown> = {};

jest.mock('../storages', () => ({
  storage: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorageData[key])),
    setItem: jest.fn((key: string, value: unknown) => {
      mockStorageData[key] = value;
      return Promise.resolve();
    }),
    mutateItem: jest.fn((key: string, mutate: (currentValue: any) => any) => {
      mockStorageData[key] = mutate(mockStorageData[key]);
      return Promise.resolve(mockStorageData[key]);
    }),
  },
}));

jest.mock('./wallet', () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

const originalFetch = global.fetch;

describe('networks RPC API', () => {
  beforeEach(() => {
    Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
    __resetRpcOverridesForTests();
    invalidateEvmProvider();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('marks endpoint unreachable on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await testRpcEndpoint(
      'ethereum',
      'mainnet',
      'rpc',
      'https://broken.example/ethereum',
    );
    expect(result.status).toBe('unreachable');
  });

  it('marks unexpected_response when chainId mismatches', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: '0x1' }),
    });
    const result = await testRpcEndpoint(
      'base',
      'mainnet',
      'rpc',
      'https://node.example/base',
    );
    expect(result.status).toBe('unexpected_response');
  });

  it('saves with force on unexpected_response and invalidates provider cache', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: '0x2105' }),
    });

    const soft = await setRpcOverride(
      'ethereum',
      'mainnet',
      'rpc',
      'https://custom-evm.example/ethereum',
      undefined,
      false,
    );
    expect(soft.saved).toBe(false);
    expect(soft.status).toBe('unexpected_response');

    const before = getEvmProvider('mainnet', 'ethereum');
    const result = await setRpcOverride(
      'ethereum',
      'mainnet',
      'rpc',
      'https://custom-evm.example/ethereum',
      undefined,
      true,
    );
    expect(result.saved).toBe(true);

    const after = getEvmProvider('mainnet', 'ethereum');
    expect(after).not.toBe(before);
  });

  it('blocks save on unreachable even with force', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    const result = await setRpcOverride(
      'tron',
      'mainnet',
      'rpc',
      'https://broken-tron.example',
      undefined,
      true,
    );
    expect(result.saved).toBe(false);
    expect(result.status).toBe('unreachable');
  });

  it('returns separate rpc/api fields for EVM config', async () => {
    const config = await getRpcConfig('mainnet');
    const ethereum = config.find((item) => item.chain === 'ethereum');
    expect(ethereum).toBeTruthy();
    expect(ethereum!.fields.map((field) => field.field)).toEqual(['rpc', 'api']);
  });

  it('stores and resolves chain visibility', async () => {
    await setChainVisibility('polygon', 'mainnet', true);
    const hidden = await getHiddenChainsMap('mainnet');
    expect(hidden.polygon).toBe(true);

    await setChainVisibility('polygon', 'mainnet', false);
    const shown = await getHiddenChainsMap('mainnet');
    expect(shown.polygon).toBeUndefined();
  });

  it('returns active networks before inactive, each group sorted A–Z', async () => {
    await setChainVisibility('ethereum', 'mainnet', true);
    await setChainVisibility('polygon', 'mainnet', true);

    const config = await getRpcConfig('mainnet');
    const firstHiddenIndex = config.findIndex((item) => item.isHidden);
    expect(firstHiddenIndex).toBeGreaterThan(0);

    const active = config.slice(0, firstHiddenIndex);
    const inactive = config.slice(firstHiddenIndex);

    expect(active.every((item) => !item.isHidden)).toBe(true);
    expect(inactive.every((item) => item.isHidden)).toBe(true);
    expect(inactive.map((item) => item.chain)).toEqual(
      expect.arrayContaining(['ethereum', 'polygon']),
    );

    const activeTitles = active.map((item) => item.title);
    const inactiveTitles = inactive.map((item) => item.title);
    expect(activeTitles).toEqual([...activeTitles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    expect(inactiveTitles).toEqual(
      [...inactiveTitles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    );
  });
});
