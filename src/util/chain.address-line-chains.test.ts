import type { ApiChain } from '../api/types';
import type { Account, UserToken } from '../global/types';

import { getAddressLineChains } from './chain';
import { getAddressDisplayByChain } from './formatAccountAddress';

const ALL_CHAINS: ApiChain[] = ['ton', 'tron', 'ethereum', 'solana'];

const multiChainAccount: Account['byChain'] = {
  ton: { address: 'UQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2' },
  tron: { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
  ethereum: { address: '0xf3351234567890abcdef1234567890abcdefD397' },
};

const fundedTonToken = { chain: 'ton', slug: 'toncoin', amount: 100n } as UserToken;

describe('getAddressLineChains', () => {
  it('never hides chains', () => {
    expect(getAddressLineChains(ALL_CHAINS, new Set(['ton']))).toEqual(ALL_CHAINS);
    expect(getAddressLineChains(ALL_CHAINS, new Set())).toEqual(ALL_CHAINS);
    expect(getAddressLineChains(ALL_CHAINS, undefined)).toEqual(ALL_CHAINS);
  });
});

describe('getAddressDisplayByChain', () => {
  it('returns the same object without filtering chains', () => {
    expect(getAddressDisplayByChain(multiChainAccount, [fundedTonToken])).toBe(multiChainAccount);
    expect(getAddressDisplayByChain(multiChainAccount, undefined)).toBe(multiChainAccount);
  });
});
