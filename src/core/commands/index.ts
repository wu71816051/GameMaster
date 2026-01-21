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
import {
  createConversationService,
} from '../services/conversation.service'
import {
  createMemberService,
} from '../services/member.service'
import { createUserService } from '../services/user.service'

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

  // 创建服务实例
  const conversationService = createConversationService(ctx)
  const memberService = createMemberService(ctx)
  const userService = createUserService(ctx)

  logger.info('[Commands] 开始注册用户命令')

  // ========================================
  // 命令 1: 会话创建
  // ========================================
  ctx.command('会话创建 <名称:text>')
    .alias('gm.create')
    .action(async ({ session }, name) => {
      try {
        logger.info('[Command:会话创建] 执行命令', { name, userId: session.userId })

        // 参数验证
        if (!name || name.trim().length === 0) {
          return '❌ 请提供会话名称\n示例：会话创建 "我的第一个TRPG团"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 调用服务层创建会话
        const result = await conversationService.createConversation({
          name: name.trim(),
          creatorId: userId,
          channel: channelInfo,
        })

        if (result.success) {
          logger.info('[Command:会话创建] 创建成功', {
            conversationId: result.conversationId,
            name,
            creatorId: userId,
          })

          return `✅ 会话创建成功！\n` +
                 `📝 会话名称：${name}\n` +
                 `🆔 会话ID：${result.conversationId}\n` +
                 `👤 创建者：${userId}\n` +
                 `💡 提示：其他用户可以使用 "会话加入 ${result.conversationId}" 加入此会话`
        } else {
          logger.warn('[Command:会话创建] 创建失败', { error: result.error })
          return `❌ 创建会话失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:会话创建] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话创建')

  // ========================================
  // 命令 2: 会话加入
  // ========================================
  ctx.command('会话加入 <会话ID:posint>')
    .alias('gm.join')
    .action(async ({ session }, conversationId) => {
      try {
        logger.info('[Command:会话加入] 执行命令', {
          conversationId,
          userId: session.userId,
        })

        // 参数验证
        if (!conversationId) {
          return '❌ 请提供会话ID\n示例：会话加入 1'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 调用服务层加入会话
        const result = await memberService.joinConversation(conversationId, userId)

        if (result.success) {
          logger.info('[Command:会话加入] 加入成功', {
            conversationId,
            userId,
          })

          return `✅ ${result.message}`
        } else {
          logger.warn('[Command:会话加入] 加入失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:会话加入] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话加入')

  // ========================================
  // 命令 3: 会话列表
  // ========================================
  ctx.command('会话列表')
    .alias('gm.list')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:会话列表] 执行命令', {
          userId: session.userId,
        })

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // Debug: 输出频道信息
        logger.info('[Command:会话列表] 频道信息', {
          platform: channelInfo.platform,
          guildId: channelInfo.guildId,
          channelId: channelInfo.channelId,
        })

        // 获取当前频道的所有会话
        const conversations = await conversationService.getChannelConversations({
          channel: channelInfo,
        })

        // Debug: 输出查询结果
        logger.info('[Command:会话列表] 查询结果', {
          会话数量: conversations.length,
          会话列表: conversations.map(c => ({
            id: c.id,
            name: c.name,
            channels: c.channels,
          })),
        })

        if (conversations.length === 0) {
          return '📋 该频道还没有任何会话\n\n💡 使用 "会话创建 <名称>" 来创建第一个会话'
        }

        // 构建会话列表
        const lines: string[] = []
        lines.push(`📋 该频道共有 ${conversations.length} 个会话\n`)

        conversations.forEach((conv, index) => {
          const isActive = conv.status === 0 // ConversationStatus.ACTIVE
          const statusIcon = isActive ? '🟢' : '⚫'
          const statusText = isActive ? '活跃' : '已暂停/结束'

          lines.push(`${statusIcon} **会话 ${index + 1}**`)
          lines.push(`   🆔 ID: ${conv.id}`)
          lines.push(`   📝 名称: ${conv.name}`)
          lines.push(`   👤 创建者: ${conv.creator_id}`)
          lines.push(`   📊 状态: ${statusText}`)

          if (conv.created_at) {
            const createdDate = new Date(conv.created_at)
            lines.push(`   📅 创建时间: ${createdDate.toLocaleString('zh-CN')}`)
          }

          if (conv.updated_at) {
            const updatedDate = new Date(conv.updated_at)
            lines.push(`   🕒 更新时间: ${updatedDate.toLocaleString('zh-CN')}`)
          }

          lines.push('') // 空行分隔
        })

        lines.push('💡 提示:')
        lines.push('- 🟢 = 活跃会话（正在记录消息）')
        lines.push('- ⚫ = 非活跃会话（已暂停或结束）')
        lines.push('- 使用 "会话加入 <ID>" 加入会话')

        return lines.join('\n')
      } catch (error) {
        logger.error('[Command:会话列表] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话列表')

  // ========================================
  // 命令 4: 会话帮助
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

  // ========================================
  // 命令 5: 会话提升权限
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
  // 命令 6: 会话降低权限
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
  logger.info('[Commands] 所有用户命令注册完成')
}

/**
 * 导出命令注册函数（默认导出）
 */
export default registerCommands
