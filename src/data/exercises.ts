import type { Exercise, MuscleGroup } from '@/types';

type RawExercise = [name: string, muscle: MuscleGroup, equipment: string];

const RAW: RawExercise[] = [
  // 胸
  ['杠铃卧推', 'chest', '杠铃'],
  ['上斜杠铃卧推', 'chest', '杠铃'],
  ['哑铃卧推', 'chest', '哑铃'],
  ['上斜哑铃卧推', 'chest', '哑铃'],
  ['哑铃飞鸟', 'chest', '哑铃'],
  ['蝴蝶机夹胸', 'chest', '器械'],
  ['双杠臂屈伸', 'chest', '自重'],
  ['俯卧撑', 'chest', '自重'],
  // 背
  ['引体向上', 'back', '自重'],
  ['高位下拉', 'back', '器械'],
  ['杠铃划船', 'back', '杠铃'],
  ['单臂哑铃划船', 'back', '哑铃'],
  ['坐姿划船', 'back', '器械'],
  ['硬拉', 'back', '杠铃'],
  ['T杠划船', 'back', '杠铃'],
  ['直臂下压', 'back', '绳索'],
  // 腿
  ['深蹲', 'legs', '杠铃'],
  ['前蹲', 'legs', '杠铃'],
  ['腿举', 'legs', '器械'],
  ['罗马尼亚硬拉', 'legs', '杠铃'],
  ['保加利亚分腿蹲', 'legs', '哑铃'],
  ['腿屈伸', 'legs', '器械'],
  ['腿弯举', 'legs', '器械'],
  ['哑铃箭步蹲', 'legs', '哑铃'],
  ['站姿提踵', 'legs', '器械'],
  ['臀桥', 'legs', '杠铃'],
  // 肩
  ['站姿杠铃推举', 'shoulders', '杠铃'],
  ['坐姿哑铃推举', 'shoulders', '哑铃'],
  ['哑铃侧平举', 'shoulders', '哑铃'],
  ['哑铃前平举', 'shoulders', '哑铃'],
  ['俯身反向飞鸟', 'shoulders', '哑铃'],
  ['绳索面拉', 'shoulders', '绳索'],
  ['哑铃耸肩', 'shoulders', '哑铃'],
  // 手臂
  ['杠铃弯举', 'arms', '杠铃'],
  ['哑铃交替弯举', 'arms', '哑铃'],
  ['锤式弯举', 'arms', '哑铃'],
  ['绳索下压', 'arms', '绳索'],
  ['仰卧臂屈伸', 'arms', '杠铃'],
  ['窄距卧推', 'arms', '杠铃'],
  // 核心
  ['平板支撑', 'core', '自重'],
  ['卷腹', 'core', '自重'],
  ['悬垂举腿', 'core', '自重'],
  ['俄罗斯转体', 'core', '哑铃'],
  // 有氧
  ['跑步机', 'cardio', '有氧器械'],
  ['划船机', 'cardio', '有氧器械'],
  ['动感单车', 'cardio', '有氧器械'],
  ['椭圆机', 'cardio', '有氧器械']
];

/** 预置动作库 */
export const PRESET_EXERCISES: Exercise[] = RAW.map(([name, muscle, equipment], index) => ({
  id: `ex-${String(index + 1).padStart(3, '0')}`,
  name,
  muscle,
  equipment
}));
