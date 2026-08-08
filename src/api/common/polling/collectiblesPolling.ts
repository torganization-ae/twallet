/**
 * Global gate for NFT / collectibles network polling.
 *
 * Chain modules register factories under an account id; HTTP/socket NFT work
 * starts only while the Collectibles tab is open for that account. Hidden
 * chains never register, so they stay quiet.
 */

type StopFn = NoneToVoidFunction;
type Factory = () => StopFn;

type Registration = {
  factory: Factory;
  stop?: StopFn;
};

const registrationsByAccount = new Map<string, Map<string, Registration>>();

let activeAccountId: string | undefined;
let isCollectiblesTabActive = false;

function startAccount(accountId: string) {
  const byKey = registrationsByAccount.get(accountId);
  if (!byKey) return;

  for (const registration of byKey.values()) {
    if (registration.stop) continue;
    registration.stop = registration.factory();
  }
}

function stopAccount(accountId: string) {
  const byKey = registrationsByAccount.get(accountId);
  if (!byKey) return;

  for (const registration of byKey.values()) {
    registration.stop?.();
    registration.stop = undefined;
  }
}

/**
 * Register NFT polling for an account (+ optional chain key for multi-chain
 * wallets). The factory runs only while collectibles are active for that account.
 */
export function registerCollectiblesPolling(
  accountId: string,
  factory: Factory,
  key = 'default',
): StopFn {
  let byKey = registrationsByAccount.get(accountId);
  if (!byKey) {
    byKey = new Map();
    registrationsByAccount.set(accountId, byKey);
  }

  const previous = byKey.get(key);
  previous?.stop?.();

  const registration: Registration = { factory };
  byKey.set(key, registration);

  if (isCollectiblesTabActive && accountId === activeAccountId) {
    registration.stop = factory();
  }

  return () => {
    const current = registrationsByAccount.get(accountId)?.get(key);
    if (current !== registration) return;
    current.stop?.();
    registrationsByAccount.get(accountId)?.delete(key);
    if (registrationsByAccount.get(accountId)?.size === 0) {
      registrationsByAccount.delete(accountId);
    }
  };
}

/** Call when the UI Collectibles tab opens/closes or the active account changes. */
export function setCollectiblesPollingActive(accountId: string | undefined, isActive: boolean) {
  const previousAccountId = activeAccountId;
  activeAccountId = accountId;
  isCollectiblesTabActive = isActive;

  if (previousAccountId && previousAccountId !== accountId) {
    stopAccount(previousAccountId);
  }

  if (!accountId || !isActive) {
    if (accountId) stopAccount(accountId);
    return;
  }

  startAccount(accountId);
}

/** Keep the tab flag; point NFT polling at the new active wallet account. */
export function retargetCollectiblesPollingAccount(accountId: string | undefined) {
  setCollectiblesPollingActive(accountId, isCollectiblesTabActive);
}

export function clearCollectiblesPolling() {
  for (const accountId of [...registrationsByAccount.keys()]) {
    stopAccount(accountId);
  }
  registrationsByAccount.clear();
  activeAccountId = undefined;
  isCollectiblesTabActive = false;
}
