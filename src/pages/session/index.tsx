import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import { pageScrollTo } from '@tarojs/taro';
import dayjs from 'dayjs';
import {
  navigateBack,
  playSound,
  redirectTo,
  showActionSheet,
  showModal,
  showToast,
  switchTab,
  vibrate
} from '@/utils/taro';
import classnames from 'classnames';
import {
  CARDIO_EXTRA_FIELDS,
  FEEL_OPTIONS,
  REST_OPTIONS,
  cardioHasDistance,
  getFeelOption,
  restSoundSrc,
  supportsEquipmentName
} from '@/constants';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import type { ExerciseVariants, SessionExercise } from '@/types';
import SetRow from '@/components/SetRow';
import ExercisePicker, { type PickedExercise } from '@/components/ExercisePicker';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  hasCardio,
  isAssistExercise,
  isExerciseFinished,
  isSessionPaused,
  isTimedExercise,
  recentPerformancesByVariants,
  sessionCardioMin,
  sessionDoneSets,
  sessionDurationSec,
  sessionRating,
  sessionTotalSets,
  sessionVolume,
  setLabels,
  planFromSession
} from '@/utils/workout';
import { barbellBarWeight, hasAddedLoad, isDumbbellExercise, lockedVariantsOf, reconcileVariants, variantBadges, variantGroupsOf, variantOptionsOf } from '@/data/exerciseVariants';
import { formatClock, formatSetWeight, formatTimer, formatVolume } from '@/utils/format';
import styles from './index.module.scss';

interface RestState {
  endAt: number;
  /** 本次间歇的总秒数（用于圆环进度与 ±30s 调节） */
  total: number;
}

/** 多久没操作页面就提醒一次（毫秒） */
const IDLE_ALERT_MS = 10 * 60 * 1000;

/** 历史日训的日期显示：今天 / 昨天 / M月D日 */
function formatHistoryDate(timestamp: number): string {
  const day = dayjs(timestamp);
  const today = dayjs();
  if (day.isSame(today, 'day')) return '今天';
  if (day.isSame(today.subtract(1, 'day'), 'day')) return '昨天';
  return day.format('M月D日');
}

const SessionPage: React.FC = () => {
  const active = useSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);
  const finishActive = useSessionStore((state) => state.finishActive);
  const attachPlanToSession = useSessionStore((state) => state.attachPlanToSession);
  const addPlan = usePlanStore((state) => state.addPlan);
  const discardActive = useSessionStore((state) => state.discardActive);
  const pauseActive = useSessionStore((state) => state.pauseActive);
  const resumeActive = useSessionStore((state) => state.resumeActive);
  const renameActive = useSessionStore((state) => state.renameActive);
  const patchActiveMeta = useSessionStore((state) => state.patchActiveMeta);
  const addExerciseToActive = useSessionStore((state) => state.addExerciseToActive);
  const removeExerciseFromActive = useSessionStore((state) => state.removeExerciseFromActive);
  const moveExerciseInActive = useSessionStore((state) => state.moveExerciseInActive);
  const replaceExerciseInActive = useSessionStore((state) => state.replaceExerciseInActive);
  const patchExerciseInActive = useSessionStore((state) => state.patchExerciseInActive);
  const addSetToActive = useSessionStore((state) => state.addSetToActive);
  const addDropSetToActive = useSessionStore((state) => state.addDropSetToActive);
  const removeSetFromActive = useSessionStore((state) => state.removeSetFromActive);
  const updateSetInActive = useSessionStore((state) => state.updateSetInActive);
  const toggleSetDone = useSessionStore((state) => state.toggleSetDone);
  const profile = useProfileStore((state) => state.profile);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [rest, setRest] = useState<RestState | null>(null);
  /** 间歇计时器是否已最小化（收起为底部小条） */
  const [restMinimized, setRestMinimized] = useState(false);
  const [now, setNow] = useState(Date.now());
  /** 手动点开某个折叠动作时临时聚焦；为空则跟随自动推进 */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  /** 长时间没操作时弹出的提醒 */
  const [idleAlert, setIdleAlert] = useState(false);
  /** 展开「历史日训」的动作 key；同一时间只展开一个 */
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  /** 正在替换的动作 key（弹出动作选择器） */
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  /** 正在修改标签 / 器械名称的动作 key */
  const [variantEditKey, setVariantEditKey] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState<ExerciseVariants>({});
  const [equipmentDraft, setEquipmentDraft] = useState('');
  /** 最近一次操作时间（触摸页面即刷新），用 ref 避免每秒重渲染 */
  const lastActiveAt = useRef(Date.now());
  /** 暂停中不计入「没操作」，用 ref 供定时器读取最新值 */
  const pausedRef = useRef(false);
  pausedRef.current = isSessionPaused(active);

  // 秒级刷新，用于训练计时与休息倒计时；顺带检测长时间无操作
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (pausedRef.current) {
        // 已暂停：时间本来就不走，不需要提醒
        lastActiveAt.current = Date.now();
        return;
      }
      if (Date.now() - lastActiveAt.current >= IDLE_ALERT_MS) {
        // 先重置，避免每秒重复弹窗
        lastActiveAt.current = Date.now();
        setIdleAlert(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /** 有任何触摸就视为「在操作」 */
  const markActive = () => {
    lastActiveAt.current = Date.now();
  };

  useEffect(() => {
    if (rest && now >= rest.endAt) {
      setRest(null);
      setRestMinimized(false);
      showToast({ title: '休息结束，继续加油！', icon: 'none' });
      // 按「我的 → 训练偏好」里的设置提醒（提示音 + 震动可分别配置）
      const sound = restSoundSrc(profile.restSoundId);
      if (sound) playSound(sound);
      if (profile.restVibrate) vibrate();
    }
  }, [now, rest, profile.restSoundId, profile.restVibrate]);

  const doneSets = active ? sessionDoneSets(active) : 0;
  const totalSets = active ? sessionTotalSets(active) : 0;
  const volume = active ? sessionVolume(active) : 0;
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  /** 当前正在做的动作：第一个还没做完（或做完了但还没选感受）的动作；全部完成则取最后一个 */
  const currentKey = useMemo(() => {
    const list = active?.exercises ?? [];
    if (!list.length) return '';
    if (focusKey && list.some((item) => item.key === focusKey)) return focusKey;
    const index = list.findIndex((item) => !(isExerciseFinished(item) && item.feel !== undefined));
    return index === -1 ? list[list.length - 1].key : list[index].key;
  }, [active, focusKey]);

  /** 历史日训弹窗：当前查看的动作 + 该动作最近 4 次记录（时间倒序） */
  const historyExercise = active?.exercises.find((item) => item.key === historyKey) ?? null;
  const historyInfo = historyExercise ? getExerciseById(historyExercise.exerciseId) : undefined;
  const historyRecords = historyExercise
    ? recentPerformancesByVariants(
        sessions,
        historyExercise.exerciseId,
        historyExercise.variants,
        4
      )
    : [];

  /** 正在替换的动作：选择器默认定位到同部位，并把相近动作排前面 */
  const replaceExercise = active?.exercises.find((item) => item.key === replaceKey) ?? null;
  const replaceInfo = replaceExercise ? getExerciseById(replaceExercise.exerciseId) : undefined;

  /** 正在改标签的动作（点动作名或标签打开底部弹层） */
  const variantEditExercise =
    active?.exercises.find((item) => item.key === variantEditKey) ?? null;
  const variantEditInfo = variantEditExercise
    ? getExerciseById(variantEditExercise.exerciseId)
    : undefined;
  const variantEditName = variantEditInfo ? variantEditInfo.name : '';
  const variantEditGroups = variantEditExercise
    ? variantGroupsOf(variantEditName, variantDraft)
    : [];

  const openVariantEditor = (exercise: SessionExercise) => {
    const name = getExerciseById(exercise.exerciseId)?.name ?? '';
    setVariantEditKey(exercise.key);
    setVariantDraft(reconcileVariants(name, { ...(exercise.variants ?? {}) }));
    setEquipmentDraft(exercise.equipmentName ?? '');
  };

  const saveVariantEditor = () => {
    if (!variantEditExercise) return;
    patchExerciseInActive(variantEditExercise.key, {
      variants: reconcileVariants(variantEditName, variantDraft),
      equipmentName: equipmentDraft.trim() || undefined
    });
    setVariantEditKey(null);
  };

  const startRest = (seconds: number) => {
    if (!profile.restEnabled || !seconds) return;
    setRest({ endAt: Date.now() + seconds * 1000, total: seconds });
    setRestMinimized(false);
  };

  /** 结束间歇计时（手动完成 / 跳过时不再提醒） */
  const finishRest = () => {
    setRest(null);
    setRestMinimized(false);
  };

  /** 调节间歇时长：±30 秒；减到 0 以内直接结束 */
  const adjustRest = (delta: number) => {
    if (!rest) return;
    const endAt = rest.endAt + delta * 1000;
    if (endAt <= Date.now()) {
      finishRest();
      return;
    }
    setRest({ endAt, total: Math.max(5, rest.total + delta) });
  };

  /** 间歇剩余秒数与圆环进度 */
  const restRemaining = rest ? Math.max(0, Math.ceil((rest.endAt - now) / 1000)) : 0;
  const restAngle =
    rest && rest.total > 0 ? Math.min(1, restRemaining / rest.total) * 360 : 0;

  const handleToggleSet = (
    exerciseKey: string,
    setId: string,
    wasDone: boolean,
    restSeconds: number
  ) => {
    const exercise = active?.exercises.find((item) => item.key === exerciseKey);
    toggleSetDone(exerciseKey, setId);
    // 打勾后回到「自动推进」状态：完成当前动作会自动展开下一个
    setFocusKey(null);
    setHistoryKey(null);
    if (wasDone) return;
    // 组间歇只作用于「单个动作内部」：该动作还有没做完的组才计时；
    // 最后一组做完就结束，换下一个动作的间隙不计时
    const hasRemaining = !!exercise?.sets.some((set) => set.id !== setId && !set.done);
    if (hasRemaining) startRest(restSeconds);
  };

  /** 点某一组的 ✕：还有别的组就删这一组，只剩这一组时等同于把该动作移出本次训练 */
  const handleSetRemove = (exerciseKey: string, setId: string, exerciseName: string) => {
    const exercise = active?.exercises.find((item) => item.key === exerciseKey);
    if (!exercise) return;
    if (exercise.sets.length > 1) {
      removeSetFromActive(exerciseKey, setId);
      return;
    }
    showModal({
      title: '删除动作',
      content: `确定把「${exerciseName}」从本次训练中移除吗？`,
      confirmColor: '#f8736a',
      success: (res) => {
        if (res.confirm) removeExerciseFromActive(exerciseKey);
      }
    });
  };

  const handleAddExercises = (items: PickedExercise[]) => {
    items.forEach(({ exerciseId, variants, equipmentName }) =>
      addExerciseToActive(exerciseId, 3, profile.defaultRest || 90, variants, equipmentName)
    );
  };

  const selectRestForExercise = (key: string, current: number) => {
    const itemList = REST_OPTIONS.map((item) => `${item} 秒${item === current ? '（当前）' : ''}`);
    showActionSheet({
      itemList,
      success: (res) => {
        const seconds = REST_OPTIONS[res.tapIndex];
        patchExerciseInActive(key, { restSeconds: seconds });
        showToast({ title: `组间休息 ${seconds} 秒`, icon: 'none' });
      }
    });
  };

  const handleExerciseMore = (
    key: string,
    name: string,
    restSeconds: number,
    index: number,
    isCardio = false
  ) => {
    const total = active?.exercises.length ?? 0;
    // 有氧动作不设组间休息，也没有递减组
    const itemList = isCardio
      ? ['替换动作', '上移', '下移', '删除动作']
      : ['替换动作', '上移', '下移', '设置组间休息', '添加递减组', '删除动作'];
    showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex];
        if (action === '替换动作') {
          setReplaceKey(key);
          return;
        }
        if (action === '上移') {
          if (index === 0) {
            showToast({ title: '已经是第一个动作', icon: 'none' });
            return;
          }
          moveExerciseInActive(key, -1);
          return;
        }
        if (action === '下移') {
          if (index === total - 1) {
            showToast({ title: '已经是最后一个动作', icon: 'none' });
            return;
          }
          moveExerciseInActive(key, 1);
          return;
        }
        if (action === '设置组间休息') {
          selectRestForExercise(key, restSeconds);
          return;
        }
        if (action === '添加递减组') {
          addDropSetToActive(key);
          return;
        }
        showModal({
          title: '删除动作',
          content: `确定删除「${name}」吗？`,
          confirmColor: '#f8736a',
          success: (modalRes) => {
            if (modalRes.confirm) removeExerciseFromActive(key);
          }
        });
      }
    });
  };

  /** 选完某个动作的感受：自动推进到下一个动作 */
  const handleFeel = (key: string, value: number) => {
    patchExerciseInActive(key, { feel: value });
    setFocusKey(null);
  };

  /** 有氧动作名（不是有氧动作就返回空串）：结束时用来判断要不要提醒补数据 */
  const cardioNameOf = (exerciseId: string) => {
    const info = getExerciseById(exerciseId);
    return info?.muscle === 'cardio' ? info.name : '';
  };

  const handleFinish = () => {
    if (!active) return;
    const doFinish = () => {
      showModal({
        title: '结束训练',
        content: '结束并保存这次训练记录？',
        confirmText: '确定结束',
        success: (res) => {
          if (!res.confirm) return;
          // 先按「难度 + 完成度 + 相对强度」算分，保存后到计划详情页展示系统评价
          const rating = sessionRating(active, sessions);
          if (rating) patchActiveMeta({ feelScore: rating.score, feelScoreMax: 100 });
          const finished = finishActive();
          if (!finished) return;
          if (finished.planId) {
            // 计划训练：进计划详情页，在底部看系统评价、可写自我评价
            redirectTo({
              url: `/pages/plan-detail/index?id=${finished.planId}&justFinished=${finished.id}`
            });
            return;
          }
          // 自由训练：按这次练的内容生成一个计划挂上去，同样落到计划详情
          if (!finished.exercises.length) {
            // 一个动作都没加：不留空计划，直接回首页
            switchTab({ url: '/pages/home/index' });
            return;
          }
          const plan = planFromSession(finished);
          addPlan(plan);
          attachPlanToSession(finished.id, plan.id);
          redirectTo({
            url: `/pages/plan-detail/index?id=${plan.id}&justFinished=${finished.id}`
          });
        }
      });
    };

    // 有氧要自己填时长 / 距离 / 卡路里：没填就在结束时提醒一下，补不补都行
    const missing = active.exercises.filter(
      (item) => cardioNameOf(item.exerciseId) && !item.sets.some((set) => (set.durationMin ?? 0) > 0)
    );
    if (!missing.length) {
      doFinish();
      return;
    }
    const first = missing[0];
    showModal({
      title: '有氧还没填数据',
      content: `「${missing
        .map((item) => cardioNameOf(item.exerciseId))
        .join('、')}」还差时长（距离、卡路里选填），现在补一下？`,
      confirmText: '现在补',
      cancelText: '直接结束',
      success: (res) => {
        if (!res.confirm) {
          doFinish();
          return;
        }
        setFocusKey(first.key);
        setTimeout(() => pageScrollTo({ selector: `#ex-${first.key}`, duration: 300 }), 200);
      }
    });
  };

  const handleDiscard = () => {
    showModal({
      title: '放弃训练',
      content: '放弃后本次训练内容不会被保存，确定吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        discardActive();
        navigateBack();
      }
    });
  };

  if (!active) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🏋️"
            title="当前没有进行中的训练"
            desc="点击下方按钮开始一次自由训练"
            actionText="开始训练"
            onAction={() => startSession()}
          />
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page} onTouchStart={markActive}>
      <View className={styles.summary}>
        <View className={styles.summaryTop}>
          <Input
            className={styles.nameInput}
            value={active.name}
            maxlength={20}
            onInput={(event) => renameActive(event.detail.value)}
          />
        </View>
        <View className={styles.summaryMetaRow}>
          <Text className={styles.summaryMeta}>
            {formatClock(active.startedAt)} 开始 · 已用时 {formatTimer(sessionDurationSec(active))}
          </Text>
          <View
            className={classnames(
              styles.pauseBtn,
              isSessionPaused(active) && styles.pauseBtnActive
            )}
            onClick={() => {
              if (isSessionPaused(active)) {
                resumeActive();
                showToast({ title: '继续训练', icon: 'none' });
                return;
              }
              pauseActive();
              showToast({ title: '已暂停计时', icon: 'none' });
            }}
          >
            <Text className={styles.pauseBtnText}>
              {isSessionPaused(active) ? '继续' : '暂停'}
            </Text>
          </View>
        </View>

        <View className={styles.progressTrack}>
          <View className={styles.progressFill} style={{ width: `${progress}%` }} />
        </View>

        <View className={styles.summaryStats}>
          {hasCardio(active) ? (
            <>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总时长</Text>
                <Text className={styles.summaryStatValue}>
                  {sessionCardioMin(active)}
                  <Text className={styles.summaryStatUnit}>分钟</Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>消耗热量</Text>
                <Input
                  className={styles.statInput}
                  type="number"
                  value={active.calories !== undefined ? String(active.calories) : ''}
                  placeholder="kcal"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) =>
                    patchActiveMeta({ calories: parseInt(event.detail.value, 10) || 0 })
                  }
                />
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>平均心率</Text>
                <Input
                  className={styles.statInput}
                  type="number"
                  value={active.avgHeartRate !== undefined ? String(active.avgHeartRate) : ''}
                  placeholder="bpm"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) =>
                    patchActiveMeta({ avgHeartRate: parseInt(event.detail.value, 10) || 0 })
                  }
                />
              </View>
            </>
          ) : (
            <>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>动作</Text>
                <Text className={styles.summaryStatValue}>{active.exercises.length}</Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>已完成组</Text>
                <Text className={classnames(styles.summaryStatValue, styles.summaryStatAccent)}>
                  {doneSets}
                  <Text className={styles.summaryStatUnit}>/{totalSets}</Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总容量</Text>
                <Text className={styles.summaryStatValue}>
                  {formatVolume(volume)}
                  <Text className={styles.summaryStatUnit}>kg</Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {active.exercises.length ? (
        active.exercises.map((exercise, index) => {
          const info = getExerciseById(exercise.exerciseId);
          const isCardio = info?.muscle === 'cardio';
          /** 有氧动作名：决定要显示哪些附加字段（配速 / 坡度 / 阻力） */
          const cardioName = info?.name ?? '';
          // 当前正在进行的动作：展开 + 橙色边框；其余折叠成只显示动作名
          const isCurrent = exercise.key === currentKey;
          const doneCount = exercise.sets.filter((set) => set.done).length;
          const finished = isExerciseFinished(exercise);
          const feelOption = getFeelOption(exercise.feel);
          const assist = isAssistExercise(exercise.exerciseId);
          const addedMode = hasAddedLoad(exercise.variants);
          const muscleTag = info ? exerciseMuscleTag(info, exercise.variants) : undefined;
          const badges = variantBadges(info ? info.name : '已下架', exercise.variants);
          /** 组编号：普通组 1、2；递减组 2-1 递减 / 2-2 递减 */
          const labels = setLabels(exercise.sets);
          // 名字 / 标签可点开修改
          const variantGroups = variantGroupsOf(info ? info.name : '', exercise.variants);
          const editableTags =
            variantGroups.length > 0 || supportsEquipmentName(info ? info.name : '');
          // 杠铃类动作固定按「杆+总杠铃片」记重，杆重按杠铃 / 小直杠 区分
          const baseVariants = exercise.variants ?? {};
          const barbellLoad = barbellBarWeight(info ? info.name : '', baseVariants);
          // 哑铃类动作按单只哑铃记重
          const dumbbellLoad = isDumbbellExercise(info ? info.name : '', baseVariants);
          // 当前动作不显示摘要文案（下面就是组表头，避免卡片太挤）；其余显示进度
          const metaText = isCardio
            ? feelOption
              ? `${feelOption.emoji} ${feelOption.desc}`
              : '填时长 / 距离 / 卡路里'
            : isCurrent
              ? ''
              : feelOption
                ? `已完成 ${doneCount}/${exercise.sets.length} 组 · ${feelOption.emoji} ${feelOption.label}`
                : `待进行 · ${doneCount}/${exercise.sets.length} 组`;
          return (
            <View
              key={exercise.key}
              id={`ex-${exercise.key}`}
              className={classnames(
                styles.exerciseCard,
                isCurrent ? styles.exerciseCardActive : styles.exerciseCardCollapsed
              )}
              onClick={() => {
                // 收起状态：点卡片任意地方都能展开
                if (!isCurrent) setFocusKey(exercise.key);
              }}
            >
              <View className={styles.exerciseHeader}>
                <View className={styles.orderBadge}>
                  <Text className={styles.orderBadgeText}>{index + 1}</Text>
                </View>
                <View className={styles.exerciseTitleWrap}>
                  <View className={styles.exerciseNameRow}>
                    <Text
                      className={styles.exerciseName}
                      onClick={(event) => {
                        // 折叠状态：先展开这个动作的配置，不直接进标签编辑
                        if (!isCurrent) return;
                        if (!editableTags) return;
                        event.stopPropagation();
                        openVariantEditor(exercise);
                      }}
                    >
                      {info ? info.name : '已下架'}
                      {exercise.equipmentName ? `（${exercise.equipmentName}）` : ''}
                    </Text>
                    {muscleTag ? (
                      <MuscleTag
                        muscle={muscleTag.muscle}
                        label={muscleTag.label}
                        className={styles.exerciseNameTag}
                      />
                    ) : null}
                  </View>
                  <View
                    className={styles.exerciseMeta}
                    onClick={(event) => {
                      // 折叠状态：先展开这个动作的配置，不直接进标签编辑
                      if (!isCurrent) return;
                      if (!editableTags) return;
                      event.stopPropagation();
                      openVariantEditor(exercise);
                    }}
                  >
                    {badges.length ? (
                      <View className={styles.exerciseTags}>
                        {badges.map((badge) => (
                          <Text
                            key={badge.label}
                            className={
                              badge.locked ? styles.exerciseTagLocked : styles.exerciseTag
                            }
                          >
                            {badge.label}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {metaText ? <Text className={styles.exerciseMetaText}>{metaText}</Text> : null}
                  </View>
                </View>
                {isCurrent ? (
                  <View className={styles.exerciseActions}>
                    <View
                      className={classnames(
                        styles.historyBtn,
                        historyKey === exercise.key && styles.historyBtnActive
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        setHistoryKey((prev) => (prev === exercise.key ? null : exercise.key));
                      }}
                    >
                      <Text
                        className={classnames(
                          styles.historyBtnText,
                          historyKey === exercise.key && styles.historyBtnTextActive
                        )}
                      >
                        历史日训
                      </Text>
                    </View>
                    <View
                      className={styles.iconBtn}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleExerciseMore(
                          exercise.key,
                          info ? info.name : '该动作',
                          exercise.restSeconds,
                          index,
                          isCardio
                        );
                      }}
                    >
                      <Text className={styles.iconBtnText}>···</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {!isCurrent ? null : (
                <>
                  {isCardio ? (
                exercise.sets.map((set) => (
                  <View key={set.id} className={styles.cardioBox}>
                    <View className={styles.cardioLine}>
                      <Text className={styles.cardioLabel}>时长</Text>
                      <View className={styles.cardioValue}>
                        <Input
                          className={styles.cardioInputNum}
                          type="number"
                          value={set.durationMin !== undefined ? String(set.durationMin) : ''}
                          placeholder="30"
                          placeholderStyle="color:#4a4a55"
                          onInput={(event) =>
                            updateSetInActive(exercise.key, set.id, {
                              durationMin: parseInt(event.detail.value, 10) || 0
                            })
                          }
                        />
                        <Text className={styles.cardioUnit}>分钟</Text>
                      </View>
                    </View>

                    {/* 跳绳这类不记距离 */}
                    {cardioHasDistance(cardioName) ? (
                      <View className={styles.cardioLine}>
                        <Text className={styles.cardioLabel}>距离</Text>
                        <View className={styles.cardioValue}>
                          <Input
                            className={styles.cardioInputNum}
                            type="digit"
                            value={set.distanceKm !== undefined ? String(set.distanceKm) : ''}
                            placeholder="选填"
                            placeholderStyle="color:#4a4a55"
                            onInput={(event) =>
                              updateSetInActive(exercise.key, set.id, {
                                distanceKm: parseFloat(event.detail.value) || 0
                              })
                            }
                          />
                          <Text className={styles.cardioUnit}>公里</Text>
                        </View>
                      </View>
                    ) : null}

                    {/* 各机器特有的：配速 / 坡度 / 阻力 */}
                    {(CARDIO_EXTRA_FIELDS[cardioName] ?? []).map((field) => (
                      <View key={field.key} className={styles.cardioLine}>
                        <Text className={styles.cardioLabel}>{field.label}</Text>
                        <Input
                          className={styles.cardioInput}
                          value={set[field.key] ?? ''}
                          placeholder={field.placeholder}
                          placeholderStyle="color:#4a4a55"
                          onInput={(event) =>
                            updateSetInActive(exercise.key, set.id, {
                              [field.key]: event.detail.value
                            })
                          }
                        />
                      </View>
                    ))}

                    <View className={styles.cardioLine}>
                      <Text className={styles.cardioLabel}>卡路里</Text>
                      <View className={styles.cardioValue}>
                        <Input
                          className={styles.cardioInputNum}
                          type="number"
                          value={set.calories !== undefined ? String(set.calories) : ''}
                          placeholder="选填"
                          placeholderStyle="color:#4a4a55"
                          onInput={(event) =>
                            updateSetInActive(exercise.key, set.id, {
                              calories: parseInt(event.detail.value, 10) || 0
                            })
                          }
                        />
                        <Text className={styles.cardioUnit}>kcal</Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <>
                  <View className={styles.setHead}>
                    <Text className={styles.headIndex}>组</Text>
                    <Text className={styles.headWeight}>
                      {barbellLoad
                        ? `重量（杆${barbellLoad}kg+总杠铃片）`
                        : dumbbellLoad
                          ? '重量（单只）'
                          : addedMode
                            ? '自重+负重(kg)'
                            : '重量(kg)'}
                    </Text>
                    <Text className={styles.headTimes} />
                    <Text className={styles.headReps}>
                      {isTimedExercise(exercise.exerciseId) ? '秒数' : '次数'}
                    </Text>
                    <Text className={styles.headDone}>完成</Text>
                    <Text className={styles.headRemove} />
                  </View>

                  {exercise.sets.map((set, setIndex) => (
                    <SetRow
                      key={set.id}
                      label={labels[setIndex]}
                      set={set}
                      assist={assist}
                      addedMode={addedMode}
                      timed={isTimedExercise(exercise.exerciseId)}
                      onPatch={(patch) => updateSetInActive(exercise.key, set.id, patch)}
                      onToggle={() =>
                        handleToggleSet(exercise.key, set.id, set.done, exercise.restSeconds)
                      }
                      onRemove={() =>
                        handleSetRemove(exercise.key, set.id, info ? info.name : '该动作')
                      }
                    />
                  ))}

                  <View className={styles.addSet} onClick={() => addSetToActive(exercise.key)}>
                    <Text className={styles.addSetText}>+ 添加一组</Text>
                  </View>
                </>
              )}

              {/* 动作做完后：选择本次感受，选完自动进入下一个动作（有氧可以跳过） */}
              {finished ? (
                <View className={styles.feelBox}>
                  <Text className={styles.feelTitle}>
                    {exercise.feel ? '这次感觉怎么样？（可修改）' : '这个动作练完了，感觉如何？'}
                  </Text>
                  <View className={styles.feelRow}>
                    {FEEL_OPTIONS.map((option) => {
                      const on = exercise.feel === option.value;
                      return (
                        <View
                          key={option.value}
                          className={styles.feelItem}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleFeel(exercise.key, option.value);
                          }}
                        >
                          <View
                            className={styles.feelDot}
                            style={{
                              borderColor: option.color,
                              backgroundColor: on ? option.color : 'transparent'
                            }}
                          />
                          <Text
                            className={styles.feelLabel}
                            style={on ? { color: option.color } : undefined}
                          >
                            {option.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {isCardio ? (
                    <Text
                      className={styles.feelSkip}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFocusKey(null);
                      }}
                    >
                      跳过
                    </Text>
                  ) : null}
                </View>
              ) : null}
                </>
              )}
            </View>
          );
        })
      ) : (
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="💪"
            title="还没有添加动作"
            desc="点击下方「添加动作」开始记录吧"
          />
        </View>
      )}

      <View className={styles.giveUp} onClick={handleDiscard}>
        <Text className={styles.giveUpText}>放弃本次训练</Text>
      </View>

      {rest ? (
        restMinimized ? (
          <View className={styles.restBar}>
            <View className={styles.restInfo}>
              <Text className={styles.restLabel}>组间歇</Text>
              <Text className={styles.restTime}>{formatTimer(restRemaining)}</Text>
            </View>
            <View className={styles.restSkip} onClick={() => setRestMinimized(false)}>
              <Text className={styles.restSkipText}>展开</Text>
            </View>
            <View className={styles.restSkip} onClick={finishRest}>
              <Text className={styles.restSkipText}>完成</Text>
            </View>
          </View>
        ) : (
          <View className={styles.restMask}>
            <View className={styles.restCard}>
              <View className={styles.restTopRow}>
                <View className={styles.restMinBtn} onClick={() => setRestMinimized(true)}>
                  <Text className={styles.restMinBtnText}>最小化</Text>
                </View>
              </View>

              <Text className={styles.restTitle}>组间歇</Text>

              <View
                className={styles.ring}
                style={{
                  background: `conic-gradient(#ff6b2c 0deg, #ff6b2c ${restAngle}deg, rgba(255,255,255,0.08) ${restAngle}deg 360deg)`
                }}
              >
                <View className={styles.ringInner}>
                  <Text className={styles.ringTime}>{formatTimer(restRemaining)}</Text>
                </View>
              </View>

              <Text className={styles.ringTotal}>共 {rest.total} 秒</Text>

              <View className={styles.restActions}>
                <View className={styles.restAdjust} onClick={() => adjustRest(-30)}>
                  <Text className={styles.restAdjustText}>-30s</Text>
                </View>
                <View className={styles.restAdjust} onClick={() => adjustRest(30)}>
                  <Text className={styles.restAdjustText}>+30s</Text>
                </View>
                <View className={styles.restDone} onClick={finishRest}>
                  <Text className={styles.restDoneText}>完成</Text>
                </View>
              </View>

              <View className={styles.restTips}>
                <Text className={styles.restTip}>1. 关闭计时器请到「我的 → 训练偏好」中设置</Text>
                <Text className={styles.restTip}>
                  2. 组间歇提醒声音请到「我的 → 训练偏好」中设置
                </Text>
              </View>
            </View>
          </View>
        )
      ) : null}

      <View className={styles.bottomBar}>
        <View className={classnames(styles.bottomBtn, styles.bottomBtnGhost)} onClick={() => setPickerVisible(true)}>
          <Text className={styles.bottomBtnTextGhost}>添加动作</Text>
        </View>
        <View className={classnames(styles.bottomBtn, styles.bottomBtnPrimary)} onClick={handleFinish}>
          <Text className={styles.bottomBtnTextPrimary}>结束训练</Text>
        </View>
      </View>

      <ExercisePicker
        visible={pickerVisible}
        title="添加动作"
        confirmText="添加"
        onClose={() => setPickerVisible(false)}
        onConfirm={handleAddExercises}
      />

      {/* 替换动作：没器械 / 身体不适时换一个（默认同部位 + 相近动作排前面，点一下即替换） */}
      <ExercisePicker
        visible={!!replaceKey}
        single
        title="替换动作"
        defaultMuscle={replaceInfo?.muscle ?? null}
        similarToId={replaceExercise?.exerciseId}
        onClose={() => setReplaceKey(null)}
        onConfirm={(items) => {
          const picked = items[0];
          if (replaceKey && picked) {
            replaceExerciseInActive(
              replaceKey,
              picked.exerciseId,
              picked.variants,
              picked.equipmentName
            );
          }
          setReplaceKey(null);
        }}
      />

      {/* 标签编辑器：点动作名或标签打开，改变式 / 器械名称 */}
      {variantEditExercise ? (
        <View className={styles.variantMask} onClick={() => setVariantEditKey(null)}>
          <View className={styles.variantSheet} onClick={(event) => event.stopPropagation()}>
            <View className={styles.variantHead}>
              <View className={styles.variantHeadMain}>
                <Text className={styles.variantTitle}>{variantEditName}</Text>
                {supportsEquipmentName(variantEditName) ? (
                  <Input
                    className={styles.variantHeadInput}
                    value={equipmentDraft}
                    maxlength={12}
                    placeholder="选填具体名称。例如鹦鹉螺、海豹划船"
                    placeholderStyle="color:#4a4a55"
                    onInput={(event) => setEquipmentDraft(event.detail.value)}
                  />
                ) : null}
              </View>
              <View className={styles.variantClose} onClick={() => setVariantEditKey(null)}>
                <Text className={styles.variantCloseText}>✕</Text>
              </View>
            </View>

            <View className={styles.variantBody}>
              {variantEditGroups.map((group) => (
                <View key={group.key} className={styles.variantRow}>
                  <Text className={styles.variantLabel}>{group.label}</Text>
                  <View className={styles.variantOptions}>
                    {variantOptionsOf(variantEditName, group.key, variantDraft).map((option) => {
                      const active = variantDraft[group.key] === option.key;
                      return (
                        <View
                          key={option.key}
                          className={classnames(
                            styles.variantChip,
                            active && styles.variantChipActive
                          )}
                          onClick={() =>
                            setVariantDraft((prev) =>
                              reconcileVariants(variantEditName, {
                                ...prev,
                                [group.key]: option.key
                              })
                            )
                          }
                        >
                          <Text
                            className={classnames(
                              styles.variantChipText,
                              active && styles.variantChipTextActive
                            )}
                          >
                            {option.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* 写死的变式：灰着显示，只是让用户看 */}
              {lockedVariantsOf(variantEditName, variantDraft).map((locked) => (
                <View key={locked.groupKey} className={styles.variantRow}>
                  <Text className={styles.variantLabel}>{locked.groupLabel}</Text>
                  <View className={styles.variantOptions}>
                    <View className={classnames(styles.variantChip, styles.variantChipLocked)}>
                      <Text
                        className={classnames(styles.variantChipText, styles.variantChipTextLocked)}
                      >
                        {locked.optionLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className={styles.variantActions}>
              <View className={styles.variantConfirm} onClick={saveVariantEditor}>
                <Text className={styles.variantConfirmText}>确定</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* 10 分钟没有任何操作：确认是否还在训练，避免忘了结束一直计时 */}
      {idleAlert ? (
        <View className={styles.idleMask}>
          <View className={styles.idleCard}>
            <Text className={styles.idleTitle}>还在训练吗？</Text>
            <Text className={styles.idleDesc}>
              已经 10 分钟没有操作了，训练计时还在走。如果是接电话、临时离开，可以继续；如果已经练完，建议现在结束并保存记录。
            </Text>
            <View className={styles.idleActions}>
              <View
                className={styles.idleGhost}
                onClick={() => {
                  markActive();
                  setIdleAlert(false);
                }}
              >
                <Text className={styles.idleGhostText}>继续训练</Text>
              </View>
              <View
                className={styles.idlePrimary}
                onClick={() => {
                  markActive();
                  setIdleAlert(false);
                  handleFinish();
                }}
              >
                <Text className={styles.idlePrimaryText}>结束训练</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* 历史日训弹窗：该动作最近 4 次记录（时间倒序），带当次动作心得 */}
      {historyExercise ? (
        <View className={styles.historyMask} onClick={() => setHistoryKey(null)}>
          <View className={styles.historyCard} onClick={(event) => event.stopPropagation()}>
            <View className={styles.historyHead}>
              <View className={styles.historyHeadMain}>
                <Text className={styles.historyCardTitle}>历史日训</Text>
                <Text className={styles.historyCardSub}>
                  {historyInfo ? historyInfo.name : '已下架'}
                  {historyRecords.length ? ` · 近 ${historyRecords.length} 次` : ''}
                </Text>
              </View>
              <View className={styles.historyClose} onClick={() => setHistoryKey(null)}>
                <Text className={styles.historyCloseText}>✕</Text>
              </View>
            </View>

            {historyRecords.length ? (
              <ScrollView scrollY className={styles.historyList}>
                {historyRecords.map((record) => {
                  const feel = getFeelOption(record.feel);
                  return (
                    <View key={record.sessionId} className={styles.historyItem}>
                      <View className={styles.historyItemTop}>
                        <Text className={styles.historyItemDate}>
                          {formatHistoryDate(record.startedAt)}
                        </Text>
                        {feel ? (
                          <Text className={styles.historyItemFeel}>
                            {feel.emoji} {feel.label}
                          </Text>
                        ) : null}
                      </View>
                      <Text className={styles.historyItemSets}>
                        {record.cardioMin
                          ? `${record.cardioMin} 分钟`
                          : record.sets
                              .map(
                                (set) =>
                                  `${formatSetWeight(set)}kg×${set.reps}${
                                    historyInfo && isTimedExercise(historyInfo.id) ? '秒' : ''
                                  }`
                              )
                              .join(' · ')}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text className={styles.historyEmpty}>
                还没有「{historyInfo ? historyInfo.name : '该动作'}」的历史记录
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default SessionPage;
