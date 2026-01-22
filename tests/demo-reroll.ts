/**
 * 重骰功能演示
 *
 * 展示重骰机制的实际效果
 */

import { DiceParser } from '../src/core/utils/dice-parser.js'
import { DiceFormatter } from '../src/core/utils/dice-formatter.js'

console.log('=== 骰子重骰功能演示 ===\n')

console.log('📝 功能说明:')
console.log('  r  - 重骰一次：当掷出结果 ≤ 阈值时，重骰一次')
console.log('  rr - 递归重骰：当掷出结果 ≤ 阈值时，持续重骰直到结果 > 阈值\n')

// 演示 1: 重骰一次
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('演示 1: 重骰一次 (d10r2)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('当掷出 1 或 2 时，重骰一次\n')

for (let i = 1; i <= 3; i++) {
  const result = DiceParser.evaluate('d10r2')
  const formatted = DiceFormatter.format(result)
  console.log(`第 ${i} 次: ${formatted}`)
  if (result.rolls[0].rerollHistory && result.rolls[0].rerollHistory.length > 0) {
    console.log(`         ↳ 触发重骰！`)
  }
  console.log()
}

// 演示 2: 递归重骰
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('演示 2: 递归重骰 (d10rr2)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('当掷出 1 或 2 时，持续重骰直到结果 > 2\n')

for (let i = 1; i <= 3; i++) {
  const result = DiceParser.evaluate('d10rr2')
  const formatted = DiceFormatter.format(result)
  console.log(`第 ${i} 次: ${formatted}`)
  if (result.rolls[0].rerollHistory && result.rolls[0].rerollHistory.length > 0) {
    const count = result.rolls[0].rerollHistory!.length
    console.log(`         ↳ 触发 ${count} 次重骰！`)
  }
  console.log()
}

// 演示 3: 多个骰子带重骰
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('演示 3: 多个骰子带重骰 (3d10r1)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('掷 3 个 10 面骰，掷出 1 时重骰\n')

for (let i = 1; i <= 3; i++) {
  const result = DiceParser.evaluate('3d10r1')
  const formatted = DiceFormatter.format(result)
  console.log(`第 ${i} 次: ${formatted}`)
  const totalRerolls = result.rolls[0].rerollHistory?.length || 0
  if (totalRerolls > 0) {
    console.log(`         ↳ 共触发 ${totalRerolls} 次重骰`)
  }
  console.log()
}

// 演示 4: 重骰 + 保留修饰符
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('演示 4: 重骰 + 保留最高 (4d6kh1r1)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('掷 4 个 6 面骰，保留最高值，掷出 1 时重骰\n')

for (let i = 1; i <= 3; i++) {
  const result = DiceParser.evaluate('4d6kh1r1')
  const formatted = DiceFormatter.format(result)
  console.log(`第 ${i} 次: ${formatted}`)
  if (result.rolls[0].rerollHistory && result.rolls[0].rerollHistory.length > 0) {
    console.log(`         ↳ 触发重骰，保留最高值: ${result.rolls[0].finalResults[0]}`)
  }
  console.log()
}

// 演示 5: 复杂表达式
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('演示 5: 复杂表达式 (2d10r2+5)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('掷 2 个 10 面骰（≤2 时重骰），然后加 5\n')

for (let i = 1; i <= 3; i++) {
  const result = DiceParser.evaluate('2d10r2+5')
  const formatted = DiceFormatter.format(result)
  console.log(`第 ${i} 次: ${formatted}`)
  console.log()
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🎉 演示完成！')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
