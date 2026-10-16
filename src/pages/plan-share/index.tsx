import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import { useRouter, useShareAppMessage } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { PlanExercise } from '@/types';
import { navigateBack, showToast, switchTab } from '@/utils/taro';
import { usePlanStore } from '@/store/usePlanStore';
import { exerciseMuscleTag, getExerciseById } from '@/store/useExerciseStore';
import { variantBadges } from '@/data/exerciseVariants';
import { decodePlan, toLocalPlan } from '@/utils/planShare';
import { isTimedExercise } from '@/utils/workout';
import { formatSetWeight } from '@/utils/format';
import MuscleTag from '@/components/MuscleTag';
import EmptyState from '@/components/EmptyState';
import styles from './index.module.scss';

/** 组摘要：各组一致就合并，不一致就逐组列重量（计时类动作用「秒」） */
function setsSummary(item: PlanExercise): string {
  if (item.targetDurationMin) return `目标 ${item.targetDurationMin} 分钟`;
  const unit = isTimedExercise(item.exerciseId) ? '秒' : '次';
  const sets = item.sets;
  if (!sets.length) return '未设置组';
  const first = sets[0];
  const uniform = sets.every((set) => set.weight === first.weight && set.reps === first.reps);
  if (uniform) {
    return `${formatSetWeight(first)}kg · ${sets.length} 组 × ${first.reps} ${unit}`;
  }
  return `${sets.length} 组 · ${sets.map((set) => `${formatSetWeight(set)}kg`).join('/')}`;
}

/** 好友分享过来的计划：只读展示 + 一键存进自己的计划 */
const PlanSharePage: React.FC = () => {
  const router = useRouter();
  const raw = router.params?.d;
  const shared = useMemo(() => decodePlan(raw), [raw]);
  const addPlan = usePlanStore((state) => state.addPlan);
  const [saved, setSaved] = useState(false);

  // 收到分享的人也能再转给下一个好友
  useShareAppMessage(() => ({
    title: shared ? `分享训练计划：${shared.name}` : '来练记，一起记录每次训练',
    path: shared && raw ? `/pages/plan-share/index?d=${raw}` : '/pages/plans/index'
  }));

  if (!shared) {
    return (
      <View className={styles.page}>
        <View className={styles.emptyWrap}>
          <EmptyState
            glyph="🔗"
            title="分享内容打不开"
            desc="链接可能不完整，让好友重新分享一次试试"
            actionText="返回"
            onAction={() => navigateBack()}
          />
        </View>
      </View>
    );
  }

  const totalSets = shared.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const muscles = [
    ...(shared.primaryMuscle ? [shared.primaryMuscle] : []),
    ...shared.secondaryMuscles
  ];

  const handleSave = () => {
    if (saved) return;
    addPlan(toLocalPlan(shared));
    setSaved(true);
    showToast({ title: '已保存到我的计划', icon: 'success' });
    setTimeout(() => switchTab({ url: '/pages/plans/index' }), 800);
  };

  return (
    <View className={styles.page}>
      <Text className={styles.lead}>好友分享给你的训练计划</Text>

      <View className={styles.head}>
        <Text className={styles.headName}>{shared.name}</Text>
        {muscles.length ? (
          <View className={styles.headTags}>
            {muscles.map((muscle, index) => (
              <MuscleTag
                key={muscle}
                muscle={muscle}
                solid={index === 0}
                className={index ? styles.headTag : undefined}
              />
            ))}
          </View>
        ) : null}
        <Text className={styles.headMeta}>
          {shared.exercises.length} 个动作 · 共 {totalSets} 组
        </Text>
        {shared.startDate ? (
          <Text className={styles.headDate}>
            开始于 {dayjs(shared.startDate).format('YYYY年M月D日')}
          </Text>
        ) : null}
      </View>

      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>动作安排</Text>
      </View>

      <View className={styles.list}>
        {shared.exercises.map((item, index) => {
          const info = getExerciseById(item.exerciseId);
          const name = info ? info.name : '已下架';
          const badges = variantBadges(name, item.variants);
          return (
            <View
              key={item.key}
              className={classnames(
                styles.item,
                index !== shared.exercises.length - 1 && styles.itemBorder
              )}
            >
              <View className={styles.orderBadge}>
                <Text className={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <View className={styles.itemMain}>
                <View className={styles.itemNameRow}>
                  <Text className={styles.itemName}>{name}</Text>
                  {info ? (
                    <MuscleTag
                      {...exerciseMuscleTag(info, item.variants)}
                      className={styles.itemNameTag}
                    />
                  ) : null}
                </View>
                <View className={styles.itemMeta}>
                  {badges.map((badge, badgeIndex) => (
                    <Text
                      key={badge.label}
                      className={badge.locked ? styles.itemVariantLocked : styles.itemVariant}
                    >
                      {badgeIndex > 0 ? ` · ${badge.label}` : badge.label}
                    </Text>
                  ))}
                  <Text className={styles.itemSets}>{setsSummary(item)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View className={styles.footer}>
        <View
          className={classnames(styles.saveBtn, saved && styles.saveBtnDone)}
          onClick={handleSave}
        >
          <Text className={styles.saveBtnText}>{saved ? '已保存到我的计划' : '保存到我的计划'}</Text>
        </View>
        <Button className={styles.resendBtn} openType="share">
          <Text className={styles.resendBtnText}>转发给好友</Text>
        </Button>
      </View>
    </View>
  );
};

export default PlanSharePage;
