import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import {
  navigateBack,
  redirectTo,
  showActionSheet,
  showModal,
  showToast
} from '@/utils/taro';
import classnames from 'classnames';
import { FEEL_OPTIONS, REST_OPTIONS, getFeelOption } from '@/constants';
import { useSessionStore } from '@/store/useSessionStore';
import { useProfileStore } from '@/store/useProfileStore';
import { getExerciseById } from '@/store/useExerciseStore';
import SetRow from '@/components/SetRow';
import ExercisePicker from '@/components/ExercisePicker';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import LastRecordFloat from '@/components/LastRecordFloat';
import {
  feelMessage,
  findLastPerformance,
  hasCardio,
  isBodyweight,
  isExerciseFinished,
  isSessionPaused,
  sessionCardioMin,
  sessionDoneSets,
  sessionDurationSec,
  sessionFeelScore,
  sessionTotalSets,
  sessionVolume
} from '@/utils/workout';
import { formatClock, formatTimer, formatVolume } from '@/utils/format';
import styles from './index.module.scss';

interface RestState {
  endAt: number;
}

const SessionPage: React.FC = () => {
  const active = useSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);
  const finishActive = useSessionStore((state) => state.finishActive);
  const discardActive = useSessionStore((state) => state.discardActive);
  const pauseActive = useSessionStore((state) => state.pauseActive);
  const resumeActive = useSessionStore((state) => state.resumeActive);
  const renameActive = useSessionStore((state) => state.renameActive);
  const patchActiveMeta = useSessionStore((state) => state.patchActiveMeta);
  const addExerciseToActive = useSessionStore((state) => state.addExerciseToActive);
  const removeExerciseFromActive = useSessionStore((state) => state.removeExerciseFromActive);
  const moveExerciseInActive = useSessionStore((state) => state.moveExerciseInActive);
  const patchExerciseInActive = useSessionStore((state) => state.patchExerciseInActive);
  const addSetToActive = useSessionStore((state) => state.addSetToActive);
  const removeSetFromActive = useSessionStore((state) => state.removeSetFromActive);
  const updateSetInActive = useSessionStore((state) => state.updateSetInActive);
  const toggleSetDone = useSessionStore((state) => state.toggleSetDone);
  const profile = useProfileStore((state) => state.profile);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(Date.now());
  /** 手动点开某个折叠动作时临时聚焦；为空则跟随自动推进 */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  /** 结束训练时弹出的训练心得评分结果 */
  const [feelResult, setFeelResult] = useState<{ score: number | null; message: string } | null>(
    null
  );

  // 秒级刷新，用于训练计时与休息倒计时
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rest && now >= rest.endAt) {
      setRest(null);
      showToast({ title: '休息结束，继续加油！', icon: 'none' });
    }
  }, [now, rest]);

  const doneSets = active ? sessionDoneSets(active) : 0;
  const totalSets = active ? sessionTotalSets(active) : 0;
  const volume = active ? sessionVolume(active) : 0;
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  const lastPerformanceMap = useMemo(() => {
    const map: Record<string, { weight: number; reps: number } | null> = {};
    if (!active) return map;
    active.exercises.forEach((item) => {
      map[item.key] = findLastPerformance(sessions, item.exerciseId);
    });
    return map;
  }, [active, sessions]);

  /** 当前正在做的动作：第一个还没做完（或做完了但还没选感受）的动作；全部完成则取最后一个 */
  const currentKey = useMemo(() => {
    const list = active?.exercises ?? [];
    if (!list.length) return '';
    if (focusKey && list.some((item) => item.key === focusKey)) return focusKey;
    const index = list.findIndex((item) => !(isExerciseFinished(item) && item.feel !== undefined));
    return index === -1 ? list[list.length - 1].key : list[index].key;
  }, [active, focusKey]);

  const startRest = (seconds: number) => {
    if (!profile.restEnabled || !seconds) return;
    setRest({ endAt: Date.now() + seconds * 1000 });
  };

  const handleToggleSet = (
    exerciseKey: string,
    setId: string,
    wasDone: boolean,
    restSeconds: number
  ) => {
    const exercise = active?.exercises.find((item) => item.key === exerciseKey);
    toggleSetDone(exerciseKey, setId);
    // 打勾后回到「自动推进」状态：完成当前动作会自动展开下一个
    setFocusKey(null);
    if (wasDone) return;
    // 组间歇只作用于「单个动作内部」：该动作还有没做完的组才计时；
    // 最后一组做完就结束，换下一个动作的间隙不计时
    const hasRemaining = !!exercise?.sets.some((set) => set.id !== setId && !set.done);
    if (hasRemaining) startRest(restSeconds);
  };

  const handleAddExercises = (exerciseIds: string[]) => {
    exerciseIds.forEach((id) => addExerciseToActive(id, 3, profile.defaultRest || 90));
  };

  const selectRestForExercise = (key: string, current: number) => {
    const itemList = REST_OPTIONS.map((item) => `${item} 秒${item === current ? '（当前）' : ''}`);
    showActionSheet({
      itemList,
      success: (res) => {
        const seconds = REST_OPTIONS[res.tapIndex];
        patchExerciseInActive(key, { restSeconds: seconds });
        showToast({ title: `组间休息 ${seconds} 秒`, icon: 'none' });
      }
    });
  };

  const handleExerciseMore = (
    key: string,
    name: string,
    restSeconds: number,
    isCardio = false
  ) => {
    // 有氧动作不设组间休息
    const itemList = isCardio ? ['删除动作'] : ['设置组间休息', '删除动作'];
    showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex];
        if (action === '设置组间休息') {
          selectRestForExercise(key, restSeconds);
          return;
        }
        showModal({
          title: '删除动作',
          content: `确定删除「${name}」吗？`,
          confirmColor: '#f8736a',
          success: (modalRes) => {
            if (modalRes.confirm) removeExerciseFromActive(key);
          }
        });
      }
    });
  };

  /** 选完某个动作的感受：自动推进到下一个动作 */
  const handleFeel = (key: string, value: number) => {
    patchExerciseInActive(key, { feel: value });
    setFocusKey(null);
  };

  const handleFinish = () => {
    if (!active) return;
    showModal({
      title: '结束训练',
      content: '结束并保存这次训练记录？',
      confirmText: '确定结束',
      success: (res) => {
        if (!res.confirm) return;
        // 先根据各动作的感受算出心得评分并展示，用户确认后再真正保存
        const score = sessionFeelScore(active);
        if (score !== null) patchActiveMeta({ feelScore: score });
        setFeelResult({
          score,
          message: score !== null ? feelMessage(score) : '训练完成，干得漂亮！保持这个节奏，继续加油 💪'
        });
      }
    });
  };

  /** 看完心得评分后，保存并跳到训练记录 */
  const handleSaveAndView = () => {
    const finished = finishActive();
    if (!finished) return;
    redirectTo({ url: `/pages/record-detail/index?id=${finished.id}` });
  };

  const handleDiscard = () => {
    showModal({
      title: '放弃训练',
      content: '放弃后本次训练内容不会被保存，确定吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        discardActive();
        navigateBack();
      }
    });
  };

  if (!active) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🏋️"
            title="当前没有进行中的训练"
            desc="点击下方按钮开始一次自由训练"
            actionText="开始训练"
            onAction={() => startSession()}
          />
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.summary}>
        <View className={styles.summaryTop}>
          <Input
            className={styles.nameInput}
            value={active.name}
            maxlength={20}
            onInput={(event) => renameActive(event.detail.value)}
          />
          <Text className={styles.editHint}>✎</Text>
        </View>
        <View className={styles.summaryMetaRow}>
          <Text className={styles.summaryMeta}>
            {formatClock(active.startedAt)} 开始 · 已用时 {formatTimer(sessionDurationSec(active))}
          </Text>
          <View
            className={classnames(
              styles.pauseBtn,
              isSessionPaused(active) && styles.pauseBtnActive
            )}
            onClick={() => {
              if (isSessionPaused(active)) {
                resumeActive();
                showToast({ title: '继续训练', icon: 'none' });
                return;
              }
              pauseActive();
              showToast({ title: '已暂停计时', icon: 'none' });
            }}
          >
            <Text className={styles.pauseBtnText}>
              {isSessionPaused(active) ? '继续' : '暂停'}
            </Text>
          </View>
        </View>

        <View className={styles.progressTrack}>
          <View className={styles.progressFill} style={{ width: `${progress}%` }} />
        </View>

        <View className={styles.summaryStats}>
          {hasCardio(active) ? (
            <>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总时长</Text>
                <Text className={styles.summaryStatValue}>
                  {sessionCardioMin(active)}
                  <Text className={styles.summaryStatUnit}>分钟</Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>
                  消耗热量 <Text className={styles.statEditIcon}>✎</Text>
                </Text>
                <Input
                  className={styles.statInput}
                  type="number"
                  value={active.calories !== undefined ? String(active.calories) : ''}
                  placeholder="kcal"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) =>
                    patchActiveMeta({ calories: parseInt(event.detail.value, 10) || 0 })
                  }
                />
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>
                  平均心率 <Text className={styles.statEditIcon}>✎</Text>
                </Text>
                <Input
                  className={styles.statInput}
                  type="number"
                  value={active.avgHeartRate !== undefined ? String(active.avgHeartRate) : ''}
                  placeholder="bpm"
                  placeholderStyle="color:#4a4a55"
                  onInput={(event) =>
                    patchActiveMeta({ avgHeartRate: parseInt(event.detail.value, 10) || 0 })
                  }
                />
              </View>
            </>
          ) : (
            <>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>动作</Text>
                <Text className={styles.summaryStatValue}>{active.exercises.length}</Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>已完成组</Text>
                <Text className={classnames(styles.summaryStatValue, styles.summaryStatAccent)}>
                  {doneSets}
                  <Text className={styles.summaryStatUnit}>/{totalSets}</Text>
                </Text>
              </View>
              <View className={styles.summaryStat}>
                <Text className={styles.summaryStatLabel}>总容量</Text>
                <Text className={styles.summaryStatValue}>
                  {formatVolume(volume)}
                  <Text className={styles.summaryStatUnit}>kg</Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {active.exercises.length ? (
        active.exercises.map((exercise, index) => {
          const info = getExerciseById(exercise.exerciseId);
          const last = lastPerformanceMap[exercise.key];
          const isCardio = info?.muscle === 'cardio';
          // 当前正在进行的动作：展开 + 橙色边框；其余折叠成只显示动作名
          const isCurrent = exercise.key === currentKey;
          const doneCount = exercise.sets.filter((set) => set.done).length;
          const finished = isExerciseFinished(exercise);
          const feelOption = getFeelOption(exercise.feel);
          // 自重动作：重量栏显示「自重」，不用填 kg
          const bodyweight = isBodyweight(exercise.exerciseId);
          return (
            <View
              key={exercise.key}
              className={classnames(
                styles.exerciseCard,
                isCurrent ? styles.exerciseCardActive : styles.exerciseCardCollapsed
              )}
            >
              <View
                className={styles.exerciseHeader}
                onClick={() => {
                  if (!isCurrent) setFocusKey(exercise.key);
                }}
              >
                <View className={styles.orderBadge}>
                  <Text className={styles.orderBadgeText}>{index + 1}</Text>
                </View>
                <View className={styles.exerciseTitleWrap}>
                  <Text className={styles.exerciseName}>{info ? info.name : '未知动作'}</Text>
                  <View className={styles.exerciseMeta}>
                    {info ? <MuscleTag muscle={info.muscle} /> : null}
                    <Text className={styles.exerciseMetaText}>
                      {isCardio
                        ? feelOption
                          ? `${feelOption.emoji} ${feelOption.desc}`
                          : '记录时长与强度'
                        : isCurrent
                          ? last
                            ? `上次 ${bodyweight ? '自重' : `${last.weight}kg`} × ${last.reps}`
                            : `目标 ${exercise.targetSets} 组 · 休息 ${exercise.restSeconds}s`
                          : feelOption
                            ? `已完成 ${doneCount}/${exercise.sets.length} 组 · ${feelOption.emoji} ${feelOption.label}`
                            : `待进行 · ${doneCount}/${exercise.sets.length} 组`}
                    </Text>
                  </View>
                </View>
                {isCurrent ? (
                  <View className={styles.exerciseActions}>
                    <View
                      className={classnames(styles.iconBtn, index === 0 && styles.iconBtnDisabled)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (index > 0) moveExerciseInActive(exercise.key, -1);
                      }}
                    >
                      <Text className={styles.iconBtnText}>↑</Text>
                    </View>
                    <View
                      className={classnames(
                        styles.iconBtn,
                        index === active.exercises.length - 1 && styles.iconBtnDisabled
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (index < active.exercises.length - 1) {
                          moveExerciseInActive(exercise.key, 1);
                        }
                      }}
                    >
                      <Text className={styles.iconBtnText}>↓</Text>
                    </View>
                    <View
                      className={styles.iconBtn}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleExerciseMore(
                          exercise.key,
                          info ? info.name : '该动作',
                          exercise.restSeconds,
                          isCardio
                        );
                      }}
                    >
                      <Text className={styles.iconBtnText}>···</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {!isCurrent ? null : (
                <>
                  {isCardio ? (
                exercise.sets.map((set) => (
                  <View key={set.id} className={styles.cardioBox}>
                    <View className={styles.cardioLine}>
                      <Text className={styles.cardioLabel}>时长</Text>
                      <View className={styles.cardioValue}>
                        <Input
                          className={styles.cardioInputNum}
                          type="number"
                          value={set.durationMin !== undefined ? String(set.durationMin) : ''}
                          placeholder="30"
                          placeholderStyle="color:#4a4a55"
                          onInput={(event) =>
                            updateSetInActive(exercise.key, set.id, {
                              durationMin: parseInt(event.detail.value, 10) || 0
                            })
                          }
                        />
                        <Text className={styles.cardioUnit}>分钟</Text>
                      </View>
                    </View>

                    <View className={styles.cardioLine}>
                      <Text className={styles.cardioLabel}>强度</Text>
                      <Input
                        className={styles.cardioInput}
                        value={set.intensity ?? ''}
                        placeholder="自己写，如 中速 / 坡度 8"
                        placeholderStyle="color:#4a4a55"
                        onInput={(event) =>
                          updateSetInActive(exercise.key, set.id, { intensity: event.detail.value })
                        }
                      />
                    </View>
                  </View>
                ))
              ) : (
                <>
                  <View className={styles.setHead}>
                    <Text className={styles.headIndex}>组</Text>
                    <Text className={styles.headWeight}>{bodyweight ? '自重' : '重量(kg)'}</Text>
                    <Text className={styles.headTimes} />
                    <Text className={styles.headReps}>次数</Text>
                    <Text className={styles.headDone}>完成</Text>
                    <Text className={styles.headRemove} />
                  </View>

                  {exercise.sets.map((set, setIndex) => (
                    <SetRow
                      key={set.id}
                      index={setIndex + 1}
                      set={set}
                      bodyweight={bodyweight}
                      canRemove={exercise.sets.length > 1}
                      onPatch={(patch) => updateSetInActive(exercise.key, set.id, patch)}
                      onToggle={() =>
                        handleToggleSet(exercise.key, set.id, set.done, exercise.restSeconds)
                      }
                      onRemove={() => removeSetFromActive(exercise.key, set.id)}
                    />
                  ))}

                  <View className={styles.addSet} onClick={() => addSetToActive(exercise.key)}>
                    <Text className={styles.addSetText}>+ 添加一组</Text>
                  </View>
                </>
              )}

              {/* 动作做完后：选择本次感受，选完自动进入下一个动作 */}
              {finished ? (
                <View className={styles.feelBox}>
                  <Text className={styles.feelTitle}>
                    {exercise.feel ? '这次感觉怎么样？（可修改）' : '这个动作练完了，感觉如何？'}
                  </Text>
                  <View className={styles.feelRow}>
                    {FEEL_OPTIONS.map((option) => (
                      <View
                        key={option.value}
                        className={classnames(
                          styles.feelChip,
                          exercise.feel === option.value && styles.feelChipActive
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFeel(exercise.key, option.value);
                        }}
                      >
                        <Text className={styles.feelEmoji}>{option.emoji}</Text>
                        <Text className={styles.feelLabel}>{option.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
                </>
              )}
            </View>
          );
        })
      ) : (
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="💪"
            title="还没有添加动作"
            desc="点击下方「添加动作」开始记录吧"
          />
        </View>
      )}

      <View className={styles.addExercise} onClick={() => setPickerVisible(true)}>
        <Text className={styles.addExerciseText}>+ 添加动作</Text>
      </View>

      <View className={styles.giveUp} onClick={handleDiscard}>
        <Text className={styles.giveUpText}>放弃本次训练</Text>
      </View>

      <LastRecordFloat session={sessions.length ? sessions[0] : null} />

      {rest ? (
        <View className={styles.restBar}>
          <View className={styles.restInfo}>
            <Text className={styles.restLabel}>组间休息</Text>
            <Text className={styles.restTime}>
              {formatTimer(Math.max(0, Math.ceil((rest.endAt - now) / 1000)))}
            </Text>
          </View>
          <View className={styles.restSkip} onClick={() => setRest(null)}>
            <Text className={styles.restSkipText}>跳过</Text>
          </View>
        </View>
      ) : null}

      <View className={styles.bottomBar}>
        <View className={classnames(styles.bottomBtn, styles.bottomBtnGhost)} onClick={() => setPickerVisible(true)}>
          <Text className={styles.bottomBtnTextGhost}>添加动作</Text>
        </View>
        <View className={classnames(styles.bottomBtn, styles.bottomBtnPrimary)} onClick={handleFinish}>
          <Text className={styles.bottomBtnTextPrimary}>结束训练</Text>
        </View>
      </View>

      <ExercisePicker
        visible={pickerVisible}
        title="添加动作"
        confirmText="添加"
        onClose={() => setPickerVisible(false)}
        onConfirm={handleAddExercises}
      />

      {/* 结束训练后的训练心得评分 */}
      {feelResult ? (
        <View className={styles.resultMask}>
          <View className={styles.resultCard}>
            <Text className={styles.resultTitle}>训练心得</Text>
            {feelResult.score !== null ? (
              <>
                <View className={styles.resultScoreRow}>
                  <Text className={styles.resultScore}>{feelResult.score}</Text>
                  <Text className={styles.resultScoreUnit}>/ 10 分</Text>
                </View>
                <Text className={styles.resultMessage}>{feelResult.message}</Text>
              </>
            ) : (
              <Text className={styles.resultMessage}>{feelResult.message}</Text>
            )}
            <View className={styles.resultBtn} onClick={handleSaveAndView}>
              <Text className={styles.resultBtnText}>保存并查看记录</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default SessionPage;
