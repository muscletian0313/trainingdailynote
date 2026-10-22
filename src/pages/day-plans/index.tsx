import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import type { Plan, Session } from '@/types';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { navigateBack, navigateTo } from '@/utils/taro';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  isPlanFinished,
  planMuscleTags,
  sessionDateKey,
  sessionDurationSec,
  sessionTotalSets,
  sessionTotalWeight
} from '@/utils/workout';
import { formatClock, formatDuration, formatVolume } from '@/utils/format';
import styles from './index.module.scss';

/** 某一天练过的计划：从数据页日历点日期进来 */
const DayPlansPage: React.FC = () => {
  const router = useRouter();
  const date = router.params?.date || dayjs().format('YYYY-MM-DD');
  const plans = usePlanStore((state) => state.plans);
  const sessions = useSessionStore((state) => state.sessions);

  const dateLabel = dayjs(date).format('M月D日');

  /** 这一天练过的计划（同一天按计划设定日期归属，同一个计划只保留最近一次） */
  const dayPlanList = useMemo(() => {
    const planById = new Map(plans.map((plan) => [plan.id, plan]));
    const byPlan = new Map<string, Session>();
    sessions.forEach((session) => {
      if (!session.planId) return;
      const plan = planById.get(session.planId);
      if (!plan) return;
      if (sessionDateKey(session, plan) !== date) return;
      if (!byPlan.has(session.planId)) byPlan.set(session.planId, session);
    });
    return Array.from(byPlan.entries())
      .map(([planId, session]) => ({
        plan: plans.find((item) => item.id === planId),
        session
      }))
      .filter((entry): entry is { plan: Plan; session: Session } => Boolean(entry.plan))
      .sort((a, b) => b.session.startedAt - a.session.startedAt);
  }, [date, sessions, plans]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>{dateLabel} 训练计划</Text>
        <Text className={styles.subtitle}>
          {dayPlanList.length ? `${dayPlanList.length} 个计划 · 当天练过` : '当天没有训练记录'}
        </Text>
      </View>

      <ScrollView scrollY className={styles.body}>
        {dayPlanList.length ? (
          dayPlanList.map(({ plan, session }) => {
            const finished = isPlanFinished(sessions, plan.id);
            const muscles = planMuscleTags(plan);
            return (
              <View
                key={plan.id}
                className={styles.card}
                onClick={() => navigateTo({ url: `/pages/plan-detail/index?id=${plan.id}` })}
              >
                <View className={styles.cardTop}>
                  <Text className={styles.cardName}>{plan.name}</Text>
                  {finished ? (
                    <Text className={styles.doneBadge}>已完成</Text>
                  ) : (
                    <Text className={styles.runningBadge}>进行中</Text>
                  )}
                </View>

                <View className={styles.tags}>
                  {muscles.length ? (
                    muscles.map((muscle, index) => (
                      <MuscleTag
                        key={muscle}
                        muscle={muscle}
                        solid={index === 0}
                        className={styles.tag}
                      />
                    ))
                  ) : (
                    <Text className={styles.noMuscle}>还没有动作</Text>
                  )}
                </View>

                <View className={styles.stats}>
                  <View className={styles.statItem}>
                    <Text className={styles.statValue}>
                      {formatVolume(sessionTotalWeight(session))}
                      <Text className={styles.statUnit}>kg</Text>
                    </Text>
                    <Text className={styles.statLabel}>总重量</Text>
                  </View>
                  <View className={styles.statDivider} />
                  <View className={styles.statItem}>
                    <Text className={styles.statValue}>
                      {sessionTotalSets(session)}
                      <Text className={styles.statUnit}>组</Text>
                    </Text>
                    <Text className={styles.statLabel}>总容量</Text>
                  </View>
                  <View className={styles.statDivider} />
                  <View className={styles.statItem}>
                    <Text className={styles.statValue}>
                      {plan.exercises.length}
                      <Text className={styles.statUnit}>个</Text>
                    </Text>
                    <Text className={styles.statLabel}>动作数</Text>
                  </View>
                </View>

                <Text className={styles.time}>
                  {formatClock(session.startedAt)} 开始 · 用时{' '}
                  {formatDuration(sessionDurationSec(session))}
                </Text>
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <EmptyState
              glyph="📋"
              title="这一天没有训练计划"
              desc="当天没有用计划训练过，或者计划已经被删除"
              actionText="返回数据页"
              onAction={() => navigateBack()}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default DayPlansPage;
