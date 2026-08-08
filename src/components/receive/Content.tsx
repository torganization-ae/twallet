import React, { memo, useEffect } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiChain, ApiNetwork } from '../../api/types';
import type { Account } from '../../global/types';

import {
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectIsCurrentAccountViewMode,
} from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { getOrderedAccountChains, resolveReceiveChain } from '../../util/chain';

import { useDeviceScreen } from '../../hooks/useDeviceScreen';
import useLang from '../../hooks/useLang';

import Transition from '../ui/Transition';
import Address from './content/Address';

import styles from './ReceiveModal.module.scss';

interface StateProps {
  accountChains?: Account['byChain'];
  isLedger?: boolean;
  isViewMode: boolean;
  chain?: ApiChain;
  visibleChains: ApiChain[];
}

type OwnProps = {
  isOpen?: boolean;
  onClose?: NoneToVoidFunction;
};

function Content({
  isOpen, accountChains, chain, isLedger, isViewMode, visibleChains, onClose,
}: StateProps & OwnProps) {
  const { setReceiveActiveTab } = getActions();

  // `lang.code` is used to force redrawing of the `Transition` content,
  // since the height of the content differs from translation to translation.
  const lang = useLang();
  const { isPortrait } = useDeviceScreen();

  const activeChain = resolveReceiveChain(visibleChains, chain);
  const activeTab = activeChain ? visibleChains.indexOf(activeChain) : 0;

  useEffect(() => {
    if (activeChain && activeChain !== chain) {
      setReceiveActiveTab({ chain: activeChain });
    }
  }, [activeChain, chain]);

  function renderAddress(isActive: boolean, isFrom: boolean, currentKey: number) {
    const renderChain = visibleChains[currentKey];
    if (!renderChain) {
      return undefined;
    }

    return (
      <Address
        chain={renderChain}
        isActive={isOpen && isActive}
        isLedger={isLedger}
        isViewMode={isViewMode}
        address={accountChains?.[renderChain]?.address ?? ''}
        onClose={onClose}
      />
    );
  }

  if (!visibleChains.length || !activeChain) {
    return undefined;
  }

  return (
    <Transition
      key={`content_${lang.code}`}
      activeKey={activeTab}
      name={isPortrait ? 'slide' : 'semiFade'}
      className={styles.contentWrapper}
      slideClassName={buildClassName(styles.content, 'custom-scroll')}
    >
      {renderAddress}
    </Transition>
  );
}

export default memo(
  withGlobal<OwnProps>((global): StateProps => {
    const account = selectCurrentAccount(global);
    const { receiveModalChain } = selectCurrentAccountState(global) || {};
    const network: ApiNetwork = global.settings.isTestnet ? 'testnet' : 'mainnet';
    const visibleChains = getOrderedAccountChains(account?.byChain ?? {}, network);

    return {
      accountChains: account?.byChain,
      isLedger: account?.type === 'hardware',
      isViewMode: selectIsCurrentAccountViewMode(global),
      chain: receiveModalChain,
      visibleChains,
    };
  },
  (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)))(Content),
);
