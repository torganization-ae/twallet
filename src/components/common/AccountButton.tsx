import React, { memo } from '../../lib/teact/teact';

import type { Account, AccountType } from '../../global/types';

import { IS_TWALLETGRAM_WALLET } from '../../config';
import buildClassName from '../../util/buildClassName';
import { formatAccountAddresses } from '../../util/formatAccountAddress';

import styles from './AccountButton.module.scss';

interface OwnProps {
  accountId: string;
  byChain: Account['byChain'];
  title?: string;
  accountType: AccountType;
  isActive?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  className?: string;
  titleClassName?: string;
  withCheckbox?: boolean;
  onClick?: NoneToVoidFunction;
}

function AccountButton({
  accountId,
  byChain,
  title,
  accountType,
  ariaLabel,
  isActive,
  isLoading,
  className,
  titleClassName,
  withCheckbox,
  onClick,
}: OwnProps) {
  const isHardware = accountType === 'hardware';
  const isViewMode = accountType === 'view';
  const fullClassName = buildClassName(
    className,
    styles.account,
    IS_TWALLETGRAM_WALLET && 'gram',
    isActive && !withCheckbox && styles.account_current,
    isLoading && styles.account_disabled,
    !onClick && styles.account_inactive,
  );

  const formattedAddress = formatAccountAddresses(byChain, 'x-small');

  return (
    <div
      key={accountId}
      className={fullClassName}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {title && (
        <span className={buildClassName(styles.accountName, titleClassName)}>
          {title}
        </span>
      )}
      <div className={styles.accountFooter}>
        {isViewMode && <i className={buildClassName('icon-eye-filled', styles.icon)} aria-hidden />}
        {isHardware && <i className={buildClassName('icon-ledger', styles.icon)} aria-hidden />}
        <span className={styles.accountAddress}>
          {formattedAddress}
        </span>
      </div>
      {withCheckbox
        && <div className={buildClassName(styles.accountCheckMark, isActive && styles.accountCheckMark_active)} />}
    </div>
  );
}

export default memo(AccountButton);
