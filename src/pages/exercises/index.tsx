import React, { useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import { navigateTo, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import type { MuscleGroup } from '@/types';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/constants';
import { useAllExercises, useExerciseStore, matchesMuscleFilter } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

type MuscleFilter = 'all' | MuscleGroup;

const ExercisesPage: React.FC = () => {
  const exercises = useAllExercises();
  const addCustomExercise = useExerciseStore((state) => state.addCustomExercise);
  const removeCustomExercise = useExerciseStore((state) => state.removeCustomExercise);

  const [keyword, setKeyword] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>('all');

  const [dialogVisible, setDialogVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEquipment, setDraftEquipment] = useState('');
  const [draftMuscle, setDraftMuscle] = useState<MuscleGroup>('chest');

  const list = useMemo(() => {
    const text = keyword.trim();
    return exercises.filter((item) => {
      const matchMuscle = muscle === 'all' || matchesMuscleFilter(item, muscle);
      const matchText = !text || item.name.includes(text);
      return matchMuscle && matchText;
    });
  }, [exercises, keyword, muscle]);

  const openDialog = () => {
    setDraftName('');
    setDraftEquipment('');
    setDraftMuscle('chest');
    setDialogVisible(true);
  };

  const handleSave = () => {
    const name = draftName.trim();
    if (!name) {
      showToast({ title: '请输入动作名称', icon: 'none' });
      return;
    }
    addCustomExercise(name, draftMuscle, draftEquipment);
    setDialogVisible(false);
    showToast({ title: '已添加自定义动作', icon: 'none' });
  };

  const handleItemClick = (id: string) => {
    navigateTo({ url: `/pages/exercise-detail/index?id=${id}` });
  };

  const handleItemLongPress = (id: string, isCustom?: boolean, name?: string) => {
    if (!isCustom) return;
    showModal({
      title: '删除动作',
      content: `确定删除自定义动作「${name}」吗？`,
      confirmColor: '#f8736a',
      success: (res) => {
        if (res.confirm) {
          removeCustomExercise(id);
          showToast({ title: '已删除', icon: 'none' });
        }
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View>
          <Text className={styles.title}>动作库</Text>
          <Text className={styles.subtitle}>共 {exercises.length} 个动作</Text>
        </View>
        <View className={styles.createBtn} onClick={openDialog}>
          <Text className={styles.createBtnText}>+ 自定义动作</Text>
        </View>
      </View>

      <Input
        className={styles.searchInput}
        value={keyword}
        placeholder="搜索动作名称"
        placeholderStyle="color:#6f6f7d"
        confirmType="search"
        onInput={(event) => setKeyword(event.detail.value)}
      />

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
            <Text className={classnames(styles.chipText, muscle === group && styles.chipTextActive)}>
              {MUSCLE_LABELS[group]}
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.countRow}>
        <Text className={styles.countText}>筛选结果 {list.length} 个</Text>
      </View>

      {list.length ? (
        <View className={styles.list}>
          {list.map((item, index) => {
            // 筛选状态下按当前挑的部位标注（全身动作仍标全身）
            const tagMuscle =
              muscle === 'all' || item.muscle === 'fullbody' ? item.muscle : muscle;
            return (
            <View
              key={item.id}
              className={classnames(styles.item, index !== list.length - 1 && styles.itemBorder)}
              onClick={() => handleItemClick(item.id)}
              onLongPress={() => handleItemLongPress(item.id, item.isCustom, item.name)}
            >
              <View className={styles.itemMain}>
                <Text className={styles.itemName}>
                  {item.name}
                  {item.isCustom ? ' · 自定义' : ''}
                </Text>
                <View className={styles.itemMeta}>
                  <MuscleTag muscle={tagMuscle} />
                  <Text className={styles.equipment}>{item.equipment}</Text>
                </View>
              </View>
              <Text className={styles.arrow}>›</Text>
            </View>
            );
          })}
        </View>
      ) : (
        <View className={styles.emptyTip}>
          <Text className={styles.emptyText}>没有找到匹配的动作</Text>
        </View>
      )}

      {dialogVisible ? (
        <View className={styles.overlay}>
          <View className={styles.mask} onClick={() => setDialogVisible(false)} />
          <View className={styles.dialog}>
            <Text className={styles.dialogTitle}>新建自定义动作</Text>

            <Text className={styles.fieldLabel}>动作名称</Text>
            <Input
              className={styles.fieldInput}
              value={draftName}
              maxlength={16}
              placeholder="例如：史密斯机卧推"
              placeholderStyle="color:#6f6f7d"
              onInput={(event) => setDraftName(event.detail.value)}
            />

            <Text className={styles.fieldLabel}>主要肌群</Text>
            <View className={styles.dialogChips}>
              {MUSCLE_GROUPS.map((group) => (
                <View
                  key={group}
                  className={classnames(styles.chip, draftMuscle === group && styles.chipActive)}
                  onClick={() => setDraftMuscle(group)}
                >
                  <Text
                    className={classnames(
                      styles.chipText,
                      draftMuscle === group && styles.chipTextActive
                    )}
                  >
                    {MUSCLE_LABELS[group]}
                  </Text>
                </View>
              ))}
            </View>

            <Text className={styles.fieldLabel}>使用器械（选填）</Text>
            <Input
              className={styles.fieldInput}
              value={draftEquipment}
              maxlength={12}
              placeholder="例如：器械 / 哑铃 / 绳索"
              placeholderStyle="color:#6f6f7d"
              onInput={(event) => setDraftEquipment(event.detail.value)}
            />

            <View className={styles.dialogActions}>
              <View
                className={classnames(styles.dialogBtn, styles.dialogBtnGhost)}
                onClick={() => setDialogVisible(false)}
              >
                <Text className={styles.dialogBtnTextGhost}>取消</Text>
              </View>
              <View
                className={classnames(styles.dialogBtn, styles.dialogBtnPrimary)}
                onClick={handleSave}
              >
                <Text className={styles.dialogBtnTextPrimary}>保存</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default ExercisesPage;
