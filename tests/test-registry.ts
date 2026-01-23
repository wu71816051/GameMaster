/**
 * 测试规则系统注册表
 */

import { getRuleSystemRegistry } from '../src/rule/rule-system-registry'

console.log('=== 测试规则系统注册表 ===\n')

const registry = getRuleSystemRegistry()

// 1. 检查已注册的规则系统
console.log('1. 已注册的规则系统:')
const systems = registry.getRegisteredSystems()
console.log(`   ${systems.join(', ')}\n`)

// 2. 检查是否可以获取 GenericAdapter
console.log('2. 获取 GenericAdapter:')
const adapter = registry.getAdapter('generic')
if (adapter) {
  console.log(`   ✅ 成功`)
  console.log(`   规则系统: ${adapter.ruleSystem}`)
  console.log(`   显示名称: ${adapter.displayName}`)
  console.log(`   默认骰子: ${adapter.defaultDiceExpression}\n`)
} else {
  console.log(`   ❌ 失败：未找到 GenericAdapter\n`)
}

// 3. 测试检定功能
if (adapter) {
  console.log('3. 执行检定测试:')
  const result = adapter.checkSkill({
    skillName: '侦查',
    skillValue: 60,
  })

  console.log(`   技能名: 侦查`)
  console.log(`   技能值: ${result.skillValue}`)
  console.log(`   掷骰: ${result.rawRoll}`)
  console.log(`   结果: ${result.successLevel}`)
  console.log(`   ${result.description}\n`)
}

// 4. 测试格式化
if (adapter) {
  console.log('4. 格式化输出:')
  const result = adapter.checkSkill({
    skillName: '侦查',
    skillValue: 60,
    modifier: 10,
  })

  const formatted = adapter.formatResult(result)
  console.log('   ' + formatted.split('\n').join('\n   '))
}

console.log('\n=== 测试完成 ===')
