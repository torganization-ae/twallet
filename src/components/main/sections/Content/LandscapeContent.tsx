import React, { memo, useRef } from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import type { ApiNft, ApiNftCollection, ApiStakingState } from '../../../../api/types';
import { type Account, ContentTab } from '../../../../global/types';

import { requestMeasure } from '../../../../lib/fasterdom/fasterdom';
import {
  selectAccountStakingStates,
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountSettings,
  selectCurrentAccountState,
  selectCurrentAccountTokens,
  selectEnabledTokensCountMemoizedFor,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { IS_TOUCH_ENV } from '../../../../util/windowEnvironment';
import { calcVestingAmountByStatus } from '../../helpers/calcVestingAmountByStatus';
import { getScrollableContainer } from '../../helpers/scrollableContainer';

import useHistoryBack from '../../../../hooks/useHistoryBack';
import useLastCallback from '../../../../hooks/useLastCallback';
import useScrolledState from '../../../../hooks/useScrolledState';
import useContentSwipe from './hooks/useContentSwipe';
import useContentTabs from './hooks/useContentTabs';

import TabList from '../../../ui/TabList';
import Transition from '../../../ui/Transition';
import HideNftModal from '../../modals/HideNftModal';
import ContentSlide from './ContentSlide';
import NftCollectionHeader from './NftCollectionHeader';
import NftSelectionHeader from './NftSelectionHeader';

import styles from './Content.module.scss';

interface OwnProps {
  onStakedTokenClick: NoneToVoidFunction;
}

interface StateProps {
  byChain?: Account['byChain'];
  tokensCount: number;
  nfts?: Record<string, ApiNft>;
  currentCollection?: ApiNftCollection;
  selectedNfts?: ApiNft[];
  activeContentTab?: ContentTab;
  currentTokenSlug?: string;
  blacklistedNftAddresses?: string[];
  whitelistedNftAddresses?: string[];
  states?: ApiStakingState[];
  hasVesting: boolean;
  alwaysHiddenSlugs?: string[];
  activityReturnContentTab?: ContentTab;
  selectedNftsToHide?: {
    addresses: string[];
    isCollection: boolean;
  };
  currentSiteCategoryId?: number;
  collectionTabs?: ApiNftCollection[];
}

function LandscapeContent({
  byChain,
  tokensCount,
  nfts,
  currentCollection,
  selectedNfts,
  blacklistedNftAddresses,
  whitelistedNftAddresses,
  selectedNftsToHide,
  states,
  hasVesting,
  alwaysHiddenSlugs,
  activeContentTab,
  activityReturnContentTab,
  currentSiteCategoryId,
  collectionTabs,
  currentTokenSlug,
  onStakedTokenClick,
}: OwnProps & StateProps) {
  const transitionRef = useRef<HTMLDivElement>();
  const tabsRef = useRef<HTMLDivElement>();

  const hasNftSelection = Boolean(selectedNfts?.length);

  const {
    tabs,
    mainContentTabsCount,
    activeTabIndex,
    contentTransitionKey,
    visibleCollectionTabs,
    totalTokensAmount,
    activeNftKey,
    handleSwitchTab,
    handleClickAsset,
  } = useContentTabs({
    byChain,
    nfts,
    blacklistedNftAddresses,
    whitelistedNftAddresses,
    collectionTabs,
    activeContentTab,
    activityReturnContentTab,
    currentCollection,
    currentTokenSlug,
    states,
    hasVesting,
    alwaysHiddenSlugs,
    tokensCount,
  });

  const { isScrolled, handleScroll: handleContentScroll, update: updateScrolledState } = useScrolledState();

  useContentSwipe({
    transitionRef,
    tabs,
    activeTabIndex,
    currentCollection,
    currentSiteCategoryId,
    onSwitchTab: handleSwitchTab,
  });

  useHistoryBack({
    isActive: activeTabIndex !== 0,
    onBack: () => {
      const returnTab = activeContentTab === ContentTab.Activity && activityReturnContentTab !== undefined
        ? activityReturnContentTab
        : ContentTab.Assets;
      handleSwitchTab(returnTab);
    },
  });

  // Settings/Explore/Portfolio render on top of the landscape main area as full-screen overlay slides
  // in `LandscapeLayout`'s outer `Transition`. While such an overlay is active we keep the inner
  // `Transition`'s key frozen so the slide underneath does not change during the open/close animation.
  const isCoveredByLandscapeOverlay = activeContentTab === ContentTab.Settings
    || activeContentTab === ContentTab.Explore
    || activeContentTab === ContentTab.Portfolio;

  const frozenLandscapeKeyRef = useRef(contentTransitionKey);
  if (!isCoveredByLandscapeOverlay) {
    frozenLandscapeKeyRef.current = contentTransitionKey;
  }
  const landscapeActiveKey = isCoveredByLandscapeOverlay
    ? frozenLandscapeKeyRef.current
    : contentTransitionKey;

  const handleContentTransitionStop = useLastCallback(() => {
    requestMeasure(() => {
      const scrollContainer = getScrollableContainer(transitionRef.current, false);
      if (scrollContainer) {
        updateScrolledState(scrollContainer as HTMLElement);
      }
    });
  });

  const handleScrollToTop = useLastCallback(() => {
    const scrollContainer = getScrollableContainer(transitionRef.current, false);
    scrollContainer?.scrollTo(0, 0);
  });

  const containerClassName = buildClassName(
    styles.container,
    IS_TOUCH_ENV && 'swipe-container',
    styles.landscapeContainer,
  );

  const activeTabId = tabs[activeTabIndex]?.id;

  function renderHeader() {
    const isNftSelectionVisible = hasNftSelection
      && (activeContentTab === ContentTab.Nft || Boolean(currentCollection));
    const headerTransitionKey = isNftSelectionVisible ? 2 : (currentCollection ? 1 : 0);

    let header;
    if (isNftSelectionVisible) {
      header = <NftSelectionHeader />;
    } else if (currentCollection) {
      header = <NftCollectionHeader collection={currentCollection} key={currentCollection.address} />;
    } else {
      header = (
        <TabList
          isActive
          tabs={tabs}
          activeTab={activeTabIndex}
          onSwitchTab={handleSwitchTab}
          onActiveTabClick={handleScrollToTop}
          className={buildClassName(styles.tabs, 'content-tabslist')}
          overlayClassName={styles.tabsOverlay}
        />
      );
    }

    return (
      <div
        ref={tabsRef}
        className={buildClassName(
          styles.tabsContainer,
          currentCollection && styles.tabsContainerForNftCollection,
          'with-notch-on-scroll',
          isScrolled && 'is-scrolled',
        )}
      >
        <Transition
          name="slideFade"
          className={styles.tabsContent}
          activeKey={headerTransitionKey}
          slideClassName={styles.tabsSlide}
          shouldCleanup
          cleanupExceptionKey={0}
        >
          {header}
        </Transition>
      </div>
    );
  }

  function renderSlide(isSlideActive: boolean) {
    return (
      <div className={buildClassName(styles.landscapeSlide, 'custom-scroll', 'landscape-content-scroll')}>
        <ContentSlide
          isActive={isSlideActive}
          isPortrait={false}
          activeTabId={activeTabId}
          currentCollection={currentCollection}
          totalTokensAmount={totalTokensAmount}
          activeNftKey={activeNftKey}
          onClickAsset={handleClickAsset}
          onStakedTokenClick={onStakedTokenClick}
          onScroll={handleContentScroll}
        />
      </div>
    );
  }

  return (
    <>
      <div className={containerClassName}>
        <div className={styles.landscapeContentPanel}>
          {renderHeader()}
          <Transition
            ref={transitionRef}
            name="slide"
            activeKey={landscapeActiveKey}
            renderCount={mainContentTabsCount + visibleCollectionTabs.length}
            className={buildClassName(styles.slides, 'content-transition')}
            slideClassName={styles.slide}
            onStop={handleContentTransitionStop}
          >
            {renderSlide}
          </Transition>
        </div>
      </div>
      <HideNftModal
        isOpen={Boolean(selectedNftsToHide?.addresses.length)}
        selectedNftsToHide={selectedNftsToHide}
      />
    </>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const accountId = selectCurrentAccountId(global);
      const {
        activeContentTab,
        activityReturnContentTab,
        currentTokenSlug,
        blacklistedNftAddresses,
        whitelistedNftAddresses,
        selectedNftsToHide,
        vesting,
        nfts: {
          byAddress: nfts,
          currentCollection,
          selectedNfts,
          collectionTabs,
        } = {},
        currentSiteCategoryId,
      } = selectCurrentAccountState(global) ?? {};

      const tokens = selectCurrentAccountTokens(global);
      const tokensCount = accountId ? selectEnabledTokensCountMemoizedFor(accountId)(tokens) : 0;
      const vestingInfo = vesting?.info;
      const hasVesting = Boolean(
        vestingInfo?.length && calcVestingAmountByStatus(vestingInfo, ['frozen', 'ready']) !== '0',
      );
      const states = accountId ? selectAccountStakingStates(global, accountId) : undefined;
      const alwaysHiddenSlugs = selectCurrentAccountSettings(global)?.alwaysHiddenSlugs;

      return {
        byChain: selectCurrentAccount(global)?.byChain,
        nfts,
        currentCollection,
        selectedNfts,
        tokensCount,
        activeContentTab,
        activityReturnContentTab,
        currentTokenSlug,
        blacklistedNftAddresses,
        whitelistedNftAddresses,
        selectedNftsToHide,
        states,
        hasVesting,
        alwaysHiddenSlugs,
        currentSiteCategoryId,
        collectionTabs,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(LandscapeContent),
);
