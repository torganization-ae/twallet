import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import buildClassName from '../../util/buildClassName';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useScrolledState from '../../hooks/useScrolledState';

import Switcher from '../ui/Switcher';
import SettingsHeader from './SettingsHeader';

import styles from './Settings.module.scss';

interface OwnProps {
  isActive?: boolean;
  onBackClick: NoneToVoidFunction;
}

interface StateProps {
  canPlaySounds?: boolean;
}

function SettingsSounds({
  isActive,
  canPlaySounds,
  onBackClick,
}: OwnProps & StateProps) {
  const lang = useLang();

  const { toggleCanPlaySounds } = getActions();

  const handleCanPlaySoundToggle = useLastCallback(() => {
    toggleCanPlaySounds({ isEnabled: !canPlaySounds });
  });

  useHistoryBack({
    isActive,
    onBack: onBackClick,
  });

  const {
    handleScroll: handleContentScroll,
    isScrolled,
  } = useScrolledState();

  return (
    <div className={styles.slide}>
      <SettingsHeader title={lang('Sounds')} isScrolled={isScrolled} onBackClick={onBackClick} />

      <div
        className={buildClassName(styles.content, 'custom-scroll')}
        onScroll={handleContentScroll}
      >
        <div className={styles.settingsBlock}>
          <div className={buildClassName(styles.item, styles.item_small)} onClick={handleCanPlaySoundToggle}>
            <span className={styles.itemTitle}>{lang('Play Sounds')}</span>

            <Switcher
              className={styles.menuSwitcher}
              label={lang('Play Sounds')}
              checked={canPlaySounds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(withGlobal<OwnProps>((global): StateProps => {
  return {
    canPlaySounds: global.settings.canPlaySounds,
  };
})(SettingsSounds));
