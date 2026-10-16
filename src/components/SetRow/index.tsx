import React, { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import classnames from 'classnames';
import type { WorkoutSet } from '@/types';
import { useProfileStore } from '@/store/useProfileStore';
import styles from './index.module.scss';

interface SetRowProps {
  index: number;
  set: WorkoutSet;
  /** 辅助类动作（器械辅助引体向上）：重量记负数，输入框前面加「−」 */
  assist?: boolean;
  /** 负重自重动作（选「负重」）：输入的是额外负重，总重 = 自重 + 负重 */
  addedMode?: boolean;
  /** 计时类动作（平板支撑）：这一格填的是秒数，不是次数 */
  timed?: boolean;
  onPatch: (patch: Partial<WorkoutSet>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

const SetRow: React.FC<SetRowProps> = ({
  index,
  set,
  assist = false,
  addedMode = false,
  timed = false,
  onPatch,
  onToggle,
  onRemove
}) => {
  const bodyWeight = useProfileStore((state) => state.profile.weight ?? 0);

  /** 负重档填的是「额外负重」，其余填的是重量本身（辅助类是绝对值） */
  const toText = (item: WorkoutSet) => {
    if (addedMode) return item.addedWeight ? String(item.addedWeight) : '';
    return item.weight ? String(Math.abs(item.weight)) : '';
  };

  const [weightText, setWeightText] = useState(() => toText(set));
  const [repsText, setRepsText] = useState(set.reps ? String(set.reps) : '');

  useEffect(() => {
    setWeightText(toText(set));
    setRepsText(set.reps ? String(set.reps) : '');
    // 仅在切换不同的组时重置输入内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  const handleWeight = (value: string) => {
    setWeightText(value);
    const num = parseFloat(value) || 0;
    if (addedMode) {
      onPatch({ addedWeight: num, weight: bodyWeight + num });
      return;
    }
    onPatch({ weight: assist ? -Math.abs(num) : num });
  };

  const handleReps = (value: string) => {
    setRepsText(value);
    onPatch({ reps: parseInt(value, 10) || 0 });
  };

  return (
    <View className={classnames(styles.row, set.done && styles.rowDone)}>
      <Text className={styles.index}>{index}</Text>

      <View className={styles.weightField}>
        {assist || addedMode ? (
          <Text className={styles.sign}>
            {assist ? '−' : bodyWeight > 0 ? `${bodyWeight}+` : '+'}
          </Text>
        ) : null}
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

      <Text className={styles.times}>×</Text>

      <View className={styles.repsField}>
        <Input
          className={styles.input}
          type="number"
          value={repsText}
          placeholder={timed ? '60' : '0'}
          placeholderStyle="color:#4a4a55"
          onInput={(event) => handleReps(event.detail.value)}
        />
        {timed ? <Text className={styles.unit}>秒</Text> : null}
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
