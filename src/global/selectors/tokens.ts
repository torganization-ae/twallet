import type {
  ApiBalanceBySlug,
  ApiBaseCurrency,
  ApiChain,
  ApiCurrencyRates,
  ApiTokenWithPrice,
} from '../../api/types';
import type { Account, AccountSettings, AccountState, GlobalState, UserToken } from '../types';

import {
  MYCOIN_MAINNET,
  MYCOIN_TESTNET,
  PRICELESS_TOKEN_HASHES,
  TINY_TRANSFER_MAX_COST,
  TONCOIN,
} from '../../config';
import { parseAccountId } from '../../util/account';
import { calculateTokenPrice } from '../../util/calculatePrice';
import { findChainConfig, getDefaultEnabledSlugs } from '../../util/chain';
import { toBig } from '../../util/decimals';
import memoize from '../../util/memoize';
import { round } from '../../util/round';
import { getChainBySlug, sortTokens } from '../../util/tokens';
import withCache from '../../util/withCache';
import { getHiddenChainsSnapshot } from '../../api/chains/chainVisibility';
import {
  selectAccountSettings,
  selectAccountState,
  selectCurrentAccountId,
  selectCurrentAccountState,
} from './accounts';

const EMPTY_BALANCES: ApiBalanceBySlug = {};

/** Default Safe-Assets dust threshold (USD) — unknown tokens below this go to Spam/Dust. */
export const DEFAULT_DUST_THRESHOLD_USD = 1;

function getHasConfirmedActivities(activities: AccountState['activities']) {
  const confirmedCount = (activities?.idsMain?.length ?? 0)
    - (activities?.localActivityIds?.length ?? 0)
    - Object.values(activities?.pendingActivityIds ?? {}).reduce<number>((sum, ids) => sum + (ids?.length ?? 0), 0);
  return confirmedCount > 0;
}

function getAreAllBalancesNearZero(balancesBySlug: ApiBalanceBySlug, tokenInfo: GlobalState['tokenInfo']) {
  return Object.entries(balancesBySlug).every(([slug, balance]) => {
    const info = tokenInfo.bySlug[slug];

    // If token info is missing, treat it as zero-value
    if (!info) return true;

    const balanceBig = toBig(balance, info.decimals);
    return balanceBig.mul(info.priceUsd ?? 0).lt(TINY_TRANSFER_MAX_COST);
  });
}

function isSafeAsset(
  slug: string,
  token: ApiTokenWithPrice,
  balance: bigint,
  accountSettings: AccountSettings,
  dustThresholdUsd: number,
  network: ReturnType<typeof parseAccountId>['network'],
): boolean {
  if (accountSettings.alwaysShownSlugs?.includes(slug)) return true;
  if (accountSettings.importedSlugs?.includes(slug)) return true;
  if (token.isVerified || token.isPopular || token.isFromBackend) return true;
  if (getDefaultEnabledSlugs(network).has(slug)) return true;
  if (PRICELESS_TOKEN_HASHES.has(token.codeHash!)) return true;

  const balanceUsd = toBig(balance, token.decimals).mul(token.priceUsd ?? 0);
  return balanceUsd.gte(dustThresholdUsd);
}

function isSpamAsset(
  slug: string,
  token: ApiTokenWithPrice,
  balance: bigint,
  accountSettings: AccountSettings,
  dustThresholdUsd: number,
  network: ReturnType<typeof parseAccountId>['network'],
): boolean {
  if (token.isSpam) return true;
  if (accountSettings.importedSlugs?.includes(slug)) return false;
  if (accountSettings.alwaysShownSlugs?.includes(slug)) return false;
  if (isSafeAsset(slug, token, balance, accountSettings, dustThresholdUsd, network)) return false;
  // Unknown token with zero/dust value → spam/dust folder
  const balanceUsd = toBig(balance, token.decimals).mul(token.priceUsd ?? 0);
  return balance > 0n && balanceUsd.lt(dustThresholdUsd);
}

export const selectAccountTokensMemoizedFor = withCache((accountId: string) => memoize((
  balancesBySlug: ApiBalanceBySlug,
  tokenInfo: GlobalState['tokenInfo'],
  accountSettings: AccountSettings = {},
  areTokensWithNoCostHidden: boolean = false,
  baseCurrency: ApiBaseCurrency,
  currencyRates: ApiCurrencyRates,
  hasActivities: boolean = false,
) => {
  const { network } = parseAccountId(accountId);
  const hiddenChains = getHiddenChainsSnapshot(network);
  const shouldShowOnlyDefaultTokens = !hasActivities && getAreAllBalancesNearZero(balancesBySlug, tokenInfo);
  const pinnedSlugs = accountSettings.pinnedSlugs ?? [];
  const dustThresholdUsd = accountSettings.dustThresholdUsd ?? DEFAULT_DUST_THRESHOLD_USD;

  const tokens = Object
    .entries(balancesBySlug)
    .filter(([slug]) => findChainConfig(getChainBySlug(slug)))
    .filter(([slug]) => !hiddenChains.has(getChainBySlug(slug)))
    .filter(([slug]) => (slug in tokenInfo.bySlug && !accountSettings.deletedSlugs?.includes(slug)))
    .filter(([slug, balance]) => {
      const token = tokenInfo.bySlug[slug];
      // Keep spam out of the main list (unless user forced it visible)
      return !isSpamAsset(slug, token, balance, accountSettings, dustThresholdUsd, network);
    })
    .map(([slug, balance]): UserToken => {
      const {
        symbol, name, image, decimals, cmcSlug, color, chain, tokenAddress, codeHash,
        type, label, keywords, percentChange24h = 0, priceUsd, isVerified, isSpam,
      } = tokenInfo.bySlug[slug];

      const price = calculateTokenPrice(priceUsd ?? 0, baseCurrency, currencyRates);
      const balanceBig = toBig(balance, decimals);
      const totalValue = balanceBig.mul(price).round(decimals).toString();
      const hasCost = balanceBig.mul(priceUsd ?? 0).gte(
        areTokensWithNoCostHidden ? dustThresholdUsd : TINY_TRANSFER_MAX_COST,
      );
      const isPricelessTokenWithBalance = PRICELESS_TOKEN_HASHES.has(codeHash!) && balance > 0n;
      const isSafe = isSafeAsset(slug, tokenInfo.bySlug[slug], balance, accountSettings, dustThresholdUsd, network);

      const isEnabled = accountSettings.alwaysShownSlugs?.includes(slug)
        || (shouldShowOnlyDefaultTokens
          ? getDefaultEnabledSlugs(network).has(slug)
          : (isSafe && (hasCost || isPricelessTokenWithBalance || (!areTokensWithNoCostHidden && balance > 0n))));

      const isDisabled = !isEnabled || accountSettings.alwaysHiddenSlugs?.includes(slug);

      return {
        chain,
        symbol,
        slug,
        amount: balance,
        name,
        image,
        price,
        priceUsd,
        decimals,
        change24h: round(percentChange24h / 100, 4),
        isDisabled,
        cmcSlug,
        totalValue,
        color,
        tokenAddress,
        codeHash,
        type,
        label,
        keywords,
        isVerified,
        isSpam,
      };
    });

  return sortTokens(tokens, pinnedSlugs);
}));

export function selectCurrentAccountTokens(global: GlobalState) {
  const accountId = selectCurrentAccountId(global);
  return accountId ? selectAccountTokens(global, accountId) : undefined;
}

export function selectCurrentAccountTokenBalance(global: GlobalState, slug: string) {
  return selectCurrentAccountState(global)?.balances?.bySlug[slug] ?? 0n;
}

export function selectCurrentToncoinBalance(global: GlobalState) {
  return selectCurrentAccountTokenBalance(global, TONCOIN.slug);
}

export function selectAccountTokens(global: GlobalState, accountId: string) {
  const accountState = selectAccountState(global, accountId);
  const balancesBySlug = accountState?.balances?.bySlug;
  if (!balancesBySlug || !global.tokenInfo) {
    return undefined;
  }

  const accountSettings = selectAccountSettings(global, accountId);
  const { areTokensWithNoCostHidden, baseCurrency } = global.settings;
  return selectAccountTokensMemoizedFor(accountId)(
    balancesBySlug,
    global.tokenInfo,
    accountSettings,
    areTokensWithNoCostHidden,
    baseCurrency,
    global.currencyRates,
    getHasConfirmedActivities(accountState?.activities),
  );
}

/** Tokens kept out of the main list as spam/dust (for Settings → Hidden Tokens). */
export function selectHiddenSpamTokens(global: GlobalState): UserToken[] {
  const accountId = selectCurrentAccountId(global);
  if (!accountId) return [];

  const accountState = selectAccountState(global, accountId);
  const balancesBySlug = accountState?.balances?.bySlug;
  if (!balancesBySlug || !global.tokenInfo) return [];

  const accountSettings = selectAccountSettings(global, accountId) ?? {};
  const { network } = parseAccountId(accountId);
  const dustThresholdUsd = accountSettings.dustThresholdUsd ?? DEFAULT_DUST_THRESHOLD_USD;
  const { baseCurrency } = global.settings;
  const hiddenChains = getHiddenChainsSnapshot(network);

  return Object.entries(balancesBySlug)
    .filter(([slug]) => findChainConfig(getChainBySlug(slug)))
    .filter(([slug]) => !hiddenChains.has(getChainBySlug(slug)))
    .filter(([slug]) => slug in global.tokenInfo.bySlug && !accountSettings.deletedSlugs?.includes(slug))
    .filter(([slug, balance]) => (
      isSpamAsset(slug, global.tokenInfo.bySlug[slug], balance, accountSettings, dustThresholdUsd, network)
    ))
    .map(([slug, balance]): UserToken => {
      const token = global.tokenInfo.bySlug[slug];
      const price = calculateTokenPrice(token.priceUsd ?? 0, baseCurrency, global.currencyRates);
      const balanceBig = toBig(balance, token.decimals);
      return {
        chain: token.chain,
        symbol: token.symbol,
        slug,
        amount: balance,
        name: token.name,
        image: token.image,
        price,
        priceUsd: token.priceUsd ?? 0,
        decimals: token.decimals,
        change24h: round((token.percentChange24h ?? 0) / 100, 4),
        isDisabled: true,
        cmcSlug: token.cmcSlug,
        totalValue: balanceBig.mul(price).round(token.decimals).toString(),
        color: token.color,
        tokenAddress: token.tokenAddress,
        codeHash: token.codeHash,
        type: token.type,
        label: token.label,
        keywords: token.keywords,
        isVerified: token.isVerified,
        isSpam: true,
      };
    });
}

export function selectAccountTokenBySlug(global: GlobalState, slug: string) {
  const accountTokens = selectCurrentAccountTokens(global);
  return accountTokens?.find((token) => token.slug === slug);
}

export function selectToken(global: GlobalState, slug: string) {
  return global.tokenInfo.bySlug[slug];
}

export const selectUserTokenMemoized = memoize((global: GlobalState, slug: string): UserToken | undefined => {
  const apiToken = selectToken(global, slug);
  if (!apiToken) return undefined;

  const amount = selectCurrentAccountTokenBalance(global, slug);

  return buildUserTokenFromTokenInfo(
    apiToken,
    amount,
    global.settings.baseCurrency,
    global.currencyRates,
  );
});

const selectTokenInfoUserTokensMemoized = memoize((
  tokensBySlug: GlobalState['tokenInfo']['bySlug'],
  balancesBySlug: ApiBalanceBySlug,
  baseCurrency: ApiBaseCurrency,
  currencyRates: ApiCurrencyRates,
): UserToken[] => {
  return Object.values(tokensBySlug)
    .map((token) => buildUserTokenFromTokenInfo(
      token,
      balancesBySlug[token.slug] ?? 0n,
      baseCurrency,
      currencyRates,
    ))
    .sort(compareTokenInfoUserTokens);
});

export function selectTokenInfoUserTokens(global: GlobalState) {
  const accountId = selectCurrentAccountId(global);
  if (!accountId || !global.tokenInfo) {
    return undefined;
  }

  return selectTokenInfoUserTokensMemoized(
    global.tokenInfo.bySlug,
    selectCurrentAccountState(global)?.balances?.bySlug ?? EMPTY_BALANCES,
    global.settings.baseCurrency,
    global.currencyRates,
  );
}

export function selectMycoin(global: GlobalState) {
  const { isTestnet } = global.settings;
  return selectToken(global, isTestnet ? MYCOIN_TESTNET.slug : MYCOIN_MAINNET.slug);
}

export function selectTokenByMinterAddress(global: GlobalState, minter: string) {
  return Object.values(global.tokenInfo.bySlug).find((token) => token.tokenAddress === minter);
}

export function selectChainTokenWithMaxBalanceSlow(global: GlobalState, chain: ApiChain): UserToken | undefined {
  return (selectCurrentAccountTokens(global) ?? [])
    .filter((token) => token.chain === chain)
    .reduce((maxToken, currentToken) => {
      const currentBalance = currentToken.priceUsd * Number(currentToken.amount);
      const maxBalance = maxToken ? maxToken.priceUsd * Number(maxToken.amount) : 0;

      return currentBalance > maxBalance ? currentToken : maxToken;
    });
}

function buildUserTokenFromTokenInfo(
  token: ApiTokenWithPrice,
  amount: bigint,
  baseCurrency: ApiBaseCurrency,
  currencyRates: ApiCurrencyRates,
): UserToken {
  const priceUsd = token.priceUsd ?? 0;
  const price = calculateTokenPrice(priceUsd, baseCurrency, currencyRates);

  return {
    ...token,
    amount,
    price,
    priceUsd,
    change24h: round((token.percentChange24h ?? 0) / 100, 4),
    totalValue: toBig(amount, token.decimals).mul(price).toString(),
  };
}

function compareTokenInfoUserTokens(a: UserToken, b: UserToken) {
  return a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase())
    || a.symbol.trim().toLowerCase().localeCompare(b.symbol.trim().toLowerCase());
}

export function selectMultipleAccountsTokensSlow(
  networkAccounts: Record<string, Account> | undefined,
  byAccountId: GlobalState['byAccountId'],
  tokenInfo: GlobalState['tokenInfo'],
  settingsByAccountId: Record<string, AccountSettings>,
  areTokensWithNoCostHidden: boolean | undefined,
  baseCurrency: ApiBaseCurrency,
  currencyRates: ApiCurrencyRates,
) {
  const result: Record<string, UserToken[] | undefined> = {};
  if (!networkAccounts || !tokenInfo) return result;

  for (const accountId in networkAccounts) {
    const accountState = byAccountId[accountId];
    const balancesBySlug = accountState?.balances?.bySlug;
    if (!balancesBySlug) {
      result[accountId] = undefined;
      continue;
    }

    const accountSettings = settingsByAccountId[accountId];
    result[accountId] = selectAccountTokensMemoizedFor(accountId)(
      balancesBySlug,
      tokenInfo,
      accountSettings,
      areTokensWithNoCostHidden,
      baseCurrency,
      currencyRates,
      getHasConfirmedActivities(accountState?.activities),
    );
  }

  return result;
}
