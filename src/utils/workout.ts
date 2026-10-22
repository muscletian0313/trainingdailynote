import dayjs from 'dayjs';
import type {
  ExerciseVariants,
  MuscleGroup,
  Plan,
  PlanExercise,
  Session,
  SessionExercise,
  WorkoutSet
} from '@/types';
import { getExerciseById } from '@/store/useExerciseStore';
import { pad2 } from './format';
import { uid } from './id';

/**
 * 自由训练：把一次训练转成一个「计划」。
 * 这样练完也能落到计划详情里回看，和有计划的那次训练长得一样。
 */
export function planFromSession(session: Session): Plan {
  const exercises: PlanExercise[] = session.exercises.map((item) => {
    const cardioSet = item.sets.find((set) => typeof set.durationMin === 'number');
    return {
      key: uid('pe'),
      exerciseId: item.exerciseId,
      variants: item.variants,
      equipmentName: item.equipmentName,
      restSeconds: item.restSeconds,
      targetDurationMin: cardioSet?.durationMin,
      sets: item.sets.map((set) => ({
        id: uid('ps'),
        weight: set.weight,
        reps: set.reps,
        addedWeight: set.addedWeight,
        drop: set.drop
      }))
    };
  });
  const now = Date.now();
  return {
    id: uid('plan'),
    name: `自由训练 · ${dayjs(session.startedAt).format('M月D日')}`,
    startDate: dayjs(session.startedAt).format('YYYY-MM-DD'),
    exercises,
    createdAt: now,
    updatedAt: now
  };
}

/** 单组容量（已完成才计入）；辅助类动作的重量记负数，取绝对值算 */
export function setVolume(set: WorkoutSet): number {
  return set.done ? Math.abs(set.weight) * set.reps : 0;
}

/**
 * 组的显示编号：普通组 1、2、3；
 * 有递减组时显示成「2-1 递减 / 2-2 递减」（基础组也算第一条递减）。
 */
export function setLabels(sets: { drop?: boolean }[]): string[] {
  let base = 0;
  let sub = 0;
  return sets.map((set, index) => {
    // 递减组前面没有基础组（比如基础组被删了）：自己当普通组展示
    if (!set.drop || base === 0) {
      base += 1;
      sub = 1;
      const hasDrop = Boolean(sets[index + 1]?.drop);
      return hasDrop ? `${base}-1 递减` : String(base);
    }
    sub += 1;
    return `${base}-${sub} 递减`;
  });
}

/** 单个动作的容量（计时类动作没有「重量 × 次数」的概念，不计容量） */
export function exerciseVolume(exercise: SessionExercise): number {
  if (isTimedExercise(exercise.exerciseId)) return 0;
  return exercise.sets.reduce((sum, item) => sum + setVolume(item), 0);
}

/** 整场训练的容量 */
export function sessionVolume(session: Session): number {
  return session.exercises.reduce((sum, item) => sum + exerciseVolume(item), 0);
}

/** 训练总重量：所有已完成组的重量之和（辅助类的负数取绝对值，计时类不计） */
export function sessionTotalWeight(session: Session): number {
  return session.exercises.reduce(
    (sum, exercise) =>
      isTimedExercise(exercise.exerciseId)
        ? sum
        : sum +
          exercise.sets.reduce((acc, set) => acc + (set.done ? Math.abs(set.weight) : 0), 0),
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

/** 该动作是否已经做完：力量动作看是否全部勾完；有氧动作看是否填了时长 */
export function isExerciseFinished(exercise: SessionExercise): boolean {
  const isCardio = getExerciseById(exercise.exerciseId)?.muscle === 'cardio';
  if (isCardio) {
    return exercise.sets.some((set) => (set.durationMin ?? 0) > 0);
  }
  return exercise.sets.length > 0 && exercise.sets.every((set) => set.done);
}

/**
 * 自重类动作（引体向上 / 双杠臂屈伸这类）：负荷 = 体重 + 负重。
 * 所以自重动作也要能填重量，默认带出用户填过的体重，没填过就留空自己写。
 */
export function isAddedWeightExercise(exerciseId: string): boolean {
  const equipment = getExerciseById(exerciseId)?.equipment;
  return equipment === '自重' || equipment === '吊环';
}

/**
 * 辅助类动作（器械辅助引体向上）：重量记成负数（-多少公斤 = 借了多少力）。
 */
const ASSIST_EXERCISES = new Set(['器械辅助引体向上']);

export function isAssistExercise(exerciseId: string): boolean {
  const name = getExerciseById(exerciseId)?.name;
  return Boolean(name && ASSIST_EXERCISES.has(name));
}

/**
 * 计时类动作（平板支撑这类）：一组是「撑多少秒」，不是「做多少次」。
 * 秒数存在 reps 字段里，展示时把单位换成「秒」，也不参与容量 / PR 统计。
 */
const TIMED_EXERCISES = new Set(['平板支撑', '侧平板支撑']);

export function isTimedExercise(exerciseId: string): boolean {
  const name = getExerciseById(exerciseId)?.name;
  return Boolean(name && TIMED_EXERCISES.has(name));
}

/** 计时动作的默认秒数（计划里新建一组时用） */
export const DEFAULT_HOLD_SECONDS = 60;

/**
 * 训练评分（0-100）：难度 + 完成度 + 相对强度。
 * 单动作分 = 完成度 × (50 + 难度分 15/25/35 + 强度分 0-15)；
 * 训练分 = 各动作按组数加权平均。
 */
export interface SessionRating {
  score: number;
  message: string;
}

/** 难度分：轻松 15 / 适中 25 / 困难 35（没选感受按适中算） */
function feelPoints(feel?: number): number {
  if (typeof feel !== 'number') return 25;
  if (feel >= 4) return 15;
  if (feel === 3) return 25;
  return 35;
}

/** 某个动作已完成组里的最大负荷（自重动作算上额外负重） */
function bestDoneLoad(item: SessionExercise): number {
  return item.sets.reduce((best, set) => {
    if (!set.done) return best;
    return Math.max(best, Math.abs(set.weight ?? 0) + (set.addedWeight ?? 0));
  }, 0);
}

export function sessionRating(session: Session, history: Session[] = []): SessionRating | null {
  const items = session.exercises.filter((item) => item.sets.length > 0);
  if (!items.length) return null;

  let weighted = 0;
  let totalWeight = 0;

  items.forEach((item) => {
    const done = item.sets.filter((set) => set.done).length;
    const completion = done / item.sets.length;
    const difficulty = feelPoints(item.feel);

    // 强度分：本次最好重量 vs 历史最好重量（没历史 / 辅助 / 自重动作给中间值）
    let strength = 7.5;
    const current = bestDoneLoad(item);
    if (current > 0 && !isAssistExercise(item.exerciseId)) {
      const past = history.reduce((best, record) => {
        const same = record.exercises.filter((entry) => entry.exerciseId === item.exerciseId);
        return same.reduce((value, entry) => Math.max(value, bestDoneLoad(entry)), best);
      }, 0);
      if (past > 0) {
        const ratio = Math.max(0.8, Math.min(1.2, current / past));
        strength = ((ratio - 0.8) / 0.4) * 15;
      }
    }

    const score = Math.max(0, Math.min(100, completion * (50 + difficulty + strength)));
    const weight = item.sets.length;
    weighted += score * weight;
    totalWeight += weight;
  });

  const score = Math.round(weighted / totalWeight);
  return { score, message: feelMessage(score) };
}

/** 根据评分给出鼓励文案（0-100）：低分给鼓励，高分给肯定，保持训练热情 */
export function feelMessage(score: number): string {
  if (score >= 90) return '高强度完成，刺激拉满！记得补蛋白、睡够觉，明天别连着练同一部位 🏆';
  if (score >= 75) return '完成度和强度都在线，这次练得很扎实，保持这个节奏 🚀';
  if (score >= 60) return '训练完成得不错，稳步积累就是最快的进步 👏';
  if (score >= 45) return '今天有几个动作没做完或状态一般，下次把节奏找回来 🙂';
  return '今天状态不在线还坚持完成了，已经很棒！好好休息，下一场再来 💪';
}

/** 老记录存的是 1-10 分，新记录是 0-100：统一换算成百分制展示 */
export function feelScoreOutOf100(session: Pick<Session, 'feelScore' | 'feelScoreMax'>): number | null {
  if (session.feelScore === undefined) return null;
  if ((session.feelScoreMax ?? 0) >= 100) return session.feelScore;
  return Math.round(session.feelScore * 10);
}

/** 该计划是否已完成过：一个计划只允许完成一次，完成后仅可查看 */
export function isPlanFinished(sessions: Session[], planId: string): boolean {
  return sessions.some((session) => session.planId === planId);
}

export interface Performance {
  weight: number;
  /** 负重自重动作：额外负重（显示成「70+10」用） */
  addedWeight?: number;
  reps: number;
}

/** 某动作的历次训练记录（按时间倒序，只取该动作有完成组的那几次） */
export interface PerformanceRecord {
  sessionId: string;
  startedAt: number;
  /** 该次该动作的已完成组 */
  sets: Performance[];
  /** 有氧动作：该次总时长（分钟） */
  cardioMin?: number;
  /** 该次该动作的主观感受（1-5），没选过则为空 */
  feel?: number;
}

/** 取某动作最近 N 次的训练记录（默认 4 次） */
export function recentPerformances(
  sessions: Session[],
  exerciseId: string,
  limit = 4
): PerformanceRecord[] {
  return collectPerformances(sessions, exerciseId, limit, () => true);
}

/** 变式（标签）是否完全一致：有一个不同就算不同练法 */
function sameVariants(a?: ExerciseVariants, b?: ExerciseVariants): boolean {
  const norm = (value?: ExerciseVariants) =>
    Object.entries(value ?? {})
      .filter(([, option]) => Boolean(option))
      .sort(([left], [right]) => left.localeCompare(right));
  const left = norm(a);
  const right = norm(b);
  if (left.length !== right.length) return false;
  return left.every(
    ([key, option], index) => key === right[index][0] && option === right[index][1]
  );
}

/** 取某动作最近 N 次「标签完全一致」的训练记录：练法不同就没有参考意义 */
export function recentPerformancesByVariants(
  sessions: Session[],
  exerciseId: string,
  variants?: ExerciseVariants,
  limit = 4
): PerformanceRecord[] {
  return collectPerformances(
    sessions,
    exerciseId,
    limit,
    (target) => sameVariants(target.variants, variants)
  );
}

function collectPerformances(
  sessions: Session[],
  exerciseId: string,
  limit: number,
  match: (target: SessionExercise) => boolean
): PerformanceRecord[] {
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  const result: PerformanceRecord[] = [];
  for (const session of ordered) {
    const target = session.exercises.find(
      (item) => item.exerciseId === exerciseId && match(item)
    );
    if (!target) continue;
    const done = target.sets.filter((set) => set.done);
    if (!done.length) continue;
    const cardioMin = done.reduce((sum, set) => sum + (set.durationMin ?? 0), 0);
    result.push({
      sessionId: session.id,
      startedAt: session.startedAt,
      sets: done.map((set) => ({ weight: set.weight, addedWeight: set.addedWeight, reps: set.reps })),
      cardioMin: cardioMin > 0 ? cardioMin : undefined,
      feel: target.feel
    });
    if (result.length >= limit) break;
  }
  return result;
}

/** 查找某动作最近一次的训练表现（用于自动预填重量） */
export function findLastPerformance(sessions: Session[], exerciseId: string): Performance | null {
  const ordered = [...sessions].sort((a, b) => b.startedAt - a.startedAt);
  for (const session of ordered) {
    const target = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!target) continue;
    const done = target.sets.filter((set) => set.done && set.weight !== 0);
    if (!done.length) continue;
    // 辅助类动作重量是负数：辅助越少越强，所以「最大」的那个就是最好的
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

/**
 * 训练记录在日历上归属的日期：
 * 有计划 → 用计划设定的开始日期；自由训练 → 用实际开始时间。
 */
export function sessionDateKey(session: Session, plan?: Plan): string {
  if (plan?.startDate) return dayjs(plan.startDate).format('YYYY-MM-DD');
  return dayjs(session.startedAt).format('YYYY-MM-DD');
}

export function groupSessionsByDate(
  sessions: Session[],
  plans: Plan[] = []
): Record<string, Session[]> {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const map: Record<string, Session[]> = {};
  sessions.forEach((session) => {
    const key = sessionDateKey(session, session.planId ? planById.get(session.planId) : undefined);
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
      // 计时类动作（平板支撑）没有 1RM 的概念，跳过
      if (isTimedExercise(exercise.exerciseId)) return;
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
    { keyword: '推肩', muscle: 'shoulders' },
    { keyword: '推举', muscle: 'shoulders' },
    { keyword: '三角', muscle: 'shoulders' },
    { keyword: '卧推', muscle: 'chest' },
    { keyword: '夹胸', muscle: 'chest' },
    { keyword: '飞鸟', muscle: 'chest' },
    { keyword: '引体', muscle: 'back' },
    { keyword: '划船机', muscle: 'cardio' },
    { keyword: '划船', muscle: 'back' },
    { keyword: '硬拉', muscle: 'back' },
    { keyword: '二头', muscle: 'biceps' },
    { keyword: '弯举', muscle: 'biceps' },
    { keyword: '三头', muscle: 'triceps' },
    { keyword: '臂屈伸', muscle: 'triceps' },
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
    { keyword: '臂', muscle: 'biceps' },
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
