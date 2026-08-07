import React, { memo, useEffect, useRef } from '../../../../lib/teact/teact';

import type { Account, AccountType } from '../../../../global/types';
import type { AccountTab } from './constants';

import { IS_FEATURE_LIMITED } from '../../../../config';
import buildClassName from '../../../../util/buildClassName';

import Transition from '../../../ui/Transition';
import AccountsEmptyState from './AccountsEmptyState';
import AccountWalletCard from './AccountWalletCard';

import styles from './AccountSelectorModal.module.scss';

interface OwnProps {
  isActive: boolean;
  isTestnet?: boolean;
  filteredAccounts: Array<[string, Account]>;
  activeTab: AccountTab;
  balancesByAccountId: Record<string, { wholePart: string; fractionPart?: string; currencySymbol: string }>;
  currentAccountId: string;
  isSensitiveDataHidden?: true;
  onSwitchAccount: (accountId: string) => void;
  onRename: (accountId: string) => void;
  onReorder: NoneToVoidFunction;
  onLogOut: (accountId: string) => void;
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  onScrollInitialize: (scrollContainer: HTMLDivElement) => void;
}

function AccountsGridView({
  isActive,
  isTestnet,
  filteredAccounts,
  activeTab,
  balancesByAccountId,
  currentAccountId,
  isSensitiveDataHidden,
  onSwitchAccount,
  onRename,
  onReorder,
  onLogOut,
  onScroll,
  onScrollInitialize,
}: OwnProps) {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (isActive && ref.current?.parentElement) {
      onScrollInitialize(ref.current.parentElement as HTMLDivElement);
    }
  }, [isActive, activeTab, onScrollInitialize]);

  function renderCard(
    accountId: string,
    byChain: Account['byChain'],
    accountType: AccountType,
    title?: string,
    profile?: Account['profile'],
  ) {
    const isActive = accountId === currentAccountId;
    const balanceData = balancesByAccountId[accountId];

    return (
      <AccountWalletCard
        key={accountId}
        isTestnet={isTestnet}
        accountId={accountId}
        byChain={byChain}
        accountType={accountType}
        isActive={isActive}
        title={title}
        profile={profile}
        balanceData={balanceData}
        withContextMenu={!IS_FEATURE_LIMITED}
        isSensitiveDataHidden={isSensitiveDataHidden}
        onClick={onSwitchAccount}
        onRename={onRename}
        onReorder={onReorder}
        onLogOut={onLogOut}
      />
    );
  }

  return (
    <Transition
      shouldWrap
      isScrollOnWrap
      activeKey={activeTab}
      name="semiFade"
      className={styles.accountsContainer}
      slideClassName={buildClassName(styles.contentSlide, 'custom-scroll')}
      onScroll={onScroll}
    >
      {filteredAccounts.length === 0 ? (
        <AccountsEmptyState ref={ref} isActive={isActive} tab={activeTab} />
      ) : (
        <div
          ref={ref}
          className={buildClassName(styles.gridContainer, styles.container)}
        >
          {filteredAccounts.map(
            ([accountId, {
              title,
              byChain,
              type,
              profile,
            }]) => {
              return renderCard(accountId, byChain, type, title, profile);
            },
          )}
        </div>
      )}
    </Transition>
  );
}

export default memo(AccountsGridView);
