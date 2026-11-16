/**
 * 动作示范图：图片放在微信云开发存储，按需下载并缓存在本机。
 *
 * - 小程序：云存储 → downloadFile → saveFile 存到本机，下次直接读缓存
 * - H5：走随包静态资源（本地预览用，云端 API 在浏览器里不可用）
 */
import Taro from '@tarojs/taro';

const CLOUD_ENV = 'rixunji-fight-d8gfo915aee0b48d1';
const CLOUD_BUCKET = '7269-rixunji-fight-d8gfo915aee0b48d1-1531127310';
const CLOUD_DIR = 'exercise-demo';
const H5_DIR = '/subpackages/misc/assets/exercise-demo/';
const CACHE_KEY = 'fitlog_demo_img_cache_v1';

/** 内存缓存：本次启动已经拿到的本机路径 */
const memory = new Map<string, string>();
/** 正在下载的请求，避免同一张图并发重复下载 */
const inflight = new Map<string, Promise<string>>();

type CacheMap = Record<string, string>;

function readCache(): CacheMap {
  try {
    return (Taro.getStorageSync(CACHE_KEY) as CacheMap) || {};
  } catch (error) {
    return {};
  }
}

function writeCache(map: CacheMap) {
  try {
    Taro.setStorageSync(CACHE_KEY, map);
  } catch (error) {
    // 缓存写失败不影响本次显示，下次再下
  }
}

function fileExists(filePath: string): boolean {
  try {
    Taro.getFileSystemManager().accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

function saveTempFile(tempFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.getFileSystemManager().saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath),
      fail: reject
    });
  });
}

async function downloadDemo(name: string): Promise<string> {
  const hot = memory.get(name);
  if (hot) return hot;

  const cache = readCache();
  const local = cache[name];
  if (local && fileExists(local)) {
    memory.set(name, local);
    return local;
  }

  const fileID = `cloud://${CLOUD_ENV}.${CLOUD_BUCKET}/${CLOUD_DIR}/${name}`;
  const res = await Taro.cloud.downloadFile({ fileID });
  const saved = await saveTempFile(res.tempFilePath);
  cache[name] = saved;
  writeCache(cache);
  memory.set(name, saved);
  return saved;
}

/**
 * 取示范图路径：
 * 成功返回可直接给 Image 用的本机路径，失败返回空串（页面显示占位）。
 */
export function resolveDemoImage(name?: string): Promise<string> {
  if (!name) return Promise.resolve('');
  if (process.env.TARO_ENV === 'h5') return Promise.resolve(H5_DIR + name);

  const running = inflight.get(name);
  if (running) return running;

  const task = downloadDemo(name)
    .catch(() => '')
    .finally(() => {
      inflight.delete(name);
    });
  inflight.set(name, task);
  return task;
}

/** 清空本机示范图缓存（清空数据时调用） */
export function clearDemoImageCache() {
  const cache = readCache();
  const fs = Taro.getFileSystemManager();
  Object.keys(cache).forEach((name) => {
    try {
      fs.unlinkSync(cache[name]);
    } catch (error) {
      // 文件可能已经不在了
    }
  });
  memory.clear();
  try {
    Taro.removeStorageSync(CACHE_KEY);
  } catch (error) {
    // ignore
  }
}
