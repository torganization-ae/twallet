import React, { memo, useMemo } from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { Theme } from '../../global/types';

import { ACCENT_COLORS } from '../../util/accentColor/constants';
import buildClassName from '../../util/buildClassName';

import useAppTheme from '../../hooks/useAppTheme';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import styles from './AccentColorSelector.module.scss';

interface OwnProps {
  accentColorIndex?: number;
  theme: Theme;
}

function AccentColorSelector({
  accentColorIndex,
  theme,
}: OwnProps) {
  const { setAccentColor, clearAccentColor } = getActions();

  const lang = useLang();

  const appTheme = useAppTheme(theme);

  const colors = useMemo(() => {
    return ACCENT_COLORS[appTheme].map((color, index) => ({ color, index }));
  }, [appTheme]);

  const handleAccentColorClick = useLastCallback((colorIndex?: number) => {
    if (colorIndex === undefined) {
      clearAccentColor();
    } else {
      setAccentColor({ index: colorIndex });
    }
  });

  function renderColorButton(color?: string, index?: number) {
    const isSelected = accentColorIndex === index;

    return (
      <button
        key={color || 'default'}
        type="button"
        disabled={isSelected}
        style={color ? `--current-accent-color: ${color}` : undefined}
        className={buildClassName(styles.colorButton, isSelected && styles.colorButtonCurrent)}
        aria-label={lang('Change Palette')}
        onClick={() => handleAccentColorClick(index)}
      />
    );
  }

  return (
    <div className={styles.colorList}>
      {renderColorButton()}
      {colors.map(({ color, index }) => renderColorButton(color, index))}
    </div>
  );
}

export default memo(AccentColorSelector);
