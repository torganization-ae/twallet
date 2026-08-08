import React, { type ElementRef, memo } from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import { IS_FEATURE_LIMITED } from '../../../../config';
import buildClassName from '../../../../util/buildClassName';
import { vibrate } from '../../../../util/haptics';
import { handleSendMenuItemClick, SEND_CONTEXT_MENU_ITEMS } from './helpers/sendMenu';

import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import Button from '../../../ui/Button';
import WithContextMenu from '../../../ui/WithContextMenu';

import styles from './PortraitActions.module.scss';

interface OwnProps {
  isTestnet?: boolean;
  isLedger?: boolean;
  isSwapDisabled?: boolean;
  containerRef: ElementRef<HTMLDivElement>;
}

function PortraitActions({
  isSwapDisabled,
  containerRef,
}: OwnProps) {
  const {
    startTransfer, startSwap, openReceiveModal,
  } = getActions();

  const lang = useLang();

  const addBuyButtonName = IS_FEATURE_LIMITED
    ? lang('Receive')
    : (!isSwapDisabled
      ? lang('Fund')
      : lang('Add')
    );
  const sendButtonName = IS_FEATURE_LIMITED || lang.code !== 'en'
    ? lang('Send')
    : <span className={styles.name}>{lang('Send')}</span>;

  const handleStartSwap = useLastCallback(() => {
    vibrate();

    startSwap();
  });

  const handleStartTransfer = useLastCallback(() => {
    vibrate();

    startTransfer();
  });

  const handleAddBuyClick = useLastCallback(() => {
    vibrate();

    openReceiveModal();
  });

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <Button
          isSimple
          className={styles.button}
          onClick={handleAddBuyClick}
        >
          <i className={buildClassName(styles.buttonIcon, 'icon-action-add')} aria-hidden />
          {addBuyButtonName}
        </Button>
        <WithContextMenu
          rootRef={containerRef}
          items={SEND_CONTEXT_MENU_ITEMS}
          withBackdrop
          menuClassName={styles.menu}
          onItemClick={handleSendMenuItemClick}
        >
          {(buttonProps, isMenuOpen) => (
            <Button
              {...buttonProps}
              isSimple
              className={buildClassName(styles.button, isMenuOpen && styles.buttonActive)}
              onClick={handleStartTransfer}
              ref={buttonProps.ref as ElementRef<HTMLButtonElement>}
            >
              <i className={buildClassName(styles.buttonIcon, 'icon-action-send')} aria-hidden />
              {sendButtonName}
            </Button>
          )}
        </WithContextMenu>
        {!isSwapDisabled && (
          <Button
            isSimple
            className={styles.button}
            onClick={handleStartSwap}
          >
            <i className={buildClassName(styles.buttonIcon, 'icon-action-swap')} aria-hidden />
            {lang('Swap')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default memo(PortraitActions);
