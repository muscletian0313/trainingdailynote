import type { MuscleGroup, Plan, PlanExercise, PlanSet } from '@/types';
import { uid } from './id';

/**
 * 计划分享：把计划压成一段「只含 URL 安全字符」的紧凑字符串，
 * 塞进分享卡片的路径参数里带给好友（不需要服务器）。
 *
 * 分隔符全部取自 encodeURIComponent 不会转义的字符（!'()*-._~），
 * 所以整串再包一层 encodeURIComponent 时，只有中文计划名会变长，
 * 一个十来个动作的计划大约 500~900 字符，能塞进分享路径。
 */

const VERSION = '1';
/** 顶层字段之间 */
const FIELD = '~';
/** 动作之间 */
const LIST = '!';
/** 一个动作内部的列表项之间（变式、组） */
const ITEM = '*';
/** 键值之间 */
const KV = '_';
/** 一个动作自己的字段之间 */
const SLOT = "'";

/** 计划名里出现分隔符会把结构冲乱，编码前先替换掉 */
const UNSAFE = /[~!*'()_%]/g;

/** 分享出去的计划内容（动作的 key / set 的 id 在解码时重新生成） */
export interface SharedPlan {
  name: string;
  startDate?: string;
  primaryMuscle?: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  exercises: PlanExercise[];
}

function encodeExercise(item: PlanExercise): string {
  const variants = Object.entries(item.variants ?? {})
    .map(([group, option]) => `${group}${KV}${option}`)
    .join(ITEM);

  const sets = item.sets
    .map((set) =>
      typeof set.addedWeight === 'number'
        ? `${set.weight}${KV}${set.reps}${KV}${set.addedWeight}`
        : `${set.weight}${KV}${set.reps}`
    )
    .join(ITEM);

  return [
    item.exerciseId,
    variants,
    sets,
    String(item.restSeconds ?? ''),
    typeof item.targetDurationMin === 'number' ? String(item.targetDurationMin) : ''
  ].join(SLOT);
}

/** 计划 → 分享串（已做 URI 编码，可直接拼进 path 的 query） */
export function encodePlan(plan: Plan): string {
  const text = [
    VERSION,
    plan.name.replace(UNSAFE, ' '),
    plan.startDate ?? '',
    plan.primaryMuscle ?? '',
    (plan.secondaryMuscles ?? []).join(LIST),
    plan.exercises.map(encodeExercise).join(LIST)
  ].join(FIELD);

  return encodeURIComponent(text);
}

function decodeExercise(text: string): PlanExercise | null {
  const [exerciseId, variantsText, setsText, restText, durationText] = text.split(SLOT);
  if (!exerciseId) return null;

  const variants: Record<string, string> = {};
  (variantsText ? variantsText.split(ITEM) : []).forEach((pair) => {
    const [group, option] = pair.split(KV);
    if (group && option) variants[group] = option;
  });

  const sets: PlanSet[] = (setsText ? setsText.split(ITEM) : [])
    .map((chunk) => {
      const [weight, reps, added] = chunk.split(KV);
      const weightNum = Number(weight);
      const repsNum = Number(reps);
      if (!Number.isFinite(weightNum) || !Number.isFinite(repsNum)) return null;
      const set: PlanSet = { id: uid('ps'), weight: weightNum, reps: repsNum };
      if (added !== undefined && added !== '' && Number.isFinite(Number(added))) {
        set.addedWeight = Number(added);
      }
      return set;
    })
    .filter((set): set is PlanSet => Boolean(set));

  const rest = Number(restText);
  const duration = Number(durationText);

  return {
    key: uid('pe'),
    exerciseId,
    variants: Object.keys(variants).length ? variants : undefined,
    sets,
    restSeconds: Number.isFinite(rest) ? rest : 0,
    targetDurationMin: Number.isFinite(duration) && duration > 0 ? duration : undefined
  };
}

/** 分享串 → 计划内容；不是练记的分享或已损坏时返回 null */
export function decodePlan(raw?: string): SharedPlan | null {
  if (!raw) return null;
  try {
    const parts = decodeURIComponent(raw).split(FIELD);
    if (parts.length < 6 || parts[0] !== VERSION) return null;

    const exercises = (parts[5] ? parts[5].split(LIST) : [])
      .map(decodeExercise)
      .filter((item): item is PlanExercise => Boolean(item));
    // 没有动作的计划没什么可分享的，直接当无效
    if (!exercises.length) return null;

    return {
      name: parts[1].trim() || '未命名计划',
      startDate: parts[2] || undefined,
      primaryMuscle: (parts[3] || undefined) as MuscleGroup | undefined,
      secondaryMuscles: parts[4] ? (parts[4].split(LIST) as MuscleGroup[]) : [],
      exercises
    };
  } catch (error) {
    console.warn('[planShare] 解析分享的计划失败:', error);
    return null;
  }
}

/** 存成本地计划（重新生成 id，避免和原计划撞） */
export function toLocalPlan(shared: SharedPlan): Plan {
  const now = Date.now();
  return {
    id: uid('plan'),
    name: shared.name,
    startDate: shared.startDate,
    primaryMuscle: shared.primaryMuscle,
    secondaryMuscles: shared.secondaryMuscles,
    exercises: shared.exercises,
    createdAt: now,
    updatedAt: now
  };
}

/** 草稿（没写完的计划）也能分享：补上分享需要的最小字段 */
export function draftToPlan(draft: {
  name: string;
  startDate?: string;
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  exercises: PlanExercise[];
}): Plan {
  return {
    id: 'draft',
    name: draft.name.trim() || '未命名计划',
    startDate: draft.startDate,
    primaryMuscle: draft.primaryMuscle ?? undefined,
    secondaryMuscles: draft.secondaryMuscles,
    exercises: draft.exercises,
    createdAt: 0,
    updatedAt: 0
  };
}
