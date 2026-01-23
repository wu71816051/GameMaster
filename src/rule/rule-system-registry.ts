/**
 * 规则系统注册表
 *
 * @description
 * 单例模式，负责管理所有规则系统适配器。
 * 提供适配器的注册、获取和查询功能。
 *
 * @module rule/rule-system-registry
 */

import { RuleSystemAdapter } from './base/rule-system-adapter'
import { GenericAdapter } from './generic/generic-adapter'

/**
 * 规则系统注册表类
 *
 * @example
 * ```typescript
 * const registry = RuleSystemRegistry.getInstance()
 *
 * // 注册适配器
 * registry.registerAdapter(new CoC7Adapter())
 *
 * // 获取适配器
 * const adapter = registry.getAdapter('coc7')
 *
 * // 检查规则系统是否支持
 * if (registry.hasSystem('coc7')) {
 *   // ...
 * }
 * ```
 */
export class RuleSystemRegistry {
  private static instance: RuleSystemRegistry
  private adapters: Map<string, RuleSystemAdapter> = new Map()

  private constructor() {
    // 注册内置适配器
    this.registerBuiltinAdapters()
  }

  /**
   * 获取注册表单例实例
   */
  static getInstance(): RuleSystemRegistry {
    if (!RuleSystemRegistry.instance) {
      RuleSystemRegistry.instance = new RuleSystemRegistry()
    }
    return RuleSystemRegistry.instance
  }

  /**
   * 注册内置适配器
   *
   * @private
   */
  private registerBuiltinAdapters(): void {
    // 注册 GenericAdapter
    this.registerAdapter(new GenericAdapter())

    // CoC7和D&D 5e将在后续阶段实现
  }

  /**
   * 注册规则系统适配器
   *
   * @param adapter - 规则系统适配器实例
   * @throws {Error} 如果适配器无效或已存在
   */
  registerAdapter(adapter: RuleSystemAdapter): void {
    if (!adapter || !adapter.ruleSystem) {
      throw new Error('Invalid adapter: missing ruleSystem property')
    }

    if (this.adapters.has(adapter.ruleSystem)) {
      throw new Error(`Adapter for rule system "${adapter.ruleSystem}" already registered`)
    }

    this.adapters.set(adapter.ruleSystem, adapter)
    console.log(`[RuleSystemRegistry] Registered adapter: ${adapter.displayName} (${adapter.ruleSystem})`)
  }

  /**
   * 获取规则系统适配器
   *
   * @param ruleSystem - 规则系统标识符
   * @returns 规则系统适配器，如果不存在则返回undefined
   */
  getAdapter(ruleSystem: string): RuleSystemAdapter | undefined {
    return this.adapters.get(ruleSystem)
  }

  /**
   * 检查规则系统是否已注册
   *
   * @param ruleSystem - 规则系统标识符
   * @returns 是否已注册
   */
  hasSystem(ruleSystem: string): boolean {
    return this.adapters.has(ruleSystem)
  }

  /**
   * 获取所有已注册的规则系统
   *
   * @returns 规则系统标识符数组
   */
  getRegisteredSystems(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * 获取所有已注册的适配器
   *
   * @returns 规则系统适配器数组
   */
  getAllAdapters(): RuleSystemAdapter[] {
    return Array.from(this.adapters.values())
  }

  /**
   * 获取规则系统显示名称
   *
   * @param ruleSystem - 规则系统标识符
   * @returns 显示名称，如果不存在则返回标识符本身
   */
  getDisplayName(ruleSystem: string): string {
    const adapter = this.getAdapter(ruleSystem)
    return adapter?.displayName || ruleSystem
  }
}

/**
 * 获取规则系统注册表单例实例
 *
 * @returns 注册表实例
 */
export function getRuleSystemRegistry(): RuleSystemRegistry {
  return RuleSystemRegistry.getInstance()
}
