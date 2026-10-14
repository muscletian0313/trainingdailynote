import { create } from 'zustand';
import type { Plan } from '@/types';
import { DEFAULT_WEIGHT } from '@/constants';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';

/** 旧数据没有做组重量字段，读取时直接按默认值补齐，后续代码不再做兼容判断 */
function normalizePlans(plans: Plan[]): Plan[] {
  return plans.map((plan) => ({
    ...plan,
    exercises: plan.exercises.map((item) => ({
      ...item,
      targetWeight: typeof item.targetWeight === 'number' ? item.targetWeight : DEFAULT_WEIGHT
    }))
  }));
}

interface PlanState {
  plans: Plan[];
  addPlan: (plan: Plan) => void;
  updatePlan: (plan: Plan) => void;
  removePlan: (id: string) => void;
  clearPlans: () => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: normalizePlans(loadJSON<Plan[]>(STORAGE_KEYS.plans, [])),
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
