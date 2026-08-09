import { useMemo } from '../lib/teact/teact';

import type {
  ApiBaseCurrency, ApiCurrencyRates,
} from '../api/types';
import type { Account, AccountSettings, GlobalState } from '../global/types';

import {
  selectMultipleAccountsTokensSlow,
} from '../global/selectors';
import { useAccountsBalances } from './useAccountsBalances';

interface OwnProps {
  filteredAccounts: Array<[string, Account]> | undefined;
  sourceAccounts: Record<string, Account> | undefined;
  byAccountId: GlobalState['byAccountId'] | undefined;
  tokenInfo: GlobalState['tokenInfo'] | undefined;
  settingsByAccountId: Record<string, AccountSettings> | undefined;
  areTokensWithNoCostHidden: boolean | undefined;
  baseCurrency: ApiBaseCurrency | undefined;
  currencyRates: ApiCurrencyRates | undefined;
}

export function useMultipleAccountsBalances({
  filteredAccounts,
  sourceAccounts,
  byAccountId,
  tokenInfo,
  settingsByAccountId,
  areTokensWithNoCostHidden,
  baseCurrency,
  currencyRates,
}: OwnProps) {
  const allAccountsTokens = useMemo(() => {
    if (!sourceAccounts || !byAccountId || !tokenInfo || !settingsByAccountId || !baseCurrency || !currencyRates) {
      return undefined;
    }

    return selectMultipleAccountsTokensSlow(
      sourceAccounts,
      byAccountId,
      tokenInfo,
      settingsByAccountId,
      areTokensWithNoCostHidden,
      baseCurrency,
      currencyRates,
    );
  }, [
    sourceAccounts,
    byAccountId,
    tokenInfo,
    settingsByAccountId,
    areTokensWithNoCostHidden,
    baseCurrency,
    currencyRates,
  ]);

  // While no account is narrowed, the `filteredAccounts` identity survives so memoized consumers keep their cache.
  const displayedAccounts = filteredAccounts;

  const balances = useAccountsBalances(
    filteredAccounts,
    allAccountsTokens,
    baseCurrency,
    currencyRates,
  );

  return { ...balances, displayedAccounts };
}
