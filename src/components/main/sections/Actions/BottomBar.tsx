import React, { memo, useState } from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type { Theme } from '../../../../global/types';

import { NO_BACKEND, TMAIL_APP_URL } from '../../../../config';
import { selectCurrentAccountSettings } from '../../../../global/selectors';
import { ACCENT_COLORS } from '../../../../util/accentColor/constants';
import buildClassName from '../../../../util/buildClassName';
import buildStyle from '../../../../util/buildStyle';
import { openSite } from '../../../explore/helpers/utils';
import { ANIMATED_STICKERS_PATHS } from '../../../ui/helpers/animatedAssets';

import useAppTheme from '../../../../hooks/useAppTheme';
import useEffectOnce from '../../../../hooks/useEffectOnce';
import useFlag from '../../../../hooks/useFlag';
import { getIsBottomBarHidden, subscribeToBottomBarVisibility } from '../../../../hooks/useHideBottomBar';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';
import useDraggablePill from './hooks/useDraggablePill';

import AnimatedIconWithPreview from '../../../ui/AnimatedIconWithPreview';
import Button from '../../../ui/Button';
import Pill from './Pill';

import styles from './BottomBar.module.scss';

interface StateProps {
  theme: Theme;
  areSettingsOpen?: boolean;
  isExploreOpen?: boolean;
  accentColorIndex?: number;
}

type IconKey = 'iconWallet' | 'iconExplore' | 'iconSettings';

interface TabConfig {
  key: number;
  label: string;
  iconKey?: IconKey;
  isMailIcon?: boolean;
  onClick: NoneToVoidFunction;
}

const ICON_SIZE_PX = 38;
const ANIMATED_STICKER_SPEED = 2;

const TAB_WALLET = 0;
const TAB_EXPLORE = 1;
const TAB_SETTINGS_FULL = 2;
const TAB_TMAIL = 3;

const SETTINGS_INDEX = TAB_SETTINGS_FULL;

function BottomBar({
  theme, areSettingsOpen, isExploreOpen, accentColorIndex,
}: StateProps) {
  const { switchToWallet, switchToExplore, switchToSettings } = getActions();

  const lang = useLang();
  const [isHidden, setIsHidden] = useState(getIsBottomBarHidden());
  const appTheme = useAppTheme(theme);
  const stickerPaths = ANIMATED_STICKERS_PATHS[appTheme];
  const accentColor = accentColorIndex !== undefined ? ACCENT_COLORS[appTheme][accentColorIndex] : undefined;
  const handleTmailClick = useLastCallback(() => {
    switchToExplore();
    openSite(TMAIL_APP_URL, undefined, lang('TMail'));
  });

  useEffectOnce(() => {
    return subscribeToBottomBarVisibility(() => {
      setIsHidden(getIsBottomBarHidden());
    });
  });

  // Explore is the dapp catalog, which only the backend can fill.
  const tabs: TabConfig[] = [
    { key: TAB_WALLET, label: 'Wallet', iconKey: 'iconWallet', onClick: switchToWallet },
    ...(NO_BACKEND
      ? []
      : [{ key: TAB_EXPLORE, label: 'Explore', iconKey: 'iconExplore', onClick: switchToExplore } as TabConfig]),
    { key: SETTINGS_INDEX, label: 'Settings', iconKey: 'iconSettings', onClick: switchToSettings },
    {
      key: TAB_TMAIL,
      label: 'TMail',
      isMailIcon: true,
      onClick: handleTmailClick,
    },
  ];

  const activeKey = getActiveKey({ isExploreOpen, areSettingsOpen });
  const activeIndex = Math.max(tabs.findIndex((tab) => tab.key === activeKey), 0);

  const switchToTabByIndex = useLastCallback((index: number) => {
    tabs[index]?.onClick();
  });

  const {
    capsuleRef,
    isDragging,
    squeeze,
    renderedActiveIndex,
    pointerHandlers,
  } = useDraggablePill({
    tabCount: tabs.length,
    activeIndex,
    onCommit: switchToTabByIndex,
  });

  const rootStyle = buildStyle(
    `--tab-count: ${tabs.length}`,
    `--active-index: ${activeIndex}`,
  );

  return (
    <div
      className={buildClassName(styles.root, isHidden && styles.hidden)}
      style={rootStyle}
    >
      <div
        ref={capsuleRef}
        className={buildClassName(styles.capsule, isDragging && styles.dragging)}
        {...pointerHandlers}
      >
        <Pill isDragging={isDragging} squeeze={squeeze} />
        {tabs.map(({ key, label, iconKey, isMailIcon, onClick }, index) => {
          const isActive = renderedActiveIndex === index;

          if (isMailIcon) {
            return (
              <TabButton
                key={key}
                isActive={isActive}
                label={lang(label)}
                isMailIcon
                accentColor={accentColor}
                onClick={onClick}
              />
            );
          }

          const variant = isActive ? `${iconKey!}Solid` as const : iconKey!;

          return (
            <TabButton
              key={key}
              isActive={isActive}
              label={lang(label)}
              tgsUrl={stickerPaths[variant]}
              previewUrl={stickerPaths.preview[variant]}
              accentColor={accentColor}
              onClick={onClick}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(withGlobal((global): StateProps => {
  const { areSettingsOpen, isExploreOpen } = global;

  return {
    theme: global.settings.theme,
    areSettingsOpen,
    isExploreOpen,
    accentColorIndex: selectCurrentAccountSettings(global)?.accentColorIndex,
  };
})(BottomBar));

const TabButton = memo(({
  isActive, label, tgsUrl, previewUrl, isMailIcon, accentColor, onClick,
}: {
  isActive?: boolean;
  label: string;
  tgsUrl?: string;
  previewUrl?: string;
  isMailIcon?: boolean;
  accentColor?: string;
  onClick: NoneToVoidFunction;
}) => {
  const [isAnimating, startAnimation, stopAnimation] = useFlag();

  const handleClick = useLastCallback(() => {
    startAnimation();
    onClick();
  });

  return (
    <Button
      isSimple
      className={buildClassName(styles.button, isActive && styles.active)}
      onClick={handleClick}
    >
      {isMailIcon ? (
        <span
          className={styles.tmailLogo}
          style={accentColor ? buildStyle(`--tmail-icon-color: ${accentColor}`) : undefined}
        />
      ) : (
        <AnimatedIconWithPreview
          play={isAnimating}
          size={ICON_SIZE_PX}
          speed={ANIMATED_STICKER_SPEED}
          nonInteractive
          forceOnHeavyAnimation
          className={styles.icon}
          color={accentColor}
          tgsUrl={tgsUrl}
          previewUrl={previewUrl}
          onEnded={stopAnimation}
        />
      )}
      <span className={styles.label}>{label}</span>
    </Button>
  );
});

function getActiveKey({
  isExploreOpen, areSettingsOpen,
}: Pick<StateProps, 'isExploreOpen' | 'areSettingsOpen'>) {
  if (isExploreOpen) return TAB_EXPLORE;
  if (areSettingsOpen) return TAB_SETTINGS_FULL;

  return TAB_WALLET;
}
