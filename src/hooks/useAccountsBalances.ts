import { useMemo } from '../lib/teact/teact';

import type { ApiBaseCurrency, ApiCurrencyRates } from '../api/types';
import type { Account, UserToken } from '../global/types';

import { Big } from '../lib/big.js';
import { calculateFullBalance } from '../util/calculateFullBalance';
import { formatCurrency, getShortCurrencySymbol } from '../util/formatNumber';

export interface AccountBalance {
  value: string;
  wholePart: string;
  fractionPart?: string;
  currencySymbol: string;
}

export function useAccountsBalances(
  filteredAccounts: Array<[string, Account]> | undefined,
  allAccountsTokens: Record<string, UserToken[] | undefined> | undefined,
  baseCurrency?: ApiBaseCurrency,
  currencyRates?: ApiCurrencyRates,
) {
  const shortBaseSymbol = useMemo(
    () => (baseCurrency ? getShortCurrencySymbol(baseCurrency) : ''),
    [baseCurrency],
  );

  const { balancesByAccountId, totalBalance } = useMemo(() => {
    if (!allAccountsTokens || !currencyRates || !baseCurrency || !filteredAccounts) {
      const balancesByAccountId: Record<string, AccountBalance> = {};
      return { balancesByAccountId, totalBalance: undefined };
    }

    const baseCurrencyRate = currencyRates[baseCurrency];
    const balancesByAccountId: Record<string, AccountBalance> = {};
    let total = Big(0);

    for (const [accountId] of filteredAccounts) {
      const accountTokens = allAccountsTokens[accountId];

      const {
        primaryValue: value,
        primaryWholePart: wholePart,
        primaryFractionPart: fractionPart,
      } = calculateFullBalance(
        accountTokens,
        baseCurrencyRate,
      );

      balancesByAccountId[accountId] = {
        value,
        wholePart,
        fractionPart,
        currencySymbol: shortBaseSymbol,
      };

      total = total.plus(value);
    }

    const totalBalance = formatCurrency(total.toString(), shortBaseSymbol);

    return { balancesByAccountId, totalBalance };
  }, [
    filteredAccounts,
    allAccountsTokens,
    currencyRates,
    baseCurrency,
    shortBaseSymbol,
  ]);

  return { balancesByAccountId, totalBalance };
}
