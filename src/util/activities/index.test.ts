import type { ApiNft } from '../../api/types';

import { makeMockTransactionActivity } from '../../../tests/mocks';
import { getIsHiddenNftActivity, isScamTransaction, preferLocalAddressName } from '.';

const WHITELISTED_ADDRESS = 'EQNft_Whitelisted_0000000000000000000000000000000000000';
const BLACKLISTED_ADDRESS = 'EQNft_Blacklisted_0000000000000000000000000000000000000';
const PLAIN_ADDRESS = 'EQNft_Plain_00000000000000000000000000000000000000000000';

function makeNft(partial: Partial<ApiNft> = {}): ApiNft {
  return {
    chain: 'ton',
    index: 0,
    address: PLAIN_ADDRESS,
    thumbnail: '',
    image: '',
    isOnSale: false,
    metadata: {},
    interface: 'default',
    ...partial,
  };
}

describe('preferLocalAddressName', () => {
  it('keeps the local tmail/DNS name over chain reverse-DNS', () => {
    const local = makeMockTransactionActivity({
      metadata: { name: 'alice@tmail.ton' },
    });
    const chain = makeMockTransactionActivity({
      metadata: { name: 'alice.ton' },
    });

    const merged = preferLocalAddressName(local, chain);
    expect(merged.kind).toBe('transaction');
    if (merged.kind === 'transaction') {
      expect(merged.metadata?.name).toBe('alice@tmail.ton');
    }
  });

  it('leaves chain activity unchanged when local has no name', () => {
    const local = makeMockTransactionActivity({ metadata: undefined });
    const chain = makeMockTransactionActivity({
      metadata: { name: 'alice.ton' },
    });

    expect(preferLocalAddressName(local, chain)).toBe(chain);
  });
});

describe('isScamTransaction', () => {
  it('marks a transaction carrying a scam NFT as scam', () => {
    const activity = makeMockTransactionActivity({ isIncoming: false, nft: makeNft({ isScam: true }) });
    expect(isScamTransaction(activity)).toBe(true);
  });

  it('does not mark a transaction with a regular NFT as scam', () => {
    const activity = makeMockTransactionActivity({ isIncoming: false, nft: makeNft() });
    expect(isScamTransaction(activity)).toBe(false);
  });
});

describe('getIsHiddenNftActivity', () => {
  it('hides a blacklisted NFT', () => {
    const activity = makeMockTransactionActivity({ nft: makeNft({ address: BLACKLISTED_ADDRESS }) });
    expect(getIsHiddenNftActivity(activity, [BLACKLISTED_ADDRESS])).toBe(true);
  });

  it('hides a backend-hidden NFT that is not whitelisted', () => {
    const activity = makeMockTransactionActivity({ nft: makeNft({ isHidden: true }) });
    expect(getIsHiddenNftActivity(activity, [], [])).toBe(true);
  });

  it('keeps a backend-hidden NFT that the user whitelisted', () => {
    const activity = makeMockTransactionActivity({ nft: makeNft({ address: WHITELISTED_ADDRESS, isHidden: true }) });
    expect(getIsHiddenNftActivity(activity, undefined, [WHITELISTED_ADDRESS])).toBe(false);
  });

  it('keeps a regular NFT', () => {
    const activity = makeMockTransactionActivity({ nft: makeNft() });
    expect(getIsHiddenNftActivity(activity, [], [])).toBe(false);
  });

  it('keeps a transaction without an NFT', () => {
    const activity = makeMockTransactionActivity({ nft: undefined });
    expect(getIsHiddenNftActivity(activity, [BLACKLISTED_ADDRESS], [])).toBe(false);
  });
});
