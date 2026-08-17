import { importTokensFromBackend } from './tokens';

jest.mock('../../common/backend', () => ({
  callBackendPost: jest.fn(),
}));

jest.mock('../../common/tokens', () => ({
  buildTokenSlug: (chain: string, address: string) => `${chain}-${address}`,
  getTokenByAddress: jest.fn(),
  updateTokens: jest.fn(),
}));

const { callBackendPost } = jest.requireMock('../../common/backend');
const { getTokenByAddress, updateTokens } = jest.requireMock('../../common/tokens');

const NETWORK = 'mainnet' as const;

function makeAddresses(count: number, prefix = 'addr') {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}`);
}

describe('importTokensFromBackend', () => {
  beforeEach(() => {
    callBackendPost.mockReset();
    getTokenByAddress.mockReset();
    updateTokens.mockReset();
    getTokenByAddress.mockReturnValue(undefined);
    callBackendPost.mockResolvedValue([]);
  });

  it('chunks held addresses into POSTs of at most 100', async () => {
    const addresses = makeAddresses(150, 'chunk-');

    await importTokensFromBackend(NETWORK, addresses, jest.fn());

    expect(callBackendPost).toHaveBeenCalledTimes(2);
    expect(callBackendPost.mock.calls[0][1].assets).toHaveLength(100);
    expect(callBackendPost.mock.calls[1][1].assets).toHaveLength(50);
  });

  it('imports a held address unknown on-chain but known to the backend, with verification', async () => {
    const address = 'known-by-backend';
    callBackendPost.mockResolvedValue([{
      slug: 'ton-knownbybacke',
      tokenAddress: address,
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 9,
      chain: 'ton',
      verification: 'whitelist',
      priceUsd: 0,
      percentChange24h: 0,
    }]);
    const sendUpdateTokens = jest.fn();

    await importTokensFromBackend(NETWORK, [address], sendUpdateTokens);

    expect(updateTokens).toHaveBeenCalledTimes(1);
    const [importedTokens, passedSendUpdateTokens] = updateTokens.mock.calls[0];
    expect(importedTokens).toEqual([expect.objectContaining({
      slug: 'ton-knownbybacke',
      tokenAddress: address,
      decimals: 9,
      verification: 'whitelist',
      isFromBackend: true,
    })]);
    expect(passedSendUpdateTokens).toBe(sendUpdateTokens);
  });

  it('does not drop the balance for a backend-unknown address (no tokenAddress in the response)', async () => {
    const address = 'unknown-everywhere';
    callBackendPost.mockResolvedValue([{ slug: 'ton-unknowneverywh', priceUsd: 0, percentChange24h: 0 }]);

    await importTokensFromBackend(NETWORK, [address], jest.fn());

    // Nothing "known" came back (no tokenAddress on the row), so nothing is imported - but the call
    // must not throw and must not treat this as a reason to retry indefinitely (see dedup test).
    expect(updateTokens).not.toHaveBeenCalled();
  });

  it('skips addresses already classified by the backend', async () => {
    const address = 'already-backend-known';
    getTokenByAddress.mockImplementation((addr: string) => (
      addr === address ? { isFromBackend: true, slug: 'ton-x' } : undefined
    ));

    await importTokensFromBackend(NETWORK, [address], jest.fn());

    expect(callBackendPost).not.toHaveBeenCalled();
  });

  it('asks the backend about an unresolved address only once per session', async () => {
    const address = 'asked-once';

    await importTokensFromBackend(NETWORK, [address], jest.fn());
    await importTokensFromBackend(NETWORK, [address], jest.fn());

    expect(callBackendPost).toHaveBeenCalledTimes(1);
  });

  it('retries an address on the next call after a network failure', async () => {
    const address = 'retry-after-failure';
    callBackendPost.mockRejectedValueOnce(new Error('network down'));
    callBackendPost.mockResolvedValueOnce([]);

    await importTokensFromBackend(NETWORK, [address], jest.fn());
    await importTokensFromBackend(NETWORK, [address], jest.fn());

    expect(callBackendPost).toHaveBeenCalledTimes(2);
  });
});
