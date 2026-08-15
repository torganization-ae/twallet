import { setEnvironment } from '../../../environment';
import { getSocketUrl, isFatalToncenterSocketError, isToncenterStreamingLikelyAvailable } from './socket';

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
    // Testnet default in shared networks.json is still public testnet.toncenter.com, no rpcApiKey.
    expect(isToncenterStreamingLikelyAvailable('testnet')).toBe(false);
  });

  it('is false for our own nexus proxy without an API key', () => {
    // Mainnet default is nexus-ton.testprojects.org/toncenter. The proxy tunnels to bare
    // public toncenter and inherits its 2-connections-per-outbound-IP cap across every
    // wallet user of the deployment — opening a WS through it just re-triggers
    // "connection limit reached" for the whole pool. Streaming is only usable when the
    // wallet itself is configured with a paid API key (getEffectiveRpcApiKey).
    expect(isToncenterStreamingLikelyAvailable('mainnet')).toBe(false);
  });
});

describe('getSocketUrl', () => {
  beforeAll(() => setEnvironment({} as any));

  it('keeps the endpoint path prefix (our proxy serves toncenter under /toncenter)', () => {
    expect(getSocketUrl('mainnet').toString()).toContain('/toncenter/api/streaming/v2/ws');
    expect(getSocketUrl('testnet').pathname).toBe('/api/streaming/v2/ws');
  });
});
