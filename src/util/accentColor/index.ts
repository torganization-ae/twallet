import { type ElementRef, useLayoutEffect } from '../../lib/teact/teact';
import { setExtraStyles, toggleExtraClass } from '../../lib/teact/teact-dom';

import type { AppTheme } from '../../global/types';

import { ACCENT_COLORS } from './constants';

const HEX_80_PERCENT = 'CC';
const HEX_10_PERCENT = '1A';

export function useAccentColor(
  elementRefOrBody: ElementRef<HTMLElement> | 'body',
  appTheme: AppTheme,
  accentColorIndex: number | undefined,
) {
  const accentColor = accentColorIndex ? ACCENT_COLORS[appTheme][accentColorIndex] : undefined;

  useLayoutEffect(() => {
    const element = elementRefOrBody === 'body' ? document.body : elementRefOrBody.current;
    if (!element) return;

    setExtraStyles(element, {
      '--color-accent': accentColor || 'inherit',
      '--color-accent-10o': accentColor ? `${accentColor}${HEX_10_PERCENT}` : 'inherit',
      '--color-accent-button-background': accentColor || 'inherit',
      '--color-accent-button-background-hover': accentColor ? `${accentColor}${HEX_80_PERCENT}` : 'inherit',
      '--color-accent-button-text': accentColor === '#FFFFFF' ? '#000000' : 'inherit',
      '--color-accent-button-text-hover': accentColor === '#FFFFFF' ? '#000000' : 'inherit',
    });

    toggleExtraClass(document.documentElement, 'is-white-accent', accentColor === '#FFFFFF');
  }, [elementRefOrBody, accentColor]);
}
