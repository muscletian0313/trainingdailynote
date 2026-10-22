import { create } from 'zustand';
import { useMemo } from 'react';
import type { Exercise, ExerciseVariants, MuscleGroup } from '@/types';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';
import { PRESET_EXERCISES } from '@/data/exercises';
import { variantMuscleOf, variantRegionOf } from '@/data/exerciseVariants';

interface ExerciseState {
  customExercises: Exercise[];
  addCustomExercise: (name: string, muscle: MuscleGroup, equipment: string) => Exercise;
  removeCustomExercise: (id: string) => void;
  clearCustomExercises: () => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  customExercises: loadJSON<Exercise[]>(STORAGE_KEYS.customExercises, []),
  addCustomExercise: (name, muscle, equipment) => {
    const exercise: Exercise = {
      id: uid('ex'),
      name: name.trim(),
      muscle,
      equipment: equipment.trim() || '自定义',
      isCustom: true
    };
    const customExercises = [exercise, ...get().customExercises];
    saveJSON(STORAGE_KEYS.customExercises, customExercises);
    set({ customExercises });
    return exercise;
  },
  removeCustomExercise: (id) => {
    const customExercises = get().customExercises.filter((item) => item.id !== id);
    saveJSON(STORAGE_KEYS.customExercises, customExercises);
    set({ customExercises });
  },
  clearCustomExercises: () => {
    removeKey(STORAGE_KEYS.customExercises);
    set({ customExercises: [] });
  }
}));

/** 全部动作（预置 + 自定义） */
export function useAllExercises(): Exercise[] {
  const customExercises = useExerciseStore((state) => state.customExercises);
  return useMemo(() => [...customExercises, ...PRESET_EXERCISES], [customExercises]);
}

/** 根据 id 获取动作（可在 React 外部调用） */
export function getExerciseById(id: string): Exercise | undefined {
  const custom = useExerciseStore.getState().customExercises;
  return custom.find((item) => item.id === id) || PRESET_EXERCISES.find((item) => item.id === id);
}

/**
 * 细分部位规则（按肌群区分，先命中先算）：
 * 例如胸有上胸/中胸/下胸，肩有前束/中束/后束，
 * 替换动作时「练同一块」才算真正的平替（上斜不该替换平板）。
 */
const REGION_RULES: { muscle: MuscleGroup; keyword: string; region: string }[] = [
  // 胸：上斜 = 上胸，下斜 = 下胸，其余算中胸
  { muscle: 'chest', keyword: '上斜', region: 'chest:upper' },
  { muscle: 'chest', keyword: '上胸', region: 'chest:upper' },
  { muscle: 'chest', keyword: '下斜', region: 'chest:lower' },
  { muscle: 'chest', keyword: '下胸', region: 'chest:lower' },
  // 双杠臂屈伸偏下胸（用户梳理清单时也是归到「下斜」一组的）
  { muscle: 'chest', keyword: '双杠', region: 'chest:lower' },
  // 肩：后束 / 中束 / 前束 / 斜方
  { muscle: 'shoulders', keyword: '后束', region: 'shoulders:rear' },
  { muscle: 'shoulders', keyword: '反向飞鸟', region: 'shoulders:rear' },
  { muscle: 'shoulders', keyword: '面拉', region: 'shoulders:rear' },
  { muscle: 'shoulders', keyword: '侧平举', region: 'shoulders:side' },
  { muscle: 'shoulders', keyword: '侧拉', region: 'shoulders:side' },
  { muscle: 'shoulders', keyword: '外旋', region: 'shoulders:side' },
  { muscle: 'shoulders', keyword: '前平举', region: 'shoulders:front' },
  { muscle: 'shoulders', keyword: '前束', region: 'shoulders:front' },
  { muscle: 'shoulders', keyword: '耸肩', region: 'shoulders:trap' },
  { muscle: 'shoulders', keyword: '俯身', region: 'shoulders:rear' },
  { muscle: 'shoulders', keyword: '俯卧', region: 'shoulders:rear' },
  { muscle: 'shoulders', keyword: '推举', region: 'shoulders:press' },
  { muscle: 'shoulders', keyword: '推肩', region: 'shoulders:press' },
  // 臀腿：臀 / 小腿 / 腘绳 / 股四
  { muscle: 'legs', keyword: '臀', region: 'legs:glute' },
  // 髋外展练臀中肌，归到「臀」
  { muscle: 'legs', keyword: '外展', region: 'legs:glute' },
  { muscle: 'legs', keyword: '内收', region: 'legs:adductor' },
  { muscle: 'legs', keyword: '提踵', region: 'legs:calf' },
  { muscle: 'legs', keyword: '腿弯举', region: 'legs:ham' },
  { muscle: 'legs', keyword: '腘绳', region: 'legs:ham' },
  { muscle: 'legs', keyword: '腿屈伸', region: 'legs:quad' },
  { muscle: 'legs', keyword: '深蹲', region: 'legs:quad' },
  { muscle: 'legs', keyword: '腿举', region: 'legs:quad' },
  { muscle: 'legs', keyword: '箭步', region: 'legs:quad' },
  { muscle: 'legs', keyword: '分腿蹲', region: 'legs:quad' },
  // 保加利亚蹲不细分：中立位只算「腿」，前倾算「臀」（见 VARIANT_REGION）
  { muscle: 'legs', keyword: '保加利亚', region: 'legs:general' },
  // 背：上背（划船类，练厚度） / 中背（引体、下拉，练背阔） / 下背（硬拉、挺身）
  { muscle: 'back', keyword: '划船', region: 'back:upper' },
  { muscle: 'back', keyword: '提拉', region: 'back:upper' },
  { muscle: 'back', keyword: '面拉', region: 'back:upper' },
  { muscle: 'back', keyword: '耸肩', region: 'back:upper' },
  { muscle: 'back', keyword: '引体', region: 'back:mid' },
  { muscle: 'back', keyword: '下拉', region: 'back:mid' },
  { muscle: 'back', keyword: '直臂下压', region: 'back:mid' },
  { muscle: 'back', keyword: '硬拉', region: 'back:lower' },
  { muscle: 'back', keyword: '挺身', region: 'back:lower' },
  { muscle: 'back', keyword: '躬身', region: 'back:lower' },
  { muscle: 'back', keyword: '早安', region: 'back:lower' },
  // 核心：上腹 / 下腹 / 侧腹 / 深层
  { muscle: 'core', keyword: '卷腹', region: 'core:upper' },
  { muscle: 'core', keyword: '举腿', region: 'core:lower' },
  { muscle: 'core', keyword: '平板支撑', region: 'core:deep' },
  { muscle: 'core', keyword: '转体', region: 'core:oblique' }
];

/** 没命中关键词时的默认部位（按肌群） */
const DEFAULT_REGION: Partial<Record<MuscleGroup, string>> = {
  chest: 'chest:mid',
  shoulders: 'shoulders:press',
  legs: 'legs:quad',
  back: 'back:upper'
};

/**
 * 各肌群的细分部位选项：选动作时可以在肌群下面再过滤一层。
 * 用户可以完全不点，直接搜索或往下翻全部动作。
 */
export const REGION_OPTIONS: Partial<Record<MuscleGroup, { region: string; label: string }[]>> = {
  chest: [
    { region: 'chest:upper', label: '上胸' },
    { region: 'chest:mid', label: '中胸' },
    { region: 'chest:lower', label: '下胸' }
  ],
  back: [
    { region: 'back:upper', label: '上背' },
    { region: 'back:mid', label: '中背' },
    { region: 'back:lower', label: '下背' }
  ],
  legs: [
    { region: 'legs:general', label: '腿' },
    { region: 'legs:quad', label: '股四头' },
    { region: 'legs:ham', label: '腘绳肌' },
    { region: 'legs:glute', label: '臀' },
    { region: 'legs:adductor', label: '内收' },
    { region: 'legs:calf', label: '小腿' }
  ],
  shoulders: [
    { region: 'shoulders:front', label: '前束' },
    { region: 'shoulders:side', label: '中束' },
    { region: 'shoulders:rear', label: '后束' },
    { region: 'shoulders:trap', label: '斜方' },
    { region: 'shoulders:press', label: '肩' }
  ],
  core: [
    { region: 'core:upper', label: '上腹' },
    { region: 'core:lower', label: '下腹' },
    { region: 'core:oblique', label: '侧腹' },
    { region: 'core:deep', label: '深层' }
  ]
};

/**
 * 换个握距 / 练法就能主练别的肌群的动作：按那些肌群筛选时也要能选到。
 * 例：杠铃卧推选窄握距其实是在练三头，挑三头动作时它也该在列表里。
 */
const EXTRA_MUSCLES: Record<string, MuscleGroup[]> = {
  杠铃卧推: ['triceps'],
  史密斯架卧推: ['triceps'],
  器械推胸: ['triceps'],
  双杠臂屈伸: ['triceps']
};

/**
 * 从某个肌群分类里加这些动作时，变式默认值要跟着分类走。
 * - 三头里的杠铃卧推 / 史密斯架卧推 / 器械推胸：默认「平板 + 窄握距」
 * - 双杠臂屈伸：三头分类默认夹肘（练三头），其他分类默认开肘（练胸）
 */
export function variantDefaultsFor(
  name: string,
  muscle?: MuscleGroup
): ExerciseVariants | undefined {
  if (name === '双杠臂屈伸') {
    return { elbow: muscle === 'triceps' ? 'tuck' : 'flare' };
  }
  if (muscle !== 'triceps') return undefined;
  if (name === '杠铃卧推' || name === '史密斯架卧推' || name === '器械推胸') {
    return { angle: 'flat', width: 'narrow' };
  }
  return undefined;
}

/**
 * 部位筛选是否命中：
 * 「全身」动作（硬拉这类）挂在任何一个力量部位下都会列出来，方便随手选到；
 * 有氧 / 自定义不算「练的部位」，所以不往那两个里塞。
 */
export function matchesMuscleFilter(exercise: Exercise, muscle: MuscleGroup): boolean {
  if (exercise.muscle === muscle) return true;
  if (EXTRA_MUSCLES[exercise.name]?.includes(muscle)) return true;
  if (exercise.muscle !== 'fullbody') return false;
  return muscle !== 'cardio' && muscle !== 'other';
}

/** 动作练的具体部位（细分到上胸/中胸/下胸、前束/中束/后束这类粒度） */
export function exerciseRegion(exercise: Exercise): string | undefined {
  const hit = REGION_RULES.find(
    (rule) => rule.muscle === exercise.muscle && exercise.name.includes(rule.keyword)
  );
  if (hit) return hit.region;
  return DEFAULT_REGION[exercise.muscle];
}

/** 细化部位的中文名，例如 back:upper → 上背；没有就返回 undefined */
export function exerciseRegionLabel(exercise: Exercise, variants?: ExerciseVariants): string | undefined {
  // 变式会改变练到的部位（宽距偏上、窄距偏中），优先用变式算出来的
  const region = variantRegionOf(exercise.muscle, variants) ?? exerciseRegion(exercise);
  if (!region) return undefined;
  return (REGION_OPTIONS[exercise.muscle] ?? []).find((item) => item.region === region)?.label;
}

/**
 * 展示用的肌群标签。
 * 现在所有动作都不再细分部位（胸就是胸、背就是背），只返回大肌群；
 * 变式仍可能把动作改成主练别的肌群（杠铃卧推选窄握距＝练三头）。
 */
export function exerciseMuscleTag(
  exercise: Exercise,
  variants?: ExerciseVariants
): { muscle: MuscleGroup; label?: string } {
  // 双杠臂屈伸：夹肘练三头，开肘练胸
  if (exercise.name === '双杠臂屈伸' && variants?.elbow === 'tuck') {
    return { muscle: 'triceps' };
  }
  const muscle = variantMuscleOf(exercise.muscle, variants);
  if (muscle) return { muscle };
  return { muscle: exercise.muscle };
}

/**
 * 动作模式分组：同一组里的词算同类动作（推类、飞鸟类、划船类…）。
 * 用于「替换动作」时把练法相近的动作排到前面。
 */
const PATTERN_GROUPS: string[][] = [
  ['卧推', '推胸', '推举', '推肩', '臂屈伸', '俯卧撑'],
  ['飞鸟', '夹胸'],
  ['划船', '下拉', '引体', '提拉'],
  ['深蹲', '腿举', '分腿蹲', '箭步', '臀桥'],
  ['腿屈伸', '腿弯举', '屈伸', '下压'],
  ['弯举'],
  ['侧平举', '前平举', '反向飞鸟', '耸肩', '面拉', '侧拉'],
  ['卷腹', '举腿', '平板支撑', '转体'],
  ['跑步机', '椭圆机', '动感单车', '划船机', '跳绳']
];

function patternGroupsOf(name: string): number[] {
  const groups: number[] = [];
  PATTERN_GROUPS.forEach((words, index) => {
    if (words.some((word) => name.includes(word))) groups.push(index);
  });
  return groups;
}

function plainName(name: string): string {
  return name.replace(/[（）()\-_/\s·、,，]/g, '');
}

/**
 * 相似度打分（越高越适合当平替）：
 * 练的部位一致 > 动作模式同类 > 同肌群 > 同器材 > 名称字面重叠；
 * 部位不一致（如上斜 vs 平板）重罚。
 */
export function exerciseSimilarity(target: Exercise, candidate: Exercise): number {
  // 自己排到最后，避免替换时又选到原动作
  if (target.id === candidate.id) return -1;
  let score = 0;

  const targetRegion = exerciseRegion(target);
  const candidateRegion = exerciseRegion(candidate);
  if (targetRegion && candidateRegion) {
    score += targetRegion === candidateRegion ? 20 : -25;
  }

  const targetGroups = patternGroupsOf(target.name);
  const candidateGroups = patternGroupsOf(candidate.name);
  score += targetGroups.filter((group) => candidateGroups.includes(group)).length * 10;

  if (target.muscle === candidate.muscle) score += 6;
  if (target.equipment === candidate.equipment) score += 4;

  const targetChars = new Set(plainName(target.name).split(''));
  const overlap = plainName(candidate.name)
    .split('')
    .filter((char) => targetChars.has(char)).length;
  score += Math.min(6, overlap);
  return score;
}

/** 按与 target 的相似度排序（同分时保持原有顺序） */
export function sortBySimilarity(list: Exercise[], target: Exercise): Exercise[] {
  return list
    .map((item, index) => ({ item, index, score: exerciseSimilarity(target, item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
