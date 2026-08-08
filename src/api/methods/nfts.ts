import type { ApiChain, ApiNetwork, ApiNft, ApiNftCollection, OnApiUpdate } from '../types';

import { bigintDivideToNumber } from '../../util/bigint';
import { getChainConfig } from '../../util/chain';
import { extractKey } from '../../util/iteratees';
import { logDebug, logDebugError } from '../../util/logs';
import chains from '../chains';
import { parseTonapiioNft } from '../chains/ton/util/metadata';
import { fetchNftByAddress as fetchRawNftByAddress } from '../chains/ton/util/tonapiio';
import { fetchStoredWallet, getCurrentAccountId } from '../common/accounts';
import { getNftSuperCollectionsByCollectionAddress } from '../common/addresses';
import { setCollectiblesPollingActive } from '../common/polling/collectiblesPolling';
import { publishSignedMfaRequest, refreshMfaState, registerMfaConfirmationHandler } from './mfa';
import { createLocalTransactions } from './transfer';

let onUpdate: OnApiUpdate;

export function initNfts(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

/** Start/stop NFT network scanning for the current account (Collectibles tab). */
export async function setCollectiblesActive(isActive: boolean): Promise<{ ok: true }> {
  const accountId = await getCurrentAccountId();
  setCollectiblesPollingActive(accountId, isActive);
  return { ok: true };
}

export async function fetchNftsFromCollection(accountId: string, collection: ApiNftCollection) {
  const nfts = await chains[collection.chain].getAccountNfts(accountId, { collectionAddress: collection.address });

  onUpdate({
    type: 'updateNfts',
    accountId,
    nfts,
    collectionAddress: collection.address,
    chain: collection.chain,
  });
}

export function checkNftTransferDraft(chain: ApiChain, options: {
  accountId: string;
  nfts: ApiNft[];
  toAddress: string;
  comment?: string;
  isNftBurn?: boolean;
}) {
  return chains[chain].checkNftTransferDraft(options);
}

export async function submitNftTransfers(
  chain: ApiChain,
  accountId: string,
  password: string | undefined,
  nfts: ApiNft[],
  toAddress: string,
  comment?: string,
  totalRealFee = 0n,
  isNftBurn?: boolean,
  addressName?: string,
): Promise<{ activityIds: string[] } | { mfaRequestHash: string } | { error: string }> {
  const { address: fromAddress } = await fetchStoredWallet(accountId, chain);
  const localMetadata = addressName ? { name: addressName } : undefined;

  logDebug('submitNftTransfers', 'Request', {
    chain,
    accountId,
    fromAddress,
    toAddress,
    nftsCount: nfts.length,
    hasComment: Boolean(comment),
    isNftBurn: Boolean(isNftBurn),
  });

  const result = await chains[chain].submitNftTransfers({
    accountId, password, nfts, toAddress, comment, isNftBurn,
  });

  if ('error' in result) {
    logDebugError('submitNftTransfers:result', result);
    return result;
  }

  if ('mfaRequest' in result) {
    const { mfaRequestHash } = await publishSignedMfaRequest(accountId, chain, result.mfaRequest);
    const realFeePerNft = bigintDivideToNumber(totalRealFee, nfts.length);

    registerMfaConfirmationHandler(mfaRequestHash, (txHash) => {
      createLocalTransactions(accountId, chain, nfts.map((nft) => ({
        id: txHash,
        amount: 0n,
        fromAddress,
        toAddress,
        comment,
        fee: realFeePerNft,
        normalizedAddress: nft.address,
        slug: getChainConfig(chain).nativeToken.slug,
        externalMsgHashNorm: txHash,
        nft,
        ...(localMetadata && { metadata: localMetadata }),
      })));
    });

    logDebug('submitNftTransfers', 'Returning MFA request hash', {
      chain,
      accountId,
      fromAddress,
      nftsCount: nfts.length,
      reqId: mfaRequestHash,
    });

    return {
      mfaRequestHash,
    };
  }

  const realFeePerNft = bigintDivideToNumber(totalRealFee, Object.keys(result.transfers).length);

  const localActivities = createLocalTransactions(accountId, chain, result.transfers.map((transfer, index) => ({
    id: result.msgHashNormalized,
    amount: 0n, // Regular NFT transfers should have no amount in the activity list
    fromAddress,
    toAddress,
    comment,
    fee: realFeePerNft,
    normalizedAddress: transfer.toAddress,
    slug: getChainConfig(chain).nativeToken.slug,
    externalMsgHashNorm: result.msgHashNormalized,
    nft: nfts?.[index],
    ...(localMetadata && { metadata: localMetadata }),
  })));

  if (chain === 'ton') {
    void refreshMfaState(accountId, password)
      .then((mfaUpdate) => {
        if (mfaUpdate?.changed) {
          onUpdate({
            type: 'updateAccount',
            accountId,
            chain: 'ton',
            mfa: mfaUpdate.mfa ?? false,
          });
        }
      })
      .catch((err) => {
        logDebugError('submitNftTransfers:refreshMfaState', err);
      });
  }

  return {
    activityIds: extractKey(localActivities, 'id'),
  };
}

export async function fetchNftByAddress(network: ApiNetwork, nftAddress: string): Promise<ApiNft | undefined> {
  const rawNft = await fetchRawNftByAddress(network, nftAddress);
  const nftSuperCollectionsByCollectionAddress = await getNftSuperCollectionsByCollectionAddress();
  return parseTonapiioNft(network, rawNft, nftSuperCollectionsByCollectionAddress);
}

export async function checkNftOwnership(chain: ApiChain, accountId: string, nftAddress: string) {
  return chains[chain].checkNftOwnership(accountId, nftAddress);
}
