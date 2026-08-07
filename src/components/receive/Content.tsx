import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiChain, ApiNetwork } from '../../api/types';
import type { Account } from '../../global/types';
import type { TabWithProperties } from '../ui/TabList';

import { DEFAULT_CHAIN } from '../../config';
import {
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectIsCurrentAccountViewMode,
} from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { getChainTitle, getDisplayOrderedChains, getVisibleChains } from '../../util/chain';
import { swapKeysAndValues } from '../../util/iteratees';

import { useDeviceScreen } from '../../hooks/useDeviceScreen';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import TabList from '../ui/TabList';
import Transition from '../ui/Transition';
import Address from './content/Address';

import styles from './ReceiveModal.module.scss';

interface StateProps {
  accountChains?: Account['byChain'];
  isLedger?: boolean;
  isViewMode: boolean;
  chain: ApiChain;
  network: ApiNetwork;
}

type OwnProps = {
  isOpen?: boolean;
  onClose?: NoneToVoidFunction;
};

function Content({
  isOpen, accountChains, chain, isLedger, isViewMode, network, onClose,
}: StateProps & OwnProps) {
  const { setReceiveActiveTab } = getActions();

  // `lang.code` is used to force redrawing of the `Transition` content,
  // since the height of the content differs from translation to translation.
  const lang = useLang();
  const { isPortrait } = useDeviceScreen();

  const orderedChains = getVisibleChains(getDisplayOrderedChains(network), network);
  const tabIdByChain = Object.fromEntries(
    orderedChains.map((orderedChain, index) => [orderedChain, index]),
  ) as Record<ApiChain, number>;
  const chainByTabId = swapKeysAndValues(tabIdByChain);
  const tabs = getChainTabs(accountChains ?? {}, orderedChains, tabIdByChain);
  const activeTab = tabIdByChain[chain] ?? 0;

  const handleSwitchTab = useLastCallback((tabId: number) => {
    const newChain = chainByTabId[tabId];
    if (newChain) {
      setReceiveActiveTab({ chain: newChain });
    }
  });

  function renderAddress(isActive: boolean, isFrom: boolean, currentKey: number) {
    const chain = chainByTabId[currentKey];

    return (
      <Address
        chain={chain}
        isActive={isOpen && isActive}
        isLedger={isLedger}
        isViewMode={isViewMode}
        address={accountChains?.[chain]?.address ?? ''}
        onClose={onClose}
      />
    );
  }

  if (!tabs.length) {
    return undefined;
  }

  return (
    <>
      {tabs.length > 1 && (
        <TabList
          tabs={tabs}
          activeTab={activeTab}
          className={styles.tabs}
          overlayClassName={buildClassName(styles.tabsOverlay, chain && styles[chain])}
          onSwitchTab={handleSwitchTab}
        />
      )}
      <Transition
        key={`content_${lang.code}`}
        activeKey={activeTab}
        name={isPortrait ? 'slide' : 'semiFade'}
        className={styles.contentWrapper}
        slideClassName={buildClassName(styles.content, 'custom-scroll')}
      >
        {renderAddress}
      </Transition>
    </>
  );
}

export default memo(
  withGlobal<OwnProps>((global): StateProps => {
    const account = selectCurrentAccount(global);
    const { receiveModalChain } = selectCurrentAccountState(global) || {};

    return {
      accountChains: account?.byChain,
      isLedger: account?.type === 'hardware',
      isViewMode: selectIsCurrentAccountViewMode(global),
      chain: receiveModalChain ?? DEFAULT_CHAIN,
      network: global.settings.isTestnet ? 'testnet' : 'mainnet',
    };
  },
  (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)))(Content),
);

function getChainTabs(
  accountChains: Partial<Record<ApiChain, unknown>>,
  orderedChains: ApiChain[],
  tabIdByChain: Record<ApiChain, number>,
) {
  const result: TabWithProperties[] = [];

  for (const chain of orderedChains) {
    if (!(chain in accountChains)) {
      continue;
    }

    result.push({
      id: tabIdByChain[chain],
      title: getChainTitle(chain),
      className: buildClassName(styles.tab, styles[chain]),
    });
  }

  return result;
}
