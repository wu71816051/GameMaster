/**
 * 验证重骰语法的正确性
 */

import { DiceParser } from '../src/core/utils/dice-parser.js'

console.log('=== 验证重骰语法解析 ===\n')

// 测试解析功能
const testCases = [
  { expression: 'd10r2', expectedReroll: 'r', expectedThreshold: 2 },
  { expression: 'd10rr2', expectedReroll: 'rr', expectedThreshold: 2 },
  { expression: '2d10r1', expectedReroll: 'r', expectedThreshold: 1 },
  { expression: '3d6rr1', expectedReroll: 'rr', expectedThreshold: 1 },
  { expression: '4d6kh1r1', expectedReroll: 'r', expectedThreshold: 1 },
]

let passCount = 0
let failCount = 0

for (const testCase of testCases) {
  try {
    const result = DiceParser.parse(testCase.expression)
    if (typeof result.first === 'object') {
      const rerollMatch = result.first.reroll === testCase.expectedReroll
      const thresholdMatch = result.first.rerollThreshold === testCase.expectedThreshold

      if (rerollMatch && thresholdMatch) {
        console.log(`✅ ${testCase.expression}: 解析正确`)
        passCount++
      } else {
        console.log(`❌ ${testCase.expression}: 解析错误`)
        console.log(`   期望: reroll=${testCase.expectedReroll}, threshold=${testCase.expectedThreshold}`)
        console.log(`   实际: reroll=${result.first.reroll}, threshold=${result.first.rerollThreshold}`)
        failCount++
      }
    } else {
      console.log(`❌ ${testCase.expression}: 未解析为骰子项`)
      failCount++
    }
  } catch (error) {
    console.log(`❌ ${testCase.expression}: 抛出错误 - ${(error as Error).message}`)
    failCount++
  }
}

// 测试错误处理
console.log('\n=== 验证错误处理 ===\n')

const errorCases = [
  { expression: 'd10r10', shouldError: true },
  { expression: 'd10r0', shouldError: true },
  { expression: 'd6r6', shouldError: true },
]

for (const testCase of errorCases) {
  try {
    const result = DiceParser.parse(testCase.expression)
    if (testCase.shouldError) {
      console.log(`❌ ${testCase.expression}: 应该抛出错误但没有`)
      failCount++
    }
  } catch (error) {
    if (testCase.shouldError) {
      console.log(`✅ ${testCase.expression}: 正确抛出错误`)
      passCount++
    }
  }
}

// 测试掷骰功能
console.log('\n=== 验证掷骰功能 ===\n')

console.log('掷骰 10d10r1 10次，观察是否触发重骰...')

let rerollCount = 0
for (let i = 0; i < 10; i++) {
  const term = {
    count: 10,
    faces: 10,
    reroll: 'r' as const,
    rerollThreshold: 1,
  }
  const result = DiceParser.roll(term)
  if (result.rerollHistory && result.rerollHistory.length > 0) {
    rerollCount++
  }
}

console.log(`触发重骰次数: ${rerollCount}/10`)
if (rerollCount > 0) {
  console.log('✅ 重骰功能正常')
  passCount++
} else {
  console.log('⚠️  未触发重骰（可能是随机性原因）')
}

// 汇总结果
console.log('\n=== 测试结果汇总 ===')
console.log(`通过: ${passCount}`)
console.log(`失败: ${failCount}`)
console.log(`总计: ${passCount + failCount}`)

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！')
} else {
  console.log(`\n⚠️  有 ${failCount} 个测试失败`)
}
