import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateTo, redirectTo, showModal, showToast } from '@/utils/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { Plan } from '@/types';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import {
  displayPlanName,
  estimateCaloriesBurned,
  isCardioPlan,
  isExerciseFinished,
  isPlanFinished,
  isSessionPaused,
  isTimedExercise,
  planCardioTargetMin,
  planMuscleTags,
  sessionCardioDistanceKm,
  sessionCardioMin,
  sessionDoneSets,
  sessionDurationSec,
  sessionTotalSets,
  sessionTotalWeight,
  sessionVolume
} from '@/utils/workout';
import { motivationOfDay } from '@/constants';
import MuscleTag from '@/components/MuscleTag';
import { formatClock, formatTimer, formatVolume, isDateToday, weekdayLabel } from '@/utils/format';
import { muscleImageOf } from '@/utils/muscleImage';
import { cloudFile } from '@/utils/cloudAsset';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

/** 「没有计划」空卡片的背景壁画 */
const EMPTY_BG = cloudFile('muscle/mural.jpg');

const HomePage: React.FC = () => {
  const themeClass = usePageTheme();
  const sessions = useSessionStore((state) => state.sessions);
  const active = useSessionStore((state) => state.active);
  const startSession = useSessionStore((state) => state.startSession);
  const discardActive = useSessionStore((state) => state.discardActive);
  const pauseActive = useSessionStore((state) => state.pauseActive);
  const resumeActive = useSessionStore((state) => state.resumeActive);
  const plans = usePlanStore((state) => state.plans);
  const profile = useProfileStore((state) => state.profile);

  /** 有进行中的训练（空训练也算，可能是刚点开的自由训练） */
  const hasActive = !!active;
  const activePaused = isSessionPaused(active);

  /** 训练中卡片：计划预设按所有组算（含还没做的组），已完成只算做过的组 */
  const activeDoneSets = active ? sessionDoneSets(active) : 0;
  const activeTotalSets = active ? sessionTotalSets(active) : 0;
  const activeProgress = activeTotalSets
    ? Math.round((activeDoneSets / activeTotalSets) * 100)
    : 0;
  const activePlanWeight = active
    ? active.exercises.reduce(
        (sum, item) => sum + item.sets.reduce((acc, set) => acc + Math.abs(set.weight), 0),
        0
      )
    : 0;
  const activePlanVolume = active
    ? active.exercises.reduce(
        (sum, item) =>
          sum +
          (isTimedExercise(item.exerciseId)
            ? 0
            : item.sets.reduce((acc, set) => acc + Math.abs(set.weight) * set.reps, 0)),
        0
      )
    : 0;
  const activeDoneExercises = active
    ? active.exercises.filter(isExerciseFinished).length
    : 0;

  /** 「当天已完成 / 计划预设」：计划过千就换成 t，三格才放得下 */
  const pairOf = (done: number, plan: number) => {
    if (plan >= 1000) {
      const one = (value: number) => String(Math.round(value / 100) / 10);
      return { done: one(done), plan: one(plan), unit: 't' };
    }
    return { done: String(Math.round(done)), plan: String(Math.round(plan)), unit: 'kg' };
  };
  const activeWeightPair = pairOf(active ? sessionTotalWeight(active) : 0, activePlanWeight);
  const activeVolumePair = pairOf(active ? sessionVolume(active) : 0, activePlanVolume);

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
      redirectTo({ url: '/subpackages/misc/onboarding/index' });
    }
    // 只在首次挂载时判断一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 每日一条激励文案：同一天保持不变，隔天自动换 */
  const quote = motivationOfDay(dayjs().format('YYYY-MM-DD'));

  const hour = dayjs().hour();
  const greeting =
    hour < 6 ? '凌晨好' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  /** 首页只展示「今日 + 待完成」：今日置顶，其余按日期从近到远 */
  const pendingPlans = useMemo(
    () =>
      plans
        .filter((plan) => !isPlanFinished(sessions, plan.id))
        .sort(
          (a, b) =>
            Number(isDateToday(b.startDate)) - Number(isDateToday(a.startDate)) ||
            dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf() ||
            b.createdAt - a.createdAt
        ),
    [plans, sessions]
  );

  /** 今天已经练过的计划：跟随在待完成后面，让当天的训练有记录可回看 */
  const doneTodayPlans = useMemo(() => {
    const lastTimeByPlan = new Map<string, number>();
    sessions.forEach((session) => {
      if (!session.planId) return;
      if (!dayjs(session.startedAt).isSame(dayjs(), 'day')) return;
      const prev = lastTimeByPlan.get(session.planId) ?? 0;
      lastTimeByPlan.set(session.planId, Math.max(prev, dayjs(session.startedAt).valueOf()));
    });
    return plans
      .filter((plan) => lastTimeByPlan.has(plan.id))
      .sort((a, b) => (lastTimeByPlan.get(b.id) ?? 0) - (lastTimeByPlan.get(a.id) ?? 0));
  }, [plans, sessions]);

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

  /** 自由训练：不挑计划，直接开一场边练边记的训练 */
  const handleStart = () => {
    if (hasActive) {
      goSession();
      return;
    }
    startSession();
    goSession();
  };

  /** 进行中的计划点整卡直接回到训练，其他计划进详情 */
  const openPlan = (plan: Plan) => {
    if (active?.planId === plan.id) {
      goSession();
      return;
    }
    navigateTo({ url: `/pages/plan-detail/index?id=${plan.id}` });
  };

  const createPlan = () => {
    navigateTo({ url: '/pages/plan-edit/index' });
  };

  /** 计划卡：与计划页一致的四指标，常驻展示（首页不做折叠） */
  const renderPlanCard = (plan: Plan) => {
    const isToday = isDateToday(plan.startDate);
    /** 开始日期在今天之后：还没到练的日子 */
    const isFuture = dayjs(plan.startDate).startOf('day').isAfter(dayjs().startOf('day'));
    const running = active?.planId === plan.id;
    /** 今天已经练过这个计划：徽标和开始按钮都据此切换 */
    const doneToday = sessions.some(
      (session) => session.planId === plan.id && dayjs(session.startedAt).isSame(dayjs(), 'day')
    );
    /** 最近一次训练：sessions 已是时间倒序，首次命中即为最近一次 */
    const last = sessions.find((item) => item.planId === plan.id);
    /** 消耗：用户自己填过的优先，没填用预估值（前面加 ≈ 区分），没练过显示 — */
    const burnFilled = last?.calories && last.calories > 0 ? last.calories : null;
    const burnKcal = last
      ? burnFilled ?? (estimateCaloriesBurned(last, profile.weight ?? 0, profile.gender) || null)
      : null;
    const muscles = planMuscleTags(plan);
    /** 纯有氧计划：总重量 / 总容量没意义，换成总时长 / 总距离（排版位置不变） */
    const cardioOnly = isCardioPlan(plan.exercises);
    /** 总时长：练过按实际时长，没练过按计划目标时长；为 0 显示 — */
    const cardioMin = last ? sessionCardioMin(last) : planCardioTargetMin(plan.exercises);
    /** 总距离：只有练过且有距离数据（跑步机自动算 / 划船机手填）才显示 */
    const cardioKm = last ? sessionCardioDistanceKm(last) : null;
    /** 计划主肌群决定卡片背景器械图，没有对应图就保持纯色卡 */
    const bgImage = muscleImageOf(muscles[0]);

    return (
      <View
        key={plan.id}
        className={classnames(
          styles.planCard,
          isToday && styles.planCardToday,
          bgImage && styles.planCardWithImage
        )}
        onClick={() => openPlan(plan)}
      >
        {bgImage ? (
          <>
            <Image className={styles.cardImage} src={bgImage} mode="aspectFill" />
            <View className={styles.cardScrim} />
          </>
        ) : null}

        <View className={styles.planCardBody}>
          <View className={styles.planTop}>
            <Text className={styles.planDate}>
              {dayjs(plan.startDate).format('M月D日')}
              {isToday ? '（今日）' : isFuture ? '（未来）' : ''}
            </Text>
            {running ? (
              <Text className={styles.runningBadge}>进行中</Text>
            ) : doneToday ? (
              <Text className={styles.doneBadge}>已完成</Text>
            ) : (
              <Text className={styles.pendingBadge}>待完成</Text>
            )}
          </View>

          <View className={styles.planNameRow}>
            <Text className={styles.planCardName}>{displayPlanName(plan)}</Text>
          </View>

          <View className={styles.planCardTags}>
            {plan.exercises.length ? (
              muscles.map((muscle, index) => (
                <MuscleTag
                  key={muscle}
                  muscle={muscle}
                  solid={index === 0}
                  className={styles.planTag}
                />
              ))
            ) : (
              <Text className={styles.noMuscle}>还没有动作</Text>
            )}
          </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>
              {cardioOnly ? (
                cardioMin ? (
                  <>
                    {cardioMin}
                    <Text className={styles.statUnit}>min</Text>
                  </>
                ) : (
                  '—'
                )
              ) : (
                <>
                  {last ? formatVolume(sessionTotalWeight(last)) : '—'}
                  {last ? <Text className={styles.statUnit}>kg</Text> : null}
                </>
              )}
            </Text>
            <Text className={styles.statLabel}>{cardioOnly ? '总时长' : '总重量'}</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>
              {cardioOnly ? (
                cardioKm !== null ? (
                  <>
                    {cardioKm}
                    <Text className={styles.statUnit}>km</Text>
                  </>
                ) : (
                  '—'
                )
              ) : (
                <>
                  {last ? sessionTotalSets(last) : '—'}
                  {last ? <Text className={styles.statUnit}>组</Text> : null}
                </>
              )}
            </Text>
            <Text className={styles.statLabel}>{cardioOnly ? '总距离' : '总容量'}</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>
              {/* 与详情页保持一致：有过训练记录时按那次实际练的动作数 */}
              {last ? last.exercises.length : plan.exercises.length}
              <Text className={styles.statUnit}>个</Text>
            </Text>
            <Text className={styles.statLabel}>动作数</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>
              {burnKcal ? (
                <>
                  {burnFilled ? null : <Text className={styles.statEstimate}>≈</Text>}
                  {burnKcal}
                  <Text className={styles.statUnit}>kcal</Text>
                </>
              ) : (
                '—'
              )}
            </Text>
            <Text className={styles.statLabel}>消耗</Text>
          </View>
        </View>

        {isToday && plan.exercises.length && !doneToday ? (
          <View
            className={styles.planStartBtn}
            onClick={(event) => {
              event.stopPropagation();
              if (running) {
                goSession();
                return;
              }
              startPlanNow(plan);
            }}
          >
            <Text className={styles.planStartBtnText}>{running ? '继续训练' : '开始训练'}</Text>
          </View>
        ) : null}
        </View>
      </View>
    );
  };

  return (
    <View className={classnames(styles.page, themeClass)}>
      <View className={styles.header}>
        <Text className={styles.greeting}>
          {greeting}，{profile.nickname}
        </Text>
        <Text className={styles.date}>
          {dayjs().format('M月D日')} {weekdayLabel(Date.now())}
        </Text>
      </View>

      {active ? (
        <View
          className={styles.activeCard}
          onClick={() => {
            // 点整卡回训练页，顺带把暂停的计时恢复
            resumeActive();
            goSession();
          }}
        >
          <View className={styles.activeTop}>
            <Text className={styles.activeName} numberOfLines={1}>
              {active.name}
            </Text>
            <View
              className={classnames(
                styles.activePauseBtn,
                activePaused && styles.activePauseBtnActive
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (activePaused) {
                  resumeActive();
                  return;
                }
                pauseActive();
              }}
            >
              <Text className={styles.activePauseText}>{activePaused ? '继续' : '暂停'}</Text>
            </View>
          </View>
          <Text className={styles.activeMeta}>
            {formatClock(active.startedAt)} 开始 · 已用时 {formatTimer(sessionDurationSec(active))}
          </Text>
          <View className={styles.activeProgressTrack}>
            <View
              className={styles.activeProgressFill}
              style={{ width: `${activeProgress}%` }}
            />
          </View>
          <View className={styles.activeStats}>
            <View className={styles.activeStat}>
              <Text className={styles.activeStatLabel}>总重量</Text>
              <Text className={styles.activeStatValue}>
                {activeWeightPair.done}
                <Text className={styles.activeStatUnit}>
                  /{activeWeightPair.plan}
                  {activeWeightPair.unit}
                </Text>
              </Text>
            </View>
            <View className={styles.activeStat}>
              <Text className={styles.activeStatLabel}>总容量</Text>
              <Text className={classnames(styles.activeStatValue, styles.activeStatAccent)}>
                {activeVolumePair.done}
                <Text className={styles.activeStatUnit}>
                  /{activeVolumePair.plan}
                  {activeVolumePair.unit}
                </Text>
              </Text>
            </View>
            <View className={styles.activeStat}>
              <Text className={styles.activeStatLabel}>总动作数</Text>
              <Text className={styles.activeStatValue}>
                {activeDoneExercises}
                <Text className={styles.activeStatUnit}>/{active.exercises.length}</Text>
              </Text>
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
              {doneTodayPlans.length ? '没练爽，继续干' : '边练边记'}
            </Text>
          </View>
        </>
      )}

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>我的计划</Text>
        <View className={styles.createBtn} onClick={createPlan}>
          <Text className={styles.createBtnText}>+ 新建计划</Text>
        </View>
      </View>

      {pendingPlans.length || doneTodayPlans.length ? (
        <>
          {pendingPlans.map(renderPlanCard)}
          {doneTodayPlans.map(renderPlanCard)}
        </>
      ) : (
        <View className={classnames(styles.emptyWrap, styles.emptyCard)}>
          <Image className={styles.cardImage} src={EMPTY_BG} mode='aspectFill' />
          <View className={styles.emptyScrim} />
          <View className={styles.emptyBody}>
            <Text className={styles.emptyTitle}>制定一个计划，练得更有方向</Text>
            <Text className={styles.emptyDesc}>计划定好，进馆就干。</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default HomePage;
