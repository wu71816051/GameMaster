/**
 * 骰子解析器单元测试
 *
 * 这个文件可以独立运行来测试骰子解析器的功能
 */

import { DiceParser } from '../src/core/utils/dice-parser'

// 测试用例
const testCases = [
  {
    description: '基础掷骰 - d20',
    expression: 'd20',
    shouldPass: true,
  },
  {
    description: '多个骰子 - 3d6',
    expression: '3d6',
    shouldPass: true,
  },
  {
    description: '加法修饰符 - 3d6+2',
    expression: '3d6+2',
    shouldPass: true,
  },
  {
    description: '减法修饰符 - 2d10-1',
    expression: '2d10-1',
    shouldPass: true,
  },
  {
    description: '保留最高 - 4d6kh1',
    expression: '4d6kh1',
    shouldPass: true,
  },
  {
    description: '保留最低 - 4d6kl1',
    expression: '4d6kl1',
    shouldPass: true,
  },
  {
    description: '丢弃最高 - 4d6dh1',
    expression: '4d6dh1',
    shouldPass: true,
  },
  {
    description: '丢弃最低 - 4d6dl1',
    expression: '4d6dl1',
    shouldPass: true,
  },
  {
    description: '爆骰 - d20!',
    expression: 'd20!',
    shouldPass: true,
  },
  {
    description: '复杂表达式 - 3d6+2d4-1',
    expression: '3d6+2d4-1',
    shouldPass: true,
  },
  {
    description: '空表达式 - 应该失败',
    expression: '',
    shouldPass: false,
  },
  {
    description: '无效表达式 - 应该失败',
    expression: 'xyz',
    shouldPass: false,
  },
]

// 运行测试
function runTests() {
  console.log('🎲 开始测试骰子解析器\n')

  let passed = 0
  let failed = 0

  testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}: ${testCase.description}`)
    console.log(`  表达式: "${testCase.expression}"`)

    try {
      const result = DiceParser.evaluate(testCase.expression)

      if (testCase.shouldPass) {
        passed++
        console.log(`  ✅ 通过`)
        console.log(`  结果: ${result.total} (详情: ${result.detail})`)
      } else {
        failed++
        console.log(`  ❌ 失败 - 期望失败但成功了`)
        console.log(`  结果: ${result.total}`)
      }
    } catch (error) {
      if (!testCase.shouldPass) {
        passed++
        console.log(`  ✅ 通过 - 正确捕获了错误`)
        console.log(`  错误: ${(error as Error).message}`)
      } else {
        failed++
        console.log(`  ❌ 失败 - 意外错误`)
        console.log(`  错误: ${(error as Error).message}`)
      }
    }

    console.log('')
  })

  console.log('='.repeat(50))
  console.log(`测试完成: ${passed} 通过, ${failed} 失败`)
  console.log('='.repeat(50))

  if (failed > 0) {
    process.exit(1)
  }
}

// 运行测试
runTests()
