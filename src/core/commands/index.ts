/**
 * 用户命令模块
 *
 * @description
 * 提供 TRPG 会话管理和骰子系统的用户交互命令接口。
 *
 * 核心职责：
 * - 注册 Koishi 命令
 * - 协调会话管理命令和骰子命令的注册
 *
 * @module core/commands
 */

import { Context } from 'koishi'
import { registerConversationCommands } from './conversation.commands'
import { registerDiceCommands } from '../../commands/dice.commands'

/**
 * 注册所有用户命令
 *
 * @description
 * 在插件初始化时调用此函数来注册所有命令。
 *
 * @param {Context} ctx - Koishi 上下文对象
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { registerCommands } from './core/commands'
 *
 * export function apply(ctx: Context) {
 *   registerCommands(ctx)
 * }
 * ```
 */
export function registerCommands(ctx: Context) {
  // 注册会话管理命令
  registerConversationCommands(ctx)

  // 注册骰子命令
  registerDiceCommands(ctx)
}

/**
 * 导出命令注册函数（默认导出）
 */
export default registerCommands
