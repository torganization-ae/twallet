import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useEffect, useRef, useState,
} from '../../lib/teact/teact';

import buildClassName from '../../util/buildClassName';
import captureEscKeyListener from '../../util/captureEscKeyListener';
import { stopEvent } from '../../util/domEvents';
import { IS_ELECTRON } from '../../util/windowEnvironment';

import useLastCallback from '../../hooks/useLastCallback';
import useShowTransition from '../../hooks/useShowTransition';

import Portal from './Portal';

import styles from './Toast.module.scss';

type OwnProps = {
  containerId?: string;
  message: string;
  icon?: string;
  actionText?: string;
  isError?: boolean;
  durationMs?: number;
  onAction?: NoneToVoidFunction;
  onDismiss: NoneToVoidFunction;
};

const DURATION_MS = 2500;
const ANIMATION_DURATION = 250;
const ERROR_DURATION_MS = 10_000;

const Toast: FC<OwnProps> = ({
  icon, message, containerId, actionText, isError, durationMs, onAction, onDismiss,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const timerRef = useRef<number | undefined>();

  const withAction = Boolean(onAction);
  const visibleDurationMs = durationMs ?? (isError ? ERROR_DURATION_MS : DURATION_MS);

  const { ref } = useShowTransition({ isOpen });

  const closeAndDismiss = useLastCallback(() => {
    setIsOpen(false);
    setTimeout(onDismiss, ANIMATION_DURATION);
  });

  useEffect(() => (isOpen ? captureEscKeyListener(closeAndDismiss) : undefined), [isOpen, closeAndDismiss]);

  useEffect(() => {
    timerRef.current = window.setTimeout(closeAndDismiss, visibleDurationMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [closeAndDismiss, visibleDurationMs]);

  const handleMouseEnter = useLastCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  });

  const handleMouseLeave = useLastCallback(() => {
    timerRef.current = window.setTimeout(closeAndDismiss, visibleDurationMs);
  });

  const handleActionClick = useLastCallback((e: React.MouseEvent) => {
    stopEvent(e);

    onAction!();
    closeAndDismiss();
  });

  const handleCloseClick = useLastCallback((e: React.MouseEvent) => {
    stopEvent(e);
    closeAndDismiss();
  });

  return (
    <Portal
      className={buildClassName(
        styles.container,
        IS_ELECTRON && styles.container_electron,
        withAction && styles.container_withAction,
      )}
      containerId={containerId}
    >
      <div
        ref={ref}
        className={buildClassName(styles.toast, isError && styles.toast_error)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.content}>
          {icon && <i className={buildClassName(styles.icon, icon)} aria-hidden />}
          {message}
        </div>
        {withAction && (
          <button type="button" className={styles.action} onClick={handleActionClick}>
            {actionText}
          </button>
        )}
        <button
          type="button"
          className={buildClassName(styles.closeButton, isError && styles.closeButton_error)}
          aria-label="Close"
          onClick={handleCloseClick}
        >
          <i className={buildClassName(styles.closeIcon, 'icon-close')} aria-hidden />
        </button>
      </div>
    </Portal>
  );
};

export default memo(Toast);
