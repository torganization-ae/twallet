import { Address } from '@ton/core';

import type {
  ApiHistoryList,
  ApiSwapAsset,
  ApiSwapDexEstimateResponse,
  ApiSwapEstimateRequest,
  ApiSwapPairAsset,
  ApiSwapRoute,
  ApiSwapTransfer,
} from '../types';

import { DEFAULT_PRICE_CURRENCY, POPULAR_SWAP_TOKENS, TONCOIN } from '../../config';
import { fromDecimal, toDecimal } from '../../util/decimals';
import { fetchJson } from '../../util/fetch';
import { logDebugError } from '../../util/logs';
import { MINUTE } from '../constants';
import { callBackendGet } from './backend';
import { buildTokenSlug, getTokenByAddress, getTokensCache, tokensPreload } from './tokens';

const ROUTER_URL = 'https://api-mainnet.dedust.io/v1/router';
const ASSETS_URL = 'https://api.dedust.io/v2/assets';
const ASSET_IMAGE_URL = 'https://assets.dedust.io/images/';

const DEFAULT_SLIPPAGE_PERCENT = 1;
// Both are DeDust API defaults. `max_length` is capped at 3 by the API.
const MAX_SPLITS = 4;
const MAX_LENGTH = 3;
const PROTOCOLS = ['dedust', 'stonfi_v1', 'stonfi_v2'];

const BPS = 10000;

type DedustAsset = {
  type: 'native' | 'jetton';
  address?: string;
  name: string;
  symbol: string;
  image?: string;
  decimals: number;
};

type DedustQuoteResponse = {
  in_amount: string;
  out_amount: string;
  swap_data?: { slippage_bps: number; routes: ApiSwapRoute[][] };
  display_data?: { network_fee: string }[];
  price_impact?: number;
  swap_is_possible?: boolean;
};

type DedustSwapResponse = {
  query_id: number;
  transactions: { address: string; amount: string; payload: string }[];
};

/** Decimals of the assets DeDust knows but the wallet doesn't (needed to convert amounts) */
const dedustDecimals: Record<string, number> = {};

const POPULAR_PRICES_CACHE_TTL = 5 * MINUTE;
let popularPricesCache: { timestamp: number; bySlug: Record<string, number> } | undefined;

function post<T extends AnyLiteral>(path: string, body: AnyLiteral) {
  return fetchJson<T>(`${ROUTER_URL}${path}`, undefined, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Converts the app's asset id ("TON" or a jetton address) to the DeDust minter id */
function toMinter(assetId: string) {
  return assetId === 'TON' ? 'native' : assetId;
}

async function getDecimals(assetId: string) {
  if (assetId === 'TON') return TONCOIN.decimals;

  const decimals = getTokenByAddress(assetId)?.decimals ?? dedustDecimals[assetId];
  if (decimals !== undefined) return decimals;

  await dedustGetAssets();

  if (dedustDecimals[assetId] === undefined) {
    throw new Error('Asset not found');
  }
  return dedustDecimals[assetId];
}

function sumNetworkFee(quote: DedustQuoteResponse) {
  return (quote.display_data ?? []).reduce((sum, { network_fee: fee }) => sum + BigInt(fee), 0n);
}

export async function dedustEstimate(
  request: ApiSwapEstimateRequest,
): Promise<ApiSwapDexEstimateResponse | { error: string }> {
  const { from, to, fromAmount, toAmount } = request;
  const isExactIn = fromAmount !== undefined;
  const [fromDecimals, toDecimals] = await Promise.all([getDecimals(from), getDecimals(to)]);
  const slippagePercent = request.slippage ?? DEFAULT_SLIPPAGE_PERCENT;
  const slippageBps = Math.round(slippagePercent * 100);

  const getQuote = (amount: bigint) => post<DedustQuoteResponse>('/quote', {
    in_minter: toMinter(from),
    out_minter: toMinter(to),
    amount: amount.toString(),
    swap_mode: isExactIn ? 'exact_in' : 'exact_out',
    slippage_bps: slippageBps,
    max_splits: MAX_SPLITS,
    max_length: MAX_LENGTH,
    // Only these protocols pass the `isSwapAllowed` contract check in `validateDexSwapTransfers`
    protocols: PROTOCOLS,
  });

  let quote = await getQuote(isExactIn
    ? fromDecimal(fromAmount, fromDecimals)
    : fromDecimal(toAmount ?? '0', toDecimals));

  // Swapping the whole TON balance has to leave the network fee behind, and the fee is only known
  // after the first quote, so the amount is re-quoted once.
  if (request.isFromAmountMax && from === 'TON' && quote.swap_data?.routes.length) {
    const amountWithoutFee = fromDecimal(fromAmount!, fromDecimals) - sumNetworkFee(quote);
    if (amountWithoutFee <= 0n) {
      return { error: 'Too small amount' };
    }
    quote = await getQuote(amountWithoutFee);
  }

  const routes = quote.swap_data?.routes;
  if (!routes?.length) {
    return { error: 'Insufficient liquidity' };
  }

  const outAmount = BigInt(quote.out_amount);
  const toMinAmount = (outAmount * BigInt(BPS - slippageBps)) / BigInt(BPS);
  const networkFee = sumNetworkFee(quote);

  return {
    route: 'dex',
    from,
    to,
    fromAmount: toDecimal(BigInt(quote.in_amount), fromDecimals),
    toAmount: toDecimal(outAmount, toDecimals),
    toMinAmount: toDecimal(toMinAmount, toDecimals),
    slippage: slippagePercent,
    fromAddress: request.fromAddress,
    // DeDust reports the impact signed (positive means a better rate), the UI expects its magnitude
    impact: Math.abs(quote.price_impact ?? 0),
    dexLabel: 'dedust',
    dieselStatus: 'not-available',
    routes,
    networkFee: toDecimal(networkFee, TONCOIN.decimals),
    realNetworkFee: toDecimal(networkFee, TONCOIN.decimals),
    // ponytail: no service fee on top of DeDust, so all the fee fields are zero
    swapFee: '0',
    swapFeePercent: 0,
    ourFee: '0',
    ourFeePercent: 0,
  };
}

export async function dedustBuildTransfers(
  senderAddress: string,
  routes: ApiSwapRoute[][],
  slippagePercent = DEFAULT_SLIPPAGE_PERCENT,
): Promise<ApiSwapTransfer[]> {
  const { transactions } = await post<DedustSwapResponse>('/swap', {
    // DeDust rejects the non-bounceable (UQ) form the wallet stores, the raw form is always accepted
    sender_address: Address.parse(senderAddress).toRawString(),
    swap_data: {
      slippage_bps: Math.round(slippagePercent * 100),
      routes,
    },
  });

  return transactions.map(({ address, amount, payload }) => ({
    toAddress: address,
    amount,
    payload,
  }));
}

export async function dedustGetAssets(): Promise<ApiSwapAsset[]> {
  const [assets] = await Promise.all([
    fetchJson<DedustAsset[]>(ASSETS_URL),
    tokensPreload.promise,
  ]);
  const bySlug: Record<string, ApiSwapAsset> = {};

  for (const asset of assets) {
    const isNative = asset.type === 'native' || !asset.address;
    const slug = isNative ? TONCOIN.slug : buildTokenSlug('ton', asset.address!);

    if (!isNative) {
      dedustDecimals[asset.address!] = asset.decimals;
    }

    bySlug[slug] = {
      slug,
      name: asset.name,
      symbol: asset.symbol,
      chain: 'ton',
      decimals: asset.decimals,
      isPopular: false,
      priceUsd: 0,
      image: asset.image && `${ASSET_IMAGE_URL}${asset.image}`,
      tokenAddress: isNative ? undefined : asset.address,
    };
  }

  // The DeDust list is curated and misses tokens the wallet already knows (and it has no prices),
  // so the known TON tokens win over it.
  for (const token of Object.values(getTokensCache().bySlug)) {
    if (token.chain !== 'ton') continue;

    bySlug[token.slug] = {
      slug: token.slug,
      name: token.name,
      symbol: token.symbol,
      chain: 'ton',
      decimals: token.decimals,
      isPopular: bySlug[token.slug]?.isPopular ?? false,
      priceUsd: token.priceUsd ?? 0,
      image: token.image ?? bySlug[token.slug]?.image,
      tokenAddress: token.tokenAddress,
    };
  }

  // The "Popular" section is a fixed list, so its tokens must be swappable even when neither DeDust nor the
  // wallet knows them. Metadata comes from the config, the price (if any) from whatever is already known.
  for (const token of POPULAR_SWAP_TOKENS) {
    if (token.tokenAddress) {
      dedustDecimals[token.tokenAddress] = token.decimals;
    }

    bySlug[token.slug] = {
      ...bySlug[token.slug],
      ...token,
      image: token.image ?? bySlug[token.slug]?.image,
      priceUsd: bySlug[token.slug]?.priceUsd ?? 0,
      isPopular: true,
    };
  }

  const pricesBySlug = await getPopularPrices(POPULAR_SWAP_TOKENS.filter(
    ({ slug }) => !bySlug[slug].priceUsd,
  ));

  for (const [slug, priceUsd] of Object.entries(pricesBySlug)) {
    bySlug[slug].priceUsd = priceUsd;
  }

  return Object.values(bySlug);
}

/**
 * Neither DeDust nor our `/assets` list reports a price for every popular token, and without one the UI shows
 * "No Price". The price chart does cover them, so its last point is used as the current price.
 */
async function getPopularPrices(tokens: { slug: string; tokenAddress?: string }[]) {
  if (popularPricesCache && Date.now() - popularPricesCache.timestamp < POPULAR_PRICES_CACHE_TTL) {
    return popularPricesCache.bySlug;
  }

  const bySlug: Record<string, number> = {};

  await Promise.all(tokens.map(async ({ slug, tokenAddress }) => {
    if (!tokenAddress) return;

    try {
      const history = await callBackendGet<ApiHistoryList>(`/prices/chart/ton:${tokenAddress}`, {
        base: DEFAULT_PRICE_CURRENCY,
        period: '1D',
      });
      const lastPrice = history.at(-1)?.[1];

      if (lastPrice) {
        bySlug[slug] = lastPrice;
      }
    } catch (err) {
      logDebugError('getPopularPrices', err);
    }
  }));

  popularPricesCache = { timestamp: Date.now(), bySlug };

  return bySlug;
}

/**
 * DeDust has no "pairs" endpoint: the router finds a route between any two listed assets or fails
 * at the estimation stage. So every asset is reported as a valid pair for every other asset.
 */
export async function dedustGetPairs(assetId: string): Promise<ApiSwapPairAsset[]> {
  const assets = await dedustGetAssets();
  const minter = toMinter(assetId);

  return assets
    .filter((asset) => toMinter(asset.tokenAddress ?? 'TON') !== minter)
    .map(({ symbol, slug, tokenAddress }) => ({ symbol, slug, contract: tokenAddress }));
}
