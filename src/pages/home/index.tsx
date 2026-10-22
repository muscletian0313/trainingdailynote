import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { navigateTo, redirectTo, showModal, showToast, switchTab } from '@/utils/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { Plan } from '@/types';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import {
  isPlanFinished,
  isSessionPaused,
  planFromSession,
  planMuscleTags,
  sessionDurationSec,
  sessionVolume
} from '@/utils/workout';
import { motivationOfDay } from '@/constants';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  dayLabel,
  formatClock,
  formatDuration,
  formatTimer,
  formatVolume,
  isDateToday,
  weekdayLabel
} from '@/utils/format';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const sessions = useSessionStore((state) => state.sessions);
  const active = useSessionStore((state) => state.active);
  const startSession = useSessionStore((state) => state.startSession);
  const discardActive = useSessionStore((state) => state.discardActive);
  const pauseActive = useSessionStore((state) => state.pauseActive);
  const resumeActive = useSessionStore((state) => state.resumeActive);
  const plans = usePlanStore((state) => state.plans);
  const addPlan = usePlanStore((state) => state.addPlan);
  const attachPlanToSession = useSessionStore((state) => state.attachPlanToSession);
  const profile = useProfileStore((state) => state.profile);

  /** 有进行中的训练（空训练也算，可能是刚点开的自由训练） */
  const hasActive = !!active;
  const activePaused = isSessionPaused(active);

  // 秒级刷新，保证「已用时」实时跳动
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasActive) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [hasActive]);

  // 首次进入：没有任何引导记录、也没有计划与训练记录的新用户才自动进引导页。
  // 后面两个条件是兜底——万一本地那条引导标记写入丢失，老用户也不会第二天又被拉去答题。
  useEffect(() => {
    const isNewUser = !profile.onboardedAt && !plans.length && !sessions.length;
    if (isNewUser) {
      redirectTo({ url: '/pages/onboarding/index' });
    }
    // 只在首次挂载时判断一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 每日一条激励文案：同一天保持不变，隔天自动换 */
  const quote = motivationOfDay(dayjs().format('YYYY-MM-DD'));

  const recent = sessions.slice(0, 3);

  /** 今日计划排在最前，其余保持原顺序 */
  const sortedPlans = [...plans].sort(
    (a, b) => Number(isDateToday(b.startDate)) - Number(isDateToday(a.startDate))
  );

  const hour = dayjs().hour();
  const greeting =
    hour < 6 ? '凌晨好' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  const goSession = () => {
    navigateTo({ url: '/pages/session/index' });
  };

  /** 直接开始某个计划的训练（含「已有进行中训练」的冲突处理） */
  const startPlanNow = (plan: Plan) => {
    if (!plan.exercises.length) {
      showToast({ title: '请先为计划添加动作', icon: 'none' });
      return;
    }
    const go = () => {
      startSession({ plan });
      goSession();
    };
    if (active) {
      showModal({
        title: '提示',
        content: '当前有进行中的训练，是否放弃并开始新的训练？',
        confirmText: '确定放弃',
        success: (res) => {
          if (res.confirm) {
            discardActive();
            go();
          }
        }
      });
      return;
    }
    go();
  };

  /** 大按钮指向的计划：我的计划里最近的一个未完成计划 */
  const nextPlan = sortedPlans.find(
    (plan) => plan.exercises.length > 0 && !isPlanFinished(sessions, plan.id)
  );

  const handleStart = () => {
    if (hasActive) {
      goSession();
      return;
    }
    if (nextPlan) {
      startPlanNow(nextPlan);
      return;
    }
    // 没有可用计划 → 自由训练
    startSession();
    goSession();
  };

  const openPlan = (plan: Plan) => {
    navigateTo({ url: `/pages/plan-detail/index?id=${plan.id}` });
  };

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

  const goPlans = () => {
    switchTab({ url: '/pages/plans/index' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.greeting}>
          {greeting}，{profile.nickname}
        </Text>
        <Text className={styles.date}>
          {dayjs().format('M月D日')} {weekdayLabel(Date.now())}
        </Text>
      </View>

      {active ? (
        <View className={styles.activeCard}>
          <View className={styles.activeTop}>
            <View
              className={classnames(styles.activeBadge, activePaused && styles.activeBadgePaused)}
            >
              <Text className={styles.activeBadgeText}>
                {activePaused ? '已暂停' : '进行中'}
              </Text>
            </View>
            <Text className={styles.activeMeta}>{formatClock(active.startedAt)} 开始</Text>
          </View>
          <Text className={styles.activeName}>{active.name}</Text>
          <Text className={styles.activeMeta}>
            已用 {formatTimer(sessionDurationSec(active))} · {active.exercises.length} 个动作 ·{' '}
            {formatVolume(sessionVolume(active))} kg
          </Text>
          <View className={styles.activeActions}>
            <View
              className={classnames(styles.activeAction, styles.activeActionPrimary)}
              onClick={() => {
                resumeActive();
                goSession();
              }}
            >
              <Text className={styles.activeActionPrimaryText}>继续训练</Text>
            </View>
            {activePaused ? null : (
              <View className={styles.activeAction} onClick={() => pauseActive()}>
                <Text className={styles.activeActionText}>暂停</Text>
              </View>
            )}
            <View className={styles.activeAction} onClick={goSession}>
              <Text className={styles.activeActionText}>结束训练</Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View className={styles.quoteCard}>
            <Text className={styles.quoteText}>{quote}</Text>
          </View>

          <View className={styles.startBtn} onClick={handleStart}>
            <Text className={styles.startBtnText}>
              {nextPlan ? '开始训练' : '自由训练'}
            </Text>
          </View>
        </>
      )}

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>我的计划</Text>
        <Text className={styles.sectionAction} onClick={goPlans}>
          管理 ›
        </Text>
      </View>

      {sortedPlans.length ? (
        <ScrollView scrollX className={styles.planScroll}>
          {sortedPlans.map((plan) => {
            const isToday = isDateToday(plan.startDate);
            const finished = isPlanFinished(sessions, plan.id);
            const isRunning = hasActive && active?.planId === plan.id;
            return (
              <View
                key={plan.id}
                className={classnames(styles.planCard, isToday && styles.planCardToday)}
              >
                <View onClick={() => openPlan(plan)}>
                  <View className={styles.planCardNameRow}>
                    <Text className={styles.planCardName}>{plan.name}</Text>
                    {isToday ? <Text className={styles.planTodayBadge}>今日</Text> : null}
                  </View>
                  <Text className={styles.planCardCount}>
                    {plan.exercises.length} 个动作 ·{' '}
                    {plan.exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组
                  </Text>
                  <View className={styles.planCardTags}>
                    {planMuscleTags(plan).map((muscle, index) => (
                      <MuscleTag
                        key={muscle}
                        muscle={muscle}
                        solid={index === 0}
                        className={styles.planTag}
                      />
                    ))}
                  </View>
                </View>
                {isRunning ? (
                  <View className={styles.activeBtn} onClick={goSession}>
                    <Text className={styles.activeBtnText}>进行中</Text>
                  </View>
                ) : finished ? (
                  <View
                    className={classnames(styles.activeBtn, styles.planDoneBtn)}
                    onClick={() => openPlan(plan)}
                  >
                    <Text className={classnames(styles.activeBtnText, styles.planDoneBtnText)}>
                      已完成
                    </Text>
                  </View>
                ) : isToday && plan.exercises.length ? (
                  <View className={styles.activeBtn} onClick={() => startPlanNow(plan)}>
                    <Text className={styles.activeBtnText}>开始训练</Text>
                  </View>
                ) : (
                  <View className={styles.activeBtn} onClick={() => openPlan(plan)}>
                    <Text className={styles.activeBtnText}>查看</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View className={styles.recentList}>
          <EmptyState
            glyph="📋"
            title="还没有训练计划"
            desc="创建一个计划，让每次训练更有条理"
            actionText="去创建计划"
            onAction={goPlans}
          />
        </View>
      )}

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>最近训练</Text>
      </View>

      {recent.length ? (
        <View className={styles.recentList}>
          {recent.map((session, index) => (
            <View
              key={session.id}
              className={classnames(
                styles.recentItem,
                index !== recent.length - 1 && styles.recentItemBorder
              )}
              onClick={() => openRecord(session.id)}
            >
              <View className={styles.recentDot} />
              <View className={styles.recentMain}>
                <Text className={styles.recentName}>{session.name}</Text>
                <Text className={styles.recentMeta}>
                  {dayLabel(session.startedAt)} {formatClock(session.startedAt)} ·{' '}
                  {formatDuration(sessionDurationSec(session))} · {session.exercises.length} 个动作
                </Text>
              </View>
              <View className={styles.recentRight}>
                <Text className={styles.recentVolume}>
                  {formatVolume(sessionVolume(session))}
                  <Text className={styles.recentVolumeUnit}>kg</Text>
                </Text>
                <Text className={styles.recentArrow}>›</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.recentList}>
          <EmptyState
            glyph="🏋️"
            title="还没有训练记录"
            desc="点击下方制定训练计划，记录你的第一场训练"
            actionText="制定训练计划"
            onAction={goPlans}
          />
        </View>
      )}
    </View>
  );
};

export default HomePage;
