import React, { useState } from 'react';
import { View, Text, Input, Picker, Image, Button } from '@tarojs/components';
import { useRouter, useShareAppMessage } from '@tarojs/taro';
import dayjs from 'dayjs';
import type { PlanExercise } from '@/types';
import { DEFAULT_CARDIO_MIN, getFeelOption } from '@/constants';
import { formatSetWeight } from '@/utils/format';
import { navigateBack, navigateTo, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import { variantBadges } from '@/data/exerciseVariants';
import { encodePlan } from '@/utils/planShare';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import { feelMessage, isPlanFinished, isTimedExercise, planMuscleTags } from '@/utils/workout';
import { MUSCLE_ART } from '@/assets/muscles/art';
import styles from './index.module.scss';

/**
 * 动作的组配置摘要：
 * 各组相同时显示「20kg · 3 组 × 10 次」，递减/混合组显示「3 组 · 20/15/12.5kg」；
 * 计时类动作（平板支撑）把「次」换成「秒」。
 */
function planSetsSummary(item: PlanExercise, timed = false): string {
  const unit = timed ? '秒' : '次';
  const sets = item.sets;
  if (!sets.length) return '未设置组';
  const first = sets[0];
  const uniform = sets.every((set) => set.weight === first.weight && set.reps === first.reps);
  if (uniform) {
    return `${formatSetWeight(first)}kg · ${sets.length} 组 × ${first.reps} ${unit}`;
  }
  return `${sets.length} 组 · ${sets.map((set) => formatSetWeight(set)).join('/')}kg`;
}

const PlanDetailPage: React.FC = () => {
  const router = useRouter();
  const planId = router.params?.id || '';
  const plan = usePlanStore((state) => state.plans.find((item) => item.id === planId));
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const duplicatePlan = usePlanStore((state) => state.duplicatePlan);
  const active = useSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);
  const discardActive = useSessionStore((state) => state.discardActive);
  const profile = useProfileStore((state) => state.profile);

  /** 就地编辑：直接修改训练部位（计划名称）与开始日期 */
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDate, setDraftDate] = useState('');

  const startEdit = () => {
    if (!plan) return;
    setDraftName(plan.name);
    setDraftDate(plan.startDate || dayjs().format('YYYY-MM-DD'));
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  /** 分享给好友：计划被打包进路径参数，对方点开即可一键保存 */
  useShareAppMessage(() => ({
    title: plan ? `分享训练计划：${plan.name}` : '来练记，一起记录每次训练',
    path:
      plan && plan.exercises.length
        ? `/pages/plan-share/index?d=${encodePlan(plan)}`
        : '/pages/plans/index'
  }));

  const saveEdit = () => {
    if (!plan) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }
    updatePlan({ ...plan, name: trimmed, startDate: draftDate });
    setEditing(false);
    showToast({ title: '已保存', icon: 'success' });
  };

  const startPlan = () => {
    if (!plan) return;
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

  /** 点动作行 → 进计划编辑页并定位到该动作（点击就是要改计划） */
  const openExerciseEdit = (key: string) => {
    if (!plan) return;
    if (isPlanFinished(sessions, plan.id)) {
      showToast({ title: '计划已完成，不能再修改', icon: 'none' });
      return;
    }
    navigateTo({ url: `/pages/plan-edit/index?id=${plan.id}&focusKey=${key}` });
  };

  /**
   * 复制计划：生成一份内容一模一样的副本，开始日期改成今天，
   * 原计划不受影响；复制出来的照样能编辑，改完保存即可。
   */
  const copyPlan = () => {
    if (!plan) return;
    showModal({
      title: '复制计划',
      content: `将生成一份和「${plan.name}」一样的副本，开始日期为今天，原计划不受影响。`,
      confirmText: '复制',
      success: (res) => {
        if (!res.confirm) return;
        const copy = duplicatePlan(plan.id);
        if (!copy) {
          showToast({ title: '复制失败，请重试', icon: 'none' });
          return;
        }
        showToast({ title: '已复制，改完保存即可', icon: 'success' });
        setTimeout(() => navigateTo({ url: `/pages/plan-edit/index?id=${copy.id}` }), 400);
      }
    });
  };

  if (!plan) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🔍"
            title="计划不存在"
            desc="该计划可能已被删除"
            actionText="返回"
            onAction={() => navigateBack()}
          />
        </View>
      </View>
    );
  }

  const totalSets = plan.exercises.reduce((sum, item) => sum + item.sets.length, 0);

  /** 该计划是否已完成过：一个计划只允许完成一次，完成后仅可查看 */
  const planFinished = isPlanFinished(sessions, plan.id);

  /** 该计划最新的那条训练记录：用于展示训练心得评分 */
  const planRecord = sessions.find((item) => item.planId === plan.id);
  const planFeelScore = planRecord?.feelScore ?? null;

  /** 展示用部位：主训在最前，其后是次训 */
  const muscleTags = planMuscleTags(plan, 99);
  const primary = muscleTags[0];
  const secondary = muscleTags.slice(1);

  return (
    <View className={styles.page}>
      <View className={styles.head}>
        {editing ? (
          <View className={styles.headEditWrap}>
            <View className={styles.headRow}>
              <Text className={styles.headEditLabel}>计划名称</Text>
              <View className={styles.editBtn} onClick={cancelEdit}>
                <Text className={styles.editIcon}>✕</Text>
              </View>
            </View>

            <Input
              className={styles.headNameInput}
              value={draftName}
              maxlength={16}
              placeholder="随便起，例如：背容量组+二头"
              placeholderStyle="color:#6f6f7d"
              onInput={(event) => setDraftName(event.detail.value)}
            />

            <Picker
              mode="date"
              value={draftDate}
              start="2020-01-01"
              end="2035-12-31"
              onChange={(event) => setDraftDate(event.detail.value)}
            >
              <View className={styles.headDateEdit}>
                <Text className={styles.headDateEditLabel}>开始日期</Text>
                <View className={styles.headDateEditValue}>
                  <Text className={styles.headDateEditText}>
                    {dayjs(draftDate).format('YYYY年M月D日')}
                  </Text>
                  <Text className={styles.headDateEditArrow}>›</Text>
                </View>
              </View>
            </Picker>

            <View className={styles.headActions}>
              <View
                className={classnames(styles.headAction, styles.headActionGhost)}
                onClick={cancelEdit}
              >
                <Text className={styles.headActionGhostText}>取消</Text>
              </View>
              <View
                className={classnames(styles.headAction, styles.headActionPrimary)}
                onClick={saveEdit}
              >
                <Text className={styles.headActionPrimaryText}>保存</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View className={styles.headBody}>
              <View className={styles.headNameRow}>
                <Text className={styles.headName}>{plan.name}</Text>
                {planFinished ? null : (
                  <View className={styles.editBtn} onClick={startEdit}>
                    <Text className={styles.editIcon}>✎</Text>
                  </View>
                )}
                {plan.exercises.length ? (
                  <Button className={styles.shareBtn} openType="share">
                    <Text className={styles.shareBtnText}>分享</Text>
                  </Button>
                ) : null}
              </View>
              <View className={styles.headTags}>
                <MuscleTag muscle={primary} solid />
                {secondary.map((muscle) => (
                  <MuscleTag key={muscle} muscle={muscle} className={styles.headTag} />
                ))}
              </View>
              <Text className={styles.headMeta}>
                {plan.exercises.length} 个动作 · 共 {totalSets} 组
              </Text>
              {plan.startDate ? (
                <Text className={styles.headDate}>
                  开始于 {dayjs(plan.startDate).format('YYYY年M月D日')}
                </Text>
              ) : null}
            </View>
            <View className={styles.headSide}>
              <Image className={styles.headArt} src={MUSCLE_ART[primary]} mode="aspectFit" />
            </View>
          </>
        )}
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>动作安排</Text>
      </View>

      {plan.exercises.length ? (
        <View className={styles.list}>
          {plan.exercises.map((item, index) => {
            const info = getExerciseById(item.exerciseId);
            const badges = variantBadges(info ? info.name : '已下架', item.variants);
            return (
              <View
                key={item.key}
                className={classnames(
                  styles.item,
                  index !== plan.exercises.length - 1 && styles.itemBorder
                )}
                onClick={() => openExerciseEdit(item.key)}
              >
                <View className={styles.orderBadge}>
                  <Text className={styles.orderBadgeText}>{index + 1}</Text>
                </View>
                <View className={styles.itemMain}>
                  <View className={styles.itemNameRow}>
                    <Text className={styles.itemName}>{info ? info.name : '已下架'}</Text>
                    {info ? (
                      <MuscleTag
                        {...exerciseMuscleTag(info, item.variants)}
                        className={styles.itemNameTag}
                      />
                    ) : null}
                  </View>
                  <View className={styles.itemMeta}>
                    {badges.map((badge, badgeIndex) => (
                      <Text
                        key={badge.label}
                        className={badge.locked ? styles.itemTargetLocked : styles.itemTarget}
                      >
                        {badgeIndex > 0 ? ` · ${badge.label}` : badge.label}
                      </Text>
                    ))}
                    <Text className={styles.itemMetaText}>
                      {info?.muscle === 'cardio'
                        ? `时长 ${item.targetDurationMin ?? DEFAULT_CARDIO_MIN} 分钟`
                        : `${planSetsSummary(item, isTimedExercise(item.exerciseId))} · 组间歇 ${item.restSeconds}s`}
                    </Text>
                  </View>
                </View>
                {planFinished ? null : <Text className={styles.itemEditIcon}>✎</Text>}
              </View>
            );
          })}
        </View>
      ) : (
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="📋"
            title="该计划还没有动作"
            desc="先去编辑计划添加动作吧"
            actionText="编辑计划"
            onAction={() => navigateTo({ url: `/pages/plan-edit/index?id=${plan.id}` })}
          />
        </View>
      )}

      {/* 训练心得：训练中按动作选择感受，结束后才有评分；没练过就不显示这块 */}
      {profile.noteEnabled && planFeelScore !== null ? (
        <>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>训练心得</Text>
          </View>
          <View className={styles.noteBoxActive}>
            <View className={styles.noteScoreRow}>
              <Text className={styles.noteScore}>{planFeelScore}</Text>
              <Text className={styles.noteScoreUnit}>/ 10 分</Text>
            </View>
            <Text className={styles.noteMessage}>{feelMessage(planFeelScore)}</Text>
            {planRecord ? (
              <View className={styles.noteFeelList}>
                {planRecord.exercises.map((item) => {
                  const feel = getFeelOption(item.feel);
                  if (!feel) return null;
                  const info = getExerciseById(item.exerciseId);
                  return (
                    <View key={item.key} className={styles.noteFeelItem}>
                      <Text className={styles.noteFeelName}>
                        {info ? info.name : '已下架'}
                      </Text>
                      <Text className={styles.noteFeelValue}>
                        {feel.emoji} {feel.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <View className={styles.bottomBar}>
        {plan.exercises.length ? (
          <View
            className={classnames(styles.bottomBtn, styles.bottomBtnGhost)}
            onClick={copyPlan}
          >
            <Text className={styles.bottomBtnTextGhost}>复制计划</Text>
          </View>
        ) : null}
        {planFinished ? (
          <View
            className={classnames(styles.bottomBtn, styles.bottomBtnGhost)}
            onClick={() => {
              const record = sessions.find((item) => item.planId === plan.id);
              if (record) {
                navigateTo({ url: `/pages/record-detail/index?id=${record.id}` });
                return;
              }
              showToast({ title: '还没有该计划的训练记录', icon: 'none' });
            }}
          >
            <Text className={styles.bottomBtnTextGhost}>查看已完成计划</Text>
          </View>
        ) : (
          <View
            className={classnames(styles.bottomBtn, styles.bottomBtnPrimary)}
            onClick={() => {
              if (!plan.exercises.length) {
                showToast({ title: '请先为计划添加动作', icon: 'none' });
                return;
              }
              startPlan();
            }}
          >
            <Text className={styles.bottomBtnTextPrimary}>开始训练</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default PlanDetailPage;
