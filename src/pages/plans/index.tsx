import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import { showShareMenu, useDidShow, useShareAppMessage } from '@tarojs/taro';
import { navigateTo, showActionSheet, showModal, showToast } from '@/utils/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { MuscleGroup, Plan, Session } from '@/types';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import {
  isPlanFinished,
  planMuscleTags,
  sessionTotalSets,
  sessionTotalWeight
} from '@/utils/workout';
import { dayLabel, formatVolume, isDateToday, weekdayLabel } from '@/utils/format';
import { clearPlanDraft, loadPlanDraft, type PlanDraft } from '@/utils/planDraft';
import { loadJSON, removeKey, STORAGE_KEYS } from '@/utils/storage';
import { draftToPlan, encodePlan, shareExercisesOf } from '@/utils/planShare';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import styles from './index.module.scss';

/** 列表展示范围：最近 7 天 */
const RECENT_DAYS = 7;

const PlansPage: React.FC = () => {
  const plans = usePlanStore((state) => state.plans);
  const removePlan = usePlanStore((state) => state.removePlan);
  const sessions = useSessionStore((state) => state.sessions);
  const active = useSessionStore((state) => state.active);
  const startSession = useSessionStore((state) => state.startSession);
  const discardActive = useSessionStore((state) => state.discardActive);
  const deleteSessionsByPlan = useSessionStore((state) => state.deleteSessionsByPlan);

  /** 新建计划没写完留下的草稿，单独一张卡 */
  const [draft, setDraft] = useState<PlanDraft | null>(() => loadPlanDraft());
  /** 当前展开的卡片：默认展开置顶那一个，点其他卡片时手风琴切换 */
  const [openKey, setOpenKey] = useState<string | null>(null);
  // 从制定计划页返回（或保存成正式计划）后要重新读一次
  useDidShow(() => {
    setDraft(loadPlanDraft());
    // 普通「返回」保留原来的展开项；只有复制 / 分享后主动回来才重置到顶部
    if (loadJSON<boolean>(STORAGE_KEYS.planResetExpand, false)) {
      setOpenKey(null);
      removeKey(STORAGE_KEYS.planResetExpand);
    }
    // 确保右上角「···」菜单里有「转发」入口
    showShareMenu({ menus: ['shareAppMessage'] });
  });

  /** 草稿卡上的「分享」按钮被按下（右上角 ··· 转发不属于分享草稿） */
  const shareDraftRef = useRef(false);
  /** 正式计划卡上的「分享」按钮被按下：记录要分享哪份计划 */
  const sharePlanRef = useRef<Plan | null>(null);

  // 草稿也支持分享：对方点开即可保存成自己的计划
  useShareAppMessage(() => {
    const sharedPlan = sharePlanRef.current;
    if (sharedPlan) {
      sharePlanRef.current = null;
      // 页面上显示什么就分享什么：已练完的用实际记录，没练的用计划模板
      const exercises = shareExercisesOf(sharedPlan, lastSessionByPlan.get(sharedPlan.id));
      return {
        title: `分享训练计划：${sharedPlan.name}`,
        path: `/pages/plan-share/index?d=${encodePlan({ ...sharedPlan, exercises })}`
      };
    }
    if (shareDraftRef.current && draft && draft.exercises.length) {
      shareDraftRef.current = false;
      return {
        title: `分享训练计划：${draft.name.trim() || '未命名计划'}`,
        path: `/pages/plan-share/index?d=${encodePlan(draftToPlan(draft))}`
      };
    }
    return { title: '来练记，一起记录每次训练', path: '/pages/plans/index' };
  });

  const todayKey = dayjs().format('YYYY-MM-DD');
  const fromKey = dayjs()
    .subtract(RECENT_DAYS - 1, 'day')
    .format('YYYY-MM-DD');

  /** 近 7 天内的计划，按开始日期倒序（最近的在最上） */
  const recentPlans = useMemo(
    () =>
      plans
        .filter((plan) => {
          if (!plan.startDate) return false;
          const key = dayjs(plan.startDate).format('YYYY-MM-DD');
          return key >= fromKey && key <= todayKey;
        })
        .sort(
          (a, b) =>
            dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf() ||
            b.createdAt - a.createdAt
        ),
    [plans, fromKey, todayKey]
  );

  /** 每个计划最近一次训练（sessions 已是时间倒序，取首次命中即为最近一次） */
  const lastSessionByPlan = useMemo(() => {
    const map = new Map<string, Session>();
    sessions.forEach((session) => {
      if (session.planId && !map.has(session.planId)) map.set(session.planId, session);
    });
    return map;
  }, [sessions]);

  const openEdit = (planId?: string) => {
    const url = planId ? `/pages/plan-edit/index?id=${planId}` : '/pages/plan-edit/index';
    navigateTo({ url });
  };

  const openDetail = (planId: string) => {
    navigateTo({ url: `/pages/plan-detail/index?id=${planId}` });
  };

  /** 丢弃没写完的草稿 */
  const handleDraftDelete = () => {
    showModal({
      title: '丢弃草稿',
      content: '确定丢弃这份没写完的草稿吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (res.confirm) {
          clearPlanDraft();
          setDraft(null);
        }
      }
    });
  };

  const startPlan = (plan: Plan) => {
    if (isPlanFinished(sessions, plan.id)) {
      showToast({ title: '该计划已完成，只能查看记录', icon: 'none' });
      return;
    }
    const go = () => {
      startSession({ plan });
      navigateTo({ url: '/pages/session/index' });
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

  const handleMore = (plan: Plan) => {
    const finished = isPlanFinished(sessions, plan.id);
    const running = active?.planId === plan.id;
    // 已完成的计划只能查看；正在训练中的给「继续训练」，避免再弹冲突提示
    const itemList = finished
      ? ['删除计划']
      : running
        ? ['继续训练', '编辑计划', '删除计划']
        : ['开始训练', '编辑计划', '删除计划'];
    showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex];
        if (action === '继续训练') {
          navigateTo({ url: '/pages/session/index' });
          return;
        }
        if (action === '开始训练') {
          if (!plan.exercises.length) {
            showToast({ title: '请先为计划添加动作', icon: 'none' });
            return;
          }
          startPlan(plan);
          return;
        }
        if (action === '编辑计划') {
          openEdit(plan.id);
          return;
        }
        const inProgress = active?.planId === plan.id;
        const recordCount = sessions.filter((session) => session.planId === plan.id).length;
        // 删计划 = 彻底抹掉：这条计划的训练记录也一起删
        const extra: string[] = [];
        if (recordCount) extra.push(`该计划的 ${recordCount} 条训练记录`);
        if (inProgress) extra.push('正在进行的训练');
        showModal({
          title: '删除计划',
          content: extra.length
            ? `确定删除「${plan.name}」吗？${extra.join('和')}也会一起删除，且不可恢复。`
            : `确定删除「${plan.name}」吗？`,
          confirmColor: '#f8736a',
          success: (modalRes) => {
            if (modalRes.confirm) {
              removePlan(plan.id);
              deleteSessionsByPlan(plan.id);
              // 计划删了就别再让这次训练挂在上方，否则首页会一直显示「进行中」
              if (inProgress) discardActive();
              showToast({ title: '已删除', icon: 'none' });
            }
          }
        });
      }
    });
  };

  /** 草稿卡按正式计划卡的样式展示，只多一个「草稿」标记 */
  const draftDate = draft ? dayjs(draft.startDate || undefined) : null;
  const draftMuscles: MuscleGroup[] = draft
    ? [draft.primaryMuscle, ...draft.secondaryMuscles].filter(
        (item): item is MuscleGroup => Boolean(item)
      )
    : [];

  /** 已完成的计划折叠展示（仍只统计近 7 天） */
  const finishedPlans = recentPlans.filter((plan) => isPlanFinished(sessions, plan.id));
  const pendingPlans = recentPlans.filter((plan) => !isPlanFinished(sessions, plan.id));

  /** 列表顺序：待完成 → 草稿 → 已完成；默认展开置顶那一个 */
  const DRAFT_KEY = '__draft__';
  const orderedKeys = [
    ...pendingPlans.map((plan) => plan.id),
    ...(draft ? [DRAFT_KEY] : []),
    ...finishedPlans.map((plan) => plan.id)
  ];
  const activeOpenKey =
    openKey && orderedKeys.includes(openKey) ? openKey : orderedKeys[0] ?? null;

  /** 待完成 / 已完成共用的计划卡片渲染 */
  const renderPlanCard = (plan: Plan) => {
    const isToday = isDateToday(plan.startDate);
    const finished = isPlanFinished(sessions, plan.id);
    const running = active?.planId === plan.id;
    const ts = dayjs(plan.startDate).valueOf();
    const last = lastSessionByPlan.get(plan.id);
    const muscles = planMuscleTags(plan);
    /** 手风琴：只有当前展开的一张卡显示详情 */
    const expanded = activeOpenKey === plan.id;
    return (
      <View
        key={plan.id}
        className={classnames(styles.card, isToday && styles.cardToday)}
        onClick={() => {
          if (!expanded) {
            setOpenKey(plan.id);
            return;
          }
          openDetail(plan.id);
        }}
      >
        <View className={styles.cardTop}>
          <View className={styles.dateWrap}>
            <Text className={styles.dateMain}>{dayjs(plan.startDate).format('M月D日')}</Text>
            <Text className={styles.dateSub}>
              {dayLabel(ts)} {weekdayLabel(ts)}
            </Text>
          </View>
          <View className={styles.cardTopActions}>
            {plan.exercises.length ? (
              <Button
                className={styles.draftShareBtn}
                openType="share"
                onClick={(event) => event.stopPropagation()}
                onTouchStart={() => {
                  sharePlanRef.current = plan;
                }}
              >
                <Text className={styles.draftShareText}>分享</Text>
              </Button>
            ) : null}
            <View
              className={styles.moreBtn}
              onClick={(event) => {
                event.stopPropagation();
                handleMore(plan);
              }}
            >
              <Text className={styles.moreText}>···</Text>
            </View>
          </View>
        </View>

        <View className={styles.nameRow}>
          <Text className={styles.cardName}>{plan.name}</Text>
          {finished ? (
            <Text className={styles.doneBadge}>已完成</Text>
          ) : running ? (
            <Text className={styles.runningBadge}>进行中</Text>
          ) : (
            <Text className={styles.pendingBadge}>待完成</Text>
          )}
          {isToday ? <Text className={styles.todayBadge}>今日</Text> : null}
        </View>

        {expanded ? (
          <>
            <View className={styles.tags}>
              {plan.exercises.length ? (
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

            <View className={styles.statsRow}>
              <View className={styles.statItem}>
                <Text className={styles.statValue}>
                  {last ? formatVolume(sessionTotalWeight(last)) : '—'}
                  {last ? <Text className={styles.statUnit}>kg</Text> : null}
                </Text>
                <Text className={styles.statLabel}>总重量</Text>
              </View>
              <View className={styles.statDivider} />
              <View className={styles.statItem}>
                <Text className={styles.statValue}>
                  {last ? sessionTotalSets(last) : '—'}
                  {last ? <Text className={styles.statUnit}>组</Text> : null}
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
          </>
        ) : null}
      </View>
    );
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View>
          <Text className={styles.title}>训练计划</Text>
          <Text className={styles.subtitle}>
            近 {RECENT_DAYS} 天 · {recentPlans.length} 个计划
          </Text>
        </View>
        <View className={styles.createBtn} onClick={() => openEdit()}>
          <Text className={styles.createBtnText}>+ 新建计划</Text>
        </View>
      </View>

      {recentPlans.length || draft ? (
        <>
          {pendingPlans.map(renderPlanCard)}

          {/* 草稿：排在待完成之后、已完成之前 */}
          {draft && draftDate ? (
            <View
              className={styles.card}
              onClick={() => {
                if (activeOpenKey !== DRAFT_KEY) {
                  setOpenKey(DRAFT_KEY);
                  return;
                }
                openEdit();
              }}
            >
              <View className={styles.cardTop}>
                <View className={styles.dateWrap}>
                  <Text className={styles.dateMain}>{draftDate.format('M月D日')}</Text>
                  <Text className={styles.dateSub}>
                    {dayLabel(draftDate.valueOf())} {weekdayLabel(draftDate.valueOf())}
                  </Text>
                </View>
                <View className={styles.cardTopActions}>
                  {draft.exercises.length ? (
                    <Button
                      className={styles.draftShareBtn}
                      openType="share"
                      onClick={(event) => event.stopPropagation()}
                      onTouchStart={() => {
                        shareDraftRef.current = true;
                      }}
                    >
                      <Text className={styles.draftShareText}>分享</Text>
                    </Button>
                  ) : null}
                  <View
                    className={styles.moreBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDraftDelete();
                    }}
                  >
                    <Text className={styles.moreText}>···</Text>
                  </View>
                </View>
              </View>

              <View className={styles.nameRow}>
                <Text className={styles.cardName}>{draft.name.trim() || '未命名计划'}</Text>
                <Text className={styles.draftBadge}>草稿</Text>
              </View>

              {activeOpenKey === DRAFT_KEY ? (
                <>
                  <View className={styles.tags}>
                    {draftMuscles.length ? (
                      draftMuscles.map((muscle, index) => (
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

                  <View className={styles.statsRow}>
                    <View className={styles.statItem}>
                      <Text className={styles.statValue}>—</Text>
                      <Text className={styles.statLabel}>总重量</Text>
                    </View>
                    <View className={styles.statDivider} />
                    <View className={styles.statItem}>
                      <Text className={styles.statValue}>—</Text>
                      <Text className={styles.statLabel}>总容量</Text>
                    </View>
                    <View className={styles.statDivider} />
                    <View className={styles.statItem}>
                      <Text className={styles.statValue}>
                        {draft.exercises.length}
                        <Text className={styles.statUnit}>个</Text>
                      </Text>
                      <Text className={styles.statLabel}>动作数</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {finishedPlans.length ? (
            <>
              <View className={styles.finishedHead}>
                <Text className={styles.finishedTitle}>已完成 · {finishedPlans.length} 个</Text>
              </View>
              {finishedPlans.map(renderPlanCard)}
            </>
          ) : null}
        </>
      ) : (
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="📋"
            title={`近 ${RECENT_DAYS} 天还没有训练计划`}
            desc="创建计划可以固定每次训练的动作和组数，训练时一键开始"
            actionText="创建计划"
            onAction={() => openEdit()}
          />
        </View>
      )}
    </View>
  );
};

export default PlansPage;
