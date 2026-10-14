import React from 'react';
import { Text } from '@tarojs/components';
import classnames from 'classnames';
import type { MuscleGroup } from '@/types';
import { MUSCLE_COLORS, MUSCLE_LABELS } from '@/constants';
import { withAlpha } from '@/utils/format';
import styles from './index.module.scss';

interface MuscleTagProps {
  muscle: MuscleGroup;
  className?: string;
  /** 是否使用填充背景 */
  solid?: boolean;
}

const MuscleTag: React.FC<MuscleTagProps> = ({ muscle, className, solid = false }) => {
  const color = MUSCLE_COLORS[muscle];
  const style = solid
    ? { backgroundColor: color, color: '#101014' }
    : { backgroundColor: withAlpha(color, 0.16), color };

  return (
    <Text className={classnames(styles.tag, className)} style={style}>
      {MUSCLE_LABELS[muscle]}
    </Text>
  );
};

export default MuscleTag;
