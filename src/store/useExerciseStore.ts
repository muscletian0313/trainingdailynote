import { create } from 'zustand';
import { useMemo } from 'react';
import type { Exercise, MuscleGroup } from '@/types';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';
import { PRESET_EXERCISES } from '@/data/exercises';

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
  { muscle: 'legs', keyword: '提踵', region: 'legs:calf' },
  { muscle: 'legs', keyword: '腿弯举', region: 'legs:ham' },
  { muscle: 'legs', keyword: '罗马尼亚硬拉', region: 'legs:ham' },
  { muscle: 'legs', keyword: '腿屈伸', region: 'legs:quad' },
  { muscle: 'legs', keyword: '深蹲', region: 'legs:quad' },
  { muscle: 'legs', keyword: '腿举', region: 'legs:quad' },
  { muscle: 'legs', keyword: '箭步', region: 'legs:quad' },
  { muscle: 'legs', keyword: '分腿蹲', region: 'legs:quad' },
  // 背：宽度（下拉/引体） / 厚度（划船）
  { muscle: 'back', keyword: '引体', region: 'back:lat' },
  { muscle: 'back', keyword: '下拉', region: 'back:lat' },
  { muscle: 'back', keyword: '直臂下压', region: 'back:lat' },
  { muscle: 'back', keyword: '硬拉', region: 'back:row' },
  // 手臂：二头 / 三头
  { muscle: 'arms', keyword: '弯举', region: 'arms:biceps' },
  { muscle: 'arms', keyword: '二头', region: 'arms:biceps' },
  { muscle: 'arms', keyword: '锤式', region: 'arms:biceps' },
  { muscle: 'arms', keyword: '下压', region: 'arms:triceps' },
  { muscle: 'arms', keyword: '臂屈伸', region: 'arms:triceps' },
  { muscle: 'arms', keyword: '三头', region: 'arms:triceps' },
  { muscle: 'arms', keyword: '窄距', region: 'arms:triceps' },
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
  back: 'back:row'
};

/** 动作练的具体部位（细分到上胸/中胸/下胸、前束/中束/后束这类粒度） */
export function exerciseRegion(exercise: Exercise): string | undefined {
  const hit = REGION_RULES.find(
    (rule) => rule.muscle === exercise.muscle && exercise.name.includes(rule.keyword)
  );
  if (hit) return hit.region;
  return DEFAULT_REGION[exercise.muscle];
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
