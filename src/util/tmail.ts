import { TMAIL_ALIAS_REGEX, TMAIL_DOMAIN_ALT_SUFFIX, TMAIL_DOMAIN_SUFFIX } from '../config';
import { getChainConfig, getSupportedChains } from './chain';

// Tmail alias detection helpers. Kept separate from DNS helpers (`dns.ts`) so the two detectors don't mix.

/** Rewrites the `@tmail.ae` alias domain to its canonical web3 form `@tmail.ton`; otherwise trims/lowercases as-is. */
export function normalizeTmailDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.endsWith(TMAIL_DOMAIN_ALT_SUFFIX)
    ? `${trimmed.slice(0, -TMAIL_DOMAIN_ALT_SUFFIX.length)}${TMAIL_DOMAIN_SUFFIX}`
    : trimmed;
}

export function isTmailAlias(value: string) {
  const trimmed = normalizeTmailDomain(value);
  if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) {
    return false;
  }

  const base = trimmed.slice(0, -TMAIL_DOMAIN_SUFFIX.length);
  return TMAIL_ALIAS_REGEX.test(base);
}

export function getTmailAliasBase(value: string) {
  const trimmed = normalizeTmailDomain(value);
  if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) {
    return undefined;
  }

  const base = trimmed.slice(0, -TMAIL_DOMAIN_SUFFIX.length);
  return TMAIL_ALIAS_REGEX.test(base) ? base : undefined;
}

const TMAIL_SHARE_PATH = '/share/';

/**
 * Mailbox carried by a TMail share QR: `https://<any-host>/share/<url-encoded mailbox>`.
 * The host is not checked — dev/staging/prod hosts all differ.
 */
export function parseTmailShareQr(raw: string) {
  const trimmed = raw.trim();
  const markerIndex = trimmed.indexOf(TMAIL_SHARE_PATH);
  if (markerIndex < 0) {
    return undefined;
  }

  // `#` and `@` of a web3 mailbox are percent-encoded in the QR, so cut the tail off before decoding.
  const encoded = trimmed.slice(markerIndex + TMAIL_SHARE_PATH.length).split(/[?#/]/)[0];
  let mailbox: string;
  try {
    mailbox = decodeURIComponent(encoded).trim();
  } catch {
    return undefined;
  }

  return mailbox.includes('@') ? mailbox : undefined;
}

/** Bare local-part alias (no `.` / `@`) that can be resolved as `@tmail.ton` then `.ton` DNS. */
export function isBareTonAlias(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('.') || trimmed.includes('@')) {
    return false;
  }

  // A real chain address must never be mistaken for an alias: `TMAIL_ALIAS_REGEX` is a loose
  // charset check and would otherwise match plenty of case-sensitive addresses (e.g. TON,
  // 48 chars of `[-\w_]`), silently lowercasing and misrouting them into alias resolution.
  if (getSupportedChains().some((chain) => getChainConfig(chain).addressRegex.test(trimmed))) {
    return false;
  }

  return TMAIL_ALIAS_REGEX.test(trimmed.toLowerCase());
}
