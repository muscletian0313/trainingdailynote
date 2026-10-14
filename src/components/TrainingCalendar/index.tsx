import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { showActionSheet } from '@/utils/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { Session } from '@/types';
import { groupSessionsByDate, sessionVolume } from '@/utils/workout';
import { formatVolume } from '@/utils/format';
import styles from './index.module.scss';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface TrainingCalendarProps {
  sessions: Session[];
  onPickSession: (sessionId: string) => void;
}

const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ sessions, onPickSession }) => {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));

  const byDate = useMemo(() => groupSessionsByDate(sessions), [sessions]);
  const todayKey = dayjs().format('YYYY-MM-DD');

  const cells = useMemo(() => {
    const offset = (month.day() + 6) % 7; // 周一为一周第一天
    const daysInMonth = month.daysInMonth();
    const list: (number | null)[] = [];
    for (let i = 0; i < offset; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) list.push(day);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [month]);

  const monthCount = useMemo(
    () => Object.keys(byDate).filter((key) => dayjs(key).isSame(month, 'month')).length,
    [byDate, month]
  );

  const changeMonth = (offset: number) => {
    setMonth((prev) => prev.add(offset, 'month'));
  };

  const handleDayPress = (daySessions: Session[]) => {
    if (!daySessions.length) return;
    if (daySessions.length === 1) {
      onPickSession(daySessions[0].id);
      return;
    }
    showActionSheet({
      itemList: daySessions
        .slice(0, 6)
        .map((item) => `${item.name} · ${formatVolume(sessionVolume(item))}kg`),
      success: (res) => onPickSession(daySessions[res.tapIndex].id)
    });
  };

  return (
    <View className={styles.calendar}>
      <View className={styles.head}>
        <View className={styles.navBtn} onClick={() => changeMonth(-1)}>
          <Text className={styles.navText}>‹</Text>
        </View>
        <View className={styles.headCenter}>
          <Text className={styles.monthText}>{month.format('YYYY 年 M 月')}</Text>
          <Text className={styles.monthSub}>本月训练 {monthCount} 天</Text>
        </View>
        <View className={styles.navBtn} onClick={() => changeMonth(1)}>
          <Text className={styles.navText}>›</Text>
        </View>
      </View>

      <View className={styles.weekRow}>
        {WEEK_LABELS.map((label) => (
          <Text key={label} className={styles.weekText}>
            {label}
          </Text>
        ))}
      </View>

      <View className={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} className={styles.cell} />;
          }
          const dateKey = month.date(day).format('YYYY-MM-DD');
          const daySessions = byDate[dateKey] || [];
          const hasTraining = daySessions.length > 0;
          const isToday = dateKey === todayKey;
          return (
            <View key={dateKey} className={styles.cell}>
              <View
                className={classnames(
                  styles.dayBox,
                  hasTraining && styles.dayBoxActive,
                  isToday && styles.dayBoxToday,
                  isToday && hasTraining && styles.dayBoxTodayActive
                )}
                onClick={() => handleDayPress(daySessions)}
              >
                <Text
                  className={classnames(
                    styles.dayText,
                    hasTraining && styles.dayTextActive,
                    isToday && styles.dayTextToday,
                    isToday && hasTraining && styles.dayTextTodayActive
                  )}
                >
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default TrainingCalendar;
