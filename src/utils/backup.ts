import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { STORAGE_KEYS, removeKey, saveJSON } from '@/utils/storage';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useDietStore } from '@/store/useDietStore';
import { useBodyStore } from '@/store/useBodyStore';
import { useProfileStore } from '@/store/useProfileStore';
import type {
  BodyRecord,
  DietDay,
  Exercise,
  FoodItem,
  Plan,
  Session,
  UserProfile
} from '@/types';
import type { DietMacros } from '@/utils/diet';

/** 备份里带的数据范围：训练 / 计划 / 自定义动作 / 饮食 / 体重 / 个人资料 */
export interface BackupData {
  sessions: Session[];
  plans: Plan[];
  customExercises: Exercise[];
  dietDays: Record<string, DietDay>;
  dietCustomFoods: FoodItem[];
  dietTarget: DietMacros | null;
  bodyRecords: BodyRecord[];
  bodyTargetWeight?: number;
  bodyUnit: 'kg' | 'jin';
  bodyHiddenMarks: string[];
  profile: UserProfile;
}

export interface BackupPayload {
  app: 'fitlog';
  kind: 'backup';
  /** 备份格式版本，之后加字段时用来兼容老文件 */
  version: number;
  exportedAt: string;
  data: BackupData;
}

export interface BackupSummary {
  sessions: number;
  plans: number;
  exercises: number;
  dietDays: number;
  bodyRecords: number;
  /** 训练记录里最早 / 最晚的日期，用来确认备份对不对 */
  range: string;
}

/** 当前版本导出的备份格式号 */
const BACKUP_VERSION = 1;

/** 读取当前所有数据，生成备份对象 */
export function buildBackup(): BackupPayload {
  const body = useBodyStore.getState();
  return {
    app: 'fitlog',
    kind: 'backup',
    version: BACKUP_VERSION,
    exportedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    data: {
      sessions: useSessionStore.getState().sessions,
      plans: usePlanStore.getState().plans,
      customExercises: useExerciseStore.getState().customExercises,
      dietDays: useDietStore.getState().days,
      dietCustomFoods: useDietStore.getState().customFoods,
      dietTarget: useDietStore.getState().target,
      bodyRecords: body.records,
      bodyTargetWeight: body.targetWeight,
      bodyUnit: body.bodyUnit,
      bodyHiddenMarks: body.hiddenMarks,
      profile: useProfileStore.getState().profile
    }
  };
}

/** 备份文件内容（缩进过，方便出问题时人工看） */
export function stringifyBackup(): string {
  return JSON.stringify(buildBackup(), null, 2);
}

/** 备份文件名：fitlog-backup-20261115-2055.json */
export function backupFileName(): string {
  return `fitlog-backup-${dayjs().format('YYYYMMDD-HHmm')}.json`;
}

/** 备份摘要：恢复前给用户确认用 */
export function summarize(data: BackupData): BackupSummary {
  const times = data.sessions
    .map((item) => item.startedAt)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const range = times.length
    ? `${dayjs(times[0]).format('YYYY/M/D')} - ${dayjs(times[times.length - 1]).format('YYYY/M/D')}`
    : '无训练日期';
  return {
    sessions: data.sessions.length,
    plans: data.plans.length,
    exercises: data.customExercises.length,
    dietDays: Object.keys(data.dietDays).length,
    bodyRecords: data.bodyRecords.length,
    range
  };
}

const EMPTY_DATA: BackupData = {
  sessions: [],
  plans: [],
  customExercises: [],
  dietDays: {},
  dietCustomFoods: [],
  dietTarget: null,
  bodyRecords: [],
  bodyTargetWeight: undefined,
  bodyUnit: 'kg',
  bodyHiddenMarks: [],
  profile: {} as UserProfile
};

/** 解析备份文本：只认本应用导出的格式，字段缺失时按空数据补齐 */
export function parseBackup(text: string): { ok: true; payload: BackupPayload } | { ok: false; error: string } {
  try {
    const raw = JSON.parse(text);
    if (!raw || raw.app !== 'fitlog' || raw.kind !== 'backup') {
      return { ok: false, error: '这不是练记的备份文件' };
    }
    if (!raw.data || typeof raw.data !== 'object') {
      return { ok: false, error: '备份内容不完整' };
    }
    const data = raw.data as Partial<BackupData>;
    const payload: BackupPayload = {
      app: 'fitlog',
      kind: 'backup',
      version: typeof raw.version === 'number' ? raw.version : BACKUP_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      data: {
        sessions: Array.isArray(data.sessions) ? data.sessions : EMPTY_DATA.sessions,
        plans: Array.isArray(data.plans) ? data.plans : EMPTY_DATA.plans,
        customExercises: Array.isArray(data.customExercises)
          ? data.customExercises
          : EMPTY_DATA.customExercises,
        dietDays: data.dietDays && typeof data.dietDays === 'object' ? data.dietDays : {},
        dietCustomFoods: Array.isArray(data.dietCustomFoods)
          ? data.dietCustomFoods
          : EMPTY_DATA.dietCustomFoods,
        dietTarget: (data.dietTarget ?? null) as DietMacros | null,
        bodyRecords: Array.isArray(data.bodyRecords) ? data.bodyRecords : EMPTY_DATA.bodyRecords,
        bodyTargetWeight: data.bodyTargetWeight,
        bodyUnit: data.bodyUnit === 'jin' ? 'jin' : 'kg',
        bodyHiddenMarks: Array.isArray(data.bodyHiddenMarks) ? data.bodyHiddenMarks : [],
        profile: (data.profile && typeof data.profile === 'object'
          ? data.profile
          : {}) as UserProfile
      }
    };
    return { ok: true, payload };
  } catch (error) {
    console.warn('[backup] 解析失败', error);
    return { ok: false, error: '文件内容不是有效的 JSON' };
  }
}

/** 用备份覆盖当前数据：先落本地存储，再同步到内存 store */
export function applyBackup(payload: BackupPayload): void {
  const data = payload.data;
  const sessions = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt);

  // 覆盖恢复前先放弃进行中的训练，避免和新数据混在一起
  useSessionStore.getState().discardActive();

  // 个人资料按「当前默认值 + 备份值」合并，跨版本缺字段也不会崩
  const profile = { ...useProfileStore.getState().profile, ...data.profile };

  saveJSON(STORAGE_KEYS.sessions, sessions);
  saveJSON(STORAGE_KEYS.plans, data.plans);
  saveJSON(STORAGE_KEYS.customExercises, data.customExercises);
  saveJSON(STORAGE_KEYS.dietDays, data.dietDays);
  saveJSON(STORAGE_KEYS.dietCustomFoods, data.dietCustomFoods);
  saveJSON(STORAGE_KEYS.dietTarget, data.dietTarget);
  saveJSON(STORAGE_KEYS.bodyRecords, data.bodyRecords);
  // 没设目标体重时清掉这个 key，不要写入 undefined
  if (data.bodyTargetWeight === undefined) {
    removeKey(STORAGE_KEYS.bodyTarget);
  } else {
    saveJSON(STORAGE_KEYS.bodyTarget, data.bodyTargetWeight);
  }
  saveJSON(STORAGE_KEYS.bodyUnit, data.bodyUnit);
  saveJSON(STORAGE_KEYS.bodyHiddenMarks, data.bodyHiddenMarks);
  saveJSON(STORAGE_KEYS.profile, profile);

  useSessionStore.setState({ sessions });
  usePlanStore.setState({ plans: data.plans });
  useExerciseStore.setState({ customExercises: data.customExercises });
  useDietStore.setState({
    days: data.dietDays,
    customFoods: data.dietCustomFoods,
    target: data.dietTarget
  });
  useBodyStore.setState({
    records: data.bodyRecords,
    targetWeight: data.bodyTargetWeight,
    bodyUnit: data.bodyUnit,
    hiddenMarks: data.bodyHiddenMarks
  });
  useProfileStore.setState({ profile });
}

/** 导出备份文件：小程序转发到聊天，H5 直接下载 */
export async function exportBackupFile(text: string): Promise<'shared' | 'downloaded'> {
  const fileName = backupFileName();
  if (process.env.TARO_ENV === 'weapp') {
    const fs = Taro.getFileSystemManager();
    const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFileSync(filePath, text, 'utf8');
    await Taro.shareFileMessage({ filePath, fileName });
    return 'shared';
  }
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

/** 从聊天里选一个备份文件读出来 */
export async function pickBackupFile(): Promise<string | null> {
  if (process.env.TARO_ENV === 'weapp') {
    const res = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['json'] });
    const file = res.tempFiles?.[0];
    if (!file) return null;
    const fs = Taro.getFileSystemManager();
    return fs.readFileSync(file.path, 'utf8') as string;
  }
  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

/** 恢复前的确认文案 */
export function confirmTextOf(summary: BackupSummary): string {
  return [
    `训练记录 ${summary.sessions} 条（${summary.range}）`,
    `训练计划 ${summary.plans} 个`,
    `自定义动作 ${summary.exercises} 个`,
    `饮食记录 ${summary.dietDays} 天`,
    `体重记录 ${summary.bodyRecords} 条`,
    '',
    '恢复后会覆盖当前全部数据，且不可撤销。'
  ].join('\n');
}
