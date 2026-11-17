import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import { View, Text, Image, Input, Switch, ScrollView } from '@tarojs/components';
import { navigateTo, playSound, showActionSheet, showModal, showToast } from '@/utils/taro';
import classnames from 'classnames';
import { REST_OPTIONS, REST_SOUNDS, REST_SOUND_OFF, restSoundSrc } from '@/constants';
import { useProfileStore } from '@/store/useProfileStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useExerciseStore } from '@/store/useExerciseStore';
import { useDietStore } from '@/store/useDietStore';
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';
import {
  applyBackup,
  confirmTextOf,
  exportBackupFile,
  parseBackup,
  pickBackupFile,
  stringifyBackup,
  summarize
} from '@/utils/backup';
import {
  cloudAvailable,
  downloadCloudBackup,
  getLastSyncAt,
  listCloudBackups,
  uploadCloudBackup
} from '@/utils/cloudBackup';
import ScrollLock from '@/components/ScrollLock';
import { clearDemoImageCache } from '@/utils/exerciseImages';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

const AVATARS = ['🏋️', '💪', '🔥', '🥇', '⚡', '🐯'];

/** 只做两套：橙黑（深色）/ 橙白（浅色） */
const THEMES: { key: ThemeMode; label: string; sheet: string }[] = [
  { key: 'dark', label: '橙黑', sheet: '橙黑（深色）' },
  { key: 'light', label: '橙白', sheet: '橙白（浅色）' }
];

/** 当前运行版本：读微信返回的真实版本号，避免写死导致显示陈旧 */
function appVersion(): string {
  try {
    const v = Taro.getAccountInfoSync().miniProgram.version;
    return v ? v : 'dev';
  } catch {
    return 'dev';
  }
}

/** 头像是图片（问卷带出来的性别头像）还是 emoji */
function isImageAvatar(value: string): boolean {
  return value.startsWith('data:') || value.startsWith('http');
}

const MinePage: React.FC = () => {
  const themeClass = usePageTheme();
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const discardActive = useSessionStore((state) => state.discardActive);
  const clearPlans = usePlanStore((state) => state.clearPlans);
  const clearCustomExercises = useExerciseStore((state) => state.clearCustomExercises);
  const clearDiet = useDietStore((state) => state.clearDiet);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  /** 上次云端同步时间，同步成功后立即刷新 */
  const [lastSyncAt, setLastSyncAt] = useState(() => getLastSyncAt());

  const syncHint = lastSyncAt
    ? `上次同步 ${dayjs(lastSyncAt).format('M/D HH:mm')}`
    : '还没有同步过';

  const handleThemeSelect = () => {
    showActionSheet({
      itemList: THEMES.map((item) => item.sheet),
      success: (res) => {
        const picked = THEMES[res.tapIndex];
        if (!picked) return;
        setTheme(picked.key);
      }
    });
  };

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

  const handleClearAll = () => {
    showModal({
      title: '清空全部数据',
      content: '将删除训练记录、训练计划、自定义动作与个人资料，且无法恢复。建议先导出备份，确定继续吗？',
      confirmColor: '#f8736a',
      success: (res) => {
        if (!res.confirm) return;
        clearSessions();
        discardActive();
        clearPlans();
        clearCustomExercises();
        clearDiet();
        clearDemoImageCache();
        resetProfile();
        showToast({ title: '已恢复初始状态', icon: 'none' });
      }
    });
  };

  /** 小程序走「转发到聊天」，H5 走浏览器下载；分享取消不算失败 */
  const isWeapp = process.env.TARO_ENV === 'weapp';

  const handleExportBackup = () => {
    showActionSheet({
      itemList: [isWeapp ? '保存为文件（推荐）' : '下载备份文件', '复制到剪贴板'],
      success: async (res) => {
        const text = stringifyBackup();
        if (res.tapIndex === 1) {
          Taro.setClipboardData({ data: text }).catch(() => undefined);
          showToast({ title: '备份已复制', icon: 'none' });
          return;
        }
        try {
          await exportBackupFile(text);
          showToast({ title: isWeapp ? '备份文件已生成' : '备份已下载', icon: 'none' });
        } catch (error) {
          const msg = String((error as { errMsg?: string })?.errMsg ?? '');
          // 用户在转发面板点了取消：什么都不做
          if (msg.includes('cancel')) return;
          Taro.setClipboardData({ data: text }).catch(() => undefined);
          showToast({ title: '已改为复制备份内容', icon: 'none' });
        }
      }
    });
  };

  const handleRestoreBackup = () => {
    showActionSheet({
      itemList: [isWeapp ? '从聊天文件选择' : '选择本地文件', '从剪贴板恢复'],
      success: async (res) => {
        let text: string | null = null;
        try {
          if (res.tapIndex === 1) {
            const clip = await Taro.getClipboardData();
            text = clip.data ?? null;
          } else {
            text = await pickBackupFile();
          }
        } catch {
          showToast({ title: '读取失败，请重试', icon: 'none' });
          return;
        }
        if (!text) return;

        const parsed = parseBackup(text);
        if (!parsed.ok) {
          showModal({ title: '无法恢复', content: parsed.error, showCancel: false });
          return;
        }
        const summary = summarize(parsed.payload.data);
        showModal({
          title: '恢复备份',
          content: confirmTextOf(summary),
          confirmText: '覆盖恢复',
          confirmColor: '#f8736a',
          success: (result) => {
            if (!result.confirm) return;
            applyBackup(parsed.payload);
            showToast({ title: '已恢复备份', icon: 'none' });
          }
        });
      }
    });
  };

  /** 失败统一弹窗，云端的错误文案在 cloudBackup 里已经翻成人话 */
  const alertError = (error: unknown) => {
    const message = (error as Error)?.message || '操作失败，稍后再试';
    showModal({ title: '操作失败', content: message, showCancel: false });
  };

  const handleCloudBackup = () => {
    showActionSheet({
      itemList: ['立即同步到云端', '从云端恢复'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          Taro.showLoading({ title: '备份中', mask: true });
          try {
            const meta = await uploadCloudBackup();
            Taro.hideLoading();
            setLastSyncAt(meta.createdAt);
            showToast({ title: `已备份 ${meta.summary.sessions} 条训练`, icon: 'none' });
          } catch (error) {
            Taro.hideLoading();
            alertError(error);
          }
          return;
        }

        Taro.showLoading({ title: '读取中', mask: true });
        let list: Awaited<ReturnType<typeof listCloudBackups>> = [];
        try {
          list = await listCloudBackups();
        } catch (error) {
          Taro.hideLoading();
          alertError(error);
          return;
        }
        Taro.hideLoading();
        if (!list.length) {
          showModal({
            title: '云端还没有备份',
            content: '先点「备份到云端」，之后换手机就能直接恢复。',
            showCancel: false
          });
          return;
        }

        showActionSheet({
          itemList: list
            .slice(0, 6)
            .map(
              (item) =>
                `${dayjs(item.createdAt).format('M/D HH:mm')} · ${item.summary.sessions} 条训练`
            ),
          success: async (picked) => {
            const target = list[picked.tapIndex];
            if (!target) return;
            Taro.showLoading({ title: '恢复中', mask: true });
            try {
              const payload = await downloadCloudBackup(target.backupId);
              Taro.hideLoading();
              showModal({
                title: '恢复备份',
                content: confirmTextOf(target.summary),
                confirmText: '覆盖恢复',
                confirmColor: '#f8736a',
                success: (result) => {
                  if (!result.confirm) return;
                  applyBackup(payload);
                  showToast({ title: '已恢复备份', icon: 'none' });
                }
              });
            } catch (error) {
              Taro.hideLoading();
              alertError(error);
            }
          }
        });
      }
    });
  };

  return (
    <View className={classnames(styles.page, themeClass)}>
      {/* 提示音弹层打开时锁住页面滚动 */}
      <ScrollLock lock={soundSheet} />
      <View className={styles.profile}>
        <View className={styles.profileTop}>
          <View className={styles.avatar} onClick={handleAvatar}>
            {isImageAvatar(profile.avatar) ? (
              <Image className={styles.avatarImg} src={profile.avatar} mode="aspectFill" />
            ) : (
              <Text className={styles.avatarText}>{profile.avatar}</Text>
            )}
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
        {/* 微信身份：云开发自动带 openid，换手机同一微信即可恢复数据 */}
        <View className={styles.accountBar} onClick={cloudAvailable() ? handleCloudBackup : undefined}>
          <View className={styles.accountBadge}>
            <Text className={styles.accountBadgeText}>
              {cloudAvailable() ? '微信已登录' : '本地模式'}
            </Text>
          </View>
          <Text className={styles.accountSync}>
            {cloudAvailable() ? syncHint : '网页版不支持云端同步'}
          </Text>
          {cloudAvailable() ? <Text className={styles.accountAction}>同步</Text> : null}
        </View>
      </View>

      <Text className={styles.sectionLabel}>训练偏好</Text>
      <View className={styles.group}>
        <View className={classnames(styles.row, styles.rowBorder)} onClick={handleThemeSelect}>
          <View>
            <Text className={styles.rowLabel}>外观主题</Text>
            <Text className={styles.rowSub}>橙黑 / 橙白两套配色</Text>
          </View>
          <View className={styles.rowValue}>
            <Text className={styles.rowValueText}>
              {THEMES.find((item) => item.key === theme)?.label ?? '橙黑'}
            </Text>
            <Text className={styles.rowArrow}>›</Text>
          </View>
        </View>
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
            <Text className={styles.rowLabel}>训练报告</Text>
            <Text className={styles.rowSub}>计划详情页底部展示本次训练报告</Text>
          </View>
          <View className={styles.rowValue}>
            <Switch
              checked={profile.noteEnabled}
              color="#ff6b2c"
              onChange={(event) => updateProfile({ noteEnabled: event.detail.value })}
            />
          </View>
        </View>
        <View className={styles.row}>
          <View>
            <Text className={styles.rowLabel}>训练动作特殊备注</Text>
            <Text className={styles.rowSub}>选完动作感受后弹窗询问是否补充备注</Text>
          </View>
          <View className={styles.rowValue}>
            <Switch
              checked={profile.feelNotePromptEnabled}
              color="#ff6b2c"
              onChange={(event) => updateProfile({ feelNotePromptEnabled: event.detail.value })}
            />
          </View>
        </View>
      </View>

      <Text className={styles.sectionLabel}>数据管理</Text>
      <View className={styles.group}>
        {cloudAvailable() ? (
          <View
            className={classnames(styles.row, styles.rowBorder)}
            onClick={handleCloudBackup}
          >
            <View>
              <Text className={styles.rowLabel}>云端同步</Text>
              <Text className={styles.rowSub}>
                自动备份到你自己的云空间，换手机微信登录即可恢复
              </Text>
            </View>
            <Text className={styles.rowArrow}>›</Text>
          </View>
        ) : null}
        <View
          className={classnames(styles.row, styles.rowBorder)}
          onClick={handleExportBackup}
        >
          <View>
            <Text className={styles.rowLabel}>导出备份</Text>
            <Text className={styles.rowSub}>
              {isWeapp ? '生成文件发给文件传输助手，换机可恢复' : '下载 JSON 文件，换设备可恢复'}
            </Text>
          </View>
          <Text className={styles.rowArrow}>›</Text>
        </View>
        <View
          className={classnames(styles.row, styles.rowBorder)}
          onClick={handleRestoreBackup}
        >
          <View>
            <Text className={styles.rowLabel}>恢复备份</Text>
            <Text className={styles.rowSub}>从备份文件恢复，会覆盖当前全部数据</Text>
          </View>
          <Text className={styles.rowArrow}>›</Text>
        </View>
        <View className={classnames(styles.row, styles.rowDanger)} onClick={handleClearAll}>
          <Text className={styles.rowLabel}>清空全部数据</Text>
          <Text className={styles.rowArrow}>›</Text>
        </View>
      </View>

      <Text className={styles.sectionLabel}>帮助</Text>
      <View className={styles.group}>
        <View className={styles.row} onClick={() => navigateTo({ url: '/subpackages/misc/onboarding/index' })}>
          <View>
            <Text className={styles.rowLabel}>重看新手引导</Text>
            <Text className={styles.rowSub}>重新填写基本情况和训练经验</Text>
          </View>
          <Text className={styles.rowArrow}>›</Text>
        </View>
      </View>

      <View className={styles.about}>
        <Text className={styles.aboutText}>练记 FitLog · v{appVersion()}</Text>
        <Text className={styles.aboutText}>数据默认只存本机；云端备份仅存进你自己的云空间</Text>
        <Text className={styles.aboutText}>食物图片来自 Pixabay（可免费商用）</Text>
        <Text
          className={classnames(styles.aboutText, styles.aboutLink)}
          onClick={() => {
            Taro.setClipboardData({ data: 'https://repdb.co' })
              .then(() => showToast({ title: '链接已复制', icon: 'none' }))
              .catch(() => undefined);
          }}
        >
          动作示范：Exercise data by RepDB (repdb.co) · 点击复制
        </Text>
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
