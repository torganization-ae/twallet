import React, { memo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiChain } from '../../../api/types';

import { selectIsCurrentAccountViewMode } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { getChainConfig } from '../../../util/chain';
import { getNativeToken } from '../../../util/tokens';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import styles from './Actions.module.scss';

interface OwnProps {
  chain: ApiChain;
  isLedger?: boolean;
  className?: string;
  onClose?: NoneToVoidFunction;
}

interface StateProps {
  isTestnet?: boolean;
  isSwapDisabled?: boolean;
  isViewMode?: boolean;
}

function Actions({
  chain,
  className,
  isTestnet,
  isLedger,
  isSwapDisabled,
  isViewMode,
  onClose,
}: OwnProps & StateProps) {
  const {
    startSwap,
    openInvoiceModal,
    closeReceiveModal,
  } = getActions();

  const lang = useLang();

  const { formatTransferUrl, buySwap } = getChainConfig(chain);
  const isSwapAllowed = !isViewMode && !isTestnet && !isLedger && !isSwapDisabled && !!buySwap;
  const isDepositLinkSupported = !!formatTransferUrl;
  const shouldRender = Boolean(isSwapAllowed || isDepositLinkSupported);

  const handleSwapClick = useLastCallback(() => {
    startSwap({
      tokenInSlug: buySwap!.tokenInSlug,
      tokenOutSlug: getNativeToken(chain).slug,
      amountIn: buySwap!.amountIn,
    });
    onClose?.();
  });

  const handleReceiveClick = useLastCallback(() => {
    closeReceiveModal();
    openInvoiceModal({ tokenSlug: getNativeToken(chain).slug });
    onClose?.();
  });

  const contentClassName = buildClassName(
    styles.actionButtons,
    className,
  );

  if (!shouldRender) {
    return undefined;
  }

  return (
    <div className={contentClassName}>
      {isSwapAllowed && (
        <div className={styles.actionButton} onClick={handleSwapClick}>
          <i className={buildClassName(styles.actionIcon, 'icon-crypto')} aria-hidden />
          {lang('Buy with Crypto')}
          <i className={buildClassName(styles.iconChevronRight, 'icon-chevron-right')} aria-hidden />
        </div>
      )}
      {isDepositLinkSupported && (
        <div className={styles.actionButton} onClick={handleReceiveClick}>
          <i className={buildClassName(styles.actionIcon, 'icon-link')} aria-hidden />
          {lang('Create Deposit Link')}
          <i className={buildClassName(styles.iconChevronRight, 'icon-chevron-right')} aria-hidden />
        </div>
      )}
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  const {
    isSwapDisabled,
  } = global.restrictions;

  return {
    isTestnet: global.settings.isTestnet,
    isSwapDisabled,
    isViewMode: selectIsCurrentAccountViewMode(global),
  };
})(Actions));
