import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { usePageTheme } from '@/hooks/usePageTheme';

/** diet-day 占位：统一进 stats 页切换，不再用独立页面 */
const DietDayPage: React.FC = () => {
  const themeClass = usePageTheme();
  const router = useRouter();
  const date = (router.params?.date as string) || dayjs().format('YYYY-MM-DD');

  return (
    <View className={classnames(styles.page, themeClass)}>
      <ScrollView className={styles.pageBody}>
        <Text style={{ color: '#fff', padding: '80rpx' }}>
          即将跳转到日历 {date} 的饮食详情...
        </Text>
      </ScrollView>
    </View>
  );
};

export default DietDayPage;
