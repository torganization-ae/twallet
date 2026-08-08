import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiChain, ApiNetwork } from '../../api/types';

import {
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountState,
} from '../../global/selectors';
import { getOrderedAccountChains, resolveReceiveChain } from '../../util/chain';

import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';
import Content from './Content';
import ReceiveChainSelector from './ReceiveChainSelector';

import styles from './ReceiveModal.module.scss';

type StateProps = {
  isOpen?: boolean;
  visibleChains: ApiChain[];
  chain?: ApiChain;
};

function ReceiveModal({
  isOpen,
  visibleChains,
  chain,
}: StateProps) {
  const { closeReceiveModal } = getActions();

  const selectedChain = resolveReceiveChain(visibleChains, chain);

  return (
    <Modal
      isOpen={isOpen}
      dialogClassName={styles.modalDialog}
      onClose={closeReceiveModal}
    >
      <ModalHeader
        className={styles.receiveHeader}
        leftContent={selectedChain ? (
          <ReceiveChainSelector
            chains={visibleChains}
            selectedChain={selectedChain}
          />
        ) : undefined}
        onClose={closeReceiveModal}
      />
      <Content
        isOpen={isOpen}
        onClose={closeReceiveModal}
      />
    </Modal>
  );
}

export default memo(withGlobal((global): StateProps => {
  const account = selectCurrentAccount(global);
  const { receiveModalChain } = selectCurrentAccountState(global) || {};
  const network: ApiNetwork = global.settings.isTestnet ? 'testnet' : 'mainnet';
  const visibleChains = getOrderedAccountChains(account?.byChain ?? {}, network);

  return {
    isOpen: global.isReceiveModalOpen,
    visibleChains,
    chain: receiveModalChain,
  };
}, (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)))(ReceiveModal));
