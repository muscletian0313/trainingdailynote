import type { ExerciseVariants, MuscleGroup } from '@/types';

/**
 * 动作变式：把一个基础动作（杠铃卧推）后面挂上「角度 / 握距 / 肘部」这类选择，
 * 用户选完组合即代表一个具体变式，而不用在动作库里给每种组合登记一条。
 *
 * 变式只影响两件事：展示文案（上斜 · 宽握 · 开肘）和练到的细分部位（见 variantRegionOf）。
 */

export interface VariantOption {
  key: string;
  label: string;
}

export interface VariantGroup {
  key: string;
  label: string;
  /** 默认选中的选项；不指定则用第一个 */
  defaultKey?: string;
  options: VariantOption[];
}

/** 变式组：同一套选项可以被多个动作复用 */
export const VARIANT_GROUPS: Record<string, VariantGroup> = {
  angle: {
    key: 'angle',
    label: '角度',
    defaultKey: 'flat',
    options: [
      { key: 'incline', label: '上斜' },
      { key: 'flat', label: '平板' },
      { key: 'decline', label: '下斜' }
    ]
  },
  width: {
    key: 'width',
    label: '握距',
    defaultKey: 'normal',
    options: [
      { key: 'wide', label: '宽握距' },
      { key: 'normal', label: '常规握距' },
      { key: 'narrow', label: '窄握距' }
    ]
  },
  grip: {
    key: 'grip',
    label: '握法',
    options: [
      { key: 'over', label: '正握' },
      { key: 'neutral', label: '对握' },
      { key: 'under', label: '反握' }
    ]
  },
  gripSimple: {
    key: 'gripSimple',
    label: '握法',
    options: [
      { key: 'over', label: '正握' },
      { key: 'under', label: '反握' }
    ]
  },
  pullHeight: {
    key: 'pullHeight',
    label: '拉位',
    defaultKey: 'neutral',
    options: [
      { key: 'high', label: '高位' },
      { key: 'neutral', label: '中立位' },
      { key: 'low', label: '低位' }
    ]
  },
  equip: {
    key: 'equip',
    label: '器材',
    options: [
      { key: 'barbell', label: '杠铃' },
      { key: 'dumbbell', label: '哑铃' },
      { key: 'smith', label: '史密斯架' }
    ]
  },
  /** 硬拉这类只有杠铃 / 哑铃（双手）/ 史密斯架三种器材的动作 */
  equipSimple: {
    key: 'equipSimple',
    label: '器材',
    options: [
      { key: 'barbell', label: '杠铃' },
      { key: 'dumbbell', label: '哑铃（双手）' },
      { key: 'smith', label: '史密斯架' }
    ]
  },
  /** 提踵的器材：站姿四种都能做，坐姿只有器械 / 哑铃（见 VARIANT_OPTION_RULES） */
  equipCalf: {
    key: 'equipCalf',
    label: '器材',
    options: [
      { key: 'machine', label: '器械' },
      { key: 'barbell', label: '杠铃' },
      { key: 'dumbbell', label: '哑铃（双手）' },
      { key: 'smith', label: '史密斯架' }
    ]
  },
  /** 杠铃 / 哑铃 / 绳索 三种器材（前平举、颈后臂屈伸） */
  equipRaise: {
    key: 'equipRaise',
    label: '器材',
    options: [
      { key: 'barbell', label: '杠铃' },
      { key: 'dumbbell', label: '哑铃' },
      { key: 'cable', label: '绳索' }
    ]
  },
  /** 侧平举 / 俯身飞鸟的器材 */
  equipFly: {
    key: 'equipFly',
    label: '器材',
    options: [
      { key: 'dumbbell', label: '哑铃' },
      { key: 'cable', label: '绳索' },
      { key: 'machine', label: '器械' }
    ]
  },
  /** 绳索类动作的器材（绳索二头弯举 / 绳索下压，可选项由 VARIANT_OPTION_RULES 微调） */
  equipCurl: {
    key: 'equipCurl',
    label: '器材',
    options: [
      { key: 'single', label: '单手' },
      { key: 'cable', label: '绳索' },
      { key: 'straight', label: '直杠' },
      { key: 'ez', label: '羊角杠' },
      { key: 'vbar', label: 'V杠' }
    ]
  },
  /** 弯举类的握法：对握（锤式）/ 反握（手心朝上） */
  gripCurl: {
    key: 'gripCurl',
    label: '握法',
    options: [
      { key: 'neutral', label: '对握' },
      { key: 'under', label: '反握' }
    ]
  },
  stance: {
    key: 'stance',
    label: '姿势',
    options: [
      { key: 'standing', label: '站姿' },
      { key: 'seated', label: '坐姿' }
    ]
  },
  /** 哑铃动作：一次做一边还是两边同时做（决定重量是单只还是一对） */
  side: {
    key: 'side',
    label: '单双侧',
    defaultKey: 'double',
    options: [
      { key: 'single', label: '单边' },
      { key: 'double', label: '双边' }
    ]
  },
  /** 杠铃动作：填的重量算不算上杠的重量 */
  barLoad: {
    key: 'barLoad',
    label: '杠铃负重',
    defaultKey: 'withBar',
    options: [
      { key: 'withBar', label: '含杠' },
      { key: 'withoutBar', label: '不含杠' }
    ]
  },
  legMode: {
    key: 'legMode',
    label: '腿',
    defaultKey: 'double',
    options: [
      { key: 'single', label: '单腿' },
      { key: 'double', label: '双腿' }
    ]
  },
  gripWidth: {
    key: 'gripWidth',
    label: '握距',
    defaultKey: 'normal',
    options: [
      { key: 'wide', label: '宽握距' },
      { key: 'normal', label: '常规握距' },
      { key: 'narrow', label: '窄握距' }
    ]
  },
  elbow: {
    key: 'elbow',
    label: '肘部',
    options: [
      { key: 'tuck', label: '夹肘' },
      { key: 'flare', label: '开肘' }
    ]
  },
  torso: {
    key: 'torso',
    label: '躯干',
    options: [
      { key: 'chestUp', label: '挺胸' },
      { key: 'neutral', label: '中立位' },
      { key: 'chestDown', label: '含胸' }
    ]
  },
  /** 只有「中立位 / 含胸」两档的躯干（反向飞鸟这类） */
  torsoSimple: {
    key: 'torsoSimple',
    label: '躯干',
    defaultKey: 'neutral',
    options: [
      { key: 'neutral', label: '中立位' },
      { key: 'chestDown', label: '含胸' }
    ]
  },
  /** 悬垂举腿的器材：单杠上悬垂，或器械上支撑 */
  equipHang: {
    key: 'equipHang',
    label: '器材',
    options: [
      { key: 'bar', label: '单杠' },
      { key: 'machine', label: '器械' }
    ]
  },
  armMode: {
    key: 'armMode',
    label: '手',
    defaultKey: 'double',
    options: [
      { key: 'single', label: '单手' },
      { key: 'double', label: '双手' }
    ]
  },
  lean: {
    key: 'lean',
    label: '倾斜',
    defaultKey: 'neutral',
    options: [
      { key: 'forward', label: '身体前倾' },
      { key: 'neutral', label: '中立位' },
      { key: 'backward', label: '身体后仰' }
    ]
  },
  /** 只有「前倾 / 中立位」两档的倾斜（保加利亚这类动作） */
  leanSimple: {
    key: 'leanSimple',
    label: '倾斜',
    defaultKey: 'neutral',
    options: [
      { key: 'forward', label: '前倾' },
      { key: 'neutral', label: '中立位' }
    ]
  },
  chestRegion: {
    key: 'chestRegion',
    label: '部位',
    defaultKey: 'mid',
    options: [
      { key: 'upper', label: '上胸' },
      { key: 'mid', label: '中胸' },
      { key: 'lower', label: '下胸' }
    ]
  },
  load: {
    key: 'load',
    label: '承重',
    options: [
      { key: 'body', label: '自重' },
      { key: 'added', label: '负重' }
    ]
  },
  dbGrip: {
    key: 'dbGrip',
    label: '握法',
    options: [
      { key: 'over', label: '正握' },
      { key: 'neutral', label: '对握' }
    ]
  }
};

/**
 * 基础动作 → 适用的变式组（数组顺序就是展示顺序）。
 * 只有「变式真的会改变练的部位或练法」的动作才配变式。
 */
export const EXERCISE_VARIANTS: Record<string, string[]> = {
  // 胸：角度决定上胸/中胸/下胸
  杠铃卧推: ['angle', 'width', 'elbow', 'barLoad'],
  史密斯架卧推: ['angle', 'width', 'elbow'],
  器械推胸: ['angle', 'width', 'elbow'],
  哑铃卧推: ['angle', 'dbGrip', 'side'],
  哑铃飞鸟: ['angle', 'side'],
  双杠臂屈伸: ['torso', 'elbow', 'load'],
  蝴蝶机夹胸: ['armMode', 'lean'],
  龙门架夹胸: ['armMode', 'chestRegion', 'torso'],
  // 背：握法 / 握距决定练背面哪一段
  引体向上: ['armMode', 'grip', 'gripWidth', 'load'],
  器械辅助引体向上: ['armMode', 'grip', 'gripWidth'],
  器械高位下拉: ['armMode', 'grip', 'gripWidth', 'torso', 'lean'],
  绳索高位下拉: ['armMode', 'grip', 'gripWidth', 'torso', 'lean'],
  器械划船: ['armMode', 'grip', 'gripWidth', 'pullHeight', 'torso', 'lean'],
  绳索划船: ['armMode', 'grip', 'gripWidth', 'pullHeight', 'torso', 'lean'],
  杠铃俯身划船: ['gripSimple', 'gripWidth', 'torso', 'barLoad'],
  哑铃俯身划船: ['side', 'torso'],
  器械俯身划船: ['armMode', 'grip', 'gripWidth', 'torso'],
  // 臀腿
  杠铃深蹲: ['barLoad'],
  箭步蹲: ['equip', 'barLoad'],
  保加利亚蹲: ['equip', 'barLoad', 'leanSimple'],
  器械腘绳肌: ['legMode'],
  传统硬拉: ['equipSimple', 'barLoad'],
  相扑硬拉: ['equipSimple', 'barLoad'],
  罗马尼亚硬拉: ['equipSimple', 'barLoad'],
  提踵: ['stance', 'equipCalf'],
  // 肩
  杠铃推举: ['stance', 'elbow', 'barLoad'],
  史密斯架推举: ['stance', 'elbow'],
  哑铃推举: ['stance', 'elbow', 'side'],
  器械推举: ['stance', 'elbow'],
  前平举: ['equipRaise', 'armMode'],
  侧平举: ['equipFly', 'armMode'],
  俯身飞鸟: ['equipFly', 'armMode'],
  龙门架反向飞鸟: ['armMode', 'torsoSimple'],
  绳索面拉: ['stance'],
  // 肱二头肌
  杠铃二头弯举: ['barLoad'],
  哑铃二头弯举: ['stance', 'gripCurl', 'side'],
  绳索二头弯举: ['stance', 'equipCurl', 'gripCurl'],
  器械二头弯举: ['armMode'],
  // 肱三头肌
  绳索下压: ['equipCurl'],
  颈后臂屈伸: ['stance', 'equipRaise', 'armMode'],
  仰卧杠铃臂屈伸: ['barLoad'],
  // 核心：自重为主，默认按「负重」记（体重 + 额外负重）
  卷腹: ['load'],
  仰卧举腿: ['load'],
  悬垂举腿: ['equipHang', 'load'],
  平板支撑: ['load'],
  侧平板支撑: ['load']
};

/**
 * 固定变式：写死的选项，不给用户选，只在界面上灰着显示。
 * 例：双杠臂屈伸是夹肘，用户改不了。
 */
export const FIXED_VARIANTS: Record<string, ExerciseVariants> = {
  双杠臂屈伸: { elbow: 'tuck' }
};

/**
 * 条件固定：满足条件时某组写死成某个选项（灰色不可改）。
 * 例：颈后臂屈伸用绳索时默认就是单手，不给切。
 */
const FIXED_VARIANT_RULES: {
  exercise: string;
  group: string;
  when: ExerciseVariants;
  option: string;
}[] = [
  { exercise: '颈后臂屈伸', group: 'armMode', when: { equipRaise: 'cable' }, option: 'single' }
];

/** 该动作当前生效的写死变式：静态的 + 条件命中的 */
function resolveFixed(name: string, variants?: ExerciseVariants): ExerciseVariants {
  const result: ExerciseVariants = { ...(FIXED_VARIANTS[name] ?? {}) };
  FIXED_VARIANT_RULES.forEach((rule) => {
    if (rule.exercise !== name) return;
    if (optionRuleMatched(rule.when, variants)) result[rule.group] = rule.option;
  });
  return result;
}

/**
 * 组默认值的特例：个别动作的某组默认选项和通用默认不一样。
 * 例：卷腹、平板支撑这类核心动作，默认就按「负重」记（体重 + 额外负重）。
 */
const VARIANT_DEFAULT_RULES: { exercise: string; group: string; option: string }[] = [
  { exercise: '卷腹', group: 'load', option: 'added' },
  { exercise: '仰卧举腿', group: 'load', option: 'added' },
  { exercise: '悬垂举腿', group: 'load', option: 'added' },
  { exercise: '平板支撑', group: 'load', option: 'added' },
  { exercise: '侧平板支撑', group: 'load', option: 'added' }
];

function preferredDefault(
  name: string,
  groupKey: string,
  options: VariantOption[],
  groupDefaultKey?: string
): string {
  const rule = VARIANT_DEFAULT_RULES.find(
    (item) => item.exercise === name && item.group === groupKey
  );
  const wanted = rule ? rule.option : groupDefaultKey;
  const hit = wanted ? options.find((option) => option.key === wanted) : undefined;
  return hit ? hit.key : options[0].key;
}

/**
 * 变式会改主练肌群的情况：窄握卧推（宽/常规除外）主练三头。
 * 键是「组:选项」，值是变式之下实际主练的肌群。
 */
const VARIANT_MUSCLE: Record<string, MuscleGroup> = {
  'width:narrow': 'triceps'
};

/** 变式之下实际主练的肌群（没有变化返回 undefined） */
export function variantMuscleOf(
  base: MuscleGroup,
  variants?: ExerciseVariants
): MuscleGroup | undefined {
  if (!variants) return undefined;
  const hit = Object.entries(variants).find(([group, option]) =>
    Boolean(VARIANT_MUSCLE[`${group}:${option}`])
  );
  if (!hit) return undefined;
  const muscle = VARIANT_MUSCLE[`${hit[0]}:${hit[1]}`];
  return muscle === base ? undefined : muscle;
}

/**
 * 变式对细分部位的加权：命中就把动作的细分部位往这个方向挪。
 * 键是「组:选项+肌群」，值是该组合强调的细分部位。
 *
 * 胸：上斜→上胸、平板→中胸、下斜→下胸；
 * 蝴蝶机夹胸（特例，按用户口径）：前倾→上胸、中立位→中胸、后仰→下胸；
 * 龙门架夹胸：部位标签选什么就是什么（上胸/中胸/下胸）；
 * 握距 / 肘部 / 握法 / 手 / 躯干（挺胸含胸）只改展示文案，不改变练到的部位
 * （双杠臂屈伸不论躯干怎么选，都算练下胸）。
 */
const VARIANT_REGION: Record<string, string> = {
  'angle:incline+chest': 'chest:upper',
  'angle:flat+chest': 'chest:mid',
  'angle:decline+chest': 'chest:lower',
  'lean:forward+chest': 'chest:upper',
  'lean:neutral+chest': 'chest:mid',
  'lean:backward+chest': 'chest:lower',
  'chestRegion:upper+chest': 'chest:upper',
  'chestRegion:mid+chest': 'chest:mid',
  'chestRegion:lower+chest': 'chest:lower',
  // 保加利亚蹲（臀腿）：前倾练臀，中立位就是普通的腿
  'leanSimple:forward+legs': 'legs:glute',
  'leanSimple:neutral+legs': 'legs:general'
};

/** 变式优先级：决定部位的组优先 */
const VARIANT_PRIORITY = ['angle', 'lean', 'leanSimple', 'chestRegion'];

/**
 * 组级联动：条件不满足时整组不显示（when 里任意一条命中即显示）。
 * 例：箭步蹲 / 硬拉选了哑铃或史密斯架，就不该再问「含不含杠」；
 * 前平举只有哑铃、绳索才分单手 / 双手，杠铃是双手握死杠。
 */
const VARIANT_GROUP_RULES: { exercise: string; group: string; when: ExerciseVariants[] }[] = [
  { exercise: '箭步蹲', group: 'barLoad', when: [{ equip: 'barbell' }] },
  { exercise: '保加利亚蹲', group: 'barLoad', when: [{ equip: 'barbell' }] },
  { exercise: '传统硬拉', group: 'barLoad', when: [{ equipSimple: 'barbell' }] },
  { exercise: '相扑硬拉', group: 'barLoad', when: [{ equipSimple: 'barbell' }] },
  { exercise: '罗马尼亚硬拉', group: 'barLoad', when: [{ equipSimple: 'barbell' }] },
  {
    exercise: '前平举',
    group: 'armMode',
    when: [{ equipRaise: 'dumbbell' }, { equipRaise: 'cable' }]
  },
  // 绳索二头弯举：只有「单手」没有握法可挑
  {
    exercise: '绳索二头弯举',
    group: 'gripCurl',
    when: [
      { equipCurl: 'cable' },
      { equipCurl: 'straight' },
      { equipCurl: 'ez' },
      { equipCurl: 'vbar' }
    ]
  },
  // 颈后臂屈伸：只有哑铃、绳索才分单手 / 双手（绳索那头还会被条件写死成单手）
  {
    exercise: '颈后臂屈伸',
    group: 'armMode',
    when: [{ equipRaise: 'dumbbell' }, { equipRaise: 'cable' }]
  }
];

function groupVisible(name: string, groupKey: string, variants?: ExerciseVariants): boolean {
  const rule = VARIANT_GROUP_RULES.find(
    (item) => item.exercise === name && item.group === groupKey
  );
  if (!rule) return true;
  return rule.when.some((item) => optionRuleMatched(item, variants));
}

/** 取某个动作可选的变式组（写死 / 条件写死的不算，见 lockedVariantsOf） */
export function variantGroupsOf(name: string, variants?: ExerciseVariants): VariantGroup[] {
  const locked = resolveFixed(name, variants);
  return (EXERCISE_VARIANTS[name] ?? [])
    .filter((key) => !locked[key] && groupVisible(name, key, variants))
    .map((key) => VARIANT_GROUPS[key])
    .filter(Boolean);
}

/**
 * 选项联动：命中条件后某个组只保留部分选项。
 * 例：提踵选「坐姿」后，器材只剩器械 / 哑铃（杠铃、史密斯架做不了坐姿）。
 */
interface VariantOptionRule {
  exercise: string;
  group: string;
  /** 条件：这些变式等于对应值时生效 */
  when: ExerciseVariants;
  /** 保留的选项 key */
  options: string[];
}

const VARIANT_OPTION_RULES: VariantOptionRule[] = [
  {
    exercise: '提踵',
    group: 'equipCalf',
    when: { stance: 'seated' },
    options: ['machine', 'dumbbell']
  },
  // 绳索二头弯举：换成直杠 / 羊角杠 / V 杠都只能反手握，只剩一个选项自然就选中它
  {
    exercise: '绳索二头弯举',
    group: 'gripCurl',
    when: { equipCurl: 'straight' },
    options: ['under']
  },
  {
    exercise: '绳索二头弯举',
    group: 'gripCurl',
    when: { equipCurl: 'ez' },
    options: ['under']
  },
  {
    exercise: '绳索二头弯举',
    group: 'gripCurl',
    when: { equipCurl: 'vbar' },
    options: ['under']
  },
  // 绳索下压：器材里没有「单手」这一款（那是二头弯举的单把手）
  {
    exercise: '绳索下压',
    group: 'equipCurl',
    when: {},
    options: ['cable', 'straight', 'ez', 'vbar']
  }
];

function optionRuleMatched(when: ExerciseVariants, variants?: ExerciseVariants): boolean {
  if (!variants) return false;
  return Object.entries(when).every(([key, value]) => variants[key] === value);
}

/** 某个变式组在当前选择下可用的选项 */
export function variantOptionsOf(
  name: string,
  groupKey: string,
  variants?: ExerciseVariants
): VariantOption[] {
  const group = VARIANT_GROUPS[groupKey];
  if (!group) return [];
  const rule = VARIANT_OPTION_RULES.find(
    (item) =>
      item.exercise === name && item.group === groupKey && optionRuleMatched(item.when, variants)
  );
  if (!rule) return group.options;
  return group.options.filter((option) => rule.options.includes(option.key));
}

/** 选完某个变式后统一修正一遍：写死的用写死值，不成立的回落到第一个可用项，整组不该显示的去掉 */
export function reconcileVariants(name: string, variants: ExerciseVariants): ExerciseVariants {
  const next = { ...variants };
  (EXERCISE_VARIANTS[name] ?? []).forEach((groupKey) => {
    const fixed = resolveFixed(name, next)[groupKey];
    if (fixed) {
      next[groupKey] = fixed;
      return;
    }
    if (!groupVisible(name, groupKey, next)) {
      delete next[groupKey];
      return;
    }
    const options = variantOptionsOf(name, groupKey, next);
    if (!options.length) return;
    if (!options.some((option) => option.key === next[groupKey])) {
      next[groupKey] = options[0].key;
    }
  });
  return next;
}

/** 该动作是否带变式 */
export function hasVariants(name: string): boolean {
  return variantGroupsOf(name).length > 0;
}

/** 某动作写死的变式：灰着显示、点不动，只用于展示 */
export interface LockedVariant {
  groupKey: string;
  groupLabel: string;
  optionLabel: string;
}

export function lockedVariantsOf(name: string, variants?: ExerciseVariants): LockedVariant[] {
  const locked = resolveFixed(name, variants);
  return (EXERCISE_VARIANTS[name] ?? [])
    .filter((key) => locked[key])
    .map((key) => {
      const group = VARIANT_GROUPS[key];
      const option = group?.options.find((item) => item.key === locked[key]);
      return { groupKey: key, groupLabel: group?.label ?? key, optionLabel: option?.label ?? '' };
    })
    .filter((item) => item.optionLabel);
}

/** 默认变式：写死的先用，其余每组取默认选项（按顺序来，联动规则看得到前面的选择） */
export function defaultVariants(name: string): ExerciseVariants {
  const result: ExerciseVariants = { ...(FIXED_VARIANTS[name] ?? {}) };
  (EXERCISE_VARIANTS[name] ?? []).forEach((groupKey) => {
    const group = VARIANT_GROUPS[groupKey];
    if (!group) return;
    const fixed = resolveFixed(name, result)[groupKey];
    if (fixed) {
      result[groupKey] = fixed;
      return;
    }
    if (!groupVisible(name, groupKey, result)) return;
    const options = variantOptionsOf(name, groupKey, result);
    if (!options.length) return;
    result[groupKey] = preferredDefault(name, groupKey, options, group.defaultKey);
  });
  return reconcileVariants(name, result);
}

export interface VariantBadge {
  label: string;
  /** 写死的选项，界面上灰着显示 */
  locked: boolean;
}

/** 变式展示标签（按变式组顺序），写死的排在里面并标记 locked */
export function variantBadges(name: string, variants?: ExerciseVariants): VariantBadge[] {
  const locked = resolveFixed(name, variants);
  const badges: VariantBadge[] = [];
  (EXERCISE_VARIANTS[name] ?? []).forEach((groupKey) => {
    const group = VARIANT_GROUPS[groupKey];
    if (!group) return;
    // 联动后不该出现的组（例如换了哑铃就不显示含不含杠）直接不展示
    if (!groupVisible(name, groupKey, variants)) return;
    const picked = locked[groupKey] ?? variants?.[groupKey];
    if (!picked) return;
    const option = group.options.find((item) => item.key === picked);
    if (option) badges.push({ label: option.label, locked: Boolean(locked[groupKey]) });
  });
  return badges;
}

/** 该动作是否选了「负重」（自重 + 负重，重量显示成「70+10」） */
export function hasAddedLoad(variants?: ExerciseVariants): boolean {
  return variants?.load === 'added';
}

/**
 * 变式调整后的细分部位：按 VARIANT_PRIORITY 取第一个命中的规则，
 * 没命中返回 undefined（保持基础部位不变）。
 */
export function variantRegionOf(muscle: string, variants?: ExerciseVariants): string | undefined {
  if (!variants) return undefined;
  for (let i = 0; i < VARIANT_PRIORITY.length; i += 1) {
    const groupKey = VARIANT_PRIORITY[i];
    const optionKey = variants[groupKey];
    if (!optionKey) continue;
    const hit = VARIANT_REGION[`${groupKey}:${optionKey}+${muscle}`];
    if (hit) return hit;
  }
  return undefined;
}
