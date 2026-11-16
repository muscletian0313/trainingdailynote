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
  /** 体重 & 维度：体重单位 公斤/斤 */
  bodyUnit: 'fitlog.bodyUnit',
  /** 体重 & 维度：人体图上被关掉的围度项 */
  bodyHiddenMarks: 'fitlog.bodyHiddenMarks',
  /** 饮食：一天的记录（按日期存） */
  dietDays: 'fitlog.dietDays',
  /** 饮食：用户自定义食物 */
  dietCustomFoods: 'fitlog.dietCustomFoods',
  /** 饮食：用户自己设的营养目标（碳水/蛋白/脂肪） */
  dietTarget: 'fitlog.dietTarget',
  /** 计划页下次显示时回到「默认展开顶部计划」的一次性标记 */
  planResetExpand: 'fitlog.planResetExpand',
  /** 主题：橙黑 / 橙白 */
  theme: 'fitlog.theme'
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
