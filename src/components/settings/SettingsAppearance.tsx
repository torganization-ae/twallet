import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { AnimationLevel, Theme } from '../../global/types';

import { ANIMATION_LEVEL_MAX, ANIMATION_LEVEL_MIN } from '../../config';
import { selectCurrentAccountSettings } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import switchAnimationLevel from '../../util/switchAnimationLevel';
import switchTheme from '../../util/switchTheme';
import { IS_ELECTRON, IS_WINDOWS } from '../../util/windowEnvironment';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useScrolledState from '../../hooks/useScrolledState';

import AccentColorSelector from '../common/AccentColorSelector';
import Switcher from '../ui/Switcher';
import SettingsHeader from './SettingsHeader';

import styles from './Settings.module.scss';

import darkThemeImg from '../../assets/theme/theme_dark.png';
import lightThemeImg from '../../assets/theme/theme_light.png';
import systemThemeImg from '../../assets/theme/theme_system.png';

interface OwnProps {
  isActive?: boolean;
  theme: Theme;
  animationLevel: AnimationLevel;
  isTrayIconEnabled: boolean;
  onBackClick: NoneToVoidFunction;
  onTrayIconEnabledToggle: NoneToVoidFunction;
}

interface StateProps {
  accentColorIndex?: number;
}

const SWITCH_THEME_DURATION_MS = 300;
const THEME_OPTIONS = [{
  value: 'light',
  name: 'Light',
  icon: lightThemeImg,
}, {
  value: 'system',
  name: 'System',
  icon: systemThemeImg,
}, {
  value: 'dark',
  name: 'Dark',
  icon: darkThemeImg,
}];

function SettingsAppearance({
  isActive,
  theme,
  animationLevel,
  accentColorIndex,
  isTrayIconEnabled,
  onTrayIconEnabledToggle,
  onBackClick,
}: OwnProps & StateProps) {
  const {
    setTheme,
    setAnimationLevel,
  } = getActions();

  const lang = useLang();

  useHistoryBack({
    isActive,
    onBack: onBackClick,
  });

  const {
    handleScroll: handleContentScroll,
    isScrolled,
  } = useScrolledState();

  const handleThemeChange = useLastCallback((newTheme: string) => {
    document.documentElement.classList.add('no-transitions');
    setTheme({ theme: newTheme as Theme });
    switchTheme(newTheme as Theme);
    setTimeout(() => {
      document.documentElement.classList.remove('no-transitions');
    }, SWITCH_THEME_DURATION_MS);
  });

  const handleAnimationLevelToggle = useLastCallback(() => {
    const level = animationLevel === ANIMATION_LEVEL_MIN ? ANIMATION_LEVEL_MAX : ANIMATION_LEVEL_MIN;
    setAnimationLevel({ level });
    switchAnimationLevel(level);
  });

  function renderThemes() {
    return THEME_OPTIONS.map(({ name, value, icon }) => {
      return (
        <div
          key={value}
          className={buildClassName(styles.theme, value === theme && styles.theme_active)}
          onClick={() => handleThemeChange(value)}
        >
          <div className={buildClassName(styles.themeIcon, value === theme && styles.themeIcon_active)}>
            <img src={icon} alt="" className={styles.themeImg} aria-hidden />
          </div>
          <span>{lang(name)}</span>
        </div>
      );
    });
  }

  return (
    <div className={styles.slide}>
      <SettingsHeader title={lang('Appearance')} isScrolled={isScrolled} onBackClick={onBackClick} />

      <div
        className={buildClassName(styles.content, 'custom-scroll')}
        onScroll={handleContentScroll}
      >
        <p className={styles.blockTitle}>{lang('Theme')}</p>
        <div className={styles.settingsBlock}>
          <div className={styles.themeWrapper}>
            {renderThemes()}
          </div>
        </div>

        <p className={styles.blockTitle}>{lang('Palette')}</p>
        <div className={styles.settingsBlock}>
          <AccentColorSelector accentColorIndex={accentColorIndex} theme={theme} />
        </div>

        <p className={styles.blockTitle}>{lang('Other')}</p>
        <div className={styles.settingsBlock}>
          <div className={buildClassName(styles.item, styles.item_small)} onClick={handleAnimationLevelToggle}>
            <span className={styles.itemTitle}>{lang('Enable Animations')}</span>

            <Switcher
              className={styles.menuSwitcher}
              label={lang('Enable Animations')}
              checked={animationLevel !== ANIMATION_LEVEL_MIN}
            />
          </div>
          {IS_ELECTRON && IS_WINDOWS && (
            <div className={buildClassName(styles.item, styles.item_small)} onClick={() => onTrayIconEnabledToggle()}>
              {lang('Display Tray Icon')}

              <Switcher
                className={styles.menuSwitcher}
                label={lang('Display Tray Icon')}
                checked={isTrayIconEnabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  const accountSettings = selectCurrentAccountSettings(global);

  return {
    accentColorIndex: accountSettings?.accentColorIndex,
  };
})(SettingsAppearance));
