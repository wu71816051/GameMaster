/**
 * 规则系统注册表
 *
 * @description
 * 管理所有支持的 TRPG 规则系统。
 * 提供规则系统的注册、查询和验证功能。
 *
 * @module core/services/rule-system-registry
 */

/**
 * 预定义的规则系统
 */
export const PREDEFINED_RULE_SYSTEMS = {
  GENERIC: 'generic',  // 通用系统
  COC7: 'coc7',        // 克苏鲁的呼唤 7版
} as const

/**
 * 规则系统元数据接口
 */
export interface RuleSystemMetadata {
  /** 规则系统标识 */
  identifier: string
  /** 显示名称 */
  displayName: string
  /** 描述 */
  description?: string
}

/**
 * 规则系统注册表类
 *
 * @description
 * 单例模式，全局管理规则系统。
 * 支持动态注册新的规则系统。
 */
export class RuleSystemRegistry {
  private static instance: RuleSystemRegistry
  private systems: Map<string, RuleSystemMetadata>

  private constructor() {
    this.systems = new Map()

    // 注册预定义的规则系统
    this.registerSystem({
      identifier: PREDEFINED_RULE_SYSTEMS.GENERIC,
      displayName: '通用系统',
      description: '不绑定特定规则的通用 TRPG 系统',
    })

    this.registerSystem({
      identifier: PREDEFINED_RULE_SYSTEMS.COC7,
      displayName: '克苏鲁的呼唤 7版',
      description: 'Call of Cthulhu 7th Edition',
    })
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
   * 注册新的规则系统
   *
   * @param metadata - 规则系统元数据
   * @returns 是否注册成功（已存在则返回 false）
   */
  registerSystem(metadata: RuleSystemMetadata): boolean {
    if (this.systems.has(metadata.identifier)) {
      return false
    }

    this.systems.set(metadata.identifier, metadata)
    return true
  }

  /**
   * 检查规则系统是否存在
   *
   * @param identifier - 规则系统标识
   * @returns 是否存在
   */
  hasSystem(identifier: string): boolean {
    return this.systems.has(identifier)
  }

  /**
   * 获取规则系统元数据
   *
   * @param identifier - 规则系统标识
   * @returns 规则系统元数据，不存在则返回 undefined
   */
  getSystem(identifier: string): RuleSystemMetadata | undefined {
    return this.systems.get(identifier)
  }

  /**
   * 获取所有已注册的规则系统
   *
   * @returns 规则系统列表
   */
  getRegisteredSystems(): RuleSystemMetadata[] {
    return Array.from(this.systems.values())
  }

  /**
   * 获取所有规则系统的标识符
   *
   * @returns 规则系统标识符列表
   */
  getSystemIdentifiers(): string[] {
    return Array.from(this.systems.keys())
  }

  /**
   * 格式化规则系统列表为友好的错误消息
   *
   * @returns 格式化的规则系统列表字符串
   */
  formatSupportedSystems(): string {
    const systems = this.getRegisteredSystems()
    return systems
      .map(s => `${s.displayName} (${s.identifier})`)
      .join(', ')
  }
}
