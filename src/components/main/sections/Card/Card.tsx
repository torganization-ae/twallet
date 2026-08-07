import React, {
  type ElementRef,
  memo, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type {
  ApiBaseCurrency, ApiCurrencyRates, ApiPriceHistoryPeriod, ApiStakingState,
} from '../../../../api/types';
import type { ApiBackendConfig } from '../../../../api/types/backend';
import type {
  IAnchorPosition,
  PortfolioPnlChange,
  TokenChartMode,
  UserToken,
} from '../../../../global/types';
import type { LangFn } from '../../../../hooks/useLang';
import type { DropdownItem } from '../../../ui/Dropdown';

import {
  selectAccountStakingStates, selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountSettings,
  selectCurrentAccountState,
  selectCurrentAccountTokens,
  selectIsCurrentAccountViewMode,
  selectPortfolioHistoryBundle,
  selectPortfolioMainnetWalletKeys,
  selectSeasonalTheme,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { calculateFullBalance } from '../../../../util/calculateFullBalance';
import captureEscKeyListener from '../../../../util/captureEscKeyListener';
import { getCardGradient, getCardGradientStyle } from '../../../../util/cardColor';
import { formatCurrency, formatCurrencyExtended, getShortCurrencySymbol } from '../../../../util/formatNumber';
import { round } from '../../../../util/math';
import { DEFAULT_PORTFOLIO_TIME_RANGE } from '../../../../util/portfolio/timeRange';
import { IS_IOS, IS_SAFARI } from '../../../../util/windowEnvironment';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useFontScale from '../../../../hooks/useFontScale';
import useHistoryBack from '../../../../hooks/useHistoryBack';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';
import useShowTransition from '../../../../hooks/useShowTransition';
import useSyncEffect from '../../../../hooks/useSyncEffect';
import useUpdateIndicator from '../../../../hooks/useUpdateIndicator';
import useWindowSize from '../../../../hooks/useWindowSize';

import AnimatedCounter from '../../../ui/AnimatedCounter';
import LoadingDots from '../../../ui/LoadingDots';
import SensitiveData from '../../../ui/SensitiveData';
import Spinner from '../../../ui/Spinner';
import Transition from '../../../ui/Transition';
import CardAddress from './CardAddress';
import ChartCard from './ChartCard';
import CurrencySwitcherMenu from './CurrencySwitcherMenu';
import SeasonalTheming from './SeasonalTheming';
import { buildSegmentsByChain } from '../../../portfolio/helpers/buildStackSegments';

import styles from './Card.module.scss';

interface OwnProps {
  ref?: ElementRef<HTMLDivElement>;
  onChartCardClose: NoneToVoidFunction;
  tokenChartMode: TokenChartMode;
  onYieldClick: (stakingId?: string) => void;
}

interface StateProps {
  currentAccountId: string;
  isTemporaryAccount?: boolean;
  tokens?: UserToken[];
  currentTokenSlug?: string;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  stakingStates?: ApiStakingState[];
  isSensitiveDataHidden?: true;
  isViewMode: boolean;
  animationLevel: number;
  isSeasonalThemingDisabled?: boolean;
  seasonalTheme?: ApiBackendConfig['seasonalTheme'];
  portfolioActiveRange?: ApiPriceHistoryPeriod;
  portfolioPnlChange?: PortfolioPnlChange;
  isPnlChangeUpdating?: boolean;
  isPortfolioOpen?: boolean;
  accentColorIndex?: number;
}

let mainKey = 0;

function useSeasonalTheming({
  toggleSeasonalTheming,
  lang,
  showToast,
}: {
  toggleSeasonalTheming: (options: { isEnabled: boolean }) => void;
  lang: LangFn;
  showToast: (options: { message: string }) => void;
}) {
  const handleDisableSeasonalTheming = useLastCallback(() => {
    toggleSeasonalTheming({ isEnabled: false });
    showToast({
      message: lang('You can always enable seasonal theming again in the appearance settings.'),
    });
  });

  const seasonalContextMenuItems = useMemo<DropdownItem<'disable'>[]>(() => ([
    {
      value: 'disable',
      name: lang('Disable Seasonal Theming'),
      fontIcon: 'eye-closed',
    },
  ]), [lang]);

  return {
    seasonalContextMenuItems,
    handleDisableSeasonalTheming,
  };
}

function Card({
  ref,
  currentAccountId,
  isTemporaryAccount,
  tokens,
  currentTokenSlug,
  onChartCardClose,
  tokenChartMode,
  onYieldClick,
  baseCurrency,
  currencyRates,
  stakingStates,
  isSensitiveDataHidden,
  isViewMode,
  animationLevel,
  isSeasonalThemingDisabled,
  seasonalTheme,
  portfolioActiveRange,
  portfolioPnlChange,
  isPnlChangeUpdating,
  isPortfolioOpen,
  accentColorIndex,
}: OwnProps & StateProps) {
  const {
    ensureAccentColor, toggleSeasonalTheming, showToast, switchToPortfolio,
    loadPortfolioPnlChange,
  } = getActions();
  const lang = useLang();
  const amountRef = useRef<HTMLDivElement>();
  const cardRef = useRef<HTMLDivElement>();
  const shortBaseSymbol = getShortCurrencySymbol(baseCurrency);
  const { isPortrait } = useDeviceScreen();
  const { width: screenWidth } = useWindowSize();
  const isUpdating = useUpdateIndicator('balanceUpdateStartedAt');
  const { updateFontScale } = useFontScale(amountRef);
  // Screen width affects font size only in portrait orientation
  const screenWidthDep = isPortrait ? screenWidth : 0;

  useSyncEffect(() => {
    if (currentAccountId) {
      mainKey += 1;
    }
  }, [currentAccountId, isTemporaryAccount]);

  useEffect(() => {
    ensureAccentColor();
  }, [currentAccountId]);

  const [currencyMenuAnchor, setCurrencyMenuAnchor] = useState<IAnchorPosition>();

  const {
    shouldRender: shouldRenderChartCard,
    ref: chartCardRef,
  } = useShowTransition({
    isOpen: Boolean(currentTokenSlug),
    noMountTransition: true,
    withShouldRender: true,
  });

  const openCurrencyMenu = () => {
    const { left, width, bottom: y } = amountRef.current!.getBoundingClientRect();
    setCurrencyMenuAnchor({ x: left + width / 2, y });
  };

  const closeCurrencyMenu = useLastCallback(() => {
    setCurrencyMenuAnchor(undefined);
  });

  const { seasonalContextMenuItems, handleDisableSeasonalTheming } = useSeasonalTheming({
    toggleSeasonalTheming,
    lang,
    showToast,
  });

  const values = useMemo(() => {
    return tokens ? calculateFullBalance(tokens, stakingStates, currencyRates[baseCurrency]) : undefined;
  }, [tokens, stakingStates, currencyRates, baseCurrency]);

  const chainSegments = useMemo(() => {
    if (!tokens?.length) return [];
    return buildSegmentsByChain(tokens, baseCurrency);
  }, [tokens, baseCurrency]);

  const chainSegmentsTotal = useMemo(
    () => chainSegments.reduce((sum, segment) => sum + segment.rawAmount, 0),
    [chainSegments],
  );

  // Refresh the card's range change while the Portfolio screen is closed (it keeps it updated on its own
  // while open), and whenever the total balance changes, so the value tracks the live net worth
  useEffect(() => {
    if (portfolioActiveRange && !isPortfolioOpen) {
      loadPortfolioPnlChange();
    }
  }, [currentAccountId, baseCurrency, portfolioActiveRange, isPortfolioOpen, values?.primaryValue]);

  useHistoryBack({
    isActive: Boolean(currentTokenSlug),
    onBack: onChartCardClose,
  });

  useEffect(
    () => (shouldRenderChartCard ? captureEscKeyListener(onChartCardClose) : undefined),
    [shouldRenderChartCard, onChartCardClose],
  );

  const { primaryValue, primaryWholePart, primaryFractionPart } = values || {};

  const changeValue = portfolioPnlChange ? portfolioPnlChange.amount : values?.changeValue;
  const changePercent = portfolioPnlChange
    ? (portfolioPnlChange.percent !== undefined ? round(portfolioPnlChange.percent, 2) : undefined)
    : values?.changePercent;
  const changePrefix = portfolioPnlChange
    ? (portfolioPnlChange.amount > 0 ? 'up' : portfolioPnlChange.amount < 0 ? 'down' : undefined)
    : values?.changePrefix;
  const hasChangePercent = !!changePrefix && changePercent !== undefined;

  useLayoutEffect(() => {
    if (primaryValue !== undefined) {
      updateFontScale();
    }
  }, [primaryFractionPart, primaryValue, primaryWholePart, shortBaseSymbol, updateFontScale, screenWidthDep]);

  function renderLoader() {
    return (
      <div className={buildClassName(styles.isLoading)}>
        <Spinner color="white" className={styles.center} />
      </div>
    );
  }

  function renderBalance() {
    const iconCaretClassNames = buildClassName(
      'icon',
      'icon-expand',
      primaryFractionPart || shortBaseSymbol.length > 1 ? styles.iconCaretFraction : styles.iconCaret,
    );
    const noAnimationCounter = !isUpdating || IS_SAFARI || IS_IOS || isSensitiveDataHidden;
    return (
      <>
        <Transition
          ref={amountRef}
          activeKey={isUpdating && !isSensitiveDataHidden ? 1 : 0}
          name="fade"
          shouldCleanup
          className={styles.balanceTransition}
          slideClassName={styles.balanceSlide}
        >
          <SensitiveData
            isActive={isSensitiveDataHidden}
            rows={4}
            cols={14}
            cellSize={13}
            align="center"
            isAdaptive
            className={styles.sensitiveData}
            contentClassName={styles.sensitiveDataContent}
            maskClassName={styles.blurred}
          >
            <div className={buildClassName(styles.primaryValue, 'rounded-font')}>
              <span
                className={buildClassName(
                  styles.currencySwitcher,
                  isUpdating && 'glare-text',
                )}
                role="button"
                tabIndex={0}
                onClick={!isSensitiveDataHidden ? openCurrencyMenu : undefined}
              >
                {shortBaseSymbol.length === 1 && <span className={styles.currencySymbol}>{shortBaseSymbol}</span>}
                <AnimatedCounter isDisabled={noAnimationCounter} text={primaryWholePart ?? ''} />
                {primaryFractionPart && (
                  <span className={styles.primaryFractionPart}>
                    <AnimatedCounter isDisabled={noAnimationCounter} text={`.${primaryFractionPart}`} />
                  </span>
                )}
                {shortBaseSymbol.length > 1 && (
                  <span className={styles.primaryFractionPart}>&nbsp;{shortBaseSymbol}</span>
                )}
                <i className={iconCaretClassNames} aria-hidden />
              </span>
            </div>
          </SensitiveData>
        </Transition>
        <CurrencySwitcherMenu
          isOpen={Boolean(currencyMenuAnchor)}
          triggerRef={amountRef}
          anchor={currencyMenuAnchor}
          className={styles.currencySwitcherMenu}
          bubbleClassName={styles.currencySwitcherMenuBubble}
          onClose={closeCurrencyMenu}
        />
        {primaryValue !== '0' && (
          <SensitiveData
            isActive={isSensitiveDataHidden}
            rows={2}
            cols={11}
            align="center"
            cellSize={14}
            isAdaptive
            className={styles.changeSpoiler}
            contentClassName={styles.sensitiveDataContent}
            maskClassName={styles.blurred}
          >
            <div
              className={buildClassName(
                styles.change,
                changePrefix === 'up' && styles.positive,
                'rounded-font',
              )}
              role="button"
              tabIndex={0}
              onClick={() => switchToPortfolio()}
            >
              <span className={buildClassName(styles.changeValue, isPnlChangeUpdating && 'glare-text')}>
                {hasChangePercent && (
                  <>
                    <i
                      className={buildClassName(
                        styles.changePrefix,
                        changePrefix === 'up' ? 'icon-arrow-up' : 'icon-arrow-down',
                      )}
                      aria-hidden
                    />
                    <AnimatedCounter text={`${Math.abs(changePercent)}%`} />
                    {' · '}
                  </>
                )}
                <AnimatedCounter text={hasChangePercent
                  ? formatCurrency(Math.abs(changeValue!), shortBaseSymbol)
                  : formatCurrencyExtended(changeValue!, shortBaseSymbol)}
                />
                <i className={buildClassName(styles.changeChevron, 'icon-chevron-right')} aria-hidden />
              </span>
            </div>
          </SensitiveData>
        )}
        {chainSegments.length > 1 && chainSegmentsTotal > 0 && (
          <button
            type="button"
            className={styles.chainBreakdown}
            onClick={() => switchToPortfolio()}
          >
            <div className={styles.chainBar}>
              {chainSegments.map((segment) => (
                <span
                  key={segment.id}
                  className={styles.chainBarSegment}
                  style={`width: ${(segment.rawAmount / chainSegmentsTotal) * 100}%; background: ${segment.colorHex}`}
                  title={`${segment.title} ${Math.round((segment.rawAmount / chainSegmentsTotal) * 100)}%`}
                />
              ))}
            </div>
            <div className={styles.chainChips}>
              {chainSegments.slice(0, 4).map((segment) => (
                <span key={segment.id} className={styles.chainChip}>
                  <i className={styles.chainChipDot} style={`background: ${segment.colorHex}`} aria-hidden />
                  {segment.title}
                  {' '}
                  {Math.round((segment.rawAmount / chainSegmentsTotal) * 100)}
                  %
                </span>
              ))}
            </div>
          </button>
        )}
      </>
    );
  }

  return (
    <div
      ref={(el) => {
        cardRef.current = el || undefined;
        if (ref) {
          ref.current = el;
        }
      }}
      className={styles.containerWrapper}
    >
      <Transition activeKey={isUpdating ? 1 : 0} name="fade" shouldCleanup className={styles.loadingDotsContainer}>
        {isUpdating ? <LoadingDots isActive isDoubled /> : undefined}
      </Transition>

      <div
        className={buildClassName(styles.container, currentTokenSlug && styles.backstage)}
        style={getCardGradientStyle(getCardGradient(accentColorIndex))}
      >
        <SeasonalTheming
          animationLevel={animationLevel}
          seasonalTheme={seasonalTheme}
          isSeasonalThemingDisabled={isSeasonalThemingDisabled}
          seasonalContextMenuItems={seasonalContextMenuItems}
          onDisableSeasonalTheming={handleDisableSeasonalTheming}
        />

        <div className={styles.containerInner}>
          {values ? renderBalance() : renderLoader()}
          <Transition
            activeKey={mainKey}
            name="fade"
            className={styles.cardAddressContainer}
            slideClassName={styles.cardAddressSlide}
          >
            <CardAddress />
          </Transition>
        </div>
      </div>

      {shouldRenderChartCard && (
        <ChartCard
          tokenSlug={currentTokenSlug}
          ref={chartCardRef}
          isUpdating={isUpdating}
          tokenChartMode={tokenChartMode}
          onYieldClick={isViewMode ? undefined : onYieldClick}
        />
      )}
    </div>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const currentAccountId = selectCurrentAccountId(global)!;
      const accountState = selectCurrentAccountState(global);
      const stakingStates = selectAccountStakingStates(global, currentAccountId);

      const { baseCurrency } = global.settings;
      // Portfolio history exists only for `mainnet` account
      const isPortfolioSupported = selectPortfolioMainnetWalletKeys(global).length > 0;
      const portfolioActiveRange = isPortfolioSupported ? global.portfolio?.activeRange : DEFAULT_PORTFOLIO_TIME_RANGE;
      const rangePnlChange = portfolioActiveRange
        ? selectPortfolioHistoryBundle(global, currentAccountId, baseCurrency, portfolioActiveRange)?.pnlChange
        : undefined;
      // The cached PnL is reused only while it matches the current range and currency
      const cachedPnlChange = global.portfolio?.pnlChangeByAccountId?.[currentAccountId];
      const isSlotMatch = cachedPnlChange?.baseCurrency === baseCurrency
        && cachedPnlChange?.range === portfolioActiveRange;
      const isPortfolioLoading = Boolean(global.portfolio?.isLoading || global.portfolio?.isRefreshing);
      const freshPnlChange = rangePnlChange ?? (isSlotMatch ? cachedPnlChange : undefined);
      // Show the up-to-date range value, or keep the previous value while a new range is still loading
      const portfolioPnlChange = freshPnlChange
        ?? (isPortfolioLoading && cachedPnlChange?.baseCurrency === baseCurrency ? cachedPnlChange : undefined);
      const isPnlChangeUpdating = isPortfolioLoading
        && (portfolioPnlChange === undefined || portfolioPnlChange !== freshPnlChange);

      return {
        currentAccountId,
        isTemporaryAccount: selectCurrentAccount(global)?.isTemporary,
        isViewMode: selectIsCurrentAccountViewMode(global),
        tokens: selectCurrentAccountTokens(global),
        currentTokenSlug: accountState?.currentTokenSlug,
        baseCurrency,
        currencyRates: global.currencyRates,
        stakingStates,
        isSensitiveDataHidden: global.settings.isSensitiveDataHidden,
        animationLevel: global.settings.animationLevel,
        isSeasonalThemingDisabled: global.settings.isSeasonalThemingDisabled,
        seasonalTheme: selectSeasonalTheme(global),
        portfolioActiveRange,
        portfolioPnlChange,
        isPnlChangeUpdating,
        isPortfolioOpen: global.isPortfolioOpen,
        accentColorIndex: selectCurrentAccountSettings(global)?.accentColorIndex,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(Card),
);
