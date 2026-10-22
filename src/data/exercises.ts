import type { Exercise, MuscleGroup } from '@/types';

type RawExercise = [name: string, muscle: MuscleGroup, equipment: string];

/**
 * 老动作库（已清空）。
 *
 * 清空后，历史记录 / 老计划里引用的动作在界面上统一显示为「已下架」。
 * 这里保留空数组与下面的合并逻辑：新清单加进来时会自动排在最前面，
 * 与老库同名的动作仍沿用老 ID，历史数据不会错位。
 */
const RAW: RawExercise[] = [];

/**
 * 新版动作清单：按这份顺序排在选择列表最前面。
 *
 * 规则：
 * - 与老库同名的动作：沿用它的老 ID，计划与历史记录不受影响
 * - 老库里没有的动作：追加到末尾编号
 * - 老库里没进这份清单的动作：保留在后面
 */
const CURATED: RawExercise[] = [
  // 胸（练上/中/下胸由「角度」变式决定，见 exerciseVariants.ts）
  ['杠铃卧推', 'chest', '杠铃'],
  ['史密斯架卧推', 'chest', '器械'],
  ['器械推胸', 'chest', '器械'],
  ['哑铃卧推', 'chest', '哑铃'],
  ['哑铃飞鸟', 'chest', '哑铃'],
  ['双杠臂屈伸', 'chest', '自重'],
  ['蝴蝶机夹胸', 'chest', '器械'],
  ['龙门架夹胸', 'chest', '绳索'],
  // 背
  ['引体向上', 'back', '自重'],
  ['器械辅助引体向上', 'back', '器械'],
  ['器械高位下拉', 'back', '器械'],
  ['绳索高位下拉', 'back', '绳索'],
  ['器械划船', 'back', '器械'],
  ['绳索划船', 'back', '绳索'],
  ['杠铃俯身划船', 'back', '杠铃'],
  ['哑铃俯身划船', 'back', '哑铃'],
  ['器械俯身划船', 'back', '器械'],
  // 臀腿
  ['杠铃深蹲', 'legs', '杠铃'],
  ['史密斯深蹲', 'legs', '器械'],
  ['髋内收器械', 'legs', '器械'],
  ['腿屈伸器械', 'legs', '器械'],
  ['箭步蹲', 'legs', '杠铃'],
  ['保加利亚蹲', 'legs', '杠铃'],
  ['哈克深蹲', 'legs', '器械'],
  ['器械腘绳肌', 'legs', '器械'],
  // 追加在末尾：中途插入会让后面动作的编号整体后移，老计划会指错动作
  ['髋外展器械', 'legs', '器械'],
  // 硬拉类：练的是全身，单列一类；选任何部位时也都会列出来
  ['传统硬拉', 'fullbody', '杠铃'],
  ['相扑硬拉', 'fullbody', '杠铃'],
  ['罗马尼亚硬拉', 'fullbody', '杠铃'],
  ['提踵', 'legs', '器械'],
  // 肩
  ['杠铃推肩', 'shoulders', '杠铃'],
  ['史密斯架推肩', 'shoulders', '器械'],
  ['哑铃推肩', 'shoulders', '哑铃'],
  ['器械推肩', 'shoulders', '器械'],
  ['杠铃前平举', 'shoulders', '杠铃'],
  ['哑铃侧平举', 'shoulders', '哑铃'],
  ['俯身飞鸟', 'shoulders', '哑铃'],
  ['龙门架反向飞鸟', 'shoulders', '绳索'],
  ['绳索面拉', 'shoulders', '绳索'],
  // 肱二头肌
  ['杠铃二头弯举', 'biceps', '杠铃'],
  ['哑铃二头弯举', 'biceps', '哑铃'],
  ['绳索二头弯举', 'biceps', '绳索'],
  ['器械二头弯举', 'biceps', '器械'],
  // 肱三头肌
  ['绳索下压', 'triceps', '绳索'],
  ['颈后臂屈伸', 'triceps', '杠铃'],
  ['器械三头下压', 'triceps', '器械'],
  ['仰卧杠铃臂屈伸', 'triceps', '杠铃'],
  // 核心（自重动作用「体重 + 负重」的口径记录）
  ['卷腹', 'core', '自重'],
  ['器械卷腹', 'core', '器械'],
  ['站姿绳索卷腹', 'core', '绳索'],
  ['仰卧举腿', 'core', '自重'],
  ['悬垂举腿', 'core', '自重'],
  ['平板支撑', 'core', '自重'],
  ['侧平板支撑', 'core', '自重'],
  // 有氧（只记时长 / 距离 / 卡路里，器材按机器分）
  ['跑步机', 'cardio', '有氧'],
  ['爬楼机', 'cardio', '有氧'],
  ['椭圆机', 'cardio', '有氧'],
  ['动感单车', 'cardio', '有氧'],
  ['划船机', 'cardio', '有氧'],
  ['跳绳', 'cardio', '有氧'],
  // 追加在末尾：中途插入会让后面动作的编号整体后移，老计划会指错动作
  ['器械侧平举', 'shoulders', '器械'],
  ['绳索侧平举', 'shoulders', '绳索'],
  ['器械前平举', 'shoulders', '器械'],
  ['哑铃前平举', 'shoulders', '哑铃'],
  ['绳索前平举', 'shoulders', '绳索']
];

/** 老动作库：ID 按数组下标生成，顺序和 ID 都不能动，否则老计划会指错动作 */
const LEGACY: Exercise[] = RAW.map(([name, muscle, equipment], index) => ({
  id: `ex-${String(index + 1).padStart(3, '0')}`,
  name,
  muscle,
  equipment
}));

/** 新版清单在前，老库其余动作在后；同名的沿用老 ID，全新的继续往后编号 */
function buildPresetExercises(): Exercise[] {
  const legacyByName = new Map(LEGACY.map((item) => [item.name, item]));
  const reusedIds = new Set<string>();
  let nextIndex = LEGACY.length;

  const curated: Exercise[] = CURATED.map(([name, muscle, equipment]) => {
    const hit = legacyByName.get(name);
    if (hit) {
      reusedIds.add(hit.id);
      return { ...hit, muscle, equipment };
    }
    nextIndex += 1;
    return { id: `ex-${String(nextIndex).padStart(3, '0')}`, name, muscle, equipment };
  });

  return [...curated, ...LEGACY.filter((item) => !reusedIds.has(item.id))];
}

/** 预置动作库 */
export const PRESET_EXERCISES: Exercise[] = buildPresetExercises();
