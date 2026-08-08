import React, { type ElementRef, memo, useRef } from '../../../../lib/teact/teact';

import type { ApiBaseCurrency } from '../../../../api/types';
import type { AppTheme, UserToken } from '../../../../global/types';
import type { Layout } from '../../../../hooks/useMenuPosition';

import { Big } from '../../../../lib/big.js';
import buildClassName from '../../../../util/buildClassName';
import { DAY, formatFullDay } from '../../../../util/dateFormat';
import { toDecimal } from '../../../../util/decimals';
import { formatCurrency, getShortCurrencySymbol } from '../../../../util/formatNumber';
import { round } from '../../../../util/round';
import { getIsRwaStockToken, getTokenName } from '../../../../util/tokens';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';
import useShowTransition from '../../../../hooks/useShowTransition';
import useTokenContextMenu from './hooks/useTokenContextMenu';

import TokenIcon from '../../../common/TokenIcon';
import TokenLabel from '../../../common/TokenLabel';
import AnimatedCounter from '../../../ui/AnimatedCounter';
import Button from '../../../ui/Button';
import DropdownMenu from '../../../ui/DropdownMenu';
import MenuBackdrop from '../../../ui/MenuBackdrop';
import SensitiveData from '../../../ui/SensitiveData';

import styles from './Token.module.scss';

interface OwnProps {
  ref?: ElementRef<HTMLButtonElement>;
  token: UserToken;
  vestingStatus?: 'frozen' | 'readyToUnfreeze';
  unfreezeEndDate?: number;
  amount?: string;
  classNames?: string;
  tokenClassName?: string;
  style?: string;
  isActive?: boolean;
  baseCurrency: ApiBaseCurrency;
  appTheme: AppTheme;
  withChainIcon?: boolean;
  withChainColorRing?: boolean;
  withContextMenu?: boolean;
  isSensitiveDataHidden?: true;
  isSwapDisabled?: boolean;
  isViewMode?: boolean;
  isPinned?: boolean;
  withPinTransition?: boolean;
  onClick: (slug: string) => void;
}

const UNFREEZE_DANGER_DURATION = 7 * DAY;
const CONTEXT_MENU_VERTICAL_SHIFT_PX = 4;
export const OPEN_CONTEXT_MENU_CLASS_NAME = 'open-context-menu';

function Token({
  ref,
  token,
  amount,
  vestingStatus,
  unfreezeEndDate,
  classNames,
  tokenClassName,
  style,
  isActive,
  baseCurrency,
  withChainIcon,
  withChainColorRing,
  withContextMenu,
  isSensitiveDataHidden,
  isSwapDisabled,
  isViewMode,
  isPinned,
  withPinTransition,
  onClick,
}: OwnProps) {
  const {
    symbol,
    slug,
    amount: tokenAmount,
    price,
    change24h: change,
    decimals,
    label,
  } = token;

  const lang = useLang();
  const { isPortrait } = useDeviceScreen();

  let buttonRef = useRef<HTMLButtonElement>();
  const menuRef = useRef<HTMLDivElement>();
  const isVesting = Boolean(vestingStatus?.length);
  const renderedAmount = amount ?? toDecimal(tokenAmount, decimals, true);
  const changeClassName = change > 0 ? styles.change_up : change < 0 ? styles.change_down : undefined;
  const changePercent = Math.abs(round(change * 100, 2));
  const shortBaseSymbol = getShortCurrencySymbol(baseCurrency);
  const withLabel = Boolean(!isVesting && label);
  const isRwaStock = getIsRwaStockToken(token);
  const name = getTokenName(lang, token);
  const totalAmount = Big(renderedAmount).mul(price);
  if (ref) {
    buttonRef = ref;
  }

  const {
    shouldRender: shouldRenderPin,
    ref: pinRef,
  } = useShowTransition<HTMLElement>({
    isOpen: isPinned,
    withShouldRender: true,
  });

  const handleClick = useLastCallback(() => {
    onClick(slug);
  });

  const getTriggerElement = useLastCallback(() => buttonRef.current);
  const getRootElement = useLastCallback(() => document.body);
  const getMenuElement = useLastCallback(() => menuRef.current);
  const getLayout = useLastCallback((): Layout => ({
    withPortal: true,
    doNotCoverTrigger: isPortrait,
    // The shift is needed to prevent the mouse cursor from highlighting the first menu item
    topShiftY: !isPortrait ? CONTEXT_MENU_VERTICAL_SHIFT_PX : undefined,
    preferredPositionX: 'left',
  }));

  const {
    isContextMenuOpen,
    isContextMenuShown,
    contextMenuAnchor,
    items,
    isBackdropRendered,
    handleBeforeContextMenu,
    handleContextMenu,
    handleContextMenuClose,
    handleContextMenuHide,
    handleMenuItemSelect,
  } = useTokenContextMenu(buttonRef, {
    token,
    isPortrait,
    withContextMenu,
    isSwapDisabled,
    isViewMode,
    isPinned,
  });

  function renderChangeIcon() {
    if (change === 0) {
      return undefined;
    }

    return (
      <i
        className={buildClassName(styles.iconArrow, change > 0 ? 'icon-arrow-up' : 'icon-arrow-down')}
        aria-hidden
      />
    );
  }

  const fullClassName = buildClassName(
    styles.button,
    isActive && styles.active,
    tokenClassName,
    isContextMenuOpen && OPEN_CONTEXT_MENU_CLASS_NAME,
  );

  return (
    <div className={buildClassName(styles.container, classNames)} style={style}>
      <MenuBackdrop
        isMenuOpen={isBackdropRendered}
        contentRef={buttonRef}
        contentClassName={styles.wrapperVisible}
      />
      <Button
        ref={buttonRef}
        isSimple
        className={fullClassName}
        onMouseDown={handleBeforeContextMenu}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <TokenIcon
          token={token}
          size="large"
          withChainIcon={withChainIcon}
          withChainColorRing={withChainColorRing}
          className={styles.tokenIcon}
        >
          {vestingStatus && (
            <i
              className={buildClassName(vestingStatus === 'frozen' ? 'icon-snow' : 'icon-fire', styles.vestingIcon)}
              aria-hidden
            />
          )}
        </TokenIcon>
        <div className={styles.primaryCell}>
          <div className={styles.name}>
            {shouldRenderPin && (
              <i
                ref={pinRef}
                className={buildClassName(
                  styles.pinIcon,
                  'icon-pin',
                  withPinTransition && styles.pinIcon_withTransition,
                )}
                aria-hidden
              />
            )}
            <span className={styles.nameText}>{name}</span>
            {withLabel && <TokenLabel label={label!} isRwaStock={isRwaStock} />}
          </div>
          <div className={styles.subtitle}>
            <AnimatedCounter text={formatCurrency(price, shortBaseSymbol, undefined, true)} />
            <>
              <i className={styles.dot} aria-hidden />
              {unfreezeEndDate ? (
                <span className={(unfreezeEndDate - Date.now() < UNFREEZE_DANGER_DURATION) && styles.change_down}>
                  {lang('Unfreeze')}
                  {' '}
                  {lang('until %date%', { date: `${formatFullDay(lang.code!, unfreezeEndDate)}` })}
                </span>
              ) : (
                <span className={changeClassName}>
                  {renderChangeIcon()}<AnimatedCounter text={String(changePercent)} />%
                </span>
              )}
            </>
          </div>
        </div>
        <div className={styles.secondaryCell}>
          <SensitiveData
            isActive={isSensitiveDataHidden}
            min={4}
            max={12}
            seed={name}
            rows={2}
            cellSize={8}
            align="right"
            className={buildClassName(
              styles.secondaryValue,
              isVesting && styles.secondaryValue_vesting,
              isVesting && vestingStatus === 'readyToUnfreeze' && styles.secondaryValue_vestingUnfreeze,
            )}
          >
            <AnimatedCounter text={formatCurrency(renderedAmount, symbol)} />
          </SensitiveData>
          <SensitiveData
            isActive={isSensitiveDataHidden}
            min={5}
            max={10}
            seed={name}
            rows={2}
            cellSize={8}
            align="right"
            className={styles.subtitle}
          >
            {totalAmount.gt(0) ? '≈' : ''}&thinsp;
            <AnimatedCounter text={formatCurrency(totalAmount, shortBaseSymbol, undefined, true)} />
          </SensitiveData>
        </div>
      </Button>
      {withContextMenu && isContextMenuShown && (
        <DropdownMenu
          ref={menuRef}
          withPortal
          shouldTranslateOptions
          isOpen={isContextMenuOpen}
          items={items}
          menuAnchor={contextMenuAnchor}
          bubbleClassName={styles.menu}
          fontIconClassName={styles.menuIcon}
          getTriggerElement={getTriggerElement}
          getRootElement={getRootElement}
          getMenuElement={getMenuElement}
          getLayout={getLayout}
          onSelect={handleMenuItemSelect}
          onClose={handleContextMenuClose}
          onCloseAnimationEnd={handleContextMenuHide}
        />
      )}
    </div>
  );
}

export default memo(Token);
