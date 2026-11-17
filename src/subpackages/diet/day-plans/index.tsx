import React, { useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import type { Plan, Session } from '@/types';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import { navigateBack, navigateTo, showModal, showToast } from '@/utils/taro';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  estimateCaloriesBurned,
  isCardioPlan,
  isPlanFinished,
  planMuscleTags,
  sessionCardioDistanceKm,
  sessionCardioMin,
  sessionDateKey,
  sessionDurationSec,
  sessionTotalSets,
  sessionTotalWeight
} from '@/utils/workout';
import { formatClock, formatVolume, isDateToday } from '@/utils/format';
import { muscleImageOf } from '@/utils/muscleImage';
import { usePageTheme } from '@/hooks/usePageTheme';
import homeStyles from '@/pages/home/index.module.scss';
import styles from './index.module.scss';

/** 某一天练过的计划：从数据页日历点日期进来，卡片沿用首页「我的计划」的样式 */
const DayPlansPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const date = router.params?.date || dayjs().format('YYYY-MM-DD');
  const plans = usePlanStore((state) => state.plans);
  const removePlan = usePlanStore((state) => state.removePlan);
  const sessions = useSessionStore((state) => state.sessions);
  const active = useSessionStore((state) => state.active);
  const discardActive = useSessionStore((state) => state.discardActive);
  const deleteSessionsByPlan = useSessionStore((state) => state.deleteSessionsByPlan);
  const profile = useProfileStore((state) => state.profile);

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

  /** 删除计划：和计划列表一致，训练记录一起删；正在练的顺带放弃 */
  const deletePlan = (plan: Plan) => {
    const recordCount = sessions.filter((session) => session.planId === plan.id).length;
    const inProgress = active?.planId === plan.id;
    const extra: string[] = [];
    if (recordCount) extra.push(`该计划的 ${recordCount} 条训练记录`);
    if (inProgress) extra.push('正在进行的训练');
    showModal({
      title: '删除计划',
      content: extra.length
        ? `确定删除「${plan.name}」吗？${extra.join('和')}也会一起删除，且不可恢复。`
        : `确定删除「${plan.name}」吗？`,
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        removePlan(plan.id);
        deleteSessionsByPlan(plan.id);
        if (inProgress) discardActive();
        showToast({ title: '已删除', icon: 'none' });
      }
    });
  };

  return (
    <View className={classnames(styles.page, themeClass)}>
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
            const bgImage = muscleImageOf(muscles[0]);
            const isToday = isDateToday(plan.startDate);
            const isFuture = dayjs(plan.startDate)
              .startOf('day')
              .isAfter(dayjs().startOf('day'));
            /** 纯有氧计划：总重量 / 总容量换成总时长 / 总距离 */
            const cardioOnly = isCardioPlan(plan.exercises);
            const cardioMin = sessionCardioMin(session);
            const cardioKm = sessionCardioDistanceKm(session);
            const burnFilled = session.calories && session.calories > 0 ? session.calories : null;
            const burnKcal =
              burnFilled ??
              (estimateCaloriesBurned(session, profile.weight ?? 0, profile.gender) || null);

            return (
              <View
                key={plan.id}
                className={classnames(
                  homeStyles.planCard,
                  isToday && homeStyles.planCardToday,
                  bgImage && homeStyles.planCardWithImage
                )}
                onClick={() => navigateTo({ url: `/pages/plan-detail/index?id=${plan.id}` })}
              >
                {bgImage ? (
                  <>
                    <Image className={homeStyles.cardImage} src={bgImage} mode="aspectFill" />
                    <View className={homeStyles.cardScrim} />
                  </>
                ) : null}

                <View className={homeStyles.planCardBody}>
                  <View className={homeStyles.planTop}>
                    <Text className={homeStyles.planDate}>
                      {dayjs(plan.startDate).format('M月D日')}
                      {isToday ? '（今日）' : isFuture ? '（未来）' : ''}
                    </Text>
                    {finished ? (
                      <Text className={styles.doneBadge}>已完成</Text>
                    ) : (
                      <Text className={homeStyles.runningBadge}>进行中</Text>
                    )}
                  </View>

                  <View className={homeStyles.planNameRow}>
                    <Text className={homeStyles.planCardName}>{plan.name}</Text>
                  </View>

                  <View className={homeStyles.planCardTags}>
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
                      <Text className={homeStyles.noMuscle}>还没有动作</Text>
                    )}
                  </View>

                  <View className={homeStyles.statsRow}>
                    <View className={homeStyles.statItem}>
                      <Text className={homeStyles.statValue}>
                        {cardioOnly ? (
                          cardioMin ? (
                            <>
                              {cardioMin}
                              <Text className={homeStyles.statUnit}>min</Text>
                            </>
                          ) : (
                            '—'
                          )
                        ) : (
                          <>
                            {formatVolume(sessionTotalWeight(session))}
                            <Text className={homeStyles.statUnit}>kg</Text>
                          </>
                        )}
                      </Text>
                      <Text className={homeStyles.statLabel}>
                        {cardioOnly ? '总时长' : '总重量'}
                      </Text>
                    </View>
                    <View className={homeStyles.statDivider} />
                    <View className={homeStyles.statItem}>
                      <Text className={homeStyles.statValue}>
                        {cardioOnly ? (
                          cardioKm !== null ? (
                            <>
                              {cardioKm}
                              <Text className={homeStyles.statUnit}>km</Text>
                            </>
                          ) : (
                            '—'
                          )
                        ) : (
                          <>
                            {sessionTotalSets(session)}
                            <Text className={homeStyles.statUnit}>组</Text>
                          </>
                        )}
                      </Text>
                      <Text className={homeStyles.statLabel}>
                        {cardioOnly ? '总距离' : '总组数'}
                      </Text>
                    </View>
                    <View className={homeStyles.statDivider} />
                    <View className={homeStyles.statItem}>
                      <Text className={homeStyles.statValue}>
                        {session.exercises.length}
                        <Text className={homeStyles.statUnit}>个</Text>
                      </Text>
                      <Text className={homeStyles.statLabel}>动作数</Text>
                    </View>
                    <View className={homeStyles.statDivider} />
                    <View className={homeStyles.statItem}>
                      <Text className={homeStyles.statValue}>
                        {burnKcal ? (
                          <>
                            {burnFilled ? null : (
                              <Text className={homeStyles.statEstimate}>≈</Text>
                            )}
                            {burnKcal}
                            <Text className={homeStyles.statUnit}>kcal</Text>
                          </>
                        ) : (
                          '—'
                        )}
                      </Text>
                      <Text className={homeStyles.statLabel}>消耗</Text>
                    </View>
                  </View>

                  <View className={styles.timeRow}>
                    <Text className={styles.time}>
                      {formatClock(session.startedAt)} 开始 · 用时{' '}
                      {Math.max(1, Math.round(sessionDurationSec(session) / 60))} 分钟
                    </Text>
                    <View
                      className={styles.deleteBtn}
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePlan(plan);
                      }}
                    >
                      <Text className={styles.deleteText}>删除</Text>
                    </View>
                  </View>
                </View>
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
