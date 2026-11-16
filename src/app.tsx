import { useEffect } from 'react';
import Taro, { useDidShow, useDidHide } from '@tarojs/taro';
import dayjs from 'dayjs';
import { applyNativeTheme } from '@/hooks/usePageTheme';
import { useThemeStore } from '@/store/useThemeStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useDietStore } from '@/store/useDietStore';
import { useBodyStore } from '@/store/useBodyStore';
import { applyBackup } from '@/utils/backup';
import {
  autoSyncToCloud,
  cloudAvailable,
  downloadCloudBackup,
  listCloudBackups,
  scheduleCloudSync
} from '@/utils/cloudBackup';
// 全局样式
import './app.scss';

/** 云开发环境：食物图、器械图放云存储，避免主包超过 2MB */
export const CLOUD_ENV_ID = 'rixunji-fight-d8gfo915aee0b48d1';

/** 新设备第一次打开、本地没数据时，问一句要不要从云端恢复 */
async function offerCloudRestore(): Promise<void> {
  if (!cloudAvailable()) return;
  if (useSessionStore.getState().sessions.length) return;
  try {
    const list = await listCloudBackups();
    if (!list.length) return;
    const latest = list[0];
    Taro.showModal({
      title: '发现云端备份',
      content: `${dayjs(latest.createdAt).format('M月D日 HH:mm')} 的备份，含 ${latest.summary.sessions} 条训练、${latest.summary.plans} 个计划。要恢复到这台手机吗？`,
      confirmText: '恢复',
      cancelText: '先不用',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const payload = await downloadCloudBackup(latest.backupId);
          applyBackup(payload);
          Taro.showToast({ title: '已恢复云端数据', icon: 'none' });
        } catch {
          Taro.showToast({ title: '恢复失败，稍后再试', icon: 'none' });
        }
      }
    });
  } catch {
    // 云端不可用时静默，不打扰使用
  }
}

function App(props) {
  // 冷启动先按存档主题校正一次原生导航栏 / tabBar，避免第一屏闪一下默认深色
  useEffect(() => {
    applyNativeTheme(useThemeStore.getState().theme);
    if (process.env.TARO_ENV === 'weapp') {
      Taro.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
    }
  }, []);

  // 数据变了就排队自动同步；换设备冷启动时问一次是否恢复
  useEffect(() => {
    if (process.env.TARO_ENV !== 'weapp') return;
    const unsubscribes = [
      useSessionStore.subscribe(() => scheduleCloudSync()),
      usePlanStore.subscribe(() => scheduleCloudSync()),
      useDietStore.subscribe(() => scheduleCloudSync()),
      useBodyStore.subscribe(() => scheduleCloudSync())
    ];
    const timer = setTimeout(() => {
      void offerCloudRestore();
    }, 4000);
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      clearTimeout(timer);
    };
  }, []);

  // 对应 onShow
  useDidShow(() => {});

  // 切后台时补一次同步，避免刚练完就退出导致这次记录没上云
  useDidHide(() => {
    if (process.env.TARO_ENV === 'weapp') {
      void autoSyncToCloud();
    }
  });

  return props.children;
}

export default App;
