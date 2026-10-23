import React, { useEffect } from 'react';
import { PageMeta } from '@tarojs/components';

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

  useEffect(() => {
    if (!isH5) return undefined;
    document.body.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lock, isH5]);

  if (isH5) return null;
  return <PageMeta pageStyle={lock ? 'overflow: hidden;' : ''} />;
};

export default ScrollLock;
