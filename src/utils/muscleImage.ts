import { cloudFile } from '@/utils/cloudAsset';
import type { MuscleGroup } from '@/types';

/**
 * 肌群 → 器械实拍图（首页计划卡背景）
 * 画面统一是「左侧白墙留白、右侧橙色器械」，配合左侧渐变遮罩压文字。
 * 图打包在 assets/muscle/，按文件名直接取；没有对应图的肌群返回 undefined，
 * 卡片回落到纯色底。
 */
const MUSCLE_IMAGE: Partial<Record<MuscleGroup, string>> = {
  chest: cloudFile('muscle/chest.jpg'), // 卧推赛架
  back: cloudFile('muscle/back.jpg'), // 高位下拉
  legs: cloudFile('muscle/legs.jpg'), // 深蹲架
  biceps: cloudFile('muscle/arms.jpg'), // 哑铃架
  triceps: cloudFile('muscle/arms.jpg'), // 哑铃架（与二头共用）
  core: cloudFile('muscle/core.jpg'), // 壶铃 + 瑜伽垫
  fullbody: cloudFile('muscle/fullbody.jpg'), // 硬拉地台 + 杠铃
  shoulders: cloudFile('muscle/shoulders.jpg'), // 坐姿推肩器械
  cardio: cloudFile('muscle/cardio.jpg') // 爬楼机
};

export function muscleImageOf(muscle?: MuscleGroup): string | undefined {
  return muscle ? MUSCLE_IMAGE[muscle] : undefined;
}
