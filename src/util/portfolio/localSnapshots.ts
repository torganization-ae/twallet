/* eslint-disable no-null/no-null -- Api history points use `null` for empty slots */
import type {
  ApiBaseCurrency,
  ApiPortfolioHistoryDataset,
  ApiPortfolioHistoryList,
  ApiPortfolioHistoryParams,
  ApiPortfolioHistoryResponse,
  ApiPortfolioPnlChangeResponse,
} from '../../api/types';

import { getTokenBySlug } from '../../api/common/tokens';
import { DAY } from '../dateFormat';

export type LocalPortfolioSnapshot = {
  dayTs: number; // UTC midnight, unix seconds
  totalUsd: number;
  bySlug?: Record<string, number>;
};

export type LocalPortfolioHistoryMode = 'netWorth' | 'pnl' | 'pnlCumulative';

const BY_SLUG_RETENTION_DAYS = 90;
const DEFAULT_HISTORY_DAYS = 365;
const DEFAULT_DENSITY = '1d';
const ALLOWED_DENSITIES = new Set(['5m', '1h', '4h', '1d']);
const DENSITY_STEP_SEC: Record<string, number> = {
  '5m': 5 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': DAY / 1000,
};

const TOTAL_COLOR = '#2C92F0';
const DATASET_COLORS = [
  '#2C92F0', '#10B853', '#E49329', '#6875E9', '#E85D75',
  '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444',
];

export function getUtcDayTs(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / DAY) * (DAY / 1000);
}

export function upsertSnapshot(
  snapshots: LocalPortfolioSnapshot[],
  next: LocalPortfolioSnapshot,
): LocalPortfolioSnapshot[] {
  const dayTs = next.dayTs;
  const withoutDay = snapshots.filter((snap) => snap.dayTs !== dayTs);
  const merged = [...withoutDay, {
    dayTs,
    totalUsd: next.totalUsd,
    ...(next.bySlug && Object.keys(next.bySlug).length > 0 ? { bySlug: next.bySlug } : {}),
  }].sort((a, b) => a.dayTs - b.dayTs);

  return compactSnapshots(merged, dayTs);
}

export function compactSnapshots(
  snapshots: LocalPortfolioSnapshot[],
  nowDayTs: number = getUtcDayTs(),
): LocalPortfolioSnapshot[] {
  const cutoff = nowDayTs - BY_SLUG_RETENTION_DAYS * (DAY / 1000);

  return snapshots.map((snap) => {
    if (!snap.bySlug || snap.dayTs >= cutoff) return snap;
    const { bySlug: _bySlug, ...rest } = snap;
    return rest;
  });
}

/** Distinct snapshot days that fall inside the history window (inclusive). */
export function countSnapshotsInWindow(
  snapshots: LocalPortfolioSnapshot[],
  params: ApiPortfolioHistoryParams = {},
  nowMs: number = Date.now(),
) {
  const { from, to } = parseHistoryWindow(params, nowMs);
  const fromSec = Math.floor(from.getTime() / 1000);
  const toSec = Math.floor(to.getTime() / 1000);

  return snapshots.filter((snap) => snap.dayTs >= fromSec && snap.dayTs <= toSec).length;
}

export function parseHistoryWindow(params: ApiPortfolioHistoryParams = {}, nowMs: number = Date.now()) {
  const to = (params.to !== undefined ? parseDate(params.to) : undefined) ?? new Date(nowMs);
  const from = (params.from !== undefined ? parseDate(params.from) : undefined)
    ?? new Date(to.getTime() - DEFAULT_HISTORY_DAYS * DAY);
  const density = params.density && ALLOWED_DENSITIES.has(params.density)
    ? params.density
    : DEFAULT_DENSITY;

  return { from, to, density };
}

export function buildHistoryResponse(
  snapshots: LocalPortfolioSnapshot[],
  baseCurrency: ApiBaseCurrency,
  params: ApiPortfolioHistoryParams = {},
  mode: LocalPortfolioHistoryMode = 'netWorth',
  currencyRate = 1,
  nowMs: number = Date.now(),
): ApiPortfolioHistoryResponse {
  const { from, to, density } = parseHistoryWindow(params, nowMs);
  const rate = Number.isFinite(currencyRate) && currencyRate > 0 ? currencyRate : 1;
  const grid = buildTimeGrid(from.getTime(), to.getTime(), density);
  const totals = buildStepHeldTotals(snapshots, grid, rate);

  let datasets: ApiPortfolioHistoryDataset[];

  if (mode === 'netWorth') {
    datasets = buildNetWorthDatasets(snapshots, grid, rate);
  } else if (mode === 'pnl') {
    datasets = [buildSingleDataset('Total', buildDeltaPoints(totals), TOTAL_COLOR)];
  } else {
    datasets = [buildSingleDataset('Total', buildCumulativePoints(totals), TOTAL_COLOR)];
  }

  return {
    status: 'ok',
    datasets,
    points: totals,
    base: baseCurrency.toLowerCase(),
    density,
  };
}

/** Per-token USD diary series as a plain price-history list (null slots dropped). */
export function buildTokenNetWorthHistory(
  snapshots: LocalPortfolioSnapshot[],
  slug: string,
  params: ApiPortfolioHistoryParams = {},
  currencyRate = 1,
  nowMs: number = Date.now(),
): Array<[number, number]> {
  if (!slug) return [];

  const { from, to, density } = parseHistoryWindow(params, nowMs);
  const rate = Number.isFinite(currencyRate) && currencyRate > 0 ? currencyRate : 1;
  const grid = buildTimeGrid(from.getTime(), to.getTime(), density);
  const points = buildStepHeldSlug(snapshots, grid, slug, rate);

  return points.filter((entry): entry is [number, number] => (
    typeof entry[1] === 'number' && Number.isFinite(entry[1])
  ));
}

/** Distinct diary days that include an explicit `bySlug[slug]` inside the window. */
export function countSlugSnapshotsInWindow(
  snapshots: LocalPortfolioSnapshot[],
  slug: string,
  params: ApiPortfolioHistoryParams = {},
  nowMs: number = Date.now(),
) {
  if (!slug) return 0;

  const { from, to } = parseHistoryWindow(params, nowMs);
  const fromSec = Math.floor(from.getTime() / 1000);
  const toSec = Math.floor(to.getTime() / 1000);

  return snapshots.filter((snap) => (
    snap.dayTs >= fromSec
    && snap.dayTs <= toSec
    && Boolean(snap.bySlug && slug in snap.bySlug)
  )).length;
}

export function buildPnlChangeResponse(
  snapshots: LocalPortfolioSnapshot[],
  baseCurrency: ApiBaseCurrency,
  params: ApiPortfolioHistoryParams = {},
  currencyRate = 1,
  nowMs: number = Date.now(),
): ApiPortfolioPnlChangeResponse {
  const { from, to, density } = parseHistoryWindow(params, nowMs);
  const rate = Number.isFinite(currencyRate) && currencyRate > 0 ? currencyRate : 1;
  const grid = buildTimeGrid(from.getTime(), to.getTime(), density);
  const totals = buildStepHeldTotals(snapshots, grid, rate);

  const first = firstFinite(totals);
  const last = lastFinite(totals);
  const amount = first !== undefined && last !== undefined ? last - first : 0;
  const percent = first !== undefined && first > 0
    ? (amount / first) * 100
    : undefined;

  return {
    status: 'ok',
    base: baseCurrency.toLowerCase(),
    amount,
    percent,
    startTs: first !== undefined
      ? (totals.find(([, value]) => value !== null)?.[0] ?? Math.floor(from.getTime() / 1000)) * 1000
      : from.getTime(),
    endTs: to.getTime(),
  };
}

/** Human-readable token symbol for a slug; falls back only when the token is unknown. */
export function displaySymbolFromSlug(slug: string) {
  if (!slug) return 'Total';

  const token = getTokenBySlug(slug);
  if (token?.symbol) return token.symbol;

  if (slug === 'toncoin' || slug === 'ton') return 'TON';
  if (slug.includes('-')) {
    const tail = slug.split('-').pop() || slug;
    return tail.length <= 12 ? tail.toUpperCase() : `${tail.slice(0, 6)}…`;
  }
  return slug.length <= 8 ? slug.toUpperCase() : slug;
}

function buildNetWorthDatasets(
  snapshots: LocalPortfolioSnapshot[],
  grid: number[],
  rate: number,
): ApiPortfolioHistoryDataset[] {
  const slugs = collectSlugs(snapshots, grid);
  if (slugs.length === 0) {
    return [buildSingleDataset('Total', buildStepHeldTotals(snapshots, grid, rate), TOTAL_COLOR)];
  }

  return slugs.map((slug, index) => {
    const points = buildStepHeldSlug(snapshots, grid, slug, rate);
    return buildSingleDataset(
      displaySymbolFromSlug(slug),
      points,
      DATASET_COLORS[index % DATASET_COLORS.length],
      index + 1,
      slug,
    );
  });
}

function buildStepHeldTotals(
  snapshots: LocalPortfolioSnapshot[],
  grid: number[],
  rate: number,
): ApiPortfolioHistoryList {
  let cursor = 0;
  let last: number | null = null;

  return grid.map((ts) => {
    while (cursor < snapshots.length && snapshots[cursor].dayTs <= ts) {
      last = snapshots[cursor].totalUsd * rate;
      cursor += 1;
    }
    return [ts, last];
  });
}

function buildStepHeldSlug(
  snapshots: LocalPortfolioSnapshot[],
  grid: number[],
  slug: string,
  rate: number,
): ApiPortfolioHistoryList {
  let cursor = 0;
  let last: number | null = null;

  return grid.map((ts) => {
    while (cursor < snapshots.length && snapshots[cursor].dayTs <= ts) {
      const snap = snapshots[cursor];
      if (snap.bySlug) {
        // Explicit map for the day: missing slug means sold/zero, not "hold previous"
        last = (snap.bySlug[slug] ?? 0) * rate;
      }
      cursor += 1;
    }
    return [ts, last];
  });
}

function buildDeltaPoints(totals: ApiPortfolioHistoryList): ApiPortfolioHistoryList {
  let prev: number | null = null;

  return totals.map(([ts, value]) => {
    if (value === null) return [ts, null];
    if (prev === null) {
      prev = value;
      return [ts, 0];
    }
    const delta = value - prev;
    prev = value;
    return [ts, delta];
  });
}

function buildCumulativePoints(totals: ApiPortfolioHistoryList): ApiPortfolioHistoryList {
  let prev: number | null = null;
  let cumulative = 0;

  return totals.map(([ts, value]) => {
    if (value === null) return [ts, null];
    if (prev === null) {
      prev = value;
      return [ts, 0];
    }
    cumulative += value - prev;
    prev = value;
    return [ts, cumulative];
  });
}

function buildTimeGrid(fromMs: number, toMs: number, density: string): number[] {
  const stepSec = DENSITY_STEP_SEC[density] ?? DENSITY_STEP_SEC[DEFAULT_DENSITY];
  const startSec = Math.floor(fromMs / 1000 / stepSec) * stepSec;
  const endSec = Math.floor(toMs / 1000);
  const grid: number[] = [];

  for (let ts = startSec; ts <= endSec; ts += stepSec) {
    grid.push(ts);
  }

  if (grid.length === 0) {
    grid.push(endSec);
  }

  return grid;
}

function collectSlugs(snapshots: LocalPortfolioSnapshot[], grid: number[]): string[] {
  if (grid.length === 0) return [];
  const minTs = grid[0];
  const maxTs = grid[grid.length - 1];
  const slugs = new Set<string>();

  for (const snap of snapshots) {
    if (snap.dayTs < minTs || snap.dayTs > maxTs || !snap.bySlug) continue;
    for (const slug of Object.keys(snap.bySlug)) {
      slugs.add(slug);
    }
  }

  return [...slugs].sort();
}

function buildSingleDataset(
  symbol: string,
  points: ApiPortfolioHistoryList,
  color: string,
  assetId = 0,
  contractAddress = symbol,
): ApiPortfolioHistoryDataset {
  return {
    assetId,
    symbol,
    contractAddress,
    color,
    points,
  };
}

function firstFinite(points: ApiPortfolioHistoryList): number | undefined {
  for (const [, value] of points) {
    if (value !== null && Number.isFinite(value)) return value;
  }
  return undefined;
}

function lastFinite(points: ApiPortfolioHistoryList): number | undefined {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i][1];
    if (value !== null && Number.isFinite(value)) return value;
  }
  return undefined;
}

// Native iOS sends unix seconds; web and Android send ISO strings
function parseDate(value: number | string) {
  const date = typeof value === 'number'
    ? new Date(value * 1000)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
