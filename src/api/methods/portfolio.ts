import type {
  ApiBaseCurrency,
  ApiHistoryList,
  ApiPortfolioBootstrapHolding,
  ApiPortfolioHistoryParams,
  ApiPortfolioHistoryResponse,
  ApiPortfolioPnlChangeResponse,
  ApiPriceHistoryPeriod,
} from '../types';

import { DEFAULT_PRICE_CURRENCY } from '../../config';
import {
  buildBootstrapSnapshots,
  pickBootstrapHoldings,
} from '../../util/portfolio/bootstrapSnapshots';
import {
  buildHistoryResponse,
  buildPnlChangeResponse,
  buildTokenNetWorthHistory,
  countSlugSnapshotsInWindow,
  countSnapshotsInWindow,
  getUtcDayTs,
  type LocalPortfolioSnapshot,
  upsertSnapshot,
} from '../../util/portfolio/localSnapshots';
import { getTimeRangeStartTs } from '../../util/portfolio/timeRange';
import { getStorageWriteQueue, removeAccountValue } from '../common/accounts';
import { storage } from '../storages';
import { fetchPriceHistory } from './prices';

type PortfolioSnapshotsByAccountId = Record<string, LocalPortfolioSnapshot[]>;

const STORAGE_KEY = 'portfolioSnapshots' as const;
const MIN_CHART_SNAPSHOT_DAYS = 2;
const DEFAULT_BOOTSTRAP_PERIOD: ApiPriceHistoryPeriod = '1Y';
const ALL_TIME_START_ISO = '2020-01-01T00:00:00.000Z';
const seedLocks = new Map<string, Promise<LocalPortfolioSnapshot[]>>();

const DENSITY_BY_PERIOD: Record<ApiPriceHistoryPeriod, string> = {
  '1D': '5m',
  '7D': '1h',
  '1M': '4h',
  '3M': '1d',
  '1Y': '1d',
  ALL: '1d',
};

export type FetchTokenNetWorthHistoryOptions = {
  currencyRate?: number;
  /** Human-unit holding used for amount × network price fallback when the diary lacks this slug. */
  amount?: number;
};

export async function recordPortfolioSnapshot(
  accountId: string,
  totalUsd: number,
  bySlug?: Record<string, number>,
) {
  if (!accountId || !Number.isFinite(totalUsd)) return;

  await getStorageWriteQueue(STORAGE_KEY).run(async () => {
    await storage.mutateItem!(STORAGE_KEY, (current) => {
      const all = normalizeStore(current);
      all[accountId] = upsertSnapshot(all[accountId] ?? [], {
        dayTs: getUtcDayTs(),
        totalUsd,
        bySlug,
      });
      return all;
    });
  });
}

export async function removePortfolioSnapshots(accountId: string) {
  if (!accountId) return;
  await removeAccountValue(accountId, STORAGE_KEY);
}

/** One-shot seed of approximate history when the local diary is still empty. */
export async function ensurePortfolioSnapshotsSeeded(
  accountId: string,
  holdings: ApiPortfolioBootstrapHolding[] = [],
  period: ApiPriceHistoryPeriod = DEFAULT_BOOTSTRAP_PERIOD,
) {
  if (!accountId) return 0;

  const existing = await loadAccountSnapshots(accountId);
  if (existing.length >= MIN_CHART_SNAPSHOT_DAYS) {
    return existing.length;
  }

  const seeded = await ensureBootstrapSnapshots(accountId, existing, {
    accountId,
    bootstrapHoldings: holdings,
    bootstrapPeriod: period,
  });
  return seeded.length;
}

export async function fetchPortfolioNetWorthHistory(
  wallets: string[],
  baseCurrency: ApiBaseCurrency = DEFAULT_PRICE_CURRENCY,
  params?: ApiPortfolioHistoryParams,
) {
  return buildLocalHistory(wallets, baseCurrency, params, 'netWorth');
}

export async function fetchPortfolioPnlCumulativeHistory(
  wallets: string[],
  baseCurrency: ApiBaseCurrency = DEFAULT_PRICE_CURRENCY,
  params?: ApiPortfolioHistoryParams,
) {
  return buildLocalHistory(wallets, baseCurrency, params, 'pnlCumulative');
}

export async function fetchPortfolioPnlHistory(
  wallets: string[],
  baseCurrency: ApiBaseCurrency = DEFAULT_PRICE_CURRENCY,
  params?: ApiPortfolioHistoryParams,
) {
  return buildLocalHistory(wallets, baseCurrency, params, 'pnl');
}

export async function fetchPortfolioPnlChange(
  wallets: string[],
  baseCurrency: ApiBaseCurrency = DEFAULT_PRICE_CURRENCY,
  params?: ApiPortfolioHistoryParams,
): Promise<ApiPortfolioPnlChangeResponse> {
  const accountId = await resolveAccountId(params);
  let snapshots = accountId && wallets.length > 0
    ? await loadAccountSnapshots(accountId)
    : [];
  const currencyRate = params?.currencyRate ?? 1;

  if (accountId && countSnapshotsInWindow(snapshots, params) < MIN_CHART_SNAPSHOT_DAYS) {
    snapshots = await ensureBootstrapSnapshots(accountId, snapshots, params);
  }

  if (countSnapshotsInWindow(snapshots, params) < MIN_CHART_SNAPSHOT_DAYS) {
    return buildPnlChangeResponse([], baseCurrency, params, currencyRate);
  }

  return buildPnlChangeResponse(snapshots, baseCurrency, params, currencyRate);
}

/** Local diary `bySlug`, else current holding × network `/prices/chart`. */
export async function fetchTokenNetWorthHistory(
  accountId: string,
  slug: string,
  period: ApiPriceHistoryPeriod,
  baseCurrency: ApiBaseCurrency = DEFAULT_PRICE_CURRENCY,
  options: FetchTokenNetWorthHistoryOptions = {},
): Promise<ApiHistoryList> {
  if (!accountId || !slug) return [];

  const currencyRate = options.currencyRate ?? 1;
  const params = buildPeriodParams(period);
  const snapshots = await loadAccountSnapshots(accountId);

  if (countSlugSnapshotsInWindow(snapshots, slug, params) >= MIN_CHART_SNAPSHOT_DAYS) {
    return buildTokenNetWorthHistory(snapshots, slug, params, currencyRate);
  }

  const amount = options.amount;
  if (!(typeof amount === 'number' && Number.isFinite(amount) && amount > 0)) {
    return buildTokenNetWorthHistory(snapshots, slug, params, currencyRate);
  }

  try {
    const priceHistory = await fetchPriceHistory(slug, period, baseCurrency);
    if (!priceHistory?.length) {
      return buildTokenNetWorthHistory(snapshots, slug, params, currencyRate);
    }

    return priceHistory
      .filter(([, price]) => typeof price === 'number' && Number.isFinite(price))
      .map(([timestamp, price]) => [timestamp, price * amount]);
  } catch {
    return buildTokenNetWorthHistory(snapshots, slug, params, currencyRate);
  }
}

function buildPeriodParams(period: ApiPriceHistoryPeriod): ApiPortfolioHistoryParams {
  const startTs = getTimeRangeStartTs(period);
  return {
    from: startTs === undefined ? ALL_TIME_START_ISO : new Date(startTs).toISOString(),
    to: new Date().toISOString(),
    density: DENSITY_BY_PERIOD[period],
  };
}

async function buildLocalHistory(
  wallets: string[],
  baseCurrency: ApiBaseCurrency,
  params: ApiPortfolioHistoryParams | undefined,
  mode: 'netWorth' | 'pnl' | 'pnlCumulative',
): Promise<ApiPortfolioHistoryResponse> {
  const accountId = await resolveAccountId(params);
  let snapshots = accountId && wallets.length > 0
    ? await loadAccountSnapshots(accountId)
    : [];
  const currencyRate = params?.currencyRate ?? 1;

  // Charts need at least two diary days in-range; otherwise return empty datasets so UI shows pending
  if (countSnapshotsInWindow(snapshots, params) < MIN_CHART_SNAPSHOT_DAYS) {
    // Optional in-band seed (prefer `ensurePortfolioSnapshotsSeeded` once before parallel fetches)
    if (accountId && (params?.bootstrapHoldings?.length ?? 0) > 0) {
      snapshots = await ensureBootstrapSnapshots(accountId, snapshots, params);
    }
    if (countSnapshotsInWindow(snapshots, params) < MIN_CHART_SNAPSHOT_DAYS) {
      return buildHistoryResponse([], baseCurrency, params, mode, currencyRate);
    }
  }

  return buildHistoryResponse(snapshots, baseCurrency, params, mode, currencyRate);
}

async function ensureBootstrapSnapshots(
  accountId: string,
  existing: LocalPortfolioSnapshot[],
  params?: ApiPortfolioHistoryParams,
) {
  const inflight = seedLocks.get(accountId);
  if (inflight) return inflight;

  const task = (async () => {
    const latest = await loadAccountSnapshots(accountId);
    if (latest.length >= MIN_CHART_SNAPSHOT_DAYS) return latest;

    const holdings = pickBootstrapHoldings(params?.bootstrapHoldings ?? []);
    if (holdings.length === 0) return latest;

    const period = params?.bootstrapPeriod ?? DEFAULT_BOOTSTRAP_PERIOD;
    const priceHistoryBySlug = await fetchBootstrapPriceHistories(holdings, period);
    const seeded = buildBootstrapSnapshots(holdings, priceHistoryBySlug, latest);
    if (seeded.length === 0) return latest;

    await mergeSeededSnapshots(accountId, seeded);
    return loadAccountSnapshots(accountId);
  })().finally(() => {
    seedLocks.delete(accountId);
  });

  seedLocks.set(accountId, task);
  return task;
}

async function fetchBootstrapPriceHistories(
  holdings: ApiPortfolioBootstrapHolding[],
  period: ApiPriceHistoryPeriod,
) {
  const entries = await Promise.all(
    holdings.map(async (holding) => {
      try {
        const history = await fetchPriceHistory(holding.slug, period, DEFAULT_PRICE_CURRENCY);
        return [holding.slug, history ?? []] as const;
      } catch {
        return [holding.slug, []] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

async function mergeSeededSnapshots(accountId: string, seeded: LocalPortfolioSnapshot[]) {
  await getStorageWriteQueue(STORAGE_KEY).run(async () => {
    await storage.mutateItem!(STORAGE_KEY, (current) => {
      const all = normalizeStore(current);
      const existing = all[accountId] ?? [];
      const existingDays = new Set(existing.map((snap) => snap.dayTs));
      const additions = seeded.filter((snap) => !existingDays.has(snap.dayTs));
      if (additions.length === 0) return all;

      all[accountId] = [...existing, ...additions].sort((a, b) => a.dayTs - b.dayTs);
      return all;
    });
  });
}

async function resolveAccountId(params?: ApiPortfolioHistoryParams) {
  if (params?.accountId) return params.accountId;
  return storage.getItem('currentAccountId') as Promise<string | undefined>;
}

async function loadAccountSnapshots(accountId: string) {
  const all = normalizeStore(await storage.getItem(STORAGE_KEY));
  return all[accountId] ?? [];
}

function normalizeStore(stored: unknown): PortfolioSnapshotsByAccountId {
  return stored && typeof stored === 'object' ? { ...(stored as PortfolioSnapshotsByAccountId) } : {};
}
