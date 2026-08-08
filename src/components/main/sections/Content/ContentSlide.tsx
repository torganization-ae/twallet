import React, { memo } from '../../../../lib/teact/teact';

import type { ApiNftCollection } from '../../../../api/types';
import { ContentTab } from '../../../../global/types';

import Transition from '../../../ui/Transition';
import Activities from './Activities';
import Assets from './Assets';
import Nfts from './Nfts';

import styles from './Content.module.scss';

interface OwnProps {
  isActive: boolean;
  isPortrait: boolean;
  activeTabId?: ContentTab | number;
  currentCollection?: ApiNftCollection;
  totalTokensAmount: number;
  activeNftKey: number;
  onClickAsset: (slug: string) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

function ContentSlide({
  isActive,
  isPortrait,
  activeTabId,
  currentCollection,
  totalTokensAmount,
  activeNftKey,
  onClickAsset,
  onScroll,
}: OwnProps) {
  if (currentCollection && activeTabId !== ContentTab.Nft) {
    return (
      <Transition
        activeKey={activeNftKey}
        name={isPortrait ? 'slide' : 'slideFade'}
        className={styles.nftsContainer}
        onScroll={onScroll}
      >
        <Nfts
          key={`custom:${currentCollection.address}`}
          isActive={isActive}
          collection={currentCollection}
        />
      </Transition>
    );
  }

  switch (activeTabId) {
    case ContentTab.Assets:
      return (
        <Assets
          isActive={isActive}
          onTokenClick={onClickAsset}
          onScroll={onScroll}
        />
      );
    case ContentTab.Activity:
      return (
        <Activities
          isActive={isActive}
          totalTokensAmount={totalTokensAmount}
          onScroll={onScroll}
        />
      );
    case ContentTab.Nft:
      return (
        <Transition
          activeKey={activeNftKey}
          name={isPortrait ? 'slide' : 'slideFade'}
          className={styles.nftsContainer}
          onScroll={onScroll}
        >
          <Nfts key={currentCollection?.address || 'all'} isActive={isActive} collection={currentCollection} />
        </Transition>
      );
    default:
      return undefined;
  }
}

export default memo(ContentSlide);
