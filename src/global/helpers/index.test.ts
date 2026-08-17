import type { ApiTokenWithPrice } from '../../api/types';

import { makeMockTransactionActivity } from '../../../tests/mocks';
import { getIsTinyOrScamTransaction } from '.';

function makeToken(priceUsd: number, decimals = 9): ApiTokenWithPrice {
  return {
    name: 'Notcoin',
    symbol: 'NOT',
    slug: 'ton-not',
    decimals,
    chain: 'ton',
    priceUsd,
    percentChange24h: 0,
  };
}

// One whole token unit at 9 decimals.
const ONE_UNIT = 10n ** 9n;

describe('getIsTinyOrScamTransaction', () => {
  // "Hide tiny transfers" must apply to incoming transactions only. The sender should always see
  // what and how much they sent, regardless of amount.
  describe('outgoing transfers are always visible', () => {
    it('sub-cent outgoing transfer (e.g. sending 1 NOT) is NOT tiny', () => {
      const tx = makeMockTransactionActivity({ isIncoming: false, amount: -ONE_UNIT });
      // 1 NOT * $0.002 = $0.002, below the $0.01 threshold
      expect(getIsTinyOrScamTransaction(tx, makeToken(0.002))).toBe(false);
    });

    it('outgoing transfer of a token with no USD price is NOT tiny', () => {
      const tx = makeMockTransactionActivity({ isIncoming: false, amount: -ONE_UNIT });
      expect(getIsTinyOrScamTransaction(tx, makeToken(0))).toBe(false);
    });

    it('outgoing transfer above the threshold is NOT tiny', () => {
      const tx = makeMockTransactionActivity({ isIncoming: false, amount: -(ONE_UNIT * 10n) });
      // 10 * $0.002 = $0.02, above the $0.01 threshold
      expect(getIsTinyOrScamTransaction(tx, makeToken(0.002))).toBe(false);
    });
  });

  describe('incoming dust and outgoing bounced spam are still hidden', () => {
    it('sub-cent incoming transfer IS tiny', () => {
      const tx = makeMockTransactionActivity({ isIncoming: true, amount: ONE_UNIT });
      expect(getIsTinyOrScamTransaction(tx, makeToken(0.002))).toBe(true);
    });

    it('sub-cent outgoing bounced spam IS still tiny (address-poisoning protection)', () => {
      const tx = makeMockTransactionActivity({ isIncoming: false, type: 'bounced', amount: -ONE_UNIT });
      expect(getIsTinyOrScamTransaction(tx, makeToken(0.002))).toBe(true);
    });
  });

  it('is not tiny when the token is unknown (no price data to judge)', () => {
    const tx = makeMockTransactionActivity({ isIncoming: true, amount: ONE_UNIT });
    expect(getIsTinyOrScamTransaction(tx, undefined)).toBe(false);
  });
});
