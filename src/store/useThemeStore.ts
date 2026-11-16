import { create } from 'zustand';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';

/** 只做两套：橙黑（dark）/ 橙白（light） */
export type ThemeMode = 'dark' | 'light';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  // 冷启动同步读盘，避免先渲染深色再跳白
  theme: loadJSON<ThemeMode>(STORAGE_KEYS.theme, 'dark'),
  setTheme: (theme) => {
    saveJSON(STORAGE_KEYS.theme, theme);
    set({ theme });
  }
}));

/** 页面根节点要挂的全局类名 */
export function themeClassName(theme: ThemeMode): string {
  return theme === 'light' ? 'theme-light' : 'theme-dark';
}
