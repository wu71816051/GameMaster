/**
 * 规则系统适配器基类
 *
 * @description
 * 定义了所有规则系统适配器必须实现的接口。
 * 采用策略模式，每个规则系统（CoC7、D&D 5e等）都有自己的适配器实现。
 *
 * @module rule/base/rule-system-adapter
 */

import { DiceResult } from '../../core/utils/dice-parser'

/**
 * 技能检定参数接口
 */
export interface SkillCheckParams {
  /** 技能名称 */
  skillName: string
  /** 技能基础值 */
  skillValue: number
  /** 角色属性 (用于自动计算修正) */
  attributes?: Record<string, number>
  /** 熟练度等级 */
  proficiencyLevel?: string
  /** 命令行临时修正值 */
  modifier?: number
  /** 角色数据 */
  character?: any
}

/**
 * 修正值明细接口
 */
export interface ModifierBreakdown {
  /** 自动修正值 (属性加值、熟练度等) */
  autoModifier: number
  /** 命令行临时修正值 */
  manualModifier: number
  /** 总修正值 */
  totalModifier: number
  /** 修正值详细说明 */
  breakdown: {
    /** 属性加值 */
    attributeBonus?: number
    /** 熟练度加值 */
    proficiencyBonus?: number
    /** CoC伤害加值 */
    dbBonus?: number
    /** 其他规则特定修正 */
    otherBonus?: number
    /** 命令行修正 */
    manualBonus?: number
  }
}

/**
 * 技能检定结果接口
 */
export interface SkillCheckResult {
  /** 是否成功 */
  success: boolean
  /** 成功等级 (CoC: 困难成功, D&D: 成功) */
  successLevel?: string
  /** 是否为大成功 */
  criticalSuccess?: boolean
  /** 是否为大失败 */
  criticalFailure?: boolean
  /** 骰子表达式 (如 "1d100" 或 "1d20+5") */
  diceExpression: string
  /** 骰子结果对象 */
  diceResult: DiceResult
  /** 技能基础值 */
  skillValue: number
  /** 最终对比值 (技能+修正) */
  finalValue?: number
  /** 原始掷骰值 */
  rawRoll: number
  /** 结果描述 */
  description?: string
  /** 修正值明细 (用于详细显示) */
  modifierBreakdown?: ModifierBreakdown
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 技能数据结构定义
 */
export interface SkillSchema {
  /** 数据类型 */
  type: 'simple' | 'object'
  /** 对象结构的字段定义（仅type=object时） */
  fields?: Record<string, {
    type: 'string' | 'number' | 'enum'
    enum?: string[]
    required?: boolean
    default?: any
  }>
}

/**
 * 规则系统适配器抽象基类
 *
 * 所有规则系统适配器必须继承此类并实现抽象方法。
 *
 * @example
 * ```typescript
 * class CoC7Adapter extends RuleSystemAdapter {
 *   readonly ruleSystem = 'coc7'
 *   readonly displayName = '克苏鲁的呼唤 7版'
 *
 *   checkSkill(params: SkillCheckParams): SkillCheckResult {
 *     // 实现CoC7的检定逻辑
 *   }
 *
 *   formatResult(result: SkillCheckResult): string {
 *     // 格式化CoC7的输出
 *   }
 *
 *   // ... 其他方法实现
 * }
 * ```
 */
export abstract class RuleSystemAdapter {
  /** 规则系统标识符 */
  abstract readonly ruleSystem: string

  /** 规则系统显示名称 */
  abstract readonly displayName: string

  /** 默认骰子表达式 */
  abstract readonly defaultDiceExpression: string

  // ========== 技能检定方法 ==========

  /**
   * 执行技能检定
   *
   * @description
   * 核心方法：根据规则系统的逻辑执行技能检定。
   *
   * @param params - 检定参数
   * @returns 检定结果
   */
  abstract checkSkill(params: SkillCheckParams): SkillCheckResult

  /**
   * 计算自动修正值（可选）
   *
   * @description
   * 计算规则系统特定的自动修正值（如属性加值、熟练度加值等）。
   * 如果不需要，可以不实现此方法。
   *
   * @param params - 检定参数
   * @returns 修正值明细
   */
  calculateAutoModifier?(params: SkillCheckParams): ModifierBreakdown

  /**
   * 格式化检定结果
   *
   * @param result - 检定结果
   * @returns 格式化后的文本
   */
  abstract formatResult(result: SkillCheckResult): string

  // ========== 技能管理方法 ==========

  /**
   * 验证技能名称和值是否有效
   *
   * @param skillName - 技能名称（已规范化）
   * @param skillValue - 技能值
   * @returns 是否有效
   */
  abstract validateSkill(skillName: string, skillValue: any): boolean

  /**
   * 获取规则系统的默认技能列表
   *
   * @returns 技能名到默认值的映射
   */
  abstract getDefaultSkills(): Record<string, any>

  /**
   * 获取技能数据结构定义
   *
   * @returns 技能Schema（简单值或对象结构）
   */
  abstract getSkillSchema(): SkillSchema

  /**
   * 格式化技能值
   *
   * @description
   * 将用户输入的技能值转换为规则系统所需的格式。
   *
   * @param skillValue - 用户输入的技能值
   * @returns 格式化后的技能值
   */
  abstract formatSkillValue(skillValue: any): any

  /**
   * 计算技能的自动修正值
   *
   * @param skillName - 技能名称
   * @param character - 角色数据
   * @returns 修正值明细
   */
  abstract calculateSkillModifier(
    skillName: string,
    character: any
  ): ModifierBreakdown

  // ========== 通用方法 ==========

  /**
   * 获取技能名称映射
   *
   * @returns 技能别名到标准名的映射表
   */
  abstract getSkillMappings(): Record<string, string>

  /**
   * 规范化技能名称
   *
   * @description
   * 将用户输入的技能名称转换为规则系统的标准名称。
   * 例如：CoC7中"侦查" → "spot_hidden"。
   *
   * @param skillName - 原始技能名称
   * @returns 规范化后的技能名称
   */
  normalizeSkillName(skillName: string): string {
    const mappings = this.getSkillMappings()
    return mappings[skillName] || skillName
  }
}
