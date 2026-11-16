import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import type { OneRmPoint } from '@/utils/workout';
import { DARK_PALETTE, LIGHT_PALETTE, drawChart } from '@/components/WeightChart';
import { useThemeStore } from '@/store/useThemeStore';
import styles from './index.module.scss';

/** 绘图区高度（CSS 像素） */
const CANVAS_HEIGHT = 140;

/** H5 端 Taro 的 Canvas 外面还包了一层容器，真正的 canvas 要往里找 */
function resolveH5Canvas(id: string): HTMLCanvasElement | null {
  const root = document.getElementById(id);
  if (!root) return null;
  if (root.tagName === 'CANVAS') return root as unknown as HTMLCanvasElement;
  return root.querySelector('canvas');
}

interface PrTrendChartProps {
  /** 动作名，显示在左上角 */
  name: string;
  /** 该动作按天聚合的 1RM 点 */
  points: OneRmPoint[];
  /** 点图上的日期：打开当天这次的训练 */
  onPickPoint?: (point: OneRmPoint) => void;
}

/** PR 趋势：单个动作的预估 1RM 走势（和体重趋势图共用一套画法） */
const PrTrendChart: React.FC<PrTrendChartProps> = ({ name, points, onPickPoint }) => {
  const theme = useThemeStore((state) => state.theme);
  const canvasId = useRef(`pr${Math.random().toString(36).slice(2, 9)}`);
  const [boxWidth, setBoxWidth] = useState(0);

  /** 量一次画布宽度；首帧可能还没排版完成，隔一帧再补测一次 */
  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') {
      const measure = () => {
        const el = resolveH5Canvas(canvasId.current);
        const width = el?.getBoundingClientRect().width ?? 0;
        if (width > 0) setBoxWidth(width);
      };
      measure();
      const timer = setTimeout(measure, 150);
      return () => clearTimeout(timer);
    }
    Taro.createSelectorQuery()
      .select(`#${canvasId.current}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const width = res?.[0]?.width;
        if (width) setBoxWidth(width);
      });
  }, []);

  /** 重绘：宽度、数据、主题变化都触发 */
  useEffect(() => {
    if (!boxWidth || points.length < 2) return;
    const values = points.map((point) => point.oneRm);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = (rawMax - rawMin) * 0.2 || 2;
    const labels = points.map((point) => dayjs(point.date).format('M/D'));
    const palette = theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
    const dpr =
      process.env.TARO_ENV === 'h5'
        ? window.devicePixelRatio || 1
        : Taro.getSystemInfoSync().pixelRatio;

    const paint = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      canvas.width = boxWidth * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      ctx.scale(dpr, dpr);
      drawChart(ctx, {
        width: boxWidth,
        height: CANVAS_HEIGHT,
        values,
        labels,
        min: rawMin - pad,
        max: rawMax + pad,
        palette
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
  }, [boxWidth, points, theme]);

  const last = points[points.length - 1];
  const first = points[0];
  const gain = first && last ? last.oneRm - first.oneRm : 0;

  return (
    <View className={styles.wrap}>
      <View className={styles.head}>
        <Text className={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {last && points.length >= 2 ? (
          <Text className={styles.gain}>
            {gain > 0 ? '+' : ''}
            {gain} kg
          </Text>
        ) : null}
      </View>

      {points.length < 2 ? (
        <View className={styles.empty}>
          <Text className={styles.emptyText}>至少练 2 次这个动作才能看趋势</Text>
        </View>
      ) : (
        <View className={styles.chartBox}>
          <Canvas type="2d" id={canvasId.current} className={styles.canvas} />
          {/* 每个日期一块点击区，按横坐标等分，点哪里就是哪一天 */}
          {onPickPoint ? (
            <View className={styles.hitLayer}>
              {points.map((point) => (
                <View
                  key={point.date}
                  className={styles.hitCol}
                  onClick={() => onPickPoint(point)}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

export default PrTrendChart;
