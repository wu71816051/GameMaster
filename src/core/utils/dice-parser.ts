/**
 * 骰子表达式解析器
 *
 * @description
 * 负责解析骰子表达式并计算掷骰结果。
 *
 * 支持的语法：
 * - 基础掷骰: d20, 3d6, 2d10
 * - 修饰符: 3d6+2, 2d10-1, d20*2
 * - 保留最高/最低: 4d6kh1, 4d6kl1
 * - 丢弃最高/最低: 4d6dh1, 4d6dl1
 * - 爆骰: d20!, 3d6!
 * - 复杂表达式: 3d6+2d4-1
 *
 * @module utils/dice-parser
 */

/**
 * 单个骰子项的解析结果
 */
export interface DiceTerm {
  /** 骰子数量 */
  count: number
  /** 骰子面数 */
  faces: number
  /** 保留修饰符: 'kh'(keep highest), 'kl'(keep lowest), null */
  keepModifier?: 'kh' | 'kl' | null
  /** 丢弃修饰符: 'dh'(drop highest), 'dl'(drop lowest), null */
  dropModifier?: 'dh' | 'dl' | null
  /** 是否启用爆骰 */
  explode?: boolean
  /** 修饰符的数量 */
  modifierCount?: number
  /** 重骰条件: 'r'(重骰一次), 'rr'(递归重骰), null */
  reroll?: 'r' | 'rr' | null
  /** 重骰阈值（达到或低于此值时重骰） */
  rerollThreshold?: number
}

/**
 * 算术运算符
 */
export type ArithmeticOperator = '+' | '-' | '*' | '/'

/**
 * 算术项
 */
export interface ArithmeticTerm {
  /** 运算符 */
  operator: ArithmeticOperator
  /** 值（可以是骰子项或固定值） */
  value: number | DiceTerm
}

/**
 * 完整的骰子表达式
 */
export interface DiceExpression {
  /** 第一项（通常是骰子） */
  first: DiceTerm | number
  /** 后续算术项 */
  arithmetic?: ArithmeticTerm[]
}

/**
 * 单次掷骰结果
 */
export interface DiceRoll {
  /** 骰子面数 */
  faces: number
  /** 掷骰结果数组 */
  results: number[]
  /** 应用保留/丢弃后的结果 */
  finalResults: number[]
  /** 总和 */
  total: number
  /** 重骰历史（记录每次重骰的详细信息） */
  rerollHistory?: RerollRecord[]
}

/**
 * 重骰记录
 */
export interface RerollRecord {
  /** 原始掷骰值 */
  originalValue: number
  /** 重骰后的值 */
  rerolledValue: number
  /** 重骰索引（在 results 数组中的位置） */
  index: number
}

/**
 * 完整的掷骰结果
 */
export interface DiceResult {
  /** 原始表达式 */
  expression: string
  /** 各个骰子的掷骰结果 */
  rolls: DiceRoll[]
  /** 算术运算后的最终总和 */
  total: number
  /** 详细文本（用于显示） */
  detail: string
}

/**
 * 骰子解析器类
 */
export class DiceParser {
  /**
   * 解析骰子表达式
   *
   * @param expression - 骰子表达式（如 "3d6+2", "d20", "2d10kh1"）
   * @returns 解析后的表达式对象
   * @throws 如果表达式无效
   */
  static parse(expression: string): DiceExpression {
    const trimmed = expression.trim().toLowerCase()
    if (!trimmed) {
      throw new Error('表达式不能为空')
    }

    // 解析第一项（骰子或数字）
    const firstMatch = this.parseFirstTerm(trimmed)
    if (!firstMatch) {
      throw new Error(`无效的表达式: ${expression}`)
    }

    const { term, remaining } = firstMatch
    const result: DiceExpression = { first: term }

    // 解析后续的算术运算
    if (remaining) {
      result.arithmetic = this.parseArithmeticTerms(remaining)
    }

    return result
  }

  /**
   * 解析第一项（骰子或数字）
   */
  private static parseFirstTerm(expression: string): { term: DiceTerm | number; remaining: string } | null {
    // 匹配骰子表达式: 3d6, 3d6kh1, 3d6dl1, d20!, 2d10!r, 2d10r2, 2d10rr2
    // 修饰符顺序：! 爆骰, rr 递归重骰, r 重骰一次, kh/kl/dh/dl 保留丢弃
    const diceRegex = /^(\d*)d(\d+)(kh|kl|dh|dl)?(\d+)?(!)?(rr|r)?(\d+)?/i
    const diceMatch = expression.match(diceRegex)

    if (diceMatch) {
      const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1
      const faces = parseInt(diceMatch[2], 10)
      const keepModifier = diceMatch[3] as 'kh' | 'kl' | 'dh' | 'dl' | undefined
      const modifierCount = diceMatch[4] ? parseInt(diceMatch[4], 10) : 1
      const explode = !!diceMatch[5]
      const rerollType = diceMatch[6] as 'rr' | 'r' | undefined
      const rerollThreshold = diceMatch[7] ? parseInt(diceMatch[7], 10) : 1

      if (count < 1) {
        throw new Error('骰子数量必须大于 0')
      }
      if (faces < 1) {
        throw new Error('骰子面数必须大于 0')
      }
      if (modifierCount < 1) {
        throw new Error('修饰符数量必须大于 0')
      }
      if (modifierCount > count) {
        throw new Error('修饰符数量不能大于骰子数量')
      }
      if (rerollType && (rerollThreshold < 1 || rerollThreshold >= faces)) {
        throw new Error('重骰阈值必须在 1 到骰子面数-1 之间')
      }

      const term: DiceTerm = {
        count,
        faces,
        keepModifier: keepModifier === 'kh' || keepModifier === 'kl' ? keepModifier : undefined,
        dropModifier: keepModifier === 'dh' || keepModifier === 'dl' ? keepModifier : undefined,
        modifierCount,
        explode,
        reroll: rerollType,
        rerollThreshold: rerollType ? rerollThreshold : undefined,
      }

      const remaining = expression.slice(diceMatch[0].length).trim()
      return { term, remaining }
    }

    // 匹配纯数字
    const numberRegex = /^(\d+)/
    const numberMatch = expression.match(numberRegex)
    if (numberMatch) {
      const term = parseInt(numberMatch[1], 10)
      const remaining = expression.slice(numberMatch[0].length).trim()
      return { term, remaining }
    }

    return null
  }

  /**
   * 解析算术运算项
   */
  private static parseArithmeticTerms(expression: string): ArithmeticTerm[] {
    const terms: ArithmeticTerm[] = []

    while (expression) {
      // 匹配运算符和值（优先匹配骰子表达式，其次匹配数字）
      // 支持重骰修饰符: 2d10r2, 2d10rr2
      // 修饰符顺序：! 爆骰, rr 递归重骰, r 重骰一次, kh/kl/dh/dl 保留丢弃
      const operatorMatch = expression.match(
        /^([+\-*/])((\d*)d(\d+)(kh|kl|dh|dl)?(\d+)?(!)?(rr|r)?(\d+)?|\d+)/i
      )

      if (!operatorMatch) {
        throw new Error(`无效的算术表达式: ${expression}`)
      }

      const operator = operatorMatch[1] as ArithmeticOperator

      // 判断是骰子还是数字
      if (operatorMatch[3]) {
        // 是骰子
        const count = operatorMatch[3] ? parseInt(operatorMatch[3], 10) : 1
        const faces = parseInt(operatorMatch[4], 10)
        const keepModifier = operatorMatch[5] as 'kh' | 'kl' | 'dh' | 'dl' | undefined
        const modifierCount = operatorMatch[6] ? parseInt(operatorMatch[6], 10) : 1
        const explode = !!operatorMatch[7]
        const rerollType = operatorMatch[8] as 'rr' | 'r' | undefined
        const rerollThreshold = operatorMatch[9] ? parseInt(operatorMatch[9], 10) : 1

        if (count < 1) {
          throw new Error('骰子数量必须大于 0')
        }
        if (faces < 1) {
          throw new Error('骰子面数必须大于 0')
        }
        if (modifierCount < 1) {
          throw new Error('修饰符数量必须大于 0')
        }
        if (modifierCount > count) {
          throw new Error('修饰符数量不能大于骰子数量')
        }
        if (rerollType && (rerollThreshold < 1 || rerollThreshold >= faces)) {
          throw new Error('重骰阈值必须在 1 到骰子面数-1 之间')
        }

        const term: DiceTerm = {
          count,
          faces,
          keepModifier: keepModifier === 'kh' || keepModifier === 'kl' ? keepModifier : undefined,
          dropModifier: keepModifier === 'dh' || keepModifier === 'dl' ? keepModifier : undefined,
          modifierCount,
          explode,
          reroll: rerollType,
          rerollThreshold: rerollType ? rerollThreshold : undefined,
        }

        terms.push({ operator, value: term })
      } else {
        // 是数字
        const value = parseInt(operatorMatch[2], 10)
        terms.push({ operator, value })
      }

      expression = expression.slice(operatorMatch[0].length).trim()
    }

    return terms
  }

  /**
   * 掷骰子
   *
   * @param term - 骰子项
   * @returns 掷骰结果
   */
  static roll(term: DiceTerm): DiceRoll {
    const results: number[] = []
    const rerollHistory: RerollRecord[] = []

    // 掷骰
    for (let i = 0; i < term.count; i++) {
      let rollResult = this.rollSingle(term.faces)

      // 重骰处理（在爆骰之前处理）
      if (term.reroll && rollResult <= term.rerollThreshold!) {
        const originalValue = rollResult
        const index = results.length

        if (term.reroll === 'r') {
          // 重骰一次
          rollResult = this.rollSingle(term.faces)
          rerollHistory.push({ originalValue, rerolledValue: rollResult, index })
        } else if (term.reroll === 'rr') {
          // 递归重骰，直到结果大于阈值
          while (rollResult <= term.rerollThreshold!) {
            const tempValue = rollResult
            rollResult = this.rollSingle(term.faces)
            rerollHistory.push({ originalValue: tempValue, rerolledValue: rollResult, index })
          }
        }
      }

      results.push(rollResult)

      // 爆骰处理
      if (term.explode && rollResult === term.faces) {
        let explodeRoll = this.rollSingle(term.faces)
        results.push(explodeRoll)

        // 递归爆骰（如果爆骰结果再次达到最大值）
        while (explodeRoll === term.faces) {
          explodeRoll = this.rollSingle(term.faces)
          results.push(explodeRoll)
        }
      }
    }

    // 应用保留/丢弃修饰符
    let finalResults = [...results]

    if (term.keepModifier === 'kh') {
      // 保留最高
      finalResults = this.sortAndKeep(results, term.modifierCount!, 'desc')
    } else if (term.keepModifier === 'kl') {
      // 保留最低
      finalResults = this.sortAndKeep(results, term.modifierCount!, 'asc')
    } else if (term.dropModifier === 'dh') {
      // 丢弃最高
      finalResults = this.sortAndDrop(results, term.modifierCount!, 'desc')
    } else if (term.dropModifier === 'dl') {
      // 丢弃最低
      finalResults = this.sortAndDrop(results, term.modifierCount!, 'asc')
    }

    // 计算总和
    const total = finalResults.reduce((sum, val) => sum + val, 0)

    return {
      faces: term.faces,
      results,
      finalResults,
      total,
      rerollHistory: rerollHistory.length > 0 ? rerollHistory : undefined,
    }
  }

  /**
   * 掷单个骰子
   */
  private static rollSingle(faces: number): number {
    return Math.floor(Math.random() * faces) + 1
  }

  /**
   * 排序并保留前 N 个
   */
  private static sortAndKeep(results: number[], count: number, order: 'asc' | 'desc'): number[] {
    const sorted = [...results].sort((a, b) => order === 'asc' ? a - b : b - a)
    return sorted.slice(0, count)
  }

  /**
   * 排序并丢弃前 N 个
   */
  private static sortAndDrop(results: number[], count: number, order: 'asc' | 'desc'): number[] {
    const sorted = [...results].sort((a, b) => order === 'asc' ? a - b : b - a)
    return sorted.slice(count)
  }

  /**
   * 解析并计算骰子表达式
   *
   * @param expression - 骰子表达式
   * @returns 掷骰结果
   */
  static evaluate(expression: string): DiceResult {
    const parsed = this.parse(expression)
    const rolls: DiceRoll[] = []

    // 计算第一项
    let total = 0
    let detail = ''

    if (typeof parsed.first === 'number') {
      total = parsed.first
      detail = `${parsed.first}`
    } else {
      const roll = this.roll(parsed.first)
      rolls.push(roll)
      total = roll.total
      detail = `[${roll.results.join(',')}]`
      if (roll.finalResults.length !== roll.results.length) {
        detail += `→[${roll.finalResults.join(',')}]`
      }
    }

    // 计算算术运算
    if (parsed.arithmetic && parsed.arithmetic.length > 0) {
      for (const term of parsed.arithmetic) {
        if (typeof term.value === 'number') {
          switch (term.operator) {
            case '+':
              total += term.value
              detail += ` + ${term.value}`
              break
            case '-':
              total -= term.value
              detail += ` - ${term.value}`
              break
            case '*':
              total *= term.value
              detail += ` * ${term.value}`
              break
            case '/':
              total = Math.floor(total / term.value)
              detail += ` / ${term.value}`
              break
          }
        } else {
          const roll = this.roll(term.value)
          rolls.push(roll)
          const rollTotal = roll.total
          switch (term.operator) {
            case '+':
              total += rollTotal
              detail += ` + [${roll.results.join(',')}]`
              break
            case '-':
              total -= rollTotal
              detail += ` - [${roll.results.join(',')}]`
              break
            case '*':
              total *= rollTotal
              detail += ` * [${roll.results.join(',')}]`
              break
            case '/':
              total = Math.floor(total / rollTotal)
              detail += ` / [${roll.results.join(',')}]`
              break
          }
          if (roll.finalResults.length !== roll.results.length) {
            detail += `→[${roll.finalResults.join(',')}]`
          }
        }
      }
    }

    return {
      expression,
      rolls,
      total,
      detail,
    }
  }
}
