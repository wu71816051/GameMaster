/**
 * 手动测试重骰功能
 *
 * 运行方式：npx ts-node tests/test-reroll.ts
 */

import { DiceParser } from '../src/core/utils/dice-parser'
import { DiceFormatter } from '../src/core/utils/dice-formatter'

console.log('=== 骰子重骰机制测试 ===\n')

// 测试 1: 简单的重骰
console.log('测试 1: d10r2 (≤2 时重骰一次)')
try {
  const expr = 'd10r2'
  const result = DiceParser.evaluate(expr)
  const formatted = DiceFormatter.format(result)
  console.log(`表达式: ${expr}`)
  console.log(`结果: ${formatted}`)
  console.log(`有重骰历史: ${!!result.rolls[0].rerollHistory}\n`)
} catch (error) {
  console.error(`错误: ${error}\n`)
}

// 测试 2: 递归重骰
console.log('测试 2: d10rr2 (≤2 时递归重骰)')
try {
  const expr = 'd10rr2'
  const result = DiceParser.evaluate(expr)
  const formatted = DiceFormatter.format(result)
  console.log(`表达式: ${expr}`)
  console.log(`结果: ${formatted}`)
  console.log(`有重骰历史: ${!!result.rolls[0].rerollHistory}\n`)
} catch (error) {
  console.error(`错误: ${error}\n`)
}

// 测试 3: 多个骰子带重骰
console.log('测试 3: 3d10r1 (多个骰子，≤1 时重骰一次)')
try {
  const expr = '3d10r1'
  const result = DiceParser.evaluate(expr)
  const formatted = DiceFormatter.format(result)
  console.log(`表达式: ${expr}`)
  console.log(`结果: ${formatted}`)
  console.log(`有重骰历史: ${!!result.rolls[0].rerollHistory}\n`)
} catch (error) {
  console.error(`错误: ${error}\n`)
}

// 测试 4: 复杂表达式
console.log('测试 4: 2d10r2+5 (带算术运算)')
try {
  const expr = '2d10r2+5'
  const result = DiceParser.evaluate(expr)
  const formatted = DiceFormatter.format(result)
  console.log(`表达式: ${expr}`)
  console.log(`结果: ${formatted}`)
  console.log(`有重骰历史: ${!!result.rolls[0].rerollHistory}\n`)
} catch (error) {
  console.error(`错误: ${error}\n`)
}

// 测试 5: 重骰 + 保留修饰符
console.log('测试 5: 4d6kh1r1 (保留最高 + 重骰)')
try {
  const expr = '4d6kh1r1'
  const result = DiceParser.evaluate(expr)
  const formatted = DiceFormatter.format(result)
  console.log(`表达式: ${expr}`)
  console.log(`结果: ${formatted}`)
  console.log(`有重骰历史: ${!!result.rolls[0].rerollHistory}\n`)
} catch (error) {
  console.error(`错误: ${error}\n`)
}

// 测试 6: 多次运行以观察随机性
console.log('测试 6: 多次运行 d10r3 以观察重骰效果')
for (let i = 1; i <= 5; i++) {
  try {
    const result = DiceParser.evaluate('d10r3')
    const formatted = DiceFormatter.format(result)
    console.log(`第 ${i} 次: ${formatted}`)
  } catch (error) {
    console.error(`第 ${i} 次错误: ${error}`)
  }
}
console.log()

// 测试 7: 错误处理
console.log('测试 7: 错误处理')
try {
  DiceParser.parse('d10r10')
  console.log('❌ 应该抛出错误但没有')
} catch (error) {
  console.log(`✅ 正确捕获错误: ${(error as Error).message}`)
}

try {
  DiceParser.parse('d10r0')
  console.log('❌ 应该抛出错误但没有')
} catch (error) {
  console.log(`✅ 正确捕获错误: ${(error as Error).message}`)
}

console.log('\n=== 测试完成 ===')
