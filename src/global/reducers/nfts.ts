import type { ApiNft } from '../../api/types';
import type { GlobalState } from '../types';

import { selectAccountState } from '../selectors';
import { updateAccountState } from './misc';

export function addNft(global: GlobalState, accountId: string, nft: ApiNft, shouldAppendToEnd?: boolean) {
  const nftAddress = nft.address;
  const nfts = selectAccountState(global, accountId)?.nfts;
  const existingNft = nfts?.byAddress?.[nftAddress];
  const orderedAddresses = (nfts?.orderedAddresses ?? []).filter((address) => address !== nftAddress);
  // Merge (not replace): a lower-fidelity source (e.g. an activity-derived NFT snapshot) omits fields
  // it can't determine, and must not erase a known value set by a more authoritative source.
  const byAddress = { ...nfts?.byAddress, [nftAddress]: existingNft ? { ...existingNft, ...nft } : nft };

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress,
      orderedAddresses: shouldAppendToEnd
        ? orderedAddresses.concat(nftAddress)
        : [nftAddress, ...orderedAddresses],
    },
  });
}

export function removeNft(global: GlobalState, accountId: string, nftAddress: string) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const orderedAddresses = (nfts?.orderedAddresses ?? []).filter((address) => address !== nftAddress);
  const selectedNfts = (nfts?.selectedNfts ?? []).filter((nft) => nft.address !== nftAddress);
  const { [nftAddress]: removedNft, ...byAddress } = nfts?.byAddress ?? {};

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress,
      orderedAddresses,
      selectedNfts,
    },
  });
}

export function updateNft(global: GlobalState, accountId: string, nftAddress: string, partial: Partial<ApiNft>) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const nft = nfts?.byAddress?.[nftAddress];
  if (!nfts || !nft) return global;

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts,
      byAddress: {
        ...nfts.byAddress,
        [nftAddress]: { ...nft, ...partial },
      },
    },
  });
}

export function addToSelectedNfts(
  global: GlobalState,
  accountId: string,
  nftsToAdd: ApiNft[],
) {
  const accountNfts = selectAccountState(global, accountId)!.nfts;
  const selectedNfts = [...(accountNfts?.selectedNfts ?? []), ...nftsToAdd];

  return updateAccountState(global, accountId, {
    nfts: {
      ...accountNfts!,
      selectedNfts,
    },
  });
}

export function removeFromSelectedNfts(global: GlobalState, accountId: string, nftAddress: string) {
  const nfts = selectAccountState(global, accountId)!.nfts;
  const selectedNfts = (nfts?.selectedNfts ?? []).filter((nft) => nft.address !== nftAddress);

  return updateAccountState(global, accountId, {
    nfts: {
      ...nfts!,
      selectedNfts: selectedNfts.length ? selectedNfts : undefined,
    },
  });
}

// Mirrors the `nftReceived` socket update from the activities pipeline so a freshly received NFT
// is applied immediately, without waiting for NFT polling
export function applyIncomingNftFromActivity(
  global: GlobalState,
  accountId: string,
  nft: ApiNft,
): GlobalState {
  return addNft(global, accountId, nft);
}

// Mirrors the `nftSent` socket update
export function applyOutgoingNftFromActivity(
  global: GlobalState,
  accountId: string,
  nft: ApiNft,
): GlobalState {
  return removeNft(global, accountId, nft.address);
}

export function addUnorderedNfts(
  global: GlobalState,
  accountId: string,
  updatedNfts?: Record<string, ApiNft>,
): GlobalState {
  if (!updatedNfts) {
    return global;
  }

  const { byAddress } = selectAccountState(global, accountId)?.nfts || { byAddress: {} };

  Object.values(updatedNfts).forEach((nft) => {
    const existingNft = byAddress?.[nft.address];
    if (existingNft) {
      global = updateNft(global, accountId, nft.address, nft);
    } else {
      global = addNft(global, accountId, nft, true);
    }
  });

  return global;
}
