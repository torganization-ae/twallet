import type { ApiHistoryList } from '../../api/types';
import type { LocalPortfolioSnapshot } from './localSnapshots';

import { DAY } from '../dateFormat';
import { getUtcDayTs } from './localSnapshots';

export type PortfolioBootstrapHolding = {
  slug: string;
  /** Human-unit balance (wallet + staking), assumed constant across the bootstrap window. */
  amount: number;
  /** Fallback USD price when the network chart has a gap. */
  priceUsd: number;
};

const MIN_HOLDING_USD = 0.01;
const MAX_BOOTSTRAP_TOKENS = 15;

/** Keep the heaviest holdings so we do not fan out dozens of price requests. */
export function pickBootstrapHoldings(holdings: PortfolioBootstrapHolding[]) {
  return holdings
    .filter((holding) => (
      Number.isFinite(holding.amount)
      && holding.amount > 0
      && Number.isFinite(holding.priceUsd)
      && holding.amount * holding.priceUsd >= MIN_HOLDING_USD
    ))
    .sort((a, b) => (b.amount * b.priceUsd) - (a.amount * a.priceUsd))
    .slice(0, MAX_BOOTSTRAP_TOKENS);
}

/**
 * Approximate daily diary from current holdings × historical USD prices.
 * Existing snapshot days are left untouched so today's real diary point wins.
 */
export function buildBootstrapSnapshots(
  holdings: PortfolioBootstrapHolding[],
  priceHistoryBySlug: Record<string, ApiHistoryList | undefined>,
  existing: LocalPortfolioSnapshot[] = [],
  nowMs: number = Date.now(),
): LocalPortfolioSnapshot[] {
  const selected = pickBootstrapHoldings(holdings);
  if (selected.length === 0) return [];

  const todayTs = getUtcDayTs(nowMs);
  const daySet = new Set<number>([todayTs]);

  for (const holding of selected) {
    const history = priceHistoryBySlug[holding.slug];
    if (!history?.length) continue;
    for (const [timestamp] of history) {
      if (!Number.isFinite(timestamp)) continue;
      daySet.add(toDayTs(timestamp));
    }
  }

  const existingDays = new Set(existing.map((snap) => snap.dayTs));
  const days = [...daySet].filter((dayTs) => dayTs <= todayTs && !existingDays.has(dayTs)).sort((a, b) => a - b);
  if (days.length === 0) return [];

  const priceCursorBySlug = Object.fromEntries(
    selected.map((holding) => [holding.slug, 0]),
  ) as Record<string, number>;
  const lastPriceBySlug = Object.fromEntries(
    selected.map((holding) => [holding.slug, holding.priceUsd]),
  ) as Record<string, number>;

  const sortedHistoryBySlug = Object.fromEntries(
    selected.map((holding) => {
      const history = (priceHistoryBySlug[holding.slug] ?? [])
        .filter(([timestamp, price]) => Number.isFinite(timestamp) && Number.isFinite(price))
        .slice()
        .sort((a, b) => a[0] - b[0]);
      return [holding.slug, history];
    }),
  ) as Record<string, ApiHistoryList>;

  return days.map((dayTs) => {
    const dayEndTs = dayTs + (DAY / 1000) - 1;
    const bySlug: Record<string, number> = {};
    let totalUsd = 0;

    for (const holding of selected) {
      const history = sortedHistoryBySlug[holding.slug] ?? [];
      let cursor = priceCursorBySlug[holding.slug] ?? 0;
      while (cursor < history.length && history[cursor][0] <= dayEndTs) {
        lastPriceBySlug[holding.slug] = history[cursor][1];
        cursor += 1;
      }
      priceCursorBySlug[holding.slug] = cursor;

      const priceUsd = lastPriceBySlug[holding.slug] ?? holding.priceUsd;
      const valueUsd = holding.amount * priceUsd;
      if (!(valueUsd > 0) || !Number.isFinite(valueUsd)) continue;

      bySlug[holding.slug] = valueUsd;
      totalUsd += valueUsd;
    }

    return {
      dayTs,
      totalUsd,
      ...(Object.keys(bySlug).length > 0 ? { bySlug } : {}),
    };
  }).filter((snap) => Number.isFinite(snap.totalUsd));
}

function toDayTs(timestampSec: number) {
  return Math.floor((timestampSec * 1000) / DAY) * (DAY / 1000);
}
