import React, {
  memo, useEffect, useMemo, useRef, useState,
} from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type {
  NetworkRpcConfigItem,
  NetworkRpcFieldConfig,
  RpcTestResult,
} from '../../api/methods/networks';
import type { ApiChain, ApiNetwork } from '../../api/types';
import type { Layout } from '../../hooks/useMenuPosition';
import type { DropdownItem } from '../ui/Dropdown';

import buildClassName from '../../util/buildClassName';
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
};

type NetworkMenuHandler = 'edit' | 'enable' | 'disable';
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

function NetworkFieldForm({
  chain,
  network,
  field,
  onSaved,
}: {
  chain: ApiChain;
  network: ApiNetwork;
  field: NetworkRpcFieldConfig;
  onSaved: () => void;
}) {
  const lang = useLang();
  const [draftUrl, setDraftUrl] = useState(field.url);
  const [draftApiKey, setDraftApiKey] = useState(field.apiKey || '');
  const [isLoading, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<(RpcTestResult & { saved?: boolean }) | undefined>();
  const [isApiKeyUnlocked, setIsApiKeyUnlocked] = useState(false);
  const [isUnlockingApiKey, setIsUnlockingApiKey] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [sessionPassword, setSessionPassword] = useState<string | undefined>();
  /** When set, password form is for continuing a save (value = force flag). */
  const [pendingSaveForce, setPendingSaveForce] = useState<boolean | undefined>();

  const showApiKey = isSharedApiKeyEligible(chain, field.field);

  useEffect(() => {
    setDraftUrl(field.url);
    setDraftApiKey(field.apiKey || '');
  }, [field.url, field.apiKey]);

  const doSave = useLastCallback(async (force: boolean, password?: string) => {
    setIsSaving(true);
    setTestResult(undefined);
    const apiKeyToSave = showApiKey && isApiKeyUnlocked ? (draftApiKey || undefined) : undefined;
    const result = await callApi(
      'setRpcOverride',
      chain,
      network,
      field.field,
      draftUrl,
      apiKeyToSave,
      force,
      password,
    );
    setIsSaving(false);
    if (result) {
      setTestResult(result);
      if (result.saved) {
        onSaved();
      }
    }
  });

  const handleSave = useLastCallback(async (force = false) => {
    const needsPasswordForApiKey = showApiKey && isApiKeyUnlocked && Boolean(draftApiKey);
    if (needsPasswordForApiKey && !sessionPassword) {
      setPendingSaveForce(force);
      setIsUnlockingApiKey(true);
      return;
    }
    await doSave(force, sessionPassword);
  });

  const handleReset = useLastCallback(async () => {
    setIsSaving(true);
    await callApi('resetRpcOverride', chain, network, field.field);
    setIsSaving(false);
    setTestResult({ status: 'ok', saved: true });
    onSaved();
  });

  const handleUnlockApiKey = useLastCallback(async (password: string) => {
    setPasswordError(undefined);

    const unlock = await callApi('unlockRpcApiKey', chain, network, password, field.field);
    if (!unlock?.ok) {
      const isValid = await callApi('verifyPassword', password);
      if (!isValid) {
        setPasswordError(lang('Wrong password, please try again.'));
        return;
      }
    }

    setSessionPassword(password);
    if (unlock?.apiKey !== undefined) {
      setDraftApiKey(unlock.apiKey);
    }
    setIsApiKeyUnlocked(true);
    setIsUnlockingApiKey(false);

    if (pendingSaveForce !== undefined) {
      const force = pendingSaveForce;
      setPendingSaveForce(undefined);
      await doSave(force, password);
    }
  });

  return (
    <div className={styles.block}>
      <p className={styles.itemTitle} style="padding: 0.75rem 1rem 0;">
        {fieldLabel(field, lang)}
      </p>
      <p className={styles.itemSubtitle} style="padding: 0.25rem 1rem 0;">
        {field.isDefault
          ? (field.field === 'api' && !field.defaultUrl
            ? lang('Enhanced API disabled')
            : lang('Using default endpoint'))
          : lang('Using custom endpoint')}
      </p>
      {field.field === 'api' && field.isDefault && !field.defaultUrl && (
        <p className={styles.itemSubtitle} style="padding: 0.25rem 1rem 0;">
          {lang(
            'Enhanced features (activities, NFTs, live updates) are disabled. Add an API URL (+key) to enable them.',
          )}
        </p>
      )}
      <div style="padding: 0.75rem 1rem;">
        <Input
          label={fieldLabel(field, lang)}
          value={draftUrl}
          placeholder={apiFieldPlaceholder(chain, field)}
          onInput={setDraftUrl}
          isMultiline
        />
      </div>

      {showApiKey && (
        <div style="padding: 0 1rem 0.75rem;">
          {field.field === 'api' && (
            <div style="margin-bottom: 0.5rem; opacity: 0.8;">
              {field.isDefault && !field.defaultUrl
                ? lang('Paste an Alchemy-compatible enhanced API URL above, then optionally add your API key.')
                : lang('Leave empty to use the default enhanced API; add your own key for better reliability.')}
            </div>
          )}
          {!isApiKeyUnlocked ? (
            <Button isPrimary isSmall onClick={() => setIsUnlockingApiKey(true)}>
              {lang('Show API Key')}
            </Button>
          ) : (
            <Input
              label={field.field === 'api' ? lang('Enhanced API Key') : lang('API Key')}
              value={draftApiKey}
              type="password"
              placeholder={lang('Optional')}
              onInput={setDraftApiKey}
            />
          )}
        </div>
      )}

      {testResult?.status === 'unreachable' && (
        <p className={styles.itemSubtitle} style="color: var(--color-red); padding: 0 1rem;">
          {testResult.details || lang('Endpoint is unreachable')}
        </p>
      )}
      {testResult?.status === 'unexpected_response' && !testResult.saved && (
        <p className={styles.itemSubtitle} style="color: var(--color-orange); padding: 0 1rem;">
          {testResult.details || lang('Unexpected response from endpoint')}
        </p>
      )}
      {testResult?.saved && (
        <p className={styles.itemSubtitle} style="color: var(--color-green); padding: 0 1rem;">
          {lang('Saved')}
        </p>
      )}

      <div style="display: flex; gap: 0.5rem; padding: 0.75rem 1rem 1rem; flex-wrap: wrap;">
        <Button isPrimary isLoading={isLoading} onClick={() => handleSave(false)}>
          {lang('Save')}
        </Button>
        {testResult?.status === 'unexpected_response' && !testResult.saved && (
          <Button isLoading={isLoading} onClick={() => handleSave(true)}>
            {lang('Save Anyway')}
          </Button>
        )}
        {!field.isDefault && (
          <Button isLoading={isLoading} onClick={handleReset}>
            {lang('Reset to Default')}
          </Button>
        )}
      </div>

      {isUnlockingApiKey && (
        <div style="padding: 0 1rem 1rem;">
          <PasswordForm
            isActive
            error={passwordError}
            submitLabel={lang('Confirm')}
            cancelLabel={lang('Cancel')}
            onSubmit={handleUnlockApiKey}
            onCancel={() => setIsUnlockingApiKey(false)}
            onUpdate={() => setPasswordError(undefined)}
          />
        </div>
      )}
    </div>
  );
}

function NetworkListItem({
  item,
  canDisable,
  onSelect,
  onToggleVisibility,
}: {
  item: NetworkRpcConfigItem;
  canDisable: boolean;
  onSelect: (chain: ApiChain) => void;
  onToggleVisibility: (chain: ApiChain, isHidden: boolean) => void;
}) {
  const lang = useLang();
  const menuRef = useRef<HTMLDivElement>();
  const menuButtonRef = useRef<HTMLButtonElement>();
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | undefined>();
  const isMenuOpen = Boolean(menuAnchor);
  const status = getNetworkStatus(item);
  const isHidden = Boolean(item.isHidden);

  const menuItems = useMemo<DropdownItem<NetworkMenuHandler>[]>(() => [
    {
      value: 'edit',
      name: 'Edit Network',
    },
    {
      value: isHidden ? 'enable' : 'disable',
      name: isHidden ? 'Enable' : 'Disable',
      isDisabled: !isHidden && !canDisable,
    },
  ], [canDisable, isHidden]);

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

        {selected.fields.map((field) => (
          <NetworkFieldForm
            key={field.field}
            chain={selected.chain}
            network={network}
            field={field}
            onSaved={() => void reload()}
          />
        ))}

        <p className={styles.itemSubtitle} style="padding: 0 1rem 1rem;">
          {lang(
            'Custom endpoints that do not support indexer APIs may disable NFT and activity features for this network.',
          )}
        </p>
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
  return {
    network: global.settings.isTestnet ? 'testnet' : 'mainnet',
  };
})(SettingsNetworks));
