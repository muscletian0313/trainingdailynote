import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Image, PickerView, PickerViewColumn } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Gender, TrainingLevel } from '@/types';
import { GENDER_AVATAR } from '@/assets/avatars';
import { useProfileStore } from '@/store/useProfileStore';
import styles from './index.module.scss';

/** 问卷总题数 */
const TOTAL = 6;

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: '男' },
  { key: 'female', label: '女' }
];

const LEVELS: { key: TrainingLevel; title: string; desc: string }[] = [
  { key: 'beginner', title: '新手', desc: '刚开始练，先把动作做标准' },
  { key: 'advanced', title: '老手', desc: '练了一阵，有固定的节奏' },
  { key: 'master', title: '大神', desc: '常年训练，追求突破' }
];

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

/** 上下滚动的数字选择：中间一行放大高亮，越远越淡 */
const WheelPicker: React.FC<WheelPickerProps> = ({ value, min, max, unit, onChange }) => {
  const items = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [min, max]
  );
  const selectedIndex = value - min;

  return (
    <View className={styles.wheelWrap}>
      <PickerView
        className={styles.wheel}
        indicatorStyle="height: 80rpx; background: rgba(255, 255, 255, 0.05); border-top: 2rpx solid rgba(255, 255, 255, 0.08); border-bottom: 2rpx solid rgba(255, 255, 255, 0.08);"
        maskStyle="background: none;"
        value={[selectedIndex]}
        onChange={(event) => {
          const next = min + Number(event.detail.value[0]);
          onChange(Math.min(max, Math.max(min, next)));
        }}
      >
        <PickerViewColumn>
          {items.map((item, index) => {
            const distance = Math.abs(index - selectedIndex);
            return (
              <View key={item} className={styles.wheelRow}>
                <Text
                  className={classnames(
                    styles.wheelNum,
                    distance === 0 && styles.wheelNumActive,
                    distance >= 2 && styles.wheelNumFar
                  )}
                >
                  {item}
                </Text>
              </View>
            );
          })}
        </PickerViewColumn>
      </PickerView>

      {/* 原生蒙层是白色渐隐，在深色页面上很突兀，已置为透明，改用这里的深色渐隐 */}
      <View className={styles.wheelFadeTop} />
      <View className={styles.wheelFadeBottom} />

      <View className={styles.wheelUnit}>
        <Text className={styles.wheelUnitText}>{unit}</Text>
      </View>
    </View>
  );
};

const OnboardingPage: React.FC = () => {
  const updateProfile = useProfileStore((state) => state.updateProfile);

  /** 顶部安全区高度，避免自定义导航被状态栏遮住 */
  const [statusBarHeight] = useState(() => {
    try {
      return Taro.getSystemInfoSync().statusBarHeight ?? 20;
    } catch (error) {
      return 20;
    }
  });

  const [step, setStep] = useState(0);

  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70);
  const [experience, setExperience] = useState<TrainingLevel | null>(null);
  const [years, setYears] = useState(1);
  const [frequency, setFrequency] = useState(3);
  /** 用户手动调过体重后，切换性别不再覆盖 */
  const weightTouched = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = () => {
    setStep((prev) => Math.min(TOTAL - 1, prev + 1));
  };

  /** 单选类题目：选完自动进入下一题（留一点时间让用户看到选中效果） */
  const autoAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(goNext, 240);
  };

  const chooseGender = (value: Gender) => {
    setGender(value);
    if (!weightTouched.current) setWeight(value === 'male' ? 70 : 50);
    autoAdvance();
  };

  const chooseLevel = (value: TrainingLevel) => {
    setExperience(value);
    autoAdvance();
  };

  const changeWeight = (value: number) => {
    weightTouched.current = true;
    setWeight(value);
  };

  /** 记录问卷结果；不做任何参数推导 */
  const saveAnswers = () => {
    updateProfile({
      onboardedAt: Date.now(),
      gender: gender ?? 'male',
      age,
      weight,
      experience: experience ?? 'beginner',
      trainingYears: years,
      trainingFrequency: frequency
    });
  };

  /** 跳过问卷：按默认值记下结果，直接回首页 */
  const skipQuestionnaire = () => {
    saveAnswers();
    Taro.switchTab({ url: '/pages/home/index' });
  };

  /** 答完最后一题：记下结果并进入收尾页 */
  const completeQuestionnaire = () => {
    saveAnswers();
    setStep(TOTAL);
  };

  /** 收尾页 CTA：直接去制定计划 */
  const handleCreatePlan = () => {
    Taro.navigateTo({ url: '/pages/plan-edit/index' });
  };

  const renderQuestion = () => {
    if (step === 0) {
      return (
        <>
          <Text className={styles.title}>你的性别</Text>
          <Text className={styles.subtitle}>用来更准确地估算消耗热量</Text>
          <View className={styles.optRow}>
            {GENDERS.map((item) => {
              const active = gender === item.key;
              return (
                <View
                  key={item.key}
                  className={classnames(styles.optCard, active && styles.optCardActive)}
                  onClick={() => chooseGender(item.key)}
                >
                  <View className={classnames(styles.avatar, active && styles.avatarActive)}>
                    <Image
                      className={styles.avatarImg}
                      src={GENDER_AVATAR[item.key]}
                      mode="aspectFill"
                    />
                  </View>
                  <Text className={classnames(styles.optLabel, active && styles.optLabelActive)}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text className={styles.title}>你的年龄</Text>
          <Text className={styles.subtitle}>上下滚动，选到你的岁数</Text>
          <WheelPicker value={age} min={0} max={100} unit="岁" onChange={setAge} />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text className={styles.title}>你的体重</Text>
          <Text className={styles.subtitle}>用于推算负重起点与有氧消耗</Text>
          <WheelPicker value={weight} min={0} max={200} unit="kg" onChange={changeWeight} />
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text className={styles.title}>训练经验</Text>
          <Text className={styles.subtitle}>选最接近你现在的情况</Text>
          <View className={styles.cardList}>
            {LEVELS.map((item) => {
              const active = experience === item.key;
              return (
                <View
                  key={item.key}
                  className={classnames(styles.card, active && styles.cardActive)}
                  onClick={() => chooseLevel(item.key)}
                >
                  <View className={classnames(styles.cardBar, active && styles.cardBarActive)} />
                  <View className={styles.cardMain}>
                    <Text className={classnames(styles.cardTitle, active && styles.cardTitleActive)}>
                      {item.title}
                    </Text>
                    <Text className={styles.cardDesc}>{item.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <Text className={styles.title}>训练年限</Text>
          <Text className={styles.subtitle}>从开始规律训练算起，不足一年就选 1</Text>
          <WheelPicker value={years} min={1} max={100} unit="年" onChange={setYears} />
        </>
      );
    }

    return (
      <>
        <Text className={styles.title}>每周训练频次</Text>
        <Text className={styles.subtitle}>平均每周练几次</Text>
        <WheelPicker value={frequency} min={0} max={50} unit="次/周" onChange={setFrequency} />
      </>
    );
  };

  /** 收尾页：竖排 slogan */
  const renderDone = () => (
    <View className={styles.slogan}>
      <Text className={styles.sloganLine}>NO</Text>
      <Text className={classnames(styles.sloganLine, styles.sloganAccent)}>PAIN</Text>
      <Text className={styles.sloganLine}>NO</Text>
      <Text className={classnames(styles.sloganLine, styles.sloganAccent)}>GAIN</Text>
    </View>
  );

  const done = step === TOTAL;

  return (
    <View
      className={styles.page}
      style={{ paddingTop: `${statusBarHeight + 12}px` }}
    >
      {!done && (
        <View className={styles.topbar}>
          <Text className={styles.skip} onClick={skipQuestionnaire}>
            跳过
          </Text>
        </View>
      )}

      <View className={styles.body}>{done ? renderDone() : renderQuestion()}</View>

      <View className={styles.footer}>
        {done ? (
          <Text className={styles.doneHint}>现在，给自己排一份练得下去的计划</Text>
        ) : (
          <View className={styles.progressRow}>
            <Text className={styles.step}>
              {step + 1} / {TOTAL}
            </Text>
            <View className={styles.track}>
              <View className={styles.fill} style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
            </View>
          </View>
        )}

        <View className={styles.actions}>
          {done ? (
            <View className={styles.primaryBtn} onClick={handleCreatePlan}>
              <Text className={styles.primaryText}>制定计划</Text>
            </View>
          ) : (
            <>
              {step > 0 ? (
                <View className={styles.ghostBtn} onClick={() => setStep(step - 1)}>
                  <Text className={styles.ghostText}>上一步</Text>
                </View>
              ) : null}
              <View
                className={styles.primaryBtn}
                onClick={step === TOTAL - 1 ? completeQuestionnaire : goNext}
              >
                <Text className={styles.primaryText}>
                  {step === TOTAL - 1 ? '完成' : '下一步'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default OnboardingPage;
