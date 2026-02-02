/**
 * CoC7 战斗系统类型定义
 *
 * @description
 * 定义战斗系统相关的数据类型和接口。
 *
 * @module rule/coc7/combat/combat-types
 */

/**
 * 武器类型
 */
export type WeaponType = 'melee' | 'ranged'

/**
 * 特殊效果类型
 */
export type SpecialEffect = '贯穿' | '致死' | '非致死' | '投掷'

/**
 * 武器接口
 */
export interface Weapon {
  /** 武器名称 */
  name: string
  /** 武器类型 */
  type: WeaponType
  /** 使用的技能（格斗/斗殴/手枪/步枪等） */
  skill: string
  /** 伤害表达式（如 "1d6+DB"） */
  damage: string
  /** 射程（仅枪械，如 "15/30/60"，表示近距离/中距离/远距离） */
  range?: string
  /** 弹药量（仅枪械） */
  bullets?: number
  /** 特殊效果 */
  special?: SpecialEffect[]
  /** 描述 */
  description?: string
}

/**
 * 战斗轮参与者接口
 */
export interface CombatTurn {
  /** 角色 ID（NPC 用负数或特殊标识） */
  characterId: number
  /** 角色名称 */
  characterName: string
  /** 敏捷值 */
  dexterity: number
  /** 战斗技能值（用于敏捷相同时排序） */
  combatSkill?: number
  /** 是否为 NPC */
  isNpc: boolean
  /** 本轮是否已行动 */
  hasActed: boolean
  /** 是否选择延迟 */
  isDelayed: boolean
}

/**
 * 战斗状态接口
 */
export interface CombatState {
  /** 战斗是否进行中 */
  isActive: boolean
  /** 当前回合数 */
  round: number
  /** 行动顺序 */
  turnOrder: CombatTurn[]
  /** 当前行动索引 */
  currentTurnIndex: number
  /** 战斗开始时间 */
  startTime: Date
}

/**
 * 角色战斗状态接口（存储在 character.metadata）
 */
export interface CharacterCombatState {
  /** 当前耐久 */
  currentHp: number
  /** 最大耐久 */
  maxHp: number
  /** 当前理智 */
  currentSanity: number
  /** 最大理智 */
  maxSanity: number
  /** 临时伤害 */
  temporaryWounds: number
  /** 状态效果（如 "眩晕", "压制"） */
  conditions: string[]
}

/**
 * 攻击结果接口
 */
export interface AttackResult {
  /** 是否命中 */
  hit: boolean
  /** 成功等级 */
  successLevel: number
  /** 成功等级名称 */
  successLevelName: string
  /** 掷骰结果 */
  roll: number
  /** 造成的伤害 */
  damage?: number
  /** 伤害详情 */
  damageDetails?: string
  /** 是否大成功 */
  isCriticalSuccess: boolean
  /** 是否大失败 */
  isCriticalFailure: boolean
}

/**
 * 伤害计算结果接口
 */
export interface DamageResult {
  /** 总伤害 */
  total: number
  /** 基础伤害（武器伤害） */
  base: number
  /** 伤害加值 */
  db: number
  /** 额外伤害（极限成功/贯穿） */
  extra?: number
  /** 伤害计算详情 */
  details: string
}
