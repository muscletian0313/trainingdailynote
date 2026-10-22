import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import type { Exercise, ExerciseVariants, MuscleGroup } from '@/types';
import { MUSCLE_GROUPS, MUSCLE_LABELS, supportsEquipmentName } from '@/constants';
import { matchesMuscleFilter, sortBySimilarity, useAllExercises, variantDefaultsFor } from '@/store/useExerciseStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useSessionStore } from '@/store/useSessionStore';
import { equipmentExercisesOf, isEquipmentExercise } from '@/utils/equipmentExercises';
import {
  defaultVariants,
  lockedVariantsOf,
  reconcileVariants,
  variantGroupsOf,
  variantOptionsOf
} from '@/data/exerciseVariants';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

type MuscleFilter = 'all' | MuscleGroup;

function selectableGroupsOf(name: string, variants: ExerciseVariants) {
  return variantGroupsOf(name, variants);
}

/** 选中的动作：基础动作 +（可选）变式组合 +（可选）器械名称 */
export interface PickedExercise {
  exerciseId: string;
  variants?: ExerciseVariants;
  /** 器械名称（选填）：显示成「器械划船（鹦鹉螺）」 */
  equipmentName?: string;
}

/** 已选条目的唯一标识：同一动作可以并存「不填器械名」和「鹦鹉螺」两条 */
function pickKeyOf(exerciseId: string, equipmentName?: string): string {
  return `${exerciseId}::${(equipmentName ?? '').trim()}`;
}

/** 器械名动作（器械划船（鹦鹉螺））走变式 / 名称判断时用基础动作名 */
function variantNameOf(item: Exercise): string {
  return isEquipmentExercise(item) ? item.baseName : item.name;
}

interface ExercisePickerProps {
  visible: boolean;
  title?: string;
  confirmText?: string;
  /** 打开时默认定位到的肌群（例如计划名称识别出的主训部位） */
  defaultMuscle?: MuscleGroup | null;
  /** 单选模式：点一下即选中并直接确认（用于替换动作 / 逐个添加动作） */
  single?: boolean;
  /** 单选模式下底部提示与变式弹层按钮的文案 */
  singleHint?: string;
  singleConfirmText?: string;
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
  singleHint = '点一下即可替换',
  singleConfirmText = '替换',
  similarToId,
  onClose,
  onConfirm
}) => {
  const exercises = useAllExercises();
  const plans = usePlanStore((state) => state.plans);
  const sessions = useSessionStore((state) => state.sessions);
  const [keyword, setKeyword] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>('all');
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  /** 正在挑变式的动作；不为空时显示变式弹层 */
  const [variantTarget, setVariantTarget] = useState<Exercise | null>(null);
  /** 打开弹层时该条目在已选列表里的 key（用于判断是新增还是改已有的） */
  const [variantKey, setVariantKey] = useState('');
  const [variants, setVariants] = useState<ExerciseVariants>({});
  /** 器械名称（选填，只有支持的器械动作才显示输入框） */
  const [equipmentName, setEquipmentName] = useState('');

  useEffect(() => {
    if (visible) {
      setKeyword('');
      setMuscle(defaultMuscle ?? 'all');
      setPicked([]);
      setVariantTarget(null);
      setVariantKey('');
      setEquipmentName('');
    }
  }, [visible, defaultMuscle]);

  const pickMuscle = (next: MuscleFilter) => {
    setMuscle(next);
  };

  /** 用户填过器械名的组合：器械划船 + 鹦鹉螺 = 一个可以再次选择的动作 */
  const equipmentRows = useMemo(
    () => equipmentExercisesOf(plans, sessions, exercises),
    [plans, sessions, exercises]
  );

  /**
   * 每条「动作 + 器械名」组合上次用过的标签：再次选中时直接带回，不用重选。
   * 同名动作改了标签就以最近一次为准（覆盖），改了器械名则算另一条。
   */
  const lastVariants = useMemo(() => {
    const map = new Map<string, { variants: ExerciseVariants; at: number }>();
    const put = (
      exerciseId: string,
      equipmentName: string | undefined,
      variants: ExerciseVariants | undefined,
      at: number
    ) => {
      if (!variants || !Object.keys(variants).length) return;
      const key = pickKeyOf(exerciseId, equipmentName);
      const hit = map.get(key);
      if (hit && hit.at >= at) return;
      map.set(key, { variants, at });
    };
    sessions.forEach((session) => {
      const at = session.endedAt ?? session.startedAt;
      session.exercises.forEach((item) =>
        put(item.exerciseId, item.equipmentName, item.variants, at)
      );
    });
    plans.forEach((plan) => {
      plan.exercises.forEach((item) =>
        put(item.exerciseId, item.equipmentName, item.variants, plan.updatedAt)
      );
    });
    const result = new Map<string, ExerciseVariants>();
    map.forEach((entry, key) => result.set(key, entry.variants));
    return result;
  }, [plans, sessions]);

  const list = useMemo(() => {
    const text = keyword.trim();
    const filtered = exercises.filter((item) => {
      const matchMuscle = muscle === 'all' || matchesMuscleFilter(item, muscle);
      const matchText = !text || item.name.includes(text);
      return matchMuscle && matchText;
    });
    // 替换动作：把与原动作练法相近的排前面，方便快速找到平替
    const target = similarToId ? exercises.find((item) => item.id === similarToId) : undefined;
    if (target) return sortBySimilarity(filtered, target);
    // 添加动作：填过器械名的组合排在这类动作最前面，标「常用」
    const rows = equipmentRows.filter((item) => {
      const matchMuscle = muscle === 'all' || matchesMuscleFilter(item, muscle);
      const matchText = !text || item.name.includes(text);
      return matchMuscle && matchText;
    });
    return [...rows, ...filtered];
  }, [exercises, equipmentRows, keyword, muscle, similarToId]);

  const toggleSelect = (item: Exercise) => {
    const equipmentRow = isEquipmentExercise(item);
    /** 计划 / 记录里存的是基础动作 id，器械名单独存 */
    const baseId = equipmentRow ? item.baseId : item.id;
    const variantName = variantNameOf(item);
    const presetName = equipmentRow ? item.equipmentName : '';
    const existing = picked.find(
      (entry) => pickKeyOf(entry.exerciseId, entry.equipmentName) === pickKeyOf(baseId, presetName)
    );
    // 变式默认值先算好：按当前肌群分类的默认（如三头里的卧推＝平板窄握）优先，
    // 其次沿用上次用过的标签，最后才是动作本身的默认值
    const forced = variantDefaultsFor(variantName, muscle === 'all' ? undefined : muscle);
    // 上次用过的标签按「动作 + 器械名」取，同名的自动沿用
    const remembered = lastVariants.get(pickKeyOf(baseId, presetName));
    const entryVariants =
      existing?.variants ??
      (forced
        ? reconcileVariants(variantName, { ...defaultVariants(variantName), ...forced })
        : remembered
          ? reconcileVariants(variantName, { ...defaultVariants(variantName), ...remembered })
          : defaultVariants(variantName));
    const groups = variantGroupsOf(variantName, entryVariants);
    // 还有要在这一步挑的变式（握法 / 角度等），或需要填器械名称：先弹一层
    if (
      selectableGroupsOf(variantName, entryVariants).length ||
      supportsEquipmentName(variantName)
    ) {
      setVariantTarget(item);
      setVariantKey(pickKeyOf(baseId, existing?.equipmentName ?? presetName));
      setVariants(entryVariants);
      setEquipmentName(existing?.equipmentName ?? presetName);
      return;
    }
    const entry: PickedExercise = {
      exerciseId: baseId,
      variants: groups.length ? entryVariants : undefined,
      equipmentName: presetName || undefined
    };
    // 单选模式：点一下直接确认（替换动作时少一步）
    if (single) {
      onConfirm([entry]);
      onClose();
      return;
    }
    setPicked((prev) =>
      existing
        ? prev.filter(
            (row) => pickKeyOf(row.exerciseId, row.equipmentName) !== pickKeyOf(baseId, presetName)
          )
        : [...prev, entry]
    );
  };

  /** 变式弹层里点「确定」：进已选列表（已存在就更新），或直接替换 */
  const confirmVariant = () => {
    if (!variantTarget) return;
    const entry: PickedExercise = {
      exerciseId: isEquipmentExercise(variantTarget) ? variantTarget.baseId : variantTarget.id,
      variants,
      equipmentName: equipmentName.trim() || undefined
    };
    setVariantTarget(null);
    if (single) {
      onConfirm([entry]);
      onClose();
      return;
    }
    const entryKey = pickKeyOf(entry.exerciseId, entry.equipmentName);
    setPicked((prev) => {
      const hit = prev.findIndex(
        (row) => pickKeyOf(row.exerciseId, row.equipmentName) === variantKey
      );
      if (hit >= 0) {
        const next = [...prev];
        next[hit] = entry;
        return next;
      }
      if (prev.some((row) => pickKeyOf(row.exerciseId, row.equipmentName) === entryKey)) {
        return prev;
      }
      return [...prev, entry];
    });
  };

  /** 变式弹层里点「移除」：把已选里的这个动作去掉 */
  const removeVariantTarget = () => {
    setVariantTarget(null);
    if (!variantKey) return;
    setPicked((prev) =>
      prev.filter((entry) => pickKeyOf(entry.exerciseId, entry.equipmentName) !== variantKey)
    );
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

  const editingPicked =
    !!variantTarget &&
    picked.some((entry) => pickKeyOf(entry.exerciseId, entry.equipmentName) === variantKey);
  /** 器械名动作按基础动作名取变式（器械划船（鹦鹉螺）→ 器械划船） */
  const variantSheetName = variantTarget ? variantNameOf(variantTarget) : '';

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
              const equipmentRow = isEquipmentExercise(item);
              const rowKey = pickKeyOf(
                equipmentRow ? item.baseId : item.id,
                equipmentRow ? item.equipmentName : ''
              );
              const selected = picked.some(
                (entry) => pickKeyOf(entry.exerciseId, entry.equipmentName) === rowKey
              );
              // 筛选状态下：全身动作仍标「全身」，其余按当前挑的部位标注
              // （窄握卧推出现在三头里时就标三头，不会看着别扭）
              const tagMuscle =
                muscle === 'all' || item.muscle === 'fullbody' ? item.muscle : muscle;
              return (
                <View key={item.id} className={styles.item} onClick={() => toggleSelect(item)}>
                  <View className={styles.itemMain}>
                    <View className={styles.itemNameRow}>
                      <Text className={styles.itemName}>{item.name}</Text>
                      {item.isCustom ? <Text className={styles.customBadge}>常用</Text> : null}
                    </View>
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
            <Text className={styles.singleTip}>{singleHint}</Text>
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
                <View className={styles.variantHeadMain}>
                  <Text className={styles.variantTitle}>{variantTarget.name}</Text>
                  {supportsEquipmentName(variantSheetName) ? (
                    <Input
                      className={styles.variantHeadInput}
                      value={equipmentName}
                      maxlength={12}
                      placeholder="选填具体名称。例如鹦鹉螺、海豹划船"
                      placeholderStyle="color:#4a4a55"
                      onInput={(event) => setEquipmentName(event.detail.value)}
                    />
                  ) : null}
                </View>
                <View className={styles.variantClose} onClick={() => setVariantTarget(null)}>
                  <Text className={styles.variantCloseText}>✕</Text>
                </View>
              </View>

              {selectableGroupsOf(variantSheetName, variants).map((group) => (
                <View key={group.key} className={styles.variantRow}>
                  <Text className={styles.variantLabel}>{group.label}</Text>
                  <View className={styles.variantOptions}>
                    {variantOptionsOf(variantSheetName, group.key, variants).map((option) => {
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
                              reconcileVariants(variantSheetName, {
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
              {lockedVariantsOf(variantSheetName, variants).map((item) => (
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

              <View className={styles.variantActions}>
                {editingPicked ? (
                  <Text className={styles.variantRemove} onClick={removeVariantTarget}>
                    移除
                  </Text>
                ) : (
                  <View />
                )}
                <View className={styles.variantConfirm} onClick={confirmVariant}>
                  <Text className={styles.variantConfirmText}>
                    {single ? singleConfirmText : '确定'}
                  </Text>
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
