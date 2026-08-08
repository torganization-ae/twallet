import React, { memo } from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import type { ApiChain } from '../../../api/types';

import buildClassName from '../../../util/buildClassName';
import { getChainConfig } from '../../../util/chain';
import { getNativeToken } from '../../../util/tokens';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import styles from './Actions.module.scss';

interface OwnProps {
  chain: ApiChain;
  className?: string;
  onClose?: NoneToVoidFunction;
}

function Actions({
  chain,
  className,
  onClose,
}: OwnProps) {
  const {
    openInvoiceModal,
    closeReceiveModal,
  } = getActions();

  const lang = useLang();

  const { formatTransferUrl } = getChainConfig(chain);
  const isDepositLinkSupported = !!formatTransferUrl;

  const handleReceiveClick = useLastCallback(() => {
    closeReceiveModal();
    openInvoiceModal({ tokenSlug: getNativeToken(chain).slug });
    onClose?.();
  });

  if (!isDepositLinkSupported) {
    return undefined;
  }

  return (
    <div className={buildClassName(styles.actionButtons, className)}>
      <div className={styles.actionButton} onClick={handleReceiveClick}>
        <i className={buildClassName(styles.actionIcon, 'icon-link')} aria-hidden />
        {lang('Create Deposit Link')}
        <i className={buildClassName(styles.iconChevronRight, 'icon-chevron-right')} aria-hidden />
      </div>
    </div>
  );
}

export default memo(Actions);
