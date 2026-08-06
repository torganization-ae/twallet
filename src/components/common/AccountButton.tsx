import React, { memo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { Account, AccountType } from '../../global/types';

import { selectAccountSettings } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { getCardGradient, getCardGradientStyle } from '../../util/cardColor';
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

interface StateProps {
  accentColorIndex?: number;
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
  accentColorIndex,
}: OwnProps & StateProps) {
  const isHardware = accountType === 'hardware';
  const isViewMode = accountType === 'view';
  const fullClassName = buildClassName(
    className,
    styles.account,
    isActive && !withCheckbox && styles.account_current,
    isLoading && styles.account_disabled,
    !onClick && styles.account_inactive,
  );

  const formattedAddress = formatAccountAddresses(byChain, 'x-small');

  return (
    <div
      key={accountId}
      className={fullClassName}
      style={getCardGradientStyle(getCardGradient(accentColorIndex))}
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

export default memo(withGlobal((global, { accountId }): StateProps => ({
  accentColorIndex: selectAccountSettings(global, accountId)?.accentColorIndex,
}))(AccountButton));
