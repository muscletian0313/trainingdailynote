import React, { useRef, useState } from 'react';
import { View, Text, Image, PickerView, PickerViewColumn } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Gender, TrainingLevel } from '@/types';
import { LEVEL_NICKNAMES } from '@/constants';
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
/** 训练年限：年 0~100、月 0~12，两列各选各的 */
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => String(index));
const MONTH_OPTIONS = Array.from({ length: 13 }, (_, index) => String(index));

interface WheelPickerProps {
  /** 当前选中项的下标 */
  index: number;
  /** 每一项的显示文案 */
  labels: string[];
  /** 右侧统一单位；文案里已经带单位时就不用传 */
  unit?: string;
  onChange: (index: number) => void;
}

/** 单列内容：中间一行放大高亮，越远越淡 */
const WheelColumn: React.FC<{ labels: string[]; activeIndex: number }> = ({
  labels,
  activeIndex
}) => (
  <PickerViewColumn>
    {labels.map((label, itemIndex) => {
      const distance = Math.abs(itemIndex - activeIndex);
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
);

const INDICATOR_STYLE =
  'height: 80rpx; background: rgba(255, 255, 255, 0.05); border-top: 2rpx solid rgba(255, 255, 255, 0.08); border-bottom: 2rpx solid rgba(255, 255, 255, 0.08);';

/** 上下滚动的选择器：右侧可以带一个固定单位 */
const WheelPicker: React.FC<WheelPickerProps> = ({ index, labels, unit, onChange }) => (
  <View className={styles.wheelWrap}>
    <PickerView
      className={styles.wheel}
      indicatorStyle={INDICATOR_STYLE}
      maskStyle="background: none;"
      value={[index]}
      onChange={(event) => onChange(Number(event.detail.value[0]))}
    >
      <WheelColumn labels={labels} activeIndex={index} />
    </PickerView>

    {/* 原生蒙层是白色渐隐，在深色页面上很突兀，已置为透明，改用这里的深色渐隐 */}
    <View className={styles.wheelFadeTop} />
    <View className={styles.wheelFadeBottom} />

    {unit ? (
      <View className={styles.wheelUnit}>
        <Text className={styles.wheelUnitText}>{unit}</Text>
      </View>
    ) : null}
  </View>
);

interface DurationPickerProps {
  years: number;
  months: number;
  onChangeYears: (value: number) => void;
  onChangeMonths: (value: number) => void;
}

/** 训练年限：年 + 个月 两列并排，各选各的 */
const DurationPicker: React.FC<DurationPickerProps> = ({
  years,
  months,
  onChangeYears,
  onChangeMonths
}) => (
  <View className={styles.durationWrap}>
    <View className={styles.durationHead}>
      <View className={styles.durationHeadCell}>
        <Text className={styles.durationHeadText}>年</Text>
      </View>
      <View className={styles.durationHeadCell}>
        <Text className={styles.durationHeadText}>月</Text>
      </View>
    </View>

    <View className={styles.durationBody}>
      <PickerView
        className={styles.durationWheel}
        indicatorStyle={INDICATOR_STYLE}
        maskStyle="background: none;"
        value={[years, months]}
        onChange={(event) => {
          onChangeYears(Number(event.detail.value[0]));
          onChangeMonths(Number(event.detail.value[1]));
        }}
      >
        <WheelColumn labels={YEAR_OPTIONS} activeIndex={years} />
        <WheelColumn labels={MONTH_OPTIONS} activeIndex={months} />
      </PickerView>

      <View className={styles.wheelFadeTop} />
      <View className={styles.wheelFadeBottom} />
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
  /** 训练年限：年 0~100、月 0~12，默认都是 0 */
  const [trainYears, setTrainYears] = useState(0);
  const [trainMonths, setTrainMonths] = useState(0);
  const [frequency, setFrequency] = useState(3);
  /** 用户自己调过体重后，切换性别不再覆盖它 */
  const weightTouched = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = () => {
    setStep((prev) => Math.min(TOTAL - 1, prev + 1));
  };

  /**
   * 只有「没有默认值」的单选题需要强制作答；
   * 滚轮题都有默认值，用户认可默认就直接下一步。
   */
  const unansweredHint = (): string | null => {
    if (step === 0 && !gender) return '请先选择性别';
    if (step === 3 && !experience) return '请选择训练经验';
    return null;
  };

  const handleNext = () => {
    const hint = unansweredHint();
    if (hint) {
      showToast({ title: hint, icon: 'none' });
      return;
    }
    if (step === TOTAL - 1) {
      completeQuestionnaire();
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
    // 用户自己调过体重就尊重他的选择，不跟着性别改
    if (!weightTouched.current) setWeight(value === 'male' ? 70 : 50);
    autoAdvance();
  };

  const chooseLevel = (value: TrainingLevel) => {
    setExperience(value);
    autoAdvance();
  };

  const pickAge = (value: number) => {
    setAge(value);
  };

  const pickWeight = (value: number) => {
    weightTouched.current = true;
    setWeight(value);
  };

  const pickYears = (value: number) => {
    setTrainYears(value);
  };

  const pickMonths = (value: number) => {
    setTrainMonths(value);
  };

  const pickFrequency = (value: number) => {
    setFrequency(value);
  };

  /** 记录问卷结果（昵称、头像都按问卷选择同步） */
  const saveAnswers = () => {
    const level = experience ?? 'beginner';
    const pickedGender = gender ?? 'male';
    updateProfile({
      onboardedAt: Date.now(),
      gender: pickedGender,
      age,
      weight,
      experience: level,
      trainingYears: trainYears,
      trainingMonths: trainMonths,
      trainingFrequency: frequency,
      nickname: LEVEL_NICKNAMES[level],
      avatar: GENDER_AVATAR[pickedGender]
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
          <WheelPicker index={age} labels={AGE_LABELS} unit="岁" onChange={pickAge} />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text className={styles.title}>你的体重</Text>
          <Text className={styles.subtitle}>用于推算负重起点与有氧消耗</Text>
          <WheelPicker index={weight} labels={WEIGHT_LABELS} unit="kg" onChange={pickWeight} />
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
          <Text className={styles.subtitle}>从开始规律训练算起，年数和月数分开选</Text>
          <DurationPicker
            years={trainYears}
            months={trainMonths}
            onChangeYears={pickYears}
            onChangeMonths={pickMonths}
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
          onChange={pickFrequency}
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
      return <Text className={styles.doneHint}>现在给自己制定一份可执行的训练计划</Text>;
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
        <View className={styles.primaryBtn} onClick={handleNext}>
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
