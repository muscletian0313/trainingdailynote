import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';

/**
 * 键盘高度（px），0 表示收起。
 *
 * 饮食里的输入框都设了 adjustPosition={false}：不然键盘会把整页顶起来，
 * 弹层背后的页面跟着动。代价是输入框可能被键盘挡住，
 * 所以这里自己拿键盘高度，把弹层整体抬到键盘上方。
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (process.env.TARO_ENV === 'h5' || typeof Taro.onKeyboardHeightChange !== 'function') {
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = (res: { height: number }) => {
      const h = res.height || 0;
      if (timer) clearTimeout(timer);
      if (h > 0) {
        // 阈值过滤：来回切输入框时键盘高度会有微小波动（几像素），
        // 直接跟随会让卡片在输入过程中轻微抖动（闪屏）。变化 < 10px 忽略。
        if (Math.abs(h - prevRef.current) < 10) return;
        prevRef.current = h;
        // 键盘弹出/来回切输入框，立即跟随，卡片贴合键盘上沿
        setHeight(h);
      } else {
        // 高度归 0 延迟生效：切换输入框瞬间键盘会立刻报 0，
        // 直接应用到卡片会先砸到底再弹回来（闪屏）。稍等一等，
        // 若真是收起键盘才落下
        timer = setTimeout(() => {
          prevRef.current = 0;
          setHeight(0);
        }, 120);
      }
    };
    Taro.onKeyboardHeightChange(handler);
    return () => {
      Taro.offKeyboardHeightChange(handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return height;
}
