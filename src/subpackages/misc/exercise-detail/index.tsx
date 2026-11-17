import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import { useDidShow, useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import type { ExerciseVariants, SessionExercise, WorkoutSet } from '@/types';
import { useSessionStore } from '@/store/useSessionStore';
import { getExerciseById } from '@/store/useExerciseStore';
import { getExerciseDemo } from '@/data/exerciseDemos';
import { EXERCISE_CUES } from '@/data/exerciseCues';
import { resolveDemoImage } from '@/utils/exerciseImages';
import { exerciseVolume, isTimedExercise, variantFingerprint } from '@/utils/workout';
import {
  formatSetWeight,
  formatVolume,
  formatWeight,
  weekdayLabel,
  withAlpha
} from '@/utils/format';
import { getFeelOption } from '@/constants';
import { navigateBack, setNavigationBarTitle } from '@/utils/taro';
import MuscleTag from '@/components/MuscleTag';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

interface HistoryRecord {
  id: string;
  /** 这次训练的命名 */
  name: string;
  /** 11月8日, 2026年, 周日 */
  date: string;
  /** 该动作在这次训练里的容量（kg） */
  volume: number;
  /** 具体做组内容 */
  sets: string[];
  /** 练完后的感觉（有记录才显示） */
  feel?: { emoji: string; label: string; color: string };
}

/** 解码 URL 参数：Taro 在小程序端可能不自动解码 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

/** 单组展示文案 */
function setText(set: WorkoutSet, timed: boolean, cardio: boolean): string {
  if (cardio) {
    const parts = [`${set.durationMin ?? 0}分钟`];
    if (set.distanceKm) parts.push(`${formatWeight(set.distanceKm)}km`);
    return parts.join(' · ');
  }
  if (timed) return `${set.reps}秒`;
  return `${formatSetWeight(set)}kg × ${set.reps}`;
}

const ExerciseDetailPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const exerciseId = router.params?.id || '';
  /**
   * 从训练页 / 编辑计划页进来时会带 vk + eq：
   * vk = 标签指纹（'-' 表示没有任何标签），eq = 器械名（'-' 表示没填）。
   * 两者必须完全一致才算同一个动作，改一个标签都不行。
   */
  const rawVk = router.params?.vk;
  const rawEq = router.params?.eq;
  const strictMatch = rawVk !== undefined;
  const wantVariants = !strictMatch || rawVk === '-' ? '' : safeDecode(rawVk);
  const wantEquipment = !strictMatch || !rawEq || rawEq === '-' ? '' : safeDecode(rawEq);
  const exercise = getExerciseById(exerciseId);
  const sessions = useSessionStore((state) => state.sessions);

  /** 把 vk 指纹（grip:under|angle:flat）还原成变式对象，用来挑对应的示范 */
  const wantVariantsObj = useMemo<ExerciseVariants | undefined>(() => {
    if (!wantVariants) return undefined;
    const parsed: ExerciseVariants = {};
    wantVariants.split('|').forEach((pair) => {
      const [key, value] = pair.split(':');
      if (key && value) parsed[key] = value;
    });
    return parsed;
  }, [wantVariants]);

  const demo = useMemo(
    () => getExerciseDemo(exercise?.name, wantVariantsObj),
    [exercise?.name, wantVariantsObj]
  );

  /** 当前示范对应的中文要领 */
  const cues = demo ? EXERCISE_CUES[demo.id] ?? [] : [];

  /** 示范图：先从云存储按需下载并缓存，拿到之前先显示占位 */
  const [demoImages, setDemoImages] = useState<{ start: string; peak: string }>({
    start: '',
    peak: ''
  });
  /** 下载失败（比如网络断了）：不要把「加载中」一直挂着 */
  const [demoFailed, setDemoFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setDemoImages({ start: '', peak: '' });
    setDemoFailed(false);
    if (!demo) {
      return () => {
        alive = false;
      };
    }
    resolveDemoImage(demo.start).then((src) => {
      if (!alive) return;
      if (!src) setDemoFailed(true);
      setDemoImages((prev) => ({ ...prev, start: src }));
    });
    if (demo.peak !== demo.start) {
      resolveDemoImage(demo.peak).then((src) => {
        if (alive) setDemoImages((prev) => ({ ...prev, peak: src }));
      });
    }
    return () => {
      alive = false;
    };
  }, [demo]);

  const hasTwoFrames = Boolean(demoImages.start && demoImages.peak);

  /** 两帧交替：起始姿势 / 发力顶点 */
  const [peakFrame, setPeakFrame] = useState(false);
  useEffect(() => {
    setPeakFrame(false);
    if (!hasTwoFrames) return undefined;
    const timer = setInterval(() => setPeakFrame((value) => !value), 1100);
    return () => clearInterval(timer);
  }, [hasTwoFrames]);

  useDidShow(() => {
    setNavigationBarTitle({ title: exercise ? exercise.name : '动作详情' });
  });

  const timed = isTimedExercise(exerciseId);
  const cardio = exercise?.muscle === 'cardio';

  const records = useMemo<HistoryRecord[]>(() => {
    const ordered = [...sessions].sort(
      (left, right) => (right.endedAt ?? right.startedAt) - (left.endedAt ?? left.startedAt)
    );
    const list: HistoryRecord[] = [];
    ordered.forEach((session) => {
      const item: SessionExercise | undefined = session.exercises.find(
        (entry) =>
          entry.exerciseId === exerciseId &&
          (!strictMatch ||
            (variantFingerprint(entry.variants) === wantVariants &&
              (entry.equipmentName?.trim() ?? '') === wantEquipment))
      );
      if (!item) return;
      // 有计划但根本没练（一组都没完成）就不算一次历史日训
      const performed = item.sets.some((set) =>
        cardio
          ? (set.durationMin ?? 0) > 0 || (set.distanceKm ?? 0) > 0
          : set.done
      );
      if (!performed) return;
      const done = item.sets.filter((set) => set.done);
      const shown = done.length ? done : item.sets;
      const stamp = session.endedAt ?? session.startedAt;
      const feelOption = getFeelOption(item.feel);
      list.push({
        id: session.id,
        name: session.name?.trim() || '未命名训练',
        date: `${dayjs(stamp).format('M月D日, YYYY年')}, ${weekdayLabel(stamp)}`,
        volume: exerciseVolume(item),
        sets: shown.map((set) => setText(set, timed, cardio)),
        feel: feelOption
          ? { emoji: feelOption.emoji, label: feelOption.label, color: feelOption.color }
          : undefined
      });
    });
    return list;
  }, [sessions, exerciseId, strictMatch, wantVariants, wantEquipment, timed, cardio]);

  return (
    <View className={classnames(styles.page, themeClass)}>
      <View className={styles.header}>
        <View className={styles.headMain}>
          <Text className={styles.name}>{exercise ? exercise.name : '已下架'}</Text>
          <View className={styles.meta}>
            {exercise ? <MuscleTag muscle={exercise.muscle} /> : null}
            <Text className={styles.equipment}>{exercise ? exercise.equipment : ''}</Text>
            <Text className={styles.count}>{records.length ? `${records.length} 次` : ''}</Text>
          </View>
        </View>
      </View>

      {demo ? (
        <View className={styles.demoCard}>
          <View className={styles.demoStage}>
            {demoImages.start ? (
              <View
                className={styles.demoFrame}
                style={{ opacity: !hasTwoFrames || !peakFrame ? 1 : 0 }}
              >
                <Image
                  className={styles.demoFill}
                  src={demoImages.start}
                  mode="aspectFit"
                  onError={() => {
                    setDemoFailed(true);
                    setDemoImages((prev) => ({ ...prev, start: '' }));
                  }}
                />
              </View>
            ) : (
              <Text className={styles.demoLoading}>
                {demoFailed ? '示范图加载失败' : '加载中…'}
              </Text>
            )}
            {hasTwoFrames ? (
              <View className={styles.demoFrame} style={{ opacity: peakFrame ? 1 : 0 }}>
                <Image
                  className={styles.demoFill}
                  src={demoImages.peak}
                  mode="aspectFit"
                  onError={() => setDemoImages((prev) => ({ ...prev, peak: '' }))}
                />
              </View>
            ) : null}
            <Text className={styles.demoFrameTag}>
              {hasTwoFrames ? (peakFrame ? '顶点' : '起始') : '示范'}
            </Text>
          </View>
          <View className={styles.demoInfo}>
            <Text className={styles.demoLabel}>动作示范</Text>
            <Text className={styles.demoName}>{demo.name}</Text>
            <Text className={styles.demoEn}>{demo.en}</Text>
            <View className={styles.demoChips}>
              <Text className={styles.demoChip}>{demo.equipment}</Text>
              <Text className={styles.demoChip}>{demo.level}</Text>
            </View>
            <View className={styles.demoMuscles}>
              <Text className={styles.demoMuscleLabel}>目标</Text>
              <Text className={styles.demoMusclePrimary}>{demo.primary}</Text>
            </View>
            {demo.secondary ? (
              <Text className={styles.demoSecondary}>协同 {demo.secondary}</Text>
            ) : null}
            <Text className={styles.demoCredit}>示范数据 RepDB</Text>
          </View>
        </View>
      ) : null}

      {cues.length ? (
        <View className={styles.cueCard}>
          <Text className={styles.cueTitle}>动作要领</Text>
          {cues.map((cue, index) => (
            <View key={cue} className={styles.cueRow}>
              <Text className={styles.cueIndex}>{index + 1}</Text>
              <Text className={styles.cueText}>{cue}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {records.length ? (
        <View className={styles.list}>
          {records.map((record) => (
            <View key={record.id} className={styles.recordCard}>
              <View className={styles.recordTop}>
                <Text className={styles.recordName}>{record.name}</Text>
                {record.feel ? (
                  <Text
                    className={styles.recordFeel}
                    style={{
                      color: record.feel.color,
                      borderColor: withAlpha(record.feel.color, 0.4),
                      backgroundColor: withAlpha(record.feel.color, 0.12)
                    }}
                  >
                    {record.feel.emoji} {record.feel.label}
                  </Text>
                ) : null}
              </View>
              <Text className={styles.recordDate}>{record.date}</Text>
              <View className={styles.recordFoot}>
                <Text className={styles.volumeLabel}>容量</Text>
                <Text className={styles.volumeValue}>{formatVolume(record.volume)} kg</Text>
                <Text className={styles.setCount}>{record.sets.length} 组</Text>
              </View>
              <View className={styles.sets}>
                {record.sets.map((text, index) => (
                  <Text key={`${record.id}-${index}`} className={styles.setChip}>
                    {text}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.empty}>
          <Text className={styles.emptyText}>
            还没有「{exercise ? exercise.name : '该动作'}」的历史日训
          </Text>
        </View>
      )}

      <View className={styles.closeBar}>
        <View className={styles.closeBtn} onClick={() => navigateBack()}>
          <Text className={styles.closeText}>关闭</Text>
        </View>
      </View>
    </View>
  );
};

export default ExerciseDetailPage;
