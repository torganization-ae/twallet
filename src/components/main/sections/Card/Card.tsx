import React, {
  type ElementRef,
  memo, useEffect, useLayoutEffect, useMemo, useRef,
} from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type {
  ApiBaseCurrency, ApiCurrencyRates,
} from '../../../../api/types';
import type {
  TokenChartMode,
  UserToken,
} from '../../../../global/types';

import {
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountSettings,
  selectCurrentAccountState,
  selectCurrentAccountTokens,
  selectIsCurrentAccountViewMode,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { calculateFullBalance } from '../../../../util/calculateFullBalance';
import captureEscKeyListener from '../../../../util/captureEscKeyListener';
import { getCardGradient, getCardGradientStyle } from '../../../../util/cardColor';
import { getShortCurrencySymbol } from '../../../../util/formatNumber';
import { IS_IOS, IS_SAFARI } from '../../../../util/windowEnvironment';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useFontScale from '../../../../hooks/useFontScale';
import useHistoryBack from '../../../../hooks/useHistoryBack';
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

import styles from './Card.module.scss';

import portfolioBarsSrc from '../../../../assets/cards/portfolio-bars.svg';

interface OwnProps {
  ref?: ElementRef<HTMLDivElement>;
  onChartCardClose: NoneToVoidFunction;
  tokenChartMode: TokenChartMode;
}

interface StateProps {
  currentAccountId: string;
  isTemporaryAccount?: boolean;
  tokens?: UserToken[];
  currentTokenSlug?: string;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  isSensitiveDataHidden?: true;
  isViewMode: boolean;
  accentColorIndex?: number;
}

let mainKey = 0;

function Card({
  ref,
  currentAccountId,
  isTemporaryAccount,
  tokens,
  currentTokenSlug,
  onChartCardClose,
  tokenChartMode,
  baseCurrency,
  currencyRates,
  isSensitiveDataHidden,
  isViewMode,
  accentColorIndex,
}: OwnProps & StateProps) {
  const {
    ensureAccentColor, switchToPortfolio,
  } = getActions();
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

  const {
    shouldRender: shouldRenderChartCard,
    ref: chartCardRef,
  } = useShowTransition({
    isOpen: Boolean(currentTokenSlug),
    noMountTransition: true,
    withShouldRender: true,
  });

  const handleOpenPortfolio = useLastCallback(() => {
    switchToPortfolio();
  });

  const values = useMemo(() => {
    return tokens ? calculateFullBalance(tokens, currencyRates[baseCurrency]) : undefined;
  }, [tokens, currencyRates, baseCurrency]);

  useHistoryBack({
    isActive: Boolean(currentTokenSlug),
    onBack: onChartCardClose,
  });

  useEffect(
    () => (shouldRenderChartCard ? captureEscKeyListener(onChartCardClose) : undefined),
    [shouldRenderChartCard, onChartCardClose],
  );

  const { primaryValue, primaryWholePart, primaryFractionPart } = values || {};

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
    const portfolioIconClassNames = buildClassName(
      styles.portfolioIcon,
      primaryFractionPart || shortBaseSymbol.length > 1
        ? styles.portfolioIconFraction
        : styles.portfolioIconDefault,
    );
    const noAnimationCounter = !isUpdating || IS_SAFARI || IS_IOS || isSensitiveDataHidden;
    return (
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
              onClick={!isSensitiveDataHidden ? handleOpenPortfolio : undefined}
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
              <img
                src={portfolioBarsSrc}
                alt=""
                className={portfolioIconClassNames}
                draggable={false}
              />
            </span>
          </div>
        </SensitiveData>
      </Transition>
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
      className={buildClassName(styles.containerWrapper, shouldRenderChartCard && styles.withChart)}
    >
      <Transition activeKey={isUpdating ? 1 : 0} name="fade" shouldCleanup className={styles.loadingDotsContainer}>
        {isUpdating ? <LoadingDots isActive isDoubled /> : undefined}
      </Transition>

      <div
        className={buildClassName(styles.container, currentTokenSlug && styles.backstage)}
        style={getCardGradientStyle(getCardGradient(accentColorIndex))}
      >
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
      const { baseCurrency } = global.settings;

      return {
        currentAccountId,
        isTemporaryAccount: selectCurrentAccount(global)?.isTemporary,
        isViewMode: selectIsCurrentAccountViewMode(global),
        tokens: selectCurrentAccountTokens(global),
        currentTokenSlug: accountState?.currentTokenSlug,
        baseCurrency,
        currencyRates: global.currencyRates,
        isSensitiveDataHidden: global.settings.isSensitiveDataHidden,
        accentColorIndex: selectCurrentAccountSettings(global)?.accentColorIndex,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(Card),
);
