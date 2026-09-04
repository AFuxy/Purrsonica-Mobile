import { create } from 'zustand';
import { Colors, updateGlobalThemeColors } from '../theme/colors';
import { getStoredTheme, saveStoredTheme } from '../services/storage';

interface ThemeState {
  accentColor: string;
  accentPreset: string;
  setAccentColor: (color: string, presetId?: string) => Promise<void>;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  accentColor: '#10b981',
  accentPreset: 'emerald',

  loadSavedTheme: async () => {
    try {
      const { accentColor: savedColor, presetId: savedPreset } = await getStoredTheme();
      if (savedColor) {
        updateGlobalThemeColors(savedColor);
        set({
          accentColor: savedColor,
          accentPreset: savedPreset || 'custom',
        });
      }
    } catch (err) {
      console.warn('[ThemeStore] Failed to load saved theme:', err);
    }
  },

  setAccentColor: async (color: string, presetId = 'custom') => {
    let validHex = color.trim();
    if (!validHex.startsWith('#')) validHex = `#${validHex}`;
    updateGlobalThemeColors(validHex);
    set({
      accentColor: validHex,
      accentPreset: presetId,
    });
    try {
      await saveStoredTheme(validHex, presetId);
    } catch (err) {
      console.warn('[ThemeStore] Failed to persist theme:', err);
    }
  },
}));
