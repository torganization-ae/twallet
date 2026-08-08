import type {
  ApiBaseCurrency, ApiPortfolioHistoryResponse, ApiPortfolioPnlChangeResponse, ApiPriceHistoryPeriod,
} from '../../../api/types';
import type {
  GlobalState, PortfolioCustomDateRange, PortfolioHistoryBundle, PortfolioPnlChange,
} from '../../types';

import { areDeepEqual } from '../../../util/areDeepEqual';
import {
  buildPortfolioBootstrapHoldings,
  buildPortfolioSnapshotValues,
} from '../../../util/calculateFullBalance';
import {
  DEFAULT_PORTFOLIO_TIME_RANGE,
  getDensityForDateSpan,
  getPortfolioHistorySlot,
  getTimeRangeStartTs,
} from '../../../util/portfolio/timeRange';
import { callApi } from '../../../api';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import { updateHistoryBundle, updatePnlChangeByAccountId, updatePortfolio } from '../../reducers';
import {
  selectAccountTokens,
  selectCurrentAccountId,
  selectPortfolioMainnetWalletKeys,
} from '../../selectors';

const PNL_CHANGE_THROTTLE_MS = 30_000;
const PORTFOLIO_UNAVAILABLE_ERROR = 'Unavailable';
const PORTFOLIO_HISTORY_PENDING_ERROR = 'PortfolioHistoryPending';
const ALL_TIME_START_ISO = '2020-01-01T00:00:00.000Z';
const DAY_START_SUFFIX = 'T00:00:00.000Z';
const DAY_END_SUFFIX = 'T23:59:59.000Z';
const ISO_DATE_LENGTH = 10;

const DENSITY_BY_RANGE: Record<ApiPriceHistoryPeriod, string> = {
  '1D': '5m',
  '7D': '1h',
  '1M': '4h',
  '3M': '1d',
  '1Y': '1d',
  ALL: '1d',
};

let activeRequestId = 0;
let activePnlChangeRequestId = 0;
let lastPnlChangeFetch: { key: string; at: number } | undefined;
const SNAPSHOT_THROTTLE_MS = 60_000;
const SNAPSHOT_EPSILON_USD = 0.01;
const lastSnapshotByAccount: Record<string, { totalUsd: number; at: number }> = {};

addActionHandler('loadPortfolioHistory', (global, actions, payload) => {
  const { range, customRange } = payload || {};

  if (customRange) {
    const normalized = normalizeCustomRange(customRange);
    if (normalized) {
      setGlobal(updatePortfolio(global, {
        customDateRange: normalized,
      }));
    }
  } else if (range) {
    setGlobal(updatePortfolio(global, {
      activeRange: range,
      customDateRange: undefined,
      customHistoryByAccountId: undefined,
    }));
  }

  void runLoadPortfolioHistory();
});

addActionHandler('closePortfolio', () => {
  activeRequestId += 1;
});

addActionHandler('loadPortfolioPnlChange', (global) => {
  void runLoadPortfolioPnlChange(global);
});

addActionHandler('recordPortfolioSnapshot', (global, actions, payload) => {
  const accountId = payload?.accountId ?? selectCurrentAccountId(global);
  if (!accountId) return;

  void persistPortfolioSnapshot(accountId);
});

async function runLoadPortfolioHistory() {
  const requestId = ++activeRequestId;
  let global = getGlobal();

  const accountId = selectCurrentAccountId(global);
  if (!accountId) return;

  await persistPortfolioSnapshot(accountId, true);
  if (requestId !== activeRequestId) return;

  global = getGlobal();
  const wallets = selectPortfolioMainnetWalletKeys(global);
  const { baseCurrency } = global.settings;
  const customDateRange = global.portfolio?.customDateRange;
  const range = global.portfolio?.activeRange ?? DEFAULT_PORTFOLIO_TIME_RANGE;
  const baseSlice = global.portfolio?.historyByAccountId ?? {};
  const currentSlot = customDateRange
    ? getCustomHistorySlot(customDateRange)
    : getPortfolioHistorySlot(range);

  if (wallets.length === 0) {
    setGlobal(updatePortfolio(global, {
      ...(customDateRange
        ? {
          customHistoryByAccountId: updateCustomHistory(
            global.portfolio?.customHistoryByAccountId,
            accountId,
            baseCurrency,
            { fetchedAtSlot: currentSlot },
          ),
        }
        : {
          historyByAccountId: updateHistoryBundle(baseSlice, accountId, baseCurrency, range, {
            fetchedAtSlot: currentSlot,
          }),
        }),
      pnlChangeByAccountId: updatePnlChangeByAccountId(global.portfolio?.pnlChangeByAccountId, accountId),
      activeRange: range,
      isLoading: false,
      isRefreshing: false,
      error: PORTFOLIO_UNAVAILABLE_ERROR,
    }));
    return;
  }

  const existingBundle = customDateRange
    ? global.portfolio?.customHistoryByAccountId?.[accountId]?.[baseCurrency]
    : baseSlice[accountId]?.[baseCurrency]?.[range];
  const hasSeries = Boolean(
    existingBundle?.netWorth || existingBundle?.pnlCumulative || existingBundle?.pnl,
  );
  // Always rebuild after persist: diary may have a fresher same-day point even when the
  // density slot is unchanged (slot-cache assumed immutable remote series)
  const isRefresh = hasSeries;
  setGlobal(updatePortfolio(global, {
    historyByAccountId: baseSlice,
    activeRange: range,
    isLoading: !isRefresh,
    isRefreshing: isRefresh,
    error: undefined,
  }));

  const currencyRate = Number(global.currencyRates[baseCurrency] || 1);
  const tokens = selectAccountTokens(global, accountId);
  const bootstrapHoldings = buildPortfolioBootstrapHoldings(tokens);
  const bootstrapPeriod = resolveBootstrapPeriod(range, customDateRange);

  await callApi(
    'ensurePortfolioSnapshotsSeeded',
    accountId,
    bootstrapHoldings,
    bootstrapPeriod,
  );
  if (requestId !== activeRequestId) return;

  const params = {
    ...(customDateRange ? buildCustomRangeParams(customDateRange) : buildRangeParams(range)),
    accountId,
    currencyRate,
  };

  const [netWorth, pnlCumulative, pnl, pnlChangeResponse] = await Promise.all([
    callApi('fetchPortfolioNetWorthHistory', wallets, baseCurrency, params),
    callApi('fetchPortfolioPnlCumulativeHistory', wallets, baseCurrency, params),
    callApi('fetchPortfolioPnlHistory', wallets, baseCurrency, params),
    callApi('fetchPortfolioPnlChange', wallets, baseCurrency, params),
  ]);

  if (requestId !== activeRequestId) return;

  global = getGlobal();
  const updatedSlice = global.portfolio?.historyByAccountId ?? {};
  const currentCustom = global.portfolio?.customDateRange;
  const currentRange = global.portfolio?.activeRange ?? range;

  // Drop the response if the user switched away from this query window
  if (customDateRange) {
    if (!currentCustom || currentCustom.from !== customDateRange.from || currentCustom.to !== customDateRange.to) {
      return;
    }
  } else if (currentCustom || currentRange !== range) {
    return;
  }

  if (!netWorth && !pnlCumulative && !pnl) {
    setGlobal(updatePortfolio(global, {
      ...(customDateRange
        ? {
          customHistoryByAccountId: updateCustomHistory(
            global.portfolio?.customHistoryByAccountId,
            accountId,
            baseCurrency,
            { fetchedAtSlot: currentSlot },
          ),
        }
        : {
          historyByAccountId: updateHistoryBundle(updatedSlice, accountId, baseCurrency, range, {
            fetchedAtSlot: currentSlot,
          }),
        }),
      activeRange: range,
      isLoading: false,
      isRefreshing: false,
      error: PORTFOLIO_UNAVAILABLE_ERROR,
    }));
    return;
  }

  const pnlChange = buildPnlChange(pnlChangeResponse, range, baseCurrency);
  const bundle: PortfolioHistoryBundle = {
    fetchedAtSlot: currentSlot,
  };
  if (netWorth) bundle.netWorth = netWorth;
  if (pnlCumulative) bundle.pnlCumulative = pnlCumulative;
  if (pnl) bundle.pnl = pnl;
  if (pnlChange) bundle.pnlChange = pnlChange;

  const prevBundle = customDateRange
    ? global.portfolio?.customHistoryByAccountId?.[accountId]?.[baseCurrency]
    : updatedSlice[accountId]?.[baseCurrency]?.[range];
  const mergedBundle: PortfolioHistoryBundle = {
    ...prevBundle,
    ...bundle,
    fetchedAtSlot: currentSlot,
  };
  const isSameBundle = prevBundle !== undefined && areDeepEqual(prevBundle, mergedBundle);
  const hasChartableData = hasChartableSeries(netWorth)
    || hasChartableSeries(pnlCumulative)
    || hasChartableSeries(pnl);

  setGlobal(updatePortfolio(global, {
    ...(customDateRange
      ? {
        customHistoryByAccountId: isSameBundle
          ? global.portfolio?.customHistoryByAccountId
          : updateCustomHistory(
            global.portfolio?.customHistoryByAccountId,
            accountId,
            baseCurrency,
            mergedBundle,
          ),
      }
      : {
        historyByAccountId: isSameBundle
          ? updatedSlice
          : updateHistoryBundle(updatedSlice, accountId, baseCurrency, range, mergedBundle),
      }),
    pnlChangeByAccountId: pnlChange
      ? updatePnlChangeByAccountId(global.portfolio?.pnlChangeByAccountId, accountId, pnlChange)
      : global.portfolio?.pnlChangeByAccountId,
    activeRange: range,
    isLoading: false,
    isRefreshing: false,
    error: hasChartableData ? undefined : PORTFOLIO_HISTORY_PENDING_ERROR,
  }));
}

async function runLoadPortfolioPnlChange(global: GlobalState) {
  const accountId = selectCurrentAccountId(global);
  if (!accountId) return;

  const wallets = selectPortfolioMainnetWalletKeys(global);
  if (wallets.length === 0) return;

  const { baseCurrency } = global.settings;
  const customDateRange = global.portfolio?.customDateRange;
  const range = global.portfolio?.activeRange ?? DEFAULT_PORTFOLIO_TIME_RANGE;

  const throttleKey = customDateRange
    ? `${accountId}_${baseCurrency}_custom_${customDateRange.from}_${customDateRange.to}`
    : `${accountId}_${baseCurrency}_${range}`;
  if (lastPnlChangeFetch?.key === throttleKey && Date.now() - lastPnlChangeFetch.at < PNL_CHANGE_THROTTLE_MS) {
    return;
  }
  lastPnlChangeFetch = { key: throttleKey, at: Date.now() };

  await persistPortfolioSnapshot(accountId, true);

  const requestId = ++activePnlChangeRequestId;
  global = getGlobal();
  const currencyRate = Number(global.currencyRates[baseCurrency] || 1);
  const tokens = selectAccountTokens(global, accountId);
  await callApi(
    'ensurePortfolioSnapshotsSeeded',
    accountId,
    buildPortfolioBootstrapHoldings(tokens),
    resolveBootstrapPeriod(range, customDateRange),
  );
  if (requestId !== activePnlChangeRequestId) return;

  const params = {
    ...(customDateRange ? buildCustomRangeParams(customDateRange) : buildRangeParams(range)),
    accountId,
    currencyRate,
  };
  const pnlChangeResponse = await callApi('fetchPortfolioPnlChange', wallets, baseCurrency, params);

  if (requestId !== activePnlChangeRequestId) return;

  global = getGlobal();
  if (customDateRange) {
    const currentCustom = global.portfolio?.customDateRange;
    if (!currentCustom || currentCustom.from !== customDateRange.from || currentCustom.to !== customDateRange.to) {
      return;
    }
  } else if (
    global.portfolio?.customDateRange
    || (global.portfolio?.activeRange ?? DEFAULT_PORTFOLIO_TIME_RANGE) !== range
  ) {
    return;
  }

  const pnlChange = buildPnlChange(pnlChangeResponse, range, baseCurrency);
  if (!pnlChange) return;

  const baseSlice = global.portfolio?.historyByAccountId ?? {};
  const existingBundle = customDateRange
    ? global.portfolio?.customHistoryByAccountId?.[accountId]?.[baseCurrency]
    : baseSlice[accountId]?.[baseCurrency]?.[range];

  setGlobal(updatePortfolio(global, {
    ...(customDateRange
      ? {
        customHistoryByAccountId: updateCustomHistory(
          global.portfolio?.customHistoryByAccountId,
          accountId,
          baseCurrency,
          {
            ...existingBundle,
            pnlChange,
            fetchedAtSlot: existingBundle?.fetchedAtSlot ?? getCustomHistorySlot(customDateRange),
          },
        ),
      }
      : {
        historyByAccountId: updateHistoryBundle(baseSlice, accountId, baseCurrency, range, {
          ...existingBundle,
          pnlChange,
          fetchedAtSlot: existingBundle?.fetchedAtSlot ?? getPortfolioHistorySlot(range),
        }),
      }),
    pnlChangeByAccountId: updatePnlChangeByAccountId(global.portfolio?.pnlChangeByAccountId, accountId, pnlChange),
  }));
}

async function persistPortfolioSnapshot(accountId: string, force = false) {
  const global = getGlobal();
  const tokens = selectAccountTokens(global, accountId);
  if (!tokens?.length) return;

  const { totalUsd, bySlug } = buildPortfolioSnapshotValues(tokens);

  const previous = lastSnapshotByAccount[accountId];
  const now = Date.now();
  if (
    !force
    && previous
    && now - previous.at < SNAPSHOT_THROTTLE_MS
    && Math.abs(previous.totalUsd - totalUsd) < SNAPSHOT_EPSILON_USD
  ) {
    return;
  }

  await callApi('recordPortfolioSnapshot', accountId, totalUsd, bySlug);
  lastSnapshotByAccount[accountId] = { totalUsd, at: now };
}

function buildPnlChange(
  response: ApiPortfolioPnlChangeResponse | undefined,
  range: ApiPriceHistoryPeriod,
  baseCurrency: ApiBaseCurrency,
): PortfolioPnlChange | undefined {
  if (!response || typeof response.amount !== 'number' || !Number.isFinite(response.amount)) {
    return undefined;
  }

  return {
    range,
    baseCurrency,
    amount: response.amount,
    percent: response.percent,
    startTs: response.startTs,
    endTs: response.endTs,
  };
}

function buildRangeParams(range: ApiPriceHistoryPeriod) {
  const now = new Date();
  const startTs = getTimeRangeStartTs(range, now.getTime());
  const toDay = now.toISOString().slice(0, ISO_DATE_LENGTH);
  return {
    from: startTs === undefined
      ? ALL_TIME_START_ISO
      : `${new Date(startTs).toISOString().slice(0, ISO_DATE_LENGTH)}${DAY_START_SUFFIX}`,
    to: `${toDay}${DAY_END_SUFFIX}`,
    density: DENSITY_BY_RANGE[range],
  };
}

function buildCustomRangeParams(range: PortfolioCustomDateRange) {
  const fromMs = Date.parse(`${range.from}${DAY_START_SUFFIX}`);
  const toMs = Date.parse(`${range.to}${DAY_END_SUFFIX}`);
  return {
    from: `${range.from}${DAY_START_SUFFIX}`,
    to: `${range.to}${DAY_END_SUFFIX}`,
    density: getDensityForDateSpan(fromMs, toMs),
  };
}

function resolveBootstrapPeriod(
  range: ApiPriceHistoryPeriod,
  customDateRange?: PortfolioCustomDateRange,
): ApiPriceHistoryPeriod {
  if (customDateRange) {
    const fromMs = Date.parse(`${customDateRange.from}${DAY_START_SUFFIX}`);
    const toMs = Date.parse(`${customDateRange.to}${DAY_END_SUFFIX}`);
    const spanMs = Math.max(0, toMs - fromMs);
    if (spanMs > 365 * 24 * 60 * 60 * 1000) return 'ALL';
    return '1Y';
  }
  if (range === 'ALL') return 'ALL';
  return '1Y';
}

function normalizeCustomRange(range: PortfolioCustomDateRange): PortfolioCustomDateRange | undefined {
  const from = range.from?.slice(0, ISO_DATE_LENGTH);
  const to = range.to?.slice(0, ISO_DATE_LENGTH);
  if (!from || !to || from.length !== ISO_DATE_LENGTH || to.length !== ISO_DATE_LENGTH) {
    return undefined;
  }
  if (from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function getCustomHistorySlot(range: PortfolioCustomDateRange) {
  // Invalidate when the UTC day rolls so same-day diary updates refresh the custom view
  return getPortfolioHistorySlot('1D');
}

function updateCustomHistory(
  slice: Record<string, Partial<Record<ApiBaseCurrency, PortfolioHistoryBundle>>> | undefined,
  accountId: string,
  baseCurrency: ApiBaseCurrency,
  bundle: PortfolioHistoryBundle,
): Record<string, Partial<Record<ApiBaseCurrency, PortfolioHistoryBundle>>> {
  const byAccount = slice?.[accountId] ?? {};
  return {
    ...(slice ?? {}),
    [accountId]: {
      ...byAccount,
      [baseCurrency]: bundle,
    },
  };
}

function hasChartableSeries(response?: ApiPortfolioHistoryResponse) {
  return Boolean(
    response?.datasets?.some((dataset) => (
      dataset.points.some(([, value]) => typeof value === 'number' && Number.isFinite(value))
    )),
  );
}
