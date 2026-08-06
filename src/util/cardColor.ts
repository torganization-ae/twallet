import { ACCENT_COLORS } from './accentColor/constants';
import rgbToHex, { hex2rgb } from './colors';

export interface CardGradient {
  from: string;
  to: string;
}

export const DEFAULT_CARD_GRADIENT: CardGradient = {
  from: '#27B1FA',
  to: '#0874F8',
};

export const TOKEN_CARD_GRADIENTS: Record<string, CardGradient> = {
  blue: DEFAULT_CARD_GRADIENT,
  gram: { from: '#9C86E1', to: '#6D92D9' },
  tegro: { from: '#6C87F0', to: '#4844D5' },
  red: { from: '#D26868', to: '#B03E4F' },
  orange: { from: '#E2AE55', to: '#D28B2A' },
  green: { from: '#82C24B', to: '#36902F' },
  sea: { from: '#3ABDBE', to: '#1E879B' },
  purple: { from: '#8E6EE5', to: '#682FB4' },
  pink: { from: '#B055AD', to: '#B4569C' },
};

export function mixWithWhite(color: string, whiteWeight = 0.35): string {
  const [red, green, blue] = hex2rgb(color);
  const mix = (value: number) => Math.round(value + (255 - value) * whiteWeight);

  return rgbToHex([mix(red), mix(green), mix(blue)]);
}

export function getCardGradient(accentColorIndex?: number): CardGradient {
  const color = accentColorIndex === undefined ? undefined : ACCENT_COLORS.light[accentColorIndex];
  if (!color) return DEFAULT_CARD_GRADIENT;

  return {
    from: color,
    to: mixWithWhite(color),
  };
}

export function getCardGradientStyle(gradient: CardGradient): string {
  return `--card-gradient-from: ${gradient.from}; --card-gradient-to: ${gradient.to}`;
}
