import React, {
  memo, useEffect, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiTokenWithPrice } from '../../api/types';
import { ContentTab, type Theme, type TokenChartMode } from '../../global/types';

import { IS_EXPLORER } from '../../config';
import {
  selectCurrentAccountId,
  selectCurrentAccountSettings,
  selectCurrentAccountState,
  selectIsCurrentAccountViewMode,
  selectIsSwapDisabled,
  selectToken,
} from '../../global/selectors';
import { useAccentColor } from '../../util/accentColor';
import { isNetWorthChartAvailable } from '../../util/assets/netWorth';
import buildClassName from '../../util/buildClassName';
import { captureEvents, SwipeDirection } from '../../util/captureEvents';
import {
  IS_ELECTRON, IS_TOUCH_ENV, REM,
} from '../../util/windowEnvironment';
import { calcSafeAreaTop } from './helpers/calcSafeAreaTop';

import useAppTheme from '../../hooks/useAppTheme';
import useBackgroundMode, { isBackgroundModeActive } from '../../hooks/useBackgroundMode';
import { useDeviceScreen } from '../../hooks/useDeviceScreen';
import useEffectOnce from '../../hooks/useEffectOnce';
import useElementVisibility from '../../hooks/useElementVisibility';
import useFlag from '../../hooks/useFlag';
import useInterval from '../../hooks/useInterval';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import usePreventPinchZoomGesture from '../../hooks/usePreventPinchZoomGesture';

import LinkingDomainModal from '../domain/LinkingDomainModal';
import RenewDomainModal from '../domain/RenewDomainModal';
import InvoiceModal from '../receive/InvoiceModal';
import ReceiveModal from '../receive/ReceiveModal';
import Transition from '../ui/Transition';
import UpdateAvailable from '../ui/UpdateAvailable';
import VestingModal from '../vesting/VestingModal';
import VestingPasswordModal from '../vesting/VestingPasswordModal';
import MainSkeleton from './MainSkeleton';
import AccountSelectorModal from './modals/accountSelector/AccountSelectorModal';
import {
  LandscapeNavBar,
  LandscapeTopActions,
  LandscapeWalletList,
  PortraitActions,
} from './sections/Actions';
import PromoteWallet from './sections/Actions/PromoteWallet';
import Card from './sections/Card';
import PortraitContent from './sections/Content/PortraitContent';
import Header, { HEADER_HEIGHT_REM } from './sections/Header/Header';
import LandscapeLayout from './sections/LandscapeLayout';
import Warnings from './sections/Warnings';

import styles from './Main.module.scss';

interface OwnProps {
  isActive?: boolean;
}

type StateProps = {
  currentTokenSlug?: string;
  currentToken?: ApiTokenWithPrice;
  isTestnet?: boolean;
  isViewMode: boolean;
  isSwapDisabled?: boolean;
  isMediaViewerOpen?: boolean;
  isAppReady?: boolean;
  theme: Theme;
  accentColorIndex?: number;
};

const UPDATE_SWAPS_INTERVAL_NOT_FOCUSED = 15000; // 15 sec
const UPDATE_SWAPS_INTERVAL = 3000; // 3 sec

function Main({
  isActive,
  currentTokenSlug,
  isTestnet,
  isViewMode,
  isSwapDisabled,
  isMediaViewerOpen,
  isAppReady,
  theme,
  accentColorIndex,
  currentToken,
}: OwnProps & StateProps) {
  const {
    selectToken,
    openBackupWalletModal,
    setActiveContentTab,
    loadExploreSites,
    updatePendingSwaps,
  } = getActions();

  const lang = useLang();
  const cardRef = useRef<HTMLDivElement>();
  const portraitContainerRef = useRef<HTMLDivElement>();
  const landscapeContainerRef = useRef<HTMLDivElement>();

  const safeAreaTop = calcSafeAreaTop();
  const [isFocused, markIsFocused, unmarkIsFocused] = useFlag(!isBackgroundModeActive());
  const [areTabsStuck, setAreTabsStuck] = useState(false);
  const [tokenChartMode, setTokenChartMode] = useState<TokenChartMode>('price');
  const intersectionRootMarginTop = HEADER_HEIGHT_REM * REM + safeAreaTop;

  useBackgroundMode(unmarkIsFocused, markIsFocused);

  usePreventPinchZoomGesture(isMediaViewerOpen);

  const { isPortrait, isLandscape } = useDeviceScreen();

  useEffectOnce(() => {
    loadExploreSites({ isLandscape, langCode: lang.code });
  });

  useInterval(updatePendingSwaps, isFocused ? UPDATE_SWAPS_INTERVAL : UPDATE_SWAPS_INTERVAL_NOT_FOCUSED);

  // Use scroll detection for portrait mode
  const { isVisible: isPageAtTop } = useElementVisibility({
    isDisabled: !isPortrait || !isActive,
    targetRef: cardRef,
    rootMargin: `-${intersectionRootMarginTop}px 0px 0px 0px`,
    threshold: [1],
  });

  const { isVisible: shouldHideBalanceInHeader } = useElementVisibility({
    isDisabled: !isPortrait || !isActive,
    targetRef: cardRef,
    rootMargin: `-${intersectionRootMarginTop}px 0px 0px 0px`,
  });

  const handleChartCardClose = useLastCallback(() => {
    selectToken({ slug: undefined });
    setActiveContentTab({ tab: ContentTab.Assets });
  });

  const isNetWorthChartSupported = isNetWorthChartAvailable(currentToken);

  useEffect(() => {
    if (!currentTokenSlug || !isNetWorthChartSupported) {
      setTokenChartMode('price');
    }
  }, [currentTokenSlug, isNetWorthChartSupported]);

  const handleTokenChartModeChange = useLastCallback((mode: TokenChartMode) => {
    setTokenChartMode(mode);
  });

  useEffect(() => {
    if (!IS_TOUCH_ENV || !isPortrait || !portraitContainerRef.current || !currentTokenSlug) {
      return undefined;
    }

    return captureEvents(portraitContainerRef.current, {
      excludedClosestSelector: '.chart-card',
      onSwipe: (e, direction) => {
        if (direction === SwipeDirection.Right) {
          handleChartCardClose();
          return true;
        }

        return false;
      },
    });
  }, [currentTokenSlug, handleChartCardClose, isPortrait]);

  const appTheme = useAppTheme(theme);
  useAccentColor(isPortrait ? portraitContainerRef : landscapeContainerRef, appTheme, accentColorIndex);

  function renderPortraitLayout() {
    return (
      <div ref={portraitContainerRef} className={styles.portraitContainer}>
        <div className={styles.head}>
          <Warnings onOpenBackupWallet={openBackupWalletModal} />

          <Header
            withBalance={!shouldHideBalanceInHeader}
            areTabsStuck={areTabsStuck}
            isScrolled={!isPageAtTop}
            isChartCardOpen={Boolean(currentTokenSlug)}
            tokenChartMode={tokenChartMode}
            isNetWorthChartAvailable={isNetWorthChartSupported}
            onChartCardBack={handleChartCardClose}
            onTokenChartModeChange={handleTokenChartModeChange}
          />

          <Card
            ref={cardRef}
            onChartCardClose={handleChartCardClose}
            tokenChartMode={tokenChartMode}
          />

          {!isViewMode && (
            <PortraitActions
              containerRef={portraitContainerRef}
              isTestnet={isTestnet}
              isSwapDisabled={isSwapDisabled}
            />
          )}
        </div>

        <PortraitContent
          isActive={isActive}
          onTabsStuck={setAreTabsStuck}
        />
      </div>
    );
  }

  function renderLandscapeLayout() {
    return (
      <div ref={landscapeContainerRef} className={styles.landscapeContainer}>
        <div className={buildClassName(styles.sidebar, 'custom-scroll')}>
          <Warnings onOpenBackupWallet={openBackupWalletModal} />

          <Header
            isChartCardOpen={Boolean(currentTokenSlug)}
            tokenChartMode={tokenChartMode}
            isNetWorthChartAvailable={isNetWorthChartSupported}
            onChartCardBack={handleChartCardClose}
            onTokenChartModeChange={handleTokenChartModeChange}
          />

          <Card
            onChartCardClose={handleChartCardClose}
            tokenChartMode={tokenChartMode}
          />

          <LandscapeTopActions className={styles.landscapeActions} />

          <LandscapeNavBar />
          {/* Core is single-account, and its `Add Wallet` would be dead anyway: AccountSelectorModal is not rendered below. */}
          <LandscapeWalletList />
          {IS_EXPLORER && <PromoteWallet />}
        </div>
        <div className={styles.main}>
          <LandscapeLayout />
        </div>
      </div>
    );
  }

  function renderContent() {
    if (IS_EXPLORER) {
      return (
        <Transition name="semiFade" activeKey={isAppReady ? 1 : 0}>
          {isAppReady
            ? (isPortrait ? renderPortraitLayout() : renderLandscapeLayout())
            : <MainSkeleton isViewMode={isViewMode} />}
        </Transition>
      );
    }

    return isPortrait ? renderPortraitLayout() : renderLandscapeLayout();
  }

  return (
    <>
      {renderContent()}

      <ReceiveModal />
      <InvoiceModal />
      <VestingModal />
      <VestingPasswordModal />
      <RenewDomainModal />
      <LinkingDomainModal />
      {!IS_ELECTRON && <UpdateAvailable />}
      <AccountSelectorModal />
    </>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const accountState = selectCurrentAccountState(global);
      const { currentTokenSlug, isAppReady } = accountState ?? {};
      const currentToken = currentTokenSlug ? selectToken(global, currentTokenSlug) : undefined;

      return {
        currentTokenSlug,
        currentToken,
        isTestnet: global.settings.isTestnet,
        isViewMode: selectIsCurrentAccountViewMode(global),
        isMediaViewerOpen: Boolean(global.mediaViewer?.mediaId),
        isSwapDisabled: selectIsSwapDisabled(global),
        isAppReady,
        theme: global.settings.theme,
        accentColorIndex: selectCurrentAccountSettings(global)?.accentColorIndex,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(Main),
);
