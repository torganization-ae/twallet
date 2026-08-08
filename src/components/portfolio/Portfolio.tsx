import React, { memo, useEffect, useMemo, useRef, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiBaseCurrency, ApiPriceHistoryPeriod } from '../../api/types';
import type {
  PortfolioCustomDateRange,
  PortfolioHistoryBundle,
  PortfolioPnlChange,
  UserToken,
} from '../../global/types';

import { ANIMATION_LEVEL_MIN } from '../../config';
import {
  selectCurrentAccountId,
  selectCurrentAccountTokens,
  selectPortfolioHistoryBundle,
} from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { calculateFullBalance } from '../../util/calculateFullBalance';
import captureEscKeyListener from '../../util/captureEscKeyListener';
import { formatDateRange } from '../../util/dateFormat';
import { getShortCurrencySymbol } from '../../util/formatNumber';
import { DEFAULT_PORTFOLIO_TIME_RANGE, getTimeRangeStartTs } from '../../util/portfolio/timeRange';
import { captureControlledSwipe } from '../../util/swipeController';
import useTelegramMiniAppSwipeToClose from '../../util/telegram/hooks/useTelegramMiniAppSwipeToClose';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { buildSegmentsByChain, buildSegmentsByTokenKind } from './helpers/buildStackSegments';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useScrolledState from '../../hooks/useScrolledState';

import BackHeader from '../common/BackHeader';
import Balance from './sections/Balance';
import Charts from './sections/Charts';
import CustomDateRangeModal from './sections/CustomDateRangeModal';
import InsightCard from './sections/InsightCard';
import SectionHeader from './sections/SectionHeader';
import TimeRangeSelector from './sections/TimeRangeSelector';

import './sections/chartOverrides.scss';
import styles from './Portfolio.module.scss';

interface OwnProps {
  isActive?: boolean;
}

interface StateProps {
  currentAccountId?: string;
  bundle?: PortfolioHistoryBundle;
  pnlChange?: PortfolioPnlChange;
  isPnlChangeUpdating?: boolean;
  error?: string;
  tokens?: UserToken[];
  baseCurrency: ApiBaseCurrency;
  currencyRate: string;
  timeRange: ApiPriceHistoryPeriod;
  customDateRange?: PortfolioCustomDateRange;
  noAnimation: boolean;
}

function Portfolio({
  isActive,
  currentAccountId,
  bundle,
  pnlChange,
  isPnlChangeUpdating,
  error,
  tokens,
  baseCurrency,
  currencyRate,
  timeRange,
  customDateRange,
  noAnimation,
}: OwnProps & StateProps) {
  const { closePortfolio, openPortfolio, loadPortfolioHistory } = getActions();

  const lang = useLang();
  const baseCurrencySymbol = getShortCurrencySymbol(baseCurrency);
  const rootRef = useRef<HTMLDivElement>();
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  const { disableSwipeToClose, enableSwipeToClose } = useTelegramMiniAppSwipeToClose(isActive);

  useHistoryBack({ isActive, onBack: closePortfolio });

  useEffect(
    () => (isActive ? captureEscKeyListener(closePortfolio) : undefined),
    [isActive],
  );

  useEffect(() => {
    if (!IS_TOUCH_ENV) return undefined;

    return captureControlledSwipe(rootRef.current!, {
      onSwipeRightStart: () => {
        closePortfolio();
        disableSwipeToClose();
      },
      onCancel: () => {
        openPortfolio();
        enableSwipeToClose();
      },
    });
  }, [disableSwipeToClose, enableSwipeToClose]);

  // Load on open and when the account or base currency changes; the handler reads the active range
  // from global. Range changes are loaded by `onChange` alone, so this effect must not depend on `timeRange`.
  useEffect(() => {
    if (isActive) loadPortfolioHistory();
  }, [isActive, currentAccountId, baseCurrency]);

  const { handleScroll, isScrolled } = useScrolledState();

  const handleTimeRangeChange = useLastCallback((range: ApiPriceHistoryPeriod) => {
    loadPortfolioHistory({ range });
  });

  const handleCustomRangeApply = useLastCallback((range: PortfolioCustomDateRange) => {
    loadPortfolioHistory({ customRange: range });
  });

  const handleCalendarClick = useLastCallback(() => {
    setIsCustomRangeOpen(true);
  });

  const balanceValues = useMemo(() => {
    return tokens ? calculateFullBalance(tokens, currencyRate) : undefined;
  }, [tokens, currencyRate]);

  const totalAmount = balanceValues ? Number(balanceValues.primaryValue) : 0;

  const dateRange = useMemo(() => {
    // While updating, `pnlChange` may be buffered from a previous range - don't show its stale window
    if (!isPnlChangeUpdating && pnlChange?.startTs !== undefined && pnlChange.endTs !== undefined) {
      return formatDateRange(lang.code!, pnlChange.startTs, pnlChange.endTs);
    }

    if (customDateRange) {
      const fromTs = Date.parse(`${customDateRange.from}T00:00:00.000Z`);
      const toTs = Date.parse(`${customDateRange.to}T23:59:59.000Z`);
      if (Number.isFinite(fromTs) && Number.isFinite(toTs)) {
        return formatDateRange(lang.code!, fromTs, toTs);
      }
    }

    // Fall back to the nominal selected period
    const startTs = getTimeRangeStartTs(timeRange);
    return startTs !== undefined ? formatDateRange(lang.code!, startTs, Date.now()) : undefined;
  }, [pnlChange, isPnlChangeUpdating, lang.code, timeRange, customDateRange]);

  const segmentsByTokenKind = useMemo(
    () => (tokens ? buildSegmentsByTokenKind(lang, tokens, baseCurrency) : []),
    [tokens, baseCurrency, lang],
  );

  const segmentsByChain = useMemo(
    () => (tokens ? buildSegmentsByChain(tokens, baseCurrency) : []),
    [tokens, baseCurrency],
  );

  return (
    <div ref={rootRef} className={styles.root}>
      <BackHeader title={lang('Portfolio')} withNotchOnScroll isScrolled={isScrolled} onBackClick={closePortfolio} />

      <div className={buildClassName(styles.body, 'custom-scroll')} onScroll={handleScroll}>
        <div className={styles.content}>
          <section className={styles.section}>
            <SectionHeader title={lang('Overview')} range={dateRange} />

            <Balance
              totalAmount={totalAmount}
              baseCurrency={baseCurrency}
              pnlChange={pnlChange}
              isPnlChangeUpdating={isPnlChangeUpdating}
            />
          </section>

          <div className={styles.insightsStack}>
            <div className={styles.section}>
              <SectionHeader title={lang('By Chain')} />

              <InsightCard segments={segmentsByChain} emptyText={lang('No chain balances')} />
            </div>
            <div className={styles.section}>
              <SectionHeader title={lang('Asset Mix')} />

              <InsightCard segments={segmentsByTokenKind} emptyText={lang('No asset balances')} />
            </div>
          </div>

          <Charts
            bundle={bundle}
            baseCurrencySymbol={baseCurrencySymbol}
            dateRange={dateRange}
            error={error}
            dataKey={`${currentAccountId}_${baseCurrency}`}
            noAnimation={noAnimation}
          />
        </div>

        <div className={styles.bottomBar}>
          <TimeRangeSelector
            value={timeRange}
            isCustomActive={Boolean(customDateRange)}
            onChange={handleTimeRangeChange}
            onCalendarClick={handleCalendarClick}
          />
        </div>
      </div>

      <CustomDateRangeModal
        isOpen={isCustomRangeOpen}
        initialRange={customDateRange}
        onClose={() => setIsCustomRangeOpen(false)}
        onApply={handleCustomRangeApply}
      />
    </div>
  );
}

export default memo(
  withGlobal<OwnProps>((global): StateProps => {
    const { portfolio, settings: { baseCurrency } } = global;
    const currentAccountId = selectCurrentAccountId(global);
    const timeRange = portfolio?.activeRange ?? DEFAULT_PORTFOLIO_TIME_RANGE;
    const customDateRange = portfolio?.customDateRange;
    const bundle = currentAccountId
      ? selectPortfolioHistoryBundle(global, currentAccountId, baseCurrency, timeRange)
      : undefined;
    const freshPnlChange = bundle?.pnlChange;
    const lastPnlChange = currentAccountId ? portfolio?.pnlChangeByAccountId?.[currentAccountId] : undefined;
    const isPortfolioLoading = Boolean(portfolio?.isLoading || portfolio?.isRefreshing);
    const pnlChange = freshPnlChange
      ?? (isPortfolioLoading && lastPnlChange?.baseCurrency === baseCurrency ? lastPnlChange : undefined);
    const isPnlChangeUpdating = isPortfolioLoading && (pnlChange === undefined || pnlChange !== freshPnlChange);

    return {
      currentAccountId,
      bundle,
      pnlChange,
      isPnlChangeUpdating,
      error: portfolio?.error,
      tokens: selectCurrentAccountTokens(global),
      baseCurrency,
      currencyRate: global.currencyRates[baseCurrency],
      timeRange,
      customDateRange,
      noAnimation: global.settings.animationLevel === ANIMATION_LEVEL_MIN,
    };
  })(Portfolio),
);
