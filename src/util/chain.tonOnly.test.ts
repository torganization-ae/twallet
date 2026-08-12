// The suites run with `TON_ONLY=0` (see tests/init.ts) so the multichain code stays covered.
// This one re-imports the modules with the shipped setting: TON only — nothing else may be
// derived, polled or shown.
describe('TON_ONLY', () => {
  let chain: typeof import('./chain');
  let chainVisibility: typeof import('../api/chains/chainVisibility');

  beforeAll(() => {
    process.env.TON_ONLY = '1';
    jest.isolateModules(() => {
      chain = require('./chain');
      chainVisibility = require('../api/chains/chainVisibility');
    });
  });

  afterAll(() => {
    process.env.TON_ONLY = '0';
  });

  it('keeps only TON in the supported and display orders', () => {
    expect(chain.CHAIN_ORDER).toEqual(['ton']);
    expect(chain.CHAIN_DISPLAY_ORDER).toEqual(['ton']);
  });

  it('treats every non-TON chain as hidden, even for accounts created earlier', () => {
    const hidden = chainVisibility.getHiddenChainsSnapshot('mainnet');

    expect(hidden.has('tron')).toBe(true);
    expect(hidden.has('ethereum')).toBe(true);
    expect(hidden.has('solana')).toBe(true);
    expect(hidden.has('ton')).toBe(false);
  });
});
