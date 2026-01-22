/**
 * 用户命令模块
 *
 * @description
 * 提供 TRPG 会话管理的用户交互命令接口。
 *
 * 核心职责：
 * - 注册 Koishi 命令
 * - 解析命令参数
 * - 调用对应的服务层方法
 * - 返回执行结果
 *
 * @module core/commands
 */

import { Context } from 'koishi'
import { registerConversationCommands } from './conversation.commands'
import { registerPermissionCommands } from './permission.commands'
import { registerDiceCommands } from './dice.commands'
import { registerHelpCommands } from './help.commands'

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
  const logger = ctx.logger

  logger.info('[Commands] 开始注册用户命令')

  // 注册会话管理命令
  registerConversationCommands(ctx)

  // 注册权限管理命令
  registerPermissionCommands(ctx)

  // 注册骰子相关命令
  registerDiceCommands(ctx)

  // 注册帮助命令
  registerHelpCommands(ctx)

  logger.info('[Commands] 所有用户命令注册完成')
}

/**
 * 导出命令注册函数（默认导出）
 */
export default registerCommands
