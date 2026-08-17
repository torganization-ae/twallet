import { POPULAR_SWAP_TOKENS } from '../../config';
import { dedustBuildTransfers, dedustEstimate, dedustGetAssets } from './dedust';

jest.mock('../../util/fetch', () => ({
  fetchJson: jest.fn(),
}));

jest.mock('./tokens', () => ({
  buildTokenSlug: (chain: string, address: string) => `${chain}-${address}`,
  getTokenByAddress: (address: string) => (address === USDT_ADDRESS ? { decimals: 6 } : undefined),
  getTokensCache: () => ({ bySlug: {} }),
  tokensPreload: { promise: Promise.resolve() },
}));

const USDT_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

const { fetchJson } = jest.requireMock('../../util/fetch');

const ROUTES = [[{
  pool_address: 'EQA-X_yo3fzzbDbJ_0bzFWKqtRuZFIRa1sJsveZJ1YpViO3r',
  is_stable: false,
  in_minter: 'native',
  out_minter: `jetton:0:${USDT_ADDRESS}`,
  in_amount: '1000000000',
  out_amount: '1348419',
  network_fee: '30000000',
  protocol_slug: 'dedust',
}]] as any;

describe('dedustEstimate', () => {
  beforeEach(() => fetchJson.mockReset());

  it('converts the quote to the app estimate', async () => {
    fetchJson.mockResolvedValue({
      in_amount: '1000000000',
      out_amount: '1348419',
      swap_data: { slippage_bps: 100, routes: ROUTES },
      display_data: [{ network_fee: '250000000' }],
      price_impact: -0.04,
    });

    const estimate = await dedustEstimate({ from: 'TON', to: USDT_ADDRESS, fromAmount: '1', slippage: 1 }) as any;

    const [, , init] = fetchJson.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      in_minter: 'native',
      out_minter: USDT_ADDRESS,
      amount: '1000000000',
      swap_mode: 'exact_in',
      slippage_bps: 100,
    });

    expect(estimate.route).toBe('dex');
    expect(estimate.fromAmount).toBe('1');
    expect(estimate.toAmount).toBe('1.348419');
    // 1% slippage off the output amount
    expect(estimate.toMinAmount).toBe('1.334934');
    expect(estimate.networkFee).toBe('0.25');
    expect(estimate.impact).toBe(0.04);
    expect(estimate.ourFee).toBe('0');
    expect(estimate.routes).toBe(ROUTES);
  });

  it('requests an exact_out quote when the output amount is set', async () => {
    fetchJson.mockResolvedValue({
      in_amount: '1000000000',
      out_amount: '1348419',
      swap_data: { slippage_bps: 100, routes: ROUTES },
    });

    await dedustEstimate({ from: 'TON', to: USDT_ADDRESS, toAmount: '1.348419' });

    const [, , init] = fetchJson.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ amount: '1348419', swap_mode: 'exact_out' });
  });

  it('re-quotes the max TON amount without the network fee', async () => {
    fetchJson.mockResolvedValue({
      in_amount: '1000000000',
      out_amount: '1348419',
      swap_data: { slippage_bps: 100, routes: ROUTES },
      display_data: [{ network_fee: '250000000' }],
    });

    await dedustEstimate({ from: 'TON', to: USDT_ADDRESS, fromAmount: '1', isFromAmountMax: true });

    expect(fetchJson.mock.calls).toHaveLength(2);
    // 1 TON minus the 0.25 TON fee of the first quote
    expect(JSON.parse(fetchJson.mock.calls[1][2].body).amount).toBe('750000000');
  });

  it('reports missing liquidity instead of an empty route', async () => {
    fetchJson.mockResolvedValue({ in_amount: '0', out_amount: '0', swap_is_possible: false });

    expect(await dedustEstimate({ from: 'TON', to: USDT_ADDRESS, fromAmount: '1' }))
      .toEqual({ error: 'Insufficient liquidity' });
  });
});

describe('dedustGetAssets', () => {
  it('adds the fixed popular list, priced from the chart, even when DeDust does not list it', async () => {
    fetchJson.mockReset();
    fetchJson.mockImplementation((url: URL | string) => Promise.resolve(
      url.toString().includes('/prices/chart/') ? [[1, 0.033]] : [],
    ));

    const assets = await dedustGetAssets();
    const bySlug = Object.fromEntries(assets.map((asset) => [asset.slug, asset]));

    for (const token of POPULAR_SWAP_TOKENS) {
      // TONCOIN has no address, so there is no chart to fall back to
      const priceUsd = token.tokenAddress ? 0.033 : 0;
      expect(bySlug[token.slug]).toMatchObject({ ...token, isPopular: true, priceUsd });
    }
  });
});

describe('dedustBuildTransfers', () => {
  it('converts the built messages to wallet transfers', async () => {
    fetchJson.mockReset();
    fetchJson.mockResolvedValue({
      query_id: 1,
      transactions: [{ address: 'EQpool', amount: '1250000000', payload: 'te6cc' }],
    });

    const transfers = await dedustBuildTransfers('UQAsMwjNQ6vXtBLc0zHRLXFTGrKkPeMPBqLuJvVIEZTgqGCI', ROUTES, 2);

    const [, , init] = fetchJson.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      // DeDust only accepts the raw form
      sender_address: '0:2c3308cd43abd7b412dcd331d12d71531ab2a43de30f06a2ee26f5481194e0a8',
      swap_data: { slippage_bps: 200, routes: ROUTES },
    });
    expect(transfers).toEqual([{ toAddress: 'EQpool', amount: '1250000000', payload: 'te6cc' }]);
  });
});
