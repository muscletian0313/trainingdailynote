import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import type { MuscleGroup } from '@/types';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/constants';
import { sortBySimilarity, useAllExercises } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

type MuscleFilter = 'all' | MuscleGroup;

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
  onConfirm: (exerciseIds: string[]) => void;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setKeyword('');
      setMuscle(defaultMuscle ?? 'all');
      setSelectedIds([]);
    }
  }, [visible, defaultMuscle]);

  const list = useMemo(() => {
    const text = keyword.trim();
    const filtered = exercises.filter((item) => {
      const matchMuscle = muscle === 'all' || item.muscle === muscle;
      const matchText = !text || item.name.includes(text);
      return matchMuscle && matchText;
    });
    // 替换动作：把与原动作练法相近的排前面，方便快速找到平替
    const target = similarToId ? exercises.find((item) => item.id === similarToId) : undefined;
    return target ? sortBySimilarity(filtered, target) : filtered;
  }, [exercises, keyword, muscle, similarToId]);

  const toggleSelect = (id: string) => {
    // 单选模式：点一下直接确认（替换动作时少一步）
    if (single) {
      onConfirm([id]);
      onClose();
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!selectedIds.length) {
      onClose();
      return;
    }
    console.info('[ExercisePicker] 选中动作', selectedIds.length, '个');
    onConfirm(selectedIds);
    onClose();
  };

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
            onClick={() => setMuscle('all')}
          >
            <Text className={classnames(styles.chipText, muscle === 'all' && styles.chipTextActive)}>
              全部
            </Text>
          </View>
          {MUSCLE_GROUPS.map((group) => (
            <View
              key={group}
              className={classnames(styles.chip, muscle === group && styles.chipActive)}
              onClick={() => setMuscle(group)}
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
              const selected = selectedIds.includes(item.id);
              return (
                <View key={item.id} className={styles.item} onClick={() => toggleSelect(item.id)}>
                  <View className={styles.itemMain}>
                    <Text className={styles.itemName}>{item.name}</Text>
                    <View className={styles.itemMeta}>
                      <MuscleTag muscle={item.muscle} />
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
              className={classnames(styles.confirm, !selectedIds.length && styles.confirmDisabled)}
              onClick={handleConfirm}
            >
              <Text className={styles.confirmText}>
                {selectedIds.length ? `${confirmText} (${selectedIds.length})` : '请选择动作'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default ExercisePicker;
