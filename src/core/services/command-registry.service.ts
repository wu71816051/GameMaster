/**
 * 命令注册服务
 *
 * @description
 * 负责管理不同规则系统的专属命令注册和注销。
 *
 * 核心职责：
 * - 为会话注册规则系统的专属命令
 * - 追踪会话的命令注册状态
 * - 处理规则切换时的命令更新
 *
 * @module core/services/command-registry.service
 */

import { Context } from 'koishi'
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'

/**
 * 命令注册服务类
 *
 * @description
 * 管理会话与规则系统命令的映射关系。
 */
export class CommandRegistryService {
  private ctx: Context
  private registeredConversations: Map<number, string> = new Map()

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 为会话注册规则系统的专属命令
   *
   * @description
   * 当创建或加入会话时，自动注册该会话规则系统的专属命令。
   *
   * @param conversationId - 会话ID
   * @param ruleSystem - 规则系统标识
   */
  async registerConversationCommands(
    conversationId: number,
    ruleSystem: string
  ): Promise<void> {
    this.ctx.logger.info(`[CommandRegistry] 注册会话 ${conversationId} 的 ${ruleSystem} 命令`)

    // 如果会话已注册其他规则命令,先注销
    if (this.registeredConversations.has(conversationId)) {
      await this.unregisterConversationCommands(conversationId)
    }

    // 获取规则适配器
    const registry = getRuleSystemRegistry()
    const adapter = registry.getAdapter(ruleSystem)

    if (!adapter) {
      this.ctx.logger.warn(`[CommandRegistry] 未找到规则适配器: ${ruleSystem}`)
      return
    }

    // 注册规则命令
    try {
      await adapter.registerCommands(this.ctx, conversationId)

      // 记录注册状态
      this.registeredConversations.set(conversationId, ruleSystem)

      this.ctx.logger.info(`[CommandRegistry] ✅ 已为会话 ${conversationId} 注册 ${ruleSystem} 命令`)
    } catch (error) {
      this.ctx.logger.error(`[CommandRegistry] 注册命令失败`, error)
    }
  }

  /**
   * 注销会话的规则命令
   *
   * @description
   * Koishi 不支持动态注销命令，所以这里只是标记为已注销。
   * 实际的命令禁用通过软注销机制（运行时验证）实现。
   *
   * @param conversationId - 会话ID
   */
  async unregisterConversationCommands(conversationId: number): Promise<void> {
    const ruleSystem = this.registeredConversations.get(conversationId)

    if (ruleSystem) {
      // Koishi 不支持动态注销命令
      // 这里只能标记为已注销,下次检查时跳过
      this.registeredConversations.delete(conversationId)
      this.ctx.logger.info(`[CommandRegistry] 已注销会话 ${conversationId} 的命令`)
    }
  }

  /**
   * 获取会话当前注册的规则系统
   *
   * @param conversationId - 会话ID
   * @returns 规则系统标识
   */
  getConversationRule(conversationId: number): string | undefined {
    return this.registeredConversations.get(conversationId)
  }

  /**
   * 检查会话是否已注册命令
   *
   * @param conversationId - 会话ID
   * @param ruleSystem - 规则系统标识
   * @returns 是否已注册
   */
  isConversationRegistered(conversationId: number, ruleSystem: string): boolean {
    const registered = this.registeredConversations.get(conversationId)
    return registered === ruleSystem
  }

  /**
   * 获取所有已注册的会话
   *
   * @returns 会话ID数组
   */
  getRegisteredConversations(): number[] {
    return Array.from(this.registeredConversations.keys())
  }
}

/**
 * 创建命令注册服务实例的工厂函数
 *
 * @param ctx - Koishi 上下文对象
 * @returns 命令注册服务实例
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { createCommandRegistryService } from './core/services/command-registry.service'
 *
 * export function apply(ctx: Context) {
 *   const commandRegistry = createCommandRegistryService(ctx)
 *   // 使用服务...
 * }
 * ```
 */
export function createCommandRegistryService(ctx: Context): CommandRegistryService {
  return new CommandRegistryService(ctx)
}
