import type { GlobalState } from '../../types';
import {
  AppState,
  AuthState,
  ContentTab,
  SettingsState,
  TransactionInfoState,
} from '../../types';

import {
  ANIMATION_LEVEL_MIN,
  APP_VERSION,
  DEBUG,
} from '../../../config';
import { getDoesUsePinPad } from '../../../util/biometrics';
import {
  openDeeplinkOrUrl,
  processDeeplink,
} from '../../../util/deeplink';
import getIsAppUpdateNeeded from '../../../util/getIsAppUpdateNeeded';
import { vibrate, vibrateOnSuccess } from '../../../util/haptics';
import { getTranslation } from '../../../util/langProvider';
import { logDebugError } from '../../../util/logs';
import { getTelegramApp } from '../../../util/telegram';
import {
  getIsMobileTelegramApp,
  IS_BIOMETRIC_AUTH_SUPPORTED,
  IS_ELECTRON,
} from '../../../util/windowEnvironment';
import { callApi } from '../../../api';
import { closeAllOverlays, parsePlainAddressQr } from '../../helpers/misc';
import { addActionHandler, getGlobal, setGlobal } from '../../index';
import {
  clearCurrentSwap,
  clearCurrentTransfer,
  clearIsPinAccepted,
  openSection,
  renameAccount,
  setIsPinAccepted,
  updateAccount,
  updateAccounts,
  updateAuth,
  updateCurrentAccountState,
  updateCurrentTransactionInfo,
  updateSettings,
} from '../../reducers';
import {
  selectAccount,
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectCurrentNetwork,
  selectIsPasswordPresent,
} from '../../selectors';
import { switchAccount } from '../api/auth';

import { closeModal } from '../../../components/ui/Modal';

const APP_VERSION_URL = 'version.txt';

addActionHandler('showActivityInfo', (global, actions, { id }) => {
  return updateCurrentAccountState(global, { currentActivityId: id });
});

addActionHandler('closeActivityInfo', (global, actions, { id }) => {
  if (selectCurrentAccountState(global)?.currentActivityId !== id) {
    return undefined;
  }

  return updateCurrentAccountState(global, { currentActivityId: undefined });
});

addActionHandler('openTransactionInfo', async (global, actions, payload) => {
  const chain = payload.chain;
  const isTxId = 'txId' in payload;
  const txId = isTxId ? payload.txId : payload.txHash;
  let activities = payload.activities;

  const account = selectCurrentAccount(getGlobal());
  if (!account) {
    const isTooEarly = (getGlobal() as AnyLiteral).isInited === false;
    logDebugError('openTransactionInfo', 'Account not found', isTooEarly);
    setGlobal(updateCurrentTransactionInfo(getGlobal(), {
      state: TransactionInfoState.None,
      error: 'Unexpected error',
    }));
    actions.showError({ error: 'Unexpected error' });
    return;
  }

  const chainAccount = account.byChain[chain];
  const walletAddress = chainAccount?.address ?? '';

  const network = selectCurrentNetwork(getGlobal());

  const options = isTxId ? { chain, network, txId, walletAddress } : { chain, network, txHash: txId, walletAddress };

  if (!activities) {
    setGlobal(updateCurrentTransactionInfo(getGlobal(), {
      state: TransactionInfoState.Loading,
      txId,
      chain,
    }));

    activities = await callApi('fetchTransactionById', options);
  }

  if (!activities || activities.length === 0) {
    setGlobal(updateCurrentTransactionInfo(getGlobal(), {
      state: TransactionInfoState.None,
      error: '$transaction_not_found',
    }));
    actions.showError({ error: '$transaction_not_found' });
    return;
  }

  // If single activity, show detail directly; otherwise show list
  const nextState = activities.length === 1
    ? TransactionInfoState.ActivityDetail
    : TransactionInfoState.ActivityList;

  setGlobal(updateCurrentTransactionInfo(getGlobal(), {
    state: nextState,
    txId,
    chain,
    activities,
    selectedActivityIndex: activities.length === 1 ? 0 : undefined,
  }));
});

addActionHandler('closeTransactionInfo', (global) => {
  return {
    ...global,
    currentTransactionInfo: {
      state: TransactionInfoState.None,
    },
  };
});

addActionHandler('selectTransactionInfoActivity', (global, actions, { index }) => {
  if (global.currentTransactionInfo.state === TransactionInfoState.None) {
    return undefined;
  }

  // If index is -1, go back to list view
  if (index < 0) {
    return {
      ...global,
      currentTransactionInfo: {
        ...global.currentTransactionInfo,
        state: TransactionInfoState.ActivityList,
        selectedActivityIndex: undefined,
      },
    };
  }

  return {
    ...global,
    currentTransactionInfo: {
      ...global.currentTransactionInfo,
      state: TransactionInfoState.ActivityDetail,
      selectedActivityIndex: index,
    },
  };
});

addActionHandler('addSavedAddress', (global, actions, { address, name, chain }) => {
  const { savedAddresses = [] } = selectCurrentAccountState(global) || {};

  const isAlreadySaved = savedAddresses.some((item) => item.address === address && item.chain === chain);
  if (isAlreadySaved) return;

  return updateCurrentAccountState(global, {
    savedAddresses: [
      ...savedAddresses,
      { address, name, chain },
    ],
  });
});

addActionHandler('removeFromSavedAddress', (global, actions, { address, chain }) => {
  const { savedAddresses = [] } = selectCurrentAccountState(global) || {};

  const newSavedAddresses = savedAddresses.filter((item) => !(item.address === address && item.chain === chain));

  return updateCurrentAccountState(global, { savedAddresses: newSavedAddresses });
});

addActionHandler('toggleTinyTransfersHidden', (global, actions, { isEnabled } = {}) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      areTinyTransfersHidden: isEnabled,
    },
  };
});

addActionHandler('setCurrentTokenPeriod', (global, actions, { period }) => {
  return updateCurrentAccountState(global, {
    currentTokenPeriod: period,
  });
});

addActionHandler('addAccount', async (global, actions, { method, password, isAuthFlow }) => {
  const isPasswordPresent = selectIsPasswordPresent(global);
  const isMnemonicImport = method === 'importMnemonic';

  if (isPasswordPresent) {
    if (!isAuthFlow) {
      global = updateAccounts(global, {
        isLoading: true,
      });
      setGlobal(global);
    }

    if (!(await callApi('verifyPassword', password))) {
      global = getGlobal();
      const error = getDoesUsePinPad() ? 'Wrong passcode, please try again.' : 'Wrong password, please try again.';
      if (isAuthFlow) {
        global = updateAuth(global, {
          isLoading: undefined,
          error,
        });
      } else {
        global = updateAccounts(getGlobal(), {
          isLoading: undefined,
          error,
        });
      }
      setGlobal(global);
      return;
    }

    if (getDoesUsePinPad()) {
      global = setIsPinAccepted(getGlobal());
      setGlobal(global);
    }
    await vibrateOnSuccess(true);
  }

  global = getGlobal();
  if (isMnemonicImport || !isPasswordPresent) {
    global = { ...global, isAccountSelectorOpen: undefined };
  } else {
    global = updateAccounts(global, { isLoading: true });
  }
  setGlobal(global);

  actions.addAccount2({ method, password });
});

addActionHandler('addAccount2', (global, actions, { method, password }) => {
  const isMnemonicImport = method === 'importMnemonic';
  const isPasswordPresent = selectIsPasswordPresent(global);
  const authState = isPasswordPresent
    ? isMnemonicImport
      ? AuthState.importWallet
      : undefined
    : (
      getDoesUsePinPad()
        ? AuthState.createPin
        : (IS_BIOMETRIC_AUTH_SUPPORTED ? AuthState.createBiometrics : AuthState.createPassword)
    );

  if (isMnemonicImport || !isPasswordPresent) {
    global = { ...global, appState: AppState.Auth };
  }
  global = updateAuth(global, { password, state: authState });
  global = clearCurrentTransfer(global);
  global = clearCurrentSwap(global);

  setGlobal(global);

  if (isMnemonicImport) {
    actions.startImportingWallet();
  } else {
    actions.startCreatingWallet();
  }
});

addActionHandler('renameAccount', (global, actions, { accountId, title }) => {
  setGlobal(renameAccount(global, accountId, title));
});

addActionHandler('setAccountProfile', async (global, actions, { accountId, profile }) => {
  const account = selectAccount(global, accountId);
  if (!account) return;

  const byChain = profile === 'vault' && account.byChain.ton
    ? { ton: account.byChain.ton }
    : account.byChain;

  global = updateAccount(global, accountId, { profile, byChain });
  setGlobal(global);

  await callApi('setAccountVaultProfile', accountId, profile === 'vault');
});

addActionHandler('setPendingAccountProfile', (global, _, payload) => {
  return updateAuth(global, {
    pendingAccountProfile: payload?.profile,
    forceAddingTonOnlyAccount: payload?.profile === 'vault' ? true : undefined,
  });
});

addActionHandler('clearAccountError', (global) => {
  return updateAccounts(global, { error: undefined });
});

addActionHandler('openAddAccountModal', (global, _, props) => {
  const {
    forceAddingTonOnlyAccount,
    pendingAccountProfile,
    initialState,
    shouldHideBackButton,
  } = props || {};

  global = { ...global, isAccountSelectorOpen: true };

  if (
    forceAddingTonOnlyAccount
    || pendingAccountProfile
    || initialState !== undefined
    || shouldHideBackButton
  ) {
    global = updateAuth(global, {
      forceAddingTonOnlyAccount: forceAddingTonOnlyAccount || pendingAccountProfile === 'vault',
      pendingAccountProfile,
      initialAddAccountState: initialState,
      shouldHideAddAccountBackButton: shouldHideBackButton,
    });
  }

  setGlobal(global);
});

addActionHandler('closeAddAccountModal', (global, _, props) => {
  if (getDoesUsePinPad()) {
    global = clearIsPinAccepted(global);
  }

  global = updateAuth(global, {
    forceAddingTonOnlyAccount: undefined,
    pendingAccountProfile: undefined,
    initialAddAccountState: undefined,
    shouldHideAddAccountBackButton: undefined,
  });
  global = { ...global, isAccountSelectorOpen: undefined };

  return global;
});

addActionHandler('changeNetwork', (global, actions, { network }) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      isTestnet: network === 'testnet',
    },
  };
});

addActionHandler('openSettings', (global) => {
  global = updateSettings(global, { state: SettingsState.Initial });

  return openSection(global, 'settings');
});

addActionHandler('openSettingsWithState', (global, actions, { state }) => {
  global = updateSettings(global, { state });
  setGlobal(openSection(global, 'settings'));
});

addActionHandler('setSettingsState', (global, actions, { state }) => {
  global = updateSettings(global, { state });
  setGlobal(global);
});

addActionHandler('closeSettings', (global) => {
  if (!selectCurrentAccountId(global)) {
    return global;
  }

  global = updateSettings(global, { state: SettingsState.Initial });
  return { ...global, areSettingsOpen: false };
});

addActionHandler('openBackupWalletModal', (global) => {
  return { ...global, isBackupWalletModalOpen: true };
});

addActionHandler('closeBackupWalletModal', (global) => {
  return { ...global, isBackupWalletModalOpen: undefined };
});

addActionHandler('changeLanguage', (global, actions, { langCode }) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      langCode,
      langSource: 'user',
    },
  };
});

addActionHandler('setSelectedExplorerId', (global, actions, { chain, explorerId }) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      selectedExplorerIds: {
        ...global.settings.selectedExplorerIds,
        [chain]: explorerId,
      },
    },
  };
});

addActionHandler('toggleCanPlaySounds', (global, actions, { isEnabled } = {}) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      canPlaySounds: isEnabled,
    },
  };
});

addActionHandler('closeSecurityWarning', (global) => {
  return {
    ...global,
    settings: {
      ...global.settings,
      isSecurityWarningHidden: true,
    },
  };
});

addActionHandler('checkAppVersion', (global) => {
  fetch(`${APP_VERSION_URL}?${Date.now()}`)
    .then((response) => response.text())
    .then((version) => {
      version = version.trim();

      if (getIsAppUpdateNeeded(version, APP_VERSION)) {
        global = getGlobal();
        global = {
          ...global,
          isAppUpdateAvailable: true,
          latestAppVersion: version.trim(),
        };
        setGlobal(global);
      }
    })
    .catch((err) => {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error('[checkAppVersion failed] ', err);
      }
    });
});

addActionHandler('requestConfetti', (global) => {
  if (global.settings.animationLevel === ANIMATION_LEVEL_MIN) return global;

  return {
    ...global,
    confettiRequestedAt: Date.now(),
  };
});

addActionHandler('requestOpenQrScanner', (global, actions) => {
  if (getIsMobileTelegramApp()) {
    const webApp = getTelegramApp();
    webApp?.showScanQrPopup({}, (data) => {
      void vibrateOnSuccess();
      webApp.closeScanQrPopup();
      actions.handleQrCode({ data });
    });
  }
});

addActionHandler('handleQrCode', async (global, actions, { data }) => {
  if (await processDeeplink(data)) {
    return;
  }

  global = getGlobal();

  const plainAddressData = parsePlainAddressQr(global, data);
  if (plainAddressData) {
    actions.startTransfer({
      ...plainAddressData,
    });
    return;
  }

  actions.showDialog({ title: 'This QR Code is not supported', message: '' });
});

addActionHandler('changeBaseCurrency', (global, actions, { currency }) => {
  global = updateSettings(global, {
    baseCurrency: currency,
  });
  setGlobal(global);
});

addActionHandler('setIsPinAccepted', (global) => {
  return setIsPinAccepted(global);
});

addActionHandler('clearIsPinAccepted', (global) => {
  return clearIsPinAccepted(global);
});

addActionHandler('openMediaViewer', (global, actions, {
  mediaId, mediaType, txId, hiddenNfts, noGhostAnimation,
}) => {
  const accountState = selectCurrentAccountState(global);
  const { byAddress } = accountState?.nfts || {};
  const nft = byAddress?.[mediaId];

  if (!nft) return undefined;

  return {
    ...global,
    mediaViewer: {
      mediaId,
      mediaType,
      txId,
      hiddenNfts,
      noGhostAnimation,
    },
  };
});

addActionHandler('closeMediaViewer', (global) => {
  return {
    ...global,
    mediaViewer: {
      mediaId: undefined,
      mediaType: undefined,
    },
  };
});

addActionHandler('setReceiveActiveTab', (global, actions, { chain }): GlobalState => {
  return updateCurrentAccountState(global, { receiveModalChain: chain });
});

addActionHandler('openReceiveModal', (global, actions, params) => {
  global = updateCurrentAccountState(global, { receiveModalChain: params?.chain });
  global = { ...global, isReceiveModalOpen: true };
  setGlobal(global);
});

addActionHandler('closeReceiveModal', (global): GlobalState => {
  return { ...global, isReceiveModalOpen: undefined };
});

addActionHandler('openInvoiceModal', (global, actions, params) => {
  global = updateCurrentAccountState(global, { invoiceTokenSlug: params?.tokenSlug });
  setGlobal({ ...global, isInvoiceModalOpen: true });
});

addActionHandler('changeInvoiceToken', (global, actions, params) => {
  global = updateCurrentAccountState(global, { invoiceTokenSlug: params.tokenSlug });
  setGlobal(global);
});

addActionHandler('closeInvoiceModal', (global): GlobalState => {
  global = updateCurrentAccountState(global, { invoiceTokenSlug: undefined });
  return { ...global, isInvoiceModalOpen: undefined };
});

addActionHandler('showIncorrectTimeError', (global, actions) => {
  actions.showDialog({
    message: getTranslation('Time synchronization issue. Please ensure your device\'s time settings are correct.'),
  });

  return { ...global, isIncorrectTimeNotificationReceived: true };
});

addActionHandler('openLoadingOverlay', (global) => {
  setGlobal({ ...global, isLoadingOverlayOpen: true });
});

addActionHandler('closeLoadingOverlay', (global) => {
  setGlobal({ ...global, isLoadingOverlayOpen: undefined });
});

addActionHandler('clearAccountLoading', (global) => {
  setGlobal(updateAccounts(global, { isLoading: undefined }));
});

addActionHandler('setIsAccountLoading', (global, actions, { isLoading }) => {
  setGlobal(updateAccounts(global, { isLoading }));
});

addActionHandler('closeAnyModal', () => {
  closeModal();
});

addActionHandler('openExplore', (global) => {
  return openSection(global, 'explore');
});

addActionHandler('closeExplore', (global) => {
  return { ...global, isExploreOpen: undefined };
});

addActionHandler('openPortfolio', (global, actions, payload) => {
  return { ...openSection(global, 'portfolio'), portfolioReturnTo: payload?.returnTo };
});

addActionHandler('closePortfolio', (global, actions) => {
  const { portfolioReturnTo } = global;

  if (portfolioReturnTo === 'settings') {
    actions.openSettings();
  }

  const nextGlobal = { ...global, isPortfolioOpen: undefined, portfolioReturnTo: undefined };

  // `switchToPortfolio` parks the landscape content tab on `Portfolio`; restore a real tab on close
  // so the content area isn't left frozen, and the persisted value doesn't get stuck
  if (selectCurrentAccountState(nextGlobal)?.activeContentTab === ContentTab.Portfolio) {
    return updateCurrentAccountState(nextGlobal, { activeContentTab: ContentTab.Assets });
  }

  return nextGlobal;
});

addActionHandler('openFullscreen', (global) => {
  setGlobal({ ...global, isFullscreen: true });

  vibrate();
});

addActionHandler('closeFullscreen', (global) => {
  setGlobal({ ...global, isFullscreen: undefined });

  vibrate();
});

addActionHandler('setIsSensitiveDataHidden', (global, actions, { isHidden }) => {
  setGlobal(updateSettings(global, { isSensitiveDataHidden: isHidden ? true : undefined }));

  vibrate();
});

addActionHandler('setIsAppLockActive', (global, actions, { isActive }) => {
  setGlobal({ ...global, isAppLockActive: isActive || undefined });
});

addActionHandler('switchAccountAndOpenUrl', async (global, actions, payload) => {
  await Promise.all([
    // The browser is closed before opening the new URL, because otherwise the browser won't apply the new
    // parameters from `payload`
    closeAllOverlays(),
    payload.accountId && switchAccount(global, payload.accountId, payload.network),
  ]);

  await openDeeplinkOrUrl(payload.url, payload);
});

addActionHandler('switchToWallet', (global: GlobalState, actions) => {
  const {
    areSettingsOpen, isExploreOpen, isPortfolioOpen,
  } = global;
  const accountState = selectCurrentAccountState(global);
  const areAssetsActive = accountState?.activeContentTab === ContentTab.Assets;
  const isWalletTabActive = !isExploreOpen && !areSettingsOpen && !isPortfolioOpen;

  setGlobal({ ...global, portfolioReturnTo: undefined });

  actions.closeExplore(undefined, { forceOnHeavyAnimation: true });
  actions.closeSettings(undefined, { forceOnHeavyAnimation: true });
  actions.closePortfolio(undefined, { forceOnHeavyAnimation: true });

  if (!areAssetsActive && isWalletTabActive) {
    actions.selectToken({ slug: undefined }, { forceOnHeavyAnimation: true });
    actions.setActiveContentTab({ tab: ContentTab.Assets }, { forceOnHeavyAnimation: true });
  }
});

addActionHandler('switchToExplore', (global: GlobalState, actions) => {
  const { isExploreOpen } = global;

  if (isExploreOpen) {
    actions.closeSiteCategory(undefined, { forceOnHeavyAnimation: true });
  }

  setGlobal({ ...global, portfolioReturnTo: undefined });

  actions.closeSettings(undefined, { forceOnHeavyAnimation: true });
  actions.closePortfolio(undefined, { forceOnHeavyAnimation: true });
  actions.openExplore(undefined, { forceOnHeavyAnimation: true });
});

addActionHandler('switchToSettings', (global: GlobalState, actions) => {
  actions.closeExplore(undefined, { forceOnHeavyAnimation: true });
  actions.closePortfolio(undefined, { forceOnHeavyAnimation: true });
  actions.openSettings(undefined, { forceOnHeavyAnimation: true });
});

addActionHandler('switchToPortfolio', (global: GlobalState, actions) => {
  const { isPortfolioOpen } = global;

  if (isPortfolioOpen) return;

  actions.closeExplore(undefined, { forceOnHeavyAnimation: true });
  actions.closeSettings(undefined, { forceOnHeavyAnimation: true });
  actions.openPortfolio(undefined, { forceOnHeavyAnimation: true });
  actions.setActiveContentTab({ tab: ContentTab.Portfolio }, { forceOnHeavyAnimation: true });
});

addActionHandler('setAppLayout', (global, actions, { layout }) => {
  if (IS_ELECTRON) {
    void window.electron?.changeAppLayout(layout);
  } else {
    void callApi('setAppLayout', layout);
  }
});
