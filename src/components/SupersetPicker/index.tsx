import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { getExerciseById } from '@/store/useExerciseStore';
import { supersetLetters } from '@/utils/workout';
import { showToast } from '@/utils/taro';
import styles from './index.module.scss';

/** 弹层里需要的最小动作信息：计划和训练里的动作都能直接用 */
export interface SupersetPickerItem {
  key: string;
  exerciseId: string;
  equipmentName?: string;
  /** 已经属于某个超级组时，这里会有编号 */
  supersetId?: string;
}

interface SupersetPickerProps {
  visible: boolean;
  exercises: SupersetPickerItem[];
  onClose: () => void;
  /** 点「合并为超级组」时把选中的动作 key 交回去 */
  onConfirm: (keys: string[]) => void;
}

/**
 * 超级组选择弹层：勾选要连着做的动作。
 *
 * 已经属于别的超级组的动作会灰掉不可选，避免把同一动作塞进两个组；
 * 想调整成员就先「解散超级组」再重新合并。
 */
const SupersetPicker: React.FC<SupersetPickerProps> = ({
  visible,
  exercises,
  onClose,
  onConfirm
}) => {
  const [picked, setPicked] = useState<string[]>([]);

  /** 每次重新打开都清空上次的勾选 */
  useEffect(() => {
    if (visible) setPicked([]);
  }, [visible]);

  /** 超级组编号 → A/B/C…（按动作顺序） */
  const letters = useMemo(() => supersetLetters(exercises), [exercises]);

  if (!visible) return null;

  const toggle = (key: string) => {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <View className={styles.mask} onClick={onClose}>
      <View className={styles.sheet} onClick={(event) => event.stopPropagation()}>
        <Text className={styles.title}>选择要合并的动作</Text>
        <Text className={styles.hint}>
          练的时候按下面的顺序连着做，做完一轮才休息；灰掉的动作已在别的超级组里
        </Text>
        <ScrollView scrollY className={styles.scroll}>
          {exercises.map((item, index) => {
            const info = getExerciseById(item.exerciseId);
            const isPicked = picked.includes(item.key);
            const grouped = item.supersetId ? letters[item.supersetId] : '';
            return (
              <View
                key={item.key}
                className={classnames(
                  styles.row,
                  isPicked && styles.rowPicked,
                  grouped && styles.rowDisabled
                )}
                onClick={() => {
                  if (grouped) {
                    showToast({ title: `已在超级组 ${grouped}，先解散才能重选`, icon: 'none' });
                    return;
                  }
                  toggle(item.key);
                }}
              >
                <View className={classnames(styles.check, isPicked && styles.checkOn)}>
                  <Text className={styles.checkText}>{isPicked ? '✓' : ''}</Text>
                </View>
                <Text className={styles.order}>{index + 1}</Text>
                <Text className={styles.name}>
                  {info ? info.name : '已下架'}
                  {item.equipmentName ? `（${item.equipmentName}）` : ''}
                </Text>
                {grouped ? <Text className={styles.groupTag}>超级组 {grouped}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
        <View className={styles.footer}>
          <View className={styles.cancel} onClick={onClose}>
            <Text className={styles.cancelText}>取消</Text>
          </View>
          <View
            className={classnames(styles.confirm, picked.length < 2 && styles.confirmDisabled)}
            onClick={() => {
              if (picked.length < 2) {
                showToast({ title: '至少选 2 个动作', icon: 'none' });
                return;
              }
              onConfirm(picked);
            }}
          >
            <Text className={styles.confirmText}>合并为超级组（{picked.length}）</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SupersetPicker;
