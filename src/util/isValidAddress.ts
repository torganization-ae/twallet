import { Address } from '@ton/core';

import type { ApiChain } from '../api/types';

import { getChainConfig, getSupportedChains } from './chain';
import { isTonChainDns } from './dns';
import { isBareTonAlias, isTmailAlias } from './tmail';

export function isValidAddress(address: string, chain: ApiChain, allowPrefix?: boolean) {
  if (!address) {
    return false;
  }

  // `Address.parse` can't validate a string still being typed, so the regex stays for that case.
  // For a complete address it also verifies the friendly-format CRC16 checksum, catching typos
  // that a shape-only regex would let through.
  if (chain === 'ton' && !allowPrefix) {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  const config = getChainConfig(chain);
  return config[allowPrefix ? 'addressPrefixRegex' : 'addressRegex'].test(address);
}

export function isValidAddressOrDomain(address: string, chain: ApiChain, allowPrefix?: boolean) {
  return isValidAddress(address, chain, allowPrefix)
    || (getChainConfig(chain).isDnsSupported
      && (isTonChainDns(address) || isTmailAlias(address) || isBareTonAlias(address)));
}

/**
 * Returns other chains (among `availableChains`) for which the address is also valid.
 * Used to warn when sending on EVM where the same address format is shared across networks.
 */
export function getAmbiguousChainsForAddress(
  address: string,
  currentChain: ApiChain,
  availableChains: ReadonlySet<ApiChain> | ApiChain[],
): ApiChain[] {
  if (!address || !isValidAddress(address, currentChain)) return [];

  const available = Array.isArray(availableChains)
    ? availableChains
    : [...availableChains];

  return available.filter((chain: ApiChain) => (
    chain !== currentChain && isValidAddress(address, chain)
  ));
}

export function getChainFromAddress(
  address: string,
  availableChains: Partial<Record<ApiChain, unknown>>,
  allowDomain?: boolean,
): ApiChain | undefined {
  const availableChainsArray = getSupportedChains().filter((chain) => chain in availableChains);

  return availableChainsArray.find((chain) => (
    allowDomain
      ? isValidAddressOrDomain(address, chain)
      : isValidAddress(address, chain)
  ));
}

export function isTonsiteAddress(address: string) {
  address = address.trim().toLowerCase();

  return address.startsWith('tonsite://') || address.startsWith('ton://');
}
