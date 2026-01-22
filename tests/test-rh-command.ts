/**
 * 测试新的 rh 命令功能
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

console.log('=== 测试简要帮助（.rh）===\n')
const briefHelp = diceService.getHelp(false)
console.log(briefHelp)
console.log('\n')

console.log('=== 测试详细帮助（.rh -d）===\n')
const detailedHelp = diceService.getHelp(true)
console.log(detailedHelp)
console.log('\n')

console.log('=== 测试 getBriefHelp() 方法 ===\n')
const briefHelpMethod = diceService.getBriefHelp()
console.log(briefHelpMethod)
