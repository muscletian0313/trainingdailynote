import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { FoodItem, MealKey } from '@/types';
import { MEAL_KEYS, MEAL_LABELS, SNACK_KEYS } from '@/constants';
import { findFood, foodIcon, foodPhoto } from '@/data/foods';
import { useDietStore } from '@/store/useDietStore';
import { dayTotals, mealTotals } from '@/utils/diet';
import { navigateTo } from '@/utils/taro';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

/** 展示图：自定义拍照 > 预置实拍图；都没有就走图标 */
function photoOf(food: FoodItem): string {
  return food.image || foodPhoto(food) || '';
}

/** 单餐 / 单日 共用页：mode=meal 单餐详情（默认），mode=day 单日汇总 */
const MealPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const date = router.params?.date || dayjs().format('YYYY-MM-DD');
  const rawMode = router.params?.mode || 'meal';
  const isDayMode = rawMode === 'day';
  const rawMeal = (router.params?.meal || 'breakfast') as MealKey;
  const meal: MealKey = MEAL_LABELS[rawMeal] ? rawMeal : 'breakfast';

  const customFoods = useDietStore((state) => state.customFoods);
  const days = useDietStore((state) => state.days);
  const removeEntry = useDietStore((state) => state.removeEntry);

  const diet = days[date];
  const dateLabel = dayjs(date).format('M月D日');

  /** 单餐页数据 */
  const mealEntries = diet?.meals?.[meal] ?? [];
  const mealSum = mealTotals(mealEntries);
  const totalGrams = mealEntries.reduce((sum, entry) => sum + entry.grams, 0);

  /** 单日页数据 */
  const daySum = useMemo(() => dayTotals(diet), [diet]);
  const [snackOpen, setSnackOpen] = useState(true);

  /** 圆环：单餐/单日分别算 */
  const carbKcal = (isDayMode ? daySum.carb : mealSum.carb) * 4;
  const proteinKcal = (isDayMode ? daySum.protein : mealSum.protein) * 4;
  const fatKcal = (isDayMode ? daySum.fat : mealSum.fat) * 9;
  const macroKcal = carbKcal + proteinKcal + fatKcal;
  const carbDeg = macroKcal > 0 ? (carbKcal / macroKcal) * 360 : 0;
  const proteinDeg = macroKcal > 0 ? (proteinKcal / macroKcal) * 360 : 0;
  const ringBg =
    macroKcal > 0
      ? `conic-gradient(#34d399 0deg ${carbDeg}deg, #f8736a ${carbDeg}deg ${carbDeg +
          proteinDeg}deg, #fbbf24 ${carbDeg + proteinDeg}deg 360deg)`
      : '#2a2a33';

  const kcal = isDayMode ? Math.round(daySum.kcal) : Math.round(mealSum.kcal);

  const macroRows = [
    { key: 'carb', label: '碳水化合物', value: `${Math.round((isDayMode ? daySum.carb : mealSum.carb) * 10) / 10} 克` },
    { key: 'protein', label: '蛋白质', value: `${Math.round((isDayMode ? daySum.protein : mealSum.protein) * 10) / 10} 克` },
    { key: 'fat', label: '脂肪', value: `${Math.round((isDayMode ? daySum.fat : mealSum.fat) * 10) / 10} 克` },
    { key: 'fiber', label: '膳食纤维', value: `${Math.round((isDayMode ? daySum.fiber : mealSum.fiber) * 10) / 10} 克` },
    { key: 'sodium', label: '钠', value: `${Math.round(isDayMode ? daySum.sodium : mealSum.sodium)} mg` }
  ] as const;

  const dotOf = (key: string) =>
    key === 'carb'
      ? styles.dotCarb
      : key === 'protein'
        ? styles.dotProtein
        : key === 'fat'
          ? styles.dotFat
          : key === 'fiber'
            ? styles.dotFiber
            : styles.dotSodium;

  const openPicker = () => {
    navigateTo({ url: `/subpackages/diet/food-picker/index?date=${date}&meal=${meal}` });
  };

  const openMeal = (m: MealKey) => {
    navigateTo({ url: `/subpackages/diet/meal/index?date=${date}&meal=${m}` });
  };

  const title = isDayMode ? `${dateLabel}饮食` : `${dateLabel} ${MEAL_LABELS[meal]}`;

  return (
    <View className={classnames(styles.page, themeClass)}>
      <View className={styles.pageHead}>
        <Text className={styles.pageBack} onClick={() => Taro.navigateBack()}>
          ‹
        </Text>
        <Text className={styles.pageTitle}>{title}</Text>
        <View className={styles.pageHeadSpace} />
      </View>

      <ScrollView scrollY className={styles.pageBody}>
        {/* 汇总卡：左五项营养素 + 右三色圆环 */}
        <View className={styles.summaryCard}>
          <View className={styles.summaryMain}>
            <View className={styles.summaryMacroCol}>
              {macroRows.map((item) => (
                <View key={item.key} className={styles.summaryMacroRow}>
                  <View className={classnames(styles.dot, dotOf(item.key))} />
                  <Text className={styles.summaryMacroLabel}>{item.label}</Text>
                  <Text className={styles.summaryMacroValue}>{item.value}</Text>
                </View>
              ))}
            </View>
            <View className={styles.summaryRing} style={{ background: ringBg }}>
              <View className={styles.summaryRingHole}>
                <Text className={styles.summaryRingValue}>{kcal}</Text>
                <Text className={styles.summaryRingUnit}>千卡</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 单日模式：三餐 + 加餐折叠 */}
        {isDayMode ? (
          <>
            {MEAL_KEYS.map((m) => {
              const entries = diet?.meals?.[m] ?? [];
              const sum = mealTotals(entries);
              return (
                <View key={m} className={styles.foodCard} onClick={() => openMeal(m)}>
                  <View className={styles.foodCardHead}>
                    <Text className={styles.foodCardTitle}>{MEAL_LABELS[m]}</Text>
                    <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                      {entries.length ? (
                        <Text className={styles.foodCardGrams}>{Math.round(sum.kcal)} 千卡</Text>
                      ) : null}
                      <Text style={{ color: '#777', fontSize: '32rpx' }}>›</Text>
                    </View>
                  </View>
                  {entries.length ? (
                    entries.map((entry) => {
                      const food = findFood(entry.foodId, customFoods);
                      const photo = food ? photoOf(food) : '';
                      return (
                        <View key={entry.id} className={styles.dietRow}>
                          {photo ? (
                            <Image className={styles.dietRowImg} src={photo} mode="aspectFill" />
                          ) : food ? (
                            <View className={styles.dietRowIcon}>
                              <Image
                                className={styles.dietRowIconImg}
                                src={foodIcon(food)}
                                mode="aspectFit"
                              />
                            </View>
                          ) : null}
                          <View className={styles.dietRowMain}>
                            <Text className={styles.dietRowName}>{entry.name}</Text>
                            <Text className={styles.dietRowGrams}>{entry.grams} 克</Text>
                          </View>
                          <Text className={styles.dietRowKcal}>{Math.round(entry.kcal)} 千卡</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text className={styles.foodCardEmpty}>还没有记录</Text>
                  )}
                </View>
              );
            })}

            {/* 加餐折叠块 */}
            <View className={styles.foodCard}>
              <View
                className={styles.foodCardHead}
                onClick={() => setSnackOpen(!snackOpen)}
                style={{ cursor: 'pointer' }}
              >
                <Text className={styles.foodCardTitle}>加餐</Text>
                <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                  {(() => {
                    const total = SNACK_KEYS.reduce(
                      (s, m) => s + mealTotals(diet?.meals?.[m] ?? []).kcal,
                      0
                    );
                    return total > 0 ? (
                      <Text className={styles.foodCardGrams}>{Math.round(total)} 千卡</Text>
                    ) : null;
                  })()}
                  <Text
                    style={{
                      color: '#777',
                      fontSize: '32rpx',
                      transform: snackOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    ›
                  </Text>
                </View>
              </View>
              {snackOpen &&
                SNACK_KEYS.map((m) => {
                  const entries = diet?.meals?.[m] ?? [];
                  const sum = mealTotals(entries);
                  return (
                    <View key={m} className={styles.foodCard} onClick={() => openMeal(m)}>
                      <View className={styles.foodCardHead}>
                        <Text className={styles.foodCardTitle}>{MEAL_LABELS[m]}</Text>
                        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                          {entries.length ? (
                            <Text className={styles.foodCardGrams}>{Math.round(sum.kcal)} 千卡</Text>
                          ) : null}
                          <Text style={{ color: '#777', fontSize: '30rpx' }}>›</Text>
                        </View>
                      </View>
                      {entries.length
                        ? entries.map((entry) => {
                            const food = findFood(entry.foodId ?? '', customFoods);
                            const photo = food ? photoOf(food) : '';
                            return (
                              <View key={entry.id} className={styles.dietRow}>
                                {photo ? (
                                  <Image
                                    className={styles.dietRowImg}
                                    src={photo}
                                    mode="aspectFill"
                                  />
                                ) : food ? (
                                  <View className={styles.dietRowIcon}>
                                    <Image
                                      className={styles.dietRowIconImg}
                                      src={foodIcon(food)}
                                      mode="aspectFit"
                                    />
                                  </View>
                                ) : null}
                                <View className={styles.dietRowMain}>
                                  <Text className={styles.dietRowName}>{entry.name}</Text>
                                  <Text className={styles.dietRowGrams}>{entry.grams} 克</Text>
                                </View>
                                <Text className={styles.dietRowKcal}>
                                  {Math.round(entry.kcal)} 千卡
                                </Text>
                              </View>
                            );
                          })
                        : null}
                    </View>
                  );
                })}
            </View>
          </>
        ) : (
          /* 单餐模式：食物卡 + 添加按钮 */
          <View className={styles.foodCard}>
            <View className={styles.foodCardHead}>
              <Text className={styles.foodCardTitle}>食物 {mealEntries.length} 个</Text>
              <Text className={styles.foodCardGrams}>{totalGrams} 克</Text>
            </View>

            {mealEntries.length ? (
              mealEntries.map((entry) => {
                const food = findFood(entry.foodId, customFoods);
                const photo = food ? photoOf(food) : '';
                return (
                  <View
                    key={entry.id}
                    className={styles.dietRow}
                    onClick={() =>
                      navigateTo({
                        url: `/subpackages/diet/food-picker/index?date=${date}&meal=${meal}&entryId=${entry.id}&foodId=${entry.foodId ?? ''}&grams=${entry.grams}`
                      })
                    }
                  >
                    {photo ? (
                      <Image className={styles.dietRowImg} src={photo} mode="aspectFill" />
                    ) : food ? (
                      <View className={styles.dietRowIcon}>
                        <Image
                          className={styles.dietRowIconImg}
                          src={foodIcon(food)}
                          mode="aspectFit"
                        />
                      </View>
                    ) : null}
                    <View className={styles.dietRowMain}>
                      <Text className={styles.dietRowName}>{entry.name}</Text>
                      <Text className={styles.dietRowGrams}>{entry.grams} 克</Text>
                    </View>
                    <Text className={styles.dietRowKcal}>{Math.round(entry.kcal)} 千卡</Text>
                    <Text
                      className={styles.dietRowRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEntry(date, meal, entry.id);
                      }}
                    >
                      ✕
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text className={styles.foodCardEmpty}>还没有记录，点下方按钮添加食物</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* 底部固定按钮：单日模式不显示（没有"添加全天食物"这个概念） */}
      {!isDayMode && (
        <View className={styles.pageFooter}>
          <View className={styles.addFoodBtn} onClick={openPicker}>
            <Text className={styles.addFoodText}>添加食物</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default MealPage;
