export type MfaWalletApp = 'twalletgram' | 'twallet';

type MfaStartParam = {
  id?: string;
  requestId?: string;
  isInstall: boolean;
  walletApp: MfaWalletApp;
};

export function parseMfaStartParam(startParam?: string): MfaStartParam {
  const { id, walletApp } = parseWalletPrefix(startParam);
  const isInstall = id?.startsWith('i-') ?? false;

  return {
    id,
    requestId: isInstall ? id?.slice(2) : id,
    isInstall,
    walletApp,
  };
}

export function getMfaWalletAppInfo(walletApp: MfaWalletApp) {
  return walletApp === 'twalletgram'
    ? { name: 'tWallet Gram', deeplink: 'https://go.gramwallet.io' }
    : { name: 'tWallet', deeplink: 'twallet://' };
}

function parseWalletPrefix(startParam?: string): Pick<MfaStartParam, 'id' | 'walletApp'> {
  if (startParam?.startsWith('g_')) {
    return { id: startParam.slice(2), walletApp: 'twalletgram' };
  }

  if (startParam?.startsWith('m_')) {
    return { id: startParam.slice(2), walletApp: 'twallet' };
  }

  return { walletApp: 'twallet' };
}
