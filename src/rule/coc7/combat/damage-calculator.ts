/**
 * CoC7 伤害计算器
 *
 * @description
 * 负责计算 CoC7 战斗系统中的伤害。
 * 包括基础伤害、伤害加值、极限成功额外伤害等。
 *
 * @module rule/coc7/combat/damage-calculator
 */

import { DiceParser } from '../../../core/utils/dice-parser'
import { Weapon, DamageResult } from './combat-types'

/**
 * 伤害计算器类
 */
export class DamageCalculator {
  constructor() {}

  /**
   * 计算伤害
   *
   * @param weapon - 武器数据
   * @param db - 伤害加值
   * @param successLevel - 成功等级（1-5，5为大成功）
   * @returns 伤害计算结果
   */
  calculateDamage(
    weapon: Weapon,
    db: number,
    successLevel: number
  ): DamageResult {
    const details: string[] = []

    // 1. 计算基础伤害（武器伤害）
    const baseDamage = this.rollWeaponDamage(weapon.damage)
    details.push(`基础伤害: ${baseDamage}`)

    // 2. 添加伤害加值
    let totalDamage = baseDamage + db
    if (db !== 0) {
      details.push(`DB: ${db >= 0 ? '+' : ''}${db}`)
    }

    // 3. 计算额外伤害
    let extraDamage = 0

    // 极限成功的额外伤害（非贯穿武器）
    if (successLevel === 4 && !weapon.special?.includes('贯穿')) {
      extraDamage = this.rollWeaponDamage(weapon.damage)
      details.push(`极难成功额外伤害: ${extraDamage}`)
    }
    // 贯穿武器的额外伤害骰（困难及以上成功）
    else if (successLevel >= 3 && weapon.special?.includes('贯穿')) {
      extraDamage = this.rollWeaponDamage(weapon.damage)
      details.push(`贯穿额外伤害: ${extraDamage}`)
    }

    totalDamage += extraDamage

    return {
      total: Math.max(0, totalDamage),
      base: baseDamage,
      db: db,
      extra: extraDamage || undefined,
      details: details.join(' → '),
    }
  }

  /**
   * 掷骰武器伤害
   *
   * @param damageExpression - 伤害表达式（如 "1D6", "1D10+DB"）
   * @returns 伤害值
   */
  private rollWeaponDamage(damageExpression: string): number {
    // 移除 DB 标记（DB 会由外部处理）
    const expression = damageExpression.replace(/[\+\-]?DB/gi, '').trim()

    // 如果表达式为空，返回 0
    if (!expression) {
      return 0
    }

    try {
      const result = DiceParser.evaluate(expression)
      return result.total
    } catch (error) {
      console.error('[DamageCalculator] 解析伤害表达式失败', {
        expression,
        error,
      })
      return 0
    }
  }

  /**
   * 计算伤害加值（DB）
   *
   * @param str - 力量值
   * @param siz - 体型值
   * @returns DB 表达式（如 "-1D4", "0", "+1D6"）
   */
  calculateDB(str: number, siz: number): string {
    const sum = str + siz

    // CoC7 DB 表
    if (sum <= 64) return '-1D4'
    if (sum <= 84) return '-1D6'
    if (sum <= 124) return '0'
    if (sum <= 164) return '+1D4'
    if (sum <= 204) return '+1D6'

    // 超过 204 的特殊处理
    const bonus = Math.floor((sum - 204) / 80)
    const diceSize = bonus > 1 ? 'D6' : 'D4'
    return `+${bonus + 1}${diceSize}`
  }

  /**
   * 掷骰伤害加值
   *
   * @param dbExpression - DB 表达式（如 "-1D4", "+1D6"）
   * @returns DB 数值
   */
  rollDB(dbExpression: string): number {
    if (dbExpression === '0') {
      return 0
    }

    try {
      const result = DiceParser.evaluate(dbExpression)
      return result.total
    } catch (error) {
      console.error('[DamageCalculator] 解析 DB 表达式失败', {
        expression: dbExpression,
        error,
      })
      return 0
    }
  }

  /**
   * 格式化伤害结果
   *
   * @param result - 伤害计算结果
   * @returns 格式化的字符串
   */
  formatDamageResult(result: DamageResult): string {
    let output = `🎲 伤害: ${result.total}`

    if (result.db !== 0) {
      output += ` (基础: ${result.base}`
      if (result.extra) {
        output += `, 额外: ${result.extra}`
      }
      output += `, DB: ${result.db >= 0 ? '+' : ''}${result.db})`
    } else if (result.extra) {
      output += ` (基础: ${result.base}, 额外: ${result.extra})`
    }

    return output
  }

  /**
   * 计算致死伤害
   *
   * @description
   * 致死武器在成功时造成最大伤害
   *
   * @param weapon - 武器数据
   * @param db - 伤害加值
   * @returns 致死伤害值
   */
  calculateLethalDamage(weapon: Weapon, db: number): number {
    if (!weapon.special?.includes('致死')) {
      return 0
    }

    // 解析武器伤害表达式
    const expression = weapon.damage.replace(/[\+\-]?DB/gi, '').trim()

    try {
      // 解析骰子表达式
      const match = expression.match(/(\d+)D(\d+)/i)
      if (match) {
        const count = parseInt(match[1])
        const faces = parseInt(match[2])
        // 致死伤害：骰子取最大值 + DB
        const maxRoll = count * faces
        return maxRoll + db
      }
    } catch (error) {
      console.error('[DamageCalculator] 计算致死伤害失败', { weapon, error })
    }

    return 0
  }

  /**
   * 应用伤害减免
   *
   * @param damage - 原始伤害
   * @param armor - 护甲值
   * @returns 减免后的伤害
   */
  applyArmorReduction(damage: number, armor: number): number {
    const reduced = damage - armor
    return Math.max(0, reduced)
  }
}
