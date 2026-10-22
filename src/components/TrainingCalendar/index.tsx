import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { navigateTo } from '@/utils/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { MuscleGroup, Session } from '@/types';
import { MUSCLE_COLORS, MUSCLE_GROUPS } from '@/constants';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import { usePlanStore } from '@/store/usePlanStore';
import { groupSessionsByDate } from '@/utils/workout';
import styles from './index.module.scss';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 日历视图：训练已上线，饮食与体重&维度先留入口 */
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

/** 一天最多画几条部位标记 */
const MAX_MARKS = 3;

interface TrainingCalendarProps {
  sessions: Session[];
  /** 点某一天：跳到计划页，只看这一天的计划 */
  onPickDate: (date: string) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ sessions, onPickDate }) => {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [tab, setTab] = useState<CalendarTab>('training');
  const plans = usePlanStore((state) => state.plans);

  // 有计划按计划设定日期展示，自由训练按实际训练日期展示
  const byDate = useMemo(() => groupSessionsByDate(sessions, plans), [sessions, plans]);
  const todayKey = dayjs().format('YYYY-MM-DD');

  /** 每天练到的部位（按部位表的固定顺序，颜色跟着部位走） */
  const musclesByDate = useMemo(() => {
    const map: Record<string, MuscleGroup[]> = {};
    Object.entries(byDate).forEach(([date, daySessions]) => {
      const seen = new Set<MuscleGroup>();
      daySessions.forEach((session) => {
        session.exercises.forEach((item) => {
          const info = getExerciseById(item.exerciseId);
          if (info) seen.add(exerciseMuscleTag(info, item.variants).muscle);
        });
      });
      map[date] = MUSCLE_GROUPS.filter((muscle) => seen.has(muscle));
    });
    return map;
  }, [byDate]);

  const cells = useMemo(() => {
    const offset = (month.day() + 6) % 7; // 周一为一周第一天
    const daysInMonth = month.daysInMonth();
    const list: (number | null)[] = [];
    for (let i = 0; i < offset; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) list.push(day);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [month]);

  const monthCount = useMemo(
    () => Object.keys(byDate).filter((key) => dayjs(key).isSame(month, 'month')).length,
    [byDate, month]
  );

  const changeMonth = (offset: number) => {
    setMonth((prev) => prev.add(offset, 'month'));
  };

  return (
    <View className={styles.calendar}>
      {/* 训练 / 饮食 / 体重&维度：体重&维度点进去是独立的记录页 */}
      <View className={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <View
              key={item.key}
              className={classnames(styles.tab, active && styles.tabActive)}
              onClick={() => {
                if (item.key === 'body') {
                  navigateTo({ url: '/pages/body/index' });
                  return;
                }
                setTab(item.key);
              }}
            >
              <Text className={classnames(styles.tabText, active && styles.tabTextActive)}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View className={styles.head}>
        <View className={styles.navBtn} onClick={() => changeMonth(-1)}>
          <Text className={styles.navText}>‹</Text>
        </View>
        <View className={styles.headCenter}>
          <Text className={styles.monthText}>{month.format('YYYY 年 M 月')}</Text>
          <Text className={styles.monthSub}>
            {tab === 'training'
              ? `本月训练 ${monthCount} 天`
              : tab === 'diet'
                ? '饮食记录 · 开发中'
                : '体重 & 维度 · 开发中'}
          </Text>
        </View>
        <View className={styles.navBtn} onClick={() => changeMonth(1)}>
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

      <View className={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} className={styles.cell} />;
          }
          const dateKey = month.date(day).format('YYYY-MM-DD');
          const daySessions = byDate[dateKey] || [];
          const hasTraining = daySessions.length > 0;
          const isToday = dateKey === todayKey;
          // 饮食 / 体重&维度还没数据，格子里只留日期
          const marks =
            tab === 'training' ? (musclesByDate[dateKey] ?? []).slice(0, MAX_MARKS) : [];
          return (
            <View key={dateKey} className={styles.cell}>
              <View
                className={classnames(
                  styles.dayBox,
                  hasTraining && styles.dayBoxActive,
                  isToday && styles.dayBoxToday,
                  isToday && hasTraining && styles.dayBoxTodayActive
                )}
                onClick={() => {
                  // 点日期直接去计划页看当天的计划
                  if (tab === 'training') onPickDate(dateKey);
                }}
              >
                <Text
                  className={classnames(
                    styles.dayText,
                    hasTraining && styles.dayTextActive,
                    isToday && styles.dayTextToday,
                    isToday && hasTraining && styles.dayTextTodayActive
                  )}
                >
                  {day}
                </Text>
              </View>
              {marks.length ? (
                <View className={styles.marks}>
                  {marks.map((muscle) => (
                    <View
                      key={muscle}
                      className={styles.mark}
                      style={{ backgroundColor: MUSCLE_COLORS[muscle] }}
                    >
                      <Text className={styles.markText}>{SHORT_LABELS[muscle]}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default TrainingCalendar;
