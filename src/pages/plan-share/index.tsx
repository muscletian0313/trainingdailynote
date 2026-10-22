import React, { useEffect } from 'react';
import { View } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { redirectTo } from '@/utils/taro';
import styles from './index.module.scss';

/**
 * 老版本分享链接的落地页：现在分享统一走计划详情页，
 * 这里只负责把 ?d= 参数原样转过去，保证旧链接依然能打开。
 */
const PlanSharePage: React.FC = () => {
  const router = useRouter();
  const raw = router.params?.d;

  useEffect(() => {
    redirectTo({
      url: raw ? `/pages/plan-detail/index?d=${raw}` : '/pages/plans/index'
    });
  }, [raw]);

  return <View className={styles.page} />;
};

export default PlanSharePage;
