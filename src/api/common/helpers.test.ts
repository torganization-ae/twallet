import type { ApiNft } from '../types';

import { makeMockTransactionActivity } from '../../../tests/mocks';
import { updateActivityMetadata } from './helpers';
import { rememberActivityName } from './sentActivityNames';
import { rememberSentAddressName } from './sentAddressNames';

// Mock the addresses module to control scam detection
jest.mock('./addresses', () => ({
  checkHasScamLink: jest.fn((text: string) => text.includes('scam-link.com')),
  checkHasTelegramBotMention: jest.fn((text: string) => text.includes('t.me/') || text.includes('tg:')),
  getKnownAddresses: jest.fn(() => ({})),
  getScamMarkers: jest.fn(() => []),
}));

const mockNft: ApiNft = {
  chain: 'ton',
  interface: 'default',
  index: 1,
  name: 'Test NFT',
  address: 'test-nft-address',
  thumbnail: 'https://example.com/thumb.jpg',
  image: 'https://example.com/image.jpg',
  isOnSale: false,
  metadata: {},
};

describe('updateActivityMetadata - scam comment detection', () => {
  describe('should be marked as SCAM', () => {
    it('"claim at tg: @mywallet" incoming transfer', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'completed',
        comment: 'claim at tg: @mywallet',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });

    it('"tg: @mywallet" incoming transfer with NFT attached', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'completed',
        nft: mockNft,
        comment: 'tg: @mywallet',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });

    it('"t.me/mywallet" incoming transfer but failed', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'failed',
        comment: 't.me/mywallet',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });

    it('"tg: @scam_bot" bounced transaction (outgoing)', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: false,
        type: 'bounced',
        comment: 'tg: @scam_bot',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });

    it('"CLAIM your reward at t.me/scam" (case insensitive)', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'completed',
        comment: 'CLAIM your reward at t.me/scam',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });

    it('real spam: "https://t.me/tnfaucet_bot - test giver"', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'failed',
        comment: 'https://t.me/tnfaucet_bot - test giver',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBe(true);
    });
  });

  describe('should NOT be marked as scam', () => {
    it('"tg: @mywallet" outgoing transfer (not bounce)', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: false,
        status: 'completed',
        comment: 'tg: @mywallet',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBeUndefined();
    });

    it('"tg: @mywallet" incoming transfer (not failed, no NFT, no claim)', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'completed',
        comment: 'tg: @mywallet',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBeUndefined();
    });

    it('"Thanks for the payment!" incoming failed transfer', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'failed',
        comment: 'Thanks for the payment!',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBeUndefined();
    });

    it('"Payment for services" incoming with NFT', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'completed',
        nft: mockNft,
        comment: 'Payment for services',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBeUndefined();
    });

    it('no comment at all', () => {
      const activity = makeMockTransactionActivity({
        isIncoming: true,
        status: 'failed',
      });

      const result = updateActivityMetadata(activity);
      expect(result.metadata?.isScam).toBeUndefined();
    });

    it('swap activity passes through unchanged', () => {
      const swapActivity = {
        kind: 'swap' as const,
        id: 'swap-1',
        timestamp: Date.now(),
        from: 'TON',
        fromAmount: '100',
        fromAddress: 'addr1',
        to: 'USDT',
        toAmount: '200',
        networkFee: '0.01',
        swapFee: '0.001',
        status: 'completed' as const,
        hashes: [],
        transactionIds: {},
      };

      const result = updateActivityMetadata(swapActivity);
      expect(result).toEqual(swapActivity);
    });
  });
});

describe('updateActivityMetadata - sent name priority', () => {
  it('prefers the hash-keyed name (NFT/domain-linking) over Toncenter\'s reverse-DNS guess', () => {
    const hash = 'hash-priority-1';
    rememberActivityName(hash, 'w2@tmail.ton');

    const activity = makeMockTransactionActivity({
      isIncoming: false,
      externalMsgHashNorm: hash,
      metadata: { name: 'reverse-dns-guess.ton' },
    });

    const result = updateActivityMetadata(activity);
    expect(result.metadata?.name).toBe('w2@tmail.ton');
  });

  it('falls back to the address-keyed name when no hash-keyed entry exists', () => {
    const normalizedAddress = 'address-priority-fallback';
    rememberSentAddressName(normalizedAddress, 'w3@tmail.ton');

    const activity = makeMockTransactionActivity({
      isIncoming: false,
      normalizedAddress,
      externalMsgHashNorm: 'hash-with-nothing-remembered',
      metadata: { name: 'reverse-dns-guess.ton' },
    });

    const result = updateActivityMetadata(activity);
    expect(result.metadata?.name).toBe('w3@tmail.ton');
  });

  it('prefers the hash-keyed name over the address-keyed one when both exist for the same activity', () => {
    const hash = 'hash-priority-2';
    const normalizedAddress = 'address-priority-2';
    rememberSentAddressName(normalizedAddress, 'stale-domain-for-this-address.ton');
    rememberActivityName(hash, 'w2@tmail.ton');

    const activity = makeMockTransactionActivity({
      isIncoming: false,
      normalizedAddress,
      externalMsgHashNorm: hash,
      metadata: { name: 'reverse-dns-guess.ton' },
    });

    const result = updateActivityMetadata(activity);
    expect(result.metadata?.name).toBe('w2@tmail.ton');
  });

  it('does not apply a remembered sent name to an incoming activity', () => {
    const hash = 'hash-priority-incoming';
    const normalizedAddress = 'address-priority-incoming';
    rememberActivityName(hash, 'w2@tmail.ton');
    rememberSentAddressName(normalizedAddress, 'w2@tmail.ton');

    const activity = makeMockTransactionActivity({
      isIncoming: true,
      normalizedAddress,
      externalMsgHashNorm: hash,
      metadata: { name: 'senders-own-dns.ton' },
    });

    const result = updateActivityMetadata(activity);
    expect(result.metadata?.name).toBe('senders-own-dns.ton');
  });
});
