/**
 * GenericAdapter 单元测试
 *
 * @description
 * 测试 GenericAdapter 的核心功能：
 * - 技能检定（成功/失败）
 * - 结果格式化
 * - 技能验证
 * - 技能值格式化
 */

import { describe, it, expect } from 'vitest'
import { GenericAdapter } from '../src/rule/generic/generic-adapter'

describe('GenericAdapter', () => {
  let adapter: GenericAdapter

  beforeAll(() => {
    adapter = new GenericAdapter()
  })

  describe('基本信息', () => {
    it('应该有正确的规则系统标识', () => {
      expect(adapter.ruleSystem).toBe('generic')
    })

    it('应该有正确的显示名称', () => {
      expect(adapter.displayName).toBe('通用规则')
    })

    it('应该有正确的默认骰子表达式', () => {
      expect(adapter.defaultDiceExpression).toBe('1d100')
    })
  })

  describe('技能检定', () => {
    it('应该成功执行技能检定', () => {
      const result = adapter.checkSkill({
        skillName: '侦查',
        skillValue: 60,
      })

      // 验证结果结构
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('rawRoll')
      expect(result).toHaveProperty('skillValue', 60)
      expect(result).toHaveProperty('finalValue', 60)
      expect(result).toHaveProperty('diceExpression', '1d100')
      expect(result).toHaveProperty('description')

      // 验证掷骰值范围
      expect(result.rawRoll).toBeGreaterThanOrEqual(1)
      expect(result.rawRoll).toBeLessThanOrEqual(100)

      // 验证成功判定逻辑
      if (result.rawRoll <= 60) {
        expect(result.success).toBe(true)
        expect(result.successLevel).toBe('成功')
        expect(result.description).toContain('✅')
      } else {
        expect(result.success).toBe(false)
        expect(result.successLevel).toBe('失败')
        expect(result.description).toContain('❌')
      }
    })

    it('应该正确处理修正值', () => {
      const result = adapter.checkSkill({
        skillName: '侦查',
        skillValue: 60,
        modifier: 10,
      })

      expect(result.finalValue).toBe(70)
      expect(result.modifierBreakdown?.totalModifier).toBe(10)
      expect(result.modifierBreakdown?.manualModifier).toBe(10)
      expect(result.modifierBreakdown?.autoModifier).toBe(0)
    })

    it('应该正确处理负修正值', () => {
      const result = adapter.checkSkill({
        skillName: '侦查',
        skillValue: 60,
        modifier: -20,
      })

      expect(result.finalValue).toBe(40)
      expect(result.modifierBreakdown?.totalModifier).toBe(-20)
    })
  })

  describe('结果格式化', () => {
    it('应该正确格式化成功的检定结果', () => {
      const result = adapter.checkSkill({
        skillName: '侦查',
        skillValue: 60,
      })

      // 如果掷骰值 <= 60，则为成功
      if (result.rawRoll <= 60) {
        const formatted = adapter.formatResult(result)
        expect(formatted).toContain('🎲')
        expect(formatted).toContain('侦查')
        expect(formatted).toContain('(60)')
        expect(formatted).toContain('📊')
        expect(formatted).toContain('掷骰')
        expect(formatted).toContain('✅')
      }
    })

    it('应该正确格式化带修正值的结果', () => {
      const result = adapter.checkSkill({
        skillName: '侦查',
        skillValue: 60,
        modifier: 10,
      })

      const formatted = adapter.formatResult(result)
      expect(formatted).toContain('最终值: 70')
    })
  })

  describe('技能验证', () => {
    it('应该接受有效的技能值', () => {
      expect(adapter.validateSkill('侦查', 50)).toBe(true)
      expect(adapter.validateSkill('侦查', 0)).toBe(true)
      expect(adapter.validateSkill('侦查', 100)).toBe(true)
    })

    it('应该拒绝无效的技能值', () => {
      expect(adapter.validateSkill('侦查', -1)).toBe(false)
      expect(adapter.validateSkill('侦查', 101)).toBe(false)
      expect(adapter.validateSkill('侦查', '50' as any)).toBe(false)
      expect(adapter.validateSkill('侦查', null as any)).toBe(false)
      expect(adapter.validateSkill('侦查', undefined as any)).toBe(false)
    })

    it('应该接受任何技能名称', () => {
      expect(adapter.validateSkill('侦查', 50)).toBe(true)
      expect(adapter.validateSkill('Spot Hidden', 50)).toBe(true)
      expect(adapter.validateSkill('任意技能名', 50)).toBe(true)
    })
  })

  describe('技能值格式化', () => {
    it('应该正确格式化数字技能值', () => {
      expect(adapter.formatSkillValue(50)).toBe(50)
      expect(adapter.formatSkillValue('50')).toBe(50)
    })

    it('应该限制技能值在0-100范围', () => {
      expect(adapter.formatSkillValue(-10)).toBe(0)
      expect(adapter.formatSkillValue(150)).toBe(100)
    })

    it('应该拒绝无效的技能值', () => {
      expect(() => adapter.formatSkillValue('invalid')).toThrow()
      expect(() => adapter.formatSkillValue(null as any)).toThrow()
    })
  })

  describe('技能修正值计算', () => {
    it('应该返回零修正值（通用规则无自动修正）', () => {
      const breakdown = adapter.calculateSkillModifier('侦查', {} as any)

      expect(breakdown.autoModifier).toBe(0)
      expect(breakdown.manualModifier).toBe(0)
      expect(breakdown.totalModifier).toBe(0)
    })
  })

  describe('技能名称规范化', () => {
    it('应该直接返回原始技能名（无映射）', () => {
      expect(adapter.normalizeSkillName('侦查')).toBe('侦查')
      expect(adapter.normalizeSkillName('Spot Hidden')).toBe('Spot Hidden')
      expect(adapter.normalizeSkillName('任意名')).toBe('任意名')
    })
  })

  describe('技能Schema', () => {
    it('应该返回简单类型的Schema', () => {
      const schema = adapter.getSkillSchema()
      expect(schema.type).toBe('simple')
    })
  })

  describe('默认技能列表', () => {
    it('应该返回空对象（无预定义技能）', () => {
      const skills = adapter.getDefaultSkills()
      expect(skills).toEqual({})
    })
  })

  describe('技能名称映射', () => {
    it('应该返回空对象（无映射）', () => {
      const mappings = adapter.getSkillMappings()
      expect(mappings).toEqual({})
    })
  })
})
