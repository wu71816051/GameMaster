/**
 * CoC7 默认技能和常量定义
 *
 * @description
 * 定义 CoC7 规则系统的默认技能列表、技能名称映射和常量。
 *
 * @module rule/coc7/coc7-defaults
 */

/**
 * CoC7 默认技能列表
 *
 * @description
 * 基于 CoC7 规则书的默认技能值。
 */
export const COC7_DEFAULT_SKILLS: Record<string, number> = {
  // 基础技能
  accounting: 10,
  anthropology: 1,
  appraise: 5,
  archaeology: 1,
  art_craft: 5,
  charm: 15,
  climb: 20,
  credit_rating: 15,
  cthulhu_mythos: 0,
  disguise: 5,
  dodge: 20,
  drive_auto: 20,
  fast_talk: 10,
  fighting: 25,
  firearms: 20,
  first_aid: 30,
  history: 20,
  intimidate: 15,
  jump: 25,
  law: 5,
  listen: 20,
  locale: 25,
  locksmith: 1,
  medicine: 5,
  natural_world: 10,
  navigation: 10,
  occult: 5,
  oppose: 25,
  persuade: 10,
  psychology: 10,
  ride: 5,
  sleight_of_hand: 10,
  spot_hidden: 25,
  stealth: 20,
  survival: 10,
  swim: 20,
  throw: 20,
  track: 10,

  // 语言技能
  language_own: 50,

  // 属性（用于参考）
  strength: 0,
  constitution: 0,
  size: 0,
  dexterity: 0,
  appearance: 0,
  intelligence: 0,
  power: 0,
  education: 0,
  luck: 0
}

/**
 * CoC7 技能名称映射表（中文 → 英文）
 *
 * @description
 * 支持中文技能名称到英文标准名称的映射。
 */
export const COC7_SKILL_MAPPINGS: Record<string, string> = {
  // 核心技能
  '侦查': 'spot_hidden',
  '聆听': 'listen',
  '图书馆': 'library_use',
  '图书馆使用': 'library_use',
  '心理学': 'psychology',
  '说服': 'persuade',
  '快速交谈': 'fast_talk',
  '魅力': 'charm',
  '恐吓': 'intimidate',

  // 物理技能
  '潜行': 'stealth',
  '闪避': 'dodge',
  '躲闪': 'dodge',
  '攀爬': 'climb',
  '跳跃': 'jump',
  '游泳': 'swim',
  '投掷': 'throw',
  '驾驶': 'drive_auto',
  '汽车驾驶': 'drive_auto',

  // 战斗技能
  '斗殴': 'fighting',
  '格斗': 'fighting',
  '射击': 'firearms',
  '火器': 'firearms',
  '手枪': 'handgun',
  '步枪': 'rifle',
  '霰弹枪': 'shotgun',
  '冲锋枪': 'submachine_gun',

  // 知识技能
  '会计': 'accounting',
  '考古学': 'archaeology',
  '人类学': 'anthropology',
  '鉴定': 'appraise',
  '估价': 'appraise',
  '历史': 'history',
  '法律': 'law',
  '医学': 'medicine',
  '急救': 'first_aid',
  '神秘学': 'occult',
  '克苏鲁神话': 'cthulhu_mythos',
  '克苏鲁神话技能': 'cthulhu_mythos',
  '神话': 'cthulhu_mythos',

  // 其他技能
  '开锁': 'locksmith',
  '锁匠': 'locksmith',
  '乔装': 'disguise',
  '伪装': 'disguise',
  '跟踪': 'track',
  '生存': 'survival',
  '领航': 'navigation',
  '语言': 'language_own',
  '母语': 'language_own',
  '艺术': 'art_craft',
  '工艺': 'art_craft',
  '手艺': 'art_craft',
  '信用评级': 'credit_rating',
  '信誉': 'credit_rating',
  '灵巧': 'sleight_of_hand',
  '妙手': 'sleight_of_hand',
  '偷窃': 'sleight_of_hand',
  '骑术': 'ride',
  '骑马': 'ride',
  '自然': 'natural_world',
  '野外生存': 'natural_world',
  '对抗': 'oppose',
  '抗拒': 'oppose',

  // 属性
  '力量': 'strength',
  'str': 'strength',
  '体质': 'constitution',
  'con': 'constitution',
  '体型': 'size',
  'siz': 'size',
  '敏捷': 'dexterity',
  'dex': 'dexterity',
  '外貌': 'appearance',
  'app': 'appearance',
  '智力': 'intelligence',
  'int': 'intelligence',
  '智商': 'intelligence',
  '意志': 'power',
  'pow': 'power',
  '精神': 'power',
  '教育': 'education',
  'edu': 'education',
  '幸运': 'luck',
  '运气': 'luck'
}

/**
 * CoC7 伤害加值（DB）表
 *
 * @description
 * 基于 STR + SIZ 的 DB 查找表。
 * 每个条目格式为 [最小值, 最大值, DB字符串]
 */
export const COC7_DB_TABLE: [number, number, string][] = [
  [0, 64, '-1d4'],
  [65, 84, '-1d6'],
  [85, 124, '0'],
  [125, 164, '+1d4'],
  [165, 204, '+1d6'],
  [205, 284, '+2d6'],
  [285, 364, '+1d6+1d6'],
  [365, 444, '+2d6+1d8'],
  [445, 564, '+2d6+1d10'],
  [565, 999, '+4d6']
]

/**
 * 成功等级常量
 */
export const COC7_SUCCESS_LEVELS = {
  CRITICAL_SUCCESS: '大成功',
  EXTREME_SUCCESS: '极难成功',
  HARD_SUCCESS: '困难成功',
  REGULAR_SUCCESS: '普通成功',
  FAILURE: '失败',
  CRITICAL_FAILURE: '大失败'
} as const

/**
 * 成功等级对应的 emoji
 */
export const COC7_SUCCESS_EMOJIS: Record<string, string> = {
  '大成功': '🎯',
  '极难成功': '🌟',
  '困难成功': '✨',
  '普通成功': '✅',
  '失败': '❌',
  '大失败': '💀'
}
