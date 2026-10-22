import React, { useState } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { BodyRecord } from '@/types';
import { useBodyStore, latestBodyRecord } from '@/store/useBodyStore';
import { useProfileStore } from '@/store/useProfileStore';
import { BODY_ART } from '@/assets/body/art';
import styles from './index.module.scss';

type Unit = 'kg' | 'jin';
type Tab = 'data' | 'chart' | 'calendar';
type CardKey = 'weight' | 'target' | 'bodyFat';

const TABS: { key: Tab; label: string }[] = [
  { key: 'data', label: '数据' },
  { key: 'chart', label: '图表' },
  { key: 'calendar', label: '日历' }
];

/** 围度项：左右两列标签 + 身体上的圆点；胸围/腰围直接标在身体上 */
interface MarkItem {
  key: string;
  label: string;
  side: 'left' | 'right' | 'body';
  top: number;
  /** 圆点相对中线的水平偏移（rpx，负数是左侧） */
  dx?: number;
  /** 左右各一个圆点时，另一侧的偏移 */
  dx2?: number;
  /** 单个字段 */
  field?: keyof BodyRecord;
  /** 左右两侧各一个字段 */
  left?: keyof BodyRecord;
  right?: keyof BodyRecord;
}

const MARKS: MarkItem[] = [
  { key: 'neck', label: '脖围', side: 'left', top: 16, dx: 0, field: 'neck' },
  { key: 'arm', label: '臂围', side: 'left', top: 25, dx: -89, dx2: 89, left: 'armLeft', right: 'armRight' },
  { key: 'forearm', label: '小臂', side: 'left', top: 44, dx: -102, dx2: 102, left: 'forearmLeft', right: 'forearmRight' },
  { key: 'calf', label: '小腿', side: 'left', top: 80, dx: -24, dx2: 24, left: 'calfLeft', right: 'calfRight' },
  { key: 'shoulder', label: '肩宽', side: 'right', top: 20, dx: 68, field: 'shoulder' },
  { key: 'hip', label: '臀围', side: 'right', top: 52, dx: 41, field: 'hip' },
  { key: 'thigh', label: '腿围', side: 'right', top: 64, dx: 29, dx2: -29, left: 'thighLeft', right: 'thighRight' },
  { key: 'chest', label: '胸围', side: 'body', top: 29, field: 'chest' },
  { key: 'waist', label: '腰围', side: 'body', top: 44, field: 'waist' }
];

/** 数值输入框：自己存文本，避免每次按键都被 store 回写打断 */
const MeasureInput: React.FC<{
  value?: number;
  onChange: (value?: number) => void;
  className?: string;
  /** 由外层「点名称」触发的聚焦 */
  focus?: boolean;
  onBlur?: () => void;
}> = ({ value, onChange, className, focus, onBlur }) => {
  const [text, setText] = useState(value ? String(value) : '');
  return (
    <Input
      className={classnames(styles.markInput, className)}
      type="digit"
      value={text}
      focus={focus}
      placeholder="-"
      placeholderStyle="color:#5a5a66"
      onBlur={onBlur}
      onInput={(event) => {
        const next = event.detail.value;
        setText(next);
        const num = parseFloat(next);
        onChange(Number.isFinite(num) ? num : undefined);
      }}
    />
  );
};

const BodyPage: React.FC = () => {
  const profile = useProfileStore((state) => state.profile);
  const records = useBodyStore((state) => state.records);
  const targetWeight = useBodyStore((state) => state.targetWeight);
  const updateToday = useBodyStore((state) => state.updateToday);
  const setTargetWeight = useBodyStore((state) => state.setTargetWeight);

  const [tab, setTab] = useState<Tab>('data');
  const [unit, setUnit] = useState<Unit>('kg');
  /** 正在就地编辑的卡片 */
  const [editing, setEditing] = useState<CardKey | null>(null);
  const [draft, setDraft] = useState('');
  /** 当前被聚焦的围度输入框（点名称也能唤起键盘） */
  const [focusKey, setFocusKey] = useState('');
  const blurKey = (key: string) => setFocusKey((prev) => (prev === key ? '' : prev));

  const today = records.find((item) => item.date === dayjs().format('YYYY-MM-DD'));
  const latest = latestBodyRecord(records);
  /** 没有记录时用问卷里填的体重兜底 */
  const currentWeight = latest?.weight ?? profile.weight;
  const bodyFat = latest?.bodyFat;

  const unitLabel = unit === 'kg' ? '公斤' : '斤';
  const toDisplay = (kg?: number) => {
    if (!kg) return '';
    return (unit === 'kg' ? kg : kg * 2).toFixed(1);
  };
  const toKg = (value: number) => (unit === 'kg' ? value : value / 2);

  const startEdit = (key: CardKey) => {
    const base = key === 'weight' ? currentWeight : key === 'target' ? targetWeight : bodyFat;
    setDraft(base ? toDisplay(base) : '');
    setEditing(key);
  };

  const commitEdit = () => {
    const num = parseFloat(draft);
    const valid = Number.isFinite(num);
    if (editing === 'weight') {
      updateToday({ weight: valid ? toKg(num) : undefined });
      // 顺手同步问卷里的体重：自重动作、估重都要用
      if (valid) useProfileStore.getState().updateProfile({ weight: toKg(num) });
    } else if (editing === 'bodyFat') {
      updateToday({ bodyFat: valid ? num : undefined });
    } else if (editing === 'target') {
      setTargetWeight(valid ? toKg(num) : undefined);
    }
    setEditing(null);
  };

  const record: Partial<BodyRecord> = today ?? {};

  /** 写某个围度字段（清空时传 undefined） */
  const setField = (field: string, value?: number) => {
    updateToday({ [field]: value } as Partial<BodyRecord>);
  };

  /** 标签首行高度的一半：让引线和圆点跟标签文字对齐（占整图高度 850rpx 的比例） */
  const ROW_CENTER_PCT = 3.3;
  /** rpx → 百分比（页面内容宽 686rpx） */
  const RPX_PCT = 100 / 686;
  /** 左右标签列距中线的距离（rpx） */
  const COL_GAP = 182;
  const COL_GAP_PCT = COL_GAP * RPX_PCT;

  // 注意：内联样式里的 rpx 在 H5 端会被丢掉，这里统一换算成百分比
  const dotStyle = (dx: number, top: number) => ({
    left: `${50 + dx * RPX_PCT}%`,
    top: `${top + ROW_CENTER_PCT}%`
  });

  /** 引线：从标签内侧水平连到身体上的圆点 */
  const lineStyle = (mark: MarkItem) => {
    const dx = mark.dx ?? 0;
    const top = `${mark.top + ROW_CENTER_PCT}%`;
    return mark.side === 'left'
      ? { left: `${50 - COL_GAP_PCT}%`, width: `${(COL_GAP + dx) * RPX_PCT}%`, top }
      : { right: `${50 - COL_GAP_PCT}%`, width: `${(COL_GAP - dx) * RPX_PCT}%`, top };
  };

  return (
    <View className={styles.page}>
      <View className={styles.head}>
        <View className={styles.dateBox}>
          <Text className={styles.dateText}>今天 · {dayjs().format('M月D日')}</Text>
          <Text className={styles.dateHint}>填了就记录到今天</Text>
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
        <>
          <View className={styles.stats}>
            {[
              { key: 'weight' as CardKey, label: '当前体重', value: toDisplay(currentWeight) },
              { key: 'target' as CardKey, label: '目标体重', value: toDisplay(targetWeight) },
              { key: 'bodyFat' as CardKey, label: '体脂率', value: bodyFat ? bodyFat.toFixed(1) : '' }
            ].map((item) => (
              <View
                key={item.key}
                className={styles.statCard}
                onClick={() => {
                  if (editing === item.key) return;
                  startEdit(item.key);
                }}
              >
                <Text className={styles.statLabel}>{item.label}</Text>
                {editing === item.key ? (
                  <View className={styles.statEdit}>
                    <Input
                      className={styles.statInput}
                      type="digit"
                      focus
                      value={draft}
                      placeholder="0.0"
                      placeholderStyle="color:#4a4a55"
                      onInput={(event) => setDraft(event.detail.value)}
                      onBlur={commitEdit}
                      onConfirm={commitEdit}
                    />
                    <Text className={styles.statUnit}>
                      {item.key === 'bodyFat' ? '%' : unitLabel}
                    </Text>
                  </View>
                ) : (
                  <View className={styles.statValueRow}>
                    <Text className={styles.statValue}>
                      {item.value || '0.0'}
                      <Text className={styles.statUnit}>
                        {item.key === 'bodyFat' ? '%' : unitLabel}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View className={styles.figureWrap}>
            <Image
              className={styles.figure}
              src={BODY_ART[profile.gender ?? 'male']}
              mode="aspectFit"
            />
            {MARKS.map((mark) =>
              mark.side === 'body' ? (
                <View
                  key={mark.key}
                  className={styles.bodyMark}
                  style={{ top: `${mark.top}%` }}
                  onClick={() => setFocusKey(mark.key)}
                >
                  <Text className={styles.bodyMarkLabel}>{mark.label}</Text>
                  <MeasureInput
                    className={styles.bodyInput}
                    value={record[mark.field as keyof BodyRecord] as number | undefined}
                    onChange={(value) => setField(mark.field as string, value)}
                    focus={focusKey === mark.key}
                    onBlur={() => blurKey(mark.key)}
                  />
                </View>
              ) : (
                <React.Fragment key={mark.key}>
                  <View className={styles.line} style={lineStyle(mark)} />
                  <View className={styles.dot} style={dotStyle(mark.dx as number, mark.top)} />
                  {mark.dx2 !== undefined ? (
                    <View className={styles.dot} style={dotStyle(mark.dx2, mark.top)} />
                  ) : null}
                  <View
                    className={classnames(
                      styles.mark,
                      mark.side === 'left' ? styles.markLeft : styles.markRight
                    )}
                    style={{ top: `${mark.top}%` }}
                  >
                    <View className={styles.markHead} onClick={() => setFocusKey(mark.key)}>
                      <Text className={styles.markLabel}>{mark.label}</Text>
                      {mark.field ? (
                        <MeasureInput
                          value={record[mark.field] as number | undefined}
                          onChange={(value) => setField(mark.field as string, value)}
                          focus={focusKey === mark.key}
                          onBlur={() => blurKey(mark.key)}
                        />
                      ) : (
                        <View className={styles.inputSlot} />
                      )}
                    </View>

                    {mark.left && mark.right ? (
                      <>
                        {[
                          { field: mark.left, tag: '左' },
                          { field: mark.right, tag: '右' }
                        ].map((pair) => {
                          const pairKey = `${mark.key}-${pair.tag}`;
                          return (
                            <View
                              key={pair.field}
                              className={styles.markPair}
                              onClick={() => setFocusKey(pairKey)}
                            >
                              <Text className={styles.pairTag}>-{pair.tag}</Text>
                              <MeasureInput
                                value={record[pair.field] as number | undefined}
                                onChange={(value) => setField(pair.field as string, value)}
                                focus={focusKey === pairKey}
                                onBlur={() => blurKey(pairKey)}
                              />
                            </View>
                          );
                        })}
                      </>
                    ) : null}
                  </View>
                </React.Fragment>
              )
            )}
          </View>

          <Text className={styles.hint}>围度单位：厘米（cm）· 同一天重填会覆盖当天数据</Text>
        </>
      ) : (
        <View className={styles.placeholder}>
          <Text className={styles.placeholderTitle}>
            {tab === 'chart' ? '图表' : '日历'} · 开发中
          </Text>
          <Text className={styles.placeholderDesc}>
            {tab === 'chart'
              ? '之后这里按时间画体重、体脂和围度的变化曲线'
              : '之后这里用日历展示每天记录的数据'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default BodyPage;
