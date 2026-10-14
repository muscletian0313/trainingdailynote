import React, { useState } from 'react';
import { View, Text, Input, Switch, ScrollView } from '@tarojs/components';
import { playSound, showActionSheet, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import { REST_OPTIONS, REST_SOUNDS, REST_SOUND_OFF, restSoundSrc } from '@/constants';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { totalVolume } from '@/utils/workout';
import { formatVolume } from '@/utils/format';
import styles from './index.module.scss';

const AVATARS = ['🏋️', '💪', '🔥', '🥇', '⚡', '🐯'];

const MinePage: React.FC = () => {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const sessions = useSessionStore((state) => state.sessions);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const discardActive = useSessionStore((state) => state.discardActive);
  const clearPlans = usePlanStore((state) => state.clearPlans);
  const clearCustomExercises = useExerciseStore((state) => state.clearCustomExercises);

  const handleAvatar = () => {
    showActionSheet({
      itemList: AVATARS,
      success: (res) => updateProfile({ avatar: AVATARS[res.tapIndex] })
    });
  };

  const handleRestSelect = () => {
    const itemList = REST_OPTIONS.map((item) => `${item} 秒`);
    showActionSheet({
      itemList,
      success: (res) => {
        updateProfile({ defaultRest: REST_OPTIONS[res.tapIndex] });
        showToast({ title: `默认休息 ${REST_OPTIONS[res.tapIndex]} 秒`, icon: 'none' });
      }
    });
  };

  /** 组间歇提示音选择弹层 */
  const [soundSheet, setSoundSheet] = useState(false);

  /** 选中并试听：点一下即生效 */
  const pickRestSound = (id: string) => {
    updateProfile({ restSoundId: id });
    const src = restSoundSrc(id);
    if (src) playSound(src);
  };

  const restSoundLabel =
    profile.restSoundId === REST_SOUND_OFF
      ? '关闭提醒'
      : REST_SOUNDS.find((item) => item.id === profile.restSoundId)?.name ?? '清脆铃声';

  const handleClearSessions = () => {
    showModal({
      title: '清空训练记录',
      content: '将删除全部历史训练记录，确定继续吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        clearSessions();
        discardActive();
        showToast({ title: '已清空训练记录', icon: 'none' });
      }
    });
  };

  const handleClearAll = () => {
    showModal({
      title: '清空全部数据',
      content: '将删除训练记录、训练计划、自定义动作与个人资料，且无法恢复，确定继续吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        clearSessions();
        discardActive();
        clearPlans();
        clearCustomExercises();
        resetProfile();
        showToast({ title: '已恢复初始状态', icon: 'none' });
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.profile}>
        <View className={styles.profileTop}>
          <View className={styles.avatar} onClick={handleAvatar}>
            <Text className={styles.avatarText}>{profile.avatar}</Text>
          </View>
          <View className={styles.profileMain}>
            <Input
              className={styles.nicknameInput}
              value={profile.nickname}
              maxlength={12}
              onInput={(event) => updateProfile({ nickname: event.detail.value })}
            />
            <Text className={styles.nicknameHint}>点击昵称或头像可以修改</Text>
          </View>
        </View>

        <View className={styles.profileStats}>
          <View className={styles.profileStat}>
            <Text className={styles.profileStatValue}>{sessions.length}</Text>
            <Text className={styles.profileStatLabel}>累计训练(次)</Text>
          </View>
          <View className={styles.profileStatDivider} />
          <View className={styles.profileStat}>
            <Text className={classnames(styles.profileStatValue, styles.profileStatValueAccent)}>
              {formatVolume(totalVolume(sessions))}
            </Text>
            <Text className={styles.profileStatLabel}>累计容量(kg)</Text>
          </View>
        </View>
      </View>

      <Text className={styles.sectionLabel}>训练偏好</Text>
      <View className={styles.group}>
        <View className={classnames(styles.row, styles.rowBorder)} onClick={handleRestSelect}>
          <Text className={styles.rowLabel}>默认组间休息</Text>
          <View className={styles.rowValue}>
            <Text className={styles.rowValueText}>{profile.defaultRest} 秒</Text>
            <Text className={styles.rowArrow}>›</Text>
          </View>
        </View>
        <View className={classnames(styles.row, styles.rowBorder)}>
          <View>
            <Text className={styles.rowLabel}>组间休息倒计时</Text>
            <Text className={styles.rowSub}>完成一组后自动开始倒计时</Text>
          </View>
          <View className={styles.rowValue}>
            <Switch
              checked={profile.restEnabled}
              color="#ff6b2c"
              onChange={(event) => updateProfile({ restEnabled: event.detail.value })}
            />
          </View>
        </View>
        <View
          className={classnames(styles.row, styles.rowBorder)}
          onClick={() => setSoundSheet(true)}
        >
          <View>
            <Text className={styles.rowLabel}>组间歇提示音</Text>
            <Text className={styles.rowSub}>计时到点时的提醒音效</Text>
          </View>
          <View className={styles.rowValue}>
            <Text className={styles.rowValueText}>{restSoundLabel}</Text>
            <Text className={styles.rowArrow}>›</Text>
          </View>
        </View>
        <View className={classnames(styles.row, styles.rowBorder)}>
          <View>
            <Text className={styles.rowLabel}>到点震动</Text>
            <Text className={styles.rowSub}>计时结束时短震一下</Text>
          </View>
          <View className={styles.rowValue}>
            <Switch
              checked={profile.restVibrate}
              color="#ff6b2c"
              onChange={(event) => updateProfile({ restVibrate: event.detail.value })}
            />
          </View>
        </View>
        <View className={styles.row}>
          <View>
            <Text className={styles.rowLabel}>训练心得</Text>
            <Text className={styles.rowSub}>计划详情页展示心得记录区</Text>
          </View>
          <View className={styles.rowValue}>
            <Switch
              checked={profile.noteEnabled}
              color="#ff6b2c"
              onChange={(event) => updateProfile({ noteEnabled: event.detail.value })}
            />
          </View>
        </View>
      </View>

      <Text className={styles.sectionLabel}>数据管理</Text>
      <View className={styles.group}>
        <View className={classnames(styles.row, styles.rowBorder)}>
          <View>
            <Text className={styles.rowLabel}>训练记录</Text>
            <Text className={styles.rowSub}>共 {sessions.length} 条，保存在本机</Text>
          </View>
        </View>
        <View className={classnames(styles.row, styles.rowBorder)} onClick={handleClearSessions}>
          <Text className={styles.rowLabel}>清空训练记录</Text>
          <Text className={styles.rowArrow}>›</Text>
        </View>
        <View className={classnames(styles.row, styles.rowDanger)} onClick={handleClearAll}>
          <Text className={styles.rowLabel}>清空全部数据</Text>
          <Text className={styles.rowArrow}>›</Text>
        </View>
      </View>

      <View className={styles.about}>
        <Text className={styles.aboutText}>练记 FitLog · v1.0.0</Text>
        <Text className={styles.aboutText}>所有数据仅保存在本机，不会上传</Text>
      </View>

      {/* 组间歇提示音选择：点一下即选中并试听 */}
      {soundSheet ? (
        <View className={styles.sheetMask} onClick={() => setSoundSheet(false)}>
          <View className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <View className={styles.sheetHead}>
              <Text className={styles.sheetTitle}>组间歇提示音</Text>
              <View className={styles.sheetClose} onClick={() => setSoundSheet(false)}>
                <Text className={styles.sheetCloseText}>完成</Text>
              </View>
            </View>
            <ScrollView scrollY className={styles.sheetList}>
              <View
                className={classnames(
                  styles.soundRow,
                  profile.restSoundId === REST_SOUND_OFF && styles.soundRowActive
                )}
                onClick={() => pickRestSound(REST_SOUND_OFF)}
              >
                <Text className={styles.soundName}>关闭提醒</Text>
                {profile.restSoundId === REST_SOUND_OFF ? (
                  <Text className={styles.soundCheck}>✓</Text>
                ) : null}
              </View>
              {REST_SOUNDS.map((item) => {
                const active = profile.restSoundId === item.id;
                return (
                  <View
                    key={item.id}
                    className={classnames(styles.soundRow, active && styles.soundRowActive)}
                    onClick={() => pickRestSound(item.id)}
                  >
                    <Text className={styles.soundName}>{item.name}</Text>
                    {active ? <Text className={styles.soundCheck}>✓</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
            <Text className={styles.sheetTip}>点一下即可选中并试听</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default MinePage;
