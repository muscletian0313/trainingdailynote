import type { ExerciseVariants, Gender, TrainingLevel, UserProfile } from '@/types';
import { getExerciseById } from '@/store/useExerciseStore';
import { isAssistExercise, isTimedExercise } from '@/utils/workout';

/**
 * 首次做某个动作时的「起步重量」预估。
 *
 * 思路：1RM ≈ 体重 × 性别系数 × 年限系数 × 动作系数，
 * 再按目标次数折算成训练重量，最后乘一层保守系数（宁可估低，用户自己往上加）。
 *
 * 这些系数是按大众经验拍的，只用来给个「说得过去的默认值」，
 * 用户随时可以改；一旦该动作有历史记录，就一律用历史，不再预估。
 */

/** 性别系数：女性力量约为男性的 62% */
const GENDER_FACTORS: Record<Gender, number> = { male: 1, female: 0.62 };

/** 年限系数：新手 / 1-3 年 / 3 年以上 */
const LEVEL_FACTORS: Record<TrainingLevel, number> = {
  beginner: 0.55,
  advanced: 1.2,
  master: 1.55
};

/** 器材系数：器械 / 绳索的等效负荷比自由重量小 */
const EQUIPMENT_FACTORS: Record<string, number> = {
  杠铃: 1,
  哑铃: 1,
  器械: 0.9,
  绳索: 0.9,
  自重: 1,
  吊环: 1
};

/** 动作系数：以「杠铃平板卧推的总重量」为 1.0 的等效负荷，先命中先算 */
const PATTERN_FACTORS: { keywords: string[]; factor: number }[] = [
  { keywords: ['硬拉'], factor: 1.5 },
  { keywords: ['深蹲', '腿举'], factor: 1.3 },
  { keywords: ['分腿蹲', '箭步', '保加利亚'], factor: 0.6 },
  { keywords: ['臀桥', '臀推'], factor: 1.6 },
  { keywords: ['划船'], factor: 0.85 },
  { keywords: ['下拉'], factor: 0.9 },
  { keywords: ['直臂下压'], factor: 0.4 },
  { keywords: ['推举', '推肩'], factor: 0.6 },
  { keywords: ['卧推'], factor: 1 },
  { keywords: ['推胸'], factor: 0.7 },
  { keywords: ['夹胸'], factor: 0.5 },
  { keywords: ['飞鸟'], factor: 0.3 },
  { keywords: ['双杠', '臂屈伸'], factor: 0.3 },
  { keywords: ['弯举'], factor: 0.3 },
  { keywords: ['下压'], factor: 0.45 },
  { keywords: ['侧平举'], factor: 0.15 },
  { keywords: ['前平举'], factor: 0.2 },
  { keywords: ['耸肩'], factor: 1.2 },
  { keywords: ['提踵'], factor: 1.5 },
  { keywords: ['腿屈伸'], factor: 0.6 },
  { keywords: ['腿弯举', '腘绳'], factor: 0.5 },
  { keywords: ['内收'], factor: 0.5 },
  { keywords: ['卷腹'], factor: 0.15 }
];

/** 没匹配上的动作给个保守系数 */
const DEFAULT_PATTERN_FACTOR = 0.35;

/** 目标次数 → 占 1RM 的比例 */
function repPercent(reps: number): number {
  if (reps <= 5) return 0.85;
  if (reps <= 8) return 0.78;
  if (reps <= 12) return 0.68;
  return 0.6;
}

/** 首次再保守 15% */
const FIRST_TIME_SAFETY = 0.85;

/** 辅助类动作的默认辅助重量：占体重的比例（经验越多借力越少），记成负数 */
const ASSIST_RATIOS: Record<TrainingLevel, number> = {
  beginner: 0.45,
  advanced: 0.3,
  master: 0.15
};

/** 杠铃最低就是空杠重量 */
const BAR_WEIGHT = 20;

/** 哑铃一对的等效负荷约为杠铃的 80% */
const DUMBBELL_PAIR_RATIO = 0.8;

/** 带「器材」变式的组：不同动作用的组 key 不一样，命中最靠前的那个 */
const EQUIP_VARIANT_GROUPS = [
  'equip',
  'equipSimple',
  'equipCalf',
  'equipRaise',
  'equipFly',
  'equipCurl',
  'equipHang'
];

/** 器材选项 key → 动作库里的器材口径 */
const EQUIP_VARIANT_EQUIPMENT: Record<string, string> = {
  barbell: '杠铃',
  straight: '杠铃',
  ez: '杠铃',
  vbar: '杠铃',
  dumbbell: '哑铃',
  smith: '器械',
  machine: '器械',
  cable: '绳索',
  bar: '自重'
};

function patternFactor(name: string): number {
  const hit = PATTERN_FACTORS.find((rule) => rule.keywords.some((word) => name.includes(word)));
  return hit ? hit.factor : DEFAULT_PATTERN_FACTOR;
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export interface EstimateOptions {
  /** 目标次数，默认 10 */
  reps?: number;
  /** 该动作的变式选择（哑铃要看「单手 / 双手」决定口径） */
  variants?: ExerciseVariants;
}

/**
 * 预估起步重量（kg）；估算不了（没填性别 / 体重，或有氧）返回 null。
 *
 * 哑铃动作：选「单手」给单只重量，选「双手」给一对的总重量（默认按一对）。
 */
export function estimateStartWeight(
  exerciseId: string,
  profile: UserProfile,
  options: EstimateOptions = {}
): number | null {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return null;
  if (exercise.muscle === 'cardio') return null;
  // 计时动作（平板支撑）估重量没有意义
  if (isTimedExercise(exerciseId)) return null;

  const { gender, weight } = profile;
  if (!gender || !weight || weight <= 0) return null;

  // 辅助类动作（器械辅助引体向上）：给「借力多少公斤」，记负数
  if (isAssistExercise(exerciseId)) {
    const ratio = ASSIST_RATIOS[profile.experience ?? 'beginner'];
    return -roundTo(weight * ratio, 5);
  }

  // 器材：箭步蹲、硬拉、提踵这类动作由「器材」变式决定，其余用动作自带的
  const equipOption =
    EQUIP_VARIANT_GROUPS.map((key) => options.variants?.[key]).find(Boolean) ?? '';
  const equipment = EQUIP_VARIANT_EQUIPMENT[equipOption] ?? exercise.equipment;

  const base =
    weight *
    GENDER_FACTORS[gender] *
    LEVEL_FACTORS[profile.experience ?? 'beginner'] *
    patternFactor(exercise.name);

  const total =
    base *
    repPercent(options.reps ?? 10) *
    FIRST_TIME_SAFETY *
    (EQUIPMENT_FACTORS[equipment] ?? 1);

  if (equipment === '哑铃') {
    const perHand = (total * DUMBBELL_PAIR_RATIO) / 2;
    // 单边（单手）= 单只重量；双边（双手）= 一对的总重量
    const single = options.variants?.side === 'single' || options.variants?.armMode === 'single';
    return roundTo(single ? perHand : perHand * 2, 1);
  }

  if (equipment === '杠铃') return Math.max(BAR_WEIGHT, roundTo(total, 5));
  return roundTo(total, 5);
}
