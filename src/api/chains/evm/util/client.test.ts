import { JsonRpcProvider } from 'ethers';

import { getEvmProvider, invalidateEvmProvider } from './client';

jest.mock('../../../storages', () => ({
  storage: {
    getItem: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('getEvmProvider', () => {
  beforeEach(() => {
    invalidateEvmProvider();
  });

  afterEach(() => {
    invalidateEvmProvider();
  });

  it('keeps built-in chains on a plain JSON-RPC provider', () => {
    expect(getEvmProvider('mainnet', 'ethereum')).toBeInstanceOf(JsonRpcProvider);
  });
});
