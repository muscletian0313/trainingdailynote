import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import type { Exercise, ExerciseVariants, MuscleGroup } from '@/types';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/constants';
import {
  exerciseRegion,
  matchesMuscleFilter,
  REGION_OPTIONS,
  sortBySimilarity,
  useAllExercises
} from '@/store/useExerciseStore';
import {
  defaultVariants,
  hasVariants,
  lockedVariantsOf,
  reconcileVariants,
  variantGroupsOf,
  variantOptionsOf,
  variantRegionOf
} from '@/data/exerciseVariants';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

type MuscleFilter = 'all' | MuscleGroup;

/** 选中的动作：基础动作 +（可选）变式组合 */
export interface PickedExercise {
  exerciseId: string;
  variants?: ExerciseVariants;
}

interface ExercisePickerProps {
  visible: boolean;
  title?: string;
  confirmText?: string;
  /** 打开时默认定位到的肌群（例如计划名称识别出的主训部位） */
  defaultMuscle?: MuscleGroup | null;
  /** 单选模式：点一下即选中并直接确认（用于替换动作） */
  single?: boolean;
  /** 相似度参考的动作 id：把练法相近的动作排到最前面（替换动作时用） */
  similarToId?: string;
  onClose: () => void;
  onConfirm: (items: PickedExercise[]) => void;
}

const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  title = '选择动作',
  confirmText = '添加',
  defaultMuscle = null,
  single = false,
  similarToId,
  onClose,
  onConfirm
}) => {
  const exercises = useAllExercises();
  const [keyword, setKeyword] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>('all');
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  /** 正在挑变式的动作；不为空时显示变式弹层 */
  const [variantTarget, setVariantTarget] = useState<Exercise | null>(null);
  const [variants, setVariants] = useState<ExerciseVariants>({});

  useEffect(() => {
    if (visible) {
      setKeyword('');
      setMuscle(defaultMuscle ?? 'all');
      setPicked([]);
      setVariantTarget(null);
    }
  }, [visible, defaultMuscle]);

  const pickMuscle = (next: MuscleFilter) => {
    setMuscle(next);
  };

  const list = useMemo(() => {
    const text = keyword.trim();
    const filtered = exercises.filter((item) => {
      const matchMuscle = muscle === 'all' || matchesMuscleFilter(item, muscle);
      const matchText = !text || item.name.includes(text);
      return matchMuscle && matchText;
    });
    // 替换动作：把与原动作练法相近的排前面，方便快速找到平替
    const target = similarToId ? exercises.find((item) => item.id === similarToId) : undefined;
    return target ? sortBySimilarity(filtered, target) : filtered;
  }, [exercises, keyword, muscle, similarToId]);

  const toggleSelect = (item: Exercise) => {
    const existing = picked.find((entry) => entry.exerciseId === item.id);
    // 带变式的动作：先弹一层选变式，选完再进已选列表
    if (hasVariants(item.name)) {
      setVariantTarget(item);
      setVariants(existing?.variants ?? defaultVariants(item.name));
      return;
    }
    // 单选模式：点一下直接确认（替换动作时少一步）
    if (single) {
      onConfirm([{ exerciseId: item.id }]);
      onClose();
      return;
    }
    setPicked((prev) =>
      existing
        ? prev.filter((entry) => entry.exerciseId !== item.id)
        : [...prev, { exerciseId: item.id }]
    );
  };

  /** 变式弹层里点「确定」：进已选列表（已存在就更新），或直接替换 */
  const confirmVariant = () => {
    if (!variantTarget) return;
    const entry: PickedExercise = { exerciseId: variantTarget.id, variants };
    setVariantTarget(null);
    if (single) {
      onConfirm([entry]);
      onClose();
      return;
    }
    setPicked((prev) => {
      const hit = prev.findIndex((item) => item.exerciseId === entry.exerciseId);
      if (hit < 0) return [...prev, entry];
      const list = [...prev];
      list[hit] = entry;
      return list;
    });
  };

  /** 变式弹层里点「移除」：把已选里的这个动作去掉 */
  const removeVariantTarget = () => {
    const id = variantTarget?.id;
    setVariantTarget(null);
    if (!id) return;
    setPicked((prev) => prev.filter((entry) => entry.exerciseId !== id));
  };

  const handleConfirm = () => {
    if (!picked.length) {
      onClose();
      return;
    }
    console.info('[ExercisePicker] 选中动作', picked.length, '个');
    onConfirm(picked);
    onClose();
  };

  const editingPicked = !!variantTarget && picked.some((e) => e.exerciseId === variantTarget.id);
  const variantRegion = variantTarget
    ? variantRegionOf(variantTarget.muscle, variants) ?? exerciseRegion(variantTarget)
    : undefined;
  const variantRegionLabel = variantTarget
    ? (REGION_OPTIONS[variantTarget.muscle] ?? []).find((o) => o.region === variantRegion)?.label ??
      ''
    : '';

  if (!visible) return null;

  return (
    <View className={styles.overlay}>
      <View className={styles.mask} onClick={onClose} />
      <View className={styles.panel}>
        <View className={styles.header}>
          <Text className={styles.title}>{title}</Text>
          <View className={styles.close} onClick={onClose}>
            <Text className={styles.closeText}>✕</Text>
          </View>
        </View>

        <View className={styles.searchWrap}>
          <Input
            className={styles.searchInput}
            value={keyword}
            placeholder="搜索动作名称"
            placeholderStyle="color:#6f6f7d"
            confirmType="search"
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <View className={styles.chips}>
          <View
            className={classnames(styles.chip, muscle === 'all' && styles.chipActive)}
            onClick={() => pickMuscle('all')}
          >
            <Text className={classnames(styles.chipText, muscle === 'all' && styles.chipTextActive)}>
              全部
            </Text>
          </View>
          {MUSCLE_GROUPS.map((group) => (
            <View
              key={group}
              className={classnames(styles.chip, muscle === group && styles.chipActive)}
              onClick={() => pickMuscle(group)}
            >
              <Text
                className={classnames(styles.chipText, muscle === group && styles.chipTextActive)}
              >
                {MUSCLE_LABELS[group]}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView scrollY className={styles.list}>
          {list.length ? (
            list.map((item) => {
              const selected = picked.some((entry) => entry.exerciseId === item.id);
              // 筛选状态下：全身动作仍标「全身」，其余按当前挑的部位标注
              // （窄握卧推出现在三头里时就标三头，不会看着别扭）
              const tagMuscle =
                muscle === 'all' || item.muscle === 'fullbody' ? item.muscle : muscle;
              return (
                <View key={item.id} className={styles.item} onClick={() => toggleSelect(item)}>
                  <View className={styles.itemMain}>
                    <Text className={styles.itemName}>{item.name}</Text>
                    <View className={styles.itemMeta}>
                      <MuscleTag muscle={tagMuscle} />
                      <Text className={styles.equipment}>{item.equipment}</Text>
                    </View>
                  </View>
                  <View className={classnames(styles.check, selected && styles.checkActive)}>
                    {selected ? <Text className={styles.checkText}>✓</Text> : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View className={styles.emptyTip}>
              <Text className={styles.emptyText}>没有找到匹配的动作</Text>
            </View>
          )}
        </ScrollView>

        <View className={styles.footer}>
          {single ? (
            <Text className={styles.singleTip}>点一下即可替换</Text>
          ) : (
            <View
              className={classnames(styles.confirm, !picked.length && styles.confirmDisabled)}
              onClick={handleConfirm}
            >
              <Text className={styles.confirmText}>
                {picked.length ? `${confirmText} (${picked.length})` : '请选择动作'}
              </Text>
            </View>
          )}
        </View>

        {/* 变式弹层：握法 / 握距这类选择，选完确定才算选中这个动作 */}
        {variantTarget ? (
          <View className={styles.variantMask} onClick={() => setVariantTarget(null)}>
            <View className={styles.variantSheet} onClick={(event) => event.stopPropagation()}>
              <View className={styles.variantHead}>
                <Text className={styles.variantTitle}>{variantTarget.name}</Text>
                <View className={styles.variantClose} onClick={() => setVariantTarget(null)}>
                  <Text className={styles.variantCloseText}>✕</Text>
                </View>
              </View>

              {variantGroupsOf(variantTarget.name, variants).map((group) => (
                <View key={group.key} className={styles.variantRow}>
                  <Text className={styles.variantLabel}>{group.label}</Text>
                  <View className={styles.variantOptions}>
                    {variantOptionsOf(variantTarget.name, group.key, variants).map((option) => {
                      const active = variants[group.key] === option.key;
                      return (
                        <View
                          key={option.key}
                          className={classnames(
                            styles.variantChip,
                            active && styles.variantChipActive
                          )}
                          onClick={() =>
                            setVariants((prev) =>
                              reconcileVariants(variantTarget.name, {
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

              {/* 写死的变式：灰着显示、点不动，只是让用户看 */}
              {lockedVariantsOf(variantTarget.name, variants).map((item) => (
                <View key={item.groupKey} className={styles.variantRow}>
                  <Text className={styles.variantLabel}>{item.groupLabel}</Text>
                  <View className={styles.variantOptions}>
                    <View className={classnames(styles.variantChip, styles.variantChipLocked)}>
                      <Text className={classnames(styles.variantChipText, styles.variantChipTextLocked)}>
                        {item.optionLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {variantRegionLabel ? (
                <Text className={styles.variantHint}>练到：{variantRegionLabel}</Text>
              ) : null}

              <View className={styles.variantActions}>
                {editingPicked ? (
                  <Text className={styles.variantRemove} onClick={removeVariantTarget}>
                    移除
                  </Text>
                ) : (
                  <View />
                )}
                <View className={styles.variantConfirm} onClick={confirmVariant}>
                  <Text className={styles.variantConfirmText}>{single ? '替换' : '确定'}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default ExercisePicker;
