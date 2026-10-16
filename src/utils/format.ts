import dayjs from 'dayjs';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 数字补零 */
export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** 2026-10-10 19:30 */
export function formatDateTime(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DD HH:mm');
}

/** 19:30 */
export function formatClock(ts: number): string {
  return dayjs(ts).format('HH:mm');
}

/** 周一 */
export function weekdayLabel(ts: number): string {
  return WEEKDAYS[dayjs(ts).day()];
}

/** 今天 / 昨天 / 10-08 */
export function dayLabel(ts: number): string {
  const target = dayjs(ts).startOf('day');
  const today = dayjs().startOf('day');
  const diff = today.diff(target, 'day');
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  return dayjs(ts).format('MM-DD');
}

/** 判断 YYYY-MM-DD 日期字符串是否为今天 */
export function isDateToday(date?: string): boolean {
  if (!date) return false;
  return dayjs(date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
}

/** 秒 -> 1小时12分 / 12分30秒 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}小时${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

/** 秒 -> 12:34（用于计时器） */
export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

/** 重量展示（去掉多余的 0） */
export function formatWeight(weight: number): string {
  if (!weight) return '0';
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}

/**
 * 组的重量展示：
 * 负重自重动作（额外负重 > 0）显示成「70+10」；其余显示总重「70」。
 */
export function formatSetWeight(set: { weight: number; addedWeight?: number }): string {
  const added = set.addedWeight ?? 0;
  if (!added) return formatWeight(set.weight);
  return `${formatWeight(set.weight - added)}+${formatWeight(added)}`;
}

/** 容量展示，带千分位 */
export function formatVolume(volume: number): string {
  const rounded = Math.round(volume);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** #ff6b2c + 0.16 -> rgba(255, 107, 44, 0.16) */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
