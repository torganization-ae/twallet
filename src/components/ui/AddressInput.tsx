import type { ClipboardEvent } from 'react';
import React, {
  type ElementRef,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiChain } from '../../api/types';
import type { Account, SavedAddress } from '../../global/types';

import {
  selectCurrentAccount,
  selectCurrentAccountId,
  selectCurrentAccountState,
  selectNetworkAccounts,
} from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { getSupportedChains } from '../../util/chain';
import { readClipboardContent, shouldHidePasteButtonAfterClipboardError } from '../../util/clipboard';
import { isTonChainDns } from '../../util/dns';
import { getLocalAddressName } from '../../util/getLocalAddressName';
import { isTonsiteAddress, isValidAddressOrDomain } from '../../util/isValidAddress';
import { shortenAddress } from '../../util/shortenAddress';
import { isTmailAlias } from '../../util/tmail';
import { getHostnameFromUrl } from '../../util/url';
import {
  getIsMobileTelegramApp,
  IS_ANDROID,
  IS_CLIPBOARDS_SUPPORTED,
  IS_IOS,
} from '../../util/windowEnvironment';

import useDebouncedValue from '../../hooks/useDebouncedValue';
import useEffectOnce from '../../hooks/useEffectOnce';
import useFlag from '../../hooks/useFlag';
import useKeyboardListNavigation from '../../hooks/useKeyboardListNavigation';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useQrScannerSupport from '../../hooks/useQrScannerSupport';
import useUniqueId from '../../hooks/useUniqueId';
import useAddressBookItems from './hooks/useAddressBookItems';

import DeleteSavedAddressModal from '../main/modals/DeleteSavedAddressModal';
import AddressBook from './AddressBook';
import { SUGGESTION_ITEM_CLASS_NAME } from './AddressBookItem';
import Button from './Button';
import Dropdown, { type DropdownItem } from './Dropdown';
import Input from './Input';
import Transition from './Transition';

import styles from './AddressInput.module.scss';

export const INPUT_CLEAR_BUTTON_ID = 'input-clear-button';

type AliasMode = 'auto' | 'tmail';

const TMAIL_SUFFIX = '@tmail.ton';

interface OwnProps {
  ref?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;
  label?: string;
  value: string;
  chain?: ApiChain;
  isStatic?: boolean;
  isReadonly?: boolean;
  withQrScan?: boolean;
  withCurrentAccount?: boolean;
  withAliasSelector?: boolean;
  shouldHideAddressBook?: boolean;
  shouldValidateAllChains?: boolean;
  address: string;
  addressName: string;
  addressBookChain?: ApiChain;
  savedAddresses?: SavedAddress[];
  validateAddress?: ({ address }: { address?: string; chain?: ApiChain }) => void;
  error?: string;
  onInput: (value: string, isValueReplaced?: boolean) => void;
  onPaste?: (value: string) => void;
  onError?: (hasError: boolean) => void;
  onClose: NoneToVoidFunction;
}

interface StateProps {
  currentAccountId: string | undefined;
  savedAddresses?: SavedAddress[];
  accounts?: Record<string, Account>;
  supportedChains?: Partial<Record<ApiChain, unknown>>;
  orderedAccountIds?: string[];
}

const SHORT_ADDRESS_SHIFT = 4;
const SHORT_SINGLE_ADDRESS_SHIFT = 11;
const MIN_ADDRESS_LENGTH_TO_SHORTEN = SHORT_SINGLE_ADDRESS_SHIFT * 2;
const SAVED_ADDRESS_OPEN_DELAY = 300;
const SEARCH_DEBOUNCE_MS = 200;

function AddressInput({
  ref,
  label,
  value,
  chain,
  isStatic,
  isReadonly,
  withQrScan,
  withCurrentAccount,
  withAliasSelector,
  shouldHideAddressBook,
  shouldValidateAllChains,
  address,
  addressName,
  addressBookChain,
  accounts,
  currentAccountId = '',
  savedAddresses,
  supportedChains,
  orderedAccountIds,
  validateAddress,
  error,
  onInput,
  onPaste,
  onError,
  onClose,
}: OwnProps & StateProps) {
  const {
    showToast,
    requestOpenQrScanner,
  } = getActions();

  const lang = useLang();

  const [aliasMode, setAliasMode] = useState<AliasMode>('auto');
  const isTmailMode = aliasMode === 'tmail';
  const shouldShowAliasSelector = withAliasSelector && chain === 'ton' && !isReadonly;

  const aliasItems = useMemo<DropdownItem<AliasMode>[]>(() => ([
    { value: 'auto', name: lang('Address or TON DNS') },
    { value: 'tmail', name: lang('@tmail.ton alias') },
  ]), [lang]);

  const displayValue = useMemo(() => {
    if (!isTmailMode) {
      return value;
    }
    return value.endsWith(TMAIL_SUFFIX) ? value.slice(0, -TMAIL_SUFFIX.length) : value;
  }, [isTmailMode, value]);

  const handleAliasModeChange = useLastCallback((mode: AliasMode) => {
    if (mode === aliasMode) return;
    setAliasMode(mode);
    onInput('');
  });

  const handleAliasInput = useLastCallback((raw: string, isValueReplaced?: boolean): string => {
    if (!isTmailMode) {
      onInput(raw, isValueReplaced);
      return raw;
    }
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
      onInput('', isValueReplaced);
      return '';
    }
    // Match Android/iOS: don't double-append when pasting a full @tmail.ton alias.
    const composed = trimmed.endsWith(TMAIL_SUFFIX) ? trimmed : `${trimmed}${TMAIL_SUFFIX}`;
    onInput(composed, isValueReplaced);
    return composed;
  });

  const addressBookTimeoutRef = useRef<number>();
  const isAddressBookSelectionRef = useRef<boolean>(false);

  const [addressForDeletion, setAddressForDeletion] = useState<string | undefined>();
  const [chainForDeletion, setChainForDeletion] = useState<ApiChain | undefined>();
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const [isAddressBookOpen, openAddressBook, closeAddressBook] = useFlag();
  const [isFocused, markFocused, unmarkFocused] = useFlag();
  const [shouldRenderPasteButton, setShouldRenderPasteButton] = useState(IS_CLIPBOARDS_SUPPORTED);
  const isQrScannerSupported = useQrScannerSupport();
  const inputId = useUniqueId('address-');

  const searchValue = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);

  const addressBookAccountIds = useMemo(() => {
    if (!accounts) return [];

    const allAccountIds = Object.keys(accounts);

    return withCurrentAccount
      ? allAccountIds
      : allAccountIds.filter((accountId) => accountId !== currentAccountId);
  }, [currentAccountId, accounts, withCurrentAccount]);

  const shouldUseAddressBook = useMemo(() => {
    return !shouldHideAddressBook
      && (addressBookAccountIds.length > 0 || (savedAddresses && savedAddresses.length > 0));
  }, [shouldHideAddressBook, addressBookAccountIds.length, savedAddresses]);

  const localAddressName = useMemo(() => {
    return chain && value ? getLocalAddressName({
      address: value,
      chain,
      currentAccountId,
      savedAddresses,
      accounts: accounts!,
    }) : undefined;
  }, [accounts, chain, currentAccountId, savedAddresses, value]);

  const addressBookItems = useAddressBookItems({
    savedAddresses,
    accounts,
    supportedChains,
    otherAccountIds: addressBookAccountIds,
    currentChain: addressBookChain,
    searchValue,
    orderedAccountIds,
  });

  const handleAddressBookItemSelect = useLastCallback((address: string) => {
    isAddressBookSelectionRef.current = true;
    const composedValue = handleAliasInput(address, true);
    onPaste?.(composedValue);
    closeAddressBook();
  });

  const {
    activeIndex,
    listRef: menuRef,
    handleKeyDown,
    resetIndex,
  } = useKeyboardListNavigation(
    isAddressBookOpen,
    (index) => {
      const item = addressBookItems[index];
      if (item) {
        handleAddressBookItemSelect(item.address);
      }
    },
    `.${SUGGESTION_ITEM_CLASS_NAME}`,
  );

  const withPasteButton = shouldRenderPasteButton && !value;
  const withQrButton = withQrScan && isQrScannerSupported;
  const withButton = (withQrButton || withPasteButton || !!value.length) && !isReadonly;

  useEffectOnce(() => {
    return () => {
      if (addressBookTimeoutRef.current) {
        window.clearTimeout(addressBookTimeoutRef.current);
      }
    };
  });

  useEffect(() => {
    if (value) {
      handleAddressErrorCheck(value);
    }
    // Only re-validate when chain changes, not on every value change
    // eslint-disable-next-line react-hooks-static-deps/exhaustive-deps
  }, [chain]);

  const addressOverlay = useMemo(() => {
    if (!address) return undefined;
    const renderedAddressName = localAddressName || addressName;

    const addressShort = !renderedAddressName && address.length > MIN_ADDRESS_LENGTH_TO_SHORTEN
      ? shortenAddress(address, SHORT_SINGLE_ADDRESS_SHIFT) || ''
      : address;

    return (
      <>
        {renderedAddressName && <span className={styles.addressName}>{renderedAddressName}</span>}
        <span className={buildClassName(styles.addressValue, !renderedAddressName && styles.addressValueSingle)}>
          {renderedAddressName ? shortenAddress(address, SHORT_ADDRESS_SHIFT) : addressShort}
        </span>
      </>
    );
  }, [address, localAddressName, addressName]);

  function changeError(errorMessage: string | undefined) {
    setLocalError(errorMessage);
    onError?.(Boolean(errorMessage));
  }

  const handlePasteClick = useLastCallback(async () => {
    try {
      const { type, text } = await readClipboardContent();

      if (type === 'text/plain') {
        const newValue = cleanTonsiteAddress((text ?? '').trim());
        const composedValue = handleAliasInput(newValue, true);
        onPaste?.(composedValue);

        handleAddressValidate(composedValue);
        handleAddressErrorCheck(composedValue);
      }
    } catch (err: any) {
      showToast({ message: lang('Error reading clipboard') });
      // Keep the field focused so the user can still paste with Ctrl/Cmd+V.
      (ref?.current ?? document.getElementById(inputId))?.focus();
      if (shouldHidePasteButtonAfterClipboardError(err)) {
        setShouldRenderPasteButton(false);
      }
    }
  });

  const handleQrScanClick = useLastCallback(() => {
    if (IS_IOS && getIsMobileTelegramApp()) {
      alert('Scanning is temporarily not available');
      return;
    }

    requestOpenQrScanner();
    onClose();
  });

  const handleAddressValidate = useLastCallback((address?: string) => {
    if (!validateAddress) return;

    if (address) {
      address = cleanTonsiteAddress(address);
    }

    if ((address && chain && isValidAddressOrDomain(address, chain)) || !address) {
      validateAddress({ address, chain });
    }
  });

  function handleAddressErrorCheck(address?: string) {
    // Skip error check if address was just selected from AddressBook
    if (isAddressBookSelectionRef.current) {
      isAddressBookSelectionRef.current = false;
      return;
    }

    if (!address) return;

    let isAddressValid: boolean | undefined;
    if (chain) {
      isAddressValid = isValidAddressOrDomain(address, chain);
    } else if (shouldValidateAllChains) {
      isAddressValid = getSupportedChains().some((c) => isValidAddressOrDomain(address, c));
    }
    const hasAddressError = isAddressValid !== undefined && address.length > 0 && !isAddressValid;

    if (hasAddressError) {
      changeError(lang('Incorrect address'));
    } else {
      changeError(undefined);
    }
  }

  const handleAddressFocus = useLastCallback(() => {
    markFocused();
    setLocalError(undefined);

    if (shouldUseAddressBook) {
      // Simultaneous opening of the virtual keyboard and display of Saved Addresses causes animation degradation
      if (IS_ANDROID) {
        addressBookTimeoutRef.current = window.setTimeout(openAddressBook, SAVED_ADDRESS_OPEN_DELAY);
      } else {
        openAddressBook();
      }
    }
  });

  const handleAddressBlur = useLastCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    unmarkFocused();

    if (e.relatedTarget?.id === INPUT_CLEAR_BUTTON_ID) {
      handleAddressBookClose();
      handleAddressValidate(value);
      handleAddressErrorCheck(value);

      return;
    }

    let addressToCheck = cleanTonsiteAddress(value);
    if ((isTonChainDns(value) || isTmailAlias(value)) && value !== value.toLowerCase()) {
      addressToCheck = value.toLowerCase().trim();
      handleAliasInput(addressToCheck);
    } else if (value !== value.trim()) {
      addressToCheck = value.trim();
      handleAliasInput(addressToCheck);
    }

    requestAnimationFrame(() => {
      handleAddressBookClose();
      handleAddressValidate(addressToCheck);
      handleAddressErrorCheck(addressToCheck);
    });
  });

  function hanldeInputChange(value: string) {
    handleAliasInput(value);
    changeError(undefined);
  }

  const handleAddressPaste = useLastCallback((event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.preventDefault();
    let value = event.clipboardData.getData('text').trim();
    value = cleanTonsiteAddress(value);
    const composedValue = handleAliasInput(value, false);
    onPaste?.(composedValue);
    handleAddressErrorCheck(composedValue);
  });

  const handleAddressClear = useLastCallback(() => {
    onInput('');
    handleAddressValidate();
    changeError(undefined);
  });

  const handleAddressBookClose = useLastCallback(() => {
    if (!shouldUseAddressBook || !isAddressBookOpen) return;

    closeAddressBook();
    resetIndex();

    if (addressBookTimeoutRef.current) {
      window.clearTimeout(addressBookTimeoutRef.current);
    }
  });

  const handleDeleteSavedAddressClick = useLastCallback((address: string) => {
    setAddressForDeletion(address);
    setChainForDeletion(chain);
    closeAddressBook();
  });

  const handleDeleteSavedAddressModalClose = useLastCallback(() => {
    setAddressForDeletion(undefined);
    setChainForDeletion(undefined);
  });

  function renderInputActions() {
    const wrapperClassName = buildClassName(
      styles.inputButtonWrapper,
      isFocused && styles.inputButtonWrapperWithFocus,
    );

    return (
      <Transition className={styles.inputButtonTransition} activeKey={value.length ? 0 : 1} name="fade">
        {value.length ? (
          <div className={wrapperClassName}>
            <Button
              isSimple
              id={INPUT_CLEAR_BUTTON_ID}
              className={buildClassName(styles.inputButton, styles.inputButtonClear)}
              onClick={handleAddressClear}
              ariaLabel={lang('Clear')}
            >
              <i className="icon-close-filled" aria-hidden />
            </Button>
          </div>
        ) : (
          <div className={wrapperClassName}>
            {withQrButton && (
              <Button
                isSimple
                className={styles.inputButton}
                onClick={handleQrScanClick}
                ariaLabel={lang('Scan QR Code')}
              >
                <i className="icon-qr-scanner-alt" aria-hidden />
              </Button>
            )}
            {withPasteButton && (
              <Button isSimple className={styles.inputButton} onClick={handlePasteClick} ariaLabel={lang('Paste')}>
                <i className="icon-paste" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </Transition>
    );
  }

  return (
    <>
      {shouldShowAliasSelector && (
        <div className={styles.aliasSelector}>
          <Dropdown
            label={lang('Alias type')}
            items={aliasItems}
            selectedValue={aliasMode}
            menuPositionX="right"
            onChange={handleAliasModeChange}
          />
        </div>
      )}
      <Input
        id={inputId}
        ref={ref}
        className={buildClassName(isStatic && styles.inputStatic, withButton && styles.inputWithIcon)}
        isRequired
        isStatic={isStatic}
        isDisabled={isReadonly}
        label={label}
        placeholder={isTmailMode
          ? lang('Alias name')
          : (shouldShowAliasSelector ? lang('tmail or DNS') : lang('Wallet address or domain'))}
        value={displayValue}
        error={localError || error}
        autoCorrect={false}
        valueOverlay={!localError ? (isTmailMode ? undefined : addressOverlay) : undefined}
        onInput={hanldeInputChange}
        onPaste={handleAddressPaste}
        onKeyDown={handleKeyDown}
        onFocus={handleAddressFocus}
        onBlur={handleAddressBlur}
      >
        {!isReadonly && renderInputActions()}
      </Input>
      {shouldUseAddressBook && (
        <>
          <AddressBook
            isOpen={isAddressBookOpen}
            items={addressBookItems}
            menuRef={menuRef}
            activeIndex={activeIndex}
            onAddressSelect={handleAddressBookItemSelect}
            onSavedAddressDelete={handleDeleteSavedAddressClick}
            onClose={closeAddressBook}
          />
          <DeleteSavedAddressModal
            isOpen={Boolean(addressForDeletion)}
            address={addressForDeletion}
            chain={chainForDeletion}
            onClose={handleDeleteSavedAddressModalClose}
          />
        </>
      )}
    </>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  const currentAccountId = selectCurrentAccountId(global);
  const account = selectCurrentAccount(global);
  const accountState = selectCurrentAccountState(global);

  return {
    savedAddresses: accountState?.savedAddresses,
    supportedChains: account?.byChain,
    accounts: selectNetworkAccounts(global),
    currentAccountId,
    orderedAccountIds: global.settings.orderedAccountIds,
  };
})(AddressInput));

function cleanTonsiteAddress(address: string) {
  if (isTonsiteAddress(address)) {
    return getHostnameFromUrl(address);
  } else {
    return address;
  }
}
