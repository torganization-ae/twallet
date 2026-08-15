import { Address } from '@ton/core';

import type { ApiNetwork } from '../../types';
import { ApiCommonError } from '../../types';

import { TMAIL_DOMAIN_SUFFIX } from '../../../config';
import { getDnsDomainZone, isTonChainDns } from '../../../util/dns';
import { isBareTonAlias, isTmailAlias, normalizeTmailDomain } from '../../../util/tmail';
import { dnsResolve } from './util/dns';
import { getTonClient, toBase64Address } from './util/tonCore';
import { getKnownAddressInfo } from '../../common/addresses';
import { DnsCategory } from './constants';
import { resolveTmailAlias } from './tmail';
import { fetchAddressBook } from './toncenter';

export async function resolveAddress(network: ApiNetwork, address: string, skipFormatSelection?: boolean): Promise<{
  address: string;
  name?: string;
  isMemoRequired?: boolean;
  isScam?: boolean;
} | { error: ApiCommonError }> {
  const isDomain = isTonChainDns(address) || isTmailAlias(address) || isBareTonAlias(address);
  let domain: string | undefined;

  if (isDomain) {
    const resolved = await resolveDomainWithName(network, address);
    if (!resolved) {
      return { error: ApiCommonError.DomainNotResolved };
    }

    domain = resolved.name;
    address = resolved.address;

    if (!skipFormatSelection) {
      const addressBook = await fetchAddressBook(network, [address]);
      address = addressBook[address].user_friendly;
    }
  }

  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeAddress(address, network);
  } catch {
    return { error: ApiCommonError.InvalidAddress };
  }
  const known = getKnownAddressInfo(normalizedAddress);

  if (known) {
    return {
      address,
      ...known,
      name: domain ?? known.name,
    };
  }

  return { address, name: domain };
}

/**
 * Resolves a TON DNS domain, tmail alias, or bare alias word.
 * Bare words try `@tmail.ton` first, then `.ton` DNS.
 */
export async function resolveAddressByDomain(network: ApiNetwork, domain: string) {
  const resolved = await resolveDomainWithName(network, domain);
  return resolved?.address;
}

async function resolveDomainWithName(network: ApiNetwork, domain: string): Promise<{
  address: string;
  name: string;
} | undefined> {
  // `@tmail.ae` is a web2-style alias for the same web3 identity — rewritten to `@tmail.ton`
  // upfront so it resolves (and is displayed) exactly like the original tmail.ton alias.
  const trimmed = normalizeTmailDomain(domain);
  if (!trimmed) {
    return undefined;
  }

  try {
    if (isTmailAlias(trimmed)) {
      const address = await resolveTmailAlias(network, trimmed);
      return address ? { address, name: trimmed } : undefined;
    }

    if (isTonChainDns(trimmed)) {
      const address = await resolveExplicitDns(network, trimmed);
      return address ? { address, name: trimmed } : undefined;
    }

    if (isBareTonAlias(trimmed)) {
      const tmailAlias = `${trimmed}${TMAIL_DOMAIN_SUFFIX}`;
      const tmailAddress = await resolveTmailAlias(network, tmailAlias);
      if (tmailAddress) {
        return { address: tmailAddress, name: tmailAlias };
      }

      const tonDomain = `${trimmed}.ton`;
      if (isTonChainDns(tonDomain)) {
        const dnsAddress = await resolveExplicitDns(network, tonDomain);
        if (dnsAddress) {
          return { address: dnsAddress, name: tonDomain };
        }
      }

      return undefined;
    }

    return undefined;
  } catch (err: any) {
    if (!err.message?.includes('exit_code')) {
      throw err;
    }
    return undefined;
  }
}

async function resolveExplicitDns(network: ApiNetwork, domain: string) {
  const zoneMatch = getDnsDomainZone(domain);
  if (!zoneMatch) {
    return undefined;
  }

  const result = await dnsResolve(
    getTonClient(network),
    zoneMatch.zone.resolver,
    zoneMatch.base,
    DnsCategory.Wallet,
  );

  if (!(result instanceof Address)) {
    return undefined;
  }

  return toBase64Address(result, undefined, network);
}

export function normalizeAddress(address: string, network?: ApiNetwork) {
  return toBase64Address(address, true, network);
}
