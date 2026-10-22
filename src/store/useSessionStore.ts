import { create } from 'zustand';
import type { ExerciseVariants, Plan, Session, SessionExercise, WorkoutSet } from '@/types';
import { DEFAULT_REPS, DEFAULT_REST, DEFAULT_SETS } from '@/constants';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';
import { findLastPerformance, isAddedWeightExercise, recentPerformances } from '@/utils/workout';
import { estimateStartWeight } from '@/utils/strengthEstimate';
import { getExerciseById } from '@/store/useExerciseStore';
import { useProfileStore } from '@/store/useProfileStore';

/** 新动作的默认重量：自重动作带用户体重，其余按问卷预估一个起步重量 */
function initialWeight(exerciseId: string, variants?: ExerciseVariants): number {
  if (isAddedWeightExercise(exerciseId)) {
    return useProfileStore.getState().profile.weight ?? 0;
  }
  const estimate = estimateStartWeight(exerciseId, useProfileStore.getState().profile, {
    reps: DEFAULT_REPS,
    variants
  });
  return estimate ?? 0;
}

interface StartOptions {
  name?: string;
  plan?: Plan;
}

interface SessionState {
  /** 已完成的历史训练记录（按时间倒序） */
  sessions: Session[];
  /** 当前进行中的训练 */
  active: Session | null;
  /** 开始一次训练（可基于计划） */
  startSession: (options?: StartOptions) => Session;
  /** 结束并保存当前训练 */
  finishActive: () => Session | null;
  /** 放弃当前训练 */
  discardActive: () => void;
  /** 暂停当前训练（暂停计时） */
  pauseActive: () => void;
  /** 恢复当前训练（继续计时） */
  resumeActive: () => void;
  /** 修改训练名称 */
  renameActive: (name: string) => void;
  /** 更新当前训练的手填统计（有氧：消耗热量 / 平均心率）与训练心得评分 */
  patchActiveMeta: (patch: {
    calories?: number;
    avgHeartRate?: number;
    feelScore?: number;
    feelScoreMax?: number;
  }) => void;
  /** 添加动作 */
  addExerciseToActive: (
    exerciseId: string,
    targetSets?: number,
    restSeconds?: number,
    variants?: ExerciseVariants,
    equipmentName?: string
  ) => void;
  /** 移除动作 */
  removeExerciseFromActive: (key: string) => void;
  /** 调整动作顺序 */
  moveExerciseInActive: (key: string, direction: -1 | 1) => void;
  /** 替换某个动作（换器械 / 身体不适临时换），保留位置与组间休息 */
  replaceExerciseInActive: (
    key: string,
    exerciseId: string,
    variants?: ExerciseVariants,
    equipmentName?: string
  ) => void;
  /** 更新动作配置（目标组数 / 休息时间） */
  patchExerciseInActive: (key: string, patch: Partial<SessionExercise>) => void;
  /** 添加一组 */
  addSetToActive: (key: string) => void;
  /** 在最后一行下面追加递减组（重量/次数沿用上一行） */
  addDropSetToActive: (key: string) => void;
  /** 删除一组 */
  removeSetFromActive: (key: string, setId: string) => void;
  /** 更新某组数据 */
  updateSetInActive: (key: string, setId: string, patch: Partial<WorkoutSet>) => void;
  /** 切换某组完成状态 */
  toggleSetDone: (key: string, setId: string) => void;
  /** 更新历史记录的手填统计（有氧：消耗热量 / 平均心率） */
  updateSessionMeta: (id: string, patch: { calories?: number; avgHeartRate?: number }) => void;
  /** 保存训练结束后的自我评价 */
  setSessionNote: (id: string, note: string) => void;
  /** 自由训练练完后补上关联的计划 id，让它也能在计划详情里回看 */
  attachPlanToSession: (sessionId: string, planId: string) => void;
  /** 删除历史记录 */
  deleteSession: (id: string) => void;
  /** 删除某个计划产生的全部训练记录（删计划时一起清掉） */
  deleteSessionsByPlan: (planId: string) => void;
  /** 清空全部历史记录 */
  clearSessions: () => void;
}

function createSets(count: number, weight: number, reps: number): WorkoutSet[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    id: uid('set'),
    weight,
    reps,
    done: false
  }));
}

/**
 * 有氧动作只记一条数据（时长 / 距离 / 卡路里 / 配速等），不分多组。
 * 这里先留空，等练完（或结束训练时）自己填真实数据。
 */
function createCardioSets(): WorkoutSet[] {
  return [{ id: uid('set'), weight: 0, reps: 0, done: true }];
}

/** 该动作是否为有氧类 */
function isCardioExercise(exerciseId: string): boolean {
  return getExerciseById(exerciseId)?.muscle === 'cardio';
}

/** 训练记录统一按开始时间倒序（最新的排最前） */
function sortByStartedAtDesc(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.startedAt - a.startedAt);
}

/** 本地残留的「进行中训练」超过该时长即视为忘记结束，自动清理（12 小时） */
const ACTIVE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * 读取本地的「进行中训练」，并清理无效残留：
 * 1. 空训练（从未添加动作）——只是状态污染，不算在训练；
 * 2. 开始时间超过 12 小时——视为忘记结束的僵尸训练；
 * 3. 关联的计划已经被删除——训练失去意义，直接清掉。
 */
function loadActiveSession(): Session | null {
  const raw = loadJSON<Session | null>(STORAGE_KEYS.activeSession, null);
  if (!raw) return null;
  const empty = !raw.exercises || raw.exercises.length === 0;
  const expired = Date.now() - (raw.startedAt || 0) > ACTIVE_MAX_AGE_MS;
  const plans = loadJSON<Plan[]>(STORAGE_KEYS.plans, []);
  const planGone = Boolean(raw.planId) && !plans.some((plan) => plan.id === raw.planId);
  if (empty || expired || planGone) {
    removeKey(STORAGE_KEYS.activeSession);
    return null;
  }
  return raw;
}

/**
 * 读取训练记录，顺手清掉「关联计划已被删除」的记录：
 * 删计划时已经会联动删记录，这里兜底老数据 / 异常残留，
 * 保证训练页、数据、我的里的统计都不再包含已删计划的训练。
 */
function loadSessions(): Session[] {
  const list = loadJSON<Session[]>(STORAGE_KEYS.sessions, []);
  const plans = loadJSON<Plan[]>(STORAGE_KEYS.plans, []);
  const planIds = new Set(plans.map((plan) => plan.id));
  const alive = list.filter((item) => !item.planId || planIds.has(item.planId));
  if (alive.length !== list.length) {
    console.info('[Session] 清理已删计划的训练记录', list.length - alive.length, '条');
    saveJSON(STORAGE_KEYS.sessions, alive);
  }
  return alive;
}

export const useSessionStore = create<SessionState>((set, get) => {
  const persistActive = (active: Session | null) => {
    if (active) {
      saveJSON(STORAGE_KEYS.activeSession, active);
    } else {
      removeKey(STORAGE_KEYS.activeSession);
    }
    set({ active });
  };

  const persistSessions = (sessions: Session[]) => {
    const sorted = sortByStartedAtDesc(sessions);
    saveJSON(STORAGE_KEYS.sessions, sorted);
    set({ sessions: sorted });
  };

  /** 更新 active 中的某个动作，返回新的 active */
  const patchActiveExercise = (
    key: string,
    updater: (exercise: SessionExercise) => SessionExercise
  ) => {
    const active = get().active;
    if (!active) return;
    const exercises = active.exercises.map((item) => (item.key === key ? updater(item) : item));
    persistActive({ ...active, exercises });
  };

  return {
    sessions: sortByStartedAtDesc(loadSessions()),
    active: loadActiveSession(),

    startSession: (options) => {
      const { sessions } = get();
      const plan = options?.plan;
      const exercises: SessionExercise[] = (plan?.exercises ?? []).map((planExercise) => {
        // 有氧动作：只记一条时长 + 强度，不预填重量/次数
        if (isCardioExercise(planExercise.exerciseId)) {
          return {
            key: uid('se'),
            exerciseId: planExercise.exerciseId,
            variants: planExercise.variants,
            equipmentName: planExercise.equipmentName,
            targetSets: 1,
            restSeconds: planExercise.restSeconds || DEFAULT_REST,
            sets: createCardioSets()
          };
        }
        const last = findLastPerformance(sessions, planExercise.exerciseId);
        // 计划里是逐组配置：按计划的每组重量/次数预填（递减组也能还原）；
        // 某一组没设重量（0）就沿用该动作上一次的训练重量
        const planSets = planExercise.sets?.length
          ? planExercise.sets
          : [{ id: '', weight: 0, reps: DEFAULT_REPS }];
        const sets: WorkoutSet[] = planSets.map((planSet) => ({
          id: uid('set'),
          weight: planSet.weight !== 0 ? planSet.weight : last ? last.weight : 0,
          reps: planSet.reps || (last ? last.reps : DEFAULT_REPS) || DEFAULT_REPS,
          done: false,
          drop: planSet.drop
        }));
        return {
          key: uid('se'),
          exerciseId: planExercise.exerciseId,
          variants: planExercise.variants,
          equipmentName: planExercise.equipmentName,
          targetSets: sets.length,
          restSeconds: planExercise.restSeconds || DEFAULT_REST,
          sets
        };
      });
      const session: Session = {
        id: uid('sess'),
        planId: plan?.id,
        name: options?.name || plan?.name || '自由训练',
        startedAt: Date.now(),
        exercises,
        status: 'active'
      };
      console.info('[Session] 开始训练', session.id, session.name);
      persistActive(session);
      return session;
    },

    finishActive: () => {
      const active = get().active;
      if (!active) return null;
      const finished: Session = { ...active, endedAt: Date.now(), status: 'finished' };
      const sessions = [finished, ...get().sessions];
      persistSessions(sessions);
      persistActive(null);
      console.info('[Session] 结束训练', finished.id);
      return finished;
    },

    discardActive: () => {
      console.info('[Session] 放弃训练');
      persistActive(null);
    },

    pauseActive: () => {
      const active = get().active;
      if (!active || active.pausedAt) return;
      console.info('[Session] 暂停训练', active.id);
      persistActive({ ...active, pausedAt: Date.now() });
    },

    resumeActive: () => {
      const active = get().active;
      if (!active || !active.pausedAt) return;
      const pausedTotalMs = (active.pausedTotalMs ?? 0) + (Date.now() - active.pausedAt);
      console.info('[Session] 继续训练', active.id);
      persistActive({ ...active, pausedAt: undefined, pausedTotalMs });
    },

    renameActive: (name) => {
      const active = get().active;
      if (!active) return;
      persistActive({ ...active, name });
    },

    patchActiveMeta: (patch) => {
      const active = get().active;
      if (!active) return;
      persistActive({ ...active, ...patch });
    },

    addExerciseToActive: (exerciseId, targetSets = DEFAULT_SETS, restSeconds = DEFAULT_REST, variants, equipmentName) => {
      const active = get().active;
      if (!active) return;
      // 有氧动作：一条时长 + 强度记录
      if (isCardioExercise(exerciseId)) {
        const cardio: SessionExercise = {
          key: uid('se'),
          exerciseId,
          variants,
          equipmentName,
          targetSets: 1,
          restSeconds,
          sets: createCardioSets()
        };
        persistActive({ ...active, exercises: [...active.exercises, cardio] });
        return;
      }
      const last = findLastPerformance(get().sessions, exerciseId);
      const exercise: SessionExercise = {
        key: uid('se'),
        exerciseId,
        variants,
        equipmentName,
        targetSets,
        restSeconds,
        sets: createSets(
          targetSets,
          last ? last.weight : initialWeight(exerciseId, variants),
          last ? last.reps : DEFAULT_REPS
        )
      };
      persistActive({ ...active, exercises: [...active.exercises, exercise] });
    },

    removeExerciseFromActive: (key) => {
      const active = get().active;
      if (!active) return;
      persistActive({ ...active, exercises: active.exercises.filter((item) => item.key !== key) });
    },

    moveExerciseInActive: (key, direction) => {
      const active = get().active;
      if (!active) return;
      const exercises = [...active.exercises];
      const index = exercises.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= exercises.length) return;
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      persistActive({ ...active, exercises });
    },

    patchExerciseInActive: (key, patch) => {
      patchActiveExercise(key, (exercise) => ({ ...exercise, ...patch }));
    },

    replaceExerciseInActive: (key, exerciseId, variants, equipmentName) => {
      const active = get().active;
      if (!active) return;
      const current = active.exercises.find((item) => item.key === key);
      if (!current) return;
      const restSeconds = current.restSeconds || DEFAULT_REST;
      let next: SessionExercise;
      // 换成有氧：一条时长 + 强度
      if (isCardioExercise(exerciseId)) {
        next = {
          key,
          exerciseId,
          variants,
          equipmentName,
          targetSets: 1,
          restSeconds,
          sets: createCardioSets()
        };
      } else {
        // 有历史记录：直接按上次的每组重量/次数填好；第一次做：默认 1 组，自己再加
        const lastRecord = recentPerformances(get().sessions, exerciseId, 1)[0];
        const sets: WorkoutSet[] = lastRecord?.sets.length
          ? lastRecord.sets.map((item) => ({
              id: uid('set'),
              weight: item.weight,
              reps: item.reps || DEFAULT_REPS,
              done: false,
              drop: item.drop
            }))
          : [{ id: uid('set'), weight: initialWeight(exerciseId, variants), reps: DEFAULT_REPS, done: false }];
        next = {
          key,
          exerciseId,
          variants,
          equipmentName,
          targetSets: sets.length,
          restSeconds,
          sets
        };
      }
      console.info('[Session] 替换动作', key, exerciseId);
      persistActive({
        ...active,
        exercises: active.exercises.map((item) => (item.key === key ? next : item))
      });
    },

    /** 添加一组：最后一组是递减链就整条链复制一份（2-1、2-2…），重量次数不变 */
    addSetToActive: (key) => {
      patchActiveExercise(key, (exercise) => {
        let copies: WorkoutSet[];
        if (!exercise.sets.length) {
          copies = [{ id: uid('set'), weight: 0, reps: DEFAULT_REPS, done: false }];
        } else {
          // 找到最后一组所在递减链的基础组
          let chainStart = exercise.sets.length - 1;
          while (chainStart > 0 && exercise.sets[chainStart].drop) chainStart -= 1;
          copies = exercise.sets.slice(chainStart).map((set) => ({
            id: uid('set'),
            weight: set.weight,
            addedWeight: set.addedWeight,
            reps: set.reps,
            done: false,
            drop: set.drop
          }));
        }
        const sets = [...exercise.sets, ...copies];
        return { ...exercise, sets, targetSets: sets.length };
      });
    },

    addDropSetToActive: (key) => {
      patchActiveExercise(key, (exercise) => {
        const last = exercise.sets[exercise.sets.length - 1];
        if (!last) return exercise;
        const dropSet: WorkoutSet = {
          id: uid('set'),
          weight: last.weight,
          addedWeight: last.addedWeight,
          reps: last.reps,
          done: false,
          drop: true
        };
        const sets = [...exercise.sets, dropSet];
        return { ...exercise, sets, targetSets: sets.length };
      });
    },

    removeSetFromActive: (key, setId) => {
      patchActiveExercise(key, (exercise) => {
        if (exercise.sets.length <= 1) return exercise;
        const index = exercise.sets.findIndex((item) => item.id === setId);
        if (index < 0) return exercise;
        // 删基础组时，跟着的递减组一起删
        let end = index + 1;
        if (!exercise.sets[index].drop) {
          while (exercise.sets[end]?.drop) end += 1;
        }
        const sets = [...exercise.sets.slice(0, index), ...exercise.sets.slice(end)];
        if (!sets.length) return exercise;
        return { ...exercise, sets, targetSets: sets.length };
      });
    },

    updateSetInActive: (key, setId, patch) => {
      patchActiveExercise(key, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((item) => (item.id === setId ? { ...item, ...patch } : item))
      }));
    },

    toggleSetDone: (key, setId) => {
      patchActiveExercise(key, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((item) =>
          item.id === setId ? { ...item, done: !item.done } : item
        )
      }));
    },

    updateSessionMeta: (id, patch) => {
      persistSessions(
        get().sessions.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },

    setSessionNote: (id, note) => {
      persistSessions(
        get().sessions.map((item) =>
          item.id === id ? { ...item, selfNote: note.trim() || undefined } : item
        )
      );
    },

    attachPlanToSession: (id, planId) => {
      persistSessions(
        get().sessions.map((item) => (item.id === id ? { ...item, planId } : item))
      );
    },

    deleteSession: (id) => {
      persistSessions(get().sessions.filter((item) => item.id !== id));
    },

    deleteSessionsByPlan: (planId) => {
      const sessions = get().sessions.filter((item) => item.planId !== planId);
      persistSessions(sessions);
    },

    clearSessions: () => {
      console.info('[Session] 清空全部训练记录');
      persistSessions([]);
    }
  };
});
