import type { ApiChain, ApiNetwork } from '../types';

import { getSharedBuiltinChains, isSharedChainDefaultEnabled } from './networksConfig';
import { storage } from '../storages';

type HiddenChainsByNetwork = Partial<Record<ApiNetwork, ApiChain[]>>;
type AccountHiddenChains = Partial<Record<string, HiddenChainsByNetwork>>;

const STORAGE_KEY = 'hiddenChainsByNetwork' as const;
const ACCOUNT_STORAGE_KEY = 'accountHiddenChainsByNetwork' as const;
const VAULT_STORAGE_KEY = 'vaultAccountIds' as const;
const SEEDED_KEY = 'hiddenChainsSeededV1' as const;

let hiddenChainsCache: HiddenChainsByNetwork = {};
let accountHiddenChainsCache: AccountHiddenChains = {};
let vaultAccountIds = new Set<string>();
let isLoaded = false;
let isSeeded = false;

function normalize(raw: unknown): HiddenChainsByNetwork {
  if (!raw || typeof raw !== 'object') return {};
  return raw as HiddenChainsByNetwork;
}

function normalizeAccountHidden(raw: unknown): AccountHiddenChains {
  if (!raw || typeof raw !== 'object') return {};
  const result: AccountHiddenChains = {};
  for (const [accountId, value] of Object.entries(raw as Record<string, unknown>)) {
    result[accountId] = normalize(value);
  }
  return result;
}

function normalizeVaultIds(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((id): id is string => typeof id === 'string'));
}

function allNonTonChains(): ApiChain[] {
  return getSharedBuiltinChains().filter((chain) => chain !== 'ton');
}

/**
 * On first run (never seeded), hide every builtin chain that is not
 * `defaultEnabled` in `shared/networks.json`. Existing users (seed flag set)
 * are never re-seeded so their visibility choices stick.
 */
async function seedDefaultHiddenChainsIfNeeded() {
  if (isSeeded) return;

  let alreadySeeded = false;
  try {
    alreadySeeded = Boolean(await storage.getItem(SEEDED_KEY));
  } catch {
    alreadySeeded = false;
  }

  if (alreadySeeded) {
    isSeeded = true;
    return;
  }

  const networks: ApiNetwork[] = ['mainnet', 'testnet'];
  let changed = false;

  for (const network of networks) {
    const current = new Set(hiddenChainsCache[network] ?? []);
    for (const chain of getSharedBuiltinChains()) {
      if (!isSharedChainDefaultEnabled(chain, network) && !current.has(chain)) {
        current.add(chain);
        changed = true;
      }
    }
    hiddenChainsCache[network] = [...current];
  }

  if (changed) {
    await persistGlobal();
  }

  try {
    await storage.setItem(SEEDED_KEY, true);
  } catch {
    // Non-fatal — next boot may re-seed, which is idempotent for the empty case.
  }
  isSeeded = true;
}

export async function loadChainVisibility() {
  try {
    hiddenChainsCache = normalize(await storage.getItem(STORAGE_KEY));
  } catch {
    hiddenChainsCache = {};
  }

  try {
    accountHiddenChainsCache = normalizeAccountHidden(await storage.getItem(ACCOUNT_STORAGE_KEY));
  } catch {
    accountHiddenChainsCache = {};
  }

  try {
    vaultAccountIds = normalizeVaultIds(await storage.getItem(VAULT_STORAGE_KEY));
  } catch {
    vaultAccountIds = new Set();
  }

  isLoaded = true;
  await seedDefaultHiddenChainsIfNeeded();
}

async function ensureLoaded() {
  if (isLoaded) return;
  await loadChainVisibility();
}

export function getHiddenChainsSnapshot(network: ApiNetwork): ReadonlySet<ApiChain> {
  return new Set(hiddenChainsCache[network] ?? []);
}

export function getHiddenChainsStateSnapshot(): HiddenChainsByNetwork {
  return hiddenChainsCache;
}

export function getVaultAccountIdsSnapshot(): ReadonlySet<string> {
  return new Set(vaultAccountIds);
}

export function setHiddenChainsSnapshot(value: HiddenChainsByNetwork) {
  hiddenChainsCache = normalize(value);
  isLoaded = true;
  isSeeded = true;
}

async function persistGlobal() {
  await storage.setItem(STORAGE_KEY, hiddenChainsCache);
}

async function persistAccountHidden() {
  await storage.setItem(ACCOUNT_STORAGE_KEY, accountHiddenChainsCache);
}

async function persistVaultAccounts() {
  await storage.setItem(VAULT_STORAGE_KEY, [...vaultAccountIds]);
}

/**
 * Effective hidden set for a network, optionally scoped to an account.
 * Falls back to the global map; vault accounts always hide every non-TON chain.
 */
export async function getHiddenChains(network: ApiNetwork, accountId?: string): Promise<Set<ApiChain>> {
  await ensureLoaded();
  const hidden = new Set(hiddenChainsCache[network] ?? []);

  if (accountId) {
    for (const chain of accountHiddenChainsCache[accountId]?.[network] ?? []) {
      hidden.add(chain);
    }

    if (vaultAccountIds.has(accountId)) {
      for (const chain of allNonTonChains()) {
        hidden.add(chain);
      }
    }
  }

  return hidden;
}

export async function isChainHidden(
  chain: ApiChain,
  network: ApiNetwork,
  accountId?: string,
): Promise<boolean> {
  const hidden = await getHiddenChains(network, accountId);
  return hidden.has(chain);
}

export async function setChainHidden(chain: ApiChain, network: ApiNetwork, isHidden: boolean): Promise<void> {
  await ensureLoaded();
  const current = new Set(hiddenChainsCache[network] ?? []);
  if (isHidden) {
    current.add(chain);
  } else {
    current.delete(chain);
  }
  hiddenChainsCache[network] = [...current];
  await persistGlobal();
}

/**
 * Per-account override on top of the global visibility map.
 * Used when seeding vault accounts so foreign chains stay hidden even if
 * the global Network Hub later unhides them.
 */
export async function setAccountChainHidden(
  accountId: string,
  chain: ApiChain,
  network: ApiNetwork,
  isHidden: boolean,
): Promise<void> {
  await ensureLoaded();
  const byNetwork = { ...(accountHiddenChainsCache[accountId] ?? {}) };
  const current = new Set(byNetwork[network] ?? []);
  if (isHidden) {
    current.add(chain);
  } else {
    current.delete(chain);
  }
  byNetwork[network] = [...current];
  accountHiddenChainsCache[accountId] = byNetwork;
  await persistAccountHidden();
}

export async function isVaultAccount(accountId: string): Promise<boolean> {
  await ensureLoaded();
  return vaultAccountIds.has(accountId);
}

/**
 * Mark/unmark an account as Vault. Vault accounts auto-hide every non-TON chain
 * and get a seeded per-account hidden map so global unhides do not re-enable them.
 */
async function seedVaultAccountHidden(accountId: string) {
  const byNetwork: HiddenChainsByNetwork = { ...(accountHiddenChainsCache[accountId] ?? {}) };
  const nonTon = allNonTonChains();
  for (const network of ['mainnet', 'testnet'] as ApiNetwork[]) {
    const current = new Set(byNetwork[network] ?? []);
    for (const chain of nonTon) {
      current.add(chain);
    }
    byNetwork[network] = [...current];
  }
  accountHiddenChainsCache[accountId] = byNetwork;
}

export async function setVaultAccount(accountId: string, isVault: boolean): Promise<void> {
  await ensureLoaded();

  if (isVault) {
    vaultAccountIds.add(accountId);
    await seedVaultAccountHidden(accountId);
    await persistAccountHidden();
  } else {
    vaultAccountIds.delete(accountId);
    delete accountHiddenChainsCache[accountId];
    await persistAccountHidden();
  }

  await persistVaultAccounts();
}

/** Replace the vault account set (e.g. after restoring GlobalState from cache). */
export async function syncVaultAccounts(accountIds: string[]): Promise<void> {
  await ensureLoaded();
  vaultAccountIds = new Set(accountIds);

  for (const accountId of accountIds) {
    await seedVaultAccountHidden(accountId);
  }

  await persistAccountHidden();
  await persistVaultAccounts();
}

export async function getHiddenChainsMap(
  network: ApiNetwork,
  accountId?: string,
): Promise<Partial<Record<ApiChain, boolean>>> {
  const hidden = await getHiddenChains(network, accountId);
  const result: Partial<Record<ApiChain, boolean>> = {};
  hidden.forEach((chain) => {
    result[chain] = true;
  });
  return result;
}
