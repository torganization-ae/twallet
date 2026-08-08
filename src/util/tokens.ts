import type { ApiChain, ApiSwapAsset, ApiToken, ApiTokenWithPrice } from '../api/types';
import type { TokenWithId } from '../components/ui/TokenDropdown';
import type { UserSwapToken, UserToken } from '../global/types';
import type { LangFn } from './langProvider';

import {
  PRICELESS_TOKEN_HASHES,
  PRIORITY_TOKENS,
  STAKED_MYCOIN_SLUG,
  STAKED_TON_SLUG,
  TON_TSUSDE,
} from '../config';
import { findChainConfig, getChainConfig, getSupportedChains } from './chain';
import { pick } from './iteratees';

const RWA_STOCK_KEYWORD = 'rwa';
const XSTOCKS_NAME_REGEX = /\s+xStock$/;
const SHIFT_NAME_REGEX = /^Shift\s+/;

/** Liquid / historical staked jettons treated as ordinary tokens for service-token heuristics */
const SERVICE_STAKED_TOKEN_SLUGS = new Set([
  STAKED_TON_SLUG,
  STAKED_MYCOIN_SLUG,
  TON_TSUSDE.slug,
]);

const chainByNativeSlug = Object.fromEntries(
  getSupportedChains().map((chain) => [getNativeToken(chain).slug, chain]),
);

export function getIsNativeToken(slug?: string) {
  if (!slug) return false;
  if (slug in chainByNativeSlug) return true;

  const chain = getChainBySlug(slug);
  return findChainConfig(chain)?.nativeToken.slug === slug;
}

export function getNativeToken(chain: ApiChain): ApiToken {
  return getChainConfig(chain).nativeToken;
}

export function findNativeToken(chain: string | undefined): ApiToken | undefined {
  return findChainConfig(chain)?.nativeToken;
}

export function getIsRwaStockToken(token?: ApiToken | UserToken | UserSwapToken | ApiSwapAsset | TokenWithId) {
  return token?.keywords?.includes(RWA_STOCK_KEYWORD) ?? false;
}

export function getTokenName(lang: LangFn, token: UserSwapToken | ApiSwapAsset | ApiToken): string;
export function getTokenName(lang: LangFn, token?: UserSwapToken | ApiSwapAsset | ApiToken): string | undefined;
export function getTokenName(lang: LangFn, token?: UserSwapToken | ApiSwapAsset | ApiToken) {
  if (!token) return undefined;

  if (getIsRwaStockToken(token)) {
    return token.name.replace(XSTOCKS_NAME_REGEX, '').replace(SHIFT_NAME_REGEX, '');
  }

  return token.name;
}

export function getChainBySlug(slug: string) {
  const items = slug.split('-');
  return items.length > 1 ? items[0] as ApiChain : chainByNativeSlug[slug];
}

export function getIsServiceToken(token?: ApiToken) {
  const { type, codeHash = '', slug = '' } = token ?? {};

  return type === 'lp_token'
    || SERVICE_STAKED_TOKEN_SLUGS.has(slug)
    || PRICELESS_TOKEN_HASHES.has(codeHash);
}

/**
 * Sorts user tokens by pinned status, priority slugs, and total value.
 * Sort order:
 * 1. Pinned tokens (by `pinnedSlugs` order)
 * 2. For an empty wallet (no balances) - priority tokens (in `PRIORITY_TOKENS` order)
 * 3. All others sorted by `totalValue` (descending), then alphabetically by `symbol`
 */
export function sortTokens(tokens: UserToken[], pinnedSlugs: string[]) {
  const pinnedIndexes = new Map(pinnedSlugs.map((slug, index) => [slug, index]));
  const isEmptyWallet = tokens.every((token) => token.amount === 0n);
  const priorityTokenSlugs = isEmptyWallet ? PRIORITY_TOKENS.map((token) => token.slug) : undefined;

  return tokens.slice().sort((tokenA, tokenB) => {
    const indexA = pinnedIndexes.get(tokenA.slug) ?? -1;
    const indexB = pinnedIndexes.get(tokenB.slug) ?? -1;

    // Both pinned - sort by pinnedSlugs order
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;

    // One pinned - pinned goes first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    if (priorityTokenSlugs) {
      const priorityA = priorityTokenSlugs.indexOf(tokenA.slug);
      const priorityB = priorityTokenSlugs.indexOf(tokenB.slug);

      if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;
    }

    const valueDiff = Number(tokenB.totalValue) - Number(tokenA.totalValue);
    if (valueDiff !== 0) return valueDiff;

    // If total value is the same, sort alphabetically
    return tokenA.symbol.localeCompare(tokenB.symbol);
  });
}

export function buildUserToken(token: ApiTokenWithPrice | ApiToken): UserToken {
  return {
    ...pick(token, [
      'symbol',
      'slug',
      'name',
      'image',
      'decimals',
      'keywords',
      'chain',
      'tokenAddress',
      'type',
    ]),
    amount: 0n,
    totalValue: '0',
    price: 0,
    priceUsd: 0,
    change24h: 0,
  };
}
