import React, {
  memo, useEffect, useMemo, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type {
  NetworkRpcConfigItem,
  NetworkRpcFieldConfig,
  RpcTestResult,
} from '../../api/methods/networks';
import type { ApiChain, ApiNetwork } from '../../api/types';
import type { Layout } from '../../hooks/useMenuPosition';
import type { DropdownItem } from '../ui/Dropdown';

import { selectCurrentAccount } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { getChainTitle } from '../../util/chain';
import { copyTextToClipboard } from '../../util/clipboard';
import { stopEvent } from '../../util/domEvents';
import getChainNetworkIcon from '../../util/swap/getChainNetworkIcon';
import { callApi } from '../../api';
import { isSharedApiKeyEligible } from '../../api/chains/networksConfig';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useScrolledState from '../../hooks/useScrolledState';

import Button from '../ui/Button';
import DropdownMenu from '../ui/DropdownMenu';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import PasswordForm from '../ui/PasswordForm';
import Spinner from '../ui/Spinner';
import Switcher from '../ui/Switcher';
import SettingsHeader from './SettingsHeader';

import styles from './Settings.module.scss';

type OwnProps = {
  isActive?: boolean;
  onBackClick: NoneToVoidFunction;
};

type StateProps = {
  network: ApiNetwork;
  addressesByChain?: Partial<Record<ApiChain, string>>;
};

type NetworkMenuHandler = 'edit' | 'enable' | 'disable' | 'copyAddress' | 'showQr';
type NetworkStatus = 'active' | 'inactive' | 'warning';

function hostLabel(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function fieldLabel(field: NetworkRpcFieldConfig, lang: ReturnType<typeof useLang>) {
  return field.field === 'api' ? lang('API URL') : lang('RPC URL');
}

function canUseEnhancedApiKey(chain: ApiChain, field: NetworkRpcFieldConfig['field']) {
  return isSharedApiKeyEligible(chain, field);
}

function getNetworkStatus(item: NetworkRpcConfigItem): NetworkStatus {
  const primaryUrl = item.fields[0]?.url?.trim() ?? '';
  if (item.isHidden) {
    return 'inactive';
  }
  if (!primaryUrl) {
    return 'warning';
  }
  return 'active';
}

function endpointSubtitle(item: NetworkRpcConfigItem, lang: ReturnType<typeof useLang>) {
  const primary = item.fields[0];
  if (!primary) {
    return lang('No endpoint');
  }
  if (!primary.url.trim()) {
    return lang('No endpoint');
  }
  return hostLabel(primary.url) || primary.url;
}

const EVM_API_PLACEHOLDER = 'https://eth-mainnet.g.alchemy.io/v2/';

function apiFieldPlaceholder(chain: ApiChain, field: NetworkRpcFieldConfig) {
  if (field.field === 'api' && field.isDefault && !field.defaultUrl && canUseEnhancedApiKey(chain, 'api')) {
    return EVM_API_PLACEHOLDER;
  }
  return field.defaultUrl || undefined;
}

type FieldDraft = {
  url: string;
  apiKey: string;
  isApiKeyUnlocked: boolean;
  testResult?: RpcTestResult & { saved?: boolean };
};

function draftsFromFields(fields: NetworkRpcFieldConfig[]): Record<string, FieldDraft> {
  return Object.fromEntries(fields.map((field) => [
    field.field,
    {
      url: field.url,
      apiKey: '',
      // Locked until eye-unlock when a stored key exists; empty keys are editable immediately
      isApiKeyUnlocked: !field.hasApiKey,
      testResult: undefined,
    } satisfies FieldDraft,
  ]));
}

function NetworkFieldForm({
  chain,
  field,
  draft,
  onUrlChange,
  onApiKeyChange,
  onRequestUnlock,
  onReset,
  isLoading,
}: {
  chain: ApiChain;
  field: NetworkRpcFieldConfig;
  draft: FieldDraft;
  onUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onRequestUnlock: NoneToVoidFunction;
  onReset: NoneToVoidFunction;
  isLoading: boolean;
}) {
  const lang = useLang();
  const { testResult } = draft;
  const isKeyLocked = Boolean(field.hasApiKey) && !draft.isApiKeyUnlocked;

  return (
    <div className={styles.block}>
      <p className={styles.itemTitle} style="padding: 0.75rem 1rem 0;">
        {fieldLabel(field, lang)}
      </p>
      <div style="padding: 0.75rem 1rem 0;">
        <Input
          value={draft.url}
          placeholder={apiFieldPlaceholder(chain, field)}
          onInput={onUrlChange}
          isMultiline
          isStatic
        />
      </div>

      <div className={styles.apiKeyField}>
        <p className={styles.itemTitle} style="padding: 0 0 0.5rem;">
          {lang('API Key')}
        </p>
        <div className={styles.apiKeyInputRow}>
          {isKeyLocked ? (
            <>
              <Input
                value=""
                placeholder="••••••••"
                isDisabled
                onInput={() => {}}
                isStatic
                wrapperClassName={styles.apiKeyInput}
              />
              <button
                type="button"
                className={styles.apiKeyEyeButton}
                aria-label={lang('Show API Key')}
                onClick={onRequestUnlock}
              >
                <i className="icon-eye" aria-hidden />
              </button>
            </>
          ) : (
            <Input
              value={draft.apiKey}
              type="password"
              placeholder={lang('Optional')}
              onInput={onApiKeyChange}
              isStatic
              wrapperClassName={styles.apiKeyInput}
            />
          )}
        </div>
      </div>

      {testResult?.status === 'unreachable' && (
        <p className={styles.itemSubtitle} style="color: var(--color-red); padding: 0 1rem 0.75rem;">
          {testResult.details || lang('Endpoint is unreachable')}
        </p>
      )}
      {testResult?.status === 'unexpected_response' && !testResult.saved && (
        <p className={styles.itemSubtitle} style="color: var(--color-orange); padding: 0 1rem 0.75rem;">
          {testResult.details || lang('Unexpected response from endpoint')}
        </p>
      )}
      {testResult?.saved && (
        <p className={styles.itemSubtitle} style="color: var(--color-green); padding: 0 1rem 0.75rem;">
          {lang('Saved')}
        </p>
      )}

      {!field.isDefault && (
        <div className={styles.fullWidthButtons} style="padding-top: 0;">
          <Button isLoading={isLoading} className={styles.fullWidthButton} onClick={onReset}>
            {lang('Reset to Default')}
          </Button>
        </div>
      )}
    </div>
  );
}

function NetworkFieldsEditor({
  chain,
  network,
  fields,
  onSaved,
}: {
  chain: ApiChain;
  network: ApiNetwork;
  fields: NetworkRpcFieldConfig[];
  onSaved: () => void;
}) {
  const lang = useLang();
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>(() => draftsFromFields(fields));
  const [isLoading, setIsSaving] = useState(false);
  const [unlockingField, setUnlockingField] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [sessionPassword, setSessionPassword] = useState<string | undefined>();
  const [pendingSaveForce, setPendingSaveForce] = useState<boolean | undefined>();

  useEffect(() => {
    setDrafts((prev) => Object.fromEntries(fields.map((field) => {
      const prevDraft = prev[field.field];
      const wasUnlocked = Boolean(prevDraft?.isApiKeyUnlocked);
      return [
        field.field,
        {
          url: field.url,
          apiKey: wasUnlocked ? (prevDraft?.apiKey || '') : '',
          isApiKeyUnlocked: wasUnlocked || !field.hasApiKey,
          testResult: prevDraft?.testResult,
        } satisfies FieldDraft,
      ];
    })));
  }, [fields]);

  const updateDraft = useLastCallback((fieldKey: string, patch: Partial<FieldDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], ...patch },
    }));
  });

  const fieldsNeedingPassword = useLastCallback(() => {
    return fields.filter((field) => {
      const draft = drafts[field.field];
      return draft?.isApiKeyUnlocked && Boolean(draft.apiKey);
    });
  });

  const doSaveAll = useLastCallback(async (force: boolean, password?: string) => {
    setIsSaving(true);
    const nextDrafts = { ...drafts };

    for (const field of fields) {
      const draft = nextDrafts[field.field];
      if (!draft) continue;

      const apiKeyToSave = draft.isApiKeyUnlocked
        ? draft.apiKey
        : undefined;
      const result = await callApi(
        'setRpcOverride',
        chain,
        network,
        field.field,
        draft.url,
        apiKeyToSave,
        force,
        password,
      );
      if (result) {
        nextDrafts[field.field] = { ...draft, testResult: result };
      }
    }

    setDrafts(nextDrafts);
    setIsSaving(false);
    const allSaved = fields.every((field) => nextDrafts[field.field]?.testResult?.saved);
    if (allSaved) {
      onSaved();
    }
  });

  const handleSaveAll = useLastCallback(async (force = false) => {
    const needingPassword = fieldsNeedingPassword();
    if (needingPassword.length > 0 && !sessionPassword) {
      setPendingSaveForce(force);
      setUnlockingField(needingPassword[0].field);
      return;
    }
    await doSaveAll(force, sessionPassword);
  });

  const handleReset = useLastCallback(async (fieldKey: string) => {
    setIsSaving(true);
    await callApi('resetRpcOverride', chain, network, fieldKey as NetworkRpcFieldConfig['field']);
    setIsSaving(false);
    updateDraft(fieldKey, {
      testResult: { status: 'ok', saved: true },
      apiKey: '',
      isApiKeyUnlocked: true,
    });
    onSaved();
  });

  const handleUnlockApiKey = useLastCallback(async (password: string) => {
    if (!unlockingField) return;
    setPasswordError(undefined);

    const unlock = await callApi(
      'unlockRpcApiKey',
      chain,
      network,
      password,
      unlockingField as NetworkRpcFieldConfig['field'],
    );
    if (!unlock?.ok) {
      const isValid = await callApi('verifyPassword', password);
      if (!isValid) {
        setPasswordError(lang('Wrong password, please try again.'));
        return;
      }
    }

    setSessionPassword(password);
    updateDraft(unlockingField, {
      isApiKeyUnlocked: true,
      ...(unlock?.apiKey !== undefined ? { apiKey: unlock.apiKey } : undefined),
    });
    setUnlockingField(undefined);

    if (pendingSaveForce !== undefined) {
      const force = pendingSaveForce;
      setPendingSaveForce(undefined);
      await doSaveAll(force, password);
    }
  });

  const showSaveAnyway = fields.some((field) => {
    const result = drafts[field.field]?.testResult;
    return result?.status === 'unexpected_response' && !result.saved;
  });

  return (
    <>
      {fields.map((field) => {
        const draft = drafts[field.field];
        if (!draft) return undefined;

        return (
          <NetworkFieldForm
            key={field.field}
            chain={chain}
            field={field}
            draft={draft}
            onUrlChange={(value) => updateDraft(field.field, { url: value })}
            onApiKeyChange={(value) => updateDraft(field.field, { apiKey: value })}
            onRequestUnlock={() => setUnlockingField(field.field)}
            onReset={() => void handleReset(field.field)}
            isLoading={isLoading}
          />
        );
      })}

      <div className={styles.fullWidthButtons}>
        <Button
          isPrimary
          isLoading={isLoading}
          className={styles.fullWidthButton}
          onClick={() => handleSaveAll(false)}
        >
          {lang('Save')}
        </Button>
        {showSaveAnyway && (
          <Button
            isLoading={isLoading}
            className={styles.fullWidthButton}
            onClick={() => handleSaveAll(true)}
          >
            {lang('Save Anyway')}
          </Button>
        )}
      </div>

      <Modal
        isOpen={Boolean(unlockingField)}
        title={lang('Enter Password')}
        onClose={() => {
          setUnlockingField(undefined);
          setPendingSaveForce(undefined);
          setPasswordError(undefined);
        }}
      >
        <PasswordForm
          isActive={Boolean(unlockingField)}
          error={passwordError}
          submitLabel={lang('Confirm')}
          cancelLabel={lang('Cancel')}
          isFullWidthButton
          onSubmit={handleUnlockApiKey}
          onCancel={() => {
            setUnlockingField(undefined);
            setPendingSaveForce(undefined);
          }}
          onUpdate={() => setPasswordError(undefined)}
        />
      </Modal>
    </>
  );
}

function NetworkListItem({
  item,
  address,
  canDisable,
  onSelect,
  onToggleVisibility,
}: {
  item: NetworkRpcConfigItem;
  address?: string;
  canDisable: boolean;
  onSelect: (chain: ApiChain) => void;
  onToggleVisibility: (chain: ApiChain, isHidden: boolean) => void;
}) {
  const { showToast, openReceiveModal } = getActions();
  const lang = useLang();
  const menuRef = useRef<HTMLDivElement>();
  const menuButtonRef = useRef<HTMLButtonElement>();
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | undefined>();
  const isMenuOpen = Boolean(menuAnchor);
  const status = getNetworkStatus(item);
  const isHidden = Boolean(item.isHidden);
  const hasWalletAddress = Boolean(address);

  const menuItems = useMemo<DropdownItem<NetworkMenuHandler>[]>(() => {
    const items: DropdownItem<NetworkMenuHandler>[] = [
      {
        value: 'edit',
        name: 'Edit Network',
        fontIcon: 'pen',
      },
      {
        value: isHidden ? 'enable' : 'disable',
        name: isHidden ? 'Enable' : 'Disable',
        fontIcon: isHidden ? 'eye' : 'eye-closed',
        isDisabled: !isHidden && !canDisable,
      },
    ];

    if (hasWalletAddress) {
      items.push(
        {
          value: 'copyAddress',
          name: 'Copy Address',
          fontIcon: 'copy',
        },
        {
          value: 'showQr',
          name: 'Show Wallet QR',
          fontIcon: 'qr-code',
        },
      );
    }

    return items;
  }, [canDisable, hasWalletAddress, isHidden]);

  const getTriggerElement = useLastCallback(() => menuButtonRef.current);
  const getRootElement = useLastCallback(() => document.body);
  const getMenuElement = useLastCallback(() => menuRef.current);
  const getLayout = useLastCallback((): Layout => ({
    withPortal: true,
    preferredPositionX: 'right',
  }));

  const closeMenu = useLastCallback(() => setMenuAnchor(undefined));

  const handleMenuSelect = useLastCallback((value: NetworkMenuHandler) => {
    if (value === 'edit') {
      onSelect(item.chain);
      return;
    }
    if (value === 'copyAddress') {
      if (!address) return;
      void copyTextToClipboard(address);
      showToast({
        message: lang('%chain% Address Copied', { chain: getChainTitle(item.chain) }) as string,
        icon: 'icon-copy',
      });
      return;
    }
    if (value === 'showQr') {
      openReceiveModal({ chain: item.chain });
      return;
    }
    if (value === 'disable' && !canDisable) {
      return;
    }
    onToggleVisibility(item.chain, value === 'disable');
  });

  const handleMenuClick = useLastCallback((e: React.MouseEvent) => {
    stopEvent(e);
    if (isMenuOpen) {
      closeMenu();
      return;
    }

    const button = menuButtonRef.current;
    if (!button) return;

    const { right: x, y, height } = button.getBoundingClientRect();
    setMenuAnchor({ x, y: y + height });
  });

  return (
    <div
      className={buildClassName(styles.item, styles.itemMenu)}
      onClick={() => onSelect(item.chain)}
    >
      <div className={styles.networkIconWrap}>
        <img className={styles.menuIcon} src={getChainNetworkIcon(item.chain)} alt="" />
        <span
          className={buildClassName(styles.networkStatusDot, styles[`networkStatusDot_${status}`])}
          aria-hidden
        />
      </div>
      <div className={styles.itemContent}>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemSubtitle}>{endpointSubtitle(item, lang)}</span>
      </div>
      <button
        ref={menuButtonRef}
        type="button"
        className={styles.networkMenuButton}
        aria-label={lang('Network Menu')}
        onClick={handleMenuClick}
      >
        <i className="icon-menu-dots" aria-hidden />
      </button>
      <DropdownMenu
        isOpen={isMenuOpen}
        ref={menuRef}
        withPortal
        menuAnchor={menuAnchor}
        menuPositionX="right"
        getTriggerElement={getTriggerElement}
        getRootElement={getRootElement}
        getMenuElement={getMenuElement}
        getLayout={getLayout}
        items={menuItems}
        shouldTranslateOptions
        shouldCleanup
        onClose={closeMenu}
        onSelect={handleMenuSelect}
      />
    </div>
  );
}

function SettingsNetworks({
  isActive,
  network,
  addressesByChain,
  onBackClick,
}: OwnProps & StateProps) {
  const lang = useLang();
  const [items, setItems] = useState<NetworkRpcConfigItem[]>([]);
  const [selectedChain, setSelectedChain] = useState<ApiChain | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useHistoryBack({
    isActive,
    onBack: selectedChain ? () => setSelectedChain(undefined) : onBackClick,
  });

  const reload = useLastCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    const result = await callApi('getRpcConfig', network);
    setItems(result || []);
    setIsLoading(false);
  });

  const toggleChainVisibility = useLastCallback(async (chain: ApiChain, isHidden: boolean) => {
    const result = await callApi('setChainVisibility', chain, network, isHidden);
    if (result && 'ok' in result && !result.ok) {
      return;
    }
    await reload({ silent: true });
  });

  useEffect(() => {
    if (isActive) {
      void reload();
    }
  }, [isActive, network, reload]);

  const selected = items.find((item) => item.chain === selectedChain);
  const visibleCount = useMemo(
    () => items.reduce((count, item) => (item.isHidden ? count : count + 1), 0),
    [items],
  );
  const canToggleVisibility = Boolean(selected && (selected.isHidden || visibleCount > 1));

  const handleSelectChain = useLastCallback((chain: ApiChain) => {
    setSelectedChain(chain);
  });

  const handleBack = useLastCallback(() => {
    if (selectedChain) {
      setSelectedChain(undefined);
      void reload();
      return;
    }
    onBackClick();
  });

  const handleVisibilityToggle = useLastCallback(() => {
    if (!selected) return;
    if (!selected.isHidden && visibleCount <= 1) {
      return;
    }
    void toggleChainVisibility(selected.chain, !selected.isHidden);
  });

  const { isScrolled, handleScroll: handleContentScroll } = useScrolledState();

  function renderList() {
    return (
      <>
        <p className={styles.blockTitle}>{lang('RPC and API endpoints')}</p>
        <div className={styles.block}>
          {items.map((item) => (
            <NetworkListItem
              key={item.chain}
              item={item}
              address={addressesByChain?.[item.chain]}
              canDisable={Boolean(item.isHidden) || visibleCount > 1}
              onSelect={handleSelectChain}
              onToggleVisibility={(chain, isHidden) => {
                void toggleChainVisibility(chain, isHidden);
              }}
            />
          ))}
        </div>
      </>
    );
  }

  function renderDetail() {
    if (!selected) return undefined;

    return (
      <>
        <div className={styles.block}>
          <div
            className={buildClassName(
              styles.item,
              styles.item_small,
              !canToggleVisibility && styles.item_nonInteractive,
            )}
            onClick={canToggleVisibility ? handleVisibilityToggle : undefined}
          >
            <span className={styles.itemTitle}>{lang('Show in wallet')}</span>
            <Switcher
              className={styles.menuSwitcher}
              label={lang('Show in wallet')}
              checked={!selected.isHidden}
            />
          </div>
        </div>
        {!canToggleVisibility && (
          <p className={styles.itemSubtitle} style="padding: 0 1rem 0.75rem;">
            {lang('At least one network must stay enabled.')}
          </p>
        )}

        <NetworkFieldsEditor
          key={selected.chain}
          chain={selected.chain}
          network={network}
          fields={selected.fields}
          onSaved={() => void reload()}
        />
      </>
    );
  }

  return (
    <div className={styles.slide}>
      <SettingsHeader
        title={selected ? selected.title : lang('Networks')}
        isScrolled={isScrolled}
        onBackClick={handleBack}
      />

      <div className={buildClassName(styles.content, 'custom-scroll')} onScroll={handleContentScroll}>
        {isLoading && (
          <div style="display: flex; justify-content: center; padding: 2rem;">
            <Spinner />
          </div>
        )}
        {!isLoading && !selectedChain && renderList()}
        {!isLoading && selectedChain && renderDetail()}
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  const account = selectCurrentAccount(global);
  const addressesByChain = account
    ? Object.fromEntries(
      Object.entries(account.byChain).map(([chain, info]) => [chain, info.address]),
    ) as Partial<Record<ApiChain, string>>
    : undefined;

  return {
    network: global.settings.isTestnet ? 'testnet' : 'mainnet',
    addressesByChain,
  };
})(SettingsNetworks));
