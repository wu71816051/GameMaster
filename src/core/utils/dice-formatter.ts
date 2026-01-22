/**
 * 骰子结果格式化工具类
 *
 * @description
 * 负责将骰子掷骰结果格式化为展示给用户的字符串
 *
 * @module utils/dice-formatter
 */

import { DiceResult } from './dice-parser'

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

    // 添加掷骰结果
    result += `${emoji}${diceResult.expression} = ${diceResult.detail} = ${diceResult.total}`

    return result
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
