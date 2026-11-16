import type {
  CardioFieldKey,
  CardioIntensity,
  FoodCategory,
  MealKey,
  MuscleGroup,
  TrainingLevel
} from '@/types';
import { PRESET_EXERCISES } from '@/data/exercises';

/**
 * 支持「选填器械名称」的动作：
 * - 动作库里器材是「器械」的全部动作（器械划船、器械深蹲…），
 *   方便备注具体器械型号 / 变式，例如「鹦鹉螺」「正向哈克深蹲」
 * - 另外几个非器械动作（侧平举、前平举、绳索划船、引体向上）也允许备注具体名称
 */
const EQUIPMENT_NAME_EXTRAS = [
  '哑铃侧平举',
  '器械侧平举',
  '绳索侧平举',
  '哑铃前平举',
  '绳索前平举',
  '绳索划船',
  '引体向上'
];

/** 器械类动作的名字集合（跟着动作库的器材字段走，新增器械动作会自动算进来；史密斯架不算） */
const MACHINE_EXERCISE_NAMES = new Set(
  PRESET_EXERCISES.filter(
    (item) =>
      !item.name.includes('史密斯') &&
      (item.equipment === '器械' || item.name.includes('器械'))
  ).map((item) => item.name)
);

export function supportsEquipmentName(name: string): boolean {
  return MACHINE_EXERCISE_NAMES.has(name) || EQUIPMENT_NAME_EXTRAS.includes(name);
}

/** 「具体名称」输入框的提示文案：器械类动作按器械名称口径，其余按动作名称口径 */
export function equipmentNamePlaceholder(name: string): string {
  return name.includes('器械')
    ? '器械名称自定义，例如鹦鹉螺、正向哈克深蹲'
    : '动作名称自定义，例如窄握引体、直臂下压';
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
  other: '其他'
};

/** 饮食：正餐 + 加餐折叠 */
export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: '早餐',
  morningSnack: '早加餐',
  lunch: '午餐',
  afternoonSnack: '午加餐',
  dinner: '晚餐',
  eveningSnack: '晚加餐',
  cheat: '偷吃'
};

/** 主页面顺序：早餐 / 午餐 / 晚餐 + 加餐折叠块 */
export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner'];
/** 加餐折叠块里的顺序 */
export const SNACK_KEYS: MealKey[] = [
  'morningSnack',
  'afternoonSnack',
  'eveningSnack',
  'cheat'
];

/** 饮食：食物分类 */
export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  staple: '主食',
  meat: '肉蛋',
  dairy: '奶豆',
  veg: '蔬菜',
  fruit: '水果',
  nut: '坚果',
  drink: '饮料',
  supplement: '补剂',
  other: '调味/其他'
};

export const FOOD_CATEGORIES: FoodCategory[] = [
  'staple',
  'meat',
  'dairy',
  'veg',
  'fruit',
  'nut',
  'drink',
  'supplement',
  'other'
];

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

/** 有氧时长快捷选项（计划里一点即选） */
export const CARDIO_MIN_PRESETS = [20, 30, 45, 60];

/** 有氧强度档位：轻松 / 适中 / 高强度 */
export interface CardioIntensityOption {
  value: CardioIntensity;
  label: string;
}

export const CARDIO_INTENSITY_OPTIONS: CardioIntensityOption[] = [
  { value: 'easy', label: '轻松' },
  { value: 'moderate', label: '适中' },
  { value: 'hard', label: '高强度' }
];

/** 强度英文值 → 中文文案（历史记录/详情展示用） */
export function getCardioIntensityLabel(value?: CardioIntensity): string {
  if (!value) return '';
  const hit = CARDIO_INTENSITY_OPTIONS.find((item) => item.value === value);
  return hit ? hit.label : '';
}

/** 一个有氧字段的定义：不同器械要填的维度不一样 */
export interface CardioField {
  key: CardioFieldKey;
  label: string;
  unit: string;
  /** number = 数字输入；segment = 分段选择 */
  kind: 'number' | 'segment';
  /** segment 的选项 */
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** 允许小数（速度、坡度、距离） */
  decimal?: boolean;
}

const DURATION_FIELD: CardioField = {
  key: 'durationMin',
  label: '时长',
  unit: '分钟',
  kind: 'number',
  placeholder: '30'
};

/**
 * 各器械的填写维度（参考主流训练 App 的器械口径）：
 * - 跑步机：走/跑 + 速度 + 坡度，距离和配速自动算
 * - 爬楼机：档位 + 楼层
 * - 椭圆机 / 动感单车：阻力档 + 步频（踏频）
 * - 划船机：距离 + 桨频 + 阻力档，配速按距离算
 * - 跳绳：只记个数
 */
export const CARDIO_SCHEMAS: Record<string, CardioField[]> = {
  跑步机: [
    {
      key: 'mode',
      label: '模式',
      unit: '',
      kind: 'segment',
      options: [
        { value: 'walk', label: '走' },
        { value: 'run', label: '跑' }
      ]
    },
    DURATION_FIELD,
    { key: 'speedKmh', label: '速度', unit: 'km/h', kind: 'number', decimal: true, placeholder: '8.0' },
    { key: 'inclinePct', label: '坡度', unit: '%', kind: 'number', decimal: true, placeholder: '0' }
  ],
  爬楼机: [
    DURATION_FIELD,
    { key: 'level', label: '速度档', unit: '档', kind: 'number', placeholder: '5' },
    { key: 'floors', label: '楼层', unit: '层', kind: 'number', placeholder: '选填' }
  ],
  椭圆机: [
    DURATION_FIELD,
    { key: 'level', label: '阻力', unit: '档', kind: 'number', placeholder: '5' },
    { key: 'cadence', label: '步频', unit: 'spm', kind: 'number', placeholder: '选填' }
  ],
  动感单车: [
    DURATION_FIELD,
    { key: 'level', label: '阻力', unit: '档', kind: 'number', placeholder: '5' },
    { key: 'cadence', label: '踏频', unit: 'rpm', kind: 'number', placeholder: '选填' }
  ],
  划船机: [
    DURATION_FIELD,
    { key: 'distanceKm', label: '距离', unit: '公里', kind: 'number', decimal: true, placeholder: '2.0' },
    { key: 'cadence', label: '桨频', unit: 'spm', kind: 'number', placeholder: '选填' },
    { key: 'level', label: '阻力', unit: '档', kind: 'number', placeholder: '选填' }
  ],
  跳绳: [
    DURATION_FIELD,
    { key: 'jumps', label: '个数', unit: '个', kind: 'number', placeholder: '选填' }
  ]
};

/** 没配 schema 的有氧动作：只填时长和距离 */
const FALLBACK_CARDIO_FIELDS: CardioField[] = [
  DURATION_FIELD,
  { key: 'distanceKm', label: '距离', unit: '公里', kind: 'number', decimal: true, placeholder: '选填' }
];

export function cardioFieldsOf(name: string): CardioField[] {
  return CARDIO_SCHEMAS[name] ?? FALLBACK_CARDIO_FIELDS;
}

/** 字段值 → 展示文案（带单位）；空值返回空串 */
export function cardioFieldText(field: CardioField, value?: number | string): string {
  if (value === undefined || value === '' || value === 0) return '';
  if (field.key === 'mode') {
    const hit = field.options?.find((item) => item.value === value);
    return hit ? hit.label : '';
  }
  return `${value}${field.unit}`;
}

/** 跑步机：按速度 × 时长自动算距离（公里，保留两位） */
export function treadmillDistanceKm(durationMin?: number, speedKmh?: number): number | null {
  if (!durationMin || !speedKmh) return null;
  return Math.round(((speedKmh * durationMin) / 60) * 100) / 100;
}

/** 按「时长 + 距离」算配速（x'yy"/km） */
export function paceTextOf(durationMin?: number, distanceKm?: number): string | null {
  if (!durationMin || !distanceKm) return null;
  const totalSec = Math.round((durationMin * 60) / distanceKm);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}'${String(sec).padStart(2, '0')}"/km`;
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
  { id: 'voice-go', name: '语音 · 开始下一组', src: '/assets/audio/rest-voice-go.mp3' },
  { id: 'voice-ready', name: '语音 · 准备下一组', src: '/assets/audio/rest-voice-ready.mp3' },
  { id: 'voice-push', name: '语音 · 时间到，起来干', src: '/assets/audio/rest-voice-push.mp3' },
  { id: 'voice-calm', name: '语音 · 休息结束，慢慢来', src: '/assets/audio/rest-voice-calm.mp3' },
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
  /** 分值：5=轻松 / 3=适中 / 1=力竭（沿用 1-5 分制，方便算平均） */
  value: number;
  /** 展示用的灯色圆点 */
  emoji: string;
  /** 卡片上显示的短文案（4 字以内，保证一行放得下） */
  label: string;
  /** 完整描述，用于详情页展示 */
  desc: string;
  /** 红绿灯颜色：轻松绿 / 适中黄 / 力竭红 */
  color: string;
}

/** 三档红绿灯：轻松 / 适中 / 力竭 */
export const FEEL_OPTIONS: FeelOption[] = [
  { value: 5, emoji: '🟢', label: '轻松', desc: '轻松，还有余力', color: '#4ade80' },
  { value: 3, emoji: '🟡', label: '适中', desc: '强度适中，刚刚好', color: '#facc15' },
  { value: 1, emoji: '🔴', label: '力竭', desc: '已经到极限，推不动了', color: '#f87171' }
];

/** 首页激励文案：每天固定一条，隔天自动换 */
export const MOTIVATION_QUOTES: string[] = [
  '今天多举一组，明天多一分底气。',
  '状态不是等来的，是练出来的。',
  '哪有什么天赋，不过是重复到别人放弃。',
  '重量不会变轻，但你会变强。',
  '再坚持一组，就是今天和昨天的分界线。',
  '想放弃的那一刻，正是训练开始的地方。',
  '你练的不是动作，是以后那个更强的自己。',
  '没有人替你举起来，也没有人替你变强。',
  '肌肉记得你的每一次坚持。',
  '训练很苦，但平庸更苦。',
  '你离目标，只差下一组。',
  '慢一点没关系，别停下就行。',
  '把每一次力竭，都当成一次升级。',
  '天天来，比偶尔拼命更狠。',
  '今天偷的懒，都会变成明天的借口。',
  '别和昨天的自己讲和。',
  '汗水不会白流，它只是还没长成肌肉。',
  '进步很慢，退步很快，所以今天也必须来。',
  '健身房不会骗人，每一次发力都算数。',
  '练下去，时间会给你答案。',
  '热情会冷，自律不会。',
  '再来一组，就更近一步。',
  '力量是一组一组堆出来的。',
  '今天到场，明天谢自己。',
  '没有捷径，只有次数。',
  '唯一的极限，是你自己。'
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
