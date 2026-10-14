import React, { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { navigateBack, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import { useSessionStore } from '@/store/useSessionStore';
import { getExerciseById } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import {
  cardioExercises,
  exerciseVolume,
  sessionCardioMin,
  sessionDurationSec,
  strengthExercises,
  strengthSets,
  strengthVolume
} from '@/utils/workout';
import { formatDateTime, formatDuration, formatVolume, formatWeight } from '@/utils/format';
import styles from './index.module.scss';

const RecordDetailPage: React.FC = () => {
  const router = useRouter();
  const sessionId = router.params?.id || '';
  const session = useSessionStore((state) => state.sessions.find((item) => item.id === sessionId));
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const updateSessionMeta = useSessionStore((state) => state.updateSessionMeta);
  /** 正在补填的有氧字段（用于控制铅笔占位的显示） */
  const [editField, setEditField] = useState<'calories' | 'heart' | null>(null);

  const handleDelete = () => {
    showModal({
      title: '删除记录',
      content: '删除后无法恢复，确定删除这条训练记录吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        deleteSession(sessionId);
        showToast({ title: '已删除', icon: 'none' });
        setTimeout(() => navigateBack(), 400);
      }
    });
  };

  if (!session) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🔍"
            title="记录不存在"
            desc="该训练记录可能已被删除"
            actionText="返回"
            onAction={() => navigateBack()}
          />
        </View>
      </View>
    );
  }

  /** 力量 / 有氧分开统计：混合训练时上下两块，各自算各自的 */
  const strengthList = strengthExercises(session);
  const cardioList = cardioExercises(session);
  const showGroupTitle = strengthList.length > 0 && cardioList.length > 0;
  const setsStat = strengthSets(session);

  // 统计块的先后：跟着动作在训练里出现的先后
  const strengthFirstIndex = session.exercises.findIndex(
    (item) => getExerciseById(item.exerciseId)?.muscle !== 'cardio'
  );
  const cardioFirstIndex = session.exercises.findIndex(
    (item) => getExerciseById(item.exerciseId)?.muscle === 'cardio'
  );
  const cardioFirst =
    cardioFirstIndex >= 0 && (strengthFirstIndex < 0 || cardioFirstIndex < strengthFirstIndex);

  const strengthBlock = strengthList.length ? (
    <>
      {showGroupTitle ? <Text className={styles.statGroupLabel}>力量训练</Text> : null}
      <View className={styles.headStats}>
        <View className={styles.headStat}>
          <Text className={classnames(styles.headStatValue, styles.headStatValueAccent)}>
            {formatVolume(strengthVolume(session))}
            <Text className={styles.headStatUnit}>kg</Text>
          </Text>
          <Text className={styles.headStatLabel}>总容量</Text>
        </View>
        <View className={styles.headStatDivider} />
        <View className={styles.headStat}>
          <Text className={styles.headStatValue}>
            {setsStat.done}
            <Text className={styles.headStatUnit}>/{setsStat.total}</Text>
          </Text>
          <Text className={styles.headStatLabel}>完成组数</Text>
        </View>
        <View className={styles.headStatDivider} />
        <View className={styles.headStat}>
          <Text className={styles.headStatValue}>{strengthList.length}</Text>
          <Text className={styles.headStatLabel}>动作数</Text>
        </View>
      </View>
    </>
  ) : null;

  const cardioBlock = cardioList.length ? (
    <>
      {showGroupTitle ? <Text className={styles.statGroupLabel}>有氧训练</Text> : null}
      <View className={styles.headStats}>
        <View className={styles.headStat}>
          <Text className={classnames(styles.headStatValue, styles.headStatValueAccent)}>
            {sessionCardioMin(session)}
            <Text className={styles.headStatUnit}>分钟</Text>
          </Text>
          <Text className={styles.headStatLabel}>总时长</Text>
        </View>
        <View className={styles.headStatDivider} />
        <View className={styles.headStat}>
          <View className={styles.headStatField}>
            <Input
              className={styles.headStatInput}
              type="number"
              value={session.calories ? String(session.calories) : ''}
              focus={editField === 'calories'}
              onBlur={() => setEditField(null)}
              onInput={(event) =>
                updateSessionMeta(session.id, { calories: parseInt(event.detail.value, 10) || 0 })
              }
            />
            {!session.calories && editField !== 'calories' ? (
              <View className={styles.headStatPick} onClick={() => setEditField('calories')}>
                <Text className={styles.headStatPencil}>✎</Text>
              </View>
            ) : null}
          </View>
          <Text className={styles.headStatLabel}>消耗热量(kcal)</Text>
        </View>
        <View className={styles.headStatDivider} />
        <View className={styles.headStat}>
          <View className={styles.headStatField}>
            <Input
              className={styles.headStatInput}
              type="number"
              value={session.avgHeartRate ? String(session.avgHeartRate) : ''}
              focus={editField === 'heart'}
              onBlur={() => setEditField(null)}
              onInput={(event) =>
                updateSessionMeta(session.id, {
                  avgHeartRate: parseInt(event.detail.value, 10) || 0
                })
              }
            />
            {!session.avgHeartRate && editField !== 'heart' ? (
              <View className={styles.headStatPick} onClick={() => setEditField('heart')}>
                <Text className={styles.headStatPencil}>✎</Text>
              </View>
            ) : null}
          </View>
          <Text className={styles.headStatLabel}>平均心率(bpm)</Text>
        </View>
      </View>
    </>
  ) : null;

  return (
    <View className={styles.page}>
      <View className={styles.head}>
        <Text className={styles.headName}>{session.name}</Text>
        <Text className={styles.headTime}>
          {formatDateTime(session.startedAt)} · 用时 {formatDuration(sessionDurationSec(session))}
        </Text>
        {cardioFirst ? (
          <>
            {cardioBlock}
            {strengthBlock}
          </>
        ) : (
          <>
            {strengthBlock}
            {cardioBlock}
          </>
        )}
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>训练明细</Text>
        <Text className={styles.sectionExtra}>绿底为已完成组</Text>
      </View>

      {session.exercises.map((exercise, index) => {
        const info = getExerciseById(exercise.exerciseId);
        const doneCount = exercise.sets.filter((set) => set.done).length;
        return (
          <View key={exercise.key} className={styles.exerciseCard}>
            <View className={styles.exerciseHeader}>
              <View className={styles.orderBadge}>
                <Text className={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View className={styles.exerciseTitleWrap}>
                <Text className={styles.exerciseName}>{info ? info.name : '未知动作'}</Text>
                <View className={styles.exerciseMeta}>
                  {info ? <MuscleTag muscle={info.muscle} /> : null}
                  <Text className={styles.exerciseVolume}>
                    {info?.muscle === 'cardio'
                      ? `${exercise.sets.reduce(
                          (sum, set) => sum + (set.durationMin ?? 0),
                          0
                        )} 分钟`
                      : `${doneCount} 组 · ${formatVolume(exerciseVolume(exercise))} kg`}
                  </Text>
                </View>
              </View>
            </View>

            <View className={styles.setWrap}>
              {exercise.sets.map((set, setIndex) => (
                <View
                  key={set.id}
                  className={classnames(styles.setChip, set.done && styles.setChipDone)}
                >
                  <Text
                    className={classnames(styles.setChipText, set.done && styles.setChipTextDone)}
                  >
                    {set.durationMin !== undefined
                      ? `${set.durationMin} 分钟${set.intensity ? ` · ${set.intensity}` : ''}`
                      : `${setIndex + 1}. ${formatWeight(set.weight)}kg × ${set.reps}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <View className={styles.deleteBtn} onClick={handleDelete}>
        <Text className={styles.deleteBtnText}>删除这条记录</Text>
      </View>
    </View>
  );
};

export default RecordDetailPage;
