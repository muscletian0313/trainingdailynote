// 全局数据模型定义

/** 肌群分类 */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
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
  /** 重量 kg（有氧动作固定 0） */
  weight: number;
  /** 次数（有氧动作固定 0） */
  reps: number;
  /** 是否已完成 */
  done: boolean;
  /** 有氧动作：时长（分钟），存在即代表这是一条有氧记录 */
  durationMin?: number;
  /** 有氧动作：自定义强度（玩家手写，如「中速」「坡度 8」） */
  intensity?: string;
}

/** 训练中的一个动作实例（含实时组数据） */
export interface SessionExercise {
  /** 会话内唯一 key（同一动作可重复出现） */
  key: string;
  exerciseId: string;
  sets: WorkoutSet[];
  /** 目标组数 */
  targetSets: number;
  /** 组间休息秒数 */
  restSeconds: number;
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
}

/** 计划中的一个动作（模板） */
export interface PlanExercise {
  key: string;
  exerciseId: string;
  /** 做组重量 kg */
  targetWeight: number;
  targetSets: number;
  targetReps: number;
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

/** 用户资料与偏好 */
export interface UserProfile {
  nickname: string;
  avatar: string;
  /** 默认组间休息秒数 */
  defaultRest: number;
  /** 是否开启休息倒计时 */
  restEnabled: boolean;
  /** 是否在计划详情页展示「训练心得」区域 */
  noteEnabled: boolean;
}
