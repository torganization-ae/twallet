import type { ElementRef } from '../../../../lib/teact/teact';
import React, { memo } from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import type { ApiChain } from '../../../../api/types';
import type { IAnchorPosition } from '../../../../global/types';
import type { Layout } from '../../../../hooks/useMenuPosition';
import { SettingsState } from '../../../../global/types';

import { TON_ONLY } from '../../../../config';
import buildClassName from '../../../../util/buildClassName';
import { getChainConfig, getChainTitle } from '../../../../util/chain';
import { copyTextToClipboard } from '../../../../util/clipboard';
import { stopEvent } from '../../../../util/domEvents';
import { shortenDomain } from '../../../../util/shortenDomain';
import { IS_TOUCH_ENV } from '../../../../util/windowEnvironment';

import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import Menu from '../../../ui/Menu';

import menuStyles from '../../../ui/Dropdown.module.scss';
import styles from './Card.module.scss';

interface MenuItem {
  value: string;
  address: string;
  domain?: string;
  icon: string;
  fontIcon: string;
  chain: ApiChain;
  label: string;
}

interface OwnProps {
  isOpen: boolean;
  anchor?: IAnchorPosition;
  items: MenuItem[];
  menuRef: ElementRef<HTMLDivElement>;
  onClose: NoneToVoidFunction;
  onExplorerClick: (chain: ApiChain, address: string) => void;
  onMouseEnter?: NoneToVoidFunction;
  onMouseLeave?: NoneToVoidFunction;
  getTriggerElement: () => HTMLElement | undefined | null;
  getRootElement: () => HTMLElement | undefined | null;
  getMenuElement: () => HTMLElement | undefined | null;
  getLayout: () => Layout;
}

const FULL_DOMAIN_LENGTH = 20;

function AddressMenu({
  isOpen,
  anchor,
  items,
  menuRef,
  onClose,
  onExplorerClick,
  onMouseEnter,
  onMouseLeave,
  getTriggerElement,
  getRootElement,
  getMenuElement,
  getLayout,
}: OwnProps) {
  const { showToast, openSettingsWithState } = getActions();

  const lang = useLang();

  const handleItemClick = useLastCallback((value: string, kind: 'address' | 'domain', chain: ApiChain) => {
    const message = kind === 'domain'
      ? lang('%chain% Domain Copied', { chain: getChainTitle(chain) }) as string
      : lang('%chain% Address Copied', { chain: getChainTitle(chain) }) as string;
    showToast({
      message,
      icon: 'icon-copy',
    });
    void copyTextToClipboard(value);
    onClose();
  });

  const handleNetworksClick = useLastCallback((e: React.MouseEvent) => {
    stopEvent(e);
    openSettingsWithState({ state: SettingsState.Networks });
    onClose();
  });

  if (!items.length) return undefined;

  return (
    <Menu
      menuRef={menuRef}
      isOpen={isOpen}
      type="dropdown"
      withPortal
      getTriggerElement={getTriggerElement}
      getRootElement={getRootElement}
      getMenuElement={getMenuElement}
      getLayout={getLayout}
      anchor={anchor}
      bubbleClassName={buildClassName(styles.addressMenuBubble, !isOpen && styles.notActive)}
      noBackdrop={!IS_TOUCH_ENV}
      onMouseEnter={!IS_TOUCH_ENV ? onMouseEnter : undefined}
      onMouseLeave={!IS_TOUCH_ENV ? onMouseLeave : undefined}
      onClose={onClose}
    >
      {items.map((item, index) => (
        <MenuItem
          key={item.value}
          item={item}
          index={index}
          onItemClick={handleItemClick}
          onExplorerClick={onExplorerClick}
          onMenuClose={onClose}
        />
      ))}
      {!TON_ONLY && <NetworksButton onClick={handleNetworksClick} lang={lang} />}
    </Menu>
  );
}

export default memo(AddressMenu);

function MenuItem({
  item,
  index,
  onItemClick,
  onExplorerClick,
  onMenuClose,
}: {
  item: MenuItem;
  index: number;
  onItemClick: (address: string, kind: 'address' | 'domain', chain: ApiChain) => void;
  onExplorerClick: (chain: ApiChain, address: string) => void;
  onMenuClose: NoneToVoidFunction;
}) {
  const hasDomain = !!item.domain;
  const itemClassName = buildClassName(
    menuStyles.item,
    index > 0 && menuStyles.separator,
    styles.menuItem,
  );
  const copyIconClassName = buildClassName(
    `icon icon-${item.fontIcon}`,
    menuStyles.fontIcon,
    styles.menuFontIcon,
  );

  const handleItemClick = (e: React.MouseEvent) => {
    if (hasDomain) {
      onItemClick(item.domain!, 'domain', item.chain);
    } else {
      onItemClick(item.value, 'address', item.chain);
    }
  };

  const handleAddressClick = (e: React.MouseEvent) => {
    stopEvent(e);
    onItemClick(item.value, 'address', item.chain);
  };

  const handleExplorerClick = (e: React.MouseEvent) => {
    stopEvent(e);
    onMenuClose();
    onExplorerClick(item.chain, item.value);
  };

  return (
    <div role="button" tabIndex={0} onClick={handleItemClick} className={itemClassName}>
      <img
        src={item.icon}
        alt=""
        className={buildClassName('icon', menuStyles.itemIcon, styles.menuIcon)}
      />
      <div className={styles.menuItemContent}>
        <div className={buildClassName(menuStyles.itemName, styles.menuItemName)}>
          {hasDomain ? (
            <span className={styles.domainText}>
              {shortenDomain(item.domain!, FULL_DOMAIN_LENGTH)}
            </span>
          ) : (<span>{item.address}</span>)}
          <i className={copyIconClassName} aria-hidden />
        </div>

        <div className={styles.chainRow}>
          {hasDomain ? (
            <>
              <span
                tabIndex={0}
                role="button"
                className={styles.addressText}
                onClick={handleAddressClick}
              >
                {item.address}
              </span>
              <span className={styles.separator}>·</span>
              {item.chain.toUpperCase()}
            </>
          ) : (
            getChainConfig(item.chain).title
          )}
        </div>
      </div>
      <i
        tabIndex={0}
        role="button"
        className={buildClassName('icon icon-tonexplorer-small', styles.menuExplorerIcon)}
        aria-label={item.label}
        onClick={handleExplorerClick}
      />
    </div>
  );
}

function NetworksButton({
  onClick,
  lang,
}: {
  onClick: (e: React.MouseEvent) => void;
  lang: ReturnType<typeof useLang>;
}) {
  return (
    <button
      type="button"
      className={buildClassName(menuStyles.item, styles.menuItem)}
      onClick={onClick}
    >
      <i className={styles.networksMenuIcon} aria-hidden />
      <span className={buildClassName(menuStyles.itemName, styles.menuItemName)}>
        {lang('Networks')}
      </span>
    </button>
  );
}
