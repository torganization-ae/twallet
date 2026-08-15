import React, { memo } from '../../../../lib/teact/teact';
import { withGlobal } from '../../../../global';

import {
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectIsCurrentAccountViewMode,
  selectIsMnemonicAccount,
} from '../../../../global/selectors';
import { IS_LEGACY_APP_HOST } from '../../../../util/windowEnvironment';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useLang from '../../../../hooks/useLang';

import BackupWarning from './BackupWarning';
import LegacyDomainWarning from './LegacyDomainWarning';
import RenewDomainWarning from './RenewDomainWarning';
import ScamWalletWarning from './ScamWalletWarning';

import styles from './Warnings.module.scss';

type OwnProps = {
  onOpenBackupWallet: () => void;
};

type StateProps = {
  isTestnet?: boolean;
  isBackupRequired: boolean;
  isViewMode: boolean;
  isMnemonicAccount: boolean;
};

function Warnings({
  isBackupRequired,
  isTestnet,
  isViewMode,
  isMnemonicAccount,
  onOpenBackupWallet,
}: OwnProps & StateProps) {
  const { isPortrait } = useDeviceScreen();
  const lang = useLang();

  return (
    <>
      {isTestnet && (
        <div className={isPortrait ? styles.portraitContainer : styles.container}>
          <div className={styles.testnetWarning}>{lang('Testnet Version')}</div>
        </div>
      )}

      {IS_LEGACY_APP_HOST && (
        <LegacyDomainWarning isMnemonicAccount={isMnemonicAccount} onOpenBackupWallet={onOpenBackupWallet} />
      )}

      {!isViewMode && (
        <>
          <BackupWarning isRequired={isBackupRequired} onOpenBackupWallet={onOpenBackupWallet} />
          <RenewDomainWarning />
          <ScamWalletWarning />
        </>
      )}
    </>
  );
}

export default memo(
  withGlobal(
    (global): StateProps => {
      return {
        isBackupRequired: Boolean(selectCurrentAccountState(global)?.isBackupRequired),
        isTestnet: global.settings.isTestnet,
        isViewMode: selectIsCurrentAccountViewMode(global),
        isMnemonicAccount: selectIsMnemonicAccount(global),
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(Warnings),
);
