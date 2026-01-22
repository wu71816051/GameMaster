/**
 * 权限管理命令模块
 *
 * @description
 * 提供会话成员权限管理命令（提升权限、降低权限）。
 *
 * @module core/commands/permission
 */

import { Context } from 'koishi'
import {
  createConversationService,
} from '../services/conversation.service'
import {
  createMemberService,
} from '../services/member.service'
import { createUserService } from '../services/user.service'

/**
 * 注册权限管理命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerPermissionCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const conversationService = createConversationService(ctx)
  const memberService = createMemberService(ctx)
  const userService = createUserService(ctx)

  logger.info('[Commands] 开始注册权限管理命令')

  // ========================================
  // 命令 1: 会话提升权限
  // ========================================
  ctx.command('会话提升权限 <用户ID:text> [会话ID:posint]')
    .alias('gm.promote')
    .action(async ({ session }, targetUserId, conversationId) => {
      try {
        logger.info('[Command:会话提升权限] 执行命令', {
          targetUserId,
          conversationId,
          operatorId: session.userId,
        })

        // 参数验证
        if (!targetUserId) {
          return '❌ 请提供要提升权限的用户ID\n示例：会话提升权限 3750403297 1'
        }

        // 获取操作者信息
        const operatorId = await userService.getUserIdFromSession(session)

        // 如果未指定会话ID，尝试使用当前频道的活跃会话
        if (!conversationId) {
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          const allConversations = await conversationService.getChannelConversations({
            channel: channelInfo,
          })

          // 过滤出活跃会话
          const activeConversations = allConversations.filter(conv => conv.status === 0)

          if (activeConversations.length === 0) {
            return '❌ 当前频道没有活跃会话\n\n' +
                   '💡 请指定会话ID：会话提升权限 <用户ID> <会话ID>\n' +
                   '示例：会话提升权限 3750403297 1'
          }

          if (activeConversations.length > 1) {
            return '❌ 当前频道有多个活跃会话\n\n' +
                   '💡 请指定会话ID：会话提升权限 <用户ID> <会话ID>\n' +
                   '示例：会话提升权限 3750403297 1'
          }

          conversationId = activeConversations[0].id
          logger.info('[Command:会话提升权限] 使用当前频道的活跃会话', { conversationId })
        }

        // 解析目标用户ID（用户在平台中的ID）
        const platform = session.platform
        const pid = targetUserId

        // 在 binding 表中查询获取 Koishi 内部 userId
        const bindings = await ctx.database.get('binding', {
          platform,
          pid,
        })

        if (bindings.length === 0) {
          return `❌ 在平台 ${platform} 中找不到用户 ${pid}\n\n💡 请确认用户ID是否正确`
        }

        const parsedTargetUserId = bindings[0].aid

        if (isNaN(parsedTargetUserId)) {
          return `❌ 无效的用户ID：${targetUserId}`
        }

        // 调用服务层修改角色为 admin
        const result = await memberService.updateMemberRole(
          conversationId,
          operatorId,
          parsedTargetUserId,
          'admin'
        )

        if (result.success) {
          logger.info('[Command:会话提升权限] 提升成功', {
            conversationId,
            operatorId,
            targetUserId: parsedTargetUserId,
          })

          return `✅ ${result.message}\n` +
                 `🆔 会话ID：${conversationId}\n` +
                 `👤 用户ID：${targetUserId}`
        } else {
          logger.warn('[Command:会话提升权限] 提升失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:会话提升权限] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话提升权限')

  // ========================================
  // 会话提升权限帮助命令（无参数时触发）
  // ========================================
  ctx.command('会话提升权限')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：会话提升权限 <用户ID>\n' +
             '💡 示例：会话提升权限 123456789\n' +
             '💡 提示：需要会话管理员权限'
    })

  // ========================================
  // 命令 2: 会话降低权限
  // ========================================
  ctx.command('会话降低权限 <用户ID:text> [会话ID:posint]')
    .alias('gm.demote')
    .action(async ({ session }, targetUserId, conversationId) => {
      try {
        logger.info('[Command:会话降低权限] 执行命令', {
          targetUserId,
          conversationId,
          operatorId: session.userId,
        })

        // 参数验证
        if (!targetUserId) {
          return '❌ 请提供要降低权限的用户ID\n示例：会话降低权限 3750403297 1'
        }

        // 获取操作者信息
        const operatorId = await userService.getUserIdFromSession(session)

        // 如果未指定会话ID，尝试使用当前频道的活跃会话
        if (!conversationId) {
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          const allConversations = await conversationService.getChannelConversations({
            channel: channelInfo,
          })

          // 过滤出活跃会话
          const activeConversations = allConversations.filter(conv => conv.status === 0)

          if (activeConversations.length === 0) {
            return '❌ 当前频道没有活跃会话\n\n' +
                   '💡 请指定会话ID：会话降低权限 <用户ID> <会话ID>\n' +
                   '示例：会话降低权限 3750403297 1'
          }

          if (activeConversations.length > 1) {
            return '❌ 当前频道有多个活跃会话\n\n' +
                   '💡 请指定会话ID：会话降低权限 <用户ID> <会话ID>\n' +
                   '示例：会话降低权限 3750403297 1'
          }

          conversationId = activeConversations[0].id
          logger.info('[Command:会话降低权限] 使用当前频道的活跃会话', { conversationId })
        }

        // 解析目标用户ID（用户在平台中的ID）
        const platform = session.platform
        const pid = targetUserId

        // 在 binding 表中查询获取 Koishi 内部 userId
        const bindings = await ctx.database.get('binding', {
          platform,
          pid,
        })

        if (bindings.length === 0) {
          return `❌ 在平台 ${platform} 中找不到用户 ${pid}\n\n💡 请确认用户ID是否正确`
        }

        const parsedTargetUserId = bindings[0].aid

        if (isNaN(parsedTargetUserId)) {
          return `❌ 无效的用户ID：${targetUserId}`
        }

        // 调用服务层修改角色为 member
        const result = await memberService.updateMemberRole(
          conversationId,
          operatorId,
          parsedTargetUserId,
          'member'
        )

        if (result.success) {
          logger.info('[Command:会话降低权限] 降低成功', {
            conversationId,
            operatorId,
            targetUserId: parsedTargetUserId,
          })

          return `✅ ${result.message}\n` +
                 `🆔 会话ID：${conversationId}\n` +
                 `👤 用户ID：${targetUserId}`
        } else {
          logger.warn('[Command:会话降低权限] 降低失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:会话降低权限] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话降低权限')

  // ========================================
  // 会话降低权限帮助命令（无参数时触发）
  // ========================================
  ctx.command('会话降低权限')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：会话降低权限 <用户ID>\n' +
             '💡 示例：会话降低权限 123456789\n' +
             '💡 提示：需要会话管理员权限'
    })
}
