import dayjs from 'dayjs';
import type { DietDay, DietEntry, MealKey, UserProfile } from '@/types';

export interface DietTotals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
  sodium: number;
}

/** 用户自定义的目标：只填三大宏量，热量自动算 */
export interface DietMacros {
  carb: number;
  protein: number;
  fat: number;
}

const EMPTY_TOTALS: DietTotals = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0, sodium: 0 };

/** 膳食纤维与钠的目标是固定值，用户不能改 */
export const FIBER_TARGET = 25;
export const SODIUM_TARGET = 2000;

/** 三大宏量换算热量：碳水 4、蛋白 4、脂肪 9 */
export function macrosKcal(macros: DietMacros): number {
  return Math.round(macros.carb * 4 + macros.protein * 4 + macros.fat * 9);
}

/** 空的一天：六餐都是空数组 */
export function emptyMeals(): Record<MealKey, DietEntry[]> {
  return {
    breakfast: [],
    morningSnack: [],
    lunch: [],
    afternoonSnack: [],
    dinner: [],
    eveningSnack: [],
    cheat: []
  };
}

/** 一餐的合计 */
export function mealTotals(entries: DietEntry[] | undefined): DietTotals {
  if (!Array.isArray(entries)) return { ...EMPTY_TOTALS };
  return entries.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.protein,
      carb: sum.carb + item.carb,
      fat: sum.fat + item.fat,
      // 老的记录里可能没有纤维/钠，缺了按 0 算，避免出现 NaN
      fiber: sum.fiber + (item.fiber ?? 0),
      sodium: sum.sodium + (item.sodium ?? 0)
    }),
    { ...EMPTY_TOTALS }
  );
}

/** 一天四餐的合计 */
export function dayTotals(day?: DietDay): DietTotals {
  if (!day) return { ...EMPTY_TOTALS };
  return Object.values(day.meals).reduce(
    (sum, entries) => {
      const meal = mealTotals(entries);
      return {
        kcal: sum.kcal + meal.kcal,
        protein: sum.protein + meal.protein,
        carb: sum.carb + meal.carb,
        fat: sum.fat + meal.fat,
        fiber: sum.fiber + meal.fiber,
        sodium: sum.sodium + meal.sodium
      };
    },
    { ...EMPTY_TOTALS }
  );
}

/** 这一天有没有记过东西 */
export function hasDiet(day?: DietDay): boolean {
  if (!day) return false;
  return Object.values(day.meals).some((entries) => entries.length > 0);
}

/**
 * 每日目标的默认值：按体重和训练频次估一版。
 * 热量 = 体重 × 系数（练得越多系数越高）；蛋白质 = 体重 × 1.6g；
 * 脂肪取热量的 25%，剩下的给碳水。纤维/钠是固定目标。
 */
export function dietTargetOf(profile: UserProfile): DietTotals {
  const weight = profile.weight && profile.weight > 0 ? profile.weight : 70;
  const freq = profile.trainingFrequency ?? 3;
  const factor = freq >= 5 ? 36 : freq >= 3 ? 34 : 32;
  const genderRatio = profile.gender === 'female' ? 0.92 : 1;
  const kcal = Math.round((weight * factor * genderRatio) / 10) * 10;
  const protein = Math.round(weight * 1.6);
  const fat = Math.round((kcal * 0.25) / 9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carb, fat, fiber: FIBER_TARGET, sodium: SODIUM_TARGET };
}

/**
 * 实际使用的目标：用户设过就用自己设的三大宏量（热量按 4/4/9 反算），
 * 没设过就用按体重估的默认值。纤维/钠始终是固定值。
 */
export function resolveDietTarget(profile: UserProfile, custom: DietMacros | null): DietTotals {
  const base = dietTargetOf(profile);
  if (!custom) return base;
  return {
    kcal: macrosKcal(custom),
    carb: custom.carb,
    protein: custom.protein,
    fat: custom.fat,
    fiber: base.fiber,
    sodium: base.sodium
  };
}

/** 达标：热量在目标的 90%~110%，且蛋白质够了 */
export function isDietDayMet(day: DietDay | undefined, target: DietTotals): boolean {
  if (!day || !hasDiet(day)) return false;
  const totals = dayTotals(day);
  const kcalOk = totals.kcal >= target.kcal * 0.9 && totals.kcal <= target.kcal * 1.1;
  return kcalOk && totals.protein >= target.protein;
}

/** 近 N 天的饮食汇总（含今天，按日期正序，缺的那天是 0） */
export function recentDietTotals(
  days: Record<string, DietDay>,
  count = 7
): { date: string; label: string; isToday: boolean; totals: DietTotals }[] {
  const list: { date: string; label: string; isToday: boolean; totals: DietTotals }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = dayjs().subtract(i, 'day');
    const key = date.format('YYYY-MM-DD');
    list.push({
      date: key,
      label: date.format('M/D'),
      isToday: i === 0,
      totals: dayTotals(days[key])
    });
  }
  return list;
}
