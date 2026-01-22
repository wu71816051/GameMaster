/**
 * 骰子结果格式化工具类
 *
 * @description
 * 负责将骰子掷骰结果格式化为展示给用户的字符串
 *
 * @module utils/dice-formatter
 */

import { DiceResult, DiceRoll, RerollRecord } from './dice-parser'

/**
 * 骰子结果格式化配置
 */
export interface DiceFormatterOptions {
  /** 描述（可选） */
  description?: string
  /** 是否显示表情符号（默认 true） */
  showEmoji?: boolean
}

/**
 * 骰子结果格式化工具类
 */
export class DiceFormatter {
  /**
   * 格式化掷骰结果为展示给用户的字符串
   *
   * @param diceResult - 掷骰结果
   * @param options - 格式化选项
   * @returns 格式化的结果文本
   */
  static format(diceResult: DiceResult, options: DiceFormatterOptions = {}): string {
    const { description, showEmoji = true } = options
    const emoji = showEmoji ? '🎲 ' : ''

    let result = ''

    // 添加描述（如果有）
    if (description && description.trim()) {
      result += `${description}\n`
    }

    // 检查是否有重骰历史
    const hasReroll = diceResult.rolls.some((roll) => roll.rerollHistory && roll.rerollHistory.length > 0)

    if (hasReroll) {
      // 有重骰时的格式化
      result += this.formatWithReroll(diceResult, emoji)
    } else {
      // 普通格式化
      result += `${emoji}${diceResult.expression} = ${diceResult.detail} = ${diceResult.total}`
    }

    return result
  }

  /**
   * 格式化包含重骰的结果
   *
   * @param diceResult - 掷骰结果
   * @param emoji - 表情符号前缀
   * @returns 格式化的结果文本
   */
  private static formatWithReroll(diceResult: DiceResult, emoji: string): string {
    const parts: string[] = []

    // 构建表达式部分
    parts.push(`${emoji}${diceResult.expression}`)

    // 为每个掷骰结果构建详细信息
    for (const roll of diceResult.rolls) {
      const rollDetail = this.formatRollDetail(roll)
      if (rollDetail) {
        parts.push(rollDetail)
      }
    }

    // 添加最终总和
    parts.push(`= ${diceResult.total}`)

    return parts.join(' ')
  }

  /**
   * 格式化单个掷骰的详细信息
   *
   * @param roll - 掷骰结果
   * @returns 格式化的详细信息
   */
  private static formatRollDetail(roll: DiceRoll): string {
    const parts: string[] = []

    // 格式化原始结果（标记重骰的值）
    const markedResults = this.markRerolledValues(roll.results, roll.rerollHistory)
    parts.push(`[${markedResults.join(',')}]`)

    // 如果有保留/丢弃修饰符，显示中间结果
    if (roll.finalResults.length !== roll.results.length) {
      parts.push(`→[${roll.finalResults.join(',')}]`)
    }

    // 如果有重骰历史，添加重骰详情
    if (roll.rerollHistory && roll.rerollHistory.length > 0) {
      const rerollDetails = this.formatRerollHistory(roll.rerollHistory)
      if (rerollDetails) {
        parts.push(rerollDetails)
      }
    }

    return parts.join(' ')
  }

  /**
   * 标记被重骰的值（使用删除线样式）
   *
   * @param results - 掷骰结果数组
   * @param rerollHistory - 重骰历史
   * @returns 标记后的结果数组
   */
  private static markRerolledValues(results: number[], rerollHistory?: RerollRecord[]): string[] {
    if (!rerollHistory || rerollHistory.length === 0) {
      return results.map((r) => r.toString())
    }

    return results.map((result, index) => {
      // 检查这个位置是否有重骰记录
      const rerolled = rerollHistory.find((r) => r.index === index)
      if (rerolled) {
        // 使用删除线样式标记被重骰的值
        return `~~${rerolled.originalValue}~~→${result}`
      }
      return result.toString()
    })
  }

  /**
   * 格式化重骰历史
   *
   * @param rerollHistory - 重骰历史记录
   * @returns 格式化的重骰历史文本
   */
  private static formatRerollHistory(rerollHistory: RerollRecord[]): string {
    const rerollDescriptions = rerollHistory.map((record) => {
      return `${record.originalValue}→${record.rerolledValue}`
    })

    if (rerollDescriptions.length === 0) {
      return ''
    }

    return `(重骰: ${rerollDescriptions.join(', ')})`
  }

  /**
   * 格式化错误消息
   *
   * @param message - 错误消息
   * @param options - 格式化选项
   * @returns 格式化的错误文本
   */
  static formatError(message: string, options: DiceFormatterOptions = {}): string {
    const { showEmoji = true } = options
    const emoji = showEmoji ? '❌ ' : ''
    return `${emoji}${message}`
  }

  /**
   * 格式化成功消息
   *
   * @param message - 成功消息
   * @param options - 格式化选项
   * @returns 格式化的成功文本
   */
  static formatSuccess(message: string, options: DiceFormatterOptions = {}): string {
    const { showEmoji = true } = options
    const emoji = showEmoji ? '✅ ' : ''
    return `${emoji}${message}`
  }
}
