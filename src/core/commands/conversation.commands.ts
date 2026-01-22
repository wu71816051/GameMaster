/**
 * 会话管理命令模块
 *
 * @description
 * 提供会话创建、加入、列表等管理命令。
 *
 * @module core/commands/conversation
 */

import { Context } from 'koishi'
import {
  createConversationService,
} from '../services/conversation.service'
import {
  createMemberService,
} from '../services/member.service'
import { createUserService } from '../services/user.service'
import {
  createConversationExportService,
} from '../services/conversation-export.service'
import {
  createPermissionService,
} from '../services/permission.service'
import {
  sendExportContent,
  ExportFormat,
} from '../utils/file-helper'
import { MemberRole } from '../models/conversation-member'

/**
 * 注册会话管理命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerConversationCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const conversationService = createConversationService(ctx)
  const memberService = createMemberService(ctx)
  const userService = createUserService(ctx)
  const exportService = createConversationExportService(ctx)
  const permissionService = createPermissionService(ctx)

  logger.info('[Commands] 开始注册会话管理命令')

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
  // 会话创建帮助命令（无参数时触发）
  // ========================================
  ctx.command('会话创建')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：会话创建 <会话名称>\n' +
             '💡 示例：会话创建 "我的第一个TRPG团"\n' +
             '💡 提示：如果名称包含空格，请使用引号包裹'
    })

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
  // 会话加入帮助命令（无参数时触发）
  // ========================================
  ctx.command('会话加入')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：会话加入 <会话ID>\n' +
             '💡 示例：会话加入 1\n' +
             '💡 提示：使用 "会话列表" 查看可加入的会话'
    })

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
  // 命令 4: 会话导出
  // ========================================

  ctx
    .command('会话导出 [会话ID:posint]')
    .option('markdown', '-m  导出为 Markdown 格式')
    .option('json', '-j  导出为 JSON 格式')
    .alias('gm.export')
    .action(async ({ session, options }, conversationId) => {
      try {
        logger.info('[Command:会话导出] 执行命令', {
          conversationId,
          options,
          userId: session.userId,
        })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 确定要导出的会话 ID
        let targetConversationId = conversationId

        if (!targetConversationId) {
          // 如果没有指定会话 ID，尝试获取当前频道的活跃会话
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          const activeConversation =
            await conversationService.getActiveConversation({
              channel: channelInfo,
            })

          if (!activeConversation) {
            return '❌ 当前频道没有活跃会话\n\n💡 请指定会话 ID：会话导出 <会话ID>'
          }

          targetConversationId = activeConversation.id
        }

        // 确定导出格式
        let format: 'text' | 'markdown' | 'json' = 'text'
        if (options.markdown) {
          format = 'markdown'
        } else if (options.json) {
          format = 'json'
        }

        logger.info('[Command:会话导出] 导出参数', {
          conversationId: targetConversationId,
          format,
        })

        // 获取会话信息（用于文件名）
        const conversation = await conversationService.getConversationById(
          targetConversationId
        )

        if (!conversation) {
          return '❌ 会话不存在'
        }

        // 调用导出服务
        const result = await exportService.exportConversation(
          targetConversationId,
          userId,
          { format }
        )

        if (result.success) {
          logger.info('[Command:会话导出] 导出成功', {
            conversationId: targetConversationId,
            format,
            contentLength: result.content?.length,
          })

          // 发送导出内容（使用会话名称作为文件名）
          const exportedFormat = await sendExportContent(
            session,
            conversation.name,
            targetConversationId,
            result.content!,
            format as ExportFormat
          )

          return `✅ 导出成功！\n📝 格式：${exportedFormat}\n📏 字符数：${result.content?.length}`
        } else {
          logger.warn('[Command:会话导出] 导出失败', {
            error: result.error,
          })

          return `❌ 导出失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:会话导出] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话导出')

  // ========================================
  // 命令 5: 会话暂停
  // ========================================
  ctx.command('会话暂停 [会话ID:posint]')
    .alias('gm.pause')
    .action(async ({ session }, conversationId) => {
      try {
        logger.info('[Command:会话暂停] 执行命令', {
          conversationId,
          userId: session.userId,
        })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 确定要暂停的会话 ID
        let targetConversationId = conversationId

        if (!targetConversationId) {
          // 如果没有指定会话 ID，尝试获取当前频道的活跃会话
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          const activeConversation =
            await conversationService.getActiveConversation({
              channel: channelInfo,
            })

          if (!activeConversation) {
            return '❌ 当前频道没有活跃会话\n\n💡 请指定会话 ID：会话暂停 <会话ID>'
          }

          targetConversationId = activeConversation.id
        }

        // 验证用户权限（需要 admin 或更高级别）
        const permissionResult = await permissionService.checkPermission({
          conversationId: targetConversationId,
          userId,
          requiredRole: MemberRole.ADMIN,
        })

        if (!permissionResult.hasPermission) {
          logger.warn('[Command:会话暂停] 权限不足', {
            conversationId: targetConversationId,
            userId,
          })
          return '❌ 权限不足\n\n💡 只有会话创建者和管理员可以暂停会话'
        }

        // 获取会话信息（用于系统通知）
        const conversation = await conversationService.getConversationById(
          targetConversationId
        )

        if (!conversation) {
          return '❌ 会话不存在'
        }

        // 调用服务层暂停会话
        const success = await conversationService.pauseConversation(
          targetConversationId
        )

        if (success) {
          logger.info('[Command:会话暂停] 暂停成功', {
            conversationId: targetConversationId,
            userId,
          })

          // 获取用户昵称（用于系统通知）
          const userName = session.username || session.userId || '未知用户'

          // 发送系统通知到群聊
          const systemMessage = `【系统通知】会话"${conversation.name}"已暂停（操作者：${userName}）`

          // 使用 session.send 发送系统消息，这样所有成员都能看到
          await session.send(systemMessage)

          // 返回成功提示给命令执行者
          return `✅ 会话已暂停\n\n` +
                 `🆔 会话ID：${targetConversationId}\n` +
                 `📝 会话名称：${conversation.name}\n` +
                 `💡 提示：暂停期间的消息不会被记录\n` +
                 `💡 使用 "会话恢复 ${targetConversationId}" 恢复会话`
        } else {
          logger.warn('[Command:会话暂停] 暂停失败', {
            conversationId: targetConversationId,
          })
          return '❌ 暂停会话失败'
        }
      } catch (error) {
        logger.error('[Command:会话暂停] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话暂停')

  // ========================================
  // 命令 6: 会话恢复
  // ========================================
  ctx.command('会话恢复 [会话ID:posint]')
    .alias('gm.resume')
    .action(async ({ session }, conversationId) => {
      try {
        logger.info('[Command:会话恢复] 执行命令', {
          conversationId,
          userId: session.userId,
        })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 确定要恢复的会话 ID
        let targetConversationId = conversationId

        if (!targetConversationId) {
          // 如果没有指定会话 ID，尝试获取当前频道的暂停会话
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          // 获取当前频道的所有会话
          const conversations =
            await conversationService.getChannelConversations({
              channel: channelInfo,
            })

          // 查找暂停状态的会话
          const pausedConversation = conversations.find(
            (conv) => conv.status === 1 // ConversationStatus.PAUSED
          )

          if (!pausedConversation) {
            return '❌ 当前频道没有暂停的会话\n\n💡 请指定会话 ID：会话恢复 <会话ID>'
          }

          targetConversationId = pausedConversation.id
        }

        // 获取会话信息
        const conversation = await conversationService.getConversationById(
          targetConversationId
        )

        if (!conversation) {
          return '❌ 会话不存在'
        }

        // 检查该频道是否已有其他活跃会话
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        const activeConversation =
          await conversationService.getActiveConversation({
            channel: channelInfo,
          })

        // 如果有活跃会话且不是要恢复的会话，拒绝操作
        if (activeConversation && activeConversation.id !== targetConversationId) {
          return `❌ 该频道已有活跃会话（ID: ${activeConversation.id}）\n\n` +
                 `💡 一个频道只能有一个活跃会话\n` +
                 `💡 请先暂停或结束当前活跃会话，再恢复此会话`
        }

        // 验证用户权限（需要 admin 或更高级别）
        const permissionResult = await permissionService.checkPermission({
          conversationId: targetConversationId,
          userId,
          requiredRole: MemberRole.ADMIN,
        })

        if (!permissionResult.hasPermission) {
          logger.warn('[Command:会话恢复] 权限不足', {
            conversationId: targetConversationId,
            userId,
          })
          return '❌ 权限不足\n\n💡 只有会话创建者和管理员可以恢复会话'
        }

        // 调用服务层恢复会话
        const success = await conversationService.resumeConversation(
          targetConversationId
        )

        if (success) {
          logger.info('[Command:会话恢复] 恢复成功', {
            conversationId: targetConversationId,
            userId,
          })

          // 获取用户昵称（用于系统通知）
          const userName = session.username || session.userId || '未知用户'

          // 发送系统通知到群聊
          const systemMessage = `【系统通知】会话"${conversation.name}"已恢复（操作者：${userName}）`

          // 使用 session.send 发送系统消息，这样所有成员都能看到
          await session.send(systemMessage)

          // 返回成功提示给命令执行者
          return `✅ 会话已恢复\n\n` +
                 `🆔 会话ID：${targetConversationId}\n` +
                 `📝 会话名称：${conversation.name}\n` +
                 `💡 提示：现在开始记录消息`
        } else {
          logger.warn('[Command:会话恢复] 恢复失败', {
            conversationId: targetConversationId,
          })
          return '❌ 恢复会话失败'
        }
      } catch (error) {
        logger.error('[Command:会话恢复] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话恢复')
}
