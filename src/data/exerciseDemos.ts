import type { ExerciseVariants } from '@/types';
import { VARIANT_GROUPS } from '@/data/exerciseVariants';

/**
 * 动作示范（数据与图来自 RepDB 免费档，关于页需署名）。
 *
 * - EXERCISE_DEMOS：基础动作 → 示范
 * - VARIANT_DEMOS：基础动作 + 变式（group:option）→ 示范
 * - 图放在云存储 exercise-demo/ 目录，按需下载后缓存在本机（见 utils/exerciseImages）
 *
 * 本文件由 preview/gen-demo-data.js 生成，请勿手改。
 */

export interface ExerciseDemo {
  /** RepDB 动作 id */
  id: string;
  /** RepDB 中文名 */
  name: string;
  en: string;
  /** 器械 */
  equipment: string;
  /** 难度 */
  level: string;
  /** 目标肌群 */
  primary: string;
  /** 协同肌群 */
  secondary: string;
  /** 起始帧文件名（云存储 exercise-demo/ 下） */
  start: string;
  /** 顶点帧文件名（只有一帧时与 start 相同） */
  peak: string;
}

/** 全部示范，按 RepDB id 索引 */
export const DEMOS_BY_ID: Record<string, ExerciseDemo> = {
  'bench-press': { id: 'bench-press', name: '杠铃卧推', en: 'Barbell Bench Press', equipment: '杠铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'bench-press-start.webp', peak: 'bench-press-peak.webp' },
  'smith-machine-bench-press': { id: 'smith-machine-bench-press', name: '史密斯器械卧推', en: 'Smith Machine Bench Press', equipment: '史密斯机', level: '入门', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'smith-machine-bench-press-start.webp', peak: 'smith-machine-bench-press-peak.webp' },
  'chest-press-machine': { id: 'chest-press-machine', name: '器械推胸', en: 'Machine Chest Press', equipment: '推胸机', level: '入门', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'chest-press-machine-start.webp', peak: 'chest-press-machine-peak.webp' },
  'db-bench-press': { id: 'db-bench-press', name: '哑铃卧推', en: 'Dumbbell Bench Press', equipment: '哑铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'db-bench-press-start.webp', peak: 'db-bench-press-peak.webp' },
  'db-fly': { id: 'db-fly', name: '哑铃飞鸟', en: 'Dumbbell Fly', equipment: '哑铃', level: '入门', primary: '胸大肌', secondary: '三角肌前束', start: 'db-fly-start.webp', peak: 'db-fly-peak.webp' },
  'dips': { id: 'dips', name: '胸臂屈伸', en: 'Chest Dips', equipment: '双杠架', level: '进阶', primary: '胸大肌、肱三头肌', secondary: '三角肌前束', start: 'dips-start.webp', peak: 'dips-peak.webp' },
  'pec-deck': { id: 'pec-deck', name: '蝴蝶机夹胸', en: 'Pec Deck', equipment: '蝴蝶机', level: '入门', primary: '胸大肌', secondary: '三角肌前束、前锯肌', start: 'pec-deck-start.webp', peak: 'pec-deck-peak.webp' },
  'cable-fly': { id: 'cable-fly', name: '绳索飞鸟', en: 'Cable Fly', equipment: '绳索', level: '进阶', primary: '胸大肌', secondary: '三角肌前束', start: 'cable-fly-start.webp', peak: 'cable-fly-peak.webp' },
  'pull-up': { id: 'pull-up', name: '引体向上', en: 'Pull-Up', equipment: '单杠', level: '进阶', primary: '背阔肌', secondary: '肱二头肌、三角肌后束、菱形肌', start: 'pull-up-start.webp', peak: 'pull-up-peak.webp' },
  'lat-pulldown': { id: 'lat-pulldown', name: '高位下拉', en: 'Lat Pulldown', equipment: '绳索', level: '入门', primary: '背阔肌', secondary: '肱二头肌、三角肌后束、菱形肌', start: 'lat-pulldown-start.webp', peak: 'lat-pulldown-peak.webp' },
  'chest-supported-machine-row': { id: 'chest-supported-machine-row', name: '胸支撑器械划船', en: 'Chest-Supported Machine Row', equipment: '坐姿划船机', level: '入门', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束、斜方肌', start: 'chest-supported-machine-row-start.webp', peak: 'chest-supported-machine-row-peak.webp' },
  'seated-cable-row': { id: 'seated-cable-row', name: '坐姿绳索划船', en: 'Seated Cable Row', equipment: '绳索', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、竖脊肌、三角肌后束', start: 'seated-cable-row-start.webp', peak: 'seated-cable-row-peak.webp' },
  'barbell-row': { id: 'barbell-row', name: '俯身杠铃划船', en: 'Bent-Over Barbell Row', equipment: '杠铃', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束', start: 'barbell-row-start.webp', peak: 'barbell-row-peak.webp' },
  'bent-over-db-row': { id: 'bent-over-db-row', name: '俯身哑铃划船', en: 'Bent-Over Dumbbell Row', equipment: '哑铃', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束、斜方肌', start: 'bent-over-db-row-start.webp', peak: 'bent-over-db-row-peak.webp' },
  'squat': { id: 'squat', name: '杠铃背蹲', en: 'Barbell Back Squat', equipment: '杠铃', level: '进阶', primary: '臀大肌、股四头肌', secondary: '竖脊肌、腘绳肌', start: 'squat-start.webp', peak: 'squat-peak.webp' },
  'smith-machine-squat': { id: 'smith-machine-squat', name: '史密斯深蹲', en: 'Smith Machine Squat', equipment: '史密斯机', level: '入门', primary: '臀大肌、股四头肌', secondary: '竖脊肌、臀中肌、腘绳肌', start: 'smith-machine-squat-start.webp', peak: 'smith-machine-squat-peak.webp' },
  'hip-adduction': { id: 'hip-adduction', name: '髋内收', en: 'Hip Adduction', equipment: '髋内收机', level: '进阶', primary: '内收肌', secondary: '', start: 'hip-adduction-start.webp', peak: 'hip-adduction-peak.webp' },
  'leg-extension': { id: 'leg-extension', name: '腿屈伸', en: 'Leg Extension', equipment: '腿屈伸机', level: '入门', primary: '股四头肌', secondary: '', start: 'leg-extension-start.webp', peak: 'leg-extension-peak.webp' },
  'barbell-lunge': { id: 'barbell-lunge', name: '杠铃弓步', en: 'Barbell Lunge', equipment: '杠铃', level: '进阶', primary: '臀大肌、股四头肌', secondary: '竖脊肌、臀中肌、腘绳肌', start: 'barbell-lunge-start.webp', peak: 'barbell-lunge-peak.webp' },
  'barbell-bulgarian-split-squat': { id: 'barbell-bulgarian-split-squat', name: '杠铃保加利亚分腿蹲', en: 'Barbell Bulgarian Split Squat', equipment: '杠铃', level: '高级', primary: '臀大肌、股四头肌', secondary: '内收肌、竖脊肌、臀中肌、腘绳肌', start: 'barbell-bulgarian-split-squat-start.webp', peak: 'barbell-bulgarian-split-squat-peak.webp' },
  'hack-squat': { id: 'hack-squat', name: '哈克深蹲', en: 'Hack Squat', equipment: '哈克深蹲机', level: '进阶', primary: '臀大肌、股四头肌', secondary: '腓肠肌、腘绳肌', start: 'hack-squat-start.webp', peak: 'hack-squat-peak.webp' },
  'leg-curl': { id: 'leg-curl', name: '仰卧腿弯举', en: 'Lying Leg Curl', equipment: '腿弯举机', level: '入门', primary: '腘绳肌', secondary: '腓肠肌', start: 'leg-curl-start.webp', peak: 'leg-curl-peak.webp' },
  'hip-abduction': { id: 'hip-abduction', name: '器械髋外展', en: 'Machine Hip Abduction', equipment: '髋外展机', level: '入门', primary: '臀中肌', secondary: '外展肌', start: 'hip-abduction-start.webp', peak: 'hip-abduction-peak.webp' },
  'standing-calf-raise': { id: 'standing-calf-raise', name: '站姿提踵', en: 'Standing Calf Raise', equipment: '站姿提踵机', level: '入门', primary: '腓肠肌', secondary: '比目鱼肌', start: 'standing-calf-raise-start.webp', peak: 'standing-calf-raise-peak.webp' },
  'deadlift': { id: 'deadlift', name: '杠铃硬拉', en: 'Barbell Deadlift', equipment: '杠铃', level: '进阶', primary: '竖脊肌、臀大肌、腘绳肌', secondary: '股四头肌、斜方肌', start: 'deadlift-start.webp', peak: 'deadlift-peak.webp' },
  'sumo-deadlift': { id: 'sumo-deadlift', name: '相扑硬拉', en: 'Sumo Deadlift', equipment: '杠铃', level: '进阶', primary: '臀大肌、股四头肌', secondary: '竖脊肌、腘绳肌', start: 'sumo-deadlift-start.webp', peak: 'sumo-deadlift-peak.webp' },
  'romanian-deadlift': { id: 'romanian-deadlift', name: '罗马尼亚硬拉', en: 'Romanian Deadlift', equipment: '杠铃', level: '进阶', primary: '臀大肌、腘绳肌', secondary: '竖脊肌', start: 'romanian-deadlift-start.webp', peak: 'romanian-deadlift-peak.webp' },
  'ohp': { id: 'ohp', name: '杠铃过顶推举', en: 'Barbell Overhead Press', equipment: '杠铃', level: '进阶', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'ohp-start.webp', peak: 'ohp-peak.webp' },
  'smith-machine-shoulder-press': { id: 'smith-machine-shoulder-press', name: '史密斯器械肩推', en: 'Smith Machine Shoulder Press', equipment: '史密斯机', level: '入门', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'smith-machine-shoulder-press-start.webp', peak: 'smith-machine-shoulder-press-peak.webp' },
  'dumbbell-shoulder-press': { id: 'dumbbell-shoulder-press', name: '哑铃肩推', en: 'Dumbbell Shoulder Press', equipment: '哑铃', level: '进阶', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'dumbbell-shoulder-press-start.webp', peak: 'dumbbell-shoulder-press-peak.webp' },
  'machine-shoulder-press': { id: 'machine-shoulder-press', name: '器械肩推', en: 'Machine Shoulder Press', equipment: '肩推机', level: '入门', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'machine-shoulder-press-start.webp', peak: 'machine-shoulder-press-peak.webp' },
  'barbell-front-raise': { id: 'barbell-front-raise', name: '杠铃前平举', en: 'Barbell Front Raise', equipment: '杠铃', level: '进阶', primary: '三角肌前束', secondary: '三角肌中束、胸大肌、前锯肌', start: 'barbell-front-raise-start.webp', peak: 'barbell-front-raise-peak.webp' },
  'lateral-raise': { id: 'lateral-raise', name: '哑铃侧平举', en: 'Dumbbell Lateral Raise', equipment: '哑铃', level: '入门', primary: '三角肌中束', secondary: '三角肌前束', start: 'lateral-raise-start.webp', peak: 'lateral-raise-peak.webp' },
  'plate-loaded-lateral-raise': { id: 'plate-loaded-lateral-raise', name: '插片式侧平举', en: 'Plate-Loaded Lateral Raise', equipment: '插片侧平举机', level: '入门', primary: '三角肌中束', secondary: '三角肌前束、斜方肌', start: 'plate-loaded-lateral-raise-start.webp', peak: 'plate-loaded-lateral-raise-peak.webp' },
  'dumbbell-front-raise': { id: 'dumbbell-front-raise', name: '哑铃前平举', en: 'Dumbbell Front Raise', equipment: '哑铃', level: '入门', primary: '三角肌前束', secondary: '三角肌中束', start: 'dumbbell-front-raise-start.webp', peak: 'dumbbell-front-raise-peak.webp' },
  'cable-front-raise': { id: 'cable-front-raise', name: '绳索前平举', en: 'Cable Front Raise', equipment: '绳索', level: '进阶', primary: '三角肌前束', secondary: '三角肌中束、胸大肌', start: 'cable-front-raise-start.webp', peak: 'cable-front-raise-peak.webp' },
  'rear-delt-fly': { id: 'rear-delt-fly', name: '反向飞鸟', en: 'Rear Delt Fly', equipment: '哑铃', level: '入门', primary: '三角肌后束、菱形肌', secondary: '斜方肌', start: 'rear-delt-fly-start.webp', peak: 'rear-delt-fly-peak.webp' },
  'cable-reverse-fly': { id: 'cable-reverse-fly', name: '绳索反向飞鸟', en: 'Cable Reverse Fly', equipment: '绳索', level: '进阶', primary: '三角肌后束', secondary: '菱形肌、斜方肌', start: 'cable-reverse-fly-start.webp', peak: 'cable-reverse-fly-peak.webp' },
  'face-pull': { id: 'face-pull', name: '绳索面拉', en: 'Cable Face Pull', equipment: '绳索', level: '入门', primary: '三角肌后束、菱形肌', secondary: '斜方肌', start: 'face-pull-start.webp', peak: 'face-pull-peak.webp' },
  'barbell-curl': { id: 'barbell-curl', name: '杠铃弯举', en: 'Barbell Curl', equipment: '杠铃', level: '入门', primary: '肱二头肌', secondary: '肱肌、前臂屈肌', start: 'barbell-curl-start.webp', peak: 'barbell-curl-peak.webp' },
  'bicep-curl': { id: 'bicep-curl', name: '哑铃二头弯举', en: 'Dumbbell Bicep Curl', equipment: '哑铃', level: '入门', primary: '肱二头肌', secondary: '肱肌、前臂屈肌', start: 'bicep-curl-start.webp', peak: 'bicep-curl-peak.webp' },
  'cable-curl': { id: 'cable-curl', name: '绳索弯举', en: 'Cable Curl', equipment: '绳索', level: '入门', primary: '肱二头肌', secondary: '肱肌', start: 'cable-curl-start.webp', peak: 'cable-curl-peak.webp' },
  'machine-bicep-curl': { id: 'machine-bicep-curl', name: '器械二头弯举', en: 'Machine Bicep Curl', equipment: '二头弯举机', level: '入门', primary: '肱二头肌', secondary: '肱肌', start: 'machine-bicep-curl-start.webp', peak: 'machine-bicep-curl-peak.webp' },
  'tricep-pushdown': { id: 'tricep-pushdown', name: '绳索三头下压', en: 'Cable Tricep Pushdown', equipment: '绳索', level: '入门', primary: '肱三头肌', secondary: '', start: 'tricep-pushdown-start.webp', peak: 'tricep-pushdown-peak.webp' },
  'barbell-overhead-extension': { id: 'barbell-overhead-extension', name: '杠铃过顶伸展', en: 'Barbell Overhead Extension', equipment: '杠铃', level: '进阶', primary: '肱三头肌', secondary: '', start: 'barbell-overhead-extension-start.webp', peak: 'barbell-overhead-extension-peak.webp' },
  'machine-triceps-extension': { id: 'machine-triceps-extension', name: '器械三头伸展', en: 'Machine Triceps Extension', equipment: '三头下压机', level: '入门', primary: '肱三头肌', secondary: '', start: 'machine-triceps-extension-start.webp', peak: 'machine-triceps-extension-peak.webp' },
  'skull-crusher': { id: 'skull-crusher', name: '仰卧臂屈伸', en: 'Skull Crusher', equipment: '杠铃', level: '进阶', primary: '肱三头肌', secondary: '', start: 'skull-crusher-start.webp', peak: 'skull-crusher-peak.webp' },
  'crunches': { id: 'crunches', name: '卷腹', en: 'Crunches', equipment: '自重', level: '入门', primary: '腹直肌', secondary: '腹斜肌', start: 'crunches-start.webp', peak: 'crunches-peak.webp' },
  'machine-seated-crunch': { id: 'machine-seated-crunch', name: '器械坐姿卷腹', en: 'Machine Seated Crunch', equipment: '卷腹机', level: '入门', primary: '腹直肌', secondary: '腹斜肌、腹横肌', start: 'machine-seated-crunch-start.webp', peak: 'machine-seated-crunch-peak.webp' },
  'cable-crunch': { id: 'cable-crunch', name: '绳索卷腹', en: 'Cable Crunch', equipment: '绳索', level: '进阶', primary: '腹直肌', secondary: '腹斜肌、腹横肌', start: 'cable-crunch-start.webp', peak: 'cable-crunch-peak.webp' },
  'lying-leg-raise': { id: 'lying-leg-raise', name: '仰卧举腿', en: 'Lying Leg Raise', equipment: '自重', level: '入门', primary: '髂腰肌、腹直肌', secondary: '腹斜肌、腹横肌', start: 'lying-leg-raise-start.webp', peak: 'lying-leg-raise-peak.webp' },
  'hanging-leg-raise': { id: 'hanging-leg-raise', name: '悬垂举腿', en: 'Hanging Leg Raise', equipment: '单杠', level: '进阶', primary: '髂腰肌、腹直肌', secondary: '腹斜肌', start: 'hanging-leg-raise-start.webp', peak: 'hanging-leg-raise-peak.webp' },
  'plank': { id: 'plank', name: '平板', en: 'Plank', equipment: '自重', level: '入门', primary: '腹直肌、腹横肌', secondary: '竖脊肌', start: 'plank-start.webp', peak: 'plank-peak.webp' },
  'side-plank': { id: 'side-plank', name: '侧平板', en: 'Side Plank', equipment: '自重', level: '入门', primary: '腹斜肌、腹横肌', secondary: '臀中肌、腹直肌', start: 'side-plank-start.webp', peak: 'side-plank-peak.webp' },
  'treadmill-running': { id: 'treadmill-running', name: '跑步机跑', en: 'Treadmill Running', equipment: '跑步机', level: '入门', primary: '腓肠肌、股四头肌', secondary: '臀大肌、腘绳肌、髂腰肌、比目鱼肌', start: 'treadmill-running-start.webp', peak: 'treadmill-running-peak.webp' },
  'stair-climber': { id: 'stair-climber', name: '楼梯爬楼机', en: 'Stair Climber', equipment: '爬楼机', level: '入门', primary: '臀大肌、股四头肌', secondary: '腓肠肌、臀中肌、腘绳肌、比目鱼肌', start: 'stair-climber-start.webp', peak: 'stair-climber-peak.webp' },
  'elliptical-trainer': { id: 'elliptical-trainer', name: '椭圆机训练器', en: 'Elliptical Trainer', equipment: '椭圆机', level: '入门', primary: '臀大肌、股四头肌', secondary: '腓肠肌、腘绳肌、背阔肌、胸大肌、比目鱼肌、肱三头肌', start: 'elliptical-trainer-start.webp', peak: 'elliptical-trainer-peak.webp' },
  'stationary-bike': { id: 'stationary-bike', name: '固定单车', en: 'Stationary Bike', equipment: '固定单车', level: '入门', primary: '股四头肌', secondary: '腓肠肌、臀大肌、腘绳肌、比目鱼肌', start: 'stationary-bike-start.webp', peak: 'stationary-bike-peak.webp' },
  'rowing-machine': { id: 'rowing-machine', name: '划船器械', en: 'Rowing Machine', equipment: '划船机', level: '入门', primary: '背阔肌、股四头肌', secondary: '肱二头肌、竖脊肌、臀大肌、腘绳肌、菱形肌、斜方肌', start: 'rowing-machine-start.webp', peak: 'rowing-machine-peak.webp' },
  'jump-rope': { id: 'jump-rope', name: '跳绳', en: 'Jump Rope', equipment: '跳绳', level: '入门', primary: '腓肠肌、比目鱼肌', secondary: '前臂屈肌、股四头肌', start: 'jump-rope-start.webp', peak: 'jump-rope-peak.webp' },
  'v-bar-lat-pulldown': { id: 'v-bar-lat-pulldown', name: 'V杠高位下拉', en: 'V-Bar Lat Pulldown', equipment: '高位下拉机', level: '入门', primary: '背阔肌', secondary: '肱二头肌、菱形肌、斜方肌', start: 'v-bar-lat-pulldown-start.webp', peak: 'v-bar-lat-pulldown-peak.webp' },
  'reverse-grip-lat-pulldown': { id: 'reverse-grip-lat-pulldown', name: '反握高位下拉', en: 'Reverse Grip Lat Pulldown', equipment: '绳索', level: '进阶', primary: '肱二头肌、背阔肌', secondary: '三角肌后束、菱形肌', start: 'reverse-grip-lat-pulldown-start.webp', peak: 'reverse-grip-lat-pulldown-peak.webp' },
  'close-grip-lat-pulldown': { id: 'close-grip-lat-pulldown', name: '窄握高位下拉', en: 'Close Grip Lat Pulldown', equipment: '绳索', level: '进阶', primary: '背阔肌', secondary: '肱二头肌、肱肌、三角肌后束、菱形肌', start: 'close-grip-lat-pulldown-start.webp', peak: 'close-grip-lat-pulldown-peak.webp' },
  'chin-ups': { id: 'chin-ups', name: '反握引体', en: 'Chin-Ups', equipment: '单杠', level: '进阶', primary: '肱二头肌、背阔肌', secondary: '菱形肌', start: 'chin-ups-start.webp', peak: 'chin-ups-peak.webp' },
  'commando-pull-up': { id: 'commando-pull-up', name: '突击引体向上', en: 'Commando Pull-Up', equipment: '单杠', level: '高级', primary: '肱二头肌、背阔肌', secondary: '肱肌、肱桡肌、前臂屈肌、腹斜肌、菱形肌、斜方肌', start: 'commando-pull-up-start.webp', peak: 'commando-pull-up-peak.webp' },
  'close-grip-pull-ups': { id: 'close-grip-pull-ups', name: '窄握引体向上', en: 'Close-Grip Pull-Ups', equipment: '单杠', level: '进阶', primary: '肱二头肌、背阔肌', secondary: '菱形肌', start: 'close-grip-pull-ups-start.webp', peak: 'close-grip-pull-ups-peak.webp' },
  'weighted-pull-up': { id: 'weighted-pull-up', name: '负重引体向上', en: 'Weighted Pull-Up', equipment: '单杠', level: '高级', primary: '背阔肌', secondary: '肱二头肌、三角肌后束、菱形肌、斜方肌', start: 'weighted-pull-up-start.webp', peak: 'weighted-pull-up-peak.webp' },
  'incline-bench-press': { id: 'incline-bench-press', name: '上斜杠铃卧推', en: 'Incline Barbell Bench Press', equipment: '杠铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'incline-bench-press-start.webp', peak: 'incline-bench-press-peak.webp' },
  'decline-bench-press-barbell': { id: 'decline-bench-press-barbell', name: '下斜杠铃卧推', en: 'Decline Barbell Bench Press', equipment: '杠铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'decline-bench-press-barbell-start.webp', peak: 'decline-bench-press-barbell-peak.webp' },
  'wide-grip-bench-press': { id: 'wide-grip-bench-press', name: '宽握卧推', en: 'Wide-Grip Bench Press', equipment: '杠铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'wide-grip-bench-press-start.webp', peak: 'wide-grip-bench-press-peak.webp' },
  'close-grip-bench-press': { id: 'close-grip-bench-press', name: '窄握卧推', en: 'Close-Grip Bench Press', equipment: '杠铃', level: '进阶', primary: '肱三头肌', secondary: '三角肌前束、胸大肌', start: 'close-grip-bench-press-start.webp', peak: 'close-grip-bench-press-peak.webp' },
  'smith-machine-incline-bench-press': { id: 'smith-machine-incline-bench-press', name: '史密斯器械上斜卧推', en: 'Smith Machine Incline Bench Press', equipment: '史密斯机', level: '入门', primary: '三角肌前束、胸大肌', secondary: '肱三头肌', start: 'smith-machine-incline-bench-press-start.webp', peak: 'smith-machine-incline-bench-press-peak.webp' },
  'smith-machine-decline-bench-press': { id: 'smith-machine-decline-bench-press', name: '史密斯器械下斜卧推', en: 'Smith Machine Decline Bench Press', equipment: '史密斯机', level: '入门', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'smith-machine-decline-bench-press-start.webp', peak: 'smith-machine-decline-bench-press-peak.webp' },
  'incline-db-press': { id: 'incline-db-press', name: '上斜哑铃推举', en: 'Incline Dumbbell Press', equipment: '哑铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'incline-db-press-start.webp', peak: 'incline-db-press-peak.webp' },
  'decline-bench-press': { id: 'decline-bench-press', name: '下斜卧推', en: 'Decline Bench Press', equipment: '哑铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱三头肌', start: 'decline-bench-press-start.webp', peak: 'decline-bench-press-peak.webp' },
  'incline-dumbbell-fly': { id: 'incline-dumbbell-fly', name: '上斜哑铃飞鸟', en: 'Incline Dumbbell Fly', equipment: '哑铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束、肱二头肌', start: 'incline-dumbbell-fly-start.webp', peak: 'incline-dumbbell-fly-peak.webp' },
  'decline-db-fly': { id: 'decline-db-fly', name: '下斜哑铃飞鸟', en: 'Decline Dumbbell Fly', equipment: '哑铃', level: '进阶', primary: '胸大肌', secondary: '三角肌前束', start: 'decline-db-fly-start.webp', peak: 'decline-db-fly-peak.webp' },
  'weighted-dips': { id: 'weighted-dips', name: '负重臂屈伸', en: 'Weighted Dips', equipment: '双杠架', level: '高级', primary: '胸大肌、肱三头肌', secondary: '三角肌前束', start: 'weighted-dips-start.webp', peak: 'weighted-dips-peak.webp' },
  'wide-grip-seated-cable-row': { id: 'wide-grip-seated-cable-row', name: '宽握坐姿绳索划船', en: 'Wide Grip Seated Cable Row', equipment: '绳索', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束', start: 'wide-grip-seated-cable-row-start.webp', peak: 'wide-grip-seated-cable-row-peak.webp' },
  'one-arm-seated-cable-row': { id: 'one-arm-seated-cable-row', name: '单臂坐姿绳索划船', en: 'One-Arm Seated Cable Row', equipment: '绳索', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束、斜方肌', start: 'one-arm-seated-cable-row-start.webp', peak: 'one-arm-seated-cable-row-peak.webp' },
  'reverse-grip-bent-over-row': { id: 'reverse-grip-bent-over-row', name: '反握俯身划船', en: 'Reverse Grip Bent Over Row', equipment: '杠铃', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、竖脊肌、斜方肌', start: 'reverse-grip-bent-over-row-start.webp', peak: 'reverse-grip-bent-over-row-peak.webp' },
  'single-arm-db-row': { id: 'single-arm-db-row', name: '单臂哑铃划船', en: 'Single-Arm Dumbbell Row', equipment: '哑铃', level: '进阶', primary: '背阔肌、菱形肌', secondary: '肱二头肌、三角肌后束', start: 'single-arm-db-row-start.webp', peak: 'single-arm-db-row-peak.webp' },
  'seated-barbell-overhead-press': { id: 'seated-barbell-overhead-press', name: '坐姿杠铃过顶推举', en: 'Seated Barbell Overhead Press', equipment: '杠铃', level: '进阶', primary: '三角肌前束', secondary: '三角肌中束、斜方肌、肱三头肌', start: 'seated-barbell-overhead-press-start.webp', peak: 'seated-barbell-overhead-press-peak.webp' },
  'seated-db-press': { id: 'seated-db-press', name: '坐姿哑铃肩推', en: 'Seated Dumbbell Shoulder Press', equipment: '哑铃', level: '进阶', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'seated-db-press-start.webp', peak: 'seated-db-press-peak.webp' },
  'seated-smith-machine-shoulder-press': { id: 'seated-smith-machine-shoulder-press', name: '坐姿史密斯器械肩推', en: 'Seated Smith Machine Shoulder Press', equipment: '史密斯机', level: '入门', primary: '三角肌前束、三角肌中束', secondary: '斜方肌、肱三头肌', start: 'seated-smith-machine-shoulder-press-start.webp', peak: 'seated-smith-machine-shoulder-press-peak.webp' },
  'machine-reverse-fly': { id: 'machine-reverse-fly', name: '器械反向飞鸟', en: 'Machine Reverse Fly', equipment: '反向飞鸟机', level: '入门', primary: '三角肌后束', secondary: '菱形肌、斜方肌', start: 'machine-reverse-fly-start.webp', peak: 'machine-reverse-fly-peak.webp' },
  'seated-dumbbell-lateral-raise': { id: 'seated-dumbbell-lateral-raise', name: '坐姿哑铃侧平举', en: 'Seated Dumbbell Lateral Raise', equipment: '哑铃', level: '入门', primary: '三角肌中束', secondary: '三角肌前束、斜方肌', start: 'seated-dumbbell-lateral-raise-start.webp', peak: 'seated-dumbbell-lateral-raise-peak.webp' },
  'cable-lateral-raise': { id: 'cable-lateral-raise', name: '绳索侧平举', en: 'Cable Lateral Raise', equipment: '绳索', level: '进阶', primary: '三角肌中束', secondary: '三角肌前束、斜方肌', start: 'cable-lateral-raise-start.webp', peak: 'cable-lateral-raise-peak.webp' },
  'straight-bar-cable-front-raise': { id: 'straight-bar-cable-front-raise', name: '直杠绳索前平举', en: 'Straight-Bar Cable Front Raise', equipment: '绳索', level: '进阶', primary: '三角肌前束', secondary: '三角肌中束、胸大肌', start: 'straight-bar-cable-front-raise-start.webp', peak: 'straight-bar-cable-front-raise-peak.webp' },
  'ez-bar-curl': { id: 'ez-bar-curl', name: '曲柄杠弯举', en: 'EZ-Bar Curl', equipment: '曲柄杠', level: '入门', primary: '肱二头肌', secondary: '肱肌、肱桡肌', start: 'ez-bar-curl-start.webp', peak: 'ez-bar-curl-peak.webp' },
  'hammer-curl': { id: 'hammer-curl', name: '哑铃锤式弯举', en: 'Dumbbell Hammer Curl', equipment: '哑铃', level: '入门', primary: '肱二头肌、肱肌', secondary: '前臂屈肌', start: 'hammer-curl-start.webp', peak: 'hammer-curl-peak.webp' },
  'db-reverse-curl': { id: 'db-reverse-curl', name: '哑铃反握弯举', en: 'Dumbbell Reverse Curl', equipment: '哑铃', level: '入门', primary: '肱肌、前臂伸肌', secondary: '肱二头肌', start: 'db-reverse-curl-start.webp', peak: 'db-reverse-curl-peak.webp' },
  'seated-dumbbell-curl': { id: 'seated-dumbbell-curl', name: '坐姿哑铃弯举', en: 'Seated Dumbbell Curl', equipment: '哑铃', level: '入门', primary: '肱二头肌', secondary: '肱肌、肱桡肌', start: 'seated-dumbbell-curl-start.webp', peak: 'seated-dumbbell-curl-peak.webp' },
  'v-bar-tricep-pushdown': { id: 'v-bar-tricep-pushdown', name: 'V杠三头下压', en: 'V-Bar Tricep Pushdown', equipment: '绳索', level: '入门', primary: '肱三头肌', secondary: '', start: 'v-bar-tricep-pushdown-start.webp', peak: 'v-bar-tricep-pushdown-peak.webp' },
  'single-arm-tricep-pushdown': { id: 'single-arm-tricep-pushdown', name: '单臂三头下压', en: 'Single Arm Tricep Pushdown', equipment: '绳索', level: '进阶', primary: '肱三头肌', secondary: '前臂伸肌', start: 'single-arm-tricep-pushdown-start.webp', peak: 'single-arm-tricep-pushdown-peak.webp' },
  'overhead-tricep-extension': { id: 'overhead-tricep-extension', name: '过顶三头伸展', en: 'Overhead Tricep Extension', equipment: '哑铃', level: '入门', primary: '肱三头肌', secondary: '', start: 'overhead-tricep-extension-start.webp', peak: 'overhead-tricep-extension-peak.webp' },
  'cable-overhead-tricep-extension': { id: 'cable-overhead-tricep-extension', name: '绳索过顶三头伸展', en: 'Cable Overhead Tricep Extension', equipment: '绳索', level: '进阶', primary: '肱三头肌', secondary: '三角肌前束', start: 'cable-overhead-tricep-extension-start.webp', peak: 'cable-overhead-tricep-extension-peak.webp' },
  'ez-bar-lying-tricep-extension': { id: 'ez-bar-lying-tricep-extension', name: '曲柄杠仰卧三头伸展', en: 'EZ-Bar Lying Triceps Extension', equipment: '曲柄杠', level: '进阶', primary: '肱三头肌', secondary: '', start: 'ez-bar-lying-tricep-extension-start.webp', peak: 'ez-bar-lying-tricep-extension-peak.webp' },
  'seated-calf-raise': { id: 'seated-calf-raise', name: '坐姿提踵', en: 'Seated Calf Raise', equipment: '坐姿提踵机', level: '入门', primary: '比目鱼肌', secondary: '腓肠肌', start: 'seated-calf-raise-start.webp', peak: 'seated-calf-raise-peak.webp' },
  'barbell-calf-raise': { id: 'barbell-calf-raise', name: '杠铃提踵', en: 'Barbell Calf Raise', equipment: '杠铃', level: '进阶', primary: '腓肠肌', secondary: '比目鱼肌', start: 'barbell-calf-raise-start.webp', peak: 'barbell-calf-raise-peak.webp' },
  'dumbbell-calf-raise': { id: 'dumbbell-calf-raise', name: '哑铃提踵', en: 'Dumbbell Calf Raise', equipment: '哑铃', level: '进阶', primary: '腓肠肌、比目鱼肌', secondary: '前臂屈肌', start: 'dumbbell-calf-raise-start.webp', peak: 'dumbbell-calf-raise-peak.webp' },
  'smith-machine-calf-raise': { id: 'smith-machine-calf-raise', name: '史密斯器械提踵', en: 'Smith Machine Calf Raise', equipment: '史密斯机', level: '入门', primary: '腓肠肌', secondary: '比目鱼肌', start: 'smith-machine-calf-raise-start.webp', peak: 'smith-machine-calf-raise-peak.webp' },
  'db-lunge': { id: 'db-lunge', name: '哑铃弓步', en: 'Dumbbell Lunge', equipment: '哑铃', level: '进阶', primary: '臀大肌、股四头肌', secondary: '腘绳肌', start: 'db-lunge-start.webp', peak: 'db-lunge-peak.webp' },
  'smith-machine-reverse-lunge': { id: 'smith-machine-reverse-lunge', name: '史密斯器械后撤弓步', en: 'Smith Machine Reverse Lunge', equipment: '史密斯机', level: '进阶', primary: '臀大肌、股四头肌', secondary: '臀中肌、腘绳肌', start: 'smith-machine-reverse-lunge-start.webp', peak: 'smith-machine-reverse-lunge-peak.webp' },
  'bulgarian-split-squat': { id: 'bulgarian-split-squat', name: '保加利亚分腿蹲', en: 'Bulgarian Split Squat', equipment: '哑铃', level: '进阶', primary: '臀大肌、股四头肌', secondary: '腘绳肌', start: 'bulgarian-split-squat-start.webp', peak: 'bulgarian-split-squat-peak.webp' },
  'smith-machine-bulgarian-split': { id: 'smith-machine-bulgarian-split', name: '史密斯器械保加利亚分腿蹲', en: 'Smith Machine Bulgarian Split Squat', equipment: '史密斯机', level: '进阶', primary: '臀大肌、股四头肌', secondary: '腘绳肌', start: 'smith-machine-bulgarian-split-start.webp', peak: 'smith-machine-bulgarian-split-peak.webp' },
  'dumbbell-deadlift': { id: 'dumbbell-deadlift', name: '哑铃硬拉', en: 'Dumbbell Deadlift', equipment: '哑铃', level: '进阶', primary: '竖脊肌、臀大肌、腘绳肌', secondary: '背阔肌、股四头肌、斜方肌', start: 'dumbbell-deadlift-start.webp', peak: 'dumbbell-deadlift-peak.webp' },
  'smith-machine-rdl': { id: 'smith-machine-rdl', name: '史密斯器械罗马尼亚硬拉', en: 'Smith Machine Romanian Deadlift', equipment: '史密斯机', level: '入门', primary: '腘绳肌', secondary: '竖脊肌、臀大肌、斜方肌', start: 'smith-machine-rdl-start.webp', peak: 'smith-machine-rdl-peak.webp' },
  'dumbbell-romanian-deadlift': { id: 'dumbbell-romanian-deadlift', name: '哑铃罗马尼亚硬拉', en: 'Dumbbell Romanian Deadlift', equipment: '哑铃', level: '进阶', primary: '臀大肌、腘绳肌', secondary: '竖脊肌、前臂屈肌', start: 'dumbbell-romanian-deadlift-start.webp', peak: 'dumbbell-romanian-deadlift-peak.webp' },
  'single-leg-lying-leg-curl': { id: 'single-leg-lying-leg-curl', name: '单腿仰卧腿弯举', en: 'Single Leg Lying Leg Curl', equipment: '腿弯举机', level: '进阶', primary: '腘绳肌', secondary: '腓肠肌', start: 'single-leg-lying-leg-curl-start.webp', peak: 'single-leg-lying-leg-curl-peak.webp' },
  'captains-chair-leg-raise': { id: 'captains-chair-leg-raise', name: '船长椅举腿', en: 'Captain\'s Chair Leg Raise', equipment: '自重', level: '进阶', primary: '髂腰肌、腹直肌', secondary: '腹斜肌、腹横肌', start: 'captains-chair-leg-raise-start.webp', peak: 'captains-chair-leg-raise-peak.webp' },
  'weighted-wall-crunch': { id: 'weighted-wall-crunch', name: '负重墙卷腹', en: 'Weighted Wall Crunch', equipment: '杠片', level: '进阶', primary: '腹直肌', secondary: '腹斜肌', start: 'weighted-wall-crunch-start.webp', peak: 'weighted-wall-crunch-peak.webp' }
};

/** 基础动作 → RepDB 动作 id */
export const EXERCISE_DEMOS: Record<string, string> = {
  '杠铃卧推': 'bench-press',
  '史密斯架卧推': 'smith-machine-bench-press',
  '器械推胸': 'chest-press-machine',
  '哑铃卧推': 'db-bench-press',
  '哑铃飞鸟': 'db-fly',
  '双杠臂屈伸': 'dips',
  '蝴蝶机夹胸': 'pec-deck',
  '龙门架夹胸': 'cable-fly',
  '引体向上': 'pull-up',
  '器械辅助引体向上': 'pull-up',
  '器械高位下拉': 'lat-pulldown',
  '绳索高位下拉': 'lat-pulldown',
  '器械划船': 'chest-supported-machine-row',
  '绳索划船': 'seated-cable-row',
  '杠铃俯身划船': 'barbell-row',
  '哑铃俯身划船': 'bent-over-db-row',
  '器械俯身划船': 'chest-supported-machine-row',
  '杠铃深蹲': 'squat',
  '史密斯深蹲': 'smith-machine-squat',
  '髋内收器械': 'hip-adduction',
  '腿屈伸器械': 'leg-extension',
  '箭步蹲': 'barbell-lunge',
  '保加利亚蹲': 'barbell-bulgarian-split-squat',
  '器械深蹲': 'hack-squat',
  '器械腘绳肌': 'leg-curl',
  '髋外展器械': 'hip-abduction',
  '提踵': 'standing-calf-raise',
  '传统硬拉': 'deadlift',
  '相扑硬拉': 'sumo-deadlift',
  '罗马尼亚硬拉': 'romanian-deadlift',
  '杠铃推肩': 'ohp',
  '史密斯架推肩': 'smith-machine-shoulder-press',
  '哑铃推肩': 'dumbbell-shoulder-press',
  '器械推肩': 'machine-shoulder-press',
  '杠铃前平举': 'barbell-front-raise',
  '哑铃侧平举': 'lateral-raise',
  '器械侧平举': 'plate-loaded-lateral-raise',
  '器械前平举': 'dumbbell-front-raise',
  '绳索前平举': 'cable-front-raise',
  '哑铃前平举': 'dumbbell-front-raise',
  '俯身飞鸟': 'rear-delt-fly',
  '龙门架反向飞鸟': 'cable-reverse-fly',
  '绳索面拉': 'face-pull',
  '杠铃二头弯举': 'barbell-curl',
  '哑铃二头弯举': 'bicep-curl',
  '绳索二头弯举': 'cable-curl',
  '器械二头弯举': 'machine-bicep-curl',
  '绳索下压': 'tricep-pushdown',
  '颈后臂屈伸': 'barbell-overhead-extension',
  '器械三头下压': 'machine-triceps-extension',
  '仰卧杠铃臂屈伸': 'skull-crusher',
  '卷腹': 'crunches',
  '器械卷腹': 'machine-seated-crunch',
  '站姿绳索卷腹': 'cable-crunch',
  '仰卧举腿': 'lying-leg-raise',
  '悬垂举腿': 'hanging-leg-raise',
  '平板支撑': 'plank',
  '侧平板支撑': 'side-plank',
  '跑步机': 'treadmill-running',
  '爬楼机': 'stair-climber',
  '椭圆机': 'elliptical-trainer',
  '动感单车': 'stationary-bike',
  '划船机': 'rowing-machine',
  '跳绳': 'jump-rope'
};

/** 动作 + 变式 → RepDB 动作 id */
export const VARIANT_DEMOS: Record<string, Record<string, string>> = {
  '器械高位下拉': {
    'grip:over': 'lat-pulldown',
    'grip:neutral': 'v-bar-lat-pulldown',
    'grip:under': 'reverse-grip-lat-pulldown',
    'gripWidth:wide': 'lat-pulldown',
    'gripWidth:narrow': 'close-grip-lat-pulldown'
  },
  '绳索高位下拉': {
    'grip:over': 'lat-pulldown',
    'grip:neutral': 'v-bar-lat-pulldown',
    'grip:under': 'reverse-grip-lat-pulldown',
    'gripWidth:narrow': 'close-grip-lat-pulldown'
  },
  '引体向上': {
    'grip:over': 'pull-up',
    'grip:under': 'chin-ups',
    'grip:neutral': 'commando-pull-up',
    'gripWidth:wide': 'pull-up',
    'gripWidth:narrow': 'close-grip-pull-ups',
    'load:added': 'weighted-pull-up'
  },
  '器械辅助引体向上': {
    'grip:under': 'chin-ups'
  },
  '杠铃卧推': {
    'angle:incline': 'incline-bench-press',
    'angle:flat': 'bench-press',
    'angle:decline': 'decline-bench-press-barbell',
    'width:wide': 'wide-grip-bench-press',
    'width:narrow': 'close-grip-bench-press'
  },
  '史密斯架卧推': {
    'angle:incline': 'smith-machine-incline-bench-press',
    'angle:flat': 'smith-machine-bench-press',
    'angle:decline': 'smith-machine-decline-bench-press'
  },
  '哑铃卧推': {
    'angle:incline': 'incline-db-press',
    'angle:flat': 'db-bench-press',
    'angle:decline': 'decline-bench-press',
    'dbGrip:neutral': 'db-bench-press'
  },
  '哑铃飞鸟': {
    'angle:incline': 'incline-dumbbell-fly',
    'angle:flat': 'db-fly',
    'angle:decline': 'decline-db-fly'
  },
  '双杠臂屈伸': {
    'load:added': 'weighted-dips'
  },
  '绳索划船': {
    'gripWidth:wide': 'wide-grip-seated-cable-row',
    'armMode:single': 'one-arm-seated-cable-row',
    'grip:under': 'seated-cable-row'
  },
  '杠铃俯身划船': {
    'gripSimple:under': 'reverse-grip-bent-over-row',
    'gripSimple:over': 'barbell-row'
  },
  '哑铃俯身划船': {
    'side:single': 'single-arm-db-row',
    'side:double': 'bent-over-db-row'
  },
  '器械划船': {
    'gripWidth:wide': 'chest-supported-machine-row'
  },
  '杠铃推肩': {
    'stance:standing': 'ohp',
    'stance:seated': 'seated-barbell-overhead-press'
  },
  '哑铃推肩': {
    'stance:standing': 'dumbbell-shoulder-press',
    'stance:seated': 'seated-db-press',
    'elbow:flare': 'dumbbell-shoulder-press'
  },
  '史密斯架推肩': {
    'stance:seated': 'seated-smith-machine-shoulder-press',
    'stance:standing': 'smith-machine-shoulder-press'
  },
  '俯身飞鸟': {
    'equipFly:dumbbell': 'rear-delt-fly',
    'equipFly:cable': 'cable-reverse-fly',
    'equipFly:machine': 'machine-reverse-fly'
  },
  '哑铃侧平举': {
    'stance:standing': 'lateral-raise',
    'stance:seated': 'seated-dumbbell-lateral-raise'
  },
  '绳索侧平举': {
    'armMode:single': 'cable-lateral-raise'
  },
  '哑铃前平举': {
    'grip:over': 'dumbbell-front-raise',
    'grip:neutral': 'dumbbell-front-raise'
  },
  '绳索前平举': {
    'equipFrontCable:straight': 'straight-bar-cable-front-raise',
    'equipFrontCable:cable': 'cable-front-raise'
  },
  '杠铃二头弯举': {
    'barType:ez': 'ez-bar-curl',
    'barType:barbell': 'barbell-curl'
  },
  '哑铃二头弯举': {
    'gripCurl:neutral': 'hammer-curl',
    'gripCurl:under': 'db-reverse-curl',
    'stance:seated': 'seated-dumbbell-curl'
  },
  '绳索二头弯举': {
    'equipCurl:cable': 'cable-curl',
    'equipCurl:vbar': 'cable-curl'
  },
  '绳索下压': {
    'equipCurl:vbar': 'v-bar-tricep-pushdown',
    'equipCurl:cable': 'tricep-pushdown',
    'equipCurl:single': 'single-arm-tricep-pushdown'
  },
  '颈后臂屈伸': {
    'equipRaise:dumbbell': 'overhead-tricep-extension',
    'equipRaise:cable': 'cable-overhead-tricep-extension',
    'equipRaise:barbell': 'barbell-overhead-extension'
  },
  '仰卧杠铃臂屈伸': {
    'barType:ez': 'ez-bar-lying-tricep-extension',
    'barType:barbell': 'skull-crusher'
  },
  '提踵': {
    'stance:standing': 'standing-calf-raise',
    'stance:seated': 'seated-calf-raise',
    'equipCalf:barbell': 'barbell-calf-raise',
    'equipCalf:dumbbell': 'dumbbell-calf-raise',
    'equipCalf:smith': 'smith-machine-calf-raise'
  },
  '箭步蹲': {
    'equip:barbell': 'barbell-lunge',
    'equip:dumbbell': 'db-lunge',
    'equip:smith': 'smith-machine-reverse-lunge'
  },
  '保加利亚蹲': {
    'equip:barbell': 'barbell-bulgarian-split-squat',
    'equip:dumbbell': 'bulgarian-split-squat',
    'equip:smith': 'smith-machine-bulgarian-split'
  },
  '传统硬拉': {
    'equipSimple:barbell': 'deadlift',
    'equipSimple:dumbbell': 'dumbbell-deadlift',
    'equipSimple:smith': 'smith-machine-rdl'
  },
  '相扑硬拉': {
    'equipSimple:barbell': 'sumo-deadlift'
  },
  '罗马尼亚硬拉': {
    'equipSimple:barbell': 'romanian-deadlift',
    'equipSimple:dumbbell': 'dumbbell-romanian-deadlift',
    'equipSimple:smith': 'smith-machine-rdl'
  },
  '器械腘绳肌': {
    'legMode:double': 'leg-curl',
    'legMode:single': 'single-leg-lying-leg-curl'
  },
  '悬垂举腿': {
    'equipHang:bar': 'hanging-leg-raise',
    'equipHang:machine': 'captains-chair-leg-raise'
  },
  '器械卷腹': {
    'armMode:double': 'machine-seated-crunch'
  },
  '卷腹': {
    'load:added': 'weighted-wall-crunch'
  }
};

/** 变式取值优先级：越靠前越具体，先命中先用 */
const VARIANT_PRIORITY = [
  'grip',
  'gripCurl',
  'gripSimple',
  'dbGrip',
  'gripWidth',
  'width',
  'angle',
  'stance',
  'pullHeight',
  'barType',
  'equip',
  'equipSimple',
  'equipCalf',
  'equipRaise',
  'equipFly',
  'equipCurl',
  'equipFrontCable',
  'equipHang',
  'legMode',
  'side',
  'armMode',
  'chestRegion',
  'torso',
  'torsoSimple',
  'lean',
  'leanSimple',
  'elbow',
  'load'
];

/**
 * 取某个动作（带变式）对应的示范：
 * 先按变式找，找不到就回落到基础动作。
 */
export function getExerciseDemo(
  name?: string,
  variants?: ExerciseVariants
): ExerciseDemo | undefined {
  if (!name) return undefined;
  const table = VARIANT_DEMOS[name];
  if (table && variants) {
    const groups = Object.keys(variants)
      .filter((key) => Boolean(variants[key]))
      .sort((left, right) => {
        // 用户真正改过的变式优先，默认值排后面
        const dl = isDefaultOption(left, variants[left] ?? '') ? 1 : 0;
        const dr = isDefaultOption(right, variants[right] ?? '') ? 1 : 0;
        if (dl !== dr) return dl - dr;
        const a = VARIANT_PRIORITY.indexOf(left);
        const b = VARIANT_PRIORITY.indexOf(right);
        return (a < 0 ? 99 : a) - (b < 0 ? 99 : b);
      });
    for (const group of groups) {
      const hit = table[group + ':' + variants[group]];
      if (hit) return DEMOS_BY_ID[hit];
    }
  }
  const base = EXERCISE_DEMOS[name];
  return base ? DEMOS_BY_ID[base] : undefined;
}

/** 该变式组当前选的是不是默认值 */
function isDefaultOption(group: string, option: string): boolean {
  const config = VARIANT_GROUPS[group];
  if (!config) return false;
  const fallback = config.defaultKey ?? config.options[0]?.key;
  return fallback === option;
}
