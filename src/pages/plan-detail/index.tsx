import React, { useMemo, useState } from 'react';
import { View, Text, Image, Button, Textarea } from '@tarojs/components';
import { useRouter, useShareAppMessage } from '@tarojs/taro';
import dayjs from 'dayjs';
import { DEFAULT_CARDIO_MIN, getFeelOption } from '@/constants';
import { formatSetWeight, withAlpha } from '@/utils/format';
import { navigateBack, navigateTo, showModal, showToast, switchTab } from '@/utils/taro';
import { saveJSON, STORAGE_KEYS } from '@/utils/storage';
import classnames from 'classnames';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import { variantBadges } from '@/data/exerciseVariants';
import { decodePlan, encodePlan, shareExercisesOf, toLocalPlan } from '@/utils/planShare';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import ScrollLock from '@/components/ScrollLock';
import {
  feelMessage,
  feelScoreOutOf100,
  isPlanFinished,
  isTimedExercise,
  planMuscleTags,
  setLabels
} from '@/utils/workout';
import { MUSCLE_ART } from '@/assets/muscles/art';
import styles from './index.module.scss';

const PlanDetailPage: React.FC = () => {
  const router = useRouter();
  const planId = router.params?.id || '';
  /** 好友分享进来的计划：内容在链接里，不落库，用详情页原样展示 */
  const sharedRaw = router.params?.d;
  const shared = useMemo(() => (sharedRaw ? decodePlan(sharedRaw) : null), [sharedRaw]);
  const storePlan = usePlanStore((state) => state.plans.find((item) => item.id === planId));
  const addPlan = usePlanStore((state) => state.addPlan);
  const plan = useMemo(
    () =>
      shared
        ? {
            id: '__shared__',
            name: shared.name,
            startDate: shared.startDate,
            primaryMuscle: shared.primaryMuscle,
            secondaryMuscles: shared.secondaryMuscles,
            exercises: shared.exercises,
            createdAt: 0,
            updatedAt: 0
          }
        : storePlan,
    [shared, storePlan]
  );
  const [sharedSaved, setSharedSaved] = useState(false);
  const active = useSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);
  const discardActive = useSessionStore((state) => state.discardActive);
  const setSessionNote = useSessionStore((state) => state.setSessionNote);
  const profile = useProfileStore((state) => state.profile);
  /** 结束训练后跳进来：这场训练的系统评价 + 自我评价入口 */
  const justFinishedId = router.params?.justFinished;
  const [selfOpen, setSelfOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  /** 点最上方的部位 / 名称区域 → 直接进计划编辑页 */
  const openPlanEdit = () => {
    if (!plan) return;
    if (shared) {
      showToast({ title: '先保存到我的计划才能修改', icon: 'none' });
      return;
    }
    if (isPlanFinished(sessions, plan.id)) {
      showToast({ title: '计划已完成，不能再修改', icon: 'none' });
      return;
    }
    navigateTo({ url: `/pages/plan-edit/index?id=${plan.id}` });
  };

  /** 分享给好友：计划被打包进路径参数，对方点开即可在详情页查看并保存 */
  useShareAppMessage(() => {
    // 分享完成后回计划页，并让列表回到「展开顶部计划」
    saveJSON(STORAGE_KEYS.planResetExpand, true);
    setTimeout(() => switchTab({ url: '/pages/plans/index' }), 600);

    // 从分享链接点进来的，原样再转给下一个好友
    if (sharedRaw) {
      return {
        title: shared ? `分享训练计划：${shared.name}` : '来练记，一起记录每次训练',
        path: `/pages/plan-detail/index?d=${sharedRaw}`
      };
    }

    // 页面上显示什么就分享什么：
    // 已完成计划 → 打包这次实际练的动作和组；未开始 → 打包计划模板
    const record = plan ? sessions.find((item) => item.planId === plan.id) : undefined;
    const exercises = plan ? shareExercisesOf(plan, record) : [];
    return {
      title: plan ? `分享训练计划：${plan.name}` : '来练记，一起记录每次训练',
      path:
        plan && exercises.length
          ? `/pages/plan-detail/index?d=${encodePlan({ ...plan, exercises })}`
          : '/pages/plans/index'
    };
  });

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
    if (shared) {
      showToast({ title: '先保存到我的计划才能修改', icon: 'none' });
      return;
    }
    if (isPlanFinished(sessions, plan.id)) {
      showToast({ title: '计划已完成，不能再修改', icon: 'none' });
      return;
    }
    navigateTo({ url: `/pages/plan-edit/index?id=${plan.id}&focusKey=${key}` });
  };

  /** 分享进来的计划：存一份到自己名下，并直接进编辑页改 */
  const copyAndEditShared = () => {
    if (!shared || sharedSaved) return;
    const local = toLocalPlan(shared);
    addPlan(local);
    setSharedSaved(true);
    showToast({ title: '已保存到我的计划', icon: 'success' });
    setTimeout(() => {
      navigateTo({ url: `/pages/plan-edit/index?id=${local.id}` });
    }, 600);
  };

  /**
   * 复制计划：带着原计划内容进编辑页（开始日期默认今天），
   * 不直接落库：退出保存成草稿，点「保存计划」后才成为待完成计划。
   */
  const copyPlan = () => {
    if (!plan) return;
    // 复制并保存后直接回计划页，并回到「展开顶部计划」
    saveJSON(STORAGE_KEYS.planResetExpand, true);
    navigateTo({ url: `/pages/plan-edit/index?copyFrom=${plan.id}` });
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

  /** 该计划是否已完成过：一个计划只允许完成一次，完成后仅可查看 */
  const planFinished = isPlanFinished(sessions, plan.id);
  /** 该计划是不是当前正在进行的那场训练 */
  const planRunning = active?.planId === plan.id;

  /** 该计划最新的那条训练记录：用于展示训练心得评分 */
  const planRecord = sessions.find((item) => item.planId === plan.id);
  /**
   * 已完成：列表按这次实际练的动作展示。
   * 训练时删掉的动作不会出现在记录里，就不会再显示（计划模板本身不变，复制计划仍是完整的）。
   */
  const listExercises = planRecord ? planRecord.exercises : plan.exercises;
  const totalSets = listExercises.reduce((sum, item) => sum + item.sets.length, 0);
  const planFeelScore = planRecord ? feelScoreOutOf100(planRecord) : null;

  /** 刚结束的那场训练（只有「结束训练」跳进来的路径才有） */
  const justFinishedSession = justFinishedId
    ? sessions.find((item) => item.id === justFinishedId && item.planId === plan.id)
    : undefined;
  /** 要展示的系统评价分数 */
  const displayScore = justFinishedSession
    ? feelScoreOutOf100(justFinishedSession)
    : planFeelScore;
  /** 刚结束用弹层展示，页面底部这块只在平时查看时出现 */
  const showNoteBox = !justFinishedSession && profile.noteEnabled && planFeelScore !== null;
  /** 已经保存过的自我评价 */
  const savedNote = (justFinishedSession ?? planRecord)?.selfNote;

  /** 保存自我评价并回主页 */
  const saveNoteAndHome = () => {
    if (justFinishedSession) setSessionNote(justFinishedSession.id, noteDraft);
    switchTab({ url: '/pages/home/index' });
  };
  /** 每个动作在最近一次训练里的红绿灯（按动作 id 取） */
  const feelByExercise = new Map<string, number>();
  planRecord?.exercises.forEach((item) => {
    if (typeof item.feel === 'number') feelByExercise.set(item.exerciseId, item.feel);
  });

  /** 展示用部位：主训在最前，其后是次训 */
  const muscleTags = planMuscleTags(plan, 99);
  const primary = muscleTags[0];
  const secondary = muscleTags.slice(1);

  return (
    <View className={styles.page}>
      {/* 结果弹层打开时锁住页面滚动 */}
      <ScrollLock lock={!!justFinishedSession} />
      <View className={styles.head}>
        <View className={styles.headBody} onClick={openPlanEdit}>
          <View className={styles.headNameRow}>
            <Text className={styles.headName}>{plan.name}</Text>
            {plan.exercises.length ? (
              <Button
                className={styles.shareBtn}
                openType="share"
                onClick={(event) => event.stopPropagation()}
              >
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
            {listExercises.length} 个动作 · 共 {totalSets} 组
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
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>动作安排</Text>
      </View>

      {listExercises.length ? (
        <View className={styles.list}>
          {listExercises.map((item, index) => {
            const info = getExerciseById(item.exerciseId);
            const badges = variantBadges(info ? info.name : '已下架', item.variants);
            /** 组编号：普通组 1、2；递减组 2-1 递减 / 2-2 递减 */
            const setLabelsOfItem = setLabels(item.sets);
            const timed = isTimedExercise(item.exerciseId);
            const feel = profile.noteEnabled
              ? getFeelOption(feelByExercise.get(item.exerciseId))
              : undefined;
            return (
              <View
                key={item.key}
                className={classnames(
                  styles.item,
                  index !== listExercises.length - 1 && styles.itemBorder
                )}
                onClick={() => openExerciseEdit(item.key)}
              >
                <View className={styles.itemHead}>
                  <View className={styles.orderBadge}>
                    <Text className={styles.orderBadgeText}>{index + 1}</Text>
                  </View>
                  <View className={styles.itemMain}>
                    <View className={styles.itemNameRow}>
                      <Text className={styles.itemName}>
                        {info ? info.name : '已下架'}
                        {item.equipmentName ? `（${item.equipmentName}）` : ''}
                      </Text>
                    </View>
                    <View className={styles.itemMeta}>
                      {badges.length ? (
                        <View className={styles.itemTags}>
                          {badges.map((badge) => (
                            <Text
                              key={badge.label}
                              className={badge.locked ? styles.itemTagLocked : styles.itemTag}
                            >
                              {badge.label}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      <Text className={styles.itemMetaText}>组间歇 {item.restSeconds}s</Text>
                    </View>
                  </View>
                  <View className={styles.itemSide}>
                    {info ? (
                      <MuscleTag
                        {...exerciseMuscleTag(info, item.variants)}
                        className={styles.itemSideTag}
                      />
                    ) : null}
                    {feel ? (
                      <View
                        className={styles.itemFeel}
                        style={{ backgroundColor: withAlpha(feel.color, 0.16) }}
                      >
                        <View
                          className={styles.itemFeelDot}
                          style={{ backgroundColor: feel.color }}
                        />
                        <Text className={styles.itemFeelText} style={{ color: feel.color }}>
                          {feel.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 每组一个框，和「指定计划」页的组行保持一致的排布 */}
                <View className={styles.setList}>
                  {info?.muscle === 'cardio' ? (
                    <View className={styles.setRow}>
                      <Text className={styles.setIndex}>1</Text>
                      <View className={styles.setWeightField}>
                        <Text className={styles.setValue}>
                          {item.targetDurationMin ?? DEFAULT_CARDIO_MIN}
                        </Text>
                        <Text className={styles.setUnit}>分钟</Text>
                      </View>
                    </View>
                  ) : item.sets.length ? (
                    item.sets.map((set, setIndex) => (
                      <View
                        key={set.id}
                        className={classnames(styles.setRow, set.drop && styles.setRowDrop)}
                      >
                        <Text
                          className={classnames(
                            styles.setIndex,
                            set.drop && styles.setIndexDrop
                          )}
                        >
                          {setLabelsOfItem[setIndex]}
                        </Text>
                        <View className={styles.setWeightField}>
                          <Text className={styles.setValue}>{formatSetWeight(set)}</Text>
                          <Text className={styles.setUnit}>kg</Text>
                        </View>
                        <Text className={styles.setTimes}>×</Text>
                        <View className={styles.setRepsField}>
                          <Text className={styles.setValue}>{set.reps || 0}</Text>
                          {timed ? <Text className={styles.setUnit}>秒</Text> : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text className={styles.setEmpty}>未设置组</Text>
                  )}
                </View>
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

      {/* 训练心得：平时查看时展示在页面最下方（刚结束走弹层） */}
      {showNoteBox ? (
        <>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>训练心得</Text>
          </View>
          <View className={styles.noteBoxActive}>
            {displayScore !== null ? (
              <View className={styles.noteScoreRow}>
                <Text className={styles.noteScore}>{displayScore}</Text>
                <Text className={styles.noteScoreUnit}>/ 100 分</Text>
              </View>
            ) : null}
            <Text className={styles.noteMessage}>
              {displayScore !== null
                ? feelMessage(displayScore)
                : '训练完成，干得漂亮！保持这个节奏，继续加油 💪'}
            </Text>
            {savedNote ? (
              <>
                <Text className={classnames(styles.resultTitle, styles.selfTitle)}>
                  自我评价
                </Text>
                <Text className={styles.noteSelfText}>{savedNote}</Text>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      {justFinishedSession ? null : (
        <View className={styles.bottomBar}>
          {shared ? (
            <>
              <View
                className={classnames(styles.bottomBtn, styles.bottomBtnGhost)}
                onClick={copyAndEditShared}
              >
                <Text className={styles.bottomBtnTextGhost}>复制并编辑计划</Text>
              </View>
              <View
                className={classnames(styles.bottomBtn, styles.bottomBtnPrimary)}
                onClick={() => switchTab({ url: '/pages/home/index' })}
              >
                <Text className={styles.bottomBtnTextPrimary}>回到主页</Text>
              </View>
            </>
          ) : (
            <>
              {listExercises.length ? (
                <View
                  className={classnames(styles.bottomBtn, styles.bottomBtnGhost)}
                  onClick={copyPlan}
                >
                  <Text className={styles.bottomBtnTextGhost}>复制计划</Text>
                </View>
              ) : null}
              {planFinished ? (
                <Button
                  className={classnames(
                    styles.bottomBtn,
                    styles.bottomBtnPrimary,
                    styles.bottomShareBtn
                  )}
                  openType="share"
                >
                  <Text className={styles.bottomBtnTextPrimary}>分享计划</Text>
                </Button>
              ) : planRunning ? (
                <View
                  className={classnames(styles.bottomBtn, styles.bottomBtnPrimary)}
                  onClick={() => navigateTo({ url: '/pages/session/index' })}
                >
                  <Text className={styles.bottomBtnTextPrimary}>继续训练</Text>
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
            </>
          )}
        </View>
      )}

      {/* 结束训练后的系统评价弹层：两个按钮贴着框体底部 */}
      {justFinishedSession ? (
        <View className={styles.resultMask}>
          <View className={styles.resultCard}>
            <Text className={styles.resultTitle}>训练心得</Text>
            {displayScore !== null ? (
              <View className={styles.noteScoreRow}>
                <Text className={styles.noteScore}>{displayScore}</Text>
                <Text className={styles.noteScoreUnit}>/ 100 分</Text>
              </View>
            ) : null}
            <Text className={styles.noteMessage}>
              {displayScore !== null
                ? feelMessage(displayScore)
                : '训练完成，干得漂亮！保持这个节奏，继续加油 💪'}
            </Text>

            {selfOpen ? (
              <>
                <Text className={classnames(styles.resultTitle, styles.selfTitle)}>
                  自我评价
                </Text>
                <Textarea
                  className={styles.noteInput}
                  value={noteDraft}
                  maxlength={200}
                  placeholder="写点今天的感受，例如状态、哪里没做好…"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) => setNoteDraft(event.detail.value)}
                />
                <View className={styles.notePrimaryBtn} onClick={saveNoteAndHome}>
                  <Text className={styles.notePrimaryBtnText}>保存并回到主页</Text>
                </View>
              </>
            ) : (
              <View className={styles.noteActions}>
                <View
                  className={styles.noteGhostBtn}
                  onClick={() => {
                    setNoteDraft(justFinishedSession.selfNote ?? '');
                    setSelfOpen(true);
                  }}
                >
                  <Text className={styles.noteGhostBtnText}>自我评价</Text>
                </View>
                <View
                  className={styles.notePrimaryBtn}
                  onClick={() => switchTab({ url: '/pages/home/index' })}
                >
                  <Text className={styles.notePrimaryBtnText}>回到主页</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default PlanDetailPage;
