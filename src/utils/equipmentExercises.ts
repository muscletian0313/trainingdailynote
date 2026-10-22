import type { Exercise, Plan, Session } from '@/types';

/**
 * 用户填过器械 / 具体名称后自动「长出来」的动作。
 *
 * 例：器械划船 + 鹦鹉螺 → 「器械划船（鹦鹉螺）」。
 * 计划 / 记录里存的仍然是基础动作 id + equipmentName，这里只是把用过的组合
 * 汇总成一条可再次选择的动作，跟着计划和记录自动同步（不需要单独维护）。
 */
export interface EquipmentExercise extends Exercise {
  /** 基础动作 id（选中后存回计划 / 记录的就是它） */
  baseId: string;
  /** 基础动作名称（变式、标签都按基础动作算） */
  baseName: string;
  /** 用户填的器械 / 具体名称 */
  equipmentName: string;
}

/** 是否是「器械名」生成的动作 */
export function isEquipmentExercise(item: Exercise): item is EquipmentExercise {
  return Boolean((item as EquipmentExercise).baseId && (item as EquipmentExercise).equipmentName);
}

/**
 * 汇总用户用过的「基础动作 + 器械名」组合，最近用过的排在前面。
 * 只要计划或记录里填过器械名，就算用户建了一个自定义动作。
 */
export function equipmentExercisesOf(
  plans: Plan[],
  sessions: Session[],
  all: Exercise[]
): EquipmentExercise[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const found = new Map<string, { row: EquipmentExercise; at: number }>();

  const put = (baseId: string, rawName: string | undefined, at: number) => {
    const name = (rawName ?? '').trim();
    if (!name) return;
    const base = byId.get(baseId);
    if (!base) return;
    const key = `${baseId}::${name}`;
    const hit = found.get(key);
    if (hit) {
      hit.at = Math.max(hit.at, at);
      return;
    }
    found.set(key, {
      at,
      row: {
        id: `ce-${baseId}-${name}`,
        name: `${base.name}（${name}）`,
        muscle: base.muscle,
        equipment: base.equipment,
        isCustom: true,
        baseId,
        baseName: base.name,
        equipmentName: name
      }
    });
  };

  sessions.forEach((session) => {
    const at = session.endedAt ?? session.startedAt;
    session.exercises.forEach((item) => put(item.exerciseId, item.equipmentName, at));
  });
  plans.forEach((plan) => {
    plan.exercises.forEach((item) => put(item.exerciseId, item.equipmentName, plan.updatedAt));
  });

  return [...found.values()].sort((a, b) => b.at - a.at).map((entry) => entry.row);
}
