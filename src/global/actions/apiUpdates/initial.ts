import type { ApiLiquidStakingState, ApiNft, ApiStakingState } from '../../../api/types';
import type { AccountChain } from '../../types';

import {
  DEFAULT_STAKING_STATE,
  IS_CORE_WALLET,
  IS_FEATURE_LIMITED,
  STAKING_SLUG_PREFIX,
  SWAP_API_VERSION,
  TELEGRAM_GIFTS_SUPER_COLLECTION,
} from '../../../config';
import { parseAccountId } from '../../../util/account';
import { areDeepEqual } from '../../../util/areDeepEqual';
import { buildCollectionByKey, unique } from '../../../util/iteratees';
import { openUrl } from '../../../util/openUrl';
import { getIsActiveStakingState } from '../../../util/staking';
import { setHiddenChainsSnapshot } from '../../../api/chains/chainVisibility';
import { omitAccounts } from '../../helpers/auth';
import { addActionHandler, setGlobal } from '../../index';
import {
  addUnorderedNfts,
  applyIncomingNftFromActivity,
  applyOutgoingNftFromActivity,
  createAccount,
  removeNft,
  updateAccount,
  updateAccountChain,
  updateAccountSettings,
  updateAccountStaking,
  updateAccountState,
  updateBalances,
  updateCurrencyRates,
  updateNft,
  updateRestrictions,
  updateSettings,
  updateStakingDefault,
  updateSwapTokens,
  updateTokens,
  updateVesting,
  updateVestingInfo,
} from '../../reducers';
import {
  selectAccount,
  selectAccountNftByAddress,
  selectAccountSettings,
  selectAccountState,
  selectVestingPartsReadyToUnfreeze,
} from '../../selectors';

addActionHandler('apiUpdate', (global, actions, update) => {
  switch (update.type) {
    case 'updateBalances': {
      global = updateBalances(global, update.accountId, update.chain, update.balances);
      setGlobal(global);
      break;
    }

    case 'updateStaking': {
      const {
        accountId,
        states,
        totalProfit,
        shouldUseNominators,
      } = update;

      const stateById = buildCollectionByKey(states, 'id');

      global = updateStakingDefault(global, {
        ...stateById[DEFAULT_STAKING_STATE.id] as ApiLiquidStakingState,
        balance: 0n,
        unstakeRequestAmount: 0n,
        tokenBalance: 0n,
      });
      const prevStakingStateById = selectAccountState(global, accountId)?.staking?.stateById || {};
      const prevStakingIds = new Set(Object.keys(prevStakingStateById));

      global = updateAccountStaking(global, accountId, {
        stateById,
        shouldUseNominators,
        totalProfit,
      });

      const { stakingId } = selectAccountState(global, accountId)?.staking ?? {};

      if (!stakingId) {
        let stateWithBiggestBalance: ApiStakingState | undefined;

        if (states.length > 0) {
          stateWithBiggestBalance = states.reduce((max, state) =>
            state.balance > max.balance ? state : max, states[0],
          );
        }

        if (stateWithBiggestBalance && stateWithBiggestBalance.balance > 0n) {
          global = updateAccountStaking(global, accountId, {
            stakingId: stateWithBiggestBalance.id,
          });
        } else if (shouldUseNominators && stateById.nominators) {
          global = updateAccountStaking(global, accountId, {
            stakingId: stateById.nominators.id,
          });
        }
      }

      // Collect all new staking slugs for auto-pinning
      const newStakingSlugs = states
        .filter((state) => {
          const isNewStaking = !prevStakingIds.has(state.id);
          const isActive = getIsActiveStakingState(state);
          return isNewStaking && isActive;
        })
        .map((state) => `${STAKING_SLUG_PREFIX}${state.tokenSlug}`);
      const hasNewPins = newStakingSlugs.length > 0;

      if (hasNewPins) {
        const accountSettings = selectAccountSettings(global, accountId) || {};
        const { pinnedSlugs = [] } = accountSettings;

        const newPinnedSlugs = unique(newStakingSlugs.concat(pinnedSlugs));

        global = updateAccountSettings(global, accountId, {
          ...accountSettings,
          pinnedSlugs: newPinnedSlugs,
        });
      }

      setGlobal(global);
      break;
    }

    case 'updateTokens': {
      const { tokens } = update;
      global = updateTokens(global, tokens, true);
      setGlobal(global);
      break;
    }

    case 'updateSwapTokens': {
      global = updateSwapTokens(global, update.tokens);
      setGlobal(global);

      break;
    }

    case 'updateCurrencyRates': {
      global = updateCurrencyRates(global, update.rates);
      setGlobal(global);
      break;
    }

    case 'updateNfts': {
      const { chain, accountId, collectionAddress, isFullLoading, streamedAddresses } = update;
      const nfts = buildCollectionByKey(update.nfts, 'address');
      const currentNfts = selectAccountState(global, accountId)?.nfts;
      const newOrderedAddresses = Object.keys(nfts);

      const shouldAppend = Boolean(collectionAddress) || Boolean(isFullLoading);

      let byAddress: Record<string, ApiNft>;
      let orderedAddresses: string[];

      if (streamedAddresses) {
        // Streaming complete - prune NFTs not seen during the session for this chain
        const streamed = new Set(streamedAddresses);
        const prunedByAddress = { ...currentNfts?.byAddress };
        for (const addr of Object.keys(prunedByAddress)) {
          if (prunedByAddress[addr].chain === chain && !streamed.has(addr)) {
            delete prunedByAddress[addr];
          }
        }
        byAddress = prunedByAddress;
        orderedAddresses = (currentNfts?.orderedAddresses ?? [])
          .filter((addr) => streamed.has(addr) || currentNfts?.byAddress?.[addr]?.chain !== chain);
      } else if (shouldAppend) {
        // Batch or collection loading - preserve existing entries (fresher websocket data)
        byAddress = { ...nfts, ...currentNfts?.byAddress };
        orderedAddresses = unique(
          ([] as string[]).concat(currentNfts?.orderedAddresses ?? [], newOrderedAddresses),
        );
      } else {
        // Non-streaming full update - new data takes priority
        byAddress = { ...currentNfts?.byAddress, ...nfts };
        orderedAddresses = unique(
          ([] as string[]).concat(newOrderedAddresses, currentNfts?.orderedAddresses ?? []),
        );
      }

      global = updateAccountState(global, accountId, {
        nfts: {
          ...currentNfts,
          byAddress,
          orderedAddresses,
          isLoadedByAddress: {
            ...currentNfts?.isLoadedByAddress,
            ...(shouldAppend && Boolean(collectionAddress) ? { [collectionAddress]: true } : {}),
          },
          collectionLoadedTimestamps: {
            ...currentNfts?.collectionLoadedTimestamps,
            ...(shouldAppend && Boolean(collectionAddress) ? { [collectionAddress]: Date.now() } : {}),
          },
          isFullLoadingByChain: isFullLoading !== undefined ? {
            ...currentNfts?.isFullLoadingByChain,
            [chain]: isFullLoading,
          } : currentNfts?.isFullLoadingByChain,
        },
      });

      const hasTelegramGifts = update.nfts.some((nft) => nft.isTelegramGift);
      if (hasTelegramGifts) {
        actions.addCollectionTab({
          collection: {
            address: TELEGRAM_GIFTS_SUPER_COLLECTION,
            chain: 'ton',
          },
          isAuto: true,
        });
      }

      setGlobal(global);
      break;
    }

    case 'nftSent': {
      const { accountId, nftAddress } = update;
      const sentNft = selectAccountNftByAddress(global, accountId, nftAddress);
      if (sentNft) {
        global = applyOutgoingNftFromActivity(global, accountId, sentNft);
      } else {
        // Fallback if NFT isn't in local state (e.g., startup race - socket event arrived before initial load)
        global = removeNft(global, accountId, nftAddress);
      }
      setGlobal(global);
      break;
    }

    case 'nftReceived': {
      const { accountId, nft } = update;
      global = applyIncomingNftFromActivity(global, accountId, nft);
      setGlobal(global);
      break;
    }

    case 'nftPutUpForSale': {
      const { accountId, nftAddress } = update;
      global = updateNft(global, accountId, nftAddress, {
        isOnSale: true,
      });
      setGlobal(global);
      break;
    }

    case 'updateAccount': {
      const {
        accountId, chain, domain, address, isMultisig, derivation, mfa,
      } = update;
      const account = selectAccount(global, accountId);
      if (!account) {
        break;
      }

      if (!account.byChain[chain]) {
        if (!address) {
          break;
        }

        global = updateAccount(global, accountId, {
          byChain: {
            ...account.byChain,
            [chain]: {
              address,
              ...(domain ? { domain } : {}),
              ...(isMultisig ? { isMultisig: true } : {}),
              ...(derivation ? { derivation } : {}),
            },
          },
        });
        setGlobal(global);
        break;
      }

      const chainUpdate: Partial<AccountChain> = {};
      if (address) {
        chainUpdate.address = address;
      }
      if (domain !== undefined) {
        chainUpdate.domain = domain || undefined;
      }
      if (isMultisig !== undefined) {
        chainUpdate.isMultisig = isMultisig || undefined;
      }
      if (derivation !== undefined) {
        chainUpdate.derivation = derivation;
      }
      if (mfa !== undefined) {
        chainUpdate.mfa = mfa || undefined;
      }
      global = updateAccountChain(global, accountId, chain, chainUpdate);
      setGlobal(global);
      break;
    }

    case 'updateChainVisibility': {
      setHiddenChainsSnapshot(update.hiddenChainsByNetwork);
      setGlobal({ ...global });
      break;
    }

    case 'updateConfig': {
      const {
        isLimited: isLimitedRegion,
        isCopyStorageEnabled,
        supportAccountsCount,
        isAppUpdateRequired,
        swapVersion,
        seasonalTheme,
      } = update;

      const shouldRestrictSwapsAndNftBuying = IS_FEATURE_LIMITED;
      global = updateRestrictions(global, {
        isLimitedRegion,
        isSwapDisabled: shouldRestrictSwapsAndNftBuying,
        isNftBuyingDisabled: shouldRestrictSwapsAndNftBuying,
        isCopyStorageEnabled,
        supportAccountsCount,
      });
      global = {
        ...global,
        isAppUpdateRequired: IS_CORE_WALLET ? undefined : isAppUpdateRequired,
        swapVersion: swapVersion ?? SWAP_API_VERSION,
        seasonalTheme,
      };
      setGlobal(global);
      break;
    }

    case 'updateWalletVersions': {
      actions.apiUpdateWalletVersions(update);
      break;
    }

    case 'openUrl': {
      void openUrl(update.url, { isExternal: update.isExternal, title: update.title, subtitle: update.subtitle });
      break;
    }

    case 'requestReconnectApi': {
      actions.initApi();
      break;
    }

    case 'incorrectTime': {
      if (!global.isIncorrectTimeNotificationReceived) {
        actions.showIncorrectTimeError();
      }
      break;
    }

    case 'updateVesting': {
      const { accountId, vestingInfo } = update;
      const unfreezeRequestedIds = selectVestingPartsReadyToUnfreeze(global, accountId);
      global = updateVestingInfo(global, accountId, vestingInfo);
      const newUnfreezeRequestedIds = selectVestingPartsReadyToUnfreeze(global, accountId);
      if (!areDeepEqual(unfreezeRequestedIds, newUnfreezeRequestedIds)) {
        global = updateVesting(global, accountId, { unfreezeRequestedIds: undefined });
      }
      setGlobal(global);
      break;
    }

    case 'updatingStatus': {
      const { kind, accountId, isUpdating } = update;
      const key = kind === 'balance' ? 'balanceUpdateStartedAt' : 'activitiesUpdateStartedAt';
      const accountState = selectAccountState(global, accountId);
      if (isUpdating && accountState?.[key]) break;

      global = updateAccountState(global, accountId, {
        [key]: isUpdating ? Date.now() : undefined,
      });

      // Set `isAppReady` when balance loading is complete
      if (!accountState?.isAppReady && kind === 'balance' && !isUpdating) {
        global = updateAccountState(global, accountId, { isAppReady: true });
      }

      setGlobal(global);
      break;
    }

    // Should be removed in future versions
    case 'migrateCoreApplication': {
      const {
        accountId,
        isTestnet,
        address,
        secondAddress,
        secondAccountId,
        isTonProxyEnabled,
      } = update;

      global = updateSettings(global, { isTestnet });
      global = createAccount({
        global,
        accountId,
        type: 'mnemonic',
        byChain: { ton: { address } },
      });
      // The opposite-network twin exists only on the trimmed core build; the combo build omits it (no secondAccountId).
      if (secondAccountId && secondAddress) {
        global = createAccount({
          global,
          accountId: secondAccountId,
          type: 'mnemonic',
          byChain: { ton: { address: secondAddress } },
          network: isTestnet ? 'mainnet' : 'testnet', // Second account should be created on opposite network
        });
      }
      setGlobal(global);

      // Run the application only after the post-migration GlobalState has been applied
      requestAnimationFrame(() => {
        actions.tryAddNotificationAccount({ accountId });
        actions.switchAccount({ accountId, newNetwork: isTestnet ? 'testnet' : 'mainnet' });
        actions.afterSignIn();

        if (isTonProxyEnabled) {
          actions.toggleTonProxy({ isEnabled: true });
        }
      });
      break;
    }

    case 'removeAccounts': {
      const { accountIds } = update;
      const removed = new Set(accountIds);
      const wasCurrentRemoved = Boolean(global.currentAccountId && removed.has(global.currentAccountId));
      global = omitAccounts(global, accountIds);

      // Drop any push-notification references to the removed accounts (local only; twins were never subscribed).
      const { enabledAccounts } = global.pushNotifications;
      const nextEnabledAccounts = enabledAccounts.filter((id) => !removed.has(id));
      if (nextEnabledAccounts.length !== enabledAccounts.length) {
        global = {
          ...global,
          pushNotifications: { ...global.pushNotifications, enabledAccounts: nextEnabledAccounts },
        };
      }

      setGlobal(global);

      // `omitAccounts` clears `currentAccountId` when the active account is removed, but nothing downstream
      // self-heals from `currentAccountId === undefined` (`activateAccount` bails out). Re-select a survivor via
      // `switchAccount` (which also syncs `settings.isTestnet` — see the `migrateCoreApplication` case above).
      // Zero survivors is a full wipe: leave `currentAccountId` undefined. `orderedAccountIds` is a merge-only
      // hint that can retain ids of accounts removed in earlier sessions, so pick the first one still live.
      if (wasCurrentRemoved) {
        const survivorId = global.settings.orderedAccountIds?.find((id) => id in global.byAccountId)
          ?? Object.keys(global.byAccountId)[0];
        if (survivorId) {
          actions.switchAccount({ accountId: survivorId, newNetwork: parseAccountId(survivorId).network });
        }
      }
      break;
    }

    case 'updateAccountConfig': {
      const { accountConfig, accountId } = update;
      global = updateAccountState(global, accountId, { config: accountConfig });
      setGlobal(global);
      break;
    }

    case 'updateAccountDomainData': {
      const {
        accountId,
        expirationByAddress,
        linkedAddressByAddress,
        nfts: updatedNfts,
      } = update;
      const nfts = selectAccountState(global, accountId)?.nfts || { byAddress: {} };

      global = updateAccountState(global, accountId, {
        nfts: {
          ...nfts,
          dnsExpiration: expirationByAddress,
          linkedAddressByAddress,
        },
      });
      global = addUnorderedNfts(global, accountId, updatedNfts);
      setGlobal(global);
      break;
    }
  }
});
