import React, {
  memo, useEffect, useState,
} from '../../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../../global';

import type {
  ApiBaseCurrency,
  ApiChain,
  ApiCurrencyRates,
  ApiNft,
  ApiTokenWithPrice,
  ApiTransactionActivity,
} from '../../../../api/types';
import type { Account, SavedAddress, Theme } from '../../../../global/types';

import {
  ANIMATION_END_DELAY,
  ANIMATION_LEVEL_MIN,
  TONCOIN,
} from '../../../../config';
import {
  selectAccounts,
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectIsCurrentAccountViewMode,
  selectIsHardwareAccount,
} from '../../../../global/selectors';
import {
  getIsActivityWithHash,
  isOurStakingTransaction,
  parseTxId,
} from '../../../../util/activities';
import { bigintAbs } from '../../../../util/bigint';
import { getDoesUsePinPad } from '../../../../util/biometrics';
import buildClassName from '../../../../util/buildClassName';
import resolveSlideTransitionName from '../../../../util/resolveSlideTransitionName';
import { shareUrl } from '../../../../util/share';
import { getChainBySlug } from '../../../../util/tokens';
import { getExplorerTransactionUrl, getViewTransactionUrl } from '../../../../util/url';

import useAppTheme from '../../../../hooks/useAppTheme';
import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useEncryptedComment from '../../../../hooks/useEncryptedComment';
import useLastCallback from '../../../../hooks/useLastCallback';
import usePrevDuringAnimation from '../../../../hooks/usePrevDuringAnimation';
import useShowTransition from '../../../../hooks/useShowTransition';
import useSyncEffect from '../../../../hooks/useSyncEffect';

import PasswordSlide from '../../../common/PasswordSlide';
import TransactionHeader from '../../../common/TransactionHeader';
import Modal, { CLOSE_DURATION, CLOSE_DURATION_PORTRAIT } from '../../../ui/Modal';
import Transition from '../../../ui/Transition';
import TransactionInfo from './TransactionInfo';

import modalStyles from '../../../ui/Modal.module.scss';
import styles from './TransactionModal.module.scss';

type StateProps = {
  transaction?: ApiTransactionActivity;
  tokensBySlug?: Record<string, ApiTokenWithPrice>;
  savedAddresses?: SavedAddress[];
  isHardwareAccount: boolean;
  isTestnet?: boolean;
  isViewMode: boolean;
  isMediaViewerOpen?: boolean;
  theme: Theme;
  isSensitiveDataHidden?: true;
  nftsByAddress?: Record<string, ApiNft>;
  accounts?: Record<string, Account>;
  currentAccountId: string;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  selectedExplorerIds?: Partial<Record<ApiChain, string>>;
};

const enum SLIDES {
  initial,
  password,
}

function TransactionModal({
  transaction,
  tokensBySlug,
  savedAddresses,
  isTestnet,
  isHardwareAccount,
  isViewMode,
  isMediaViewerOpen,
  theme,
  isSensitiveDataHidden,
  nftsByAddress,
  accounts,
  currentAccountId,
  baseCurrency,
  currencyRates,
  selectedExplorerIds,
}: StateProps) {
  const {
    fetchActivityDetails,
    startTransfer,
    closeActivityInfo,
    setIsPinAccepted,
    clearIsPinAccepted,
    selectToken,
  } = getActions();

  const { isPortrait } = useDeviceScreen();
  const [currentSlide, setCurrentSlide] = useState<SLIDES>(SLIDES.initial);
  const [nextKey, setNextKey] = useState<SLIDES | undefined>(SLIDES.password);
  const animationLevel = getGlobal().settings.animationLevel;
  const animationDuration = animationLevel === ANIMATION_LEVEL_MIN
    ? 0
    : (isPortrait ? CLOSE_DURATION_PORTRAIT : CLOSE_DURATION) + ANIMATION_END_DELAY;
  const renderedTransaction = usePrevDuringAnimation(transaction, animationDuration);
  const appTheme = useAppTheme(theme);

  const {
    id,
    isIncoming,
    slug,
    shouldLoadDetails,
    encryptedComment,
    amount,
    comment,
  } = renderedTransaction || {};

  const token = slug ? tokensBySlug?.[slug] : undefined;
  const address = isIncoming ? renderedTransaction?.fromAddress : renderedTransaction?.toAddress;
  const isModalOpen = Boolean(transaction) && !isMediaViewerOpen;
  const canDecryptComment = !isViewMode && !isHardwareAccount;

  const [
    { decryptedComment, passwordError, isPasswordSlideOpen },
    {
      closePasswordSlide: closePasswordSlideBase,
      clearPasswordError,
      handlePasswordSubmit,
      openHiddenComment,
      resetDecryptedComment,
    },
  ] = useEncryptedComment({
    transaction: renderedTransaction,
    encryptedComment,
    onPinAccepted: setIsPinAccepted,
  });

  const chain = token?.chain ?? (slug ? getChainBySlug(slug) : undefined);
  const transactionHash = chain && id ? parseTxId(id).hash : undefined;
  const transactionUrl = chain
    ? getExplorerTransactionUrl(
      chain,
      transactionHash,
      isTestnet,
      selectedExplorerIds?.[chain],
    )
    : undefined;
  const isActivityWithHash = renderedTransaction && getIsActivityWithHash(renderedTransaction);

  const {
    shouldRender: shouldRenderTransactionId,
    ref: transactionIdRef,
  } = useShowTransition({
    isOpen: Boolean(isActivityWithHash && transactionUrl),
    withShouldRender: true,
  });

  // Sync slide state with hook's `isPasswordSlideOpen`
  useSyncEffect(() => {
    if (isPasswordSlideOpen && currentSlide !== SLIDES.password) {
      setCurrentSlide(SLIDES.password);
      setNextKey(undefined);
    } else if (!isPasswordSlideOpen && currentSlide === SLIDES.password) {
      setCurrentSlide(SLIDES.initial);
      setNextKey(SLIDES.password);
    }
  }, [isPasswordSlideOpen, currentSlide]);

  useSyncEffect(() => {
    if (renderedTransaction) {
      resetDecryptedComment();
    }
  }, [renderedTransaction, resetDecryptedComment]);

  useEffect(() => {
    if (id && shouldLoadDetails) fetchActivityDetails({ id });
  }, [id, shouldLoadDetails]);

  const closePasswordSlide = useLastCallback(() => {
    closePasswordSlideBase();
    setCurrentSlide(SLIDES.initial);
    setNextKey(SLIDES.password);
  });

  const handleSendClick = useLastCallback(() => {
    closeActivityInfo({ id: id! });
    startTransfer({
      tokenSlug: slug || TONCOIN.slug,
      toAddress: address,
      amount: bigintAbs(amount!),
      comment: !isIncoming ? comment : undefined,
    });
  });

  const handleClose = useLastCallback(() => {
    closeActivityInfo({ id: id! });
    if (getDoesUsePinPad()) {
      clearIsPinAccepted();
    }
  });

  const handleTokenClick = useLastCallback((tokenSlug: string) => {
    closeActivityInfo({ id: id! });
    selectToken({ slug: tokenSlug });
  });

  const handleShareClick = useLastCallback(() => {
    const url = getViewTransactionUrl(chain!, transactionHash!, isTestnet);
    void shareUrl(url);
  });

  function renderContent(isActive: boolean, isFrom: boolean, currentKey: SLIDES) {
    switch (currentKey) {
      case SLIDES.initial:
        return (
          <>
            {renderedTransaction && (
              <TransactionHeader
                transaction={renderedTransaction}
                appTheme={appTheme}
                isModalOpen={isModalOpen}
                onShareClick={chain && transactionHash ? handleShareClick : undefined}
                onClose={handleClose}
              />
            )}
            <TransactionInfo
              transaction={renderedTransaction}
              tokensBySlug={tokensBySlug}
              savedAddresses={savedAddresses}
              nftsByAddress={nftsByAddress}
              accounts={accounts}
              currentAccountId={currentAccountId}
              baseCurrency={baseCurrency}
              currencyRates={currencyRates}
              theme={theme}
              isTestnet={isTestnet}
              isOpen={isModalOpen}
              isSensitiveDataHidden={isSensitiveDataHidden}
              isViewMode={isViewMode}
              encryptedComment={encryptedComment}
              decryptedComment={decryptedComment}
              canDecryptComment={canDecryptComment}
              onDecryptComment={openHiddenComment}
              shouldRenderTransactionId={shouldRenderTransactionId}
              transactionIdRef={transactionIdRef}
              onSendClick={handleSendClick}
              onTokenClick={handleTokenClick}
              selectedExplorerIds={selectedExplorerIds}
            />
          </>
        );
      case SLIDES.password:
        if (!encryptedComment) return undefined;

        return (
          <PasswordSlide
            isActive={isActive}
            error={passwordError}
            onSubmit={handlePasswordSubmit}
            onCancel={closePasswordSlide}
            onUpdate={clearPasswordError}
            onClose={handleClose}
          />
        );
    }
  }

  const isOurUnstaking = renderedTransaction
    && isOurStakingTransaction(renderedTransaction)
    && renderedTransaction.type === 'unstake';

  return (
    <Modal
      isOpen={isModalOpen}
      hasCloseButton
      dialogClassName={buildClassName(styles.modalDialog, isOurUnstaking && styles.unstakeModal)}
      onClose={handleClose}
      onCloseAnimationEnd={closePasswordSlide}
    >
      <Transition
        name={resolveSlideTransitionName()}
        className={buildClassName(modalStyles.transition, 'custom-scroll')}
        slideClassName={modalStyles.transitionSlide}
        activeKey={currentSlide}
        nextKey={nextKey}
      >
        {renderContent}
      </Transition>
    </Modal>
  );
}

export default memo(
  withGlobal((global): StateProps => {
    const accountId = selectCurrentAccountId(global)!;
    const accountState = selectCurrentAccountState(global);

    const txId = accountState?.currentActivityId;
    const activity = txId ? accountState?.activities?.byId[txId] : undefined;
    const savedAddresses = accountState?.savedAddresses;
    const { byAddress } = accountState?.nfts || {};

    const { isTestnet, theme, isSensitiveDataHidden } = global.settings;
    const accounts = selectAccounts(global);
    const isHardwareAccount = selectIsHardwareAccount(global);

    return {
      transaction: activity?.kind === 'transaction' ? activity : undefined,
      tokensBySlug: global.tokenInfo?.bySlug,
      savedAddresses,
      isHardwareAccount,
      isTestnet,
      isViewMode: selectIsCurrentAccountViewMode(global),
      isMediaViewerOpen: Boolean(global.mediaViewer.mediaId),
      theme,
      isSensitiveDataHidden,
      nftsByAddress: byAddress,
      accounts,
      currentAccountId: accountId,
      baseCurrency: global.settings.baseCurrency,
      currencyRates: global.currencyRates,
      selectedExplorerIds: global.settings.selectedExplorerIds,
    };
  })(TransactionModal),
);
