import type { ApiActivity, ApiActivityTimestamps, ApiChain } from '../../api/types';
import type { GlobalState } from '../types';

import { parseAccountId } from '../../util/account';
import { getActivityChains, getIsActivitySuitableForFetchingTimestamp, getIsTxIdLocal } from '../../util/activities';
import { getOrderedAccountChains } from '../../util/chain';
import { compact, findLast, mapValues } from '../../util/iteratees';
import { getHiddenChainsSnapshot } from '../../api/chains/chainVisibility';
import { selectAccount, selectAccountState } from './accounts';

function isActivityOnVisibleChain(activity: ApiActivity, accountId: string) {
  const { network } = parseAccountId(accountId);
  const hiddenChains = getHiddenChainsSnapshot(network);
  if (!hiddenChains.size) return true;

  return getActivityChains(activity).every((chain) => !hiddenChains.has(chain));
}

export function selectNewestActivityTimestamps(global: GlobalState, accountId: string): ApiActivityTimestamps {
  return mapValues(
    selectAccountState(global, accountId)?.activities?.newestActivitiesBySlug || {},
    ({ timestamp }) => timestamp,
  );
}

export function selectLastActivityTimestamp(
  global: GlobalState,
  accountId: string,
  tokenSlug?: string,
): number | undefined {
  const activities = selectAccountState(global, accountId)?.activities;
  if (!activities) return undefined;

  const { byId, idsMain, idsBySlug } = activities;
  const ids = (tokenSlug ? idsBySlug?.[tokenSlug] : idsMain) || [];
  const txId = findLast(ids, (id) => {
    const activity = byId[id];
    return getIsActivitySuitableForFetchingTimestamp(activity)
      && activity
      && isActivityOnVisibleChain(activity, accountId);
  });
  if (!txId) return undefined;

  return byId[txId].timestamp;
}

export function selectLocalActivitiesSlow(global: GlobalState, accountId: string) {
  const { byId = {}, localActivityIds = [] } = global.byAccountId[accountId]?.activities ?? {};

  return compact(localActivityIds.map((id) => byId[id]))
    .filter((activity) => isActivityOnVisibleChain(activity, accountId));
}

/** Doesn't include local activities */
export function selectPendingActivitiesSlow(global: GlobalState, accountId: string, chain: ApiChain) {
  const { network } = parseAccountId(accountId);
  if (getHiddenChainsSnapshot(network).has(chain)) {
    return [];
  }

  const { byId = {}, pendingActivityIds = {} } = global.byAccountId[accountId]?.activities ?? {};
  const ids = pendingActivityIds[chain] ?? [];

  return compact(ids.map((id) => byId[id]));
}

export function selectRecentNonLocalActivitiesSlow(global: GlobalState, accountId: string, maxCount: number) {
  const { byId = {}, idsMain = [] } = global.byAccountId[accountId]?.activities ?? {};
  const result: ApiActivity[] = [];

  for (const id of idsMain) {
    if (result.length >= maxCount) {
      break;
    }
    if (getIsTxIdLocal(id)) {
      continue;
    }
    const activity = byId[id];
    if (activity && isActivityOnVisibleChain(activity, accountId)) {
      result.push(activity);
    }
  }

  return result;
}

export function selectIsHistoryEndReached(global: GlobalState, accountId: string, tokenSlug?: string) {
  const accountState = selectAccountState(global, accountId);
  const activities = accountState?.activities;
  if (tokenSlug) {
    return !!activities?.isHistoryEndReachedBySlug?.[tokenSlug];
  }

  // Only enabled networks count toward the "history ended" gate — otherwise a disabled
  // chain that never finished loading keeps the feed spinner forever.
  const byChain = selectAccount(global, accountId)?.byChain ?? {};
  const { network } = parseAccountId(accountId);
  const visibleChains = getOrderedAccountChains(byChain, network);
  if (!visibleChains.length) {
    return true;
  }

  const hasMoreByChain = activities?.mainHistoryHasMoreByChain ?? {};
  return visibleChains.every((chain) => hasMoreByChain[chain] === false);
}

/** If returns `undefined`, the activities haven't been loaded yet. If returns `[]`, there are no activities. */
export function selectActivityHistoryIds(global: GlobalState, accountId: string, tokenSlug?: string) {
  const activities = selectAccountState(global, accountId)?.activities;
  const { idsMain, idsBySlug, byId } = activities ?? {};
  const ids = tokenSlug ? idsBySlug?.[tokenSlug] : idsMain;
  if (!ids || !byId) {
    return ids;
  }

  const { network } = parseAccountId(accountId);
  const hiddenChains = getHiddenChainsSnapshot(network);
  if (!hiddenChains.size) {
    return ids;
  }

  return ids.filter((id) => {
    const activity = byId[id];
    return Boolean(activity && isActivityOnVisibleChain(activity, accountId));
  });
}
