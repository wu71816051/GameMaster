/**
 * 骰子服务
 *
 * @description
 * 实现骰子投掷的核心逻辑
 * 支持普通投掷和暴骰，以及各种修饰符
 */

import type {
  DiceService,
  ParsedDiceCommand,
  DiceRollResult,
  DieRollResult,
  DiceModifier
} from '../utils/dice-types'
import { Context } from 'koishi'

/**
 * 骰子服务实现
 */
export class DiceServiceImpl implements DiceService {
  constructor(private ctx: Context) {}

  /**
   * 执行骰点操作
   * @param command 解析后的骰子命令
   * @returns 骰点结果
   */
  roll(command: ParsedDiceCommand): DiceRollResult {
    // 投掷所有骰子
    const rawRolls: DieRollResult[] = []
    let hasExplosion = false

    for (const die of command.dice) {
      const rolls = this.rollDie(die, command.method)
      rawRolls.push(...rolls)
      if (rolls.some(r => r.isExploding)) {
        hasExplosion = true
      }
    }

    // 应用修饰符
    const filteredRolls = this.applyModifiers(rawRolls, command.modifiers)

    // 计算最终结果
    const sum = filteredRolls.reduce((acc, val) => acc + val, 0)
    const final = sum + command.modifier

    return {
      method: command.method,
      rawRolls,
      filteredRolls,
      modifier: command.modifier,
      final,
      hasExplosion
    }
  }

  /**
   * 投掷单个骰子（支持暴骰）
   * @param die 骰子定义
   * @param method 骰点方法
   * @returns 投掷结果列表
   */
  private rollDie(die: { count: number; faces: number }, method: 'normal' | 'exploding'): DieRollResult[] {
    const results: DieRollResult[] = []

    for (let i = 0; i < die.count; i++) {
      results.push(this.rollSingleDie(die.faces, method))
    }

    return results
  }

  /**
   * 投掷单个骰子（递归处理暴骰）
   * @param faces 骰子面数
   * @param method 骰点方法
   * @returns 投掷结果
   */
  private rollSingleDie(faces: number, method: 'normal' | 'exploding'): DieRollResult {
    // 生成随机数（1到faces）
    const value = this.random(1, faces)

    // 检查是否为暴骰
    const isExploding = method === 'exploding' && value === faces

    // 如果是暴骰，递归投掷
    const extraRolls = isExploding ? [this.rollSingleDie(faces, method)] : undefined

    return {
      faces,
      value,
      isExploding,
      extraRolls
    }
  }

  /**
   * 应用修饰符到骰子结果
   * @param rolls 原始骰子结果
   * @param modifiers 修饰符列表
   * @returns 过滤后的骰子值列表
   */
  private applyModifiers(rolls: DieRollResult[], modifiers: DiceModifier[]): number[] {
    // 提取所有骰子的值（包括暴骰的额外投掷）
    let values = this.extractAllValues(rolls)

    // 应用每个修饰符
    for (const modifier of modifiers) {
      values = this.applySingleModifier(values, modifier)
    }

    return values
  }

  /**
   * 提取所有骰子的值（包括暴骰的递归结果）
   * @param rolls 骰子结果列表
   * @returns 所有骰子的值
   */
  private extractAllValues(rolls: DieRollResult[]): number[] {
    const values: number[] = []

    for (const roll of rolls) {
      values.push(roll.value)
      if (roll.extraRolls) {
        values.push(...this.extractAllValues(roll.extraRolls))
      }
    }

    return values
  }

  /**
   * 应用单个修饰符
   * @param values 骰子值列表
   * @param modifier 修饰符
   * @returns 应用修饰符后的值列表
   */
  private applySingleModifier(values: number[], modifier: DiceModifier): number[] {
    const sorted = [...values].sort((a, b) => a - b)
    const { type, value } = modifier

    switch (type) {
      case 'keepHighest':
        // 保留最高的几个值
        return sorted.slice(-value)

      case 'keepLowest':
        // 保留最低的几个值
        return sorted.slice(0, value)

      case 'dropHighest':
        // 舍弃最高的几个值
        return sorted.slice(0, -value)

      case 'dropLowest':
        // 舍弃最低的几个值
        return sorted.slice(value)

      default:
        return values
    }
  }

  /**
   * 生成指定范围的随机整数
   * @param min 最小值（包含）
   * @param max 最大值（包含）
   * @returns 随机整数
   */
  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

/**
 * 创建骰子服务实例
 */
export function createDiceService(ctx: Context): DiceService {
  return new DiceServiceImpl(ctx)
}
