import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { DietDay, MuscleGroup, Session } from '@/types';
import { MUSCLE_COLORS, MUSCLE_GROUPS } from '@/constants';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useBodyStore } from '@/store/useBodyStore';
import { groupSessionsByDate } from '@/utils/workout';
import { hasDiet, dayTotals, type DietTotals } from '@/utils/diet';
import styles from './index.module.scss';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 日历视图：训练 / 饮食 / 体重&维度（下面直接显示当天的数据） */
type CalendarTab = 'training' | 'diet' | 'body';

const TABS: { key: CalendarTab; label: string }[] = [
  { key: 'training', label: '训练' },
  { key: 'diet', label: '饮食' },
  { key: 'body', label: '体重&维度' }
];

/** 格子窄，部位用短名 */
const SHORT_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  biceps: '二头',
  triceps: '三头',
  core: '核心',
  cardio: '有氧',
  fullbody: '全身',
  other: '其他'
};

/** 文字色单独设类，浅色主题可压深一档；底色和描边仍沿用肌群主题色 */
const MUSCLE_TEXT_CLASS: Record<MuscleGroup, string> = {
  chest: styles.markTextChest,
  back: styles.markTextBack,
  legs: styles.markTextLegs,
  shoulders: styles.markTextShoulders,
  biceps: styles.markTextBiceps,
  triceps: styles.markTextTriceps,
  core: styles.markTextCore,
  cardio: styles.markTextCardio,
  fullbody: styles.markTextFullbody,
  other: styles.markTextOther
};

/** 未练计划最多放两个部位，多的显示 +N */
const MAX_PLAN_MARKS = 2;

/** 同组数时先看大肌群；严格按此顺序取第一个，避免相同数据每天来回跳 */
const STRENGTH_PRIORITY: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'fullbody',
  'shoulders',
  'core',
  'biceps',
  'triceps',
  'other'
];

/** 部位色的浅底：同一颜色降到指定透明度 */
function softColor(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 已练部位按有效组数收敛，最多两行：
 * - 有有氧：力量主部位 + 有氧
 * - 没有氧：力量组数前两名
 * - 只有一个力量部位：只显示一个
 */
function dominantMuscles(daySessions: Session[]): MuscleGroup[] {
  const setsByMuscle = new Map<MuscleGroup, number>();
  daySessions.forEach((session) => {
    session.exercises.forEach((item) => {
      const info = getExerciseById(item.exerciseId);
      if (!info) return;
      const muscle = exerciseMuscleTag(info, item.variants).muscle;
      const doneSets = item.sets.reduce((count, set) => count + (set.done ? 1 : 0), 0);
      if (!doneSets) return;
      setsByMuscle.set(muscle, (setsByMuscle.get(muscle) ?? 0) + doneSets);
    });
  });

  // 力量部位按组数降序，同组数按大肌群优先级排序
  const strengthRanked = STRENGTH_PRIORITY.map((muscle) => ({
    muscle,
    sets: setsByMuscle.get(muscle) ?? 0
  }))
    .filter((item) => item.sets > 0)
    .sort((a, b) => b.sets - a.sets);

  const hasCardio = (setsByMuscle.get('cardio') ?? 0) > 0;

  const result: MuscleGroup[] = [];
  if (strengthRanked.length > 0) result.push(strengthRanked[0].muscle);
  // 有有氧就用第二行放有氧，否则用第二行放力量次部位
  if (hasCardio) {
    result.push('cardio');
  } else if (strengthRanked.length > 1) {
    result.push(strengthRanked[1].muscle);
  }
  return result;
}

interface TrainingCalendarProps {
  sessions: Session[];
  /** 当前 tab：训练 / 饮食 / 体重维度 */
  tab: CalendarTab;
  onTabChange: (tab: CalendarTab) => void;
  /** 点某一天：跳到计划页，只看这一天的计划 */
  onPickDate: (date: string) => void;
  /** 饮食记录（按日期存）与每日目标 */
  dietDays: Record<string, DietDay>;
  dietTarget: DietTotals;
  /** 点某一天：打开当天的饮食记录 */
  onPickDietDate: (date: string) => void;
  /** 体重维度记录（按日期存） */
  bodyRecords?: { date: string; weight?: number }[];
  /** 点某一天：打开当天的体重维度记录 */
  onPickBodyDate?: (date: string) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  sessions,
  tab,
  onTabChange,
  onPickDate,
  dietDays,
  dietTarget,
  onPickDietDate,
  bodyRecords = [],
  onPickBodyDate
}) => {
  const [cursor, setCursor] = useState(() => dayjs());
  /** 训练 tab 默认只看本周，点「展开整月」再看整月；饮食/体重维度始终整月 */
  const [expanded, setExpanded] = useState(false);
  /** 两套等价动画交替播放：切换内容时不销毁日历节点，也能重新触发过渡 */
  const [motion, setMotion] = useState(0);
  const plans = usePlanStore((state) => state.plans);
  /** 体重单位：公斤 / 斤（和体重维度页保持一致） */
  const bodyUnit = useBodyStore((state) => state.bodyUnit);

  // 有计划按计划设定日期展示，自由训练按实际训练日期展示
  const byDate = useMemo(() => groupSessionsByDate(sessions, plans), [sessions, plans]);
  const todayKey = dayjs().format('YYYY-MM-DD');

  /** 每天的运动消耗（手填热量），算「还可以吃」时加到目标里 */
  const burnByDate = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((session) => {
      if (!session.calories) return;
      const key = dayjs(session.startedAt).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + session.calories;
    });
    return map;
  }, [sessions]);

  /** 每天的力量主部位 + 独立有氧，按实际完成组数计算 */
  const musclesByDate = useMemo(() => {
    const map: Record<string, MuscleGroup[]> = {};
    Object.entries(byDate).forEach(([date, daySessions]) => {
      map[date] = dominantMuscles(daySessions);
    });
    return map;
  }, [byDate]);

  /** 三个 tab 共用：默认只看本周，点「展开整月」再看整月 */
  const weekMode = !expanded;

  /** 某天所在那一周的周一（用来判断是否在当前周） */
  const weekKeyOf = (day: dayjs.Dayjs) =>
    day.subtract((day.day() + 6) % 7, 'day').format('YYYY-MM-DD');
  const cursorWeek = weekKeyOf(cursor);

  /**
   * 始终按整月生成格子（含首尾补位），展开/收起只切换显示哪些行。
   * 这样点按钮不会反复创建/销毁几十个节点，避免真机上事件绑定丢失。
   */
  const cells = useMemo(() => {
    const first = cursor.startOf('month');
    const offset = (first.day() + 6) % 7; // 周一为一周第一天
    const daysInMonth = cursor.daysInMonth();
    // 补齐整周：前后的日期也画出来（灰色），日历更完整
    const start = first.subtract(offset, 'day');
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, index) => start.add(index, 'day'));
  }, [cursor]);

  /** 当前显示的那一周（周视图统计用） */
  const weekCells = useMemo(
    () => cells.filter((cell) => weekKeyOf(cell) === cursorWeek),
    [cells, cursorWeek]
  );

  /** 已排期但还没练的计划：按计划开始日期归档，用来在日历上提前显示“要练什么” */
  const plannedByDate = useMemo(() => {
    const map: Record<string, MuscleGroup[]> = {};
    plans.forEach((plan) => {
      if (!plan.startDate || !plan.exercises.length) return;
      if (!dayjs(plan.startDate).isValid()) return;
      // 同一天已经有训练记录时，以实际记录为准
      if (byDate[plan.startDate]) return;
      const seen = new Set<MuscleGroup>();
      plan.exercises.forEach((item) => {
        const info = getExerciseById(item.exerciseId);
        if (info) seen.add(exerciseMuscleTag(info, item.variants).muscle);
      });
      const muscles = MUSCLE_GROUPS.filter((muscle) => seen.has(muscle));
      if (!muscles.length) return;
      // 同一天多个未练计划：合并部位
      const merged = new Set([...(map[plan.startDate] ?? []), ...muscles]);
      map[plan.startDate] = MUSCLE_GROUPS.filter((muscle) => merged.has(muscle));
    });
    return map;
  }, [plans, byDate]);

  /** 三个 tab 通用：整周都没有记录/计划的行不占下面的位置，只显示日期 */
  const emptyWeeks = useMemo(() => {
    const flags: Record<number, boolean> = {};
    cells.forEach((cell, index) => {
      const key = cell.format('YYYY-MM-DD');
      const hasContent =
        tab === 'training'
          ? !!byDate[key] || !!plannedByDate[key]
          : tab === 'diet'
            ? hasDiet(dietDays[key])
            : bodyRecords.some((record) => record.date === key);
      if (hasContent) flags[Math.floor(index / 7)] = true;
    });
    return flags;
  }, [cells, byDate, plannedByDate, tab, dietDays, bodyRecords]);

  /** 当前显示范围内的训练天数（周视图算本周，月视图算本月） */
  const periodCount = useMemo(
    () => weekCells.filter((cell) => !!byDate[cell.format('YYYY-MM-DD')]).length,
    [weekCells, byDate]
  );

  const monthCount = useMemo(
    () => Object.keys(byDate).filter((key) => dayjs(key).isSame(cursor, 'month')).length,
    [byDate, cursor]
  );

  /** 每周有饮食记录的天数 + 平均热量 */
  const dietWeek = useMemo(() => {
    const recorded = weekCells
      .map((cell) => dietDays[cell.format('YYYY-MM-DD')])
      .filter((day): day is DietDay => hasDiet(day))
      .map((day) => dayTotals(day).kcal);
    const avg = recorded.length
      ? Math.round(recorded.reduce((sum, kcal) => sum + kcal, 0) / recorded.length)
      : 0;
    return { days: recorded.length, avg };
  }, [weekCells, dietDays]);

  /** 本周有体重维度记录的天数 */
  const bodyWeekCount = useMemo(
    () =>
      weekCells.filter((cell) =>
        bodyRecords.some((record) => record.date === cell.format('YYYY-MM-DD'))
      ).length,
    [weekCells, bodyRecords]
  );

  /** 本月有饮食记录的天数 + 平均热量 */
  const dietMonth = useMemo(() => {
    const recorded = Object.entries(dietDays)
      .filter(([key, day]) => dayjs(key).isSame(cursor, 'month') && hasDiet(day))
      .map(([, day]) => dayTotals(day).kcal);
    const avg = recorded.length
      ? Math.round(recorded.reduce((sum, kcal) => sum + kcal, 0) / recorded.length)
      : 0;
    return { days: recorded.length, avg };
  }, [dietDays, cursor]);

  /** 本月有体重维度记录的天数 */
  const bodyMonthCount = useMemo(
    () => bodyRecords.filter((b) => dayjs(b.date).isSame(cursor, 'month')).length,
    [bodyRecords, cursor]
  );

  /** 翻页：周视图翻一周，月视图翻一个月 */
  const changePeriod = (offset: number) => {
    setCursor((prev) => (weekMode ? prev.add(offset * 7, 'day') : prev.add(offset, 'month')));
    setMotion((prev) => prev + 1);
  };

  const motionClass = motion % 2 === 0 ? styles.motionA : styles.motionB;
  const activeTabIndex = TABS.findIndex((item) => item.key === tab);

  /** 标题：周视图显示日期区间，月视图显示年月 */
  const headTitle = weekMode
    ? `${cursor.subtract((cursor.day() + 6) % 7, 'day').format('M月D日')} - ${cursor
        .add(6 - ((cursor.day() + 6) % 7), 'day')
        .format('M月D日')}`
    : cursor.format('YYYY 年 M 月');

  return (
    <View className={styles.calendar}>
      {/* 训练 / 饮食 / 体重&维度：切 tab 换日历内容，下面的数据区跟着变 */}
      <View className={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <View
              key={item.key}
              className={styles.tab}
              onClick={() => {
                if (item.key === tab) return;
                setMotion((prev) => prev + 1);
                onTabChange(item.key);
              }}
            >
              <Text className={classnames(styles.tabText, active && styles.tabTextActive)}>
                {item.label}
              </Text>
            </View>
          );
        })}
        <View
          className={styles.tabIndicator}
          style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
        />
      </View>

      <View className={styles.head}>
        <View className={styles.navBtn} onClick={() => changePeriod(-1)}>
          <Text className={styles.navText}>‹</Text>
        </View>
        <View className={classnames(styles.headCenter, motionClass)}>
          <Text className={styles.monthText}>{headTitle}</Text>
          <Text className={styles.monthSub}>
            {tab === 'training'
              ? `${weekMode ? '本周' : '本月'}训练 ${weekMode ? periodCount : monthCount} 天`
              : tab === 'body'
                ? (weekMode ? bodyWeekCount : bodyMonthCount)
                  ? `${weekMode ? '本周' : '本月'}记录 ${weekMode ? bodyWeekCount : bodyMonthCount} 天`
                  : `${weekMode ? '本周' : '本月'}还没有体重记录`
                : (weekMode ? dietWeek.days : dietMonth.days)
                  ? `${weekMode ? '本周' : '本月'}记录 ${weekMode ? dietWeek.days : dietMonth.days} 天 · 平均 ${weekMode ? dietWeek.avg : dietMonth.avg} kcal`
                  : `${weekMode ? '本周' : '本月'}还没有饮食记录`}
          </Text>
        </View>
        <View className={styles.navBtn} onClick={() => changePeriod(1)}>
          <Text className={styles.navText}>›</Text>
        </View>
      </View>

      <View className={styles.weekRow}>
        {WEEK_LABELS.map((label) => (
          <Text key={label} className={styles.weekText}>
            {label}
          </Text>
        ))}
      </View>

      <View className={classnames(styles.grid, weekMode && styles.gridWeek, motionClass)}>
        {cells.map((cell, index) => {
          const dateKey = cell.format('YYYY-MM-DD');
          const day = cell.date();
          /** 周视图：只显示 cursor 所在那一行，其余行用 display:none 隐藏（节点保留） */
          const hidden = weekMode && weekKeyOf(cell) !== cursorWeek;
          /** 月视图补位的相邻月份日期：灰色显示，保持日历完整 */
          const isOutside = !weekMode && !cell.isSame(cursor, 'month');
          const daySessions = byDate[dateKey] || [];
          const hasTraining = daySessions.length > 0;
          const dietDay = dietDays[dateKey];
          const dietRecorded = tab === 'diet' && hasDiet(dietDay);
          /** 当天「还可以吃」：目标 + 运动消耗 - 已摄入；超了就是负数 */
          const dietRemain = dietRecorded
            ? Math.round(dietTarget.kcal + (burnByDate[dateKey] ?? 0) - dayTotals(dietDay).kcal)
            : 0;
          const bodyRecord = bodyRecords.find((b) => b.date === dateKey);
          const bodyRecorded = tab === 'body' && !!bodyRecord;
          /** 当天记了体重才显示数字，没记就空着 */
          const bodyWeightText =
            bodyRecorded && typeof bodyRecord?.weight === 'number' && bodyRecord.weight > 0
              ? (bodyUnit === 'kg' ? bodyRecord.weight : bodyRecord.weight * 2).toFixed(1)
              : '';
          const isToday = dateKey === todayKey;
          /** 只有排期、还没练的计划：用描边标记，和已练的实心块区分开 */
          const plannedMuscles =
            tab === 'training' && !hasTraining ? (plannedByDate[dateKey] ?? []) : [];
          const planMarks = plannedMuscles.slice(0, MAX_PLAN_MARKS);
          const hasPlan = planMarks.length > 0;
          /** 整周没内容的行只显示日期，不占下面标记的位置 */
          const compact = !emptyWeeks[Math.floor(index / 7)];
          /** 格子是否点亮：训练看有没有练，饮食看有没有记，体重维度看有没有记 */
          const active = tab === 'training' ? hasTraining : tab === 'diet' ? dietRecorded : bodyRecorded;
          const marks = tab === 'training' ? (musclesByDate[dateKey] ?? []) : [];
          return (
            <View
              key={dateKey}
              className={classnames(
                styles.cell,
                compact && styles.cellCompact,
                hidden && styles.cellHidden
              )}
              // 整个格子都能点：日期数字、下面的部位标记 / 还可以吃 / 体重数字都算
              onClick={() => {
                if (tab === 'training') {
                  onPickDate(dateKey);
                } else if (tab === 'diet') {
                  onPickDietDate(dateKey);
                } else if (tab === 'body' && onPickBodyDate) {
                  onPickBodyDate(dateKey);
                }
              }}
            >
              <View
                className={classnames(
                  styles.dayBox,
                  active && !isOutside && styles.dayBoxActive,
                  hasPlan && styles.dayBoxPlanned,
                  isToday && styles.dayBoxToday,
                  isToday && active && styles.dayBoxTodayActive
                )}
              >
                <Text
                  className={classnames(
                    styles.dayText,
                    active && !isOutside && styles.dayTextActive,
                    hasPlan && styles.dayTextPlanned,
                    isOutside && styles.dayTextOutside,
                    isToday && styles.dayTextToday,
                    isToday && active && styles.dayTextTodayActive
                  )}
                >
                  {day}
                </Text>
              </View>
              {tab === 'diet' ? (
                <View className={styles.dietMarks}>
                  {dietRecorded ? (
                    <Text
                      className={classnames(styles.dietKcal, dietRemain < 0 && styles.dietKcalOver)}
                    >
                      {dietRemain}
                    </Text>
                  ) : null}
                </View>
              ) : tab === 'body' ? (
                <View className={styles.dietMarks}>
                  {bodyWeightText ? <Text className={styles.bodyValue}>{bodyWeightText}</Text> : null}
                </View>
              ) : marks.length ? (
                <View className={styles.marks}>
                  {marks.map((muscle) => (
                    <View
                      key={muscle}
                      className={styles.mark}
                      style={{
                        backgroundColor: softColor(MUSCLE_COLORS[muscle], 0.14),
                        borderColor: softColor(MUSCLE_COLORS[muscle], 0.2)
                      }}
                    >
                      <Text className={classnames(styles.markText, MUSCLE_TEXT_CLASS[muscle])}>
                        {SHORT_LABELS[muscle]}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : planMarks.length ? (
                <View className={styles.marks}>
                  {planMarks.map((muscle) => (
                    <View
                      key={muscle}
                      className={classnames(styles.mark, styles.markPlanned)}
                      style={{ borderColor: MUSCLE_COLORS[muscle] }}
                    >
                      <Text className={classnames(styles.markText, MUSCLE_TEXT_CLASS[muscle])}>
                        {SHORT_LABELS[muscle]}
                      </Text>
                    </View>
                  ))}
                  {plannedMuscles.length > planMarks.length ? (
                    <Text className={styles.markMore}>+{plannedMuscles.length - planMarks.length}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* 默认只看本周，点这里展开/收起整月 */}
      <View
        className={styles.expandBtn}
        onClick={() => {
          setExpanded((prev) => !prev);
          setMotion((prev) => prev + 1);
        }}
      >
        <Text className={styles.expandText}>{expanded ? '收起' : '展开整月'}</Text>
        <Text className={classnames(styles.expandArrow, expanded && styles.expandArrowOpen)}>⌄</Text>
      </View>
    </View>
  );
};

export default TrainingCalendar;
