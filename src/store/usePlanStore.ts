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
      targetDurationMin: item.targetDurationMin,
      // 有氧强度与器械参数（速度 / 坡度 / 档位 / 个数）也要保留
      targetIntensity: item.targetIntensity,
      cardioTarget: item.cardioTarget,
      // 变式、器械名称和备注要原样保留，否则重启后会丢失
      variants: item.variants,
      equipmentName: item.equipmentName,
      note: item.note,
      // 超级组编号也要保留，否则重启后超级组就散了
      supersetId: item.supersetId
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
  removePlan: (id: string) => void;
  clearPlans: () => void;
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
