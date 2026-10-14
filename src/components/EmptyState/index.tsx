import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface EmptyStateProps {
  glyph?: string;
  title: string;
  desc?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  glyph = '🏋️',
  title,
  desc,
  actionText,
  onAction,
  className
}) => (
  <View className={classnames(styles.empty, className)}>
    <Text className={styles.glyph}>{glyph}</Text>
    <Text className={styles.title}>{title}</Text>
    {desc ? <Text className={styles.desc}>{desc}</Text> : null}
    {actionText ? (
      <View className={styles.action} onClick={onAction}>
        <Text className={styles.actionText}>{actionText}</Text>
      </View>
    ) : null}
  </View>
);

export default EmptyState;
