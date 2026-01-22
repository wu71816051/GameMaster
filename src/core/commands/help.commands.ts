/**
 * 帮助命令模块
 *
 * @description
 * 提供系统帮助信息。
 *
 * @module core/commands/help
 */

import { Context } from 'koishi'

/**
 * 注册帮助命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerHelpCommands(ctx: Context) {
  const logger = ctx.logger

  logger.info('[Commands] 开始注册帮助命令')

  // ========================================
  // 命令: 会话帮助
  // ========================================
  ctx.command('会话帮助')
    .alias('gm.help')
    .action(() => {
      return `🎭 TRPG 会话管理系统 - 命令列表\n\n` +
             `📝 创建会话：\n` +
             `  会话创建 <名称>\n` +
             `  示例：会话创建 "我的第一个TRPG团"\n\n` +
             `➕ 加入会话：\n` +
             `  会话加入 <会话ID>\n` +
             `  示例：会话加入 1\n\n` +
             `📋 查看会话：\n` +
             `  会话列表\n` +
             `  示例：会话列表\n\n` +
             `💡 提示：创建会话后，会话成员的所有消息将被自动记录到数据库中`
    })

  logger.info('[Commands] 命令注册成功：会话帮助')
}
