import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import { useDietStore } from '@/store/useDietStore';
import { FIBER_TARGET, SODIUM_TARGET, macrosKcal, type DietMacros } from '@/utils/diet';
import { showToast } from '@/utils/taro';
import styles from './index.module.scss';

interface DietTargetSheetProps {
  visible: boolean;
  /** 当前目标，打开时回填到输入框 */
  carb: number;
  protein: number;
  fat: number;
  onClose: () => void;
}

type MacroKey = 'carb' | 'protein' | 'fat';

const FIELDS: { key: MacroKey; label: string; unit: string }[] = [
  { key: 'carb', label: '碳水', unit: 'g' },
  { key: 'protein', label: '蛋白质', unit: 'g' },
  { key: 'fat', label: '脂肪', unit: 'g' }
];

/** 设置每日营养目标：全屏页，只填三大宏量，热量自动按 4/4/9 算 */
const DietTargetSheet: React.FC<DietTargetSheetProps> = ({
  visible,
  carb,
  protein,
  fat,
  onClose
}) => {
  const setTarget = useDietStore((state) => state.setTarget);

  const [form, setForm] = useState({
    carb: carb > 0 ? String(carb) : '',
    protein: protein > 0 ? String(protein) : '',
    fat: fat > 0 ? String(fat) : ''
  });

  /** 每次打开用当前目标回填 */
  useEffect(() => {
    if (!visible) return;
    setForm({
      carb: carb > 0 ? String(carb) : '',
      protein: protein > 0 ? String(protein) : '',
      fat: fat > 0 ? String(fat) : ''
    });
  }, [visible, carb, protein, fat]);

  /** 右滑返回手势的起点（Hook 必须在 early return 之前） */
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!visible) return null;

  const macros: DietMacros = {
    carb: Number(form.carb) || 0,
    protein: Number(form.protein) || 0,
    fat: Number(form.fat) || 0
  };
  const kcal = macrosKcal(macros);

  /** 右滑返回：横向位移 >80 且纵向偏移 <120 视为返回手势 */
  const onTouchStart = (e: any) => {
    const t = e.touches?.[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: any) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    if (t.clientX - s.x > 80 && Math.abs(t.clientY - s.y) < 120) onClose();
  };

  const handleSave = () => {
    if (macros.carb <= 0 && macros.protein <= 0 && macros.fat <= 0) {
      showToast({ title: '至少填一项', icon: 'none' });
      return;
    }
    setTarget(macros);
    onClose();
  };

  return (
    <View className={styles.overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <View className={styles.head}>
        <Text className={styles.title}>每日营养目标</Text>
        <Text className={styles.close} onClick={onClose}>
          ✕
        </Text>
      </View>
      <Text className={styles.hint}>填碳水、蛋白质、脂肪，热量按 4 / 4 / 9 自动算</Text>

      <View className={styles.fields}>
        {FIELDS.map((field) => (
          <View key={field.key} className={styles.field}>
            <Text className={styles.fieldLabel}>{field.label}</Text>
            <View className={styles.fieldBox}>
              <Input
                className={styles.fieldInput}
                type="digit"
                value={form[field.key]}
                placeholder="0"
                placeholderStyle="color:#4a4a55"
                adjustPosition={false}
                onInput={(event) =>
                  setForm((prev) => ({ ...prev, [field.key]: event.detail.value }))
                }
              />
              <Text className={styles.fieldUnit}>{field.unit}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className={styles.summary}>
        <Text className={styles.summaryLabel}>目标热量</Text>
        <Text className={styles.summaryValue}>
          {kcal}
          <Text className={styles.summaryUnit}> kcal</Text>
        </Text>
      </View>

      <Text className={styles.fixedTip}>
        膳食纤维 {FIBER_TARGET}g、钠 {SODIUM_TARGET}mg 为固定目标，不可修改
      </Text>

      <View className={styles.actions}>
        <Text className={styles.cancel} onClick={onClose}>
          取消
        </Text>
        <View className={styles.save} onClick={handleSave}>
          <Text className={styles.saveText}>保存目标</Text>
        </View>
      </View>
    </View>
  );
};

export default DietTargetSheet;