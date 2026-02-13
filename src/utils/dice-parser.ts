/**
 * 骰子命令解析器
 *
 * @description
 * 解析骰子命令字符串，输出为结构化的骰子命令对象
 *
 * 支持的语法：
 * - 3d6 - 3个6面骰
 * - 2d10+5 - 2个10面骰加5
 * - 4d6k3 - 4个6面骰，保留最高的3个 (keep highest)
 * - 4d6kl2 - 4个6面骰，保留最低的2个 (keep lowest)
 * - 3d8! - 3个8面骰，暴骰 (exploding)
 * - 2d20d1 - 2个20面骰，舍弃最低的1个 (drop lowest)
 * - 2d20dh1 - 2个20面骰，舍弃最高的1个 (drop highest)
 *
 * 多个骰子组合：
 * - 3d6+2d4 - 3个6面骰加上2个4面骰
 * - 1d20+1d8!+3 - 1个20面骰加上暴骰的1个8面骰再加3
 */

import type {
  Die,
  DiceModifier,
  ParsedDiceCommand,
  DiceCommandParser
} from './dice-types'
import { DiceParseError } from './dice-types'

/**
 * 骰子命令解析器实现
 */
export class DiceCommandParserImpl implements DiceCommandParser {
  /**
   * 解析骰子命令
   * @param command 命令字符串
   * @returns 解析后的命令，如果解析失败返回 null
   */
  parse(command: string): ParsedDiceCommand | null {
    try {
      // 去除首尾空格
      const trimmed = command.trim()

      if (!trimmed) {
        return null
      }

      // 解析结果
      const dice: Die[] = []
      const modifiers: DiceModifier[] = []
      let method: 'normal' | 'exploding' = 'normal'
      let modifier = 0

      // 使用正则表达式匹配骰子模式
      // 匹配格式: [数量]d[面数][!][修饰符]
      const diceRegex = /(\d*)d(\d+)(!)?([kldh]\d+)?/gi

      let lastIndex = 0
      let match

      while ((match = diceRegex.exec(trimmed)) !== null) {
        const [fullMatch, countStr, facesStr, exploding, modifierStr] = match

        // 检查是否为暴骰
        if (exploding === '!') {
          method = 'exploding'
        }

        // 解析骰子数量
        const count = countStr ? parseInt(countStr, 10) : 1
        const faces = parseInt(facesStr, 10)

        // 验证骰子参数
        if (count < 1 || count > 1000) {
          throw new Error(`骰子数量必须在1-1000之间: ${count}`)
        }
        if (faces < 2 || faces > 1000) {
          throw new Error(`骰子面数必须在2-1000之间: ${faces}`)
        }

        dice.push({ count, faces })

        // 解析修饰符
        if (modifierStr) {
          const parsedModifier = this.parseModifier(modifierStr)
          if (parsedModifier) {
            modifiers.push(parsedModifier)
          }
        }

        lastIndex = diceRegex.lastIndex
      }

      // 如果没有匹配到骰子，返回null
      if (dice.length === 0) {
        return null
      }

      // 解析固定修正值（如 +5, -3）
      const modifierRegex = /[+-]\d+$/g
      const modifierMatches = trimmed.match(modifierRegex)
      if (modifierMatches) {
        const lastModifier = modifierMatches[modifierMatches.length - 1]
        modifier = parseInt(lastModifier, 10)
      }

      return {
        dice,
        method,
        modifiers,
        modifier,
        rawCommand: trimmed
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new DiceParseError(`解析骰子命令失败: ${error.message}`)
      }
      return null
    }
  }

  /**
   * 解析修饰符字符串
   * @param modifierStr 修饰符字符串 (如 k3, kl2, d1, dh1)
   * @returns 修饰符对象
   */
  private parseModifier(modifierStr: string): DiceModifier | null {
    const typeMatch = modifierStr.match(/^([kldh]+)(\d+)$/)
    if (!typeMatch) {
      return null
    }

    const [, typeStr, valueStr] = typeMatch
    const value = parseInt(valueStr, 10)

    // 解析修饰符类型
    if (typeStr === 'k') {
      return { type: 'keepHighest', value }
    } else if (typeStr === 'kl') {
      return { type: 'keepLowest', value }
    } else if (typeStr === 'd') {
      return { type: 'dropLowest', value }
    } else if (typeStr === 'dh') {
      return { type: 'dropHighest', value }
    }

    return null
  }
}

/**
 * 创建骰子命令解析器实例
 */
export function createDiceCommandParser(): DiceCommandParser {
  return new DiceCommandParserImpl()
}
