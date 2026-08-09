export type MfaWalletApp = 'twallet';

type MfaStartParam = {
  id?: string;
  requestId?: string;
  isInstall: boolean;
  walletApp: MfaWalletApp;
};

export function parseMfaStartParam(startParam?: string): MfaStartParam {
  const { id } = parseWalletPrefix(startParam);
  const isInstall = id?.startsWith('i-') ?? false;

  return {
    id,
    requestId: isInstall ? id?.slice(2) : id,
    isInstall,
    walletApp: 'twallet',
  };
}

export function getMfaWalletAppInfo(_walletApp: MfaWalletApp) {
  return { name: 'TWallet', deeplink: 'twallet://' };
}

function parseWalletPrefix(startParam?: string): Pick<MfaStartParam, 'id'> {
  // Accept legacy Gram (`g_`) and TWallet (`m_`) prefixes; both resolve to TWallet.
  if (startParam?.startsWith('g_') || startParam?.startsWith('m_')) {
    return { id: startParam.slice(2) };
  }

  return {};
}
