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
  // 命令: 规则命令帮助
  // ========================================
  ctx.command('规则命令')
    .alias('rule.help')
    .alias('gm.rule')
    .action(async ({ session }) => {
      try {
        const { ConversationService } = await import('../services/conversation.service')
        const { getRuleSystemRegistry } = await import('../../rule/rule-system-registry')

        const conversationService = new ConversationService(ctx)

        // 获取当前会话的规则系统
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话\n' +
                 '💡 请先使用 "会话创建" 或 "会话加入" 命令'
        }

        // 获取规则适配器
        const registry = getRuleSystemRegistry()
        const adapter = registry.getAdapter(conversation.rule_system)

        if (!adapter) {
          return `❌ 未找到规则适配器: ${conversation.rule_system}`
        }

        // 返回规则专属命令帮助
        return adapter.getCommandHelp()
      } catch (error) {
        logger.error('[Command:规则命令] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：规则命令')

  // ========================================
  // 命令: 会话帮助
  // ========================================
  ctx.command('会话帮助')
    .alias('gm.help')
    .action(() => {
      return `🎭 TRPG 会话管理系统 - 命令列表\n\n` +
             `📝 创建会话：\n` +
             `  会话创建 <名称> [规则]\n` +
             `  示例：会话创建 "我的第一个TRPG团"\n` +
             `  示例：会话创建 "克苏鲁团" coc7\n\n` +
             `➕ 加入会话：\n` +
             `  会话加入 <会话ID>\n` +
             `  示例：会话加入 1\n\n` +
             `📋 查看会话：\n` +
             `  会话列表\n` +
             `  示例：会话列表\n\n` +
             `🎮 规则命令：\n` +
             `  规则命令\n` +
             `  示例：规则命令\n\n` +
             `💡 提示：创建会话后，会话成员的所有消息将被自动记录到数据库中`
    })

  logger.info('[Commands] 命令注册成功：会话帮助')
}
