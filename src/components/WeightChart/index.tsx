import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import type { BodyRecord } from '@/types';
import { useBodyStore } from '@/store/useBodyStore';
import { useThemeStore } from '@/store/useThemeStore';
import styles from './index.module.scss';

type Unit = 'kg' | 'jin';
type RangeKey = '7' | '30' | 'all';

/** 绘图区高度（CSS 像素） */
const CANVAS_HEIGHT = 160;
/** 绘图区四周留白（CSS 像素） */
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PAD_LEFT = 2;
const PAD_RIGHT = 8;

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: '7天', days: 7 },
  { key: '30', label: '30天', days: 30 },
  { key: 'all', label: '全部', days: 0 }
];

interface MetricDef {
  key: string;
  label: string;
  get: (record: BodyRecord) => number | undefined;
  /** 单位标签：体重跟公斤/斤切换，其他固定 */
  unit: (unit: Unit) => string;
}

/** 指标严格按人体图上的名称：成对围度分左右各一条线 */
const METRICS: MetricDef[] = [
  { key: 'weight', label: '体重', get: (r) => r.weight, unit: (u) => (u === 'kg' ? 'kg' : '斤') },
  { key: 'bodyFat', label: '体脂', get: (r) => r.bodyFat, unit: () => '%' },
  { key: 'chest', label: '胸围', get: (r) => r.chest, unit: () => 'cm' },
  { key: 'waist', label: '腰围', get: (r) => r.waist, unit: () => 'cm' },
  { key: 'hip', label: '臀围', get: (r) => r.hip, unit: () => 'cm' },
  { key: 'shoulder', label: '肩宽', get: (r) => r.shoulder, unit: () => 'cm' },
  { key: 'neck', label: '脖围', get: (r) => r.neck, unit: () => 'cm' },
  { key: 'armLeft', label: '臂围左', get: (r) => r.armLeft, unit: () => 'cm' },
  { key: 'armRight', label: '臂围右', get: (r) => r.armRight, unit: () => 'cm' },
  { key: 'forearmLeft', label: '小臂左', get: (r) => r.forearmLeft, unit: () => 'cm' },
  { key: 'forearmRight', label: '小臂右', get: (r) => r.forearmRight, unit: () => 'cm' },
  { key: 'thighLeft', label: '腿围左', get: (r) => r.thighLeft, unit: () => 'cm' },
  { key: 'thighRight', label: '腿围右', get: (r) => r.thighRight, unit: () => 'cm' },
  { key: 'calfLeft', label: '小腿左', get: (r) => r.calfLeft, unit: () => 'cm' },
  { key: 'calfRight', label: '小腿右', get: (r) => r.calfRight, unit: () => 'cm' }
];

const METRIC_MAP = new Map(METRICS.map((item) => [item.key, item]));

/** 设置面板里开关的顺序：按关注度排（胸/腰/臀/腿/臂围在前，剩下随意） */
export const SETTINGS_ORDER = [
  'chest',
  'waist',
  'hip',
  'thigh',
  'arm',
  'shoulder',
  'forearm',
  'neck',
  'calf'
];

/** 设置页开关显示的名称（与人体图标签一致） */
export const MARK_LABELS: Record<string, string> = {
  chest: '胸围',
  waist: '腰围',
  hip: '臀围',
  shoulder: '肩宽',
  neck: '脖围',
  thigh: '腿围',
  arm: '臂围',
  forearm: '小臂',
  calf: '小腿'
};

/** 人体图围度项 → 趋势图指标（成对的拆左右） */
const MARK_TO_METRICS: Record<string, string[]> = {
  chest: ['chest'],
  waist: ['waist'],
  hip: ['hip'],
  shoulder: ['shoulder'],
  neck: ['neck'],
  thigh: ['thighLeft', 'thighRight'],
  arm: ['armLeft', 'armRight'],
  forearm: ['forearmLeft', 'forearmRight'],
  calf: ['calfLeft', 'calfRight']
};

/**
 * 趋势图要画的指标序列：体重/体脂固定在最前面，
 * 后面按设置面板顺序跟齿轮里选中的围度（成对的拆左右两条）。
 */
export function trendMetricKeys(hiddenMarks: string[]): string[] {
  return [
    'weight',
    'bodyFat',
    ...SETTINGS_ORDER.filter((key) => !hiddenMarks.includes(key)).flatMap(
      (key) => MARK_TO_METRICS[key]
    )
  ];
}

export interface ChartPalette {
  line: string;
  areaTop: string;
  areaMid: string;
  areaBottom: string;
  grid: string;
  axisText: string;
  tick: string;
  dotFill: string;
  target: string;
}

export const DARK_PALETTE: ChartPalette = {
  line: '#ff6b2c',
  areaTop: 'rgba(255, 107, 44, 0.42)',
  areaMid: 'rgba(255, 107, 44, 0.07)',
  areaBottom: 'rgba(255, 107, 44, 0)',
  grid: 'rgba(255, 255, 255, 0.08)',
  axisText: 'rgba(255, 255, 255, 0.55)',
  tick: 'rgba(255, 255, 255, 0.16)',
  dotFill: '#16161c',
  target: 'rgba(255, 138, 42, 0.5)'
};

export const LIGHT_PALETTE: ChartPalette = {
  line: '#f05a1a',
  areaTop: 'rgba(240, 90, 26, 0.34)',
  areaMid: 'rgba(240, 90, 26, 0.07)',
  areaBottom: 'rgba(240, 90, 26, 0)',
  grid: 'rgba(20, 20, 26, 0.1)',
  axisText: 'rgba(20, 20, 26, 0.66)',
  tick: 'rgba(20, 20, 26, 0.18)',
  dotFill: '#ffffff',
  target: 'rgba(214, 74, 10, 0.45)'
};

export interface DrawInput {
  width: number;
  height: number;
  values: number[];
  labels: string[];
  min: number;
  max: number;
  palette: ChartPalette;
  target?: number | null;
}

/** 画整张趋势图：网格 + 渐变面积 + 平滑曲线 + 数据点 + 日期轴（PR 趋势图也复用） */
export function drawChart(ctx: CanvasRenderingContext2D, input: DrawInput): void {
  const { width, height, values, labels, min, max, palette, target } = input;
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const bottom = height - PAD_BOTTOM;
  const n = values.length;

  const xOf = (index: number) => PAD_LEFT + (index / (n - 1)) * plotW;
  const yOf = (value: number) => PAD_TOP + (1 - (value - min) / (max - min)) * plotH;

  ctx.clearRect(0, 0, width, height);

  // 上下两条极淡的参考线
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  [PAD_TOP, PAD_TOP + plotH].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  });

  // 目标线：只在范围内时画一条淡虚线
  if (target && target >= min && target <= max) {
    ctx.save();
    ctx.strokeStyle = palette.target;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yOf(target));
    ctx.lineTo(width, yOf(target));
    ctx.stroke();
    ctx.restore();
  }

  // 平滑曲线：相邻两点用水平控制点的三次贝塞尔连起来
  const tracePath = () => {
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(values[0]));
    for (let i = 0; i < n - 1; i += 1) {
      const x0 = xOf(i);
      const y0 = yOf(values[i]);
      const x1 = xOf(i + 1);
      const y1 = yOf(values[i + 1]);
      const cx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
    }
  };

  // 面积：曲线 + 回到底部闭合，垂直渐变
  const gradient = ctx.createLinearGradient(0, PAD_TOP, 0, bottom);
  gradient.addColorStop(0, palette.areaTop);
  gradient.addColorStop(0.72, palette.areaMid);
  gradient.addColorStop(1, palette.areaBottom);
  tracePath();
  ctx.lineTo(xOf(n - 1), bottom);
  ctx.lineTo(xOf(0), bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // 曲线本体
  tracePath();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // 数据点
  ctx.fillStyle = palette.line;
  values.forEach((value, index) => {
    ctx.beginPath();
    ctx.arc(xOf(index), yOf(value), 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 最新点：空心大圆
  const lastX = xOf(n - 1);
  const lastY = yOf(values[n - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = palette.dotFill;
  ctx.fill();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // 日期轴：每条记录一根刻度线
  ctx.strokeStyle = palette.tick;
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i += 1) {
    ctx.beginPath();
    ctx.moveTo(xOf(i), bottom + 0.5);
    ctx.lineTo(xOf(i), bottom + 4.5);
    ctx.stroke();
  }

  // 日期文字：按实际文字宽度挑位置，首尾必显示，中间尽量多标
  ctx.fillStyle = palette.axisText;
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'alphabetic';
  const maxTextW = labels.reduce((max, label) => Math.max(max, ctx.measureText(label).width), 0);
  const minGap = maxTextW + 12;
  const shownIndexes: number[] = [0];
  for (let i = 1; i < n - 1; i += 1) {
    if (xOf(i) - xOf(shownIndexes[shownIndexes.length - 1]) >= minGap) shownIndexes.push(i);
  }
  while (shownIndexes.length > 1 && xOf(n - 1) - xOf(shownIndexes[shownIndexes.length - 1]) < minGap) {
    shownIndexes.pop();
  }
  shownIndexes.push(n - 1);
  shownIndexes.forEach((index) => {
    ctx.textAlign = index === 0 ? 'left' : index === n - 1 ? 'right' : 'center';
    ctx.fillText(labels[index], xOf(index), height - 7);
  });
}

/** H5 端 Taro 的 Canvas 组件外面还包了一层容器，真正的 canvas 要往里找 */
function resolveH5Canvas(id: string): HTMLCanvasElement | null {
  const root = document.getElementById(id);
  if (!root) return null;
  if (root.tagName === 'CANVAS') return root as unknown as HTMLCanvasElement;
  return root.querySelector('canvas');
}

interface WeightChartProps {
  records: BodyRecord[];
  targetWeight?: number;
  /** 画哪个指标 */
  metricKey: string;
}

/**
 * 单指标趋势：大号当前值 + 时间范围切换 + 平滑渐变面积图 + 三段统计。
 * 曲线与面积用 Canvas 画（小程序里没有 SVG），保证平滑和渐变效果。
 */
const WeightChart: React.FC<WeightChartProps> = ({ records, targetWeight, metricKey }) => {
  const unit = useBodyStore((state) => state.bodyUnit);
  const theme = useThemeStore((state) => state.theme);
  const metric = METRIC_MAP.get(metricKey) ?? METRICS[0];
  const isWeight = metric.key === 'weight';
  const unitLabel = metric.unit(unit);

  /** 时间范围：默认 30 天 */
  const [range, setRange] = useState<RangeKey>('30');
  const canvasId = useRef(`wc${Math.random().toString(36).slice(2, 9)}`);
  const [boxWidth, setBoxWidth] = useState(0);

  /** 体重按公斤/斤换算显示，其他指标原值 */
  const fmt = (value: number) => {
    const shown = isWeight ? (unit === 'kg' ? value : value * 2) : value;
    return shown.toFixed(1);
  };

  const allPoints = useMemo(
    () =>
      records
        .map((record) => ({
          date: record.date,
          value: metric.get(record),
          recordedAt: record.recordedAt
        }))
        .filter(
          (point): point is { date: string; value: number; recordedAt?: string } =>
            typeof point.value === 'number' && point.value > 0
        )
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [records, metric]
  );

  const points = useMemo(() => {
    const conf = RANGES.find((item) => item.key === range);
    if (!conf?.days) return allPoints;
    const from = dayjs().startOf('day').subtract(conf.days - 1, 'day');
    return allPoints.filter((point) => !dayjs(point.date).isBefore(from, 'day'));
  }, [allPoints, range]);

  /** 量一次画布宽度（切换指标/范围时重绘要用） */
  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') {
      const el = resolveH5Canvas(canvasId.current);
      if (el) setBoxWidth(el.getBoundingClientRect().width);
      return;
    }
    Taro.createSelectorQuery()
      .select(`#${canvasId.current}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const width = res?.[0]?.width;
        if (width) setBoxWidth(width);
      });
  }, []);

  /** 重绘：宽度、数据、主题、单位变化都触发 */
  useEffect(() => {
    if (!boxWidth || points.length < 2) return;
    const values = points.map((point) => point.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = (rawMax - rawMin) * 0.15 || 0.6;
    const min = rawMin - pad;
    const max = rawMax + pad;
    const labels = points.map((point) => dayjs(point.date).format('M/D'));
    const palette = theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
    const dpr = process.env.TARO_ENV === 'h5' ? window.devicePixelRatio || 1 : Taro.getSystemInfoSync().pixelRatio;

    const paint = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      canvas.width = boxWidth * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      ctx.scale(dpr, dpr);
      drawChart(ctx, {
        width: boxWidth,
        height: CANVAS_HEIGHT,
        values,
        labels,
        min,
        max,
        palette,
        target: isWeight ? targetWeight : null
      });
    };

    if (process.env.TARO_ENV === 'h5') {
      const el = resolveH5Canvas(canvasId.current);
      const ctx = el?.getContext('2d');
      if (el && ctx) paint(el, ctx);
      return;
    }

    Taro.createSelectorQuery()
      .select(`#${canvasId.current}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res?.[0]?.node as HTMLCanvasElement | undefined;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) paint(canvas, ctx);
      });
  }, [boxWidth, points, theme, isWeight, targetWeight]);

  const pills = (
    <View className={styles.pills}>
      {RANGES.map((item) => (
        <View
          key={item.key}
          className={classnames(styles.pill, range === item.key && styles.pillOn)}
          onClick={() => setRange(item.key)}
        >
          <Text className={styles.pillText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  /** 顶部：指标名 + 目标，当前值 + 变化（变化按当前时间范围算） */
  const head = (() => {
    const scoped = points.length ? points : allPoints;
    const latest = scoped[scoped.length - 1];
    const prev = scoped[scoped.length - 2];
    const delta = latest && prev ? latest.value - prev.value : 0;
    const deltaText = !latest
      ? ''
      : !prev
        ? '再记一次就能看变化'
        : delta === 0
          ? '和上次持平'
          : `${delta > 0 ? '↑' : '↓'} ${fmt(Math.abs(delta))} ${unitLabel} 较上次`;
    const timeText = latest
      ? latest.recordedAt
        ? `${dayjs(latest.date).format('M月D日')} ${latest.recordedAt} 记录`
        : `${dayjs(latest.date).format('M月D日')} 记录`
      : '';
    return (
      <View className={styles.head}>
        <View className={styles.headMain}>
          <View className={styles.headTitleRow}>
            <Text className={styles.chartTitle}>{metric.label}</Text>
            {isWeight && targetWeight ? (
              <Text className={styles.targetChip}>目标 {fmt(targetWeight)}</Text>
            ) : null}
          </View>
          <View className={styles.valueRow}>
            <Text className={styles.value}>{latest ? fmt(latest.value) : '—'}</Text>
            <Text className={styles.valueUnit}>{unitLabel}</Text>
            {deltaText ? (
              <Text
                className={classnames(
                  styles.delta,
                  delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : undefined
                )}
              >
                {deltaText}
              </Text>
            ) : null}
          </View>
          {timeText ? <Text className={styles.headTime}>{timeText}</Text> : null}
        </View>
      </View>
    );
  })();

  if (points.length < 2) {
    return (
      <View className={styles.panel}>
        {head}
        {pills}
        <View className={styles.empty}>
          <Text className={styles.emptyDesc}>
            {points.length
              ? `这个时间段只有 1 条${metric.label}记录，换个范围或再记一次`
              : `这个时间段还没有${metric.label}记录`}
          </Text>
        </View>
      </View>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const totalDelta = last.value - first.value;
  const minPoint = points.reduce((a, b) => (b.value < a.value ? b : a));

  return (
    <View className={styles.panel}>
      {head}
      {pills}
      <Canvas type="2d" id={canvasId.current} className={styles.canvas} />

      <View className={styles.kpis}>
        <View className={styles.kpi}>
          <Text className={styles.kpiValue}>{fmt(first.value)}</Text>
          <Text className={styles.kpiLabel}>起始</Text>
        </View>
        <View className={styles.kpiDivider} />
        <View className={styles.kpi}>
          <Text className={styles.kpiValue}>{fmt(minPoint.value)}</Text>
          <Text className={styles.kpiLabel}>最低</Text>
        </View>
        <View className={styles.kpiDivider} />
        <View className={styles.kpi}>
          <Text
            className={classnames(
              styles.kpiValue,
              totalDelta < 0 ? styles.deltaDown : totalDelta > 0 ? styles.deltaUp : undefined
            )}
          >
            {totalDelta > 0 ? '+' : totalDelta < 0 ? '-' : ''}
            {fmt(Math.abs(totalDelta))}
          </Text>
          <Text className={styles.kpiLabel}>累计变化 {unitLabel}</Text>
        </View>
      </View>
    </View>
  );
};

export default WeightChart;
