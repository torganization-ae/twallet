import { isFatalToncenterSocketError, isToncenterStreamingLikelyAvailable } from './socket';

describe('isFatalToncenterSocketError', () => {
  it('treats public toncenter connection-limit responses as fatal', () => {
    expect(isFatalToncenterSocketError('connection limit reached: 0 active connections')).toBe(true);
    expect(isFatalToncenterSocketError('Connection Limit Reached: 5')).toBe(true);
  });

  it('treats auth/quota failures as fatal', () => {
    expect(isFatalToncenterSocketError('unauthorized')).toBe(true);
    expect(isFatalToncenterSocketError('API key required')).toBe(true);
    expect(isFatalToncenterSocketError('quota exceeded')).toBe(true);
  });

  it('does not treat transient errors as fatal', () => {
    expect(isFatalToncenterSocketError('internal error')).toBe(false);
    expect(isFatalToncenterSocketError('timeout')).toBe(false);
  });
});

describe('isToncenterStreamingLikelyAvailable', () => {
  it('is false for the default public toncenter host without an API key', () => {
    // Default shared networks.json points at toncenter.com with no rpcApiKey.
    expect(isToncenterStreamingLikelyAvailable('mainnet')).toBe(false);
    expect(isToncenterStreamingLikelyAvailable('testnet')).toBe(false);
  });
});
