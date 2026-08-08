import { type ElementRef, useMemo } from '../../../../../lib/teact/teact';
import { getActions } from '../../../../../global';

import type { UserToken } from '../../../../../global/types';
import type { DropdownItem } from '../../../../ui/Dropdown';
import { SettingsState } from '../../../../../global/types';

import {
  DEFAULT_SWAP_FIRST_TOKEN_SLUG,
  DEFAULT_SWAP_SECOND_TOKEN_SLUG,
} from '../../../../../config';
import { vibrate } from '../../../../../util/haptics';
import { compact } from '../../../../../util/iteratees';
import { getIsServiceToken } from '../../../../../util/tokens';

import useContextMenuHandlers from '../../../../../hooks/useContextMenuHandlers';
import useLastCallback from '../../../../../hooks/useLastCallback';

export type MenuHandler = 'add' | 'send' | 'swap' | 'pin' | 'settings';

function useTokenContextMenu(ref: ElementRef<HTMLButtonElement>, options: {
  isPortrait?: boolean;
  withContextMenu?: boolean;
  token: UserToken;
  isSwapDisabled?: boolean;
  isViewMode?: boolean;
  isPinned?: boolean;
}) {
  const {
    openReceiveModal,
    startTransfer,
    startSwap,
    openSettingsWithState,
    pinToken,
    unpinToken,
  } = getActions();

  const {
    token,
    isPortrait,
    withContextMenu,
    isSwapDisabled,
    isViewMode,
    isPinned,
  } = options;

  const {
    isContextMenuOpen, contextMenuAnchor,
    handleBeforeContextMenu, handleContextMenu,
    handleContextMenuClose, handleContextMenuHide,
  } = useContextMenuHandlers({
    elementRef: ref,
    isMenuDisabled: !withContextMenu,
  });
  const isServiceToken = getIsServiceToken(token);
  const isContextMenuShown = contextMenuAnchor !== undefined;

  const items: DropdownItem<MenuHandler>[] = useMemo(() => {
    const mandatoryItems: (false | DropdownItem<MenuHandler>)[] = [
      {
        name: isPinned ? 'Unpin' : 'Pin',
        fontIcon: isPinned ? 'menu-unpin' : 'menu-pin',
        value: 'pin',
        withDelimiter: true,
      } satisfies DropdownItem<MenuHandler>, {
        name: 'Manage Tokens',
        fontIcon: 'menu-params',
        value: 'settings',
      } satisfies DropdownItem<MenuHandler>,
    ];

    if (isViewMode) {
      return compact(mandatoryItems);
    }

    const result: (false | undefined | DropdownItem<MenuHandler>)[] = [
      !isServiceToken && {
        name: 'Fund',
        fontIcon: 'menu-plus',
        value: 'add',
      } satisfies DropdownItem<MenuHandler>, {
        name: 'Send',
        fontIcon: 'menu-send',
        value: 'send',
      } satisfies DropdownItem<MenuHandler>,
      !isSwapDisabled && {
        name: 'Swap',
        fontIcon: 'menu-swap',
        value: 'swap',
      } satisfies DropdownItem<MenuHandler>,
    ];

    return compact(result.concat(mandatoryItems));
  }, [isSwapDisabled, isViewMode, isServiceToken, isPinned]);

  const handleMenuItemSelect = useLastCallback((value: MenuHandler) => {
    vibrate();

    switch (value) {
      case 'add':
        openReceiveModal({ chain: token.chain });
        break;

      case 'send':
        startTransfer({
          tokenSlug: token.slug,
        });
        break;

      case 'swap':
        startSwap({
          tokenInSlug: token.slug,
          tokenOutSlug: token.slug === DEFAULT_SWAP_FIRST_TOKEN_SLUG
            ? DEFAULT_SWAP_SECOND_TOKEN_SLUG
            : DEFAULT_SWAP_FIRST_TOKEN_SLUG,
        });
        break;

      case 'settings':
        openSettingsWithState({ state: SettingsState.Assets });
        break;

      case 'pin':
        if (isPinned) {
          unpinToken({ slug: token.slug });
        } else {
          pinToken({ slug: token.slug });
        }
        break;
    }

    handleContextMenuClose();
  });

  return {
    isContextMenuOpen,
    isContextMenuShown,
    contextMenuAnchor,
    items,
    isBackdropRendered: isPortrait && isContextMenuOpen,
    handleBeforeContextMenu,
    handleContextMenu,
    handleContextMenuClose,
    handleContextMenuHide,
    handleMenuItemSelect,
  };
}

export default useTokenContextMenu;
