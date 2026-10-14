import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import type { Session } from '@/types';
import { getExerciseById } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import { sessionVolume } from '@/utils/workout';
import { formatDateTime, formatVolume, formatWeight } from '@/utils/format';
import styles from './index.module.scss';

interface LastRecordFloatProps {
  session: Session | null;
  /** 悬浮球距底部距离（rpx），用于适配带/不带 TabBar 的页面 */
  bottomOffset?: number;
}

/** 悬浮窗：查看上一次训练记录，方便训练中对照 */
const LastRecordFloat: React.FC<LastRecordFloatProps> = ({ session, bottomOffset = 300 }) => {
  const [visible, setVisible] = useState(false);

  if (!session) return null;

  const fabBottom = `calc(env(safe-area-inset-bottom) + ${bottomOffset}rpx)`;
  const panelBottom = `calc(env(safe-area-inset-bottom) + ${bottomOffset + 124}rpx)`;

  return (
    <View>
      <View
        className={classnames(styles.fab, visible && styles.fabActive)}
        style={{ bottom: fabBottom }}
        onClick={() => setVisible((prev) => !prev)}
      >
        <Text className={classnames(styles.fabText, visible && styles.fabTextActive)}>
          {visible ? '收起' : '上次'}
        </Text>
      </View>

      {visible ? (
        <View className={styles.panel} style={{ bottom: panelBottom }}>
          <View className={styles.header}>
            <Text className={styles.title}>上次训练</Text>
            <View className={styles.close} onClick={() => setVisible(false)}>
              <Text className={styles.closeText}>✕</Text>
            </View>
          </View>
          <Text className={styles.sub}>
            {session.name} · {formatDateTime(session.startedAt)} · 容量{' '}
            {formatVolume(sessionVolume(session))}kg
          </Text>

          <ScrollView scrollY className={styles.list}>
            {session.exercises.map((exercise, index) => {
              const info = getExerciseById(exercise.exerciseId);
              return (
                <View key={exercise.key} className={styles.exercise}>
                  <View className={styles.exerciseTop}>
                    <Text className={styles.exerciseIndex}>{index + 1}</Text>
                    <Text className={styles.exerciseName}>{info ? info.name : '未知动作'}</Text>
                    {info ? <MuscleTag muscle={info.muscle} className={styles.exerciseTag} /> : null}
                  </View>
                  <View className={styles.setWrap}>
                    {exercise.sets.map((set, setIndex) => (
                      <View
                        key={set.id}
                        className={classnames(styles.setChip, set.done && styles.setChipDone)}
                      >
                        <Text
                          className={classnames(
                            styles.setChipText,
                            set.done && styles.setChipTextDone
                          )}
                        >
                          {setIndex + 1}. {formatWeight(set.weight)}kg × {set.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

export default LastRecordFloat;
