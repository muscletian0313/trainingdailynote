import { create } from 'zustand';
import type { BodyRecord } from '@/types';
import dayjs from 'dayjs';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';

/**
 * 体重 & 维度：按日期一天一条。
 * 体重统一存 kg（页面上的「斤」只是展示换算），围度存 cm。
 */
type Unit = 'kg' | 'jin';

interface BodyState {
  records: BodyRecord[];
  targetWeight?: number;
  /** 体重单位：公斤 / 斤（设置面板里改，全局生效） */
  bodyUnit: Unit;
  /** 人体图上被关掉的围度项 key：关掉后名称/点/线/输入框一起隐藏 */
  hiddenMarks: string[];
  /** 今天有记录就合并字段，没有就新建一条 */
  updateToday: (patch: Partial<BodyRecord>) => void;
  /** 目标体重（kg），传 undefined 表示清空 */
  setTargetWeight: (value?: number) => void;
  setBodyUnit: (unit: Unit) => void;
  /** 开关某个围度项的显示 */
  toggleMark: (key: string) => void;
}

const todayKey = () => dayjs().format('YYYY-MM-DD');

export const useBodyStore = create<BodyState>((set, get) => ({
  records: loadJSON<BodyRecord[]>(STORAGE_KEYS.bodyRecords, []),
  targetWeight: loadJSON<number | undefined>(STORAGE_KEYS.bodyTarget, undefined) || undefined,
  bodyUnit: loadJSON<Unit>(STORAGE_KEYS.bodyUnit, 'kg'),
  hiddenMarks: loadJSON<string[]>(STORAGE_KEYS.bodyHiddenMarks, []),
  updateToday: (patch) => {
    const date = todayKey();
    const recordedAt = dayjs().format('HH:mm');
    const records = [...get().records];
    const index = records.findIndex((item) => item.date === date);
    if (index >= 0) {
      records[index] = { ...records[index], ...patch, recordedAt };
    } else {
      records.push({ id: uid('body'), date, recordedAt, ...patch });
    }
    records.sort((a, b) => (a.date < b.date ? 1 : -1));
    saveJSON(STORAGE_KEYS.bodyRecords, records);
    set({ records });
  },
  setTargetWeight: (value) => {
    saveJSON(STORAGE_KEYS.bodyTarget, value);
    set({ targetWeight: value });
  },
  setBodyUnit: (unit) => {
    saveJSON(STORAGE_KEYS.bodyUnit, unit);
    set({ bodyUnit: unit });
  },
  toggleMark: (key) => {
    const prev = get().hiddenMarks;
    const hiddenMarks = prev.includes(key)
      ? prev.filter((item) => item !== key)
      : [...prev, key];
    saveJSON(STORAGE_KEYS.bodyHiddenMarks, hiddenMarks);
    set({ hiddenMarks });
  }
}));

/** 最近一条有体重的记录（没有返回 undefined） */
export function latestBodyRecord(records: BodyRecord[]): BodyRecord | undefined {
  return records.find((item) => typeof item.weight === 'number' && item.weight > 0);
}
