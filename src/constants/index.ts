import type { MuscleGroup, TrainingLevel } from '@/types';

/** 肌群展示顺序 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'cardio',
  'fullbody',
  'other'
];

/** 肌群中文名 */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  legs: '臀腿',
  shoulders: '肩',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  core: '核心',
  cardio: '有氧',
  fullbody: '全身',
  other: '自定义'
};

/** 训练经验对应的默认昵称（问卷里选完经验后自动作为昵称） */
export const LEVEL_NICKNAMES: Record<TrainingLevel, string> = {
  beginner: '健身新人',
  advanced: '健身老手',
  master: '健身大神'
};

/** 肌群主题色（用于 JS 逻辑与内联样式） */
export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#f43f5e',
  back: '#4d8dff',
  legs: '#34d399',
  shoulders: '#fbbf24',
  biceps: '#a78bfa',
  triceps: '#818cf8',
  core: '#22d3ee',
  cardio: '#f472b6',
  fullbody: '#a3e635',
  other: '#94a3b8'
};

/** 默认组间休息（秒） */
export const DEFAULT_REST = 90;

/** 默认做组重量（kg） */
export const DEFAULT_WEIGHT = 20;

/** 有氧动作默认时长（分钟） */
export const DEFAULT_CARDIO_MIN = 30;

/** 有氧动作的附加字段（时长、卡路里人人都有，跳绳没有距离） */
export interface CardioExtraField {
  key: 'pace' | 'incline' | 'resistance';
  label: string;
  placeholder: string;
}

const PACE_FIELD: CardioExtraField = {
  key: 'pace',
  label: '配速',
  placeholder: '自己填，如 6\'30"/km'
};

export const CARDIO_EXTRA_FIELDS: Record<string, CardioExtraField[]> = {
  跑步机: [
    PACE_FIELD,
    { key: 'incline', label: '坡度', placeholder: '自己填，如 8%' }
  ],
  爬楼机: [PACE_FIELD],
  椭圆机: [
    { key: 'resistance', label: '阻力', placeholder: '自己填，如 8 档' },
    PACE_FIELD
  ],
  动感单车: [
    { key: 'resistance', label: '阻力', placeholder: '自己填，如 8 档' },
    PACE_FIELD
  ],
  划船机: [PACE_FIELD],
  跳绳: []
};

/** 不记距离的有氧动作（跳绳就跳个绳，没距离） */
const CARDIO_NO_DISTANCE = new Set(['跳绳']);

export function cardioHasDistance(name: string): boolean {
  return !CARDIO_NO_DISTANCE.has(name);
}

/** 默认目标组数 */
export const DEFAULT_SETS = 3;

/** 默认目标次数 */
export const DEFAULT_REPS = 10;

/** 组间休息可选项（秒），微信 showActionSheet 最多 6 项 */
export const REST_OPTIONS = [30, 60, 90, 120, 150, 180];

/** 组间歇提示音选项：关闭 + 10 个内置音效（'off' 表示不响） */
export interface RestSoundItem {
  id: string;
  name: string;
  /** 包内绝对路径，off 为空 */
  src: string;
}

export const REST_SOUNDS: RestSoundItem[] = [
  { id: 'bell', name: '清脆铃声', src: '/assets/audio/rest-bell.wav' },
  { id: 'dingdong', name: '叮咚（下行）', src: '/assets/audio/rest-dingdong.wav' },
  { id: 'rise', name: '叮咚（上行）', src: '/assets/audio/rest-rise.wav' },
  { id: 'beep', name: '单音哔', src: '/assets/audio/rest-beep.wav' },
  { id: 'double-beep', name: '双音哔', src: '/assets/audio/rest-double-beep.wav' },
  { id: 'triple-beep', name: '三连哔', src: '/assets/audio/rest-triple-beep.wav' },
  { id: 'drop', name: '水滴声', src: '/assets/audio/rest-drop.wav' },
  { id: 'doorbell', name: '门铃', src: '/assets/audio/rest-doorbell.wav' },
  { id: 'digital', name: '电子音', src: '/assets/audio/rest-digital.wav' },
  { id: 'gong', name: '低锣', src: '/assets/audio/rest-gong.wav' }
];

export const REST_SOUND_OFF = 'off';

/** 取提示音的音频路径；关闭或找不到时返回空字符串 */
export function restSoundSrc(id: string): string {
  if (!id || id === REST_SOUND_OFF) return '';
  return REST_SOUNDS.find((item) => item.id === id)?.src ?? '';
}

/** 训练心得：单个动作做后的主观感受档位（1-5，5 最好） */
export interface FeelOption {
  /** 分值：1-5，5 最好 */
  value: number;
  emoji: string;
  /** 卡片上显示的短文案（4 字以内，保证一行放得下） */
  label: string;
  /** 完整描述，用于详情页展示 */
  desc: string;
}

/** 画面顺序：从最好到最差 */
export const FEEL_OPTIONS: FeelOption[] = [
  { value: 5, emoji: '🔥', label: '状态爆棚', desc: '状态爆棚，还能再加' },
  { value: 4, emoji: '💪', label: '强度刚好', desc: '强度刚好，练得爽' },
  { value: 3, emoji: '🙂', label: '正常发挥', desc: '还行，正常发挥' },
  { value: 2, emoji: '😐', label: '有点勉强', desc: '有点勉强，一般般' },
  { value: 1, emoji: '😩', label: '很吃力', desc: '很吃力，状态不好' }
];

/** 按分值取感受档位 */
export function getFeelOption(value?: number): FeelOption | undefined {
  return FEEL_OPTIONS.find((item) => item.value === value);
}
