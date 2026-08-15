import { ACCENT_COLORS } from './accentColor/constants';
import rgbToHex, { hex2rgb } from './colors';

export interface CardGradient {
  from: string;
  to: string;
}

export const DEFAULT_CARD_GRADIENT: CardGradient = {
  from: '#22B8FF',
  to: '#0059E6',
};

export const TOKEN_CARD_GRADIENTS: Record<string, CardGradient> = {
  blue: DEFAULT_CARD_GRADIENT,
  gram: { from: '#A87BFF', to: '#4B6FE0' },
  tegro: { from: '#6A7DFF', to: '#3A2FE0' },
  red: { from: '#FF6B6B', to: '#C01F3C' },
  orange: { from: '#FFB43D', to: '#E0700A' },
  green: { from: '#8AE03D', to: '#1E8A18' },
  sea: { from: '#2FD9DB', to: '#0A7C96' },
  purple: { from: '#9B63FF', to: '#5C11C4' },
  pink: { from: '#D34FCE', to: '#C4187F' },
};

export function mixWithWhite(color: string, whiteWeight = 0.35): string {
  const [red, green, blue] = hex2rgb(color);
  const mix = (value: number) => Math.round(value + (255 - value) * whiteWeight);

  return rgbToHex([mix(red), mix(green), mix(blue)]);
}

// Shifts a color in HSL: `saturate` and `lighten` are multipliers, clamped to [0, 1].
function shiftColor(color: string, saturate: number, lighten: number): string {
  const [red, green, blue] = hex2rgb(color).map((value) => value / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const luminance = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = delta ? Math.min(0.92, (delta / (1 - Math.abs(2 * luminance - 1))) * saturate) : 0;
  // Additive part keeps near-black colors from collapsing into a flat gradient.
  const newLuminance = Math.min(0.88, Math.max(0, luminance * lighten + (lighten > 1 ? 0.05 : 0)));

  const chroma = (1 - Math.abs(2 * newLuminance - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base = newLuminance - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const [r, g, b] = [
    [chroma, second, 0], [second, chroma, 0], [0, chroma, second],
    [0, second, chroma], [second, 0, chroma], [chroma, 0, second],
  ][sector];

  return rgbToHex([r, g, b].map((value) => Math.round((value + base) * 255)) as [number, number, number]);
}

export function getCardGradient(accentColorIndex?: number): CardGradient {
  const color = accentColorIndex === undefined ? undefined : ACCENT_COLORS.light[accentColorIndex];
  if (!color) return DEFAULT_CARD_GRADIENT;

  return {
    from: shiftColor(color, 1.2, 1.06),
    to: shiftColor(color, 1.3, 0.78),
  };
}

export function getCardGradientStyle(gradient: CardGradient): string {
  return `--card-gradient-from: ${gradient.from}; --card-gradient-to: ${gradient.to}`;
}
