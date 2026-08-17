import React, { memo } from '../../../../lib/teact/teact';

import buildClassName from '../../../../util/buildClassName';
import { IS_LEDGER_SUPPORTED } from '../../../../util/windowEnvironment';

import useLang from '../../../../hooks/useLang';

import ListItem from '../../../ui/ListItem';
import ModalHeader from '../../../ui/ModalHeader';
import WalletVersionSection from './WalletVersionSection';

import modalStyles from '../../../ui/Modal.module.scss';
import styles from './AccountSelectorModal.module.scss';

type OwnProps = {
  isNewAccountImporting?: boolean;
  isLoading?: boolean;
  isTestnet?: boolean;
  hasOtherWalletVersions?: boolean;
  canAddSubwallet?: boolean;
  shouldHideBackButton?: boolean;
  onBack: NoneToVoidFunction;
  onNewVaultAccountClick: NoneToVoidFunction;
  onNewSubwalletClick: NoneToVoidFunction;
  onImportAccountClick: NoneToVoidFunction;
  onImportHardwareWalletClick: NoneToVoidFunction;
  onViewModeWalletClick: NoneToVoidFunction;
  onOpenSettingWalletVersion: NoneToVoidFunction;
  onClose: NoneToVoidFunction;
};

function AddAccountSelector({
  isNewAccountImporting,
  isLoading,
  isTestnet,
  hasOtherWalletVersions,
  canAddSubwallet,
  shouldHideBackButton,
  onBack,
  onNewVaultAccountClick,
  onNewSubwalletClick,
  onImportAccountClick,
  onImportHardwareWalletClick,
  onViewModeWalletClick,
  onOpenSettingWalletVersion,
  onClose,
}: OwnProps) {
  const lang = useLang();

  return (
    <div className={modalStyles.transitionContentWrapper}>
      <ModalHeader
        title={lang('Add Wallet')}
        onBackButtonClick={shouldHideBackButton ? undefined : onBack}
        onClose={onClose}
      />

      <div className={buildClassName(styles.actionsSection, styles.actionsSectionShift)}>
        <ListItem
          icon="lock"
          label={lang('Vault Wallet')}
          description={lang('TON-only cold storage with unlock')}
          isLoading={!isNewAccountImporting && isLoading}
          onClick={onNewVaultAccountClick}
        />
        {canAddSubwallet && (
          <ListItem
            icon="subwallet-add"
            label={lang('New Subwallet')}
            description={lang('From current secret words')}
            onClick={onNewSubwalletClick}
          />
        )}
      </div>

      <span className={styles.importText}>{lang('or import from')}</span>

      <div className={styles.actionsSection}>
        <ListItem
          icon="key"
          label={lang('$secret_words')}
          description={lang('Restore wallet from 12 or 24 words')}
          onClick={onImportAccountClick}
          isLoading={isNewAccountImporting && isLoading}
        />
        {IS_LEDGER_SUPPORTED && !isTestnet && (
          <ListItem
            icon="ledger-alt"
            label={lang('Ledger')}
            description={lang('Connect your hardware wallet')}
            onClick={onImportHardwareWalletClick}
          />
        )}
      </div>

      <div className={styles.actionsSection}>
        <ListItem
          icon="wallet-view"
          label={lang('View Any Address')}
          description={lang('Watch wallet in read-only mode')}
          onClick={onViewModeWalletClick}
        />
      </div>

      <WalletVersionSection
        isVisible={hasOtherWalletVersions}
        onClick={onOpenSettingWalletVersion}
      />
    </div>
  );
}

export default memo(AddAccountSelector);
