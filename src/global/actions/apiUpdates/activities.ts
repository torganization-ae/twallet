import type { ApiActivity, ApiChain } from '../../../api/types';
import type { GlobalState } from '../../types';

import { IS_FEATURE_LIMITED } from '../../../config';
import { getActivityIdReplacements, getIsHiddenNftActivity } from '../../../util/activities';
import { playIncomingTransactionSound } from '../../../util/notificationSound';
import { getIsTransactionWithPoisoning, updatePoisoningCacheFromActivities } from '../../../util/poisoningHash';
import { waitFor } from '../../../util/schedulers';
import { getChainBySlug } from '../../../util/tokens';
import { SEC } from '../../../api/constants';
import { getIsTinyOrScamTransaction } from '../../helpers';
import { addActionHandler, getActions, getGlobal, setGlobal } from '../../index';
import {
  addInitialActivities,
  addNewActivities,
  applyIncomingNftFromActivity,
  applyLocalAddressNamesToActivities,
  applyOutgoingNftFromActivity,
  removeActivities,
  replaceCurrentActivityId,
  replaceCurrentDomainLinkingId,
  replaceCurrentDomainRenewalId,
  replaceCurrentSwapId,
  replaceCurrentTransferId,
  updatePendingActivitiesToTrustedByReplacements,
  updatePendingActivitiesWithTrustedStatus,
} from '../../reducers';
import {
  selectAccountState,
  selectAccountTokens,
  selectLocalActivitiesSlow,
  selectPendingActivitiesSlow,
  selectRecentNonLocalActivitiesSlow,
} from '../../selectors';

const TX_AGE_TO_PLAY_SOUND = 60000; // 1 min
const PRELOAD_ACTIVITY_TOKEN_COUNT = 10;

addActionHandler('apiUpdate', (global, actions, update) => {
  switch (update.type) {
    case 'initialActivities': {
      const {
        accountId, mainActivities, mainHistoryHasMore, bySlug, chain,
      } = update;

      updatePoisoningCacheFromActivities(mainActivities);

      global = addInitialActivities(global, accountId, mainActivities, bySlug, chain, mainHistoryHasMore);
      setGlobal(global);

      void preloadTopTokenHistory(accountId, chain);
      break;
    }

    case 'newLocalActivities': {
      const {
        accountId,
        activities,
      } = update;

      // Find matches between local and chain activities
      const replacedIds = findLocalToChainActivityMatches(global, accountId, activities);

      hideOutdatedLocalActivities(activities, replacedIds);

      // Update pending chain activities to trusted status where applicable
      global = updatePendingActivitiesToTrustedByReplacements(global, accountId, activities, replacedIds);
      global = addNewActivities(global, accountId, activities);

      setGlobal(global);
      break;
    }

    case 'newActivities': {
      const { accountId, activities: newConfirmedActivities, pendingActivities, chain } = update;

      const prevActivitiesForReplacement = [
        ...selectLocalActivitiesSlow(global, accountId),
        ...(chain ? selectPendingActivitiesSlow(global, accountId, chain) : []),
      ];
      const incomingActivities = [
        ...(pendingActivities ?? []),
        ...newConfirmedActivities,
      ];
      const replacedIds = getActivityIdReplacements(prevActivitiesForReplacement, incomingActivities);

      // A good TON address for testing: UQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xI-e
      global = removeActivities(global, accountId, Object.keys(replacedIds));
      global = updatePendingActivitiesWithTrustedStatus(
        global,
        accountId,
        chain,
        pendingActivities,
        replacedIds,
        prevActivitiesForReplacement,
      );
      const confirmedWithLocalNames = applyLocalAddressNamesToActivities(
        prevActivitiesForReplacement,
        newConfirmedActivities,
        replacedIds,
      );
      global = addNewActivities(global, accountId, confirmedWithLocalNames);

      global = replaceCurrentTransferId(global, replacedIds);
      global = replaceCurrentDomainLinkingId(global, replacedIds);
      global = replaceCurrentDomainRenewalId(global, replacedIds);
      global = replaceCurrentSwapId(global, replacedIds);
      global = replaceCurrentActivityId(global, accountId, replacedIds);

      notifyAboutNewActivities(global, accountId, newConfirmedActivities);
      updatePoisoningCacheFromActivities(newConfirmedActivities);

      if (!IS_FEATURE_LIMITED) {
        // NFT polling is executed at long intervals, so a transaction-event with an NFT can arrive
        // long before the next polling round. Apply the change to local NFT state immediately so the UI
        // reflects new ownership without waiting for polling.
        // A subsequent `nftReceived`/`nftSent` socket update or polling round is idempotent here.
        for (const activity of newConfirmedActivities) {
          if (activity.kind !== 'transaction' || !activity.nft) continue;

          // For `nftTrade` (marketplace buy/sell) `isIncoming` reflects the `TONCOIN` direction,
          // not the NFT direction - so it must be inverted here
          const isNftIncoming = activity.type === 'nftTrade' ? !activity.isIncoming : activity.isIncoming;

          if (isNftIncoming) {
            global = applyIncomingNftFromActivity(global, accountId, activity.nft);
          } else {
            global = applyOutgoingNftFromActivity(global, accountId, activity.nft);
          }
        }
      }

      setGlobal(global);
      break;
    }
  }
});

function notifyAboutNewActivities(global: GlobalState, accountId: string, newActivities: ApiActivity[]) {
  if (!global.settings.canPlaySounds) {
    return;
  }

  const { areTinyTransfersHidden } = global.settings;
  const { blacklistedNftAddresses, whitelistedNftAddresses } = selectAccountState(global, accountId) || {};

  const shouldPlaySound = newActivities.some((activity) => {
    return activity.kind === 'transaction'
      && activity.isIncoming
      && activity.status === 'completed'
      && (Date.now() - activity.timestamp < TX_AGE_TO_PLAY_SOUND)
      && !(
        areTinyTransfersHidden
        && (
          getIsTinyOrScamTransaction(activity, global.tokenInfo?.bySlug[activity.slug])
          || getIsHiddenNftActivity(activity, blacklistedNftAddresses, whitelistedNftAddresses)
        )
      )
      && !getIsTransactionWithPoisoning(activity);
  });

  if (shouldPlaySound) {
    playIncomingTransactionSound();
  }
}

function findLocalToChainActivityMatches(
  global: GlobalState,
  accountId: string,
  localActivities: ApiActivity[],
) {
  const maxCheckDepth = localActivities.length + 20;
  const chainActivities = selectRecentNonLocalActivitiesSlow(global, accountId, maxCheckDepth);

  return getActivityIdReplacements(localActivities, chainActivities);
}

/**
 * Thanks to the socket, there is a possibility that a pending activity will arrive before the corresponding local
 * activity. Such local activities duplicate the pending activities, which is unwanted. They shouldn't be removed,
 * because other parts of the global state may point to their ids, so they get hidden instead.
 */
function hideOutdatedLocalActivities(
  localActivities: ApiActivity[],
  replacements: Record<string, string>,
) {
  for (const localActivity of localActivities) {
    if (localActivity.id in replacements) {
      localActivity.shouldHide = true;
    }
  }
}

async function preloadTopTokenHistory(accountId: string, chain: ApiChain) {
  await waitFor(() => !!selectAccountTokens(getGlobal(), accountId), SEC, 10);
  const global = getGlobal();

  const tokens = (selectAccountTokens(global, accountId) ?? [])
    .slice(0, PRELOAD_ACTIVITY_TOKEN_COUNT)
    .filter((token) => getChainBySlug(token.slug) === chain);

  const { idsBySlug } = selectAccountState(global, accountId)?.activities || {};
  const { fetchPastActivities } = getActions();

  for (const { slug } of tokens) {
    if (idsBySlug?.[slug] === undefined) {
      fetchPastActivities({ accountId, slug });
    }
  }
}
