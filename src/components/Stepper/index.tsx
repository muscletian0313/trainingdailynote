import React, { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 数值后缀，如 “组 / 次” */
  suffix?: string;
  /** 数值可直接点击输入（适合重量这类跨度大、靠加减太慢的数值） */
  editable?: boolean;
  compact?: boolean;
  className?: string;
}

const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  suffix,
  editable = false,
  compact = false,
  className
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(value));

  // 外部（加减按钮等）改变数值时同步输入框，输入过程中不打断用户
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const handleMinus = () => {
    const next = Math.max(min, value - step);
    if (next !== value) onChange(next);
  };

  const handlePlus = () => {
    const next = Math.min(max, value + step);
    if (next !== value) onChange(next);
  };

  const handleInput = (raw: string) => {
    setDraft(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(draft);
    const next = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
    setDraft(String(next));
    onChange(next);
  };

  return (
    <View className={classnames(styles.stepper, compact && styles.compact, className)}>
      <View
        className={classnames(styles.btn, value <= min && styles.disabled)}
        onClick={handleMinus}
      >
        <Text className={styles.btnText}>−</Text>
      </View>
      <View className={styles.valueWrap}>
        {editable ? (
          <Input
            className={styles.valueInput}
            type="digit"
            value={draft}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onInput={(event) => handleInput(event.detail.value)}
          />
        ) : (
          <Text className={styles.value}>{value}</Text>
        )}
        {suffix ? <Text className={styles.suffix}>{suffix}</Text> : null}
      </View>
      <View
        className={classnames(styles.btn, value >= max && styles.disabled)}
        onClick={handlePlus}
      >
        <Text className={styles.btnText}>+</Text>
      </View>
    </View>
  );
};

export default Stepper;
