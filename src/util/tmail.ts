import { TMAIL_ALIAS_REGEX, TMAIL_DOMAIN_SUFFIX } from '../config';

// Tmail alias detection helpers. Kept separate from DNS helpers (`dns.ts`) so the two detectors don't mix.

export function isTmailAlias(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) {
    return false;
  }

  const base = trimmed.slice(0, -TMAIL_DOMAIN_SUFFIX.length);
  return TMAIL_ALIAS_REGEX.test(base);
}

export function getTmailAliasBase(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.endsWith(TMAIL_DOMAIN_SUFFIX)) {
    return undefined;
  }

  const base = trimmed.slice(0, -TMAIL_DOMAIN_SUFFIX.length);
  return TMAIL_ALIAS_REGEX.test(base) ? base : undefined;
}

/** Bare local-part alias (no `.` / `@`) that can be resolved as `@tmail.ton` then `.ton` DNS. */
export function isBareTonAlias(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes('.') || trimmed.includes('@')) {
    return false;
  }

  return TMAIL_ALIAS_REGEX.test(trimmed);
}
