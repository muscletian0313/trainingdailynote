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
  /** 有氧动作：距离（公里）；跳绳这类不记距离的就是空 */
  distanceKm?: number;
  /** 有氧动作：消耗热量（kcal） */
  calories?: number;
  /** 有氧动作：配速（手写，如 6'30"/km） */
  pace?: string;
  /** 有氧动作：坡度（手写，如 8%） */
  incline?: string;
  /** 有氧动作：阻力（手写，如 8 档） */
  resistance?: string;
  /** 有氧动作：自定义强度（老数据，如「中速」） */
  intensity?: string;
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
  sets: WorkoutSet[];
  /** 目标组数 */
  targetSets: number;
  /** 组间休息秒数 */
  restSeconds: number;
  /** 做完该动作后的主观感受（1-5，5 = 状态爆棚） */
  feel?: number;
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
  /** 训练心得评分（1-10，结束训练时由各动作感受换算而来） */
  feelScore?: number;
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
  /** 有氧动作：目标时长（分钟） */
  targetDurationMin?: number;
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
  /** 是否在计划详情页展示「训练心得」区域 */
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
