import type { MuscleGroup, PlanExercise } from '@/types';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';

/**
 * 新建计划时中途退出留下的草稿。
 * 草稿只有填写过内容才会写，正式保存计划后会被清掉，
 * 所以在「保存」之前它始终只是一份草稿，不会混进正式计划列表。
 */
export interface PlanDraft {
  name: string;
  startDate: string;
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  exercises: PlanExercise[];
  updatedAt?: number;
}

/** 读取草稿；空草稿（没名、没动作、没部位）按「没有草稿」处理 */
export function loadPlanDraft(): PlanDraft | null {
  const draft = loadJSON<PlanDraft | null>(STORAGE_KEYS.planDraft, null);
  if (!draft) return null;
  if (!draft.name?.trim() && !draft.exercises?.length && !draft.primaryMuscle) return null;
  return {
    name: draft.name ?? '',
    startDate: draft.startDate ?? '',
    primaryMuscle: draft.primaryMuscle ?? null,
    secondaryMuscles: draft.secondaryMuscles ?? [],
    exercises: draft.exercises ?? [],
    updatedAt: draft.updatedAt
  };
}

export function savePlanDraft(draft: PlanDraft): void {
  saveJSON(STORAGE_KEYS.planDraft, { ...draft, updatedAt: Date.now() });
}

export function clearPlanDraft(): void {
  removeKey(STORAGE_KEYS.planDraft);
}
