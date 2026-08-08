import React, { memo, useRef } from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type { Theme } from '../../../../global/types';

import { ANIMATED_STICKER_ICON_PX } from '../../../../config';
import {
  selectCurrentAccountId,
  selectCurrentAccountSettings,
  selectIsCurrentAccountViewMode,
  selectIsSwapDisabled,
} from '../../../../global/selectors';
import { ACCENT_COLORS } from '../../../../util/accentColor/constants';
import buildClassName from '../../../../util/buildClassName';
import { vibrate } from '../../../../util/haptics';
import { IS_TOUCH_ENV } from '../../../../util/windowEnvironment';
import { ANIMATED_STICKERS_PATHS } from '../../../ui/helpers/animatedAssets';

import useAppTheme from '../../../../hooks/useAppTheme';
import useFlag from '../../../../hooks/useFlag';
import useHorizontalScroll from '../../../../hooks/useHorizontalScroll';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import AnimatedIconWithPreview from '../../../ui/AnimatedIconWithPreview';
import Button from '../../../ui/Button';

import styles from './LandscapeTopActions.module.scss';

const ANIMATED_STICKER_SPEED = 2;

interface ActionButtonProps {
  label: string;
  className?: string;
  tgsUrl: string;
  previewUrl: string;
  accentColor?: string;
  onClick: NoneToVoidFunction;
}

interface OwnProps {
  className?: string;
}

interface StateProps {
  isViewMode: boolean;
  isSwapDisabled?: boolean;
  theme: Theme;
  accentColorIndex?: number;
}

function LandscapeTopActions({
  isViewMode,
  isSwapDisabled,
  theme,
  accentColorIndex,
  className,
}: OwnProps & StateProps) {
  const {
    startTransfer,
    startSwap,
    openReceiveModal,
  } = getActions();

  const lang = useLang();
  const appTheme = useAppTheme(theme);
  const stickerPaths = ANIMATED_STICKERS_PATHS[appTheme];
  const accentColor = accentColorIndex ? ACCENT_COLORS[appTheme][accentColorIndex] : undefined;

  const containerRef = useRef<HTMLDivElement>();
  useHorizontalScroll({ containerRef, shouldPreventDefault: true });

  const handleDepositClick = useLastCallback(() => {
    vibrate();
    openReceiveModal();
  });

  const handleTradeClick = useLastCallback(() => {
    vibrate();
    startSwap();
  });

  const handleSendClick = useLastCallback(() => {
    vibrate();
    startTransfer();
  });

  const depositButton = (
    <ActionButton
      label={lang('Fund')}
      tgsUrl={stickerPaths.iconAdd}
      previewUrl={stickerPaths.preview.iconAdd}
      accentColor={accentColor}
      onClick={handleDepositClick}
    />
  );

  if (isViewMode) {
    return <div className={buildClassName(styles.root, className)}>{depositButton}</div>;
  }

  return (
    <div ref={containerRef} className={buildClassName(styles.root, 'no-scrollbar', className)}>
      {depositButton}
      <ActionButton
        label={lang('Send')}
        tgsUrl={stickerPaths.iconSend}
        previewUrl={stickerPaths.preview.iconSend}
        accentColor={accentColor}
        onClick={handleSendClick}
      />
      {!isSwapDisabled && (
        <ActionButton
          label={lang('Trade')}
          tgsUrl={stickerPaths.iconSwap}
          previewUrl={stickerPaths.preview.iconSwap}
          accentColor={accentColor}
          onClick={handleTradeClick}
        />
      )}
    </div>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      return {
        isViewMode: selectIsCurrentAccountViewMode(global),
        isSwapDisabled: selectIsSwapDisabled(global),
        theme: global.settings.theme,
        accentColorIndex: selectCurrentAccountSettings(global)?.accentColorIndex,
      };
    },
    (global, _, stickToFirst) => stickToFirst(selectCurrentAccountId(global)),
  )(LandscapeTopActions),
);

function ActionButtonInternal({
  label, className, tgsUrl, previewUrl, accentColor, onClick,
}: ActionButtonProps) {
  const [isAnimating, play, stop] = useFlag();

  const handleClick = useLastCallback(() => {
    if (IS_TOUCH_ENV) {
      play();
    }
    onClick();
  });

  return (
    <Button
      isSimple
      className={buildClassName(styles.button, className)}
      onClick={handleClick}
      onMouseEnter={!IS_TOUCH_ENV ? play : undefined}
    >
      <AnimatedIconWithPreview
        play={isAnimating}
        size={ANIMATED_STICKER_ICON_PX}
        speed={ANIMATED_STICKER_SPEED}
        className={styles.icon}
        color={accentColor}
        nonInteractive
        forceOnHeavyAnimation
        tgsUrl={tgsUrl}
        previewUrl={previewUrl}
        onEnded={stop}
      />
      <span className={styles.label}>{label}</span>
    </Button>
  );
}

const ActionButton = memo(ActionButtonInternal);
