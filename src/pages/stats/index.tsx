﻿﻿﻿﻿﻿﻿﻿﻿import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { navigateTo } from '@/utils/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { MEAL_KEYS, MEAL_LABELS, MUSCLE_COLORS, MUSCLE_GROUPS, MUSCLE_LABELS, SNACK_KEYS } from '@/constants';
import type { MealKey, MuscleGroup } from '@/types';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useDietStore } from '@/store/useDietStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useBodyStore } from '@/store/useBodyStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import EmptyState from '@/components/EmptyState';
import MuscleTag from '@/components/MuscleTag';
import TrainingCalendar from '@/components/TrainingCalendar';
import BodyDataView from '@/components/BodyDataView';
import PrTrendChart from '@/components/PrTrendChart';
import DietTargetSheet from '@/components/DietTargetSheet';
import ScrollLock from '@/components/ScrollLock';
import { findFood, foodIcon, foodPhotoThumb } from '@/data/foods';
import {
  dayTotals,
  mealTotals,
  resolveDietTarget
} from '@/utils/diet';
import {
  computePrs,
  oneRmTrend,
  planFromSession,
  recentDaysVolume
} from '@/utils/workout';
import type { PrItem } from '@/utils/workout';
import {
  defaultVariants,
  reconcileVariants,
  variantGroupsOf,
  variantOptionsOf
} from '@/data/exerciseVariants';
import { dayLabel, formatVolume, formatWeight } from '@/utils/format';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

/** PR 展示名：器械名单独存，显示成「器械划船（鹦鹉螺）」 */
function prNameOf(pr: PrItem): string {
  const info = getExerciseById(pr.exerciseId);
  const name = info ? info.name : '已下架';
  return pr.equipmentName ? `${name}（${pr.equipmentName}）` : name;
}

/** 与默认变式不同的标签（窄距、上斜…），用来把同动作的不同练法区分开 */
function prVariantLabels(pr: PrItem): string[] {
  const info = getExerciseById(pr.exerciseId);
  if (!info || !pr.variants) return [];
  const defaults = defaultVariants(info.name);
  const merged = reconcileVariants(info.name, { ...defaults, ...pr.variants });
  return variantGroupsOf(info.name, merged)
    .map((group) => {
      const picked = merged[group.key];
      if (!picked || defaults[group.key] === picked) return '';
      return (
        variantOptionsOf(info.name, group.key, merged).find((option) => option.key === picked)
          ?.label ?? ''
      );
    })
    .filter(Boolean);
}

const StatsPage: React.FC = () => {
  const themeClass = usePageTheme();
  const sessions = useSessionStore((state) => state.sessions);
  const addPlan = usePlanStore((state) => state.addPlan);
  const attachPlanToSession = useSessionStore((state) => state.attachPlanToSession);
  const dietDays = useDietStore((state) => state.days);
  const customFoods = useDietStore((state) => state.customFoods);
  const customTarget = useDietStore((state) => state.target);
  const profile = useProfileStore((state) => state.profile);
  const bodyRecords = useBodyStore((state) => state.records);

  /** 日历 tab：训练 / 饮食 / 体重维度 */
  const [calendarTab, setCalendarTab] = useState<'training' | 'diet' | 'body'>('training');
  /** 加餐折叠块：默认收起，有记录时自动展开 */
  const [snackOpen, setSnackOpen] = useState<boolean>(false);
  /** PR 趋势图当前选中的动作；默认跟随 1RM 最高的那一项 */
  const [prPick, setPrPick] = useState<string | null>(null);
  /** 已生效的 PR 动作筛选；null 表示全部 */
  const [prSelectedIds, setPrSelectedIds] = useState<string[] | null>(null);
  /** 筛选弹层里的草稿，确认后才替换已生效值 */
  const [prDraftIds, setPrDraftIds] = useState<string[]>([]);
  const [prFilterOpen, setPrFilterOpen] = useState(false);
  const [prMuscle, setPrMuscle] = useState<'all' | MuscleGroup>('all');
  /** 营养目标设置弹层 */
  const [targetOpen, setTargetOpen] = useState(false);

  /** 弹层需要露出底部操作区；H5 的原生 TabBar 层级高于页面，打开时先隐藏 */
  useEffect(() => {
    if (!prFilterOpen) return;
    Taro.hideTabBar({ animation: false });
    return () => {
      Taro.showTabBar({ animation: false });
    };
  }, [prFilterOpen]);

  const dietTarget = useMemo(
    () => resolveDietTarget(profile, customTarget),
    [profile, customTarget]
  );
  const todayKey = dayjs().format('YYYY-MM-DD');
  /** 选中日期运动消耗：汇总该日期已结束训练里手填的 calories */
  const todayBurn = useMemo(
    () =>
      sessions.reduce((sum, session) => {
        if (!session.calories) return sum;
        if (dayjs(session.startedAt).format('YYYY-MM-DD') !== todayKey) return sum;
        return sum + session.calories;
      }, 0),
    [sessions, todayKey]
  );
  const todayDiet = dietDays[todayKey];
  const todayTotals = useMemo(() => dayTotals(todayDiet), [todayDiet]);
  /** 选中日期热量额度 = 目标 + 运动消耗 */
  const kcalBudget = dietTarget.kcal + todayBurn;
  /** 圆环：选中日期已吃占额度的比例 */
  const ringPercent =
    kcalBudget > 0 ? Math.min(100, Math.max(0, (todayTotals.kcal / kcalBudget) * 100)) : 0;
  /** 左右半圆各自的旋转角度（0% → 180° 藏起来，50% → 0° 全露出来） */
  const ringRightDeg = 180 - (Math.min(ringPercent, 50) / 50) * 180;
  const ringLeftDeg = 180 - (Math.max(0, ringPercent - 50) / 50) * 180;
  /** 还可以吃 = 目标 + 运动消耗 - 已摄入 */
  const remainKcal = Math.max(0, Math.round(kcalBudget - todayTotals.kcal));
  /** 五项营养：实际吃了多少 / 目标多少（纤维、钠也带进度条） */
  const macroItems = [
    {
      key: 'carb',
      label: '碳水化合物',
      value: todayTotals.carb,
      target: dietTarget.carb,
      color: '#3ddc97',
      unit: '克'
    },
    {
      key: 'protein',
      label: '蛋白质',
      value: todayTotals.protein,
      target: dietTarget.protein,
      color: '#ff6b6b',
      unit: '克'
    },
    {
      key: 'fat',
      label: '脂肪',
      value: todayTotals.fat,
      target: dietTarget.fat,
      color: '#f5b942',
      unit: '克'
    },
    {
      key: 'fiber',
      label: '膳食纤维',
      value: todayTotals.fiber,
      target: dietTarget.fiber,
      color: '#60a5fa',
      unit: '克'
    },
    {
      key: 'sodium',
      label: '钠',
      value: todayTotals.sodium,
      target: dietTarget.sodium,
      color: '#a78bfa',
      unit: 'mg'
    }
  ];

  const days = useMemo(() => recentDaysVolume(sessions, 7), [sessions]);
  const maxVolume = Math.max(...days.map((item) => item.volume), 1);
  const weekVolume = days.reduce((sum, item) => sum + item.volume, 0);
  const prs = useMemo(() => computePrs(sessions), [sessions]);
  /** 先过滤完整 PR，再决定展示列表，不能只在前十项里筛选 */
  const filteredPrs = useMemo(
    () =>
      prSelectedIds === null
        ? prs
        : prs.filter((item) => prSelectedIds.includes(item.key)),
    [prs, prSelectedIds]
  );
  const visiblePrs = useMemo(
    () => (prSelectedIds === null ? filteredPrs.slice(0, 10) : filteredPrs),
    [filteredPrs, prSelectedIds]
  );
  const prMuscles = useMemo(
    () => MUSCLE_GROUPS.filter((group) => prs.some((pr) => pr.muscle === group)),
    [prs]
  );
  const prFilterList = useMemo(
    () => (prMuscle === 'all' ? prs : prs.filter((pr) => pr.muscle === prMuscle)),
    [prs, prMuscle]
  );

  /** PR 趋势：选中的动作（点列表任意一项切换；被过滤后跟随筛选首项）*/
  const activePr = useMemo(
    () => filteredPrs.find((item) => item.key === prPick) ?? filteredPrs[0] ?? null,
    [filteredPrs, prPick]
  );
  const prTrend = useMemo(
    () =>
      activePr
        ? oneRmTrend(sessions, activePr.exerciseId, activePr.variants, activePr.equipmentName)
        : [],
    [sessions, activePr]
  );
  /** 趋势图标题：区分同动作的不同变式 */
  const activePrTitle = useMemo(() => {
    if (!activePr) return '';
    const labels = prVariantLabels(activePr);
    return labels.length ? `${prNameOf(activePr)} · ${labels.join(' ')}` : prNameOf(activePr);
  }, [activePr]);

  const muscleStats = useMemo(() => {
    const stats = MUSCLE_GROUPS.map((group) => ({ group, sets: 0 }));
    sessions.forEach((session) => {
      session.exercises.forEach((item) => {
        const info = getExerciseById(item.exerciseId);
        if (!info) return;
        const group = exerciseMuscleTag(info, item.variants).muscle;
        const target = stats.find((entry) => entry.group === group);
        if (target) target.sets += item.sets.filter((set) => set.done).length;
      });
    });
    return stats.filter((entry) => entry.sets > 0).sort((a, b) => b.sets - a.sets);
  }, [sessions]);

  const maxMuscleSets = muscleStats.length ? muscleStats[0].sets : 1;

  /** 点日历某天 → 打开「当天训练计划」独立页面（返回即回到数据页） */
  const openDatePlans = (date: string) => {
    navigateTo({ url: `/subpackages/diet/day-plans/index?date=${date}` });
  };

  const openPrFilter = () => {
    setPrDraftIds(prSelectedIds ?? prs.map((pr) => pr.key));
    setPrMuscle('all');
    setPrFilterOpen(true);
  };

  const togglePrDraft = (key: string) => {
    setPrDraftIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const applyPrFilter = () => {
    if (!prDraftIds.length) return;
    // 全选相当于清除筛选，恢复默认的前十项视图
    const showAll = prDraftIds.length === prs.length;
    setPrSelectedIds(showAll ? null : [...prDraftIds]);
    if (showAll) setPrPick(null);
    setPrFilterOpen(false);
  };

  /** 点 PR 图上的日期 → 打开那天这次的训练；老的自由训练记录现场补一个计划 */
  const openPrPoint = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    if (session.planId) {
      navigateTo({ url: `/pages/plan-detail/index?id=${session.planId}` });
      return;
    }
    const plan = planFromSession(session);
    addPlan(plan);
    attachPlanToSession(session.id, plan.id);
    navigateTo({ url: `/pages/plan-detail/index?id=${plan.id}` });
  };

  /** 点某餐 → 打开单餐页（独立页面，右滑返回日历） */
  const openDietPicker = (date: string, meal: MealKey) => {
    navigateTo({ url: `/subpackages/diet/meal/index?date=${date}&meal=${meal}` });
  };

  /** 点日历饮食的某天 → 拉起 meal 页的单日汇总模式（独立页，左滑返回日历） */
  const openDietDay = (date: string) => {
    navigateTo({ url: `/subpackages/diet/meal/index?date=${date}&mode=day` });
  };

  /** 点日历体重维度的某天 → 拉起 body 页查看当天记录 */
  const openBodyDay = (date: string) => {
    navigateTo({ url: `/subpackages/misc/body/index?date=${date}` });
  };

  return (
    <View className={classnames(styles.page, themeClass)}>
      {/* 弹层打开时锁住页面滚动 */}
      <ScrollLock lock={targetOpen || prFilterOpen} />
      <View className={styles.section}>
        <TrainingCalendar
          sessions={sessions}
          tab={calendarTab}
          onTabChange={setCalendarTab}
          onPickDate={openDatePlans}
          dietDays={dietDays}
          dietTarget={dietTarget}
          onPickDietDate={openDietDay}
          bodyRecords={bodyRecords}
          onPickBodyDate={openBodyDay}
        />
      </View>

      {calendarTab === 'diet' ? (
        <>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>今日饮食</Text>
              <Text className={styles.sectionLink} onClick={() => setTargetOpen(true)}>
                设目标 ›
              </Text>
            </View>
            <View className={styles.dietCard}>
              <View className={styles.dietTop}>
                <View className={styles.dietSide}>
                  <Text className={styles.dietSideLabel}>运动消耗</Text>
                  <Text className={styles.dietSideValue}>{Math.round(todayBurn)}</Text>
                  <Text className={styles.dietSideUnit}>kcal</Text>
                </View>

                <View className={styles.ring}>
                  <View className={classnames(styles.ringHalf, styles.ringHalfRight)}>
                    <View
                      className={styles.ringFillRight}
                      style={{ transform: `rotate(${ringRightDeg}deg)` }}
                    />
                  </View>
                  <View className={classnames(styles.ringHalf, styles.ringHalfLeft)}>
                    <View
                      className={styles.ringFillLeft}
                      style={{ transform: `rotate(${ringLeftDeg}deg)` }}
                    />
                  </View>
                  <View className={styles.ringHole}>
                    <Text className={styles.ringLabel}>还可以吃</Text>
                    <Text className={styles.ringValue}>{remainKcal}</Text>
                    <Text className={styles.ringSub}>目标 {dietTarget.kcal} kcal</Text>
                  </View>
                </View>

                <View className={styles.dietSide}>
                  <Text className={styles.dietSideLabel}>饮食摄入</Text>
                  <Text className={styles.dietSideValue}>{Math.round(todayTotals.kcal)}</Text>
                  <Text className={styles.dietSideUnit}>kcal</Text>
                </View>
              </View>

              <View className={styles.macroRow}>
                {macroItems.map((item) => {
                  const percent = item.target > 0 ? (item.value / item.target) * 100 : 0;
                  return (
                    <View key={item.key} className={styles.macroCol}>
                      <Text className={styles.macroLabel}>{item.label}</Text>
                      <View className={styles.macroTrack}>
                        <View
                          className={styles.macroFill}
                          style={{
                            width: `${Math.min(100, Math.round(percent))}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </View>
                      <Text className={styles.macroValue}>
                        {Math.round(item.value)}
                        <Text className={styles.macroTarget}> / {item.target}</Text>
                        <Text className={styles.macroUnit}> {item.unit}</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* 正餐：早餐 / 午餐 / 晚餐 + 加餐折叠 */}
              <View className={styles.mealList}>
                {MEAL_KEYS.map((meal) => {
                  const entries = todayDiet?.meals?.[meal] ?? [];
                  const sum = mealTotals(entries);
                  return (
                    <View key={meal} className={styles.mealBlock}>
                      <View
                        className={styles.mealBlockHead}
                        onClick={() => openDietPicker(todayKey, meal)}
                      >
                        <Text className={styles.mealBlockName}>{MEAL_LABELS[meal]}</Text>
                        <View className={styles.mealBlockRight}>
                          {entries.length ? (
                            <Text className={styles.mealBlockKcal}>
                              {Math.round(sum.kcal)} 千卡
                            </Text>
                          ) : null}
                          <Text className={styles.mealBlockArrow}>›</Text>
                        </View>
                      </View>

                      {entries.map((entry) => {
                        const food = findFood(entry.foodId ?? '', customFoods);
                        const photo = food ? food.image || foodPhotoThumb(food) : null;
                        return (
                          <View
                            key={entry.id}
                            className={styles.mealFoodRow}
                            onClick={() =>
                              navigateTo({
                                url: `/subpackages/diet/food-picker/index?date=${todayKey}&meal=${meal}&entryId=${entry.id}&foodId=${entry.foodId ?? ''}&grams=${entry.grams}`
                              })
                            }
                          >
                            {photo ? (
                              <Image
                                className={styles.mealFoodImg}
                                src={photo}
                                mode="aspectFill"
                              />
                            ) : food ? (
                              <View className={styles.mealFoodIcon}>
                                <Image
                                  className={styles.mealFoodIconImg}
                                  src={foodIcon(food)}
                                  mode="aspectFit"
                                />
                              </View>
                            ) : null}
                            <View className={styles.mealFoodMain}>
                              <Text className={styles.mealFoodName}>{entry.name}</Text>
                              <Text className={styles.mealFoodGrams}>{entry.grams} 克</Text>
                            </View>
                            <Text className={styles.mealFoodKcal}>
                              {Math.round(entry.kcal)} 千卡
                            </Text>
                            <Text className={styles.mealFoodArrow}>›</Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                {/* 加餐折叠块 */}
                <View className={styles.snackBlock}>
                  <View
                    className={styles.mealBlockHead}
                    onClick={() => setSnackOpen((v) => !v)}
                  >
                    <Text className={styles.mealBlockName}>加餐</Text>
                    <View className={styles.mealBlockRight}>
                      {SNACK_KEYS.some(
                        (k) => (todayDiet?.meals?.[k] ?? []).length > 0
                      ) ? (
                        <Text className={styles.mealBlockKcal}>
                          {Math.round(
                            SNACK_KEYS.reduce(
                              (sum, k) =>
                                sum + mealTotals(todayDiet?.meals?.[k] ?? []).kcal,
                              0
                            )
                          )}{' '}
                          千卡
                        </Text>
                      ) : null}
                      <Text
                        className={classnames(
                          styles.mealBlockArrow,
                          snackOpen && styles.mealBlockArrowOpen
                        )}
                      >
                        ›
                      </Text>
                    </View>
                  </View>

                  {snackOpen
                    ? SNACK_KEYS.map((meal) => {
                        const entries = todayDiet?.meals?.[meal] ?? [];
                        const sum = mealTotals(entries);
                        return (
                          <View key={meal} className={styles.snackItem}>
                            <View
                              className={styles.snackItemHead}
                              onClick={() => openDietPicker(todayKey, meal)}
                            >
                              <Text className={styles.snackItemName}>
                                {MEAL_LABELS[meal]}
                              </Text>
                              <View className={styles.snackItemRight}>
                                {entries.length ? (
                                  <Text className={styles.snackItemKcal}>
                                    {Math.round(sum.kcal)} 千卡
                                  </Text>
                                ) : null}
                                <Text className={styles.snackItemArrow}>›</Text>
                              </View>
                            </View>
                            {entries.map((entry) => {
                              const food = findFood(entry.foodId ?? '', customFoods);
                              const photo = food ? food.image || foodPhotoThumb(food) : null;
                              return (
                                <View
                                  key={entry.id}
                                  className={styles.snackFoodRow}
                                  onClick={() =>
                                    navigateTo({
                                      url: `/subpackages/diet/food-picker/index?date=${todayKey}&meal=${meal}&entryId=${entry.id}&foodId=${entry.foodId ?? ''}&grams=${entry.grams}`
                                    })
                                  }
                                >
                                  {photo ? (
                                    <Image
                                      className={styles.snackFoodImg}
                                      src={photo}
                                      mode="aspectFill"
                                    />
                                  ) : food ? (
                                    <View className={styles.snackFoodIcon}>
                                      <Image
                                        className={styles.snackFoodIconImg}
                                        src={foodIcon(food)}
                                        mode="aspectFit"
                                      />
                                    </View>
                                  ) : null}
                                  <View className={styles.snackFoodMain}>
                                    <Text className={styles.snackFoodName}>{entry.name}</Text>
                                    <Text className={styles.snackFoodGrams}>
                                      {entry.grams} 克
                                    </Text>
                                  </View>
                                  <Text className={styles.snackFoodKcal}>
                                    {Math.round(entry.kcal)} 千卡
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })
                    : null}
                </View>
              </View>
            </View>
          </View>
        </>
      ) : calendarTab === 'body' ? (
        <View className={styles.bodySection}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>今日体重维度</Text>
            <Text
              className={styles.sectionLink}
              onClick={() => navigateTo({ url: '/subpackages/misc/body/index?tab=chart' })}
            >
              趋势图 ›
            </Text>
          </View>
          <BodyDataView date={todayKey} editable />
        </View>
      ) : sessions.length ? (
        <>
          {prs.length ? (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>个人最佳 PR</Text>
                <View className={styles.prHeadSide}>
                  <Text className={styles.sectionExtra}>
                    {prSelectedIds === null
                      ? `共 ${prs.length} 项 · 按预估 1RM`
                      : `${filteredPrs.length} / ${prs.length} 项`}
                  </Text>
                  <View
                    className={classnames(
                      styles.prFilterButton,
                      prSelectedIds !== null && styles.prFilterButtonOn
                    )}
                    onClick={openPrFilter}
                  >
                    <Text
                      className={classnames(
                        styles.prFilterButtonText,
                        prSelectedIds !== null && styles.prFilterButtonTextOn
                      )}
                    >
                      {prSelectedIds === null ? '筛选' : `已筛选 ${filteredPrs.length}`}
                    </Text>
                    <Text
                      className={classnames(
                        styles.prFilterArrow,
                        prFilterOpen && styles.prFilterArrowOpen
                      )}
                    >
                      ⌄
                    </Text>
                  </View>
                </View>
              </View>

              {/* PR 趋势：点下面任意一项切换动作，点图上的日期看当天计划 */}
              {activePr ? (
                <PrTrendChart
                  name={activePrTitle}
                  points={prTrend}
                  onPickPoint={(point) => openPrPoint(point.sessionId)}
                />
              ) : null}
              {visiblePrs.map((pr) => {
                const labels = prVariantLabels(pr);
                const on = pr.key === activePr?.key;
                return (
                  <View
                    key={pr.key}
                    className={classnames(styles.prRow, on && styles.prRowOn)}
                    onClick={() => setPrPick(pr.key)}
                  >
                    <View className={styles.prMain}>
                      <View className={styles.prNameRow}>
                        <Text className={styles.prName}>{prNameOf(pr)}</Text>
                        {labels.length ? (
                          <Text className={styles.prVariantTag}>{labels.join(' · ')}</Text>
                        ) : null}
                      </View>
                      <View className={styles.prMeta}>
                        <MuscleTag muscle={pr.muscle} />
                        <Text className={styles.prDate}>{dayLabel(pr.achievedAt)}达成</Text>
                      </View>
                    </View>
                    <View className={styles.prValue}>
                      <View className={styles.prValueMain}>
                        <Text className={styles.prLabel}>1RM</Text>
                        <Text className={styles.prWeight}>
                          {formatWeight(pr.oneRm)}
                          <Text className={styles.prUnit}>kg</Text>
                        </Text>
                      </View>
                      <Text className={styles.prReps}>
                        最佳 {formatWeight(pr.weight)}kg × {pr.reps}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {prSelectedIds === null && prs.length > 10 ? (
                <Text className={styles.prMore}>仅展示 1RM 最高的 10 项</Text>
              ) : null}
            </View>
          ) : null}

          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>近 7 天容量</Text>
              <Text className={styles.sectionExtra}>合计 {formatVolume(weekVolume)} kg</Text>
            </View>
            <View className={styles.chart}>
              {days.map((day) => {
                const height = day.volume > 0 ? Math.max(8, Math.round((day.volume / maxVolume) * 100)) : 0;
                return (
                  <View key={day.date} className={styles.chartCol}>
                    <View className={styles.barTrack}>
                      {day.volume > 0 ? (
                        <View className={styles.bar} style={{ height: `${height}%` }} />
                      ) : (
                        <View className={styles.barEmpty} />
                      )}
                    </View>
                    <Text
                      className={classnames(styles.barLabel, day.isToday && styles.barLabelToday)}
                    >
                      {day.isToday ? '今天' : day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {muscleStats.length ? (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>肌群分布</Text>
                <Text className={styles.sectionExtra}>按完成组数统计</Text>
              </View>
              {muscleStats.map((entry) => (
                <View key={entry.group} className={styles.muscleRow}>
                  <View className={styles.muscleTop}>
                    <View className={styles.muscleNameWrap}>
                      <View
                        style={{
                          width: '16rpx',
                          height: '16rpx',
                          borderRadius: '999rpx',
                          backgroundColor: MUSCLE_COLORS[entry.group]
                        }}
                      />
                      <Text className={styles.muscleName}>{MUSCLE_LABELS[entry.group]}</Text>
                    </View>
                    <Text className={styles.muscleValue}>{entry.sets} 组</Text>
                  </View>
                  <View className={styles.muscleTrack}>
                    <View
                      className={styles.muscleFill}
                      style={{
                        width: `${Math.round((entry.sets / maxMuscleSets) * 100)}%`,
                        backgroundColor: MUSCLE_COLORS[entry.group]
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="📈"
            title="还没有训练数据"
            desc="完成一次训练后，这里会展示你的训练统计、日历与 PR 记录"
          />
        </View>
      )}

      {null /* 历史训练记录已隐藏：从日历格子点进去看 */}

      {prFilterOpen ? (
        <View className={styles.prFilterOverlay}>
          <View className={styles.prFilterMask} onClick={() => setPrFilterOpen(false)} />
          <View className={styles.prFilterPanel}>
            <View className={styles.prFilterHeader}>
              <View className={styles.prFilterTitleWrap}>
                <Text className={styles.prFilterTitle}>筛选 PR 动作</Text>
                <Text className={styles.prFilterSubtitle}>
                  已选 {prDraftIds.length} / {prs.length} 个动作
                </Text>
              </View>
              <View className={styles.prFilterClose} onClick={() => setPrFilterOpen(false)}>
                <Text className={styles.prFilterCloseText}>✕</Text>
              </View>
            </View>

            <View className={styles.prFilterChips}>
              <View
                className={classnames(
                  styles.prFilterChip,
                  prMuscle === 'all' && styles.prFilterChipOn
                )}
                onClick={() => setPrMuscle('all')}
              >
                <Text
                  className={classnames(
                    styles.prFilterChipText,
                    prMuscle === 'all' && styles.prFilterChipTextOn
                  )}
                >
                  全部
                </Text>
              </View>
              {prMuscles.map((group) => (
                <View
                  key={group}
                  className={classnames(
                    styles.prFilterChip,
                    prMuscle === group && styles.prFilterChipOn
                  )}
                  onClick={() => setPrMuscle(group)}
                >
                  <Text
                    className={classnames(
                      styles.prFilterChipText,
                      prMuscle === group && styles.prFilterChipTextOn
                    )}
                  >
                    {MUSCLE_LABELS[group]}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView scrollY className={styles.prFilterList}>
              {prFilterList.map((pr) => {
                const labels = prVariantLabels(pr);
                const selected = prDraftIds.includes(pr.key);
                return (
                  <View
                    key={pr.key}
                    className={classnames(
                      styles.prFilterItem,
                      selected && styles.prFilterItemOn
                    )}
                    onClick={() => togglePrDraft(pr.key)}
                  >
                    <View className={styles.prFilterItemMain}>
                      <View className={styles.prFilterItemNameRow}>
                        <Text className={styles.prFilterItemName}>{prNameOf(pr)}</Text>
                        {labels.length ? (
                          <Text className={styles.prFilterItemVariant}>
                            {labels.join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      <View className={styles.prFilterItemMeta}>
                        <MuscleTag muscle={pr.muscle} />
                        <Text className={styles.prFilterItemPr}>
                          1RM {formatWeight(pr.oneRm)} kg
                        </Text>
                      </View>
                    </View>
                    <View
                      className={classnames(
                        styles.prFilterCheck,
                        selected && styles.prFilterCheckOn
                      )}
                    >
                      {selected ? <Text className={styles.prFilterCheckText}>✓</Text> : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View className={styles.prFilterFooter}>
              <View className={styles.prFilterUtility}>
                <View className={styles.prFilterTextBtn} onClick={() => setPrDraftIds([])}>
                  <Text className={styles.prFilterTextBtnLabel}>清空</Text>
                </View>
                <View
                  className={styles.prFilterTextBtn}
                  onClick={() => setPrDraftIds(prs.map((pr) => pr.key))}
                >
                  <Text className={styles.prFilterTextBtnLabel}>全选</Text>
                </View>
              </View>
              <View
                className={classnames(
                  styles.prFilterApply,
                  !prDraftIds.length && styles.prFilterApplyDisabled
                )}
                onClick={applyPrFilter}
              >
                <Text className={styles.prFilterApplyText}>
                  {prDraftIds.length ? `查看 ${prDraftIds.length} 个 PR` : '请选择动作'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <DietTargetSheet
        visible={targetOpen}
        carb={dietTarget.carb}
        protein={dietTarget.protein}
        fat={dietTarget.fat}
        onClose={() => setTargetOpen(false)}
      />
    </View>
  );
};

export default StatsPage;
