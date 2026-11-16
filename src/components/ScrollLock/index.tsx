import React, { useEffect } from 'react';
import { PageMeta } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useThemeStore } from '@/store/useThemeStore';
import { navColorOf } from '@/hooks/usePageTheme';

interface ScrollLockProps {
  /** true：浮层打开，锁住页面原生滚动 */
  lock: boolean;
}

/**
 * 浮层打开时锁住页面滚动。
 *
 * 小程序里 fixed 遮罩不会阻断页面原生滚动，手指在遮罩 / 面板缝隙上滑动时
 * 底下的画布会跟着滚；这里用 PageMeta 给页面根节点加 overflow: hidden。
 * H5 端没有 PageMeta，用 body 的 overflow 兜底。
 */
const ScrollLock: React.FC<ScrollLockProps> = ({ lock }) => {
  const isH5 = process.env.TARO_ENV === 'h5';
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (!isH5) return undefined;
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lock, isH5]);

  /**
   * 用了 page-meta 的页面会丢掉 app.json 的导航栏配色（标题变黑），
   * 这里每次渲染后按当前主题补回。
   * page-meta 的属性是异步下发到视图层的，所以稍后再补一次，避免被它覆盖。
   */
  useEffect(() => {
    if (isH5) return undefined;
    const nav = navColorOf(theme);
    const apply = () => {
      Taro.setNavigationBarColor({
        frontColor: nav.frontColor,
        backgroundColor: nav.backgroundColor,
        animation: { duration: 0, timingFunc: 'linear' }
      }).catch(() => undefined);
    };
    apply();
    const timer = setTimeout(apply, 80);
    return () => clearTimeout(timer);
  }, [lock, isH5, theme]);

  if (isH5) return null;
  return <PageMeta pageStyle={lock ? 'overflow: hidden;' : ''} />;
};

export default ScrollLock;
