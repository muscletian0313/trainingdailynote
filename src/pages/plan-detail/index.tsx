import React, { useState } from 'react';
import { View, Text, Input, Picker, Image } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import { DEFAULT_CARDIO_MIN, getFeelOption } from '@/constants';
import { formatWeight } from '@/utils/format';
import { navigateBack, navigateTo, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import { getExerciseById } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import { feelMessage, isBodyweight, isPlanFinished, planMuscleTags } from '@/utils/workout';
import { MUSCLE_ART } from '@/assets/muscles/art';
import styles from './index.module.scss';

const PlanDetailPage: React.FC = () => {
  const router = useRouter();
  const planId = router.params?.id || '';
  const plan = usePlanStore((state) => state.plans.find((item) => item.id === planId));
  const updatePlan = usePlanStore((state) => state.updatePlan);
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

  const totalSets = plan.exercises.reduce((sum, item) => sum + item.targetSets, 0);

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
                  <Text className={styles.itemName}>{info ? info.name : '未知动作'}</Text>
                  <View className={styles.itemMeta}>
                    {info ? <MuscleTag muscle={info.muscle} /> : null}
                    <Text className={styles.itemMetaText}>
                      {info?.muscle === 'cardio'
                        ? `时长 ${item.targetDurationMin ?? DEFAULT_CARDIO_MIN} 分钟`
                        : `${
                            isBodyweight(item.exerciseId)
                              ? '自重'
                              : `${formatWeight(item.targetWeight)}kg`
                          } · ${item.targetSets} 组 × ${item.targetReps} 次 · 组间歇 ${
                            item.restSeconds
                          }s`}
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

      {/* 训练心得：训练中按动作选择感受，结束后汇总评分；可在「我的 → 训练偏好」关闭 */}
      {profile.noteEnabled ? (
        <>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>训练心得</Text>
          </View>
          {planFeelScore !== null ? (
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
                          {info ? info.name : '未知动作'}
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
          ) : (
            <View className={styles.noteBox}>
              <Text className={styles.notePlaceholder}>
                训练时每做完一个动作选一下感受，结束后这里会显示本次训练心得评分
              </Text>
            </View>
          )}
        </>
      ) : null}

      <View className={styles.bottomBar}>
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
