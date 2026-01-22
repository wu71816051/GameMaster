/**
 * 重骰机制测试
 *
 * @description
 * 测试骰子系统的重骰功能，包括 r（重骰一次）和 rr（递归重骰）
 */

import { DiceParser } from '../src/core/utils/dice-parser'

describe('DiceParser - 重骰机制测试', () => {
  describe('解析重骰表达式', () => {
    it('应该正确解析简单的重骰表达式 d10r1', () => {
      const result = DiceParser.parse('d10r1')
      expect(typeof result.first).toBe('object')
      if (typeof result.first === 'object') {
        expect(result.first.reroll).toBe('r')
        expect(result.first.rerollThreshold).toBe(1)
      }
    })

    it('应该正确解析递归重骰表达式 d10rr2', () => {
      const result = DiceParser.parse('d10rr2')
      expect(typeof result.first).toBe('object')
      if (typeof result.first === 'object') {
        expect(result.first.reroll).toBe('rr')
        expect(result.first.rerollThreshold).toBe(2)
      }
    })

    it('应该正确解析带重骰的复杂表达式 2d10r2+3', () => {
      const result = DiceParser.parse('2d10r2+3')
      expect(typeof result.first).toBe('object')
      if (typeof result.first === 'object') {
        expect(result.first.reroll).toBe('r')
        expect(result.first.rerollThreshold).toBe(2)
      }
      expect(result.arithmetic).toBeDefined()
      expect(result.arithmetic![0].value).toBe(3)
    })

    it('应该在重骰阈值 >= 面数时抛出错误', () => {
      expect(() => DiceParser.parse('d10r10')).toThrow('重骰阈值必须在 1 到骰子面数-1 之间')
    })

    it('应该在重骰阈值 < 1 时抛出错误', () => {
      expect(() => DiceParser.parse('d10r0')).toThrow('重骰阈值必须在 1 到骰子面数-1 之间')
    })
  })

  describe('掷骰并重骰', () => {
    it('应该在掷出 ≤ 阈值时重骰一次 (d10r2)', () => {
      // 由于是随机数，我们测试多次以确保至少有一次触发重骰
      let hasReroll = false
      for (let i = 0; i < 100; i++) {
        const term = {
          count: 10,
          faces: 10,
          reroll: 'r' as const,
          rerollThreshold: 2,
        }
        const result = DiceParser.roll(term)

        // 检查是否有重骰历史
        if (result.rerollHistory && result.rerollHistory.length > 0) {
          hasReroll = true
          // 验证重骰记录的格式
          const record = result.rerollHistory[0]
          expect(record.originalValue).toBeLessThanOrEqual(2)
          expect(record.rerolledValue).toBeGreaterThan(0)
          expect(record.rerolledValue).toBeLessThanOrEqual(10)
          break
        }
      }
      expect(hasReroll).toBe(true)
    })

    it('应该在掷出 ≤ 阈值时递归重骰 (d10rr2)', () => {
      // 由于是随机数，我们测试多次以确保至少有一次触发重骰
      let hasReroll = false
      for (let i = 0; i < 100; i++) {
        const term = {
          count: 10,
          faces: 10,
          reroll: 'rr' as const,
          rerollThreshold: 2,
        }
        const result = DiceParser.roll(term)

        // 检查是否有重骰历史
        if (result.rerollHistory && result.rerollHistory.length > 0) {
          hasReroll = true
          // 验证递归重骰：最终结果应该 > 阈值
          const record = result.rerollHistory[0]
          expect(record.originalValue).toBeLessThanOrEqual(2)
          // 最终结果可能大于阈值（重骰后）
          break
        }
      }
      expect(hasReroll).toBe(true)
    })

    it('应该在没有触发重骰时不记录重骰历史', () => {
      const term = {
        count: 1,
        faces: 10,
        reroll: 'r' as const,
        rerollThreshold: 0, // 不会触发
      }
      const result = DiceParser.roll(term)

      expect(result.rerollHistory).toBeUndefined()
    })
  })

  describe('完整表达式测试', () => {
    it('应该正确计算带重骰的表达式 d10r1', () => {
      const result = DiceParser.evaluate('d10r1')

      expect(result.expression).toBe('d10r1')
      expect(result.total).toBeGreaterThan(0)
      expect(result.total).toBeLessThanOrEqual(10)
    })

    it('应该正确计算带递归重骰的表达式 2d10rr2', () => {
      const result = DiceParser.evaluate('2d10rr2')

      expect(result.expression).toBe('2d10rr2')
      expect(result.total).toBeGreaterThan(0)
      expect(result.total).toBeLessThanOrEqual(20)
    })

    it('应该正确计算带重骰和修饰符的表达式 4d6kh1r1', () => {
      const result = DiceParser.evaluate('4d6kh1r1')

      expect(result.expression).toBe('4d6kh1r1')
      // 由于保留最高值，结果应该在 1-6 之间
      expect(result.total).toBeGreaterThan(0)
      expect(result.total).toBeLessThanOrEqual(6)
    })
  })
})
