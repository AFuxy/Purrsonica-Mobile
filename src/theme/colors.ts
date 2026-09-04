export function hexToRgba(hex: string, alpha = 0.25): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(16, 185, 129, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustHexBrightness(hex: string, percent: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  let num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const Colors = {
  bgDarkest: '#09090b',
  bgDark: '#121215',
  bgCard: '#18181b',
  bgElevated: '#202024',
  bgHover: '#27272a',

  border: '#27272a',
  borderLight: '#3f3f46',
  borderHighlight: '#52525b',

  primary: '#10b981', // Dynamic Accent Color
  primaryLight: '#34d399',
  primaryDark: '#059669',
  primaryGlow: 'rgba(16, 185, 129, 0.25)',

  accent: '#06b6d4', // Cyan 500
  accentLight: '#22d3ee',
  accentDark: '#0891b2',
  accentGlow: 'rgba(6, 182, 212, 0.25)',

  text: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDisabled: '#52525b',

  warning: '#f59e0b',
  warningGlow: 'rgba(245, 158, 11, 0.25)',

  danger: '#f43f5e',
  dangerGlow: 'rgba(244, 63, 94, 0.25)',

  success: '#10b981',
};

export function updateGlobalThemeColors(accentColor: string): void {
  let hex = accentColor.trim();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  Colors.primary = hex;
  Colors.primaryLight = adjustHexBrightness(hex, 25);
  Colors.primaryDark = adjustHexBrightness(hex, -25);
  Colors.primaryGlow = hexToRgba(hex, 0.25);
  Colors.success = hex;
}

