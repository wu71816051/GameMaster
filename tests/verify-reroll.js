/**
 * 验证重骰功能的简单测试
 */

const { DiceParser } = require('./lib/core/utils/dice-parser')
const { DiceFormatter } = require('./lib/core/utils/dice-formatter')

console.log('=== 骰子重骰机制验证 ===\n')

// 测试 1: 解析重骰表达式
console.log('✅ 测试 1: 解析 d10r2')
try {
  const result = DiceParser.parse('d10r2')
  console.log('解析成功:', result.first.reroll === 'r' && result.first.rerollThreshold === 2 ? '通过' : '失败')
} catch (error) {
  console.log('❌ 失败:', error.message)
}

// 测试 2: 解析递归重骰表达式
console.log('\n✅ 测试 2: 解析 d10rr2')
try {
  const result = DiceParser.parse('d10rr2')
  console.log('解析成功:', result.first.reroll === 'rr' && result.first.rerollThreshold === 2 ? '通过' : '失败')
} catch (error) {
  console.log('❌ 失败:', error.message)
}

// 测试 3: 掷骰并观察重骰
console.log('\n✅ 测试 3: 掷骰 10d10r1 (大概率触发重骰)')
try {
  const term = {
    count: 10,
    faces: 10,
    reroll: 'r',
    rerollThreshold: 1,
  }
  const result = DiceParser.roll(term)
  const hasReroll = !!(result.rerollHistory && result.rerollHistory.length > 0)
  console.log('掷骰成功:', result.total, '总和')
  console.log('触发重骰:', hasReroll ? '是' : '否')
  if (hasReroll) {
    console.log('重骰记录:', result.rerollHistory.length, '次')
  }
} catch (error) {
  console.log('❌ 失败:', error.message)
}

// 测试 4: 完整表达式测试
console.log('\n✅ 测试 4: 完整表达式 d10r2')
try {
  const result = DiceParser.evaluate('d10r2')
  console.log('表达式:', result.expression)
  console.log('总和:', result.total)
  console.log('结果:', result.detail)
} catch (error) {
  console.log('❌ 失败:', error.message)
}

// 测试 5: 多次运行观察随机性
console.log('\n✅ 测试 5: 多次运行 d10r3')
for (let i = 0; i < 3; i++) {
  try {
    const result = DiceParser.evaluate('d10r3')
    const formatted = DiceFormatter.format(result)
    console.log(`第 ${i + 1} 次:`, formatted)
  } catch (error) {
    console.log('❌ 失败:', error.message)
  }
}

console.log('\n=== 验证完成 ===')
