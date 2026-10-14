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
