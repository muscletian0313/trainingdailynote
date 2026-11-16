import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface ActionSheetProps {
  visible: boolean;
  items: string[];
  /** 危险操作（删除）：文字标红 */
  danger?: string;
  onClose: () => void;
  onSelect: (item: string) => void;
}

/**
 * 底部操作菜单。
 *
 * 微信原生 showActionSheet 最多只支持 6 项，动作多了（超级组 + 递减组）
 * 就会整条菜单弹不出来，所以这里自己画一个，不限制项数。
 */
const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  items,
  danger,
  onClose,
  onSelect
}) => {
  if (!visible) return null;
  return (
    <View className={styles.mask} onClick={onClose}>
      <View className={styles.sheet} onClick={(event) => event.stopPropagation()}>
        {items.map((item) => (
          <View
            key={item}
            className={styles.item}
            onClick={() => {
              onSelect(item);
            }}
          >
            <Text className={item === danger ? styles.dangerText : styles.itemText}>{item}</Text>
          </View>
        ))}
        <View className={styles.cancel} onClick={onClose}>
          <Text className={styles.cancelText}>取消</Text>
        </View>
      </View>
    </View>
  );
};

export default ActionSheet;
