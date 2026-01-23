/**
 * 通用规则适配器
 *
 * @description
 * 最简单的规则系统适配器实现。
 * - 检定公式: 1d100 vs 技能值
 * - 只判定成功/失败，无成功等级
 * - 无自动修正值计算
 * - 支持任意技能名称（无预定义列表）
 *
 * @module rule/generic/generic-adapter
 */

import { RuleSystemAdapter, SkillCheckParams, SkillCheckResult, ModifierBreakdown, SkillSchema } from '../base/rule-system-adapter'
import { DiceParser } from '../../core/utils/dice-parser'

/**
 * CoC 7版规则适配器
 */
export class GenericAdapter extends RuleSystemAdapter {
  readonly ruleSystem = 'generic'
  readonly displayName = '通用规则'
  readonly defaultDiceExpression = '1d100'

  // ========== 技能检定方法 ==========

  /**
   * 执行技能检定
   *
   * @description
   * 简单的1d100检定：掷骰值 ≤ 技能值即为成功。
   *
   * @param params - 检定参数
   * @returns 检定结果
   */
  checkSkill(params: SkillCheckParams): SkillCheckResult {
    // 计算最终技能值（基础值 + 临时修正值）
    const finalSkillValue = params.skillValue + (params.modifier || 0)

    // 执行1d100掷骰
    const diceResult = DiceParser.evaluate(this.defaultDiceExpression)
    const roll = diceResult.total

    // 简单判定：掷骰值 ≤ 技能值 = 成功
    const success = roll <= finalSkillValue

    return {
      success,
      successLevel: success ? '成功' : '失败',
      criticalSuccess: false,
      criticalFailure: false,
      diceExpression: this.defaultDiceExpression,
      diceResult,
      skillValue: params.skillValue,
      finalValue: finalSkillValue,
      rawRoll: roll,
      description: success ? '✅ 成功' : '❌ 失败',
      modifierBreakdown: {
        autoModifier: 0,
        manualModifier: params.modifier || 0,
        totalModifier: params.modifier || 0,
        breakdown: {
          manualBonus: params.modifier || 0
        }
      },
      metadata: {
        ruleSystem: this.ruleSystem,
        skillName: params.skillName
      }
    }
  }

  /**
   * 格式化检定结果
   *
   * @param result - 检定结果
   * @returns 格式化后的文本
   */
  formatResult(result: SkillCheckResult): string {
    const lines: string[] = []

    // 技能名和基础值
    lines.push(`🎲 ${result.metadata?.skillName || '技能检定'} (${result.skillValue})`)

    // 掷骰结果
    lines.push(`📊 掷骰: ${result.rawRoll}`)

    // 成功/失败
    lines.push(result.description!)

    // 如果有修正值，显示最终值
    if (result.finalValue !== result.skillValue) {
      lines.push(`📈 最终值: ${result.finalValue}`)
    }

    return lines.join('\n')
  }

  // ========== 技能管理方法 ==========

  /**
   * 验证技能
   *
   * @description
   * 通用规则：接受任何技能名称。
   * 只验证技能值是否为数字且在合理范围(0-100)。
   *
   * @param skillName - 技能名称（已规范化）
   * @param skillValue - 技能值
   * @returns 是否有效
   */
  validateSkill(skillName: string, skillValue: any): boolean {
    // 检查技能值是否为数字
    if (typeof skillValue !== 'number') {
      return false
    }

    // 验证范围：0-100
    return skillValue >= 0 && skillValue <= 100
  }

  /**
   * 获取默认技能列表
   *
   * @description
   * 通用规则无预定义技能列表。
   *
   * @returns 空对象
   */
  getDefaultSkills(): Record<string, any> {
    return {}
  }

  /**
   * 获取技能Schema
   *
   * @returns 技能数据结构定义
   */
  getSkillSchema(): SkillSchema {
    return {
      type: 'simple'  // 使用简单值格式
    }
  }

  /**
   * 格式化技能值
   *
   * @description
   * 直接返回数字，限制在0-100范围。
   *
   * @param skillValue - 用户输入的技能值
   * @returns 格式化后的技能值
   */
  formatSkillValue(skillValue: any): any {
    const num = Number(skillValue)
    if (isNaN(num)) {
      throw new Error(`无效的技能值: ${skillValue}`)
    }
    return Math.max(0, Math.min(100, num))
  }

  /**
   * 计算技能修正值
   *
   * @description
   * 通用规则无自动修正值。
   *
   * @param skillName - 技能名称
   * @param character - 角色数据
   * @returns 修正值明细（全为0）
   */
  calculateSkillModifier(
    skillName: string,
    character: any
  ): ModifierBreakdown {
    return {
      autoModifier: 0,
      manualModifier: 0,
      totalModifier: 0,
      breakdown: {
        attributeBonus: 0,
        proficiencyBonus: 0,
        dbBonus: 0,
        otherBonus: 0
      }
    }
  }

  // ========== 通用方法 ==========

  /**
   * 获取技能名称映射
   *
   * @description
   * 通用规则无技能名称映射。
   *
   * @returns 空对象
   */
  getSkillMappings(): Record<string, string> {
    return {}
  }

  /**
   * 规范化技能名称
   *
   * @description
   * 通用规则不进行名称转换，直接返回原始名称。
   *
   * @param skillName - 原始技能名称
   * @returns 原始技能名称（不转换）
   */
  normalizeSkillName(skillName: string): string {
    // 通用规则不进行映射，直接返回
    return skillName
  }
}
