import type { ElementRef, TeactNode } from '../../../../lib/teact/teact';
import React, { memo, useMemo } from '../../../../lib/teact/teact';

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
  getIsActivityPendingForUser,
  isOurStakingTransaction,
  isScamTransaction,
  shouldShowTransactionAddress,
} from '../../../../util/activities';
import buildClassName from '../../../../util/buildClassName';
import { getChainTitle } from '../../../../util/chain';
import { getLocalAddressName } from '../../../../util/getLocalAddressName';
import { getIsTransactionWithPoisoning } from '../../../../util/poisoningHash';

import useLang from '../../../../hooks/useLang';
import useTransactionDetails from '../../../../hooks/useTransactionDetails';

import TransactionAmount from '../../../common/TransactionAmount';
import TransactionFee from '../../../common/TransactionFee';
import NftInfo from '../../../transfer/NftInfo';
import Button from '../../../ui/Button';
import InteractiveTextField from '../../../ui/InteractiveTextField';

import transferStyles from '../../../transfer/Transfer.module.scss';
import modalStyles from '../../../ui/Modal.module.scss';
import styles from './TransactionModal.module.scss';

interface OwnProps {
  transaction?: ApiTransactionActivity;
  tokensBySlug?: Record<string, ApiTokenWithPrice>;
  savedAddresses?: SavedAddress[];
  nftsByAddress?: Record<string, ApiNft>;
  accounts?: Record<string, Account>;
  currentAccountId: string;
  baseCurrency: ApiBaseCurrency;
  currencyRates: ApiCurrencyRates;
  theme: Theme;
  isTestnet?: boolean;
  isOpen?: boolean;
  isSensitiveDataHidden?: true;
  isViewMode?: boolean;
  encryptedComment?: string;
  decryptedComment?: string;
  canDecryptComment?: boolean;
  onDecryptComment?: NoneToVoidFunction;
  shouldRenderTransactionId?: boolean;
  transactionIdRef?: ElementRef<HTMLDivElement>;
  forceShowAddress?: boolean;
  showBothAddresses?: boolean;
  className?: string;
  onSendClick?: NoneToVoidFunction;
  onTokenClick?: (slug: string) => void;
  selectedExplorerIds?: Partial<Record<ApiChain, string>>;
}

function TransactionInfo({
  transaction,
  tokensBySlug,
  savedAddresses,
  nftsByAddress,
  accounts,
  currentAccountId,
  baseCurrency,
  currencyRates,
  theme,
  isTestnet,
  isOpen,
  isSensitiveDataHidden,
  isViewMode,
  encryptedComment,
  decryptedComment,
  canDecryptComment,
  onDecryptComment,
  shouldRenderTransactionId: shouldRenderTransactionIdProp,
  transactionIdRef,
  forceShowAddress,
  showBothAddresses,
  className,
  onSendClick,
  onTokenClick,
  selectedExplorerIds,
}: OwnProps) {
  const lang = useLang();

  const {
    comment,
    fee,
    isIncoming,
    nft,
    status,
    token,
    chain,
    nativeToken,
    address,
    fromAddress,
    toAddress,
    isActivityWithHash,
    transactionHash,
    doesNftExist,
    amountDisplayMode,
    addressName,
    transactionUrl,
    amount,
  } = useTransactionDetails({
    transaction,
    tokensBySlug,
    nftsByAddress,
    accounts,
    savedAddresses,
    currentAccountId,
    isTestnet,
    selectedExplorerIds,
  });

  const addressCopiedMessage = lang(
    '%chain% Address Copied', { chain: chain ? getChainTitle(chain) : '' },
  ) as string;

  const senderAddressName = useMemo(() => {
    if (!showBothAddresses || !chain || !fromAddress) return undefined;

    const localName = getLocalAddressName({
      address: fromAddress,
      chain,
      currentAccountId,
      accounts: accounts!,
      savedAddresses,
    });
    // `metadata?.name` applies to the counterparty, which is sender for incoming transactions
    return localName || (isIncoming ? transaction?.metadata?.name : undefined);
  }, [
    showBothAddresses, chain, fromAddress, currentAccountId, accounts,
    savedAddresses, isIncoming, transaction?.metadata?.name,
  ]);

  const recipientAddressName = useMemo(() => {
    if (!showBothAddresses || !chain || !toAddress) return undefined;

    const localName = getLocalAddressName({
      address: toAddress,
      chain,
      currentAccountId,
      accounts: accounts!,
      savedAddresses,
    });
    // `metadata?.name` applies to the counterparty, which is recipient for outgoing transactions
    return localName || (!isIncoming ? transaction?.metadata?.name : undefined);
  }, [
    showBothAddresses, chain, toAddress, currentAccountId, accounts,
    savedAddresses, isIncoming, transaction?.metadata?.name,
  ]);

  const isOurStaking = transaction && isOurStakingTransaction(transaction);
  const isOurUnstaking = isOurStaking && transaction?.type === 'unstake';
  const isNftTransfer = Boolean(transaction?.nft);
  const isAnyPending = transaction ? getIsActivityPendingForUser(transaction) : undefined;
  const isTransactionWithPoisoning = isIncoming && transaction && getIsTransactionWithPoisoning(transaction);
  const isScam = Boolean(transaction) && isScamTransaction(transaction);
  const shouldLoadDetails = transaction?.shouldLoadDetails;

  const shouldRenderTransactionId = shouldRenderTransactionIdProp ?? (isActivityWithHash && Boolean(transactionUrl));

  function renderTransactionWithPoisoningWarning() {
    return (
      <div className={styles.scamWarning}>
        {lang('This address mimics another address that you previously interacted with.')}
      </div>
    );
  }

  function renderFee() {
    if (!(fee || shouldLoadDetails) || !nativeToken) {
      return undefined;
    }

    return (
      <TransactionFee
        terms={{ native: fee }}
        token={nativeToken}
        precision={isAnyPending ? 'approximate' : 'exact'}
        isLoading={shouldLoadDetails}
        className={styles.feeField}
      />
    );
  }

  function renderComment() {
    if (!comment && !encryptedComment) {
      return undefined;
    }

    const spoiler = encryptedComment
      ? lang('Message is encrypted')
      : isScam
        ? lang('Scam comment is hidden.')
        : undefined;

    return (
      <>
        <div className={transferStyles.label}>{lang('Comment')}</div>
        <InteractiveTextField
          text={encryptedComment ? decryptedComment : comment}
          spoiler={spoiler}
          spoilerRevealText={encryptedComment ? (canDecryptComment ? lang('Decrypt') : undefined) : lang('Display')}
          spoilerCallback={canDecryptComment ? onDecryptComment : undefined}
          copyNotification={lang('Comment Copied')}
          className={styles.copyButtonWrapper}
          textClassName={styles.comment}
        />
      </>
    );
  }

  function renderTransactionId() {
    return (
      <div ref={transactionIdRef} className={styles.textFieldWrapper}>
        <span className={styles.textFieldLabel}>
          {lang('Transaction ID')}
        </span>
        <InteractiveTextField
          noSavedAddress
          chain={chain}
          address={transactionHash}
          addressUrl={transactionUrl}
          isTransaction
          copyNotification={lang('Transaction ID Copied')}
          className={styles.cexTextField}
        />
      </div>
    );
  }

  function renderFooter() {
    if (isViewMode) return undefined;

    const buttons: TeactNode[] = [];

    if (!isOurStaking && !isIncoming && !isNftTransfer && onSendClick) {
      buttons.push(
        <Button onClick={onSendClick} className={styles.button}>
          {lang('Repeat')}
        </Button>,
      );
    }

    return buttons.length ? <div className={styles.footer}>{buttons}</div> : undefined;
  }

  return (
    <div className={buildClassName(modalStyles.transitionContent, className)}>
      {amountDisplayMode !== 'hide' && (
        <TransactionAmount
          isSensitiveDataHidden={isSensitiveDataHidden}
          isIncoming={isIncoming}
          isScam={isScam}
          isFailed={status === 'failed'}
          amount={amount ?? 0n}
          token={token}
          status={isOurUnstaking ? lang('Successfully') : undefined}
          noSign={amountDisplayMode === 'noSign'}
          baseCurrency={baseCurrency}
          currencyRates={currencyRates}
          onTokenClick={onTokenClick}
        />
      )}

      {nft && <NftInfo nft={nft} withMediaViewer={doesNftExist} withTonExplorer />}

      {isTransactionWithPoisoning && renderTransactionWithPoisoningWarning()}

      {transaction && (forceShowAddress || shouldShowTransactionAddress(transaction).includes('modal')) && (
        showBothAddresses ? (
          <>
            {fromAddress && (
              <>
                <div className={transferStyles.label}>{lang('Sender')}</div>
                <InteractiveTextField
                  chain={chain}
                  addressName={senderAddressName}
                  address={fromAddress}
                  copyNotification={addressCopiedMessage}
                  className={styles.copyButtonWrapper}
                  textClassName={isScam && isIncoming ? styles.scamAddress : undefined}
                />
              </>
            )}
            {toAddress && (
              <>
                <div className={transferStyles.label}>{lang('Recipient')}</div>
                <InteractiveTextField
                  chain={chain}
                  addressName={recipientAddressName}
                  address={toAddress}
                  isScam={isScam && !isIncoming}
                  copyNotification={addressCopiedMessage}
                  className={styles.copyButtonWrapper}
                />
              </>
            )}
          </>
        ) : (
          <>
            <div className={transferStyles.label}>{lang(isIncoming ? 'Sender' : 'Recipient')}</div>
            <InteractiveTextField
              chain={chain}
              addressName={addressName}
              address={address}
              isScam={isScam && !isIncoming}
              copyNotification={addressCopiedMessage}
              className={styles.copyButtonWrapper}
              textClassName={isScam && isIncoming ? styles.scamAddress : undefined}
            />
          </>
        )
      )}

      {renderFee()}
      {renderComment()}
      {shouldRenderTransactionId && renderTransactionId()}
      {renderFooter()}
    </div>
  );
}

export default memo(TransactionInfo);
