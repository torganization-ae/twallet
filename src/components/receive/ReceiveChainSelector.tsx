import React, { memo, useMemo, useRef, useState } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { ApiChain } from '../../api/types';
import type { IAnchorPosition } from '../../global/types';
import type { DropdownItem } from '../ui/Dropdown';
import { SettingsState } from '../../global/types';

import buildClassName from '../../util/buildClassName';
import { getChainTitle } from '../../util/chain';
import getChainNetworkIcon from '../../util/swap/getChainNetworkIcon';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import DropdownMenu from '../ui/DropdownMenu';

import dropdownStyles from '../ui/Dropdown.module.scss';
import styles from './ReceiveModal.module.scss';

const NETWORKS_VALUE = '__networks__' as const;

type MenuValue = ApiChain | typeof NETWORKS_VALUE;

type OwnProps = {
  chains: ApiChain[];
  selectedChain: ApiChain;
};

function ReceiveChainSelector({ chains, selectedChain }: OwnProps) {
  const { setReceiveActiveTab, closeReceiveModal, openSettingsWithState } = getActions();
  const lang = useLang();

  const menuRef = useRef<HTMLDivElement>();
  const buttonRef = useRef<HTMLButtonElement>();
  const [menuAnchor, setMenuAnchor] = useState<IAnchorPosition | undefined>();
  const isMenuOpen = Boolean(menuAnchor);

  const items = useMemo<DropdownItem<MenuValue>[]>(() => {
    const chainItems: DropdownItem<MenuValue>[] = chains.map((chain) => ({
      value: chain,
      name: getChainTitle(chain),
      icon: getChainNetworkIcon(chain),
      noTranslate: true,
    }));

    chainItems.push({
      value: NETWORKS_VALUE,
      name: lang('Networks') as string,
      icon: <i className={styles.networksMenuIcon} aria-hidden />,
      // Default item separator is a 1px hairline; `withDelimiter` is a thick section bar.
      noTranslate: true,
    });

    return chainItems;
  }, [chains, lang]);

  const getTriggerElement = useLastCallback(() => buttonRef.current);
  const getRootElement = useLastCallback(() => document.body);
  const getMenuElement = useLastCallback(() => menuRef.current);
  const getLayout = useLastCallback(() => ({ withPortal: true }));
  const closeMenu = useLastCallback(() => setMenuAnchor(undefined));

  const handleButtonClick = useLastCallback(() => {
    if (isMenuOpen) {
      closeMenu();
      return;
    }

    const rect = buttonRef.current!.getBoundingClientRect();
    setMenuAnchor({ x: rect.left, y: rect.bottom });
  });

  const handleSelect = useLastCallback((value: MenuValue) => {
    if (value === NETWORKS_VALUE) {
      closeReceiveModal();
      openSettingsWithState({ state: SettingsState.Networks });
      return;
    }

    if (value !== selectedChain) {
      setReceiveActiveTab({ chain: value });
    }
  });

  if (!chains.length) {
    return undefined;
  }

  return (
    <div className={styles.chainSelector}>
      <button
        ref={buttonRef}
        type="button"
        className={buildClassName(
          dropdownStyles.button,
          dropdownStyles.interactive,
          dropdownStyles.inherit,
          styles.chainSelectorButton,
        )}
        aria-label={getChainTitle(selectedChain)}
        onClick={handleButtonClick}
      >
        <img
          src={getChainNetworkIcon(selectedChain)}
          alt=""
          className={styles.chainSelectorIcon}
        />
        <span className={styles.chainSelectorName}>
          {getChainTitle(selectedChain)}
        </span>
        <i
          className={buildClassName(dropdownStyles.buttonIcon, 'icon-chevron-down')}
          aria-hidden
        />
      </button>
      <DropdownMenu
        isOpen={isMenuOpen}
        ref={menuRef}
        items={items}
        selectedValue={selectedChain}
        withPortal
        menuPositionX="left"
        menuAnchor={menuAnchor}
        getTriggerElement={getTriggerElement}
        getRootElement={getRootElement}
        getMenuElement={getMenuElement}
        getLayout={getLayout}
        onSelect={handleSelect}
        onClose={closeMenu}
      />
    </div>
  );
}

export default memo(ReceiveChainSelector);
