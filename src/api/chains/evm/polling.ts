import type {
  ApiAccountWithChain,
  ApiActivity,
  ApiActivityTimestamps,
  ApiBalanceBySlug,
  ApiChain,
  ApiEVMWallet,
  EVMChain,
  OnApiUpdate,
  OnUpdatingStatusChange,
} from '../../types';

import { parseAccountId } from '../../../util/account';
import { getActivityTokenSlugs } from '../../../util/activities';
import { areDeepEqual } from '../../../util/areDeepEqual';
import { getChainConfig, getSupportedChains } from '../../../util/chain';
import { compact } from '../../../util/iteratees';
import { logDebugError } from '../../../util/logs';
import { pause } from '../../../util/schedulers';
import { getChainBySlug } from '../../../util/tokens';
import { NftStream } from './util/nftStream';
import { getAlchemySocket } from './util/socket';
import { fetchStoredWallet } from '../../common/accounts';
import {
  activeNftTiming,
  activeWalletTiming,
  inactiveWalletTiming,
  pollingLoop,
} from '../../common/polling/utils';
import { swapReplaceActivities } from '../../common/swap';
import { sendUpdateTokens } from '../../common/tokens';
import { txCallbacks } from '../../common/txCallbacks';
import { BalanceStream } from '../../common/websocket/balanceStream';
import { FIRST_TRANSACTIONS_LIMIT, MINUTE, SEC } from '../../constants';
import { isEvmEnhancedApiEnabled } from '../rpcOverrides';
import { getTokenActivitySlice } from './activities';
import { fetchAccountAssets, fetchCrosschainAccountAssets, getIsWalletActive } from './wallet';

/** Builtin EVM poll stagger so 8× eth_getBalance don't all fire on the same tick at launch. */
const CUSTOM_BALANCE_STAGGER_MS = 400;

const activeEvmWalletTiming = {
  ...activeWalletTiming,
  forcedPollingPeriod: { focused: 3 * MINUTE, notFocused: 10 * MINUTE },
};

const inactiveEvmWalletTiming = {
  ...inactiveWalletTiming,
  forcedPollingPeriod: { focused: 10 * MINUTE, notFocused: 10 * MINUTE },
};

export function setupActivePolling<C extends EVMChain>(
  chain: C,
  accountId: string,
  account: ApiAccountWithChain<C>,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange: OnUpdatingStatusChange,
  newestActivityTimestamps: ApiActivityTimestamps,
): NoneToVoidFunction {
  // The cast is needed because indexing `byChain` by a generic chain key loses the wallet type
  const { address } = account.byChain[chain] as ApiEVMWallet;

  if (!isEvmEnhancedApiEnabled(chain, parseAccountId(accountId).network)) {
    return setupCustomBalancePolling(
      chain,
      accountId,
      address,
      true,
      onUpdate,
      onUpdatingStatusChange.bind(undefined, 'balance'),
    ).stop;
  }

  let markWalletActiveForBalancePolling: NoneToVoidFunction = () => {};

  const {
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
    didScheduleInitialCatchUp,
  } = setupActivityPolling(
    chain, accountId, newestActivityTimestamps, onUpdate,
    onUpdatingStatusChange.bind(undefined, 'activities'),
    () => markWalletActiveForBalancePolling(),
  );

  const nftPolling = getChainConfig(chain).isNftSupported
    ? setupNftPolling(chain, accountId, address, scheduleCrossApiActivityCatchUp, onUpdate)
    : undefined;

  const balancePolling = setupBalancePolling(
    chain,
    accountId,
    address,
    true,
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
    onUpdate,
    onUpdatingStatusChange.bind(undefined, 'balance'),
    didScheduleInitialCatchUp,
  );
  markWalletActiveForBalancePolling = balancePolling.markWalletActiveAndForcePoll;

  return () => {
    nftPolling?.stop();
    balancePolling.stop();
  };
}

const BALANCE_ACTIVITY_CATCH_UP_ATTEMPTS = 60;

function setupActivityPolling(
  chain: EVMChain,
  accountId: string,
  newestActivityTimestamps: ApiActivityTimestamps,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange: (isUpdating: boolean) => void,
  onActivityDetected: NoneToVoidFunction,
): {
    scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void;
    cancelCrossApiActivityCatchUp: NoneToVoidFunction;
    didScheduleInitialCatchUp: boolean;
  } {
  const initialTimestamps = compact(Object.values(newestActivityTimestamps));
  let newestConfirmedActivityTimestamp = initialTimestamps.length ? Math.max(...initialTimestamps) : undefined;

  let lastEmptyTimestamp: number | undefined;
  let balanceCatchUpGeneration = 0;

  async function rawUpdate(): Promise<boolean> {
    if (newestConfirmedActivityTimestamp !== undefined && newestConfirmedActivityTimestamp === lastEmptyTimestamp) {
      return false;
    }

    onUpdatingStatusChange(true);

    try {
      if (newestConfirmedActivityTimestamp === undefined) {
        const result = await loadInitialActivities(chain, accountId, onUpdate);
        const timestamps = compact(Object.values(result));

        if (timestamps.length) {
          newestConfirmedActivityTimestamp = Math.max(...timestamps);
          onActivityDetected();
          return true;
        }

        // Empty wallet: stamp "now" so the next balance tick does incremental polls instead of
        // repeating the full initial slice forever (undefined cursor = always initial).
        newestConfirmedActivityTimestamp = Date.now();
        lastEmptyTimestamp = newestConfirmedActivityTimestamp;
        return false;
      } else {
        const result = await loadNewActivities(chain, accountId, newestConfirmedActivityTimestamp, onUpdate);
        const newTimestamps = compact(Object.values(result));

        if (newTimestamps.length && Math.max(...newTimestamps) > newestConfirmedActivityTimestamp) {
          newestConfirmedActivityTimestamp = Math.max(newestConfirmedActivityTimestamp, Math.max(...newTimestamps));
          onActivityDetected();
          return true;
        }

        lastEmptyTimestamp = newestConfirmedActivityTimestamp;

        return false;
      }
    } catch (err) {
      logDebugError(`EVM:${chain} setupActivityPolling`, err);
      return false;
    } finally {
      onUpdatingStatusChange(false);
    }
  }

  function scheduleCrossApiActivityCatchUp(source: 'socket' | 'poll') {
    balanceCatchUpGeneration += 1;
    const generation = balanceCatchUpGeneration;

    void (async () => {
      for (let attempt = 0; attempt < BALANCE_ACTIVITY_CATCH_UP_ATTEMPTS; attempt++) {
        if (generation !== balanceCatchUpGeneration) {
          return;
        }
        lastEmptyTimestamp = undefined;
        const found = await rawUpdate();

        if (source === 'poll') {
          return;
        }

        if (found) {
          return;
        }
        if (newestConfirmedActivityTimestamp === undefined) {
          return;
        }
        if (generation !== balanceCatchUpGeneration) {
          return;
        }

        await pause(SEC * 2);
      }
    })();
  }

  function cancelCrossApiActivityCatchUp() {
    balanceCatchUpGeneration += 1;
  }

  const didScheduleInitialCatchUp = newestConfirmedActivityTimestamp === undefined;
  if (didScheduleInitialCatchUp) {
    scheduleCrossApiActivityCatchUp('poll');
  }

  const activityPolling: {
    scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void;
    cancelCrossApiActivityCatchUp: NoneToVoidFunction;
    didScheduleInitialCatchUp: boolean;
  } = {
    scheduleCrossApiActivityCatchUp,
    cancelCrossApiActivityCatchUp,
    didScheduleInitialCatchUp,
  };

  return activityPolling;
}

function setupNftPolling(
  chain: EVMChain,
  accountId: string,
  address: string,
  scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void,
  onUpdate: OnApiUpdate,
) {
  const { network } = parseAccountId(accountId);

  const nftStream = new NftStream(chain, network, address, accountId, activeNftTiming);

  nftStream.onUpdate((params) => {
    if (params.direction === 'set') {
      onUpdate({
        type: 'updateNfts',
        accountId,
        nfts: params.nfts,
        chain,
        isFullLoading: params.isFullLoading,
        streamedAddresses: params.streamedAddresses,
      });
      if (!params.hasNewNfts) return;
    }
    if (params.direction === 'send') {
      onUpdate({
        type: 'nftSent',
        accountId,
        chain,
        nftAddress: params.nftAddress,
        newOwnerAddress: params.newOwner,
      });
      scheduleCrossApiActivityCatchUp('socket');
    }
    if (params.direction === 'receive') {
      onUpdate({
        type: 'nftReceived',
        accountId,
        nft: params.nft,
        nftAddress: params.nft.address,
      });
      scheduleCrossApiActivityCatchUp('socket');
    }
  });

  return {
    stop() {
      nftStream.destroy();
    },
  };
}

function setupBalancePolling(
  chain: EVMChain,
  accountId: string,
  address: string,
  isActive: boolean,
  scheduleCrossApiActivityCatchUp: (source: 'socket' | 'poll') => void,
  cancelCrossApiActivityCatchUp: NoneToVoidFunction,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange?: (isUpdating: boolean) => void,
  skipFirstPollActivityCatchUp?: boolean,
) {
  const { network } = parseAccountId(accountId);
  const checkIsWalletActive = async () => {
    return getIsWalletActive(network, chain, address);
  };

  const balanceStream = new BalanceStream({
    chain,
    wsClient: isEvmEnhancedApiEnabled(chain, network) ? getAlchemySocket(network, chain) : undefined,
    network,
    address,
    sendUpdateTokens: () => sendUpdateTokens(onUpdate),
    fallbackPollingOptions: isActive ? activeEvmWalletTiming : inactiveEvmWalletTiming,
    fetchBalancesCb: (...args) => fetchAccountAssets(chain, ...args),
    fetchCrosschainBalancesCb: fetchCrosschainAccountAssets,
    importUnknownTokens: undefined,
    loadingConcurrencyLimiter: undefined,
    ensureIsPollingNeeded: checkIsWalletActive,
  });

  let lastEmittedBalances: ApiBalanceBySlug | undefined;

  balanceStream.onUpdate((balances, updateSource) => {
    const crosschainAssetsByChain = new Map<ApiChain, ApiBalanceBySlug>();

    const knownChains = getSupportedChains();

    for (const [slug, balance] of Object.entries(balances)) {
      const assetChain = getChainBySlug(slug);

      if (!knownChains.includes(assetChain)) {
        continue;
      }

      crosschainAssetsByChain.set(assetChain, {
        ...crosschainAssetsByChain.get(assetChain),
        [slug]: balance,
      });
    }

    for (const [assetChain, chainBalances] of crosschainAssetsByChain.entries()) {
      onUpdate({
        type: 'updateBalances',
        accountId,
        chain: assetChain,
        balances: chainBalances,
      });
    }

    const isFirstPoll = lastEmittedBalances === undefined;
    const balancesChanged = !areDeepEqual(balances, lastEmittedBalances);
    lastEmittedBalances = balances;

    // Socket always; poll only when balances changed. Skip the first poll catch-up when setup
    // already ran the initial activity fetch (avoids an empty-wallet double-hit on launch).
    if (updateSource === 'socket') {
      scheduleCrossApiActivityCatchUp('socket');
    } else if (balancesChanged && !(isFirstPoll && skipFirstPollActivityCatchUp)) {
      scheduleCrossApiActivityCatchUp('poll');
    }
  });

  if (onUpdatingStatusChange) {
    balanceStream.onLoadingChange(onUpdatingStatusChange);
  }
  balanceStream.start();

  return {
    stop() {
      cancelCrossApiActivityCatchUp();
      balanceStream.destroy();
    },
    markWalletActiveAndForcePoll() {
      balanceStream.markWalletActiveAndForcePoll();
    },
  };
}

function setupCustomBalancePolling(
  chain: EVMChain,
  accountId: string,
  address: string,
  isActive: boolean,
  onUpdate: OnApiUpdate,
  onUpdatingStatusChange?: (isUpdating: boolean) => void,
) {
  const { network } = parseAccountId(accountId);

  if (isActive) {
    onUpdate({
      type: 'initialActivities',
      chain,
      accountId,
      mainActivities: [],
      mainHistoryHasMore: false,
      bySlug: {},
    });
  }

  const timing = isActive ? activeEvmWalletTiming : inactiveEvmWalletTiming;
  // Spread first eth_getBalance across builtin EVM chains so launch doesn't DDoS publicnode.
  const staggerIndex = Math.abs(
    [...chain].reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  ) % 8;
  let lastBalances: ApiBalanceBySlug | undefined;
  let didInitialPoll = false;

  const loop = pollingLoop({
    period: timing.pollingPeriod,
    skipInitialPoll: !isActive,
    async poll() {
      if (isActive && !didInitialPoll && staggerIndex > 0) {
        didInitialPoll = true;
        await pause(staggerIndex * CUSTOM_BALANCE_STAGGER_MS);
      } else {
        didInitialPoll = true;
      }

      onUpdatingStatusChange?.(true);
      try {
        const balances = await fetchAccountAssets(
          chain,
          network,
          address,
          () => sendUpdateTokens(onUpdate),
        );
        if (areDeepEqual(balances, lastBalances)) {
          return;
        }
        lastBalances = balances;
        onUpdate({
          type: 'updateBalances',
          accountId,
          chain,
          balances,
        });
      } catch (err) {
        logDebugError(`EVM:${chain} setupCustomBalancePolling`, err);
      } finally {
        onUpdatingStatusChange?.(false);
      }
    },
  });

  return loop;
}

export function setupInactivePolling<C extends EVMChain>(
  chain: C,
  accountId: string,
  account: ApiAccountWithChain<C>,
  onUpdate: OnApiUpdate,
): NoneToVoidFunction {
  // The cast is needed because indexing `byChain` by a generic chain key loses the wallet type
  const { address } = account.byChain[chain] as ApiEVMWallet;

  if (!isEvmEnhancedApiEnabled(chain, parseAccountId(accountId).network)) {
    return setupCustomBalancePolling(chain, accountId, address, false, onUpdate).stop;
  }

  const balancePolling = setupBalancePolling(
    chain,
    accountId,
    address,
    false,
    () => {},
    () => {},
    onUpdate,
  );

  return balancePolling.stop;
}

async function loadInitialActivities(
  chain: EVMChain,
  accountId: string,
  onUpdate: OnApiUpdate,
): Promise<ApiActivityTimestamps> {
  try {
    const { network } = parseAccountId(accountId);
    const { address } = await fetchStoredWallet(accountId, chain);

    const { activities: rawActivities, hasMore: mainHistoryHasMore } = await getTokenActivitySlice(
      chain,
      network,
      address,
      undefined,
      undefined,
      undefined,
      FIRST_TRANSACTIONS_LIMIT,
    );

    // Merge cross-chain CEX swaps into the feed, the way TON/Solana/Tron do on initial load. The
    // on-chain leg of such a swap arrives here as a plain transfer; without this the live EVM feed
    // shows it un-merged until the user paginates deep enough to hit the shared history path
    // (`fetchPastActivities`), which already applies the same replacement.
    const activities = await swapReplaceActivities(accountId, rawActivities, undefined, true);

    activities
      .slice()
      .reverse()
      .forEach((activity) => {
        txCallbacks.runCallbacks(activity);
      });

    // Record the newest activity of every token slug, not just the native one. A token- or
    // swap-led wallet can have no native-coin activity on its first page, so a native-only marker
    // would stay unset and make every launch repeat the full initial fetch instead of an
    // incremental poll. An empty wallet still yields an empty `bySlug`, so the reducer's
    // empty-update guard short-circuits.
    const result: ApiActivityTimestamps = {};
    const bySlug: Record<string, ApiActivity[]> = {};
    for (const activity of activities) {
      for (const slug of getActivityTokenSlugs(activity)) {
        (bySlug[slug] ??= []).push(activity);
        result[slug] ??= activity.timestamp; // `activities` is sorted newest-first
      }
    }

    // `getActivityTokenSlugs` returns no slugs for NFT transfers, so a first page made entirely of
    // NFT activity leaves `result` empty and `newestConfirmedActivityTimestamp` stuck at `undefined`,
    // forcing every subsequent poll to repeat this expensive initial load. Stamp a native-token
    // fallback timestamp (without touching `bySlug`) so that doesn't happen, mirroring the
    // unconditional stamp in `loadNewActivities`.
    if (!Object.keys(result).length && activities.length) {
      result[getChainConfig(chain).nativeToken.slug] = activities[0].timestamp;
    }

    onUpdate({
      type: 'initialActivities',
      chain,
      accountId,
      mainActivities: activities,
      mainHistoryHasMore,
      bySlug,
    });

    return result;
  } catch (err) {
    // Ensure `areInitialActivitiesLoaded[chain] = true` even on failure so
    // `waitInitialActivityLoading` unblocks and other chains stay visible.
    onUpdate({
      type: 'initialActivities',
      chain,
      accountId,
      mainActivities: [],
      bySlug: {},
    });
    throw err;
  }
}

async function loadNewActivities(
  chain: EVMChain,
  accountId: string,
  newestActivityTimestamp: number,
  onUpdate: OnApiUpdate,
): Promise<ApiActivityTimestamps> {
  const { network } = parseAccountId(accountId);
  const { address } = await fetchStoredWallet(accountId, chain);

  const { activities: rawActivities } = await getTokenActivitySlice(
    chain,
    network,
    address,
    undefined,
    undefined,
    newestActivityTimestamp,
    FIRST_TRANSACTIONS_LIMIT,
  );

  const result: ApiActivityTimestamps = {};
  if (!rawActivities.length) return result;

  // Advance the polling cursor from the RAW on-chain slice, before the swap merge. A merged
  // cross-chain CEX swap can carry a backend timestamp newer than every on-chain leg in this slice;
  // anchoring the cursor on it would push `min_mined_at` past a genuine on-chain tx whose timestamp
  // falls in between, so that tx is never fetched on the next poll and silently misses the live feed.
  // Tron keeps its cursor on the raw slice for the same reason; the merge below is display-only.
  result[getChainConfig(chain).nativeToken.slug] = rawActivities[0].timestamp;

  // Merge cross-chain CEX swaps so a freshly polled swap leg is shown as a swap, not a plain
  // transfer, consistent with the initial load and the shared pagination path.
  const activities = await swapReplaceActivities(accountId, rawActivities, undefined, true);

  activities
    .slice()
    .reverse()
    .forEach((activity) => {
      txCallbacks.runCallbacks(activity);
    });

  onUpdate({
    type: 'newActivities',
    chain,
    activities,
    pendingActivities: [],
    accountId,
  });

  return result;
}
