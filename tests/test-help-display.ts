/**
 * 测试骰子帮助信息显示
 */

import { DiceService } from '../src/core/services/dice.service'
import { Context } from 'koishi'

// 创建一个模拟的 Context
const mockContext = {
  logger: {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  },
} as unknown as Context

// 创建骰子服务实例
const diceService = new DiceService(mockContext)

console.log('=== 测试完整帮助信息 ===\n')
const fullHelp = diceService.getHelp()
console.log(fullHelp)
console.log('\n\n')

console.log('=== 测试基础示例 ===\n')
const basicExamples = diceService.getExamples('basic')
console.log(basicExamples)
console.log('\n\n')

console.log('=== 测试 D&D 5e 示例 ===\n')
const dnd5eExamples = diceService.getExamples('dnd5e')
console.log(dnd5eExamples)
console.log('\n\n')

console.log('=== 测试 CoC 7th 示例 ===\n')
const coc7Examples = diceService.getExamples('coc7')
console.log(coc7Examples)
console.log('\n\n')

console.log('=== 测试进阶示例 ===\n')
const advancedExamples = diceService.getExamples('advanced')
console.log(advancedExamples)
console.log('\n\n')

console.log('=== 测试所有示例 ===\n')
const allExamples = diceService.getExamples()
console.log(allExamples)
