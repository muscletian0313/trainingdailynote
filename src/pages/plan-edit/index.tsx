import React, { useEffect, useState } from 'react';
import { View, Text, Input, Picker, Image } from '@tarojs/components';
import { useRouter, pageScrollTo } from '@tarojs/taro';
import dayjs from 'dayjs';
import {
  navigateBack,
  setNavigationBarTitle,
  showActionSheet,
  showModal,
  showToast
} from '@/utils/taro';
import classnames from 'classnames';
import type { MuscleGroup, PlanExercise, PlanSet } from '@/types';
import {
  DEFAULT_CARDIO_MIN,
  DEFAULT_REPS,
  DEFAULT_WEIGHT,
  MUSCLE_COLORS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  REST_OPTIONS
} from '@/constants';
import { getPlanById, usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { getExerciseById } from '@/store/useExerciseStore';
import { isBodyweight, isPlanFinished, planPrimaryMuscle, recentPerformances } from '@/utils/workout';
import { withAlpha } from '@/utils/format';
import { uid } from '@/utils/id';
import { MUSCLE_ART } from '@/assets/muscles/art';
import Stepper from '@/components/Stepper';
import ExercisePicker from '@/components/ExercisePicker';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

interface MuscleChipProps {
  muscle: MuscleGroup;
  active: boolean;
  /** 主训用实心色块，次训用浅色描边，便于区分主次 */
  solid?: boolean;
  onClick: () => void;
}

const MuscleChip: React.FC<MuscleChipProps> = ({ muscle, active, solid = false, onClick }) => {
  const color = MUSCLE_COLORS[muscle];
  const style = active
    ? solid
      ? { backgroundColor: color, borderColor: color }
      : { backgroundColor: withAlpha(color, 0.18), borderColor: color }
    : undefined;
  const textStyle = active ? { color: solid ? '#101014' : color } : undefined;

  return (
    <View className={styles.muscleChip} style={style} onClick={onClick}>
      <Text className={styles.muscleChipText} style={textStyle}>
        {MUSCLE_LABELS[muscle]}
      </Text>
    </View>
  );
};

interface PlanSetRowProps {
  index: number;
  set: PlanSet;
  bodyweight: boolean;
  onPatch: (patch: Partial<PlanSet>) => void;
  onRemove: () => void;
}

/** 计划里的一行组：逐组填重量 / 次数，方便做递减组 */
const PlanSetRow: React.FC<PlanSetRowProps> = ({
  index,
  set,
  bodyweight,
  onPatch,
  onRemove
}) => {
  const [weightText, setWeightText] = useState(set.weight ? String(set.weight) : '');
  const [repsText, setRepsText] = useState(set.reps ? String(set.reps) : '');

  useEffect(() => {
    setWeightText(set.weight ? String(set.weight) : '');
    setRepsText(set.reps ? String(set.reps) : '');
    // 只在切换不同组时重置输入内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  return (
    <View className={styles.setRow}>
      <Text className={styles.setIndex}>{index}</Text>

      {bodyweight ? (
        <View className={styles.setWeightField}>
          <Text className={styles.setBodyweight}>自重</Text>
        </View>
      ) : (
        <View className={styles.setWeightField}>
          <Input
            className={styles.setInput}
            type="digit"
            value={weightText}
            placeholder="0"
            placeholderStyle="color:#4a4a55"
            onInput={(event) => {
              setWeightText(event.detail.value);
              onPatch({ weight: parseFloat(event.detail.value) || 0 });
            }}
          />
          <Text className={styles.setUnit}>kg</Text>
        </View>
      )}

      <Text className={styles.setTimes}>×</Text>

      <View className={styles.setRepsField}>
        <Input
          className={styles.setInput}
          type="number"
          value={repsText}
          placeholder="0"
          placeholderStyle="color:#4a4a55"
          onInput={(event) => {
            setRepsText(event.detail.value);
            onPatch({ reps: parseInt(event.detail.value, 10) || 0 });
          }}
        />
      </View>

      <View className={styles.setRemove} onClick={onRemove}>
        <Text className={styles.setRemoveText}>✕</Text>
      </View>
    </View>
  );
};

const PlanEditPage: React.FC = () => {
  const router = useRouter();
  const planId = router.params?.id;
  /** 从计划详情页点某个动作进来时，自动滚到那个动作 */
  const focusKey = router.params?.focusKey;
  const addPlan = usePlanStore((state) => state.addPlan);
  const updatePlan = usePlanStore((state) => state.updatePlan);
  const defaultRest = useProfileStore((state) => state.profile.defaultRest);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!planId) {
      setNavigationBarTitle({ title: '新建计划' });
      return;
    }
    setNavigationBarTitle({ title: '编辑计划' });
    const plan = getPlanById(planId);
    if (plan) {
      setName(plan.name);
      setStartDate(plan.startDate || dayjs().format('YYYY-MM-DD'));
      setExercises(plan.exercises);
      // 老计划没显式选过部位，用推断结果预填，玩家不用从零开始选
      setPrimaryMuscle(plan.primaryMuscle ?? planPrimaryMuscle(plan));
      setSecondaryMuscles(plan.secondaryMuscles ?? []);
    } else {
      console.error('[PlanEdit] 未找到计划:', planId);
    }
  }, [planId]);

  // 定位到指定动作：等列表渲染完再滚，否则量不到位置
  useEffect(() => {
    if (!focusKey) return;
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

  const addExercises = (exerciseIds: string[]) => {
    const sessions = useSessionStore.getState().sessions;
    const list: PlanExercise[] = exerciseIds.map((exerciseId) => {
      // 有氧动作只配时长，不涉及重量 / 组数 / 次数
      const cardio = getExerciseById(exerciseId)?.muscle === 'cardio';
      // 自重动作不带重量
      const bodyweight = isBodyweight(exerciseId);
      // 有历史记录：按最近一次训练逐组预填，用户微调即可；没有：默认 1 组自己加
      const lastRecord = recentPerformances(sessions, exerciseId, 1)[0];
      const sets: PlanSet[] = cardio
        ? []
        : lastRecord?.sets.length
          ? lastRecord.sets.map((item) => ({
              id: uid('ps'),
              weight: bodyweight ? 0 : item.weight,
              reps: item.reps || DEFAULT_REPS
            }))
          : [{ id: uid('ps'), weight: bodyweight ? 0 : DEFAULT_WEIGHT, reps: DEFAULT_REPS }];
      return {
        key: uid('pe'),
        exerciseId,
        sets,
        restSeconds: defaultRest,
        targetDurationMin: cardio ? DEFAULT_CARDIO_MIN : undefined
      };
    });
    setExercises((prev) => [...prev, ...list]);
  };

  const updateItem = (key: string, patch: Partial<PlanExercise>) => {
    setExercises((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
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

  const addPlanSet = (key: string) => {
    setExercises((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const last = item.sets[item.sets.length - 1];
        return {
          ...item,
          sets: [
            ...item.sets,
            {
              id: uid('ps'),
              // 沿用上一组的重量/次数，递减组时改一下重量即可
              weight: last ? last.weight : 0,
              reps: last ? last.reps : DEFAULT_REPS
            }
          ]
        };
      })
    );
  };

  const removePlanSet = (key: string, setId: string) => {
    setExercises((prev) =>
      prev.map((item) =>
        item.key === key && item.sets.length > 1
          ? { ...item, sets: item.sets.filter((set) => set.id !== setId) }
          : item
      )
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
        if (res.confirm) setExercises((prev) => prev.filter((item) => item.key !== key));
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
    showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => navigateBack(), 400);
  };

  return (
    <View className={styles.page}>
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
              onClick={() => setPrimaryMuscle(muscle)}
            />
          ))}
        </View>

        <View className={styles.cardDivider} />

        <Text className={styles.fieldLabel}>次训部位</Text>
        <Text className={styles.fieldHint}>可多选，没别的就留空</Text>
        <View className={styles.muscleGrid}>
          {MUSCLE_GROUPS.map((muscle) => (
            <MuscleChip
              key={muscle}
              muscle={muscle}
              active={secondaryMuscles.includes(muscle)}
              onClick={() => toggleSecondary(muscle)}
            />
          ))}
        </View>

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
        const exerciseName = info ? info.name : '未知动作';
        const isCardio = info?.muscle === 'cardio';
        const bodyweight = isBodyweight(item.exerciseId);
        return (
          <View key={item.key} id={`ex-${item.key}`} className={styles.exerciseCard}>
            <View className={styles.exerciseHeader}>
              <View className={styles.orderBadge}>
                <Text className={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View className={styles.exerciseTitleWrap}>
                <Text className={styles.exerciseName}>{exerciseName}</Text>
                <View className={styles.exerciseMeta}>
                  {info ? <MuscleTag muscle={info.muscle} /> : null}
                </View>
              </View>
              <View className={styles.exerciseActions}>
                <View
                  className={classnames(styles.iconBtn, index === 0 && styles.iconBtnDisabled)}
                  onClick={() => index > 0 && moveItem(index, -1)}
                >
                  <Text className={styles.iconBtnText}>↑</Text>
                </View>
                <View
                  className={classnames(
                    styles.iconBtn,
                    index === exercises.length - 1 && styles.iconBtnDisabled
                  )}
                  onClick={() => index < exercises.length - 1 && moveItem(index, 1)}
                >
                  <Text className={styles.iconBtnText}>↓</Text>
                </View>
                <View
                  className={classnames(styles.iconBtn, styles.iconBtnDanger)}
                  onClick={() => removeItem(item.key, exerciseName)}
                >
                  <Text className={styles.iconBtnText}>✕</Text>
                </View>
              </View>
            </View>

            {isCardio ? (
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
                  <Text className={styles.headWeight}>{bodyweight ? '自重' : '重量(kg)'}</Text>
                  <Text className={styles.headTimes} />
                  <Text className={styles.headReps}>次数</Text>
                  <Text className={styles.headRemove} />
                </View>

                {item.sets.map((set, setIndex) => (
                  <PlanSetRow
                    key={set.id}
                    index={setIndex + 1}
                    set={set}
                    bodyweight={bodyweight}
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
            )}
          </View>
        );
      })}

      {exercises.length ? null : (
        <View className={styles.emptyTip}>
          <Text className={styles.emptyText}>还没有动作，点击下方按钮添加</Text>
        </View>
      )}

      <View className={styles.addExercise} onClick={() => setPickerVisible(true)}>
        <Text className={styles.addExerciseText}>+ 添加动作</Text>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.saveBtn} onClick={handleSave}>
          <Text className={styles.saveBtnText}>保存计划</Text>
        </View>
      </View>

      <ExercisePicker
        visible={pickerVisible}
        title={primaryMuscle ? `添加动作 · ${MUSCLE_LABELS[primaryMuscle]}` : '添加动作'}
        confirmText="添加"
        defaultMuscle={primaryMuscle}
        onClose={() => setPickerVisible(false)}
        onConfirm={addExercises}
      />
    </View>
  );
};

export default PlanEditPage;
