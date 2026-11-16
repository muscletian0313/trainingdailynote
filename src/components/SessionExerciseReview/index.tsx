import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import { getFeelOption } from '@/constants';
import { getExerciseById } from '@/store/useExerciseStore';
import { useProfileStore } from '@/store/useProfileStore';
import { variantBadges } from '@/data/exerciseVariants';
import { formatSetWeight, withAlpha } from '@/utils/format';
import { isTimedExercise, setLabels } from '@/utils/workout';
import type { Session } from '@/types';
import styles from './index.module.scss';

interface SessionExerciseReviewProps {
  session: Session;
  /** 动作右上角的额外徽标（如 PR +5kg），按 exercise.key 取 */
  badges?: Record<string, string>;
}

/**
 * 动作复盘：按计划详情的排布，把这次实际练的每一组原样列出来
 *（重量 × 次数 + 完成状态 + 动作状态），避免汇总成一行造成误读。
 */
const SessionExerciseReview: React.FC<SessionExerciseReviewProps> = ({ session, badges }) => {
  const noteEnabled = useProfileStore((state) => state.profile.noteEnabled);

  return (
    <View className={styles.list}>
      {session.exercises.map((item, index) => {
        const info = getExerciseById(item.exerciseId);
        const muscle = info?.muscle;
        const timed = isTimedExercise(item.exerciseId);
        const cardio = muscle === 'cardio';
        const feel = noteEnabled ? getFeelOption(item.feel) : undefined;
        const labels = setLabels(item.sets);
        const extra = badges?.[item.key];
        const variantTags = variantBadges(info ? info.name : '', item.variants);
        const cardioSet = item.sets[0];

        return (
          <View key={item.key} className={styles.item}>
            <View className={styles.head}>
              <View className={styles.orderBadge}>
                <Text className={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View className={styles.main}>
                <Text className={styles.name}>
                  {info ? info.name : '已下架'}
                  {item.equipmentName ? `（${item.equipmentName}）` : ''}
                </Text>
                {variantTags.length || extra ? (
                  <View className={styles.tags}>
                    {variantTags.map((badge) => (
                      <Text key={badge.label} className={styles.tag}>
                        {badge.label}
                      </Text>
                    ))}
                    {extra ? <Text className={styles.tagStrong}>{extra}</Text> : null}
                  </View>
                ) : null}
              </View>
              {feel ? (
                <View
                  className={styles.feel}
                  style={{ backgroundColor: withAlpha(feel.color, 0.16) }}
                >
                  <View className={styles.feelDot} style={{ backgroundColor: feel.color }} />
                  <Text className={styles.feelText} style={{ color: feel.color }}>
                    {feel.label}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className={styles.setList}>
              {cardio ? (
                <View className={styles.setRow}>
                  <Text className={styles.setIndex}>1</Text>
                  <View className={styles.setWeightField}>
                    <Text className={styles.setValue}>{cardioSet?.durationMin ?? 0}</Text>
                    <Text className={styles.setUnit}>分钟</Text>
                  </View>
                  {cardioSet?.distanceKm ? (
                    <Text className={styles.cardioExtra}>
                      {Math.round(cardioSet.distanceKm * 100) / 100} km
                    </Text>
                  ) : null}
                </View>
              ) : item.sets.length ? (
                item.sets.map((set, setIndex) => (
                  <View
                    key={`${item.key}-${setIndex}`}
                    className={classnames(
                      styles.setRow,
                      set.drop && styles.setRowDrop,
                      !set.done && styles.setRowSkipped
                    )}
                  >
                    <Text
                      className={classnames(styles.setIndex, set.drop && styles.setIndexDrop)}
                    >
                      {labels[setIndex]}
                    </Text>
                    <View className={styles.setWeightField}>
                      <Text className={styles.setValue}>{formatSetWeight(set)}</Text>
                      <Text className={styles.setUnit}>kg</Text>
                    </View>
                    <Text className={styles.setTimes}>×</Text>
                    <View className={styles.setRepsField}>
                      <Text className={styles.setValue}>{set.reps || 0}</Text>
                      {timed ? <Text className={styles.setUnit}>秒</Text> : null}
                    </View>
                    {set.done ? null : <Text className={styles.skipTag}>未做</Text>}
                  </View>
                ))
              ) : (
                <Text className={styles.setEmpty}>没有记录</Text>
              )}
            </View>

            {item.feelNote ? <Text className={styles.note}>{item.feelNote}</Text> : null}
          </View>
        );
      })}
    </View>
  );
};

export default SessionExerciseReview;
