/**
 * 规则解析器基础接口
 * @description
 * 定义角色卡导入规则的通用接口
 *
 * @module rules/base
 */

import { CharacterData } from '../models/character-card'

/**
 * 角色卡导入结果
 */
export interface ImportedCard {
  name: string                    // 角色卡名称
  data: CharacterData             // 角色卡数据
  rule_system?: string            // 规则系统标识
  tags?: string[]                // 标签
}

/**
 * 解析器结果
 */
export interface ParseResult {
  success: boolean
  cards?: ImportedCard[]
  error?: string
}

/**
 * 规则解析器接口
 * @description
 * 所有规则解析器必须实现此接口
 */
export interface RuleParser {
  /**
   * 解析器名称（唯一标识）
   */
  readonly name: string

  /**
   * 解析器描述
   */
  readonly description: string

  /**
   * 解析 URL 并提取角色卡数据
   * @param url 数据源 URL
   * @returns 解析结果
   */
  parse(url: string): Promise<ParseResult>

  /**
   * 验证 URL 是否适用于此解析器
   * @param url 待验证的 URL
   * @returns 是否适用
   */
  validate(url: string): boolean
}

/**
 * 解析器注册表
 */
const parsers = new Map<string, RuleParser>()

/**
 * 注册规则解析器
 * @param parser 解析器实例
 */
export function registerParser(parser: RuleParser): void {
  if (parsers.has(parser.name)) {
    throw new Error(`解析器 "${parser.name}" 已存在`)
  }
  parsers.set(parser.name, parser)
}

/**
 * 获取解析器
 * @param name 解析器名称
 * @returns 解析器实例或 undefined
 */
export function getParser(name: string): RuleParser | undefined {
  return parsers.get(name)
}

/**
 * 列出所有已注册的解析器
 * @returns 解析器列表
 */
export function listParsers(): RuleParser[] {
  return Array.from(parsers.values())
}

/**
 * 根据 URL 自动检测解析器
 * @param url 数据源 URL
 * @returns 匹配的解析器或 undefined
 */
export function detectParser(url: string): RuleParser | undefined {
  for (const parser of parsers.values()) {
    if (parser.validate(url)) {
      return parser
    }
  }
  return undefined
}
