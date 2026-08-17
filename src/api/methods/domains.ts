import type { ApiNft } from '../types';

import { TONCOIN } from '../../config';
import { buildCollectionByKey, extractKey } from '../../util/iteratees';
import * as ton from '../chains/ton';
import { fetchStoredWallet } from '../common/accounts';
import { rememberActivityName } from '../common/sentActivityNames';
import { publishSignedMfaRequest } from './mfa';
import { createLocalTransactions } from './transfer';

export function checkDnsRenewalDraft(accountId: string, nfts: ApiNft[]) {
  const nftAddresses = extractKey(nfts, 'address');
  return ton.checkDnsRenewalDraft(accountId, nftAddresses);
}

export async function submitDnsRenewal(accountId: string, password: string | undefined, nfts: ApiNft[], realFee = 0n) {
  const { address: fromAddress } = await fetchStoredWallet(accountId, 'ton');

  const nftByAddress = buildCollectionByKey(nfts, 'address');
  const results: (
    { activityIds: string[] }
    | { mfaRequestHash: string }
    | { error: string }
  )[] = [];

  for await (const { addresses, result } of ton.submitDnsRenewal(accountId, password, Object.keys(nftByAddress))) {
    if ('error' in result) {
      results.push(result);
      continue;
    }

    if ('mfaRequest' in result) {
      return [await publishSignedMfaRequest(accountId, 'ton', result.mfaRequest)];
    }

    const localActivities = createLocalTransactions(accountId, 'ton', addresses.map((address) => {
      const nft = nftByAddress[address];
      return {
        id: result.msgHashNormalized,
        amount: 0n,
        fromAddress,
        toAddress: nft.address,
        fee: realFee / BigInt(nfts.length),
        normalizedAddress: nft.address,
        slug: TONCOIN.slug,
        externalMsgHashNorm: result.msgHashNormalized,
        nft,
        type: 'dnsRenew',
      };
    }));

    results.push({
      activityIds: extractKey(localActivities, 'id'),
    });
  }

  return results;
}

export function checkDnsChangeWalletDraft(accountId: string, nft: ApiNft, address: string) {
  return ton.checkDnsChangeWalletDraft(accountId, nft.address, address);
}

export async function submitDnsChangeWallet(
  accountId: string,
  password: string | undefined,
  nft: ApiNft,
  address: string,
  realFee = 0n,
  addressName?: string,
) {
  const { address: walletAddress } = await fetchStoredWallet(accountId, 'ton');
  const result = await ton.submitDnsChangeWallet(accountId, password, nft.address, address);

  if ('error' in result) {
    return result;
  }

  if ('mfaRequest' in result) {
    return publishSignedMfaRequest(accountId, 'ton', result.mfaRequest);
  }

  if (addressName) {
    // Keyed by tx hash, not by `address`: this activity's own `normalizedAddress` is the domain NFT's
    // contract address (see below), not the linked wallet, so an address-keyed cache couldn't apply here anyway.
    rememberActivityName(result.msgHashNormalized, addressName);
  }

  const [activity] = createLocalTransactions(accountId, 'ton', [{
    id: result.msgHashNormalized,
    amount: 0n,
    fromAddress: walletAddress,
    toAddress: nft.address,
    fee: realFee,
    normalizedAddress: nft.address,
    slug: TONCOIN.slug,
    externalMsgHashNorm: result.msgHashNormalized,
    nft,
    type: 'dnsChangeAddress',
  }]);

  return { activityId: activity.id };
}
