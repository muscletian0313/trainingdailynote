import React, { useRef, useState } from 'react';
import { View, Text, Image, PickerView, PickerViewColumn } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Gender, TrainingLevel } from '@/types';
import { GENDER_AVATAR } from '@/assets/avatars';
import { useProfileStore } from '@/store/useProfileStore';
import { showToast } from '@/utils/taro';
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

const AGE_LABELS = Array.from({ length: 101 }, (_, index) => String(index));
const WEIGHT_LABELS = Array.from({ length: 201 }, (_, index) => String(index));
const FREQUENCY_LABELS = Array.from({ length: 51 }, (_, index) => String(index));
/** 训练年限：1~12 个月 + 1~100 年，给新手留出「不到一年」的空间 */
const YEAR_LABELS = [
  ...Array.from({ length: 12 }, (_, index) => String(index + 1)),
  ...Array.from({ length: 100 }, (_, index) => String(index + 1))
];
/** 「1 年」在 YEAR_LABELS 里的下标，也是滚轮的默认落点 */
const YEAR_ONE_INDEX = 12;

interface WheelPickerProps {
  /** 当前选中项的下标 */
  index: number;
  /** 每一项的显示文案 */
  labels: string[];
  unit: string;
  onChange: (index: number) => void;
}

/** 上下滚动的选择器：中间一行放大高亮，越远越淡 */
const WheelPicker: React.FC<WheelPickerProps> = ({ index, labels, unit, onChange }) => (
  <View className={styles.wheelWrap}>
    <PickerView
      className={styles.wheel}
      indicatorStyle="height: 80rpx; background: rgba(255, 255, 255, 0.05); border-top: 2rpx solid rgba(255, 255, 255, 0.08); border-bottom: 2rpx solid rgba(255, 255, 255, 0.08);"
      maskStyle="background: none;"
      value={[index]}
      onChange={(event) => onChange(Number(event.detail.value[0]))}
    >
      <PickerViewColumn>
        {labels.map((label, itemIndex) => {
          const distance = Math.abs(itemIndex - index);
          return (
            <View key={itemIndex} className={styles.wheelRow}>
              <Text
                className={classnames(
                  styles.wheelNum,
                  distance === 0 && styles.wheelNumActive,
                  distance >= 2 && styles.wheelNumFar
                )}
              >
                {label}
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
  /** 是否已从开屏说明页进入答题 */
  const [started, setStarted] = useState(false);

  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70);
  const [experience, setExperience] = useState<TrainingLevel | null>(null);
  /** 训练年限滚轮的下标：0~11 是 1~12 个月，12 起是 1~100 年 */
  const [yearIndex, setYearIndex] = useState(YEAR_ONE_INDEX);
  const [frequency, setFrequency] = useState(3);
  /** 用户手动调过体重后，切换性别不再覆盖 */
  const weightTouched = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = () => {
    setStep((prev) => Math.min(TOTAL - 1, prev + 1));
  };

  /** 单选题必须选过才能往下走，避免一路点「下一步」空着提交 */
  const handleNext = () => {
    if (step === 0 && !gender) {
      showToast({ title: '请先选择性别', icon: 'none' });
      return;
    }
    if (step === 3 && !experience) {
      showToast({ title: '请选择训练经验', icon: 'none' });
      return;
    }
    goNext();
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
      // 不到一年按 0 记，避免把新手算成练了一年
      trainingYears: yearIndex < YEAR_ONE_INDEX ? 0 : yearIndex - YEAR_ONE_INDEX + 1,
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

  /** 收尾页 CTA：再存一次（幂等，防止答题过程中的写入意外丢失）后去制定计划 */
  const handleCreatePlan = () => {
    saveAnswers();
    Taro.navigateTo({ url: '/pages/plan-edit/index' });
  };

  /** 收尾页的另一个出口：直接进主页 */
  const handleGoHome = () => {
    saveAnswers();
    Taro.switchTab({ url: '/pages/home/index' });
  };

  /** 开屏说明页：先讲清楚要花多久，愿意就下一步，不愿意直接跳过 */
  const renderIntro = () => (
    <Text className={styles.introLead}>为了更好的用户体验，请花30秒让我了解你</Text>
  );

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
          <WheelPicker index={age} labels={AGE_LABELS} unit="岁" onChange={setAge} />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text className={styles.title}>你的体重</Text>
          <Text className={styles.subtitle}>用于推算负重起点与有氧消耗</Text>
          <WheelPicker index={weight} labels={WEIGHT_LABELS} unit="kg" onChange={changeWeight} />
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
          <Text className={styles.subtitle}>从开始规律训练算起，不到一年就选几个月</Text>
          <WheelPicker
            index={yearIndex}
            labels={YEAR_LABELS}
            unit={yearIndex < YEAR_ONE_INDEX ? '个月' : '年'}
            onChange={setYearIndex}
          />
        </>
      );
    }

    return (
      <>
        <Text className={styles.title}>每周训练频次</Text>
        <Text className={styles.subtitle}>平均每周练几次</Text>
        <WheelPicker
          index={frequency}
          labels={FREQUENCY_LABELS}
          unit="次/周"
          onChange={setFrequency}
        />
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

  /** 底部进度条 / 收尾页说明，三态互斥 */
  const renderFooterTop = () => {
    if (done) {
      return <Text className={styles.doneHint}>现在，给自己排一份练得下去的计划</Text>;
    }
    if (!started) return null;
    return (
      <View className={styles.progressRow}>
        <Text className={styles.step}>
          {step + 1} / {TOTAL}
        </Text>
        <View className={styles.track}>
          <View className={styles.fill} style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
        </View>
      </View>
    );
  };

  const renderActions = () => {
    if (done) {
      return (
        <>
          <View className={styles.ghostBtn} onClick={handleGoHome}>
            <Text className={styles.ghostText}>进入主页</Text>
          </View>
          <View className={styles.primaryBtn} onClick={handleCreatePlan}>
            <Text className={styles.primaryText}>制定计划</Text>
          </View>
        </>
      );
    }
    // 开屏说明页：跳过 / 下一步
    if (!started) {
      return (
        <>
          <View className={styles.ghostBtn} onClick={skipQuestionnaire}>
            <Text className={styles.ghostText}>跳过</Text>
          </View>
          <View className={styles.primaryBtn} onClick={() => setStarted(true)}>
            <Text className={styles.primaryText}>下一步</Text>
          </View>
        </>
      );
    }
    return (
      <>
        {step > 0 ? (
          <View className={styles.ghostBtn} onClick={() => setStep(step - 1)}>
            <Text className={styles.ghostText}>上一步</Text>
          </View>
        ) : null}
        <View
          className={styles.primaryBtn}
          onClick={step === TOTAL - 1 ? completeQuestionnaire : handleNext}
        >
          <Text className={styles.primaryText}>{step === TOTAL - 1 ? '完成' : '下一步'}</Text>
        </View>
      </>
    );
  };

  return (
    <View
      className={styles.page}
      style={{ paddingTop: `${statusBarHeight + 12}px` }}
    >
      {started && !done && (
        <View className={styles.topbar}>
          <Text className={styles.skip} onClick={skipQuestionnaire}>
            跳过
          </Text>
        </View>
      )}

      <View className={styles.body}>
        {done ? renderDone() : started ? renderQuestion() : renderIntro()}
      </View>

      <View className={styles.footer}>
        {renderFooterTop()}
        <View className={styles.actions}>{renderActions()}</View>
      </View>
    </View>
  );
};

export default OnboardingPage;
