import { useEffect } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { themeClassName, useThemeStore, type ThemeMode } from '@/store/useThemeStore';

/** 原生导航栏 / tabBar 不吃 CSS 变量，只能运行时下发 */
const NAV: Record<ThemeMode, { frontColor: '#ffffff' | '#000000'; backgroundColor: string }> = {
  dark: { frontColor: '#ffffff', backgroundColor: '#101014' },
  light: { frontColor: '#000000', backgroundColor: '#f4f4f6' }
};

/** 供需要单独校正导航栏的组件（如 page-meta 场景）复用 */
export function navColorOf(theme: ThemeMode): {
  frontColor: '#ffffff' | '#000000';
  backgroundColor: string;
} {
  return NAV[theme];
}

const TAB: Record<ThemeMode, { color: string; backgroundColor: string; borderStyle: 'black' | 'white' }> = {
  dark: { color: '#6f6f7d', backgroundColor: '#16161b', borderStyle: 'black' },
  light: { color: '#8a8a96', backgroundColor: '#ffffff', borderStyle: 'white' }
};

export function applyNativeTheme(theme: ThemeMode): void {
  const nav = NAV[theme];
  Taro.setNavigationBarColor({
    frontColor: nav.frontColor,
    backgroundColor: nav.backgroundColor,
    animation: { duration: 0, timingFunc: 'linear' }
  }).catch(() => undefined);

  // 非 tabBar 页面调用会失败，忽略即可
  Taro.setTabBarStyle({
    color: TAB[theme].color,
    selectedColor: '#ff6b2c',
    backgroundColor: TAB[theme].backgroundColor,
    borderStyle: TAB[theme].borderStyle
  }).catch(() => undefined);
}

/**
 * 每个页面根节点调用一次：
 * 返回要挂到最外层 View 的类名，并同步原生导航栏 / tabBar 配色。
 */
export function usePageTheme(): string {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyNativeTheme(theme);
  }, [theme]);

  useDidShow(() => {
    applyNativeTheme(theme);
  });

  return themeClassName(theme);
}
