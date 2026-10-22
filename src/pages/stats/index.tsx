import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import { navigateTo } from '@/utils/taro';
import classnames from 'classnames';
import { MUSCLE_COLORS, MUSCLE_GROUPS, MUSCLE_LABELS } from '@/constants';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import EmptyState from '@/components/EmptyState';
import MuscleTag from '@/components/MuscleTag';
import TrainingCalendar from '@/components/TrainingCalendar';
import {
  computePrs,
  planFromSession,
  recentDaysVolume,
  sessionDurationSec,
  sessionVolume
} from '@/utils/workout';
import { dayLabel, formatClock, formatDuration, formatVolume, formatWeight } from '@/utils/format';
import styles from './index.module.scss';

const StatsPage: React.FC = () => {
  const sessions = useSessionStore((state) => state.sessions);
  const addPlan = usePlanStore((state) => state.addPlan);
  const attachPlanToSession = useSessionStore((state) => state.attachPlanToSession);

  const days = useMemo(() => recentDaysVolume(sessions, 7), [sessions]);
  const maxVolume = Math.max(...days.map((item) => item.volume), 1);
  const weekVolume = days.reduce((sum, item) => sum + item.volume, 0);
  const prs = useMemo(() => computePrs(sessions), [sessions]);

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

  /** 历史训练：统一进「练完的计划详情」；老的自由训练记录现场补一个计划 */
  const openRecord = (id: string) => {
    const session = sessions.find((item) => item.id === id);
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

  /** 点日历某天 → 打开「当天训练计划」独立页面（返回即回到数据页） */
  const openDatePlans = (date: string) => {
    navigateTo({ url: `/pages/day-plans/index?date=${date}` });
  };

  return (
    <View className={styles.page}>
      {sessions.length ? (
        <>
          <View className={styles.section}>
            <TrainingCalendar sessions={sessions} onPickDate={openDatePlans} />
          </View>

          {prs.length ? (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>个人最佳 PR</Text>
                <Text className={styles.sectionExtra}>共 {prs.length} 项 · 按预估 1RM</Text>
              </View>
              {prs.slice(0, 10).map((pr) => {
                const info = getExerciseById(pr.exerciseId);
                return (
                  <View key={pr.exerciseId} className={styles.prRow} onClick={() => openRecord(pr.sessionId)}>
                    <View className={styles.prMain}>
                      <Text className={styles.prName}>{info ? info.name : '已下架'}</Text>
                      <View className={styles.prMeta}>
                        {info ? <MuscleTag muscle={info.muscle} /> : null}
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
              {prs.length > 10 ? (
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

      {sessions.length ? (
        <>
          <View className={styles.sectionHeader} style={{ marginTop: '32rpx' }}>
            <Text className={styles.sectionTitle}>历史记录</Text>
            <Text className={styles.sectionExtra}>{sessions.length} 条</Text>
          </View>
          <View className={styles.recordList}>
            {sessions.map((session, index) => (
              <View
                key={session.id}
                className={classnames(
                  styles.recordItem,
                  index !== sessions.length - 1 && styles.recordItemBorder
                )}
                onClick={() => openRecord(session.id)}
              >
                <View className={styles.recordMain}>
                  <Text className={styles.recordName}>{session.name}</Text>
                  <Text className={styles.recordMeta}>
                    {dayLabel(session.startedAt)} {formatClock(session.startedAt)} ·{' '}
                    {formatDuration(sessionDurationSec(session))} · {session.exercises.length} 个动作
                  </Text>
                </View>
                <View className={styles.recordRight}>
                  <Text className={styles.recordVolume}>
                    {formatVolume(sessionVolume(session))}
                    <Text className={styles.recordVolumeUnit}>kg</Text>
                  </Text>
                  <Text className={styles.recordArrow}>›</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
};

export default StatsPage;
