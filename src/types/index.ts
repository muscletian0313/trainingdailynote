// 全局数据模型定义

/** 肌群分类 */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'cardio'
  | 'fullbody'
  | 'other';

/** 动作（动作库中的条目） */
export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: string;
  /** 是否为用户自定义动作 */
  isCustom?: boolean;
}

/** 有氧强度目标：轻松 / 适中 / 高强度 */
export type CardioIntensity = 'easy' | 'moderate' | 'hard';

/**
 * 有氧可填的维度：不同器械用的字段不一样
 * （跑步机看速度和坡度，划船机看距离和桨频，跳绳只看个数）
 */
export type CardioFieldKey =
  | 'durationMin'
  | 'distanceKm'
  | 'speedKmh'
  | 'inclinePct'
  | 'level'
  | 'cadence'
  | 'floors'
  | 'jumps'
  | 'mode';

/** 训练中的一组 */
export interface WorkoutSet {
  id: string;
  /**
   * 负荷 kg：
   * 普通动作 = 重量；辅助类（器械辅助引体）= 负数；负重自重动作 = 自重 + 负重
   */
  weight: number;
  /** 负重自重动作：额外负重（用于显示「70+10」） */
  addedWeight?: number;
  /** 次数（有氧动作固定 0） */
  reps: number;
  /** 是否已完成 */
  done: boolean;
  /** 有氧动作：时长（分钟），存在即代表这是一条有氧记录 */
  durationMin?: number;
  /** 有氧动作：距离（公里）；跑步机按速度自动算，跳绳这类不记距离的就是空 */
  distanceKm?: number;
  /** 有氧动作：速度（km/h），跑步机用 */
  speedKmh?: number;
  /** 有氧动作：坡度（%），跑步机用 */
  inclinePct?: number;
  /** 有氧动作：档位（阻力档 / 速度档） */
  level?: number;
  /** 有氧动作：步频 / 踏频 / 桨频 */
  cadence?: number;
  /** 有氧动作：爬楼机楼层数 */
  floors?: number;
  /** 有氧动作：跳绳个数 */
  jumps?: number;
  /** 有氧动作：走 / 跑（跑步机） */
  mode?: 'walk' | 'run';
  /** 有氧动作：配速（手写，如 6'30"/km）—— 老字段，新记录按速度自动算 */
  pace?: string;
  /** 有氧动作：坡度（老数据，手写如 8%）；新记录用 inclinePct */
  incline?: string;
  /** 有氧动作：阻力（手写，如 8 档）—— 老字段，新记录用 level */
  resistance?: string;
  /** 有氧动作：自定义强度（老数据，如「中速」） */
  intensity?: string;
  /** 递减组：属于上一组，展示成「2-1 递减 / 2-2 递减」 */
  drop?: boolean;
}

/**
 * 动作变式选择：变式组 key → 选项 key。
 * 例：{ angle: 'incline', width: 'wide' } 表示「上斜 · 宽握」
 */
export type ExerciseVariants = Record<string, string>;

/** 训练中的一个动作实例（含实时组数据） */
export interface SessionExercise {
  /** 会话内唯一 key（同一动作可重复出现） */
  key: string;
  exerciseId: string;
  /** 变式选择（握法/握距这类），没选就没有 */
  variants?: ExerciseVariants;
  /** 器械名称（选填）：显示成「器械划船（鹦鹉螺）」 */
  equipmentName?: string;
  /** 自定义备注（选填）：本次训练对这个动作的补充说明，从计划带过来 */
  note?: string;
  sets: WorkoutSet[];
  /** 目标组数 */
  targetSets: number;
  /** 组间休息秒数 */
  restSeconds: number;
  /** 超级组编号：同组动作共享，轮内连着做、轮末才休息 */
  supersetId?: string;
  /** 有氧动作：目标强度（轻松 / 适中 / 高强度），从计划带过来 */
  targetIntensity?: CardioIntensity;
  /** 做完该动作后的主观感受（1-5，5 = 状态爆棚） */
  feel?: number;
  /** 选完感受后的补充备注（选填）：例如「第三组第 7 个动作变形，肘没夹住」 */
  feelNote?: string;
}

/** 一次训练会话 / 训练记录 */
export interface Session {
  id: string;
  planId?: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  exercises: SessionExercise[];
  status: 'active' | 'finished';
  /** 当前这段暂停的开始时间（存在即表示正处于暂停中） */
  pausedAt?: number;
  /** 累计已经暂停过的时长（毫秒），用于从总时长里扣掉 */
  pausedTotalMs?: number;
  /** 有氧训练：消耗热量 kcal（玩家手填） */
  calories?: number;
  /** 有氧训练：平均心率 bpm（玩家手填） */
  avgHeartRate?: number;
  /** 训练心得评分（结束训练时自动计算；新记录为 0-100，老记录是 1-10） */
  feelScore?: number;
  /** 评分满分：新记录为 100；老记录没有这个字段，按 10 处理 */
  feelScoreMax?: number;
  /** 自我评价（结束训练后可填，选填） */
  selfNote?: string;
}

/** 计划里的一组（支持每组不同重量/次数，例如递减组） */
export interface PlanSet {
  id: string;
  /** 目标重量 kg（辅助类动作为负数；负重自重动作 = 自重 + 负重） */
  weight: number;
  /** 负重自重动作：额外负重（用于显示「70+10」） */
  addedWeight?: number;
  /** 目标次数 */
  reps: number;
  /** 递减组：属于上一组，展示成「2-1 递减 / 2-2 递减」 */
  drop?: boolean;
}

/** 计划中的一个动作（模板） */
export interface PlanExercise {
  key: string;
  exerciseId: string;
  /** 变式选择（握法/握距这类），没选就没有 */
  variants?: ExerciseVariants;
  /** 逐组的目标重量 / 次数；有氧动作为空数组 */
  sets: PlanSet[];
  restSeconds: number;
  /** 超级组编号：同组动作共享，轮内连着做、轮末才休息 */
  supersetId?: string;
  /** 有氧动作：目标时长（分钟） */
  targetDurationMin?: number;
  /** 有氧动作：目标强度（轻松 / 适中 / 高强度） */
  targetIntensity?: CardioIntensity;
  /** 有氧动作：逐项目标值（跑步机速度/坡度、跳绳个数等） */
  cardioTarget?: Partial<Record<CardioFieldKey, number | string>>;
  /** 器械名称（选填）：显示成「器械划船（鹦鹉螺）」 */
  equipmentName?: string;
  /** 自定义备注（选填）：动作级的一句话说明，练的时候会带进训练 */
  note?: string;
}

/** 训练计划 */
export interface Plan {
  id: string;
  name: string;
  /** 计划开始执行的日期，格式 YYYY-MM-DD */
  startDate?: string;
  exercises: PlanExercise[];
  createdAt: number;
  updatedAt: number;
  /** 主训部位（新建/编辑时必选，决定计划详情页的展示图） */
  primaryMuscle?: MuscleGroup;
  /** 次训部位（可多个、可空；数量不设上限） */
  secondaryMuscles?: MuscleGroup[];
}

/** 性别 */
export type Gender = 'male' | 'female';

/** 训练经验档位 */
export type TrainingLevel = 'beginner' | 'advanced' | 'master';

/** 用户资料与偏好 */
export interface UserProfile {
  nickname: string;
  avatar: string;
  /** 默认组间休息秒数 */
  defaultRest: number;
  /** 是否开启休息倒计时 */
  restEnabled: boolean;
  /** 组间歇提示音 id（见 REST_SOUNDS；'off' 表示不响） */
  restSoundId: string;
  /** 组间歇到点是否震动 */
  restVibrate: boolean;
  /** 是否在计划详情页展示「训练报告」区域 */
  noteEnabled: boolean;
  /** 完成新手问卷的时间戳（存在即表示已引导过） */
  onboardedAt?: number;
  /** 性别（用于热量估算与体重默认值） */
  gender?: Gender;
  /** 年龄（岁） */
  age?: number;
  /** 体重（kg） */
  weight?: number;
  /** 训练经验：新手 / 老手 / 大神 */
  experience?: TrainingLevel;
  /** 训练年限（年） */
  trainingYears?: number;
  /** 训练年限里的零头月份（0~12） */
  trainingMonths?: number;
  /** 每周训练频次（次/周） */
  trainingFrequency?: number;
}

/**
 * 体重 & 维度记录：同一天只有一条（再填就是覆盖）。
 * 体重单位统一存 kg，页面上的「斤」只是展示换算（1kg = 2 斤）。
 */
export interface BodyRecord {
  id: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 体重（kg） */
  weight?: number;
  /** 体脂率（%） */
  bodyFat?: number;
  /** 以下围度单位都是 cm */
  neck?: number;
  shoulder?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  thighLeft?: number;
  thighRight?: number;
  armLeft?: number;
  armRight?: number;
  forearmLeft?: number;
  forearmRight?: number;
  calfLeft?: number;
  calfRight?: number;
  /** 最后一次填写的时间（HH:mm），趋势图上展示用 */
  recordedAt?: string;
}

/** 食物分类 */
export type FoodCategory =
  | 'staple'
  | 'meat'
  | 'dairy'
  | 'veg'
  | 'fruit'
  | 'nut'
  | 'drink'
  | 'supplement'
  | 'other';

/** 食物库条目：营养值统一按每 100g 记 */
export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  /** 每 100g 的热量（kcal） */
  kcal: number;
  /** 每 100g 的蛋白质（g） */
  protein: number;
  /** 每 100g 的碳水（g） */
  carb: number;
  /** 每 100g 的脂肪（g） */
  fat: number;
  /** 每 100g 的膳食纤维（g） */
  fiber: number;
  /** 每 100g 的钠（mg） */
  sodium: number;
  /** 一份的参考克数，例如 1 个鸡蛋 ≈ 50g */
  serving?: number;
  /** 用户自己建的食物 */
  isCustom?: boolean;
  /** 自定义食物的图片（本地路径） */
  image?: string;
}

/** 一天里的六餐 */
export type MealKey =
  | 'breakfast'
  | 'morningSnack'
  | 'lunch'
  | 'afternoonSnack'
  | 'dinner'
  | 'eveningSnack'
  | 'cheat';

/** 一餐里的一条食物：加进来时就把克数换算成实际营养存好 */
export interface DietEntry {
  id: string;
  /** 引用食物库的 id；手填的可能没有 */
  foodId?: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** 膳食纤维（g） */
  fiber: number;
  /** 钠（mg） */
  sodium: number;
}

/** 一天的饮食记录（一天一条，再填就是覆盖） */
export interface DietDay {
  date: string;
  meals: Record<MealKey, DietEntry[]>;
  updatedAt: number;
}
