/** Session-scoped vault unlocks (cleared on reload / sign-out). */
const unlockedVaultAccountIds = new Set<string>();

export function isVaultUnlocked(accountId: string): boolean {
  return unlockedVaultAccountIds.has(accountId);
}

export function unlockVaultAccount(accountId: string) {
  unlockedVaultAccountIds.add(accountId);
}

export function lockAllVaultAccounts() {
  unlockedVaultAccountIds.clear();
}
