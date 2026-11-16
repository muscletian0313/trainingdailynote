import { create } from 'zustand';
import dayjs from 'dayjs';
import type { DietDay, DietEntry, FoodItem, MealKey } from '@/types';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from '@/utils/storage';
import { uid } from '@/utils/id';
import { emptyMeals, type DietMacros } from '@/utils/diet';

/**
 * 饮食：一天一条记录 + 用户自定义食物。
 * 全部存在本机（和训练、体重一致），不做云端。
 */
interface DietState {
  days: Record<string, DietDay>;
  customFoods: FoodItem[];
  /** 用户自己设的目标（三大宏量）；为空就用按体重估的默认值 */
  target: DietMacros | null;
  setTarget: (target: DietMacros) => void;
  addCustomFood: (input: Omit<FoodItem, 'id' | 'isCustom'>) => FoodItem;
  updateCustomFood: (food: FoodItem) => void;
  removeCustomFood: (id: string) => void;
  addEntry: (date: string, meal: MealKey, entry: Omit<DietEntry, 'id'>) => void;
  /** 更新已有记录的克数（营养自动按比例重算） */
  updateEntry: (date: string, meal: MealKey, entryId: string, entry: Omit<DietEntry, 'id'>) => void;
  removeEntry: (date: string, meal: MealKey, entryId: string) => void;
  /** 把前一天的记录复制到这一天（追加） */
  copyYesterday: (date: string) => void;
  clearDiet: () => void;
}

function readDay(days: Record<string, DietDay>, date: string): DietDay {
  const raw = days[date];
  if (!raw) return { date, meals: emptyMeals(), updatedAt: 0 };
  // 老数据只有四餐，补全六餐缺失的 key，避免新增餐次取到 undefined
  const meals = { ...emptyMeals(), ...raw.meals };
  return { ...raw, meals };
}

export const useDietStore = create<DietState>((set, get) => ({
  days: loadJSON<Record<string, DietDay>>(STORAGE_KEYS.dietDays, {}),
  customFoods: loadJSON<FoodItem[]>(STORAGE_KEYS.dietCustomFoods, []),
  target: loadJSON<DietMacros | null>(STORAGE_KEYS.dietTarget, null),

  setTarget: (target) => {
    saveJSON(STORAGE_KEYS.dietTarget, target);
    set({ target });
  },

  addCustomFood: (input) => {
    const food: FoodItem = { ...input, id: uid('food'), isCustom: true };
    const customFoods = [food, ...get().customFoods];
    saveJSON(STORAGE_KEYS.dietCustomFoods, customFoods);
    set({ customFoods });
    return food;
  },

  updateCustomFood: (food) => {
    const customFoods = get().customFoods.map((item) => (item.id === food.id ? food : item));
    saveJSON(STORAGE_KEYS.dietCustomFoods, customFoods);
    set({ customFoods });
  },

  removeCustomFood: (id) => {
    const customFoods = get().customFoods.filter((item) => item.id !== id);
    saveJSON(STORAGE_KEYS.dietCustomFoods, customFoods);
    set({ customFoods });
  },

  addEntry: (date, meal, entry) => {
    const days = { ...get().days };
    const day = readDay(days, date);
    const next: DietDay = {
      ...day,
      meals: { ...day.meals, [meal]: [...day.meals[meal], { ...entry, id: uid('diet') }] },
      updatedAt: Date.now()
    };
    days[date] = next;
    saveJSON(STORAGE_KEYS.dietDays, days);
    set({ days });
  },

  updateEntry: (date, meal, entryId, entry) => {
    const days = { ...get().days };
    const day = readDay(days, date);
    const next: DietDay = {
      ...day,
      meals: {
        ...day.meals,
        [meal]: day.meals[meal].map((item) =>
          item.id === entryId ? { ...item, ...entry } : item
        )
      },
      updatedAt: Date.now()
    };
    days[date] = next;
    saveJSON(STORAGE_KEYS.dietDays, days);
    set({ days });
  },

  removeEntry: (date, meal, entryId) => {
    const days = { ...get().days };
    const day = days[date];
    if (!day) return;
    const next: DietDay = {
      ...day,
      meals: { ...day.meals, [meal]: day.meals[meal].filter((item) => item.id !== entryId) },
      updatedAt: Date.now()
    };
    days[date] = next;
    saveJSON(STORAGE_KEYS.dietDays, days);
    set({ days });
  },

  copyYesterday: (date) => {
    const days = { ...get().days };
    const prevDate = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
    const prev = days[prevDate];
    if (!prev) return;
    const day = readDay(days, date);
    const meals = { ...day.meals } as Record<MealKey, DietEntry[]>;
    (Object.keys(prev.meals) as MealKey[]).forEach((meal) => {
      const copied = prev.meals[meal].map((item) => ({ ...item, id: uid('diet') }));
      meals[meal] = [...meals[meal], ...copied];
    });
    days[date] = { ...day, meals, updatedAt: Date.now() };
    saveJSON(STORAGE_KEYS.dietDays, days);
    set({ days });
  },

  clearDiet: () => {
    removeKey(STORAGE_KEYS.dietDays);
    removeKey(STORAGE_KEYS.dietCustomFoods);
    removeKey(STORAGE_KEYS.dietTarget);
    set({ days: {}, customFoods: [], target: null });
  }
}));
