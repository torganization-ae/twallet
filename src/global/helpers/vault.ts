import type { GlobalState } from '../types';

import { callApi } from '../../api';

/** Push GlobalState vault profiles into API-side chain visibility storage. */
export function syncVaultAccountsFromGlobal(global: GlobalState) {
  const vaultIds = Object.entries(global.accounts?.byId ?? {})
    .filter(([, account]) => account.profile === 'vault')
    .map(([accountId]) => accountId);

  void callApi('syncVaultAccounts', vaultIds);
}
