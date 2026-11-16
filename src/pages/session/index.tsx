import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Input, ScrollView, Textarea } from '@tarojs/components';
import Taro, { pageScrollTo } from '@tarojs/taro';
import {
  navigateBack,
  navigateTo,
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
  FEEL_OPTIONS,
  REST_OPTIONS,
  cardioFieldsOf,
  equipmentNamePlaceholder,
  getFeelOption,
  paceTextOf,
  restSoundSrc,
  supportsEquipmentName,
  treadmillDistanceKm
} from '@/constants';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import type { ExerciseVariants, SessionExercise, WorkoutSet } from '@/types';
import SetRow from '@/components/SetRow';
import ExercisePicker, { type PickedExercise } from '@/components/ExercisePicker';
import ScrollLock from '@/components/ScrollLock';
import ActionSheet from '@/components/ActionSheet';
import SupersetPicker from '@/components/SupersetPicker';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  hasCardio,
  isAssistExercise,
  isExerciseFinished,
  isSessionPaused,
  isTimedExercise,
  sessionCardioMin,
  sessionDoneSets,
  sessionDurationSec,
  sessionRating,
  supersetLetters,
  sessionTotalSets,
  sessionTotalWeight,
  sessionVolume,
  setLabels,
  planFromSession,
  variantFingerprint
} from '@/utils/workout';
import { barbellBarWeight, hasAddedLoad, isDumbbellExercise, lockedVariantsOf, reconcileVariants, variantBadges, variantGroupsOf, variantOptionsOf } from '@/data/exerciseVariants';
import { formatClock, formatTimer } from '@/utils/format';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

interface RestState {
  endAt: number;
  /** 本次间歇的总秒数（用于圆环进度与 ±30s 调节） */
  total: number;
}

/** 多久没操作页面就提醒一次（毫秒） */
const IDLE_ALERT_MS = 10 * 60 * 1000;

/** 改完某组后浮出的「应用到后续组」卡片 */
interface ApplyTip {
  exerciseKey: string;
  sourceId: string;
  targetIds: string[];
}

const SessionPage: React.FC = () => {
  const themeClass = usePageTheme();
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
  const groupSupersetInActive = useSessionStore((state) => state.groupSupersetInActive);
  const ungroupSupersetInActive = useSessionStore((state) => state.ungroupSupersetInActive);
  const addSetToActive = useSessionStore((state) => state.addSetToActive);
  const addDropSetToActive = useSessionStore((state) => state.addDropSetToActive);
  const removeSetFromActive = useSessionStore((state) => state.removeSetFromActive);
  const updateSetInActive = useSessionStore((state) => state.updateSetInActive);
  const toggleSetDone = useSessionStore((state) => state.toggleSetDone);
  const profile = useProfileStore((state) => state.profile);

  const [pickerVisible, setPickerVisible] = useState(false);
  /** 超级组弹层：训练中临时把几个动作合并成一组 */
  const [supersetOpen, setSupersetOpen] = useState(false);
  /** 正在打开「···」菜单的动作 key */
  const [moreKey, setMoreKey] = useState<string | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  /** 间歇计时器是否已最小化（收起为底部小条） */
  const [restMinimized, setRestMinimized] = useState(false);
  const [now, setNow] = useState(Date.now());
  /** 手动点开某个折叠动作时临时聚焦；为空则跟随自动推进 */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  /** 长时间没操作时弹出的提醒 */
  const [idleAlert, setIdleAlert] = useState(false);
  /** 改完某组后出现的「应用到后续组」卡片 */
  const [applyTip, setApplyTip] = useState<ApplyTip | null>(null);
  /** 最近一次编辑的组：等键盘收起后再把卡片亮出来 */
  const pendingEditRef = useRef<{ exerciseKey: string; setId: string } | null>(null);
  const keyboardOpenRef = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  /** 应用/撤销后让组行重新按 store 值渲染（SetRow 内部是非受控输入） */
  const [rowRevision, setRowRevision] = useState(0);
  /** 正在替换的动作 key（弹出动作选择器） */
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  /** 正在修改标签 / 器械名称的动作 key */
  const [variantEditKey, setVariantEditKey] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState<ExerciseVariants>({});
  const [equipmentDraft, setEquipmentDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  /** 变式标签展开状态：默认只显示一行，多的收成「+N」 */
  const [tagExpanded, setTagExpanded] = useState<Record<string, boolean>>({});
  /** 最近一次操作时间（触摸页面即刷新），用 ref 避免每秒重渲染 */
  const lastActiveAt = useRef(Date.now());
  /** 暂停中不计入「没操作」，用 ref 供定时器读取最新值 */
  const pausedRef = useRef(false);
  pausedRef.current = isSessionPaused(active);

  /** 键盘收起后，按最新一次编辑生成「应用到后续组」卡片 */
  const flushPendingEditRef = useRef<() => void>(() => {});
  flushPendingEditRef.current = () => {
    const pending = pendingEditRef.current;
    if (!pending) return;
    const exercise = activeRef.current?.exercises.find(
      (item) => item.key === pending.exerciseKey
    );
    if (!exercise) return;
    const index = exercise.sets.findIndex((item) => item.id === pending.setId);
    if (index < 0) return;
    const targets = exercise.sets.slice(index + 1).filter((item) => !item.done && !item.drop);
    if (!targets.length) {
      setApplyTip(null);
      return;
    }
    setApplyTip({
      exerciseKey: exercise.key,
      sourceId: pending.setId,
      targetIds: targets.map((item) => item.id)
    });
  };

  // 微信端：等键盘真正收起（高度回到 0）再显示卡片，避免输入时挡住视线
  useEffect(() => {
    if (typeof Taro.onKeyboardHeightChange !== 'function') return;
    const handler = (res: { height: number }) => {
      keyboardOpenRef.current = res.height > 0;
      if (res.height === 0) flushPendingEditRef.current();
    };
    Taro.onKeyboardHeightChange(handler);
    return () => {
      if (typeof Taro.offKeyboardHeightChange === 'function') {
        Taro.offKeyboardHeightChange(handler);
      }
    };
  }, []);

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

  /** 计划预设：所有组的重量和（含还没做的组） */
  const planWeight = active
    ? active.exercises.reduce(
        (sum, item) => sum + item.sets.reduce((acc, set) => acc + Math.abs(set.weight), 0),
        0
      )
    : 0;
  const doneWeight = active ? sessionTotalWeight(active) : 0;
  /** 计划预设容量：所有组的 重量 × 次数（含还没做的组） */
  const planVolume = active
    ? active.exercises.reduce(
        (sum, item) =>
          sum +
          (isTimedExercise(item.exerciseId)
            ? 0
            : item.sets.reduce((acc, set) => acc + Math.abs(set.weight) * set.reps, 0)),
        0
      )
    : 0;
  const doneExercises = active ? active.exercises.filter(isExerciseFinished).length : 0;

  /** 「当天已完成 / 计划预设」：计划过千就换成 t，三格才放得下 */
  const pairOf = (done: number, plan: number) => {
    if (plan >= 1000) {
      const one = (value: number) => String(Math.round(value / 100) / 10);
      return { done: one(done), plan: one(plan), unit: 't' };
    }
    return { done: String(Math.round(done)), plan: String(Math.round(plan)), unit: 'kg' };
  };
  const weightPair = pairOf(doneWeight, planWeight);
  const volumePair = pairOf(volume, planVolume);

  /** 当前正在做的动作：第一个还没做完（或做完了但还没选感受）的动作；全部完成则取最后一个 */
  const currentKey = useMemo(() => {
    const list = active?.exercises ?? [];
    if (!list.length) return '';
    if (focusKey && list.some((item) => item.key === focusKey)) return focusKey;
    const index = list.findIndex((item) => !(isExerciseFinished(item) && item.feel !== undefined));
    return index === -1 ? list[list.length - 1].key : list[index].key;
  }, [active, focusKey]);

  /** 超级组编号 → A/B/C…（按动作顺序） */
  const supersetMap = useMemo(
    () => supersetLetters(active?.exercises ?? []),
    [active?.exercises]
  );

  /** 打开历史日训页：名字 + 标签 + 器械名必须完全一致才进同一份历史 */
  const openHistory = (exercise: SessionExercise) => {
    const vk = variantFingerprint(exercise.variants) || '-';
    const eq = exercise.equipmentName?.trim()
      ? encodeURIComponent(exercise.equipmentName.trim())
      : '-';
    navigateTo({
      url: `/subpackages/misc/exercise-detail/index?id=${exercise.exerciseId}&vk=${encodeURIComponent(vk)}&eq=${eq}`
    });
  };

  /** 结束编辑：键盘已收起就立刻亮出卡片（H5 没有键盘高度事件，走这里） */
  const handleEditEnd = () => {
    if (keyboardOpenRef.current) return;
    flushPendingEditRef.current();
  };

  /** 改了某组的重量/次数：先记住这一组，等键盘收起再显示卡片 */
  const handleSetPatch = (
    exercise: SessionExercise,
    set: WorkoutSet,
    patch: Partial<WorkoutSet>
  ) => {
    updateSetInActive(exercise.key, set.id, patch);
    if (!('weight' in patch) && !('reps' in patch) && !('addedWeight' in patch)) return;
    pendingEditRef.current = { exerciseKey: exercise.key, setId: set.id };
    if (applyTip) setApplyTip(null);
  };

  /** 关掉卡片，同时忘掉待展示的那一组 */
  const clearApplyTip = () => {
    pendingEditRef.current = null;
    setApplyTip(null);
  };

  // 卡片出现后 3 秒自动隐藏（等同点了 ✕，不改任何数据）
  useEffect(() => {
    if (!applyTip) return;
    const timer = setTimeout(clearApplyTip, 3000);
    return () => clearTimeout(timer);
  }, [applyTip]);

  /** 把本组重量 + 次数同步到后续未完成、非递减的组 */
  const applyToFollowing = () => {
    if (!applyTip) return;
    const exercise = active?.exercises.find((item) => item.key === applyTip.exerciseKey);
    const source = exercise?.sets.find((item) => item.id === applyTip.sourceId);
    const count = applyTip.targetIds.length;
    if (!exercise || !source) {
      clearApplyTip();
      return;
    }
    applyTip.targetIds.forEach((id) => {
      updateSetInActive(exercise.key, id, {
        weight: source.weight,
        reps: source.reps,
        addedWeight: source.addedWeight
      });
    });
    setRowRevision((value) => value + 1);
    clearApplyTip();
    showToast({ title: `已同步 ${count} 组`, icon: 'none' });
  };

  /** 正在替换的动作：选择器默认定位到同部位，并把相近动作排前面 */
  const replaceExercise = active?.exercises.find((item) => item.key === replaceKey) ?? null;
  const replaceInfo = replaceExercise ? getExerciseById(replaceExercise.exerciseId) : undefined;

  /** 正在打开「···」菜单的动作 */
  const moreExercise = active?.exercises.find((item) => item.key === moreKey) ?? null;
  const moreIndex = moreExercise
    ? (active?.exercises.findIndex((item) => item.key === moreExercise.key) ?? -1)
    : -1;
  const moreIsCardio = moreExercise
    ? getExerciseById(moreExercise.exerciseId)?.muscle === 'cardio'
    : false;
  const moreItems = moreExercise
    ? [
        // 有氧动作不设组间休息，也没有递减组
        ...(moreIsCardio
          ? ['替换动作', '上移', '下移']
          : ['替换动作', '上移', '下移', '设置组间休息', '添加递减组']),
        ...(moreExercise.supersetId ? ['解散超级组'] : []),
        '删除动作'
      ]
    : [];

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
    setNoteDraft(exercise.note ?? '');
  };

  const saveVariantEditor = () => {
    if (!variantEditExercise) return;
    patchExerciseInActive(variantEditExercise.key, {
      variants: reconcileVariants(variantEditName, variantDraft),
      equipmentName: equipmentDraft.trim() || undefined,
      note: noteDraft.trim() || undefined
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
    const list = active?.exercises ?? [];
    const exercise = list.find((item) => item.key === exerciseKey);
    toggleSetDone(exerciseKey, setId);
    // 打勾后回到「自动推进」状态：完成当前动作会自动展开下一个
    setFocusKey(null);
    if (wasDone) return;
    // 超级组：轮内动作连着做，本轮最后一个动作做完才休息
    const members = exercise?.supersetId
      ? list.filter((item) => item.supersetId === exercise.supersetId)
      : [];
    if (exercise && members.length > 1) {
      const setIndex = exercise.sets.findIndex((set) => set.id === setId);
      // 轮数按组内最少组数算：多出来的组按普通组单独做
      const rounds = Math.min(...members.map((item) => item.sets.length));
      if (setIndex >= 0 && setIndex < rounds) {
        const pending = members.filter(
          (item) =>
            item.key !== exerciseKey && item.sets[setIndex] && !item.sets[setIndex].done
        );
        if (pending.length) {
          // 本轮还没做完：直接推进到下一个动作，不计时
          setFocusKey(pending[0].key);
          return;
        }
        const moreWork = members.some((item) => item.sets.some((set) => !set.done));
        if (moreWork) startRest(members[members.length - 1].restSeconds);
        return;
      }
    }
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

  /** 打开某个动作的「···」菜单（自己画，动作多了原生菜单会弹不出来） */
  const openExerciseMore = (key: string) => {
    setMoreKey(key);
  };

  /** 「···」菜单里点了某一项 */
  const runExerciseMore = (action: string) => {
    if (!moreExercise) return;
    const key = moreExercise.key;
    const name = getExerciseById(moreExercise.exerciseId)?.name ?? '该动作';
    if (action === '替换动作') {
      setReplaceKey(key);
      return;
    }
    if (action === '上移') {
      if (moreIndex === 0) {
        showToast({ title: '已经是第一个动作', icon: 'none' });
        return;
      }
      moveExerciseInActive(key, -1);
      return;
    }
    if (action === '下移') {
      if (moreIndex === (active?.exercises.length ?? 0) - 1) {
        showToast({ title: '已经是最后一个动作', icon: 'none' });
        return;
      }
      moveExerciseInActive(key, 1);
      return;
    }
    if (action === '设置组间休息') {
      selectRestForExercise(key, moreExercise.restSeconds);
      return;
    }
    if (action === '添加递减组') {
      addDropSetToActive(key);
      return;
    }
    if (action === '解散超级组') {
      ungroupSupersetInActive(key);
      showToast({ title: '已解散超级组', icon: 'none' });
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
            // 计划训练：进训练报告页，看系统评价、可写自我评价
            redirectTo({
              url: `/subpackages/misc/session-result/index?id=${finished.id}`
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
            url: `/subpackages/misc/session-result/index?id=${finished.id}`
          });
        }
      });
    };

    // 有氧要自己填时长 / 距离：没填就在结束时提醒一下，补不补都行
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
        .join('、')}」还差时长（距离选填），现在补一下？`,
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
      <View className={classnames(styles.page, themeClass)}>
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
      {/* 任一浮层打开时锁住页面滚动，避免滑动遮罩/缝隙把底下的画布一起滚 */}
      <ScrollLock
        lock={
          pickerVisible ||
          !!replaceKey ||
          !!variantEditKey ||
          idleAlert ||
          supersetOpen ||
          !!moreKey ||
          (!!rest && !restMinimized)
        }
      />
      <View className={styles.summary}>
        <View className={styles.summaryTop}>
          <Input
            className={styles.nameInput}
            value={active.name}
            maxlength={20}
            onInput={(event) => renameActive(event.detail.value)}
          />
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
        <Text className={styles.summaryMeta}>
          {formatClock(active.startedAt)} 开始 · 已用时 {formatTimer(sessionDurationSec(active))}
        </Text>

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
                <Text className={styles.summaryStatLabel}>总重量</Text>
                <Text className={styles.summaryStatValue}>
                  {weightPair.done}
                  <Text className={styles.summaryStatUnit}>
                    /{weightPair.plan}
                    {weightPair.unit}
                  </Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总容量</Text>
                <Text className={classnames(styles.summaryStatValue, styles.summaryStatAccent)}>
                  {volumePair.done}
                  <Text className={styles.summaryStatUnit}>
                    /{volumePair.plan}
                    {volumePair.unit}
                  </Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总动作数</Text>
                <Text className={styles.summaryStatValue}>
                  {doneExercises}
                  <Text className={styles.summaryStatUnit}>/{active.exercises.length}</Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 动作区：训练中也能临时把几个动作合并成超级组（有氧不参与，只有两个以上力量动作才给入口） */}
      {active.exercises.filter((item) => getExerciseById(item.exerciseId)?.muscle !== 'cardio')
        .length >= 2 ? (
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>动作</Text>
          <View className={styles.supersetBtn} onClick={() => setSupersetOpen(true)}>
            <Text className={styles.supersetBtnText}>超级组</Text>
          </View>
        </View>
      ) : null}

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
          /** 标签默认只露 3 个，多出来的收成「+N」，点一下展开 */
          const tagOpen = !!tagExpanded[exercise.key];
          const visibleBadges = tagOpen ? badges : badges.slice(0, 3);
          const overflowTags = badges.length - visibleBadges.length;
          /** 组编号：普通组 1、2；递减组 2-1 递减 / 2-2 递减 */
          const labels = setLabels(exercise.sets);
          // 杠铃类动作固定按「杆+总杠铃片」记重，杆重按杠铃 / 小直杠 区分
          const baseVariants = exercise.variants ?? {};
          const barbellLoad = barbellBarWeight(info ? info.name : '', baseVariants);
          // 哑铃类动作按单只哑铃记重
          const dumbbellLoad = isDumbbellExercise(info ? info.name : '', baseVariants);
          // 当前动作不显示摘要文案（下面就是组表头，避免卡片太挤）；其余显示进度
          const superset = exercise.supersetId ? supersetMap[exercise.supersetId] : '';
          const metaText = isCardio
            ? feelOption
              ? `${feelOption.emoji} ${feelOption.desc}`
              : '填时长 / 距离'
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
                      numberOfLines={2}
                      onClick={(event) => {
                        // 折叠状态：先展开这个动作的配置，不直接进标签编辑
                        if (!isCurrent) return;
                        event.stopPropagation();
                        openVariantEditor(exercise);
                      }}
                    >
                      {info ? info.name : '已下架'}
                      {exercise.note ?? ''}
                      {exercise.equipmentName ? `（${exercise.equipmentName}）` : ''}
                    </Text>
                  </View>
                  <View
                    className={styles.exerciseMeta}
                    onClick={(event) => {
                      // 折叠状态：先展开这个动作的配置，不直接进标签编辑
                      if (!isCurrent) return;
                      event.stopPropagation();
                      openVariantEditor(exercise);
                    }}
                  >
                    {badges.length ? (
                      <View className={styles.exerciseTags}>
                        {visibleBadges.map((badge) => (
                          <Text
                            key={badge.label}
                            className={
                              badge.locked ? styles.exerciseTagLocked : styles.exerciseTag
                            }
                          >
                            {badge.label}
                          </Text>
                        ))}
                        {overflowTags > 0 || tagOpen ? (
                          <Text
                            className={styles.exerciseTagMore}
                            onClick={(event) => {
                              event.stopPropagation();
                              setTagExpanded((prev) => ({
                                ...prev,
                                [exercise.key]: !tagOpen
                              }));
                            }}
                          >
                            {tagOpen ? '收起' : `+${overflowTags}`}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {metaText ? <Text className={styles.exerciseMetaText}>{metaText}</Text> : null}
                  </View>
                </View>
                {/* 右侧竖排：超级组 / 训练部位在最上面，和「···」右边缘对齐 */}
                <View className={styles.exerciseSide}>
                  {superset ? (
                    <Text className={styles.supersetTag}>超级组 {superset}</Text>
                  ) : null}
                  {muscleTag ? (
                    <MuscleTag
                      muscle={muscleTag.muscle}
                      label={muscleTag.label}
                      className={styles.exerciseSideTag}
                    />
                  ) : null}
                  {isCurrent ? (
                    <View className={styles.exerciseActions}>
                      <View
                        className={styles.iconBtn}
                        onClick={(event) => {
                          event.stopPropagation();
                          openExerciseMore(exercise.key);
                        }}
                      >
                        <Text className={styles.iconBtnText}>···</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>

              {!isCurrent ? null : (
                <>
                  {isCardio ? (
                <>
                {exercise.sets.map((set) => {
                  const fields = cardioFieldsOf(cardioName);
                  const isTreadmill = cardioName === '跑步机';
                  const segmentField = fields.find((field) => field.kind === 'segment');
                  const numericFields = fields.filter(
                    (field) => field.kind === 'number' && field.key !== 'durationMin'
                  );
                  const rawOf = (key: string) =>
                    (set as unknown as Record<string, string | number | undefined>)[key];
                  /** 改任意字段：跑步机顺手把距离按速度 × 时长算出来 */
                  const patchSet = (patch: Partial<WorkoutSet>) => {
                    const merged = { ...set, ...patch };
                    const next: Partial<WorkoutSet> = { ...patch };
                    if (isTreadmill) {
                      next.distanceKm =
                        treadmillDistanceKm(merged.durationMin, merged.speedKmh) ?? undefined;
                    }
                    updateSetInActive(exercise.key, set.id, next);
                  };
                  const distance = isTreadmill
                    ? treadmillDistanceKm(set.durationMin, set.speedKmh) ?? null
                    : set.distanceKm ?? null;
                  const pace = paceTextOf(set.durationMin, distance ?? undefined);
                  return (
                    <View key={set.id} className={styles.cardioPanel}>
                      <View className={styles.cardioPanelHead}>
                        <Text className={styles.cardioPanelTitle}>有氧记录</Text>
                        <Text className={styles.cardioPanelHint}>
                          {set.durationMin ? `本次 ${set.durationMin} 分钟` : '练完填实际数据'}
                        </Text>
                      </View>

                      {segmentField ? (
                        <View className={styles.cardioMode}>
                          <Text className={styles.cardioModeLabel}>{segmentField.label}</Text>
                          <View className={styles.cardioModeTrack}>
                            {(segmentField.options ?? []).map((option) => {
                              const on = rawOf(segmentField.key) === option.value;
                              return (
                                <View
                                  key={option.value}
                                  className={classnames(
                                    styles.cardioModeItem,
                                    on && styles.cardioModeItemOn
                                  )}
                                  onClick={() =>
                                    patchSet({ [segmentField.key]: option.value } as Partial<WorkoutSet>)
                                  }
                                >
                                  <Text
                                    className={classnames(
                                      styles.cardioModeText,
                                      on && styles.cardioModeTextOn
                                    )}
                                  >
                                    {option.label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}

                      {/* 时长是这一块的主指标：大号数字，配速跟在右边 */}
                      <View className={styles.cardioHero}>
                        <View className={styles.cardioHeroMain}>
                          <Text className={styles.cardioHeroLabel}>时长</Text>
                          <View className={styles.cardioHeroValueRow}>
                            <Input
                              className={styles.cardioHeroInput}
                              type="number"
                              value={set.durationMin ? String(set.durationMin) : ''}
                              placeholder="30"
                              placeholderStyle="color:#4a4a55"
                              onInput={(event) =>
                                patchSet({ durationMin: parseInt(event.detail.value, 10) || 0 })
                              }
                            />
                            <Text className={styles.cardioHeroUnit}>分钟</Text>
                          </View>
                        </View>
                        {pace ? (
                          <View className={styles.cardioHeroSide}>
                            <Text className={styles.cardioHeroSideValue}>
                              {pace.replace('/km', '')}
                            </Text>
                            <Text className={styles.cardioHeroSideLabel}>配速 /km</Text>
                          </View>
                        ) : null}
                      </View>

                      {numericFields.length || (isTreadmill && distance) ? (
                        <View className={styles.cardioGrid}>
                          {isTreadmill && distance ? (
                            <View className={styles.cardioTile}>
                              <Text className={styles.cardioTileLabel}>距离</Text>
                              <View className={styles.cardioTileValueRow}>
                                <Text className={styles.cardioTileStatic}>{distance}</Text>
                                <Text className={styles.cardioTileUnit}>公里</Text>
                              </View>
                            </View>
                          ) : null}
                          {numericFields.map((field) => {
                            const raw = rawOf(field.key);
                            return (
                              <View key={field.key} className={styles.cardioTile}>
                                <Text className={styles.cardioTileLabel}>{field.label}</Text>
                                <View className={styles.cardioTileValueRow}>
                                  <Input
                                    className={styles.cardioTileInput}
                                    type={field.decimal ? 'digit' : 'number'}
                                    value={raw !== undefined && raw !== 0 ? String(raw) : ''}
                                    placeholder={field.placeholder}
                                    placeholderStyle="color:#4a4a55"
                                    onInput={(event) => {
                                      const text = event.detail.value;
                                      const num = field.decimal
                                        ? parseFloat(text) || 0
                                        : parseInt(text, 10) || 0;
                                      patchSet({ [field.key]: num } as Partial<WorkoutSet>);
                                    }}
                                  />
                                  <Text className={styles.cardioTileUnit}>{field.unit}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                <View className={styles.setActionRow}>
                  <View
                    className={styles.historyBtnWide}
                    onClick={() => openHistory(exercise)}
                  >
                    <Text className={styles.setActionText}>历史日训</Text>
                  </View>
                </View>
                </>
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
                    <View key={`${set.id}-${rowRevision}`} className={styles.setRowWrap}>
                      <SetRow
                        label={labels[setIndex]}
                        set={set}
                        assist={assist}
                        addedMode={addedMode}
                        timed={isTimedExercise(exercise.exerciseId)}
                        onPatch={(patch) => handleSetPatch(exercise, set, patch)}
                        onEditEnd={handleEditEnd}
                        onToggle={() =>
                          handleToggleSet(exercise.key, set.id, set.done, exercise.restSeconds)
                        }
                        onRemove={() =>
                          handleSetRemove(exercise.key, set.id, info ? info.name : '该动作')
                        }
                      />
                      {applyTip &&
                      applyTip.exerciseKey === exercise.key &&
                      applyTip.sourceId === set.id ? (
                        <View className={styles.applyCard}>
                          <Text className={styles.applyCardText}>
                            应用到后续 {applyTip.targetIds.length} 组
                          </Text>
                          <View className={styles.applyOk} onClick={applyToFollowing}>
                            <Text className={styles.applyOkText}>✓</Text>
                          </View>
                          <View className={styles.applyNo} onClick={clearApplyTip}>
                            <Text className={styles.applyNoText}>✕</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ))}

                  <View className={styles.setActionRow}>
                    <View
                      className={styles.historyBtnWide}
                      onClick={() => openHistory(exercise)}
                    >
                      <Text className={styles.setActionText}>历史日训</Text>
                    </View>
                    <View className={styles.addSet} onClick={() => addSetToActive(exercise.key)}>
                      <Text className={styles.setActionText}>+ 添加一组</Text>
                    </View>
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
                  {/* 选填备注：记下动作变形、哪里没夹住这类细节 */}
                  <Textarea
                    className={styles.feelNoteInput}
                    value={exercise.feelNote ?? ''}
                    maxlength={100}
                    autoHeight
                    placeholder="选填：例如第三组第7个、第四组第5个动作变形，肘没夹住"
                    placeholderStyle="color:#4a4a55"
                    onInput={(event) =>
                      patchExerciseInActive(exercise.key, { feelNote: event.detail.value })
                    }
                  />
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

      {/* 动作的「···」菜单 */}
      <ActionSheet
        visible={!!moreExercise}
        items={moreItems}
        danger="删除动作"
        onClose={() => setMoreKey(null)}
        onSelect={(action) => {
          setMoreKey(null);
          runExerciseMore(action);
        }}
      />

      {/* 超级组：训练中把几个动作合并成一组，按顺序连着做 */}
      <SupersetPicker
        visible={supersetOpen}
        exercises={active.exercises}
        onClose={() => setSupersetOpen(false)}
        onConfirm={(keys) => {
          groupSupersetInActive(keys);
          setSupersetOpen(false);
          showToast({ title: '已合并为超级组', icon: 'none' });
        }}
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
            <ScrollView scrollY className={styles.variantScroll}>
            <View className={styles.variantHead}>
              <View className={styles.variantHeadMain}>
                <Text className={styles.variantTitle}>{variantEditName}</Text>
                {supportsEquipmentName(variantEditName) ? (
                  <Input
                    className={styles.variantHeadInput}
                    value={equipmentDraft}
                    maxlength={12}
                    placeholder={equipmentNamePlaceholder(variantEditName)}
                    placeholderStyle="color:#4a4a55"
                    adjustPosition={false}
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
              {/* 备注：所有动作都能写，只影响这一次训练 */}
              <View className={styles.variantRow}>
                <Text className={styles.variantLabel}>备注（选填）</Text>
                <Textarea
                  className={styles.noteInput}
                  value={noteDraft}
                  maxlength={60}
                  autoHeight
                  adjustPosition={false}
                  placeholder="记一句自己的感受，例如：握窄一点更稳"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) => setNoteDraft(event.detail.value)}
                />
              </View>
            </View>

            <View className={styles.variantActions}>
              <View className={styles.variantConfirm} onClick={saveVariantEditor}>
                <Text className={styles.variantConfirmText}>确定</Text>
              </View>
            </View>
            </ScrollView>
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
    </View>
  );
};

export default SessionPage;
