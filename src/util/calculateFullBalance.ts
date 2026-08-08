import type { UserToken } from '../global/types';

import { Big } from '../lib/big.js';
import { calcBigChangeValue } from './calcChangeValue';
import { toBig } from './decimals';
import { formatNumber } from './formatNumber';
import { round } from './math';

type ChangePrefix = 'up' | 'down' | undefined;

export function calculateFullBalance(
  tokens?: UserToken[],
  baseCurrencyRate: string = '1',
) {
  const primaryValueUsd = (tokens ?? []).reduce((acc, token) => {
    return acc.plus(toBig(token.amount, token.decimals).mul(token.priceUsd));
  }, Big(0));
  const primaryValue = primaryValueUsd.mul(baseCurrencyRate);

  const [primaryWholePart, primaryFractionPart] = formatNumber(primaryValue).split('.');
  const changeValue = (tokens ?? []).reduce((acc, token) => {
    return acc.plus(calcBigChangeValue(token.totalValue, token.change24h));
  }, Big(0)).round(4).toNumber();

  const changePercent = round(primaryValue ? (changeValue / (primaryValue.toNumber() - changeValue)) * 100 : 0, 2);
  const changePrefix: ChangePrefix = changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : undefined;

  return {
    primaryValue: primaryValue.toString(),
    primaryValueUsd: primaryValueUsd.toString(),
    primaryWholePart,
    primaryFractionPart,
    changePrefix,
    changePercent,
    changeValue,
  };
}

/** USD total + per-slug breakdown for the local portfolio diary */
export function buildPortfolioSnapshotValues(tokens?: UserToken[]) {
  const bySlug: Record<string, number> = {};
  let totalUsd = Big(0);

  for (const token of tokens ?? []) {
    const slugUsd = toBig(token.amount, token.decimals).mul(token.priceUsd);
    const value = slugUsd.toNumber();
    if (value <= 0) continue;

    bySlug[token.slug] = value;
    totalUsd = totalUsd.plus(slugUsd);
  }

  return {
    totalUsd: totalUsd.toNumber(),
    bySlug,
  };
}

/** Human-unit holdings for seeding approximate portfolio history from network prices. */
export function buildPortfolioBootstrapHoldings(tokens?: UserToken[]) {
  const holdings: Array<{ slug: string; amount: number; priceUsd: number }> = [];

  for (const token of tokens ?? []) {
    const amountNumber = toBig(token.amount, token.decimals).toNumber();
    if (!(amountNumber > 0) || !(token.priceUsd > 0)) continue;

    holdings.push({
      slug: token.slug,
      amount: amountNumber,
      priceUsd: token.priceUsd,
    });
  }

  return holdings;
}
