import type { ElementRef } from '../../../../lib/teact/teact';
import React, {
  memo, useLayoutEffect, useMemo, useRef,
} from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import type { IAnchorPosition } from '../../../../global/types';
import type { DropdownItem } from '../../../ui/Dropdown';

import { MINT_APP_URL, TMAIL_APP_URL } from '../../../../config';
import buildClassName from '../../../../util/buildClassName';
import { clamp } from '../../../../util/math';
import { openSite } from '../../../explore/helpers/utils';

import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import DropdownMenu from '../../../ui/DropdownMenu';

import dropdownStyles from '../../../ui/Dropdown.module.scss';
import styles from './ProductChooserMenu.module.scss';

import tmailLogo from '../../../../assets/tmail-logo.svg';

type ProductId = 'tmail' | 'mint';

interface OwnProps {
  isOpen: boolean;
  triggerRef: ElementRef;
  onClose: NoneToVoidFunction;
}

const VIEWPORT_PADDING_PX = 16;
const GAP_PX = 8;
const FALLBACK_MENU_WIDTH_PX = 176;
const FALLBACK_MENU_HEIGHT_PX = 120;

function getMenuPosition(
  triggerEl: HTMLElement,
  menuEl?: HTMLElement | null,
): IAnchorPosition {
  const trigger = triggerEl.getBoundingClientRect();
  const width = menuEl?.offsetWidth || FALLBACK_MENU_WIDTH_PX;
  const height = menuEl?.offsetHeight || FALLBACK_MENU_HEIGHT_PX;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const x = clamp(
    trigger.left + trigger.width / 2 - width / 2,
    VIEWPORT_PADDING_PX,
    Math.max(VIEWPORT_PADDING_PX, viewportWidth - width - VIEWPORT_PADDING_PX),
  );

  // Prefer above the TMail control; fall back below only if there is no room.
  const topAbove = trigger.top - height - GAP_PX;
  const y = topAbove >= VIEWPORT_PADDING_PX
    ? topAbove
    : clamp(
      trigger.bottom + GAP_PX,
      VIEWPORT_PADDING_PX,
      Math.max(VIEWPORT_PADDING_PX, viewportHeight - height - VIEWPORT_PADDING_PX),
    );

  return { x, y };
}

function ProductChooserMenu({
  isOpen,
  triggerRef,
  onClose,
}: OwnProps) {
  const lang = useLang();
  const menuRef = useRef<HTMLDivElement>();

  const items = useMemo<DropdownItem<ProductId>[]>(() => [
    {
      value: 'tmail',
      name: lang('TMail'),
      icon: tmailLogo,
      noTranslate: true,
    },
    {
      value: 'mint',
      name: lang('Mint'),
      icon: (
        <span className={buildClassName('icon', dropdownStyles.itemIcon, styles.itemIcon)}>
          <span className={styles.mintBadge} aria-hidden>M</span>
        </span>
      ),
      noTranslate: true,
    },
  ], [lang]);

  // Menu's useMenuPosition only runs when `isOpen` flips and won't re-apply when
  // the anchor changes — pin the portal wrapper to the TMail trigger ourselves.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    const containerEl = menuEl?.parentElement;
    if (!triggerEl || !containerEl) return;

    const { x, y } = getMenuPosition(triggerEl, menuEl);
    containerEl.style.cssText = `left: ${x}px; top: ${y}px`;
  }, [isOpen, triggerRef, items]);

  const handleSelect = useLastCallback((value: ProductId) => {
    onClose();

    const url = value === 'tmail' ? TMAIL_APP_URL : MINT_APP_URL;
    const title = value === 'tmail' ? lang('TMail') : lang('Mint');

    getActions().switchToExplore();
    openSite(url, undefined, title);
  });

  const menuAnchor = isOpen && triggerRef.current
    ? getMenuPosition(triggerRef.current, menuRef.current)
    : undefined;

  return (
    <DropdownMenu
      withPortal
      ref={menuRef}
      isOpen={isOpen}
      items={items}
      menuAnchor={menuAnchor}
      menuPositionX="left"
      menuPositionY="top"
      bubbleClassName={styles.bubble}
      buttonClassName={styles.item}
      iconClassName={styles.itemIcon}
      onClose={onClose}
      onSelect={handleSelect}
    />
  );
}

export default memo(ProductChooserMenu);
