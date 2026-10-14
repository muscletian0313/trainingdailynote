import React from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { getExerciseById } from '@/store/useExerciseStore';
import MuscleTag from '@/components/MuscleTag';
import styles from './index.module.scss';

const ExerciseDetailPage: React.FC = () => {
  const router = useRouter();
  const exerciseId = router.params?.id || '';
  const exercise = getExerciseById(exerciseId);

  return (
    <View className={styles.page}>
      <View className={styles.card}>
        <Text className={styles.name}>{exercise ? exercise.name : '未知动作'}</Text>
        <View className={styles.meta}>
          {exercise ? <MuscleTag muscle={exercise.muscle} /> : null}
          <Text className={styles.equipment}>{exercise ? exercise.equipment : ''}</Text>
        </View>
      </View>

      <View className={styles.tipCard}>
        <Text className={styles.tipGlyph}>🚧</Text>
        <Text className={styles.tipTitle}>动作详情功能正在开发中</Text>
        <Text className={styles.tipDesc}>
          后续将支持动作要领说明、标准示范与个人最佳成绩（PR）记录
        </Text>
      </View>
    </View>
  );
};

export default ExerciseDetailPage;
