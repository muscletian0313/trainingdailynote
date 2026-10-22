import Taro from '@tarojs/taro';

/** 本地存储 key 统一管理 */
export const STORAGE_KEYS = {
  sessions: 'fitlog.sessions',
  activeSession: 'fitlog.activeSession',
  plans: 'fitlog.plans',
  /** 新建计划时中途退出的草稿（只有填写过内容才会写） */
  planDraft: 'fitlog.planDraft',
  customExercises: 'fitlog.customExercises',
  profile: 'fitlog.profile',
  /** 体重 & 维度：按日期一条记录 */
  bodyRecords: 'fitlog.bodyRecords',
  /** 体重 & 维度：目标体重（kg） */
  bodyTarget: 'fitlog.bodyTarget',
  /** 计划页下次显示时回到「默认展开顶部计划」的一次性标记 */
  planResetExpand: 'fitlog.planResetExpand'
};

/** 读取 JSON 数据，失败时返回兜底值 */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = Taro.getStorageSync(key);
    if (!raw) return fallback;
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    return raw as T;
  } catch (error) {
    console.error('[Storage] 读取失败:', key, error);
    return fallback;
  }
}

/** 写入 JSON 数据 */
export function saveJSON(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(key, JSON.stringify(value));
  } catch (error) {
    console.error('[Storage] 写入失败:', key, error);
  }
}

/** 删除指定 key */
export function removeKey(key: string): void {
  try {
    Taro.removeStorageSync(key);
  } catch (error) {
    console.error('[Storage] 删除失败:', key, error);
  }
}
