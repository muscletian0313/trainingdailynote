import type { MuscleGroup } from '@/types';

/** 肌群展示顺序 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
  'other'
];

/** 肌群中文名 */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  legs: '臀腿',
  shoulders: '肩',
  arms: '手臂',
  core: '核心',
  cardio: '有氧',
  other: '自定义'
};

/** 肌群主题色（用于 JS 逻辑与内联样式） */
export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#ff6b2c',
  back: '#4d8dff',
  legs: '#34d399',
  shoulders: '#fbbf24',
  arms: '#a78bfa',
  core: '#22d3ee',
  cardio: '#f472b6',
  other: '#94a3b8'
};

/** 默认组间休息（秒） */
export const DEFAULT_REST = 90;

/** 默认做组重量（kg） */
export const DEFAULT_WEIGHT = 20;

/** 有氧动作默认时长（分钟） */
export const DEFAULT_CARDIO_MIN = 30;

/** 默认目标组数 */
export const DEFAULT_SETS = 3;

/** 默认目标次数 */
export const DEFAULT_REPS = 10;

/** 组间休息可选项（秒），微信 showActionSheet 最多 6 项 */
export const REST_OPTIONS = [30, 60, 90, 120, 150, 180];
