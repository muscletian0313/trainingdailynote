/**
 * 动作示范图：随 misc 分包发布，直接读包内路径，不依赖网络。
 */
import Taro from '@tarojs/taro';

const DEMO_DIR = '/subpackages/misc/assets/exercise-demo/';
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
