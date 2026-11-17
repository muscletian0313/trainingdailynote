/**
 * 动作示范图：放在云开发静态网站托管，按 https 直链加载，不占包体积。
 */
import Taro from '@tarojs/taro';
import { STATIC_BASE } from '@/utils/cloudAsset';

const DEMO_DIR = `${STATIC_BASE}/fitlog/exercise-demo/`;
const LEGACY_CACHE_KEY = 'fitlog_demo_img_cache_v1';

/** 取示范图地址；空文件名返回空串 */
export function resolveDemoImage(name?: string): Promise<string> {
  if (!name) return Promise.resolve('');
  return Promise.resolve(DEMO_DIR + name);
}

/** 清理旧版本通过 downloadFile + saveFile 留下的本机缓存 */
export function clearDemoImageCache() {
  let cache: Record<string, string> = {};
  try {
    cache = (Taro.getStorageSync(LEGACY_CACHE_KEY) as Record<string, string>) || {};
  } catch (error) {
    return;
  }
  const fs = Taro.getFileSystemManager();
  Object.keys(cache).forEach((name) => {
    try {
      fs.unlinkSync(cache[name]);
    } catch (error) {
      // 文件可能已经不在了
    }
  });
  try {
    Taro.removeStorageSync(LEGACY_CACHE_KEY);
  } catch (error) {
    // ignore
  }
}
