/**
 * 骰子结果渲染器
 *
 * @description
 * 将骰点结果渲染为用户友好的字符串
 */

import type {
  DiceRollResult,
  ParsedDiceCommand,
  DiceResultRenderer,
  DieRollResult,
  UserInfo
} from './dice-types'

/**
 * 骰子结果渲染器实现
 */
export class DiceResultRendererImpl implements DiceResultRenderer {
  /**
   * 渲染骰点结果
   * @param result 骰点结果
   * @param command 原始命令
   * @param user 用户信息
   * @returns 格式化的结果字符串
   */
  render(result: DiceRollResult, command: ParsedDiceCommand, user?: UserInfo): string {
    const parts: string[] = []

    // 用户信息
    if (user) {
      parts.push(`👤 ${user.pid}@${user.platform}`)
    }

    // 命令部分
    parts.push(`🎲 ${command.rawCommand}`)

    // 原始投掷结果
    const rawRollsStr = this.renderRawRolls(result.rawRolls)
    parts.push(`投掷: [${rawRollsStr}]`)

    // 如果有修饰符，显示过滤后的结果
    if (command.modifiers.length > 0) {
      const filteredStr = result.filteredRolls.join(', ')
      parts.push(`筛选: [${filteredStr}]`)
    }

    // 修正值
    if (command.modifier !== 0) {
      const modifierStr = command.modifier > 0 ? `+${command.modifier}` : `${command.modifier}`
      parts.push(`修正: ${modifierStr}`)
    }

    // 最终结果
    parts.push(`结果: **${result.final}**`)

    // 暴骰提示
    if (result.hasExplosion) {
      parts.push('💥 暴骰!')
    }

    return parts.join('\n')
  }

  /**
   * 渲染原始投掷结果
   * @param rolls 骰子结果列表
   * @returns 格式化的骰子结果字符串
   */
  private renderRawRolls(rolls: DieRollResult[]): string {
    const parts: string[] = []

    for (const roll of rolls) {
      parts.push(this.renderSingleRoll(roll))
    }

    return parts.join(', ')
  }

  /**
   * 渲染单个骰子结果（包括暴骰的递归结果）
   * @param roll 骰子结果
   * @returns 格式化的骰子结果
   */
  private renderSingleRoll(roll: DieRollResult): string {
    let result = `${roll.value}`

    // 暴骰标记
    if (roll.isExploding) {
      result += '!'
    }

    // 递归渲染额外投掷
    if (roll.extraRolls) {
      const extraStr = roll.extraRolls.map(r => this.renderSingleRoll(r)).join(', ')
      result += `(${extraStr})`
    }

    return result
  }
}

/**
 * 创建骰子结果渲染器实例
 */
export function createDiceResultRenderer(): DiceResultRenderer {
  return new DiceResultRendererImpl()
}
