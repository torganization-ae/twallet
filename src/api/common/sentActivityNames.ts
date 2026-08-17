import { logDebugError } from '../../util/logs';
import { storage } from '../storages';

/**
 * Remembers the name the user actually sent to (a `@tmail.ton` alias, a DNS domain, whatever the address input
 * resolved) for a *specific transaction*, keyed by its external message hash (`externalMsgHashNorm`) - the same
 * stable identifier the codebase already uses to match a local/pending activity to its eventual on-chain-confirmed
 * counterpart (see `preferLocalAddressName`).
 *
 * This exists alongside `sentAddressNames.ts` (which keys by recipient address) rather than replacing it, for two
 * paths that address-keying doesn't fit: NFT transfers, where a TMail alias resolves via NFT ownership so the same
 * address could later belong to a different domain (an address-keyed cache could then mislabel an unrelated, later
 * transaction to that address); and domain-linking, whose resulting activity's `normalizedAddress` is the domain
 * NFT's own contract address, not the linked wallet - address-keying literally can't apply there. A hash-keyed
 * entry is tied to the one transaction it was resolved for and is never reused for a different one.
 *
 * Only names for outgoing transfers are stored, keyed by `externalMsgHashNorm`, which is globally unique - so this
 * needs no account scoping.
 */

/** Cap so a heavy sender can't grow the stored record without bound. Least recently used entries are evicted. */
const MAX_ENTRIES = 200;

let nameByActivityHash: Record<string, string> = {};

/**
 * Serializes the writes. `storage.setItem` may snapshot its argument at call time, so two unawaited writes racing
 * each other can land out of order and persist the older map. Chaining keeps the last write authoritative.
 */
let pendingWrite: Promise<void> = Promise.resolve();

export async function loadSentActivityNames() {
  try {
    nameByActivityHash = (await storage.getItem('sentActivityNames')) ?? {};
  } catch (err) {
    logDebugError('loadSentActivityNames', err);
    nameByActivityHash = {};
  }
}

export function getActivityName(hash: string | undefined): string | undefined {
  return hash ? nameByActivityHash[hash] : undefined;
}

export function rememberActivityName(hash: string | undefined, name: string) {
  if (!hash) {
    return;
  }

  const trimmedName = name.trim();

  if (!trimmedName || nameByActivityHash[hash] === trimmedName) {
    return;
  }

  // Deleting before assigning re-inserts the key at the end, so the eviction below drops the oldest entries
  // (JS objects iterate string keys in insertion order).
  delete nameByActivityHash[hash];
  nameByActivityHash[hash] = trimmedName;

  const hashes = Object.keys(nameByActivityHash);
  for (const staleHash of hashes.slice(0, Math.max(0, hashes.length - MAX_ENTRIES))) {
    delete nameByActivityHash[staleHash];
  }

  pendingWrite = pendingWrite
    // Re-read the module state at write time so the persisted map is the newest one, not a stale closure capture.
    .then(() => storage.setItem('sentActivityNames', { ...nameByActivityHash }))
    .catch((err) => logDebugError('rememberActivityName', err));
}
