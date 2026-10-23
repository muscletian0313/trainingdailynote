import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Input, Picker, Image, ScrollView } from '@tarojs/components';
import { useRouter, pageScrollTo, useUnload } from '@tarojs/taro';
import dayjs from 'dayjs';
import {
  setNavigationBarTitle,
  showActionSheet,
  showModal,
  showToast,
  switchTab
} from '@/utils/taro';
import classnames from 'classnames';
import type { ExerciseVariants, MuscleGroup, PlanExercise, PlanSet } from '@/types';
import {
  DEFAULT_CARDIO_MIN,
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  equipmentNamePlaceholder,
  getFeelOption,
  MUSCLE_COLORS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  REST_OPTIONS,
  supportsEquipmentName
} from '@/constants';
import { getPlanById, usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import {
  DEFAULT_HOLD_SECONDS,
  isAddedWeightExercise,
  isAssistExercise,
  isPlanFinished,
  isTimedExercise,
  planPrimaryMuscle,
  recentPerformances,
  recentPerformancesByVariants,
  setLabels
} from '@/utils/workout';
import { estimateStartWeight } from '@/utils/strengthEstimate';
import { withAlpha, formatSetWeight } from '@/utils/format';
import { uid } from '@/utils/id';
import {
  barbellBarWeight,
  hasAddedLoad,
  isDumbbellExercise,
  lockedVariantsOf,
  reconcileVariants,
  variantBadges,
  variantGroupsOf,
  variantOptionsOf
} from '@/data/exerciseVariants';
import { clearPlanDraft, loadPlanDraft, savePlanDraft, type PlanDraft } from '@/utils/planDraft';
import { shareExercisesOf } from '@/utils/planShare';
import { MUSCLE_ART } from '@/assets/muscles/art';
import Stepper from '@/components/Stepper';
import ScrollLock from '@/components/ScrollLock';
import ExercisePicker, { type PickedExercise } from '@/components/ExercisePicker';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

interface MuscleChipProps {
  muscle: MuscleGroup;
  active: boolean;
  /** 主训用实心色块，次训用浅色描边，便于区分主次 */
  solid?: boolean;
  /** 灰掉且不可点（主训已经选过的部位，次训里不能再选） */
  disabled?: boolean;
  onClick: () => void;
}

const MuscleChip: React.FC<MuscleChipProps> = ({
  muscle,
  active,
  solid = false,
  disabled = false,
  onClick
}) => {
  const color = MUSCLE_COLORS[muscle];
  const style = disabled
    ? undefined
    : active
      ? solid
        ? { backgroundColor: color, borderColor: color }
        : { backgroundColor: withAlpha(color, 0.18), borderColor: color }
      : undefined;
  const textStyle = disabled ? undefined : active ? { color: solid ? '#101014' : color } : undefined;

  return (
    <View
      className={classnames(styles.muscleChip, disabled && styles.muscleChipDisabled)}
      style={style}
      onClick={disabled ? undefined : onClick}
    >
      <Text className={styles.muscleChipText} style={textStyle}>
        {MUSCLE_LABELS[muscle]}
      </Text>
    </View>
  );
};

interface PlanSetRowProps {
  /** 组编号文案：普通组「2」，递减组「2-1 递减」 */
  label: string;
  set: PlanSet;
  /** 辅助类动作：重量记负数，输入框前面加「−」 */
  assist?: boolean;
  /** 负重自重动作：输入的是额外负重，总重 = 自重 + 负重 */
  addedMode?: boolean;
  /** 计时类动作（平板支撑）：这一格填的是秒数，不是次数 */
  timed?: boolean;
  onPatch: (patch: Partial<PlanSet>) => void;
  onRemove: () => void;
}

/** 计划里的一行组：逐组填重量 / 次数，方便做递减组 */
const PlanSetRow: React.FC<PlanSetRowProps> = ({
  label,
  set,
  assist = false,
  addedMode = false,
  timed = false,
  onPatch,
  onRemove
}) => {
  const bodyWeight = useProfileStore((state) => state.profile.weight ?? 0);

  /** 负重档填的是「额外负重」，其余填的是重量本身（辅助类是绝对值） */
  const toText = (item: PlanSet) => {
    if (addedMode) return item.addedWeight ? String(item.addedWeight) : '';
    return item.weight ? String(Math.abs(item.weight)) : '';
  };

  const [weightText, setWeightText] = useState(() => toText(set));
  const [repsText, setRepsText] = useState(set.reps ? String(set.reps) : '');

  useEffect(() => {
    setWeightText(toText(set));
    setRepsText(set.reps ? String(set.reps) : '');
    // 只在切换不同组时重置输入内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  return (
    <View className={classnames(styles.setRow, set.drop && styles.setRowDrop)}>
      <Text className={classnames(styles.setIndex, set.drop && styles.setIndexDrop)}>
        {label}
      </Text>

      <View className={styles.setWeightField}>
        {assist || addedMode ? (
          <Text className={styles.setSign}>
            {assist ? '−' : bodyWeight > 0 ? `${bodyWeight}+` : '+'}
          </Text>
        ) : null}
        <Input
          className={styles.setInput}
          type="digit"
          value={weightText}
          placeholder="0"
          placeholderStyle="color:#4a4a55"
          onInput={(event) => {
            setWeightText(event.detail.value);
            const num = parseFloat(event.detail.value) || 0;
            if (addedMode) {
              onPatch({ addedWeight: num, weight: bodyWeight + num });
              return;
            }
            onPatch({ weight: assist ? -Math.abs(num) : num });
          }}
        />
        <Text className={styles.setUnit}>kg</Text>
      </View>

      <Text className={styles.setTimes}>×</Text>

      <View className={styles.setRepsField}>
        <Input
          className={styles.setInput}
          type="number"
          value={repsText}
          placeholder={timed ? '60' : '0'}
          placeholderStyle="color:#4a4a55"
          onInput={(event) => {
            setRepsText(event.detail.value);
            onPatch({ reps: parseInt(event.detail.value, 10) || 0 });
          }}
        />
        {timed ? <Text className={styles.setUnit}>秒</Text> : null}
      </View>

      <View className={styles.setRemove} onClick={onRemove}>
        <Text className={styles.setRemoveText}>✕</Text>
      </View>
    </View>
  );
};

/** 边填边存的防抖间隔 */
const DRAFT_SAVE_DELAY = 600;

/** 历史日训的日期显示：今天 / 昨天 / M月D日 */
function formatHistoryDate(timestamp: number): string {
  const day = dayjs(timestamp);
  const today = dayjs();
  if (day.isSame(today, 'day')) return '今天';
  if (day.isSame(today.subtract(1, 'day'), 'day')) return '昨天';
  return day.format('M月D日');
}

const PlanEditPage: React.FC = () => {
  const router = useRouter();
  const planId = router.params?.id;
  /** 从计划详情点「复制计划」进来：带着原计划内容，保存后才落库 */
  const copyFromId = router.params?.copyFrom;
  /** 从计划详情页点某个动作进来时，自动滚到那个动作 */
  const focusKey = router.params?.focusKey;
  const addPlan = usePlanStore((state) => state.addPlan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const defaultRest = useProfileStore((state) => state.profile.defaultRest);
  const profile = useProfileStore((state) => state.profile);
  const sessions = useSessionStore((state) => state.sessions);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  /** 次训部位默认收起，没选就直接不占空间 */
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  /** 上一次自动填进去的名称：名称还是它（或空）时，换主训部位可以整体替换 */
  const autoNameRef = useRef('');
  const [pickerVisible, setPickerVisible] = useState(false);
  /** 当前展开编辑的动作 key：其余动作自动折叠，避免一次性占满屏幕 */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  /** 是否恢复了上次没写完的草稿（仅新建计划） */
  const [draftRestored, setDraftRestored] = useState(false);
  /** 正在修改标签（变式 / 器械名称）的动作 key */
  const [variantEditKey, setVariantEditKey] = useState<string | null>(null);
  const [variantDraft, setVariantDraft] = useState<ExerciseVariants>({});
  const [equipmentDraft, setEquipmentDraft] = useState('');
  /** 正在替换的动作 key：打开选动作弹层，选完换掉这个动作 */
  const [replaceKey, setReplaceKey] = useState<string | null>(null);
  /** 正在看历史日训的动作 key */
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  /** 只有新建计划需要草稿：编辑已有计划时原始数据本来就在本地 */
  const isDraftMode = !planId;
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 首帧不写草稿，避免把恢复前的空状态覆盖上去 */
  const draftReady = useRef(false);
  /** 当前填写内容的快照，供自动保存与退出兜底使用（避免闭包读到旧值） */
  const draftRef = useRef<PlanDraft>({
    name: '',
    startDate: '',
    primaryMuscle: null,
    secondaryMuscles: [],
    exercises: []
  });
  draftRef.current = { name, startDate, primaryMuscle, secondaryMuscles, exercises };

  /** 已经正式保存过：卸载时就别再写草稿了 */
  const savedRef = useRef(false);

  /** 有内容才留草稿，避免存下一份空白草稿 */
  const hasDraftContent = () =>
    !!draftRef.current.name.trim() ||
    draftRef.current.exercises.length > 0 ||
    !!draftRef.current.primaryMuscle;

  const persistDraft = () => {
    if (!isDraftMode || savedRef.current || !hasDraftContent()) return;
    savePlanDraft(draftRef.current);
  };

  /** 清空草稿，回到空白的新建页 */
  const discardDraft = () => {
    clearPlanDraft();
    setName('');
    setStartDate(dayjs().format('YYYY-MM-DD'));
    setExercises([]);
    setPrimaryMuscle(null);
    setSecondaryMuscles([]);
    setDraftRestored(false);
  };

  /** 返回键 / 意外退出时兜底写一次，防止防抖还没触发就丢了 */
  useUnload(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    persistDraft();
  });

  // 边填边存草稿（防抖），退出后再进来就能接着填
  useEffect(() => {
    if (!isDraftMode) return undefined;
    if (!draftReady.current) {
      draftReady.current = true;
      return undefined;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(persistDraft, DRAFT_SAVE_DELAY);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftMode, name, startDate, exercises, primaryMuscle, secondaryMuscles]);

  useEffect(() => {
    if (!planId) {
      // 复制计划：把原计划内容带进来，当成新建计划；不保存就只会留下草稿
      if (copyFromId) {
        setNavigationBarTitle({ title: '复制计划' });
        const source = getPlanById(copyFromId);
        if (source) {
          // 已经执行过：按那次实际练的内容复制；没执行过：直接复制计划模板
          const record = sessions.find((item) => item.planId === source.id);
          const sourceExercises = record ? shareExercisesOf(source, record) : source.exercises;
          setName(source.name);
          setStartDate(dayjs().format('YYYY-MM-DD'));
          const copied = sourceExercises.map((item) => ({
            ...item,
            key: uid('pe'),
            variants: item.variants ? { ...item.variants } : undefined,
            sets: item.sets.map((set) => ({ ...set, id: uid('ps') }))
          }));
          setExercises(copied);
          setActiveKey(copied[0]?.key ?? null);
          setPrimaryMuscle(source.primaryMuscle ?? planPrimaryMuscle(source));
          setSecondaryMuscles(source.secondaryMuscles ?? []);
        } else {
          console.error('[PlanEdit] 复制的原计划不存在:', copyFromId);
        }
        return;
      }
      setNavigationBarTitle({ title: '新建计划' });
      const draft = loadPlanDraft();
      if (draft) {
        setName(draft.name);
        setStartDate(draft.startDate || dayjs().format('YYYY-MM-DD'));
        setExercises(draft.exercises);
        setActiveKey(draft.exercises[0]?.key ?? null);
        setPrimaryMuscle(draft.primaryMuscle);
        setSecondaryMuscles(draft.secondaryMuscles);
        setDraftRestored(true);
      }
      return;
    }
    setNavigationBarTitle({ title: '编辑计划' });
    const plan = getPlanById(planId);
    if (plan) {
      setName(plan.name);
      setStartDate(plan.startDate || dayjs().format('YYYY-MM-DD'));
      setExercises(plan.exercises);
      setActiveKey(plan.exercises[0]?.key ?? null);
      // 老计划没显式选过部位，用推断结果预填，玩家不用从零开始选
      setPrimaryMuscle(plan.primaryMuscle ?? planPrimaryMuscle(plan));
      setSecondaryMuscles(plan.secondaryMuscles ?? []);
    } else {
      console.error('[PlanEdit] 未找到计划:', planId);
    }
  }, [planId, copyFromId]);

  // 定位到指定动作：先展开它，等列表渲染完再滚，否则量不到位置
  useEffect(() => {
    if (!focusKey) return;
    setActiveKey(focusKey);
    const timer = setTimeout(() => {
      pageScrollTo({ selector: `#ex-${focusKey}`, duration: 300 });
    }, 350);
    return () => clearTimeout(timer);
  }, [focusKey]);

  /** 切换次训部位（可多选） */
  const toggleSecondary = (muscle: MuscleGroup) => {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((item) => item !== muscle) : [...prev, muscle]
    );
  };

  /**
   * 选主训部位：忘了写计划名称就顺手填上（名称被自己改过就不动）。
   * 次训里同一个部位只是变灰不可点，不再自动移除，避免界面跳动。
   */
  const pickPrimary = (muscle: MuscleGroup) => {
    setPrimaryMuscle(muscle);
    setName((prev) => {
      const untouched = !prev.trim() || prev === autoNameRef.current;
      if (!untouched) return prev;
      autoNameRef.current = MUSCLE_LABELS[muscle];
      return autoNameRef.current;
    });
  };

  /** 把一个选中的动作组装成计划里的一条：按历史 / 默认值预填重量与组数 */
  const buildPlanExercise = ({ exerciseId, variants, equipmentName }: PickedExercise): PlanExercise => {
    const sessions = useSessionStore.getState().sessions;
    // 有氧动作只配时长，不涉及重量 / 组数 / 次数
    const cardio = getExerciseById(exerciseId)?.muscle === 'cardio';
    // 计时类动作（平板支撑）填的是秒数，默认给 60 秒
    const repsDefault = isTimedExercise(exerciseId) ? DEFAULT_HOLD_SECONDS : DEFAULT_REPS;
    // 没历史记录时的默认重量：
    // 自重动作（引体 / 双杠）带出用户体重；其余按问卷预估一个起步重量
    const fallbackWeight = isAddedWeightExercise(exerciseId)
      ? profile.weight ?? 0
      : estimateStartWeight(exerciseId, profile, { reps: DEFAULT_REPS, variants }) ??
        (isAssistExercise(exerciseId) ? -DEFAULT_WEIGHT : DEFAULT_WEIGHT);
    // 有历史记录：按最近一次训练逐组预填，用户微调即可；没有：默认 1 组自己加
    const lastRecord = recentPerformances(sessions, exerciseId, 1)[0];
    const sets: PlanSet[] = cardio
      ? []
      : lastRecord?.sets.length
        ? lastRecord.sets.map((item) => ({
            id: uid('ps'),
            weight: item.weight,
            reps: item.reps || repsDefault,
            drop: item.drop
          }))
        : [{ id: uid('ps'), weight: fallbackWeight, reps: repsDefault }];
    return {
      key: uid('pe'),
      exerciseId,
      variants,
      equipmentName,
      sets,
      restSeconds: defaultRest,
      targetDurationMin: cardio ? DEFAULT_CARDIO_MIN : undefined
    };
  };

  const addExercises = (items: PickedExercise[]) => {
    const built = items.map(buildPlanExercise);
    if (!built.length) return;
    setExercises((prev) => [...prev, ...built]);
    // 一次只加一个：新加的动作自动展开，其余动作折叠
    const last = built[built.length - 1];
    setActiveKey(last.key);
    setTimeout(() => pageScrollTo({ selector: `#ex-${last.key}`, duration: 300 }), 250);
  };

  /** 替换某个动作：保持原位、保留原来设置的组间休息 */
  const replaceItem = (key: string, picked: PickedExercise) => {
    setExercises((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...buildPlanExercise(picked), key, restSeconds: item.restSeconds }
          : item
      )
    );
  };

  const updateItem = (key: string, patch: Partial<PlanExercise>) => {
    setExercises((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  /** 打开标签编辑器：变式 + 器械名称 */
  const openVariantEditor = (item: PlanExercise) => {
    const exerciseName = getExerciseById(item.exerciseId)?.name ?? '';
    setVariantEditKey(item.key);
    setVariantDraft(reconcileVariants(exerciseName, { ...(item.variants ?? {}) }));
    setEquipmentDraft(item.equipmentName ?? '');
  };

  /** 标签编辑器里点「确定」：写回动作 */
  const saveVariantEditor = () => {
    const item = exercises.find((entry) => entry.key === variantEditKey);
    if (!item) return;
    const exerciseName = getExerciseById(item.exerciseId)?.name ?? '';
    updateItem(item.key, {
      variants: reconcileVariants(exerciseName, variantDraft),
      equipmentName: equipmentDraft.trim() || undefined
    });
    setVariantEditKey(null);
  };

  /** 计划内某组的增删改（逐组配置，支持递减组） */
  const updatePlanSet = (key: string, setId: string, patch: Partial<PlanSet>) => {
    setExercises((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              sets: item.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set))
            }
          : item
      )
    );
  };

  /**
   * 添加一组：如果最后一组是递减链（1-1、1-2…），
   * 就整条链复制一份（2-1、2-2…），重量次数原样带过来；
   * 最后一组是普通组时，只加一个普通组。
   */
  const addPlanSet = (key: string) => {
    setExercises((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (!item.sets.length) {
          return { ...item, sets: [{ id: uid('ps'), weight: 0, reps: DEFAULT_REPS }] };
        }
        // 找到最后一组所在递减链的基础组
        let chainStart = item.sets.length - 1;
        while (chainStart > 0 && item.sets[chainStart].drop) chainStart -= 1;
        const copies: PlanSet[] = item.sets.slice(chainStart).map((set) => ({
          id: uid('ps'),
          weight: set.weight,
          addedWeight: set.addedWeight,
          reps: set.reps,
          drop: set.drop
        }));
        return { ...item, sets: [...item.sets, ...copies] };
      })
    );
  };

  const removePlanSet = (key: string, setId: string) => {
    setExercises((prev) =>
      prev.map((item) => {
        if (item.key !== key || item.sets.length <= 1) return item;
        const index = item.sets.findIndex((set) => set.id === setId);
        if (index < 0) return item;
        // 删基础组时，跟着的递减组一起删
        let end = index + 1;
        if (!item.sets[index].drop) {
          while (item.sets[end]?.drop) end += 1;
        }
        const sets = [...item.sets.slice(0, index), ...item.sets.slice(end)];
        return sets.length ? { ...item, sets } : item;
      })
    );
  };

  /** 点某一组的 ✕：还有别的组就删这一组，只剩这一组时等同于删除整个动作 */
  const handleSetRemove = (key: string, setId: string, exerciseName: string) => {
    const item = exercises.find((exercise) => exercise.key === key);
    if (!item) return;
    if (item.sets.length > 1) {
      removePlanSet(key, setId);
      return;
    }
    removeItem(key, exerciseName);
  };

  const removeItem = (key: string, exerciseName: string) => {
    showModal({
      title: '删除动作',
      content: `确定从计划中移除「${exerciseName}」吗？`,
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        setExercises((prev) => prev.filter((item) => item.key !== key));
        if (activeKey === key) setActiveKey(null);
      }
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const list = [...prev];
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const selectRest = (key: string, current: number) => {
    const itemList = REST_OPTIONS.map((item) => `${item} 秒${item === current ? '（当前）' : ''}`);
    showActionSheet({
      itemList,
      success: (res) => updateItem(key, { restSeconds: REST_OPTIONS[res.tapIndex] })
    });
  };

  /** 添加递减组：直接在最后一行下面加一条，重量/次数沿用上一行 */
  const addDropSet = (item: PlanExercise) => {
    setExercises((prev) =>
      prev.map((entry) => {
        if (entry.key !== item.key) return entry;
        const last = entry.sets[entry.sets.length - 1];
        if (!last) return entry;
        const dropSet: PlanSet = {
          id: uid('ps'),
          weight: last.weight,
          addedWeight: last.addedWeight,
          reps: last.reps,
          drop: true
        };
        return { ...entry, sets: [...entry.sets, dropSet] };
      })
    );
  };

  /** 动作右上角的「···」：和开始训练后的菜单保持一致 */
  const handleItemMore = (
    item: PlanExercise,
    index: number,
    exerciseName: string,
    isCardio: boolean
  ) => {
    // 有氧动作不设组间休息，也没有递减组
    const itemList = isCardio
      ? ['替换动作', '上移', '下移', '删除动作']
      : ['替换动作', '上移', '下移', '设置组间休息', '添加递减组', '删除动作'];
    showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex];
        if (action === '替换动作') {
          setActiveKey(item.key);
          setReplaceKey(item.key);
          return;
        }
        if (action === '上移') {
          if (index === 0) {
            showToast({ title: '已经是第一个动作', icon: 'none' });
            return;
          }
          moveItem(index, -1);
          return;
        }
        if (action === '下移') {
          if (index === exercises.length - 1) {
            showToast({ title: '已经是最后一个动作', icon: 'none' });
            return;
          }
          moveItem(index, 1);
          return;
        }
        if (action === '设置组间休息') {
          setActiveKey(item.key);
          selectRest(item.key, item.restSeconds);
          return;
        }
        if (action === '添加递减组') {
          setActiveKey(item.key);
          addDropSet(item);
          return;
        }
        removeItem(item.key, exerciseName);
      }
    });
  };

  const handleSave = () => {
    // 已完成的计划只读：正常入口已全部禁用编辑，这里兜底防止直链进入后误改
    if (planId && isPlanFinished(useSessionStore.getState().sessions, planId)) {
      showToast({ title: '计划已完成，不能再修改', icon: 'none' });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }
    if (!primaryMuscle) {
      showToast({ title: '请选择主训部位', icon: 'none' });
      return;
    }
    if (!exercises.length) {
      showToast({ title: '请至少添加一个动作', icon: 'none' });
      return;
    }
    // 次训里若重复选了主训，保存时去掉
    const secondary = secondaryMuscles.filter((muscle) => muscle !== primaryMuscle);
    if (planId) {
      const current = getPlanById(planId);
      updatePlan({
        id: planId,
        name: trimmed,
        startDate,
        exercises,
        createdAt: current?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        primaryMuscle,
        secondaryMuscles: secondary
      });
      console.info('[PlanEdit] 更新计划', planId);
    } else {
      addPlan({
        id: uid('plan'),
        name: trimmed,
        startDate,
        exercises,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        primaryMuscle,
        secondaryMuscles: secondary
      });
      console.info('[PlanEdit] 新建计划', trimmed);
    }
    // 正式保存成功：草稿使命结束，卸载时也不要再写回去
    savedRef.current = true;
    if (isDraftMode) clearPlanDraft();
    showToast({ title: '已保存', icon: 'success' });
    // 复制计划保存后回计划列表；其余保存后照旧回首页
    setTimeout(
      () => switchTab({ url: copyFromId ? '/pages/plans/index' : '/pages/home/index' }),
      400
    );
  };

  // 标签编辑器：当前正在改的动作
  const variantEditItem = variantEditKey
    ? exercises.find((entry) => entry.key === variantEditKey)
    : undefined;
  const variantEditInfo = variantEditItem ? getExerciseById(variantEditItem.exerciseId) : undefined;
  const variantEditName = variantEditInfo ? variantEditInfo.name : '';
  const variantEditGroups = variantEditItem
    ? variantGroupsOf(variantEditName, variantDraft)
    : [];

  // 替换动作：参照当前动作的肌群与练法做推荐
  const replaceTarget = exercises.find((entry) => entry.key === replaceKey);
  const replaceInfo = replaceTarget ? getExerciseById(replaceTarget.exerciseId) : undefined;

  /** 历史日训：当前查看的动作 + 最近 4 次记录（时间倒序） */
  const historyItem = exercises.find((item) => item.key === historyKey) ?? null;
  const historyInfo = historyItem ? getExerciseById(historyItem.exerciseId) : undefined;
  const historyRecords = historyItem
    ? recentPerformancesByVariants(sessions, historyItem.exerciseId, historyItem.variants, 4)
    : [];

  return (
    <View className={styles.page}>
      {/* 任一浮层打开时锁住页面滚动，避免滑动遮罩/缝隙把底下的画布一起滚 */}
      <ScrollLock lock={pickerVisible || !!replaceKey || !!variantEditKey || !!historyKey} />
      {draftRestored && (
        <View className={styles.draftBar}>
          <Text className={styles.draftBarText}>草稿已恢复，接着填就行</Text>
          <Text className={styles.draftBarAction} onClick={discardDraft}>
            清空
          </Text>
        </View>
      )}

      <View className={styles.card}>
        <Text className={styles.fieldLabel}>计划名称</Text>
        <Input
          className={styles.nameInput}
          value={name}
          maxlength={16}
          placeholder="随便起，例如：背容量组+二头"
          placeholderStyle="color:#6f6f7d"
          onInput={(event) => setName(event.detail.value)}
        />
        <Text className={styles.fieldHint}>名称随意填，训练部位在下面单独选</Text>

        <View className={styles.cardDivider} />

        <View className={styles.muscleHead}>
          <View className={styles.muscleHeadText}>
            <Text className={styles.fieldLabel}>主训部位</Text>
            <Text className={styles.fieldHint}>必选 · 决定计划详情页展示的训练部位图</Text>
          </View>
          {primaryMuscle ? (
            <Image className={styles.muscleArt} src={MUSCLE_ART[primaryMuscle]} mode="aspectFit" />
          ) : null}
        </View>
        <View className={styles.muscleGrid}>
          {MUSCLE_GROUPS.map((muscle) => (
            <MuscleChip
              key={muscle}
              muscle={muscle}
              solid
              active={primaryMuscle === muscle}
              onClick={() => pickPrimary(muscle)}
            />
          ))}
        </View>

        <View className={styles.cardDivider} />

        <View className={styles.secondaryHead} onClick={() => setSecondaryOpen((prev) => !prev)}>
          <View className={styles.muscleHeadText}>
            <Text className={styles.fieldLabel}>次训部位</Text>
            {secondaryMuscles.length ? (
              <Text className={styles.fieldHint}>
                {secondaryMuscles.map((muscle) => MUSCLE_LABELS[muscle]).join(' · ')}
              </Text>
            ) : (
              <Text className={styles.fieldHint}>可多选，没别的就留空</Text>
            )}
          </View>
          <Text className={styles.secondaryToggle}>{secondaryOpen ? '收起' : '＋'}</Text>
        </View>
        {secondaryOpen ? (
          <View className={styles.muscleGrid}>
            {MUSCLE_GROUPS.map((muscle) => (
              <MuscleChip
                key={muscle}
                muscle={muscle}
                active={secondaryMuscles.includes(muscle)}
                disabled={primaryMuscle === muscle}
                onClick={() => toggleSecondary(muscle)}
              />
            ))}
          </View>
        ) : null}

        <View className={styles.cardDivider} />

        <Picker
          mode="date"
          value={startDate}
          start="2020-01-01"
          end="2035-12-31"
          onChange={(event) => setStartDate(event.detail.value)}
        >
          <View className={styles.configRow}>
            <Text className={styles.configLabel}>计划开始日期</Text>
            <View className={styles.configValue}>
              <Text className={styles.configValueText}>
                {dayjs(startDate).format('YYYY年M月D日')}
              </Text>
              <Text className={styles.configArrow}>›</Text>
            </View>
          </View>
        </Picker>
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>动作</Text>
        <Text className={styles.sectionExtra}>
          {exercises.length} 个 · {exercises.reduce((sum, item) => sum + item.sets.length, 0)} 组
        </Text>
      </View>

      {exercises.map((item, index) => {
        const info = getExerciseById(item.exerciseId);
        const exerciseName = info ? info.name : '已下架';
        const muscleTag = info ? exerciseMuscleTag(info, item.variants) : undefined;
        const badges = variantBadges(exerciseName, item.variants);
        /** 组编号：普通组 1、2；递减组 2-1 递减 / 2-2 递减 */
        const labels = setLabels(item.sets);
        const isCardio = info?.muscle === 'cardio';
        const assist = isAssistExercise(item.exerciseId);
        const addedMode = hasAddedLoad(item.variants);
        // 杠铃类动作固定按「杆+总杠铃片」记重，杆重按杠铃 / 小直杠 区分
        const barbellLoad = barbellBarWeight(exerciseName, item.variants);
        // 哑铃类动作按单只哑铃记重
        const dumbbellLoad = isDumbbellExercise(exerciseName, item.variants);
        // 标签区可点开修改
        const editableGroups = variantGroupsOf(exerciseName, item.variants);
        const editableTags = editableGroups.length > 0 || supportsEquipmentName(exerciseName);
        // 折叠状态：只留标题行，点一下展开（同时折叠其他动作）
        const isOpen = activeKey === item.key;
        return (
          <View
            key={item.key}
            id={`ex-${item.key}`}
            className={classnames(styles.exerciseCard, !isOpen && styles.exerciseCardCollapsed)}
          >
            <View
              className={styles.exerciseHeader}
              onClick={() => setActiveKey(isOpen ? null : item.key)}
            >
              <View className={styles.orderBadge}>
                <Text className={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View className={styles.exerciseTitleWrap}>
                <View className={styles.exerciseNameRow}>
                  <Text
                    className={styles.exerciseName}
                    onClick={
                      editableTags
                        ? (event) => {
                            event.stopPropagation();
                            if (!isOpen) {
                              setActiveKey(item.key);
                              return;
                            }
                            openVariantEditor(item);
                          }
                        : undefined
                    }
                  >
                    {exerciseName}
                    {item.equipmentName ? `（${item.equipmentName}）` : ''}
                  </Text>
                </View>
                {editableTags ? (
                  <View
                    className={styles.exerciseMeta}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isOpen) {
                        setActiveKey(item.key);
                        return;
                      }
                      openVariantEditor(item);
                    }}
                  >
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
                  </View>
                ) : null}
              </View>
              {/* 右侧竖排：训练部位在最上面，和「···」右边缘对齐 */}
              <View className={styles.exerciseSide}>
                {muscleTag ? (
                  <MuscleTag
                    muscle={muscleTag.muscle}
                    label={muscleTag.label}
                    className={styles.exerciseSideTag}
                  />
                ) : null}
                <View className={styles.exerciseActions}>
                  <View
                    className={styles.historyBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      setHistoryKey(item.key);
                    }}
                  >
                    <Text className={styles.historyBtnText}>历史日训</Text>
                  </View>
                  <View
                    className={styles.iconBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleItemMore(item, index, exerciseName, isCardio);
                    }}
                  >
                    <Text className={styles.iconBtnText}>···</Text>
                  </View>
                </View>
              </View>
            </View>

            {isOpen ? (
              isCardio ? (
              <View className={styles.configRow}>
                <Text className={styles.configLabel}>时长</Text>
                <Stepper
                  value={item.targetDurationMin ?? DEFAULT_CARDIO_MIN}
                  min={5}
                  max={300}
                  step={5}
                  suffix="分钟"
                  editable
                  onChange={(value) => updateItem(item.key, { targetDurationMin: value })}
                />
              </View>
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
                    {isTimedExercise(item.exerciseId) ? '秒数' : '次数'}
                  </Text>
                  <Text className={styles.headRemove} />
                </View>

                {item.sets.map((set, setIndex) => (
                  <PlanSetRow
                    key={set.id}
                    label={labels[setIndex]}
                    set={set}
                    assist={assist}
                    addedMode={addedMode}
                    timed={isTimedExercise(item.exerciseId)}
                    onPatch={(patch) => updatePlanSet(item.key, set.id, patch)}
                    onRemove={() => handleSetRemove(item.key, set.id, exerciseName)}
                  />
                ))}

                <View className={styles.addSet} onClick={() => addPlanSet(item.key)}>
                  <Text className={styles.addSetText}>+ 添加一组</Text>
                </View>

                <View
                  className={styles.configRow}
                  onClick={() => selectRest(item.key, item.restSeconds)}
                >
                  <Text className={styles.configLabel}>组间休息</Text>
                  <View className={styles.configValue}>
                    <Text className={styles.configValueText}>{item.restSeconds} 秒</Text>
                    <Text className={styles.configArrow}>›</Text>
                  </View>
                </View>
              </>
              )
            ) : null}
          </View>
        );
      })}

      {exercises.length ? null : (
        <View className={styles.emptyTip}>
          <Text className={styles.emptyText}>还没有动作，点击下方按钮添加</Text>
        </View>
      )}

      <View className={styles.bottomBar}>
        <View className={styles.addBtn} onClick={() => setPickerVisible(true)}>
          <Text className={styles.addBtnText}>添加动作</Text>
        </View>
        <View className={styles.saveBtn} onClick={handleSave}>
          <Text className={styles.saveBtnText}>保存计划</Text>
        </View>
      </View>

      {/* 标签编辑器：点动作名下面的标签打开，改完点确定 */}
      {variantEditItem ? (
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
                      className={classnames(
                        styles.variantChipText,
                        styles.variantChipTextLocked
                      )}
                    >
                      {locked.optionLabel}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            </View>

            {/* 底部固定行：确定在最右边 */}
            <View className={styles.variantActions}>
              <View className={styles.variantConfirm} onClick={saveVariantEditor}>
                <Text className={styles.variantConfirmText}>确定</Text>
              </View>
            </View>
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* 历史日训：该动作最近 4 次记录（时间倒序），带当次动作心得 */}
      {historyItem ? (
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

      <ExercisePicker
        visible={pickerVisible}
        single
        singleHint="点一下即可添加，一次加一个"
        singleConfirmText="添加"
        title={primaryMuscle ? `添加动作 · ${MUSCLE_LABELS[primaryMuscle]}` : '添加动作'}
        confirmText="添加"
        defaultMuscle={primaryMuscle}
        onClose={() => setPickerVisible(false)}
        onConfirm={addExercises}
      />

      {/* 替换动作：默认同部位 + 相近动作排前面，点一下即替换 */}
      <ExercisePicker
        visible={!!replaceKey}
        single
        title="替换动作"
        defaultMuscle={replaceInfo?.muscle ?? null}
        similarToId={replaceTarget?.exerciseId}
        onClose={() => setReplaceKey(null)}
        onConfirm={(items) => {
          const picked = items[0];
          if (replaceKey && picked) replaceItem(replaceKey, picked);
          setReplaceKey(null);
        }}
      />
    </View>
  );
};

export default PlanEditPage;
