/**
 * 骰子系统类型定义
 *
 * @description
 * 定义骰子系统所需的所有类型和接口
 * 支持通用骰点操作：骰一次、骰多次、骰多种骰子、取最大最小值、舍弃最大最小值、暴骰
 */

/**
 * 骰子类型
 * @description 表示单个骰子的面数和数量
 * @example { count: 3, faces: 6 } 表示 3 个 6 面骰
 */
export interface Die {
  /** 骰子数量 */
  count: number
  /** 骰子面数 */
  faces: number
}

/**
 * 骰子修饰符类型
 * @description 对骰子结果进行筛选或修饰的操作
 */
export interface DiceModifier {
  /** 修饰符类型 */
  type: 'keepHighest' | 'keepLowest' | 'dropHighest' | 'dropLowest'
  /** 操作的数量 */
  value: number
}

/**
 * 骰点方法类型
 * @description 骰点的方式
 */
export type DiceMethod = 'normal' | 'exploding'

/**
 * 解析后的骰子命令
 * @description 骰子命令解析工具的输出
 */
export interface ParsedDiceCommand {
  /** 骰子列表 */
  dice: Die[]
  /** 骰点方法（普通或暴骰） */
  method: DiceMethod
  /** 骰子修饰符列表 */
  modifiers: DiceModifier[]
  /** 固定修正值（加减值） */
  modifier: number
  /** 原始命令字符串 */
  rawCommand: string
}

/**
 * 单个骰子的投掷结果
 */
export interface DieRollResult {
  /** 骰子面数 */
  faces: number
  /** 投掷结果值 */
  value: number
  /** 是否为暴骰（投出了最大值） */
  isExploding?: boolean
  /** 暴骰后的额外投掷结果（递归） */
  extraRolls?: DieRollResult[]
}

/**
 * 骰子投掷结果
 * @description 单次投掷操作的结果
 */
export interface DiceRollResult {
  /** 骰点方法 */
  method: DiceMethod
  /** 所有骰子的原始投掷结果（包含暴骰的额外投掷） */
  rawRolls: DieRollResult[]
  /** 应用修饰符后的骰子结果 */
  filteredRolls: number[]
  /** 固定修正值 */
  modifier: number
  /** 最终结果 */
  final: number
  /** 是否发生了暴骰 */
  hasExplosion: boolean
}

/**
 * 骰子服务接口
 * @description 骰子服务需要实现的方法
 */
export interface DiceService {
  /**
   * 执行骰点操作
   * @param command 解析后的骰子命令
   * @returns 骰点结果
   */
  roll(command: ParsedDiceCommand): DiceRollResult
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  /** 用户在平台中的 ID (pid) */
  pid: string
  /** 平台名称 */
  platform: string
}

/**
 * 骰子结果渲染器接口
 */
export interface DiceResultRenderer {
  /**
   * 渲染骰点结果
   * @param result 骰点结果
   * @param command 原始命令
   * @param user 用户信息（可选）
   * @returns 格式化的结果字符串
   */
  render(result: DiceRollResult, command: ParsedDiceCommand, user?: UserInfo): string
}

/**
 * 骰子命令解析器接口
 */
export interface DiceCommandParser {
  /**
   * 解析骰子命令
   * @param command 命令字符串
   * @returns 解析后的命令，如果解析失败返回 null
   */
  parse(command: string): ParsedDiceCommand | null
}

/**
 * 解析错误类型
 */
export class DiceParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DiceParseError'
  }
}
