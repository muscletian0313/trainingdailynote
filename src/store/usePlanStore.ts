import { create } from 'zustand';
import type { Plan, PlanExercise, PlanSet } from '@/types';
import { DEFAULT_REPS, DEFAULT_SETS, DEFAULT_WEIGHT } from '@/constants';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';

/** 旧版本的计划动作：单组重量/次数 + 组数 */
type StoredExercise = Omit<PlanExercise, 'sets'> & {
  sets?: PlanSet[];
  targetWeight?: number;
  targetSets?: number;
  targetReps?: number;
};

type StoredPlan = Omit<Plan, 'exercises'> & { exercises: StoredExercise[] };

/**
 * 旧数据只有「单组重量 + 组数 + 次数」，读取时统一展开成逐组数据，
 * 后续代码只认 PlanExercise.sets，不再做兼容判断。
 */
function normalizeExercises(exercises: StoredExercise[]): PlanExercise[] {
  return exercises.map((item) => {
    const base = {
      key: item.key,
      exerciseId: item.exerciseId,
      restSeconds: item.restSeconds,
      targetDurationMin: item.targetDurationMin
    };
    if (Array.isArray(item.sets) && item.sets.length) {
      return { ...base, sets: item.sets };
    }
    const weight = typeof item.targetWeight === 'number' ? item.targetWeight : DEFAULT_WEIGHT;
    const reps = typeof item.targetReps === 'number' ? item.targetReps : DEFAULT_REPS;
    const count = Math.max(1, item.targetSets ?? DEFAULT_SETS);
    return {
      ...base,
      sets: Array.from({ length: count }, () => ({ id: uid('ps'), weight, reps }))
    };
  });
}

function normalizePlans(plans: StoredPlan[]): Plan[] {
  return plans.map((plan) => ({ ...plan, exercises: normalizeExercises(plan.exercises) }));
}

interface PlanState {
  plans: Plan[];
  addPlan: (plan: Plan) => void;
  updatePlan: (plan: Plan) => void;
  /** 复制一份计划（动作与组都换新 id，互不影响），开始日期改成今天 */
  duplicatePlan: (id: string) => Plan | undefined;
  removePlan: (id: string) => void;
  clearPlans: () => void;
}

/** 今天日期，形如 2026-10-16 */
function todayKey(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: normalizePlans(loadJSON<StoredPlan[]>(STORAGE_KEYS.plans, [])),
  addPlan: (plan) => {
    const plans = [plan, ...get().plans];
    saveJSON(STORAGE_KEYS.plans, plans);
    set({ plans });
  },
  updatePlan: (plan) => {
    const plans = get().plans.map((item) =>
      item.id === plan.id ? { ...plan, updatedAt: Date.now() } : item
    );
    saveJSON(STORAGE_KEYS.plans, plans);
    set({ plans });
  },
  duplicatePlan: (id) => {
    const source = get().plans.find((item) => item.id === id);
    if (!source) return undefined;
    const now = Date.now();
    const copy: Plan = {
      ...source,
      id: uid('plan'),
      startDate: todayKey(),
      exercises: source.exercises.map((item) => ({
        ...item,
        key: uid('pe'),
        variants: item.variants ? { ...item.variants } : undefined,
        sets: item.sets.map((set) => ({ ...set, id: uid('ps') }))
      })),
      createdAt: now,
      updatedAt: now
    };
    const plans = [copy, ...get().plans];
    saveJSON(STORAGE_KEYS.plans, plans);
    set({ plans });
    return copy;
  },
  removePlan: (id) => {
    const plans = get().plans.filter((item) => item.id !== id);
    saveJSON(STORAGE_KEYS.plans, plans);
    set({ plans });
  },
  clearPlans: () => {
    removeKey(STORAGE_KEYS.plans);
    set({ plans: [] });
  }
}));

/** 根据 id 获取计划 */
export function getPlanById(id: string): Plan | undefined {
  return usePlanStore.getState().plans.find((item) => item.id === id);
}
