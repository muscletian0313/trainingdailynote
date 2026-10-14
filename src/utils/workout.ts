import dayjs from 'dayjs';
import type { MuscleGroup, Plan, Session, SessionExercise, WorkoutSet } from '@/types';
import { getExerciseById } from '@/store/useExerciseStore';
import { pad2 } from './format';

/** 单组容量（已完成才计入） */
export function setVolume(set: WorkoutSet): number {
  return set.done ? set.weight * set.reps : 0;
}

/** 单个动作的容量 */
export function exerciseVolume(exercise: SessionExercise): number {
  return exercise.sets.reduce((sum, item) => sum + setVolume(item), 0);
}

/** 整场训练的容量 */
export function sessionVolume(session: Session): number {
  return session.exercises.reduce((sum, item) => sum + exerciseVolume(item), 0);
}

/** 训练总重量：所有已完成组的重量之和 */
export function sessionTotalWeight(session: Session): number {
  return session.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.reduce((acc, set) => acc + (set.done ? set.weight : 0), 0),
    0
  );
}

/** 计划总组数（含未完成组） */
export function sessionTotalSets(session: Session): number {
  return session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
}

/** 已完成组数 */
export function sessionDoneSets(session: Session): number {
  return session.exercises.reduce(
    (sum, item) => sum + item.sets.filter((set) => set.done).length,
    0
  );
}

/** 训练时长（秒）：已结束的算实际时长，进行中的要扣掉暂停时间 */
export function sessionDurationSec(session: Session): number {
  const end = session.endedAt ?? Date.now();
  const ongoingPause = session.pausedAt ? end - session.pausedAt : 0;
  const total = end - session.startedAt - (session.pausedTotalMs ?? 0) - ongoingPause;
  return Math.max(0, Math.round(total / 1000));
}

/** 训练是否正处于暂停中 */
export function isSessionPaused(session: Session | null | undefined): boolean {
  return !!session?.pausedAt;
}

/** 训练里是否含有氧动作 */
export function hasCardio(session: Session): boolean {
  return session.exercises.some((item) => getExerciseById(item.exerciseId)?.muscle === 'cardio');
}

/** 训练里的力量动作（非有氧） */
export function strengthExercises(session: Session): SessionExercise[] {
  return session.exercises.filter(
    (item) => getExerciseById(item.exerciseId)?.muscle !== 'cardio'
  );
}

/** 训练里的有氧动作 */
export function cardioExercises(session: Session): SessionExercise[] {
  return session.exercises.filter((item) => getExerciseById(item.exerciseId)?.muscle === 'cardio');
}

/** 力量动作的容量合计（kg） */
export function strengthVolume(session: Session): number {
  return strengthExercises(session).reduce((sum, item) => sum + exerciseVolume(item), 0);
}

/** 力量动作的组数统计 */
export function strengthSets(session: Session): { done: number; total: number } {
  const list = strengthExercises(session);
  return {
    total: list.reduce((sum, item) => sum + item.sets.length, 0),
    done: list.reduce((sum, item) => sum + item.sets.filter((set) => set.done).length, 0)
  };
}

/** 训练里所有有氧动作的时长合计（分钟） */
export function sessionCardioMin(session: Session): number {
  return cardioExercises(session).reduce(
    (sum, exercise) => sum + exercise.sets.reduce((acc, set) => acc + (set.durationMin ?? 0), 0),
    0
  );
}

/** 该计划是否已完成过：一个计划只允许完成一次，完成后仅可查看 */
export function isPlanFinished(sessions: Session[], planId: string): boolean {
  return sessions.some((session) => session.planId === planId);
}

export interface Performance {
  weight: number;
  reps: number;
}

/** 查找某动作最近一次的训练表现（用于自动预填重量） */
export function findLastPerformance(sessions: Session[], exerciseId: string): Performance | null {
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const session of ordered) {
    const target = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!target) continue;
    const done = target.sets.filter((set) => set.done && set.weight > 0);
    if (!done.length) continue;
    const best = done.reduce((a, b) => (b.weight > a.weight ? b : a));
    return { weight: best.weight, reps: best.reps };
  }
  return null;
}

export interface DayVolume {
  label: string;
  date: string;
  volume: number;
  sessionCount: number;
  isToday: boolean;
}

/** 近 N 天的训练容量 */
export function recentDaysVolume(sessions: Session[], days = 7): DayVolume[] {
  const result: DayVolume[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dayjs().subtract(i, 'day');
    const key = day.format('YYYY-MM-DD');
    const daySessions = sessions.filter(
      (session) => dayjs(session.startedAt).format('YYYY-MM-DD') === key
    );
    result.push({
      label: `${day.month() + 1}/${pad2(day.date())}`,
      date: key,
      volume: daySessions.reduce((sum, session) => sum + sessionVolume(session), 0),
      sessionCount: daySessions.length,
      isToday: i === 0
    });
  }
  return result;
}

/** 统计区间内的训练总容量 */
export function totalVolume(sessions: Session[]): number {
  return sessions.reduce((sum, session) => sum + sessionVolume(session), 0);
}

/** 统计区间内的训练总时长（秒） */
export function totalDurationSec(sessions: Session[]): number {
  return sessions.reduce((sum, session) => sum + sessionDurationSec(session), 0);
}

/** 按 YYYY-MM-DD 聚合训练记录，用于训练日历 */
export function groupSessionsByDate(sessions: Session[]): Record<string, Session[]> {
  const map: Record<string, Session[]> = {};
  sessions.forEach((session) => {
    const key = dayjs(session.startedAt).format('YYYY-MM-DD');
    if (!map[key]) map[key] = [];
    map[key].push(session);
  });
  return map;
}

export interface PrItem {
  exerciseId: string;
  /** 最佳单组重量 */
  weight: number;
  /** 最佳单组次数 */
  reps: number;
  /** 预估 1RM（Epley 公式） */
  oneRm: number;
  /** 达成时间 */
  achievedAt: number;
  sessionId: string;
}

/** 预估 1RM（Epley 公式：重量 × (1 + 次数 / 30)） */
export function estimateOneRm(weight: number, reps: number): number {
  if (weight <= 0) return 0;
  if (reps <= 1) return Math.round(weight);
  return Math.round(weight * (1 + reps / 30));
}

/** 计算每个动作的个人最佳（PR）：最佳单组 + 预估 1RM，按预估 1RM 倒序 */
export function computePrs(sessions: Session[]): PrItem[] {
  const map = new Map<string, PrItem>();
  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.done || set.weight <= 0) return;
        const oneRm = estimateOneRm(set.weight, set.reps);
        const current = map.get(exercise.exerciseId);
        if (!current) {
          map.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            weight: set.weight,
            reps: set.reps,
            oneRm,
            achievedAt: session.startedAt,
            sessionId: session.id
          });
          return;
        }
        const betterSet =
          set.weight > current.weight || (set.weight === current.weight && set.reps > current.reps);
        const betterOneRm = oneRm > current.oneRm;
        map.set(exercise.exerciseId, {
          exerciseId: exercise.exerciseId,
          weight: betterSet ? set.weight : current.weight,
          reps: betterSet ? set.reps : current.reps,
          oneRm: Math.max(current.oneRm, oneRm),
          achievedAt: betterOneRm ? session.startedAt : current.achievedAt,
          sessionId: betterOneRm ? session.id : current.sessionId
        });
      });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.oneRm - a.oneRm);
}

/**
 * 计划名称 -> 主训肌群 的关键词表。
 * 关键词越长越具体，匹配时优先命中（例如「推举」优先于「推」）。
 */
const NAME_MUSCLE_KEYWORDS: { keyword: string; muscle: MuscleGroup }[] = (
  [
    { keyword: '侧平举', muscle: 'shoulders' },
    { keyword: '肩推', muscle: 'shoulders' },
    { keyword: '推举', muscle: 'shoulders' },
    { keyword: '三角', muscle: 'shoulders' },
    { keyword: '卧推', muscle: 'chest' },
    { keyword: '夹胸', muscle: 'chest' },
    { keyword: '飞鸟', muscle: 'chest' },
    { keyword: '引体', muscle: 'back' },
    { keyword: '划船机', muscle: 'cardio' },
    { keyword: '划船', muscle: 'back' },
    { keyword: '硬拉', muscle: 'back' },
    { keyword: '弯举', muscle: 'arms' },
    { keyword: '屈伸', muscle: 'arms' },
    { keyword: '二头', muscle: 'arms' },
    { keyword: '三头', muscle: 'arms' },
    { keyword: '手臂', muscle: 'arms' },
    { keyword: '下肢', muscle: 'legs' },
    { keyword: '深蹲', muscle: 'legs' },
    { keyword: '箭步', muscle: 'legs' },
    { keyword: '核心', muscle: 'core' },
    { keyword: '有氧', muscle: 'cardio' },
    { keyword: '跳绳', muscle: 'cardio' },
    { keyword: '椭圆', muscle: 'cardio' },
    { keyword: '单车', muscle: 'cardio' },
    { keyword: '胸', muscle: 'chest' },
    { keyword: '推', muscle: 'chest' },
    { keyword: '背', muscle: 'back' },
    { keyword: '拉', muscle: 'back' },
    { keyword: '腿', muscle: 'legs' },
    { keyword: '蹲', muscle: 'legs' },
    { keyword: '肩', muscle: 'shoulders' },
    { keyword: '臂', muscle: 'arms' },
    { keyword: '腹', muscle: 'core' },
    { keyword: '腰', muscle: 'core' },
    { keyword: '跑', muscle: 'cardio' }
  ] as { keyword: string; muscle: MuscleGroup }[]
).sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * 根据计划名称猜测主训肌群（用于添加动作时自动定位到对应肌群）。
 * 例如「腿日」-> legs、「推日」-> chest、「上肢力量」-> 无明确命中。
 */
export function detectMuscleFromName(name: string): MuscleGroup | null {
  const text = name.trim();
  if (!text) return null;
  const hit = NAME_MUSCLE_KEYWORDS.find((rule) => text.includes(rule.keyword));
  return hit ? hit.muscle : null;
}

/**
 * 计划的主训部位：优先用玩家显式选择的部位；
 * 老计划没选过，则回退到「按名称推断 → 第一个动作的肌群」。
 */
export function planPrimaryMuscle(plan: Plan): MuscleGroup {
  if (plan.primaryMuscle) return plan.primaryMuscle;
  const byName = detectMuscleFromName(plan.name);
  if (byName) return byName;
  for (const item of plan.exercises) {
    const info = getExerciseById(item.exerciseId);
    if (info) return info.muscle;
  }
  return 'other';
}

/**
 * 计划展示用的肌群标签（主训在最前，其后是次训）。
 * 老计划没有显式次训时，用动作库里的肌群补齐，保证卡片信息不空。
 */
export function planMuscleTags(plan: Plan, limit = 3): MuscleGroup[] {
  const list: MuscleGroup[] = [];
  const push = (muscle?: MuscleGroup | null) => {
    if (muscle && !list.includes(muscle)) list.push(muscle);
  };

  push(planPrimaryMuscle(plan));
  (plan.secondaryMuscles ?? []).forEach(push);

  if (!plan.secondaryMuscles) {
    plan.exercises.forEach((item) => push(getExerciseById(item.exerciseId)?.muscle));
  }

  return list.slice(0, limit);
}
