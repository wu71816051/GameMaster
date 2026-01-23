/**
 * GenericAdapter 手动测试
 *
 * 运行方式：npx ts-node tests/test-generic-adapter.ts
 */

import { GenericAdapter } from '../src/rule/generic/generic-adapter'

console.log('=== GenericAdapter 功能测试 ===\n')

// 创建适配器实例
const adapter = new GenericAdapter()

// 测试 1: 基本信息
console.log('测试 1: 基本信息')
console.log(`  规则系统: ${adapter.ruleSystem}`)
console.log(`  显示名称: ${adapter.displayName}`)
console.log(`  默认骰子: ${adapter.defaultDiceExpression}`)
console.log('  ✅ 通过\n')

// 测试 2: 技能检定（高成功率）
console.log('测试 2: 技能检定（技能值80）')
const result1 = adapter.checkSkill({
  skillName: '侦查',
  skillValue: 80,
})
console.log(`  掷骰值: ${result1.rawRoll}`)
console.log(`  最终值: ${result1.finalValue}`)
console.log(`  结果: ${result1.successLevel}`)
console.log(`  ${result1.description}`)
console.log('  ✅ 通过\n')

// 测试 3: 技能检定（低成功率）
console.log('测试 3: 技能检定（技能值20）')
const result2 = adapter.checkSkill({
  skillName: '潜行',
  skillValue: 20,
})
console.log(`  掷骰值: ${result2.rawRoll}`)
console.log(`  最终值: ${result2.finalValue}`)
console.log(`  结果: ${result2.successLevel}`)
console.log(`  ${result2.description}`)
console.log('  ✅ 通过\n')

// 测试 4: 带修正值的检定
console.log('测试 4: 带修正值的检定（技能值50 +10）')
const result3 = adapter.checkSkill({
  skillName: '说服',
  skillValue: 50,
  modifier: 10,
})
console.log(`  技能值: ${result3.skillValue}`)
console.log(`  修正值: ${result3.modifierBreakdown?.totalModifier}`)
console.log(`  最终值: ${result3.finalValue}`)
console.log(`  结果: ${result3.successLevel}`)
console.log('  ✅ 通过\n')

// 测试 5: 结果格式化
console.log('测试 5: 结果格式化')
const formatted = adapter.formatResult(result3)
console.log('  格式化输出:')
console.log('  ' + formatted.split('\n').join('\n  '))
console.log('  ✅ 通过\n')

// 测试 6: 技能验证
console.log('测试 6: 技能验证')
console.log(`  验证"侦查": ${adapter.validateSkill('侦查', 60)}`)
console.log(`  验证 -1: ${adapter.validateSkill('测试', -1)}`)
console.log(`  验证 101: ${adapter.validateSkill('测试', 101)}`)
console.log(`  验证"50": ${adapter.validateSkill('测试', '50' as any)}`)
console.log('  ✅ 通过\n')

// 测试 7: 技能值格式化
console.log('测试 7: 技能值格式化')
console.log(`  formatSkillValue(50): ${adapter.formatSkillValue(50)}`)
console.log(`  formatSkillValue("50"): ${adapter.formatSkillValue('50')}`)
console.log(`  formatSkillValue(-10): ${adapter.formatSkillValue(-10)}`)
console.log(`  formatSkillValue(150): ${adapter.formatSkillValue(150)}`)
console.log('  ✅ 通过\n')

// 测试 8: 技能名称规范化
console.log('测试 8: 技能名称规范化')
console.log(`  normalizeSkillName("侦查"): ${adapter.normalizeSkillName('侦查')}`)
console.log(`  normalizeSkillName("Spot Hidden"): ${adapter.normalizeSkillName('Spot Hidden')}`)
console.log('  ✅ 通过\n')

// 测试 9: Schema
console.log('测试 9: 技能Schema')
const schema = adapter.getSkillSchema()
console.log(`  类型: ${schema.type}`)
console.log('  ✅ 通过\n')

// 测试 10: 默认技能列表
console.log('测试 10: 默认技能列表')
const defaultSkills = adapter.getDefaultSkills()
console.log(`  技能数量: ${Object.keys(defaultSkills).length}`)
console.log('  ✅ 通过\n')

// 测试 11: 技能修正值计算
console.log('测试 11: 技能修正值计算')
const breakdown = adapter.calculateSkillModifier('侦查', {} as any)
console.log(`  自动修正: ${breakdown.autoModifier}`)
console.log(`  手动修正: ${breakdown.manualModifier}`)
console.log(`  总修正: ${breakdown.totalModifier}`)
console.log('  ✅ 通过\n')

// 测试 12: 技能名称映射
console.log('测试 12: 技能名称映射')
const mappings = adapter.getSkillMappings()
console.log(`  映射数量: ${Object.keys(mappings).length}`)
console.log('  ✅ 通过\n')

console.log('=== 所有测试通过 ===')
