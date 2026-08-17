import { logDebugError } from '../../util/logs';
import { storage } from '../storages';

/**
 * Remembers the name the user actually sent to (a `@tmail.ton` alias, a DNS domain, whatever the address input
 * resolved) so the activity feed can keep showing it.
 *
 * While the local (pending) activity is alive, `preferLocalAddressName` carries that name onto the matching chain
 * activity. But the local activity only lives in memory: after a reload the history is re-fetched from Toncenter,
 * whose address book reports its own reverse-DNS domain for the counterparty. A transfer sent to `w2@tmail.ton`
 * would then be relabelled with the `.ton` DNS domain. Persisting the send-time name keeps the alias in front.
 *
 * Only names for outgoing transfers are stored, and they are keyed by normalized address, which is globally
 * unique on TON - so this needs no account scoping.
 */

/** Cap so a heavy sender can't grow the stored record without bound. Least recently used entries are evicted. */
const MAX_ENTRIES = 200;

let nameByAddress: Record<string, string> = {};

/**
 * Serializes the writes. `storage.setItem` may snapshot its argument at call time, so two unawaited writes racing
 * each other can land out of order and persist the older map. Chaining keeps the last write authoritative.
 */
let pendingWrite: Promise<void> = Promise.resolve();

export async function loadSentAddressNames() {
  try {
    nameByAddress = (await storage.getItem('sentAddressNames')) ?? {};
  } catch (err) {
    logDebugError('loadSentAddressNames', err);
    nameByAddress = {};
  }
}

export function getSentAddressName(normalizedAddress: string): string | undefined {
  return nameByAddress[normalizedAddress];
}

export function rememberSentAddressName(normalizedAddress: string, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName || nameByAddress[normalizedAddress] === trimmedName) {
    return;
  }

  // Deleting before assigning re-inserts the key at the end, so the eviction below drops the oldest entries
  // (JS objects iterate string keys in insertion order).
  delete nameByAddress[normalizedAddress];
  nameByAddress[normalizedAddress] = trimmedName;

  const addresses = Object.keys(nameByAddress);
  for (const staleAddress of addresses.slice(0, Math.max(0, addresses.length - MAX_ENTRIES))) {
    delete nameByAddress[staleAddress];
  }

  pendingWrite = pendingWrite
    // Re-read the module state at write time so the persisted map is the newest one, not a stale closure capture.
    .then(() => storage.setItem('sentAddressNames', { ...nameByAddress }))
    .catch((err) => logDebugError('rememberSentAddressName', err));
}
