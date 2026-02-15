export const PALETTE = [
  '#ff6b6b', // coral
  '#ee5a24', // burnt orange
  '#f0932b', // amber
  '#f6e58d', // butter
  '#badc58', // lime
  '#6ab04c', // leaf
  '#00d2d3', // cyan
  '#54a0ff', // sky
  '#5f27cd', // indigo
  '#c44569', // rose
  '#ff9ff3', // pink
  '#feca57', // gold
  '#1dd1a1', // mint
  '#48dbfb', // ice
  '#ff6348', // tomato
  '#a29bfe', // lavender
  '#fd79a8', // flamingo
  '#00cec9', // teal
  '#e17055', // clay
  '#74b9ff', // periwinkle
] as const;

export const VIBES = ['serene', 'warm', 'electric', 'midnight', 'golden', 'arctic'] as const;
export type Vibe = (typeof VIBES)[number];

export function rgba(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}

export const CARD_THEMES = ['default', 'glass', 'neon', 'minimal', 'gradient', 'noise'] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

export function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}
