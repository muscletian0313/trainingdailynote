import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useBodyStore } from '@/store/useBodyStore';
import { setNavigationBarTitle } from '@/utils/taro';
import BodyDataView from '@/components/BodyDataView';
import WeightChart, { trendMetricKeys, SETTINGS_ORDER, MARK_LABELS } from '@/components/WeightChart';
import { usePageTheme } from '@/hooks/usePageTheme';
import styles from './index.module.scss';

type Unit = 'kg' | 'jin';
type Tab = 'data' | 'chart' | 'calendar';

const TABS: { key: Tab; label: string }[] = [
  { key: 'data', label: '数据' },
  { key: 'chart', label: '趋势图' },
  { key: 'calendar', label: '日历' }
];

const BodyPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const isSettings = router.params?.mode === 'settings';
  const isChartOnly = router.params?.tab === 'chart';
  /** 从日历点某一天进来：只要数据区，日期栏和 tab 都不要 */
  const fromCalendar = !!router.params?.date;
  const dateParam = router.params?.date || dayjs().format('YYYY-MM-DD');
  const isToday = dateParam === dayjs().format('YYYY-MM-DD');
  const records = useBodyStore((state) => state.records);
  const targetWeight = useBodyStore((state) => state.targetWeight);

  const [tab, setTab] = useState<Tab>(router.params?.tab === 'chart' ? 'chart' : 'data');
  // 单位全局共享：设置面板和身体页头部都能改
  const unit = useBodyStore((state) => state.bodyUnit);
  const setUnit = useBodyStore((state) => state.setBodyUnit);
  const hiddenMarks = useBodyStore((state) => state.hiddenMarks);
  const toggleMark = useBodyStore((state) => state.toggleMark);

  // 设置页把导航栏标题改成「设置」（默认是「体重 & 维度」）
  useEffect(() => {
    if (isSettings) setNavigationBarTitle({ title: '设置' });
  }, [isSettings]);

  /** 趋势图：体重/体脂固定在前，后面跟齿轮里选中的围度（成对拆左右） */
  const charts = trendMetricKeys(hiddenMarks).map((key) => (
    <WeightChart key={key} records={records} targetWeight={targetWeight} metricKey={key} />
  ));

  const dateText = isToday ? `今天 · ${dayjs(dateParam).format('M月D日')}` : dayjs(dateParam).format('M月D日');
  const hasRecord = records.some((item) => item.date === dateParam);
  const hintText = isToday ? '填了就记录到今天' : (hasRecord ? '查看当天记录' : '当天没有记录');

  // 设置页：齿轮点进来的独立页，左滑/返回键回到上一页（不会退出小程序）
  if (isSettings) {
    return (
      <View className={classnames(styles.page, themeClass)}>
        <Text className={styles.settingsTitle}>设置</Text>

        <Text className={styles.groupTitle}>体重单位</Text>
        <View className={styles.unitRow}>
          {(['kg', 'jin'] as Unit[]).map((item) => (
            <View
              key={item}
              className={classnames(styles.unitItem, unit === item && styles.unitItemActive)}
              onClick={() => setUnit(item)}
            >
              <Text className={classnames(styles.unitText, unit === item && styles.unitTextActive)}>
                {item === 'kg' ? '公斤' : '斤'}
              </Text>
            </View>
          ))}
        </View>

        <Text className={styles.groupTitle}>围度显示</Text>
        <Text className={styles.groupDesc}>
          关掉的项，人体图上的名称、点和输入框会一起隐藏，趋势图里也不再显示
        </Text>
        <View className={styles.marksList}>
          {SETTINGS_ORDER.map((key) => {
            const shown = !hiddenMarks.includes(key);
            return (
              <View key={key} className={styles.markRow} onClick={() => toggleMark(key)}>
                <Text className={styles.markRowLabel}>{MARK_LABELS[key]}</Text>
                <View className={classnames(styles.switch, shown && styles.switchOn)}>
                  <View className={classnames(styles.switchDot, shown && styles.switchDotOn)} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // 从日历页「趋势图 ›」进来：精简版，只显示图表
  if (isChartOnly) {
    return (
      <View className={classnames(styles.page, themeClass)}>
        {charts}
      </View>
    );
  }

  // 从日历点某一天进来：只保留数据区（三张卡 + 人体图），不带设置齿轮
  if (fromCalendar) {
    return (
      <View className={classnames(styles.page, themeClass)}>
        <BodyDataView date={dateParam} editable={isToday} showSettings={false} />
      </View>
    );
  }

  return (
    <View className={classnames(styles.page, themeClass)}>
      <View className={styles.head}>
        {!isToday && (
          <Text
            style={{ fontSize: '48rpx', color: '#fff', lineHeight: '1' }}
            onClick={() => Taro.navigateBack()}
          >
            ‹
          </Text>
        )}
        <View className={styles.dateBox} style={{ flex: 1 }}>
          <Text className={styles.dateText}>{dateText}</Text>
          <Text className={styles.dateHint}>{hintText}</Text>
        </View>
        <View className={styles.unitSwitch}>
          {(['kg', 'jin'] as Unit[]).map((item) => (
            <View
              key={item}
              className={classnames(styles.unitItem, unit === item && styles.unitItemActive)}
              onClick={() => setUnit(item)}
            >
              <Text className={classnames(styles.unitText, unit === item && styles.unitTextActive)}>
                {item === 'kg' ? '公斤' : '斤'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.tabs}>
        {TABS.map((item) => (
          <View
            key={item.key}
            className={classnames(styles.tab, tab === item.key && styles.tabActive)}
            onClick={() => setTab(item.key)}
          >
            <Text className={classnames(styles.tabText, tab === item.key && styles.tabTextActive)}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {tab === 'data' ? (
        <BodyDataView date={dateParam} editable={isToday} />
      ) : tab === 'chart' ? (
        charts
      ) : (
        <View className={styles.placeholder}>
          <Text className={styles.placeholderTitle}>日历 · 开发中</Text>
          <Text className={styles.placeholderDesc}>之后这里用日历展示每天记录的数据</Text>
        </View>
      )}
    </View>
  );
};

export default BodyPage;
