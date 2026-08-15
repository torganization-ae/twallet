import type {
  ApiAccountAny,
  ApiAccountConfig,
  ApiAccountWithMnemonic,
  ApiActivityTimestamps,
  ApiBackendConfig,
  ApiChain,
  ApiCurrencyRates,
  ApiNetwork,
  ApiSwapAsset,
  ApiTokenDetails,
  ApiTokenWithPrice,
  ApiUpdatingStatus,
  OnApiUpdate,
} from '../types';

import { NO_BACKEND, NO_MFA, NO_SWAP } from '../../config';
import { parseAccountId } from '../../util/account';
import { areDeepEqual } from '../../util/areDeepEqual';
import { findChainConfig } from '../../util/chain';
import { omit, split } from '../../util/iteratees';
import { logDebugError } from '../../util/logs';
import { OrGate } from '../../util/orGate';
import { forbidConcurrency } from '../../util/schedulers';
import { getNativeToken } from '../../util/tokens';
import chains from '../chains';
import { isChainHidden } from '../chains/chainVisibility';
import { isEvmChain } from '../chains/defaultEndpoints';
import { hasSharedDefaultRpc } from '../chains/networksConfig';
import { getEffectiveRpcUrl, isEvmEnhancedApiEnabled, isRpcFieldDefault } from '../chains/rpcOverrides';
import {
  doesAccountHaveChain,
  fetchMaybeStoredAccount,
  fetchStoredAccount,
} from '../common/accounts';
import { tryUpdateKnownAddresses } from '../common/addresses';
import { callBackendGet, callBackendPost } from '../common/backend';
import { setBackendConfigCache } from '../common/cache';
import {
  clearCollectiblesPolling,
  retargetCollectiblesPollingAccount,
} from '../common/polling/collectiblesPolling';
import { pollingLoop } from '../common/polling/utils';
import { getTokensCache, loadTokensCache, sendUpdateTokens, tokensPreload, updateTokens } from '../common/tokens';
import { MINUTE, SEC } from '../constants';
import { storage } from '../storages';
import { refreshMfaStateAndNotify } from './mfa';
import { resolveDataPreloadPromise } from './preload';
import { swapGetAssets } from './swap';

const BACKEND_INTERVAL = MINUTE;
const LONG_BACKEND_INTERVAL = 2 * MINUTE;
const INCORRECT_TIME_DIFF = 30 * SEC;

const ACCOUNT_CONFIG_INTERVAL = { focused: 5 * MINUTE, notFocused: 15 * MINUTE };
const MFA_INTERVAL = 5 * MINUTE;

/**
 * A chain is scannable when it has a usable RPC endpoint (shared default or user override).
 * Empty shared `rpc` without an override means the chain stays dormant until the user
 * fills Settings → Networks.
 */
function isChainRpcConfigured(chain: ApiChain, network: ApiNetwork): boolean {
  if (hasSharedDefaultRpc(chain, network)) return true;
  return !isRpcFieldDefault(chain, network, 'rpc') && Boolean(getEffectiveRpcUrl(chain, network));
}

// Server-side cap on the number of assets accepted in a single POST /assets body
// (nexus-ton-provider: prices.AssetsDetailsMax = 200). Sending more used to fail the whole
// tryUpdateTokens cycle with `too many assets requested, limit is 200`, so prices stopped
// refreshing for the entire list. We now chunk the request instead.
const POST_TOKENS_CHUNK_SIZE = 200;

let onUpdate: OnApiUpdate;
let stopCommonBackendPolling: NoneToVoidFunction | undefined;
let stopActiveAccountPolling: NoneToVoidFunction | undefined;
const inactiveAccountPolling = createInactiveAccountsPollingManager();
const setUpdatingStatus = createUpdatingStatusManager();

/** Last timestamps passed into `setActivePollingAccount` — reused when restarting after network edits. */
let lastActivePollingTimestamps: ApiActivityTimestamps = {};
let lastActivePollingAccountId: string | undefined;

export function getLastActivePollingTimestamps(accountId: string): ApiActivityTimestamps {
  if (accountId !== lastActivePollingAccountId) return {};
  return lastActivePollingTimestamps;
}

export function initPolling(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;

  void loadTokensCache();

  void Promise.allSettled([
    // The swap token list comes from DeDust, so it doesn't need our backend
    ...(NO_SWAP ? [] : [tryUpdateSwapTokens()]),
    tryUpdateTokens(),
    tryUpdateCurrencyRates(),
    ...(NO_BACKEND ? [] : [tryUpdateKnownAddresses()]),
  ]).then(() => resolveDataPreloadPromise());

  stopCommonBackendPolling?.();

  if (!NO_BACKEND) {
    void tryUpdateConfig();
  }

  stopCommonBackendPolling = setupCommonBackendPolling();
}

export async function destroyPolling() {
  stopCommonBackendPolling?.();
  stopCommonBackendPolling = undefined;
  clearCollectiblesPolling();
  removeAllPollingAccounts();
  await setActivePollingAccount(undefined, {});
}

function setupCommonBackendPolling() {
  const stopFns = [
    pollingLoop({
      period: BACKEND_INTERVAL,
      skipInitialPoll: true,
      poll: tryUpdateCurrencyRates,
    }).stop,
    pollingLoop({
      period: LONG_BACKEND_INTERVAL,
      skipInitialPoll: true,
      async poll() {
        await Promise.all([
          tryUpdateTokens(),
          ...(NO_BACKEND ? [] : [tryUpdateKnownAddresses(), tryUpdateConfig()]),
          !NO_SWAP && tryUpdateSwapTokens(),
        ]);
      },
    }).stop,
  ];

  return () => {
    for (const stopFn of stopFns) {
      stopFn();
    }
  };
}

async function tryUpdateTokens() {
  try {
    const tokens = await callBackendGet<ApiTokenWithPrice[]>('/assets');

    for (const token of tokens) {
      token.isFromBackend = true;
    }

    await tokensPreload.promise;
    const tokensCache = getTokensCache();

    const backendReturnedSlugs = new Set(tokens.map((t) => t.slug));
    const nonBackendTokenAddresses = Object.values(tokensCache.bySlug).reduce((result, token) => {
      // Retrieve details for tokens that are not returned by /assets anymore
      // (i.e. rug pulled and therefore disabled on the backend)
      if ((!token.isFromBackend || !backendReturnedSlugs.has(token.slug)) && token.tokenAddress) {
        result.push(token.tokenAddress);
      }
      return result;
    }, [] as string[]);

    // POST is used to retrieve data due to the potentially large number of addresses.
    // Chunked to POST_TOKENS_CHUNK_SIZE because the server rejects bodies over that limit
    // outright (see the constant); doing it sequentially keeps the per-IP rate budget calm.
    let nonBackendTokenDetails: ApiTokenDetails[] | undefined;
    if (nonBackendTokenAddresses.length) {
      nonBackendTokenDetails = [];
      for (const chunk of split(nonBackendTokenAddresses, POST_TOKENS_CHUNK_SIZE)) {
        const chunkDetails = await callBackendPost<ApiTokenDetails[]>('/assets', { assets: chunk });
        nonBackendTokenDetails.push(...chunkDetails);
      }
    }

    await updateTokens(tokens, () => sendUpdateTokens(onUpdate), nonBackendTokenDetails, true);
  } catch (err) {
    logDebugError('tryUpdateTokens', err);
  }
}

async function tryUpdateCurrencyRates() {
  try {
    const currencyRates = await callBackendGet<{ rates: ApiCurrencyRates }>('/currency-rates');
    onUpdate({
      type: 'updateCurrencyRates',
      rates: currencyRates.rates,
    });
  } catch (err) {
    logDebugError('tryUpdateCurrencyRates', err);
  }
}

async function tryUpdateSwapTokens() {
  try {
    const assets = await swapGetAssets();

    await tokensPreload.promise;

    // FIXME: TON renaming
    const tokens = assets.reduce((acc: Record<string, ApiSwapAsset>, asset) => {
      acc[asset.slug] = {
        // Fix legacy variable names
        ...omit(asset as any, ['blockchain']) as ApiSwapAsset,
        chain: 'blockchain' in asset ? asset.blockchain as string : asset.chain,
        tokenAddress: 'contract' in asset && asset.contract !== 'TON'
          ? asset.contract as string
          : asset.tokenAddress,
      };
      return acc;
    }, {});

    onUpdate({
      type: 'updateSwapTokens',
      tokens,
    });
  } catch (err) {
    logDebugError('tryUpdateSwapTokens', err);
  }
}

export async function tryUpdateConfig() {
  try {
    const config = await callBackendGet<ApiBackendConfig>('/utils/get-config');
    setBackendConfigCache(config);

    const {
      isLimited,
      isCopyStorageEnabled = false,
      supportAccountsCount = 1,
      now: serverUtc,
      swapVersion,
      isUpdateRequired: isAppUpdateRequired,
      knowledgeBaseVersion,
    } = config;

    onUpdate({
      type: 'updateConfig',
      isLimited,
      isCopyStorageEnabled,
      supportAccountsCount,
      isAppUpdateRequired,
      swapVersion,
      knowledgeBaseVersion,
    });

    const localUtc = (new Date()).getTime();
    if (Math.abs(serverUtc - localUtc) > INCORRECT_TIME_DIFF) {
      onUpdate({
        type: 'incorrectTime',
      });
    }
  } catch (err) {
    logDebugError('tryUpdateConfig', err);
  }
}

/** Call it every time the active account changes */
export async function setActivePollingAccount(
  accountId: string | undefined,
  newestActivityTimestamps: ApiActivityTimestamps,
  shouldResetBalances?: boolean,
) {
  stopActiveAccountPolling?.();
  stopActiveAccountPolling = undefined;
  retargetCollectiblesPollingAccount(accountId);

  if (accountId) {
    lastActivePollingAccountId = accountId;
    lastActivePollingTimestamps = newestActivityTimestamps;

    const account = await fetchStoredAccount(accountId);
    const { network } = parseAccountId(accountId);
    const visibleChains = (await Promise.all(
      (Object.keys(account.byChain) as ApiChain[]).map(async (apiChain) => {
        if (!findChainConfig(apiChain) || !chains[apiChain]) return undefined;
        if (!doesAccountHaveChain(account, apiChain)) return undefined;
        if (!isChainRpcConfigured(apiChain, network)) return undefined;
        const hidden = await isChainHidden(apiChain, network, accountId);
        return hidden ? undefined : apiChain;
      }),
    )).filter((chain): chain is ApiChain => Boolean(chain));

    // Each visible chain is an independent module: start them together. Hidden
    // chains are already filtered out above, so there is no reason to stagger.
    const stopPollingFns: Array<NoneToVoidFunction | undefined> = [
      NO_BACKEND ? undefined : setupAccountConfigPolling(accountId, account).stop,
      !NO_MFA && doesAccountHaveChain(account, 'ton') ? setupMfaPolling(accountId).stop : undefined,
      ...visibleChains.map((chain) => chains[chain].setupActivePolling(
        accountId,
        account as any,
        onUpdate,
        setUpdatingStatus.bind(undefined, accountId, chain),
        pickChainTimestamps(newestActivityTimestamps, chain),
        shouldResetBalances,
      )),
    ];

    stopActiveAccountPolling = () => {
      for (const stopFn of stopPollingFns) {
        stopFn?.();
      }
    };
  } else {
    lastActivePollingAccountId = undefined;
    lastActivePollingTimestamps = {};
  }

  // Setting up inactive account polling at the end in order to give the active account polling a higher priority in the connection queue
  inactiveAccountPolling?.setActiveAccount(accountId);
}

/** Call it every time a new account is created */
export function addPollingAccount(accountId: string, account: ApiAccountAny) {
  inactiveAccountPolling?.addAccount(accountId, account);
}

/** Call it every time an account is removed (except for cases in the other remove...account functions) */
export function removePollingAccount(accountId: string) {
  inactiveAccountPolling?.removeAccount(accountId);
}

/** Call it every time all accounts of a network are removed */
export function removeNetworkPollingAccounts(network: ApiNetwork) {
  inactiveAccountPolling?.removeNetworkAccounts(network);
}

/** Call it every time all accounts are removed */
export function removeAllPollingAccounts() {
  inactiveAccountPolling?.removeAllAccounts();
}

function setupAccountConfigPolling(accountId: string, account: ApiAccountAny) {
  let lastResult: ApiAccountConfig | undefined;

  // The endpoint reads the account type and the chain addresses only, while `authToken` is a bearer credential for
  // our own API - it has no business riding a polling loop's request body once a swap has put it on the wallet.
  const { byChain } = account;
  const partialAccount = {
    ...omit(account as ApiAccountWithMnemonic, ['mnemonicEncrypted']),
    ...(byChain.ton && { byChain: { ...byChain, ton: omit(byChain.ton, ['authToken']) } }),
  };

  return pollingLoop({
    period: ACCOUNT_CONFIG_INTERVAL,
    async poll() {
      try {
        const langCode = await storage.getItem('langCode');
        const accountConfig = await callBackendPost<ApiAccountConfig>('/account-config', {
          ...partialAccount,
          langCode,
        });

        if (!areDeepEqual(accountConfig, lastResult)) {
          lastResult = accountConfig;
          onUpdate({
            type: 'updateAccountConfig',
            accountId,
            accountConfig,
          });
        }
      } catch (err) {
        logDebugError('setupBackendAccountPolling', err);
      }
    },
  });
}

function setupMfaPolling(accountId: string) {
  return pollingLoop({
    period: MFA_INTERVAL,
    async poll() {
      try {
        await refreshMfaStateAndNotify(accountId);
      } catch (err) {
        logDebugError('setupMfaPolling', err);
      }
    },
  });
}

/**
 * Returns a stateful function that receives updating statuses from multiple chains and merges them together into a
 * single set of consistent 'updatingStatus' events for the UI.
 */
function createUpdatingStatusManager() {
  const updatingStatuses = new Map<string, OrGate<ApiChain>>();

  return (accountId: string, chain: ApiChain, kind: ApiUpdatingStatus['kind'], isUpdating: boolean) => {
    const key = `${accountId} ${kind}`;
    let chainsBeingUpdated = updatingStatuses.get(key);
    if (!chainsBeingUpdated) {
      chainsBeingUpdated = new OrGate<ApiChain>((isUpdating) => {
        onUpdate({ type: 'updatingStatus', kind, accountId, isUpdating });
      });
      updatingStatuses.set(key, chainsBeingUpdated);
    }

    chainsBeingUpdated.toggle(chain, isUpdating);
  };
}

/**
 * Manages polling for the inactive accounts.
 * The goal is polling the accounts from the network of the current active account, but not the active account itself.
 *
 * Inactive polling is deferred and staggered so the current wallet's first wave is not starved.
 * Built-in EVM without an enhanced indexer is skipped for inactive wallets (RPC eth_getBalance ×
 * 8 chains × N accounts is the main first-launch flood); those balances load when the account becomes active.
 *
 * @todo: Deduplicate polling the same addresses, if multiple accounts have it
 */
function createInactiveAccountsPollingManager() {
  const stopByAccount: Record<string, NoneToVoidFunction> = {};
  let activeAccountId: string | undefined;

  async function setActiveAccount(accountId: string | undefined) {
    if (accountId === activeAccountId) {
      return;
    }

    if (accountId === undefined) {
      stopAllPollings();
      return;
    }

    if (!activeAccountId || parseAccountId(accountId).network !== parseAccountId(activeAccountId).network) {
      switchNetwork(accountId);
      return;
    }

    const previousActiveAccountId = activeAccountId;
    activeAccountId = accountId;

    // Stop polling the now active account
    stopByAccount[activeAccountId]?.();
    delete stopByAccount[activeAccountId];

    // Start polling the previous active account
    const previousActiveAccount = await fetchMaybeStoredAccount(previousActiveAccountId);
    if (previousActiveAccount) { // The previously active account may get removed at this moment
      await startAccountPolling(previousActiveAccountId, previousActiveAccount);
    }
  }

  function addAccount(accountId: string, account: ApiAccountAny) {
    const isActiveAccount = accountId === activeAccountId;
    const isCurrentNetwork = activeAccountId
      && parseAccountId(accountId).network === parseAccountId(activeAccountId).network;

    if (!isActiveAccount && isCurrentNetwork) {
      void startAccountPolling(accountId, account);
    }
  }

  function removeAccount(accountId: string) {
    stopByAccount[accountId]?.();
    delete stopByAccount[accountId];
  }

  function removeNetworkAccounts(network: ApiNetwork) {
    if (activeAccountId && parseAccountId(activeAccountId).network === network) {
      // Inactive account polling must poll only the network of the active account, so removing the network means removing all account
      stopAllPollings();
    }
  }

  function removeAllAccounts() {
    stopAllPollings();
  }

  function switchNetwork(newActiveAccountId: string) {
    stopAllPollings();
    activeAccountId = newActiveAccountId;
    // Inactive multi-account polling stays off on network switch (avoids N×M RPC storms).
    // Other wallets refresh when they become the active account.
  }

  async function startAccountPolling(accountId: string, account: ApiAccountAny) {
    if (stopByAccount[accountId]) return;
    const { network } = parseAccountId(accountId);
    const visibleChains = await Promise.all(
      (Object.keys(account.byChain) as ApiChain[]).map(async (apiChain) => {
        if (!findChainConfig(apiChain) || !chains[apiChain]) return undefined;
        if (!doesAccountHaveChain(account, apiChain)) return undefined;
        if (!isChainRpcConfigured(apiChain, network)) return undefined;
        // Skip public-RPC EVM for inactive wallets — biggest N×8 amplification with empty indexer.
        if (isEvmChain(apiChain) && !isEvmEnhancedApiEnabled(apiChain, network)) {
          return undefined;
        }
        // Solana without indexer still hits RPC; skip for inactive wallets.
        if (apiChain === 'solana') {
          return undefined;
        }
        const hidden = await isChainHidden(apiChain, network, accountId);
        return hidden ? undefined : apiChain;
      }),
    );

    // Prefer not polling inactive accounts at all (see switchNetwork). Kept for the
    // account-switch path that re-polls the previous active wallet lightly (TON only).
    const tonOnly = visibleChains.filter((chain) => chain === 'ton');

    const stopFns = [
      !NO_MFA && doesAccountHaveChain(account, 'ton') ? setupMfaPolling(accountId).stop : undefined,
      ...tonOnly.map((chain) => {
        if (!chain) return undefined;
        return chains[chain].setupInactivePolling(accountId, account as any, onUpdate);
      }),
    ];

    stopByAccount[accountId] = () => {
      for (const stopChain of stopFns) {
        stopChain?.();
      }
    };
  }

  function stopAllPollings() {
    for (const [accountId, stopAccountPolling] of Object.entries(stopByAccount)) {
      stopAccountPolling();
      delete stopByAccount[accountId];
    }
  }

  const preventRaceCondition = forbidConcurrency as
    <Args extends unknown[]>(task: (...args: Args) => unknown) => (...args: Args) => void;

  return {
    setActiveAccount: preventRaceCondition(setActiveAccount),
    addAccount: preventRaceCondition(addAccount),
    removeAccount: preventRaceCondition(removeAccount),
    removeNetworkAccounts: preventRaceCondition(removeNetworkAccounts),
    removeAllAccounts: preventRaceCondition(removeAllAccounts),
  };
}

function pickChainTimestamps(bySlug: ApiActivityTimestamps, chain: ApiChain) {
  const { slug: nativeSlug } = getNativeToken(chain);
  return Object.entries(bySlug).reduce((newBySlug, [slug, timestamp]) => {
    if (slug === nativeSlug || slug.startsWith(`${chain}-`)) {
      newBySlug[slug] = timestamp;
    }
    return newBySlug;
  }, {} as ApiActivityTimestamps);
}
