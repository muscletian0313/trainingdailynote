import React, { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import classnames from 'classnames';
import type { WorkoutSet } from '@/types';
import styles from './index.module.scss';

interface SetRowProps {
  index: number;
  set: WorkoutSet;
  /** 自重动作：重量栏固定显示「自重」，不可填写 */
  bodyweight?: boolean;
  onPatch: (patch: Partial<WorkoutSet>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

const SetRow: React.FC<SetRowProps> = ({
  index,
  set,
  bodyweight = false,
  onPatch,
  onToggle,
  onRemove
}) => {
  const [weightText, setWeightText] = useState(set.weight ? String(set.weight) : '');
  const [repsText, setRepsText] = useState(set.reps ? String(set.reps) : '');

  useEffect(() => {
    setWeightText(set.weight ? String(set.weight) : '');
    setRepsText(set.reps ? String(set.reps) : '');
    // 仅在切换不同的组时重置输入内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  const handleWeight = (value: string) => {
    setWeightText(value);
    onPatch({ weight: parseFloat(value) || 0 });
  };

  const handleReps = (value: string) => {
    setRepsText(value);
    onPatch({ reps: parseInt(value, 10) || 0 });
  };

  return (
    <View className={classnames(styles.row, set.done && styles.rowDone)}>
      <Text className={styles.index}>{index}</Text>

      {bodyweight ? (
        <View className={styles.weightField}>
          <Text className={styles.bodyweight}>自重</Text>
        </View>
      ) : (
        <View className={styles.weightField}>
          <Input
            className={styles.input}
            type="digit"
            value={weightText}
            placeholder="0"
            placeholderStyle="color:#4a4a55"
            onInput={(event) => handleWeight(event.detail.value)}
          />
          <Text className={styles.unit}>kg</Text>
        </View>
      )}

      <Text className={styles.times}>×</Text>

      <View className={styles.repsField}>
        <Input
          className={styles.input}
          type="number"
          value={repsText}
          placeholder="0"
          placeholderStyle="color:#4a4a55"
          onInput={(event) => handleReps(event.detail.value)}
        />
      </View>

      <View className={classnames(styles.done, set.done && styles.doneActive)} onClick={onToggle}>
        <Text className={styles.doneText}>{set.done ? '✓' : ''}</Text>
      </View>

      <View className={styles.remove} onClick={onRemove}>
        <Text className={styles.removeText}>✕</Text>
      </View>
    </View>
  );
};

export default SetRow;
