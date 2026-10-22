import type { MuscleGroup, TrainingLevel } from '@/types';

/**
 * 支持「选填器械名称」的动作：名字里带「器械」的都算（显示成「器械划船（鹦鹉螺）」）。
 * 另外几个分器械的动作（哑铃/绳索的侧平举、前平举）也允许备注具体器械/品牌。
 */
const EQUIPMENT_NAME_EXTRAS = [
  '哑铃侧平举',
  '器械侧平举',
  '绳索侧平举',
  '哑铃前平举',
  '绳索前平举'
];

export function supportsEquipmentName(name: string): boolean {
  return name.includes('器械') || EQUIPMENT_NAME_EXTRAS.includes(name);
}

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
  /** 分值：5=轻松 / 3=适中 / 1=困难（沿用 1-5 分制，方便算平均） */
  value: number;
  /** 展示用的灯色圆点 */
  emoji: string;
  /** 卡片上显示的短文案（4 字以内，保证一行放得下） */
  label: string;
  /** 完整描述，用于详情页展示 */
  desc: string;
  /** 红绿灯颜色：轻松绿 / 适中黄 / 困难红 */
  color: string;
}

/** 三档红绿灯：轻松 / 适中 / 困难 */
export const FEEL_OPTIONS: FeelOption[] = [
  { value: 5, emoji: '🟢', label: '轻松', desc: '轻松，还有余力', color: '#4ade80' },
  { value: 3, emoji: '🟡', label: '适中', desc: '强度适中，刚刚好', color: '#facc15' },
  { value: 1, emoji: '🔴', label: '困难', desc: '很吃力，状态吃紧', color: '#f87171' }
];

/** 首页激励文案：每天固定一条，隔天自动换 */
export const MOTIVATION_QUOTES: string[] = [
  '今天多举一组，明天多一分底气。',
  '状态不是等来的，是练出来的。',
  '你不需要很厉害才开始，开始了才会很厉害。',
  '重量不会变轻，但你会变强。',
  '再坚持一组，就是今天和昨天的分界线。',
  '想放弃的那一刻，正是训练开始的地方。',
  '你练的不是动作，是以后那个更强的自己。',
  '没有人替你举起来，也没有人替你变强。',
  '肌肉记得你的每一次坚持。',
  '训练很苦，但平庸更苦。',
  '你离目标，只差下一组。',
  '慢慢来，但别停下来。',
  '把每一次力竭，都当成一次升级。',
  '稳定地练下去，比偶尔拼命更有用。',
  '今天偷的懒，都会变成明天的借口。',
  '别和昨天的自己讲和。',
  '汗水不会白流，它只是还没长成肌肉。',
  '进步很慢，退步很快，所以今天也来。',
  '健身房不会骗人，每一次发力都算数。',
  '练下去，时间会给你答案。',
  'Discipline beats motivation.',
  'One more rep, one step closer.',
  'Strength is built one set at a time.',
  'Show up today, thank yourself tomorrow.',
  'No shortcut, just reps.',
  'Your only limit is you.'
];

/** 按日期取当天的一条激励文案：同一天不变，隔天自动换 */
export function motivationOfDay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return MOTIVATION_QUOTES[0];
  const days = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const index = ((days % MOTIVATION_QUOTES.length) + MOTIVATION_QUOTES.length) % MOTIVATION_QUOTES.length;
  return MOTIVATION_QUOTES[index];
}

/** 按分值取感受档位（兼容旧记录的 1-5 分：4-5 算轻松，1-2 算困难） */
export function getFeelOption(value?: number): FeelOption | undefined {
  if (typeof value !== 'number') return undefined;
  const hit = FEEL_OPTIONS.find((item) => item.value === value);
  if (hit) return hit;
  if (value >= 4) return FEEL_OPTIONS[0];
  if (value === 3) return FEEL_OPTIONS[1];
  return FEEL_OPTIONS[2];
}
