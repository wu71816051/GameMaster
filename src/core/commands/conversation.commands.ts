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
  ctx.command('会话创建 <名称:text> [规则系统:text]')
    .alias('gm.create')
    .action(async ({ session }, name, ruleSystem) => {
      try {
        logger.info('[Command:会话创建] 执行命令', { name, ruleSystem, userId: session.userId })

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

        // 调用服务层创建会话（传递规则系统参数）
        const result = await conversationService.createConversation({
          name: name.trim(),
          creatorId: userId,
          channel: channelInfo,
          ruleSystem,  // 传递规则系统参数（可选）
        })

        if (result.success) {
          logger.info('[Command:会话创建] 创建成功', {
            conversationId: result.conversationId,
            name,
            ruleSystem,
            creatorId: userId,
          })

          const ruleText = ruleSystem || 'generic'
          return `✅ 会话创建成功！\n` +
                 `📝 会话名称：${name}\n` +
                 `🎮 规则系统：${ruleText}\n` +
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
             '📝 正确格式：会话创建 <会话名称> [规则系统]\n' +
             '💡 示例：会话创建 "我的第一个TRPG团"\n' +
             '💡 示例：会话创建 "克苏鲁团" coc7\n' +
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

          // 为该频道注册会话的规则命令
          try {
            const { createCommandRegistryService } = await import('../services/command-registry.service')
            const { ConversationService } = await import('../services/conversation.service')

            const commandRegistry = createCommandRegistryService(ctx)
            const conversationService = new ConversationService(ctx)
            const conversation = await conversationService.getConversationById(conversationId)

            if (conversation && conversation.rule_system) {
              await commandRegistry.registerConversationCommands(
                conversationId,
                conversation.rule_system
              )
            }
          } catch (error) {
            logger.warn('[Command:会话加入] 注册规则命令失败', error)
            // 不影响加入,只记录警告
          }

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
    .option('all', '-a  显示当前频道所有会话（默认只显示你参与的）')
    .action(async ({ session, options }) => {
      try {
        logger.info('[Command:会话列表] 执行命令', {
          userId: session.userId,
          options,
        })

        const userId = await userService.getUserIdFromSession(session)

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
        const allConversations = await conversationService.getChannelConversations({
          channel: channelInfo,
        })

        if (allConversations.length === 0) {
          return '📋 该频道还没有任何会话\n\n💡 使用 "会话创建 <名称>" 来创建第一个会话'
        }

        // 根据 -a 参数决定显示范围
        let conversationsToDisplay: typeof allConversations

        if (options.all) {
          // -a 参数：显示所有会话
          conversationsToDisplay = allConversations
        } else {
          // 默认：只显示用户参与的会话
          const myConversations = await memberService.getMyConversations(userId)
          const myConversationIds = new Set(myConversations.map(c => c.conversation.id))
          conversationsToDisplay = allConversations.filter(c => myConversationIds.has(c.id!))
        }

        // Debug: 输出查询结果
        logger.info('[Command:会话列表] 查询结果', {
          会话总数: allConversations.length,
          显示数量: conversationsToDisplay.length,
          显示全部: options.all,
        })

        if (conversationsToDisplay.length === 0) {
          return '📋 你在该频道还没有加入任何会话\n\n' +
                 '💡 提示：\n' +
                 '• 使用 "会话列表 -a" 查看该频道所有会话\n' +
                 '• 使用 "会话加入 <ID>" 加入会话'
        }

        // 构建会话列表
        const lines: string[] = []

        if (options.all) {
          lines.push(`📋 该频道共有 ${allConversations.length} 个会话（显示全部）\n`)
        } else {
          lines.push(`📋 你在该频道参与了 ${conversationsToDisplay.length} 个会话\n`)
        }

        conversationsToDisplay.forEach((conv, index) => {
          const isActive = conv.status === 0 // ConversationStatus.ACTIVE
          const statusIcon = isActive ? '🟢' : '⚫'
          const statusText = isActive ? '活跃' : '已暂停/结束'

          lines.push(`${statusIcon} **会话 ${index + 1}**`)
          lines.push(`   🆔 ID: ${conv.id}`)
          lines.push(`   📝 名称: ${conv.name}`)
          lines.push(`   👤 创建者: ${conv.creator_id}`)
          lines.push(`   📊 状态: ${statusText}`)

          if (conv.rule_system) {
            lines.push(`   🎮 规则: ${conv.rule_system}`)
          }

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
        if (!options.all) {
          lines.push('- 使用 "会话列表 -a" 查看该频道所有会话')
        }

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

  // ========================================
  // 命令: 会话退出
  // ========================================
  ctx.command('会话退出 [会话ID:posint]')
    .alias('gm.leave')
    .action(async ({ session }, conversationId) => {
      try {
        logger.info('[Command:会话退出] 执行命令', {
          conversationId,
          userId: session.userId,
        })

        const userId = await userService.getUserIdFromSession(session)

        // 如果未提供会话ID，尝试获取当前频道的活跃会话
        if (!conversationId) {
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '0',
            channelId: session.channelId || '0',
          }

          const activeConversation = await conversationService.getActiveConversation({
            channel: channelInfo,
          })

          if (!activeConversation) {
            return '❌ 当前频道没有活跃的会话\n' +
                   '💡 提示：使用 "会话列表" 查看可用的会话\n' +
                   '💡 或使用 "会话退出 <会话ID>" 退出指定会话'
          }

          conversationId = activeConversation.id
        }

        // 调用服务层退出会话
        const success = await memberService.leaveConversation(conversationId, userId)

        if (success) {
          logger.info('[Command:会话退出] 退出成功', {
            conversationId,
            userId,
          })

          return `✅ 已成功退出会话 ${conversationId}\n` +
                 `💡 提示：你可以使用 "会话加入 ${conversationId}" 重新加入`
        } else {
          logger.warn('[Command:会话退出] 退出失败', {
            conversationId,
            userId,
          })

          return `❌ 退出会话失败\n\n` +
                 `💡 可能的原因：\n` +
                 `• 你不是该会话的成员\n` +
                 `• 你已经退出了该会话\n` +
                 `• 创建者不能退出会话`
        }
      } catch (error) {
        logger.error('[Command:会话退出] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：会话退出')

  // ========================================
  // 命令: 我的会话
  // ========================================
  ctx.command('我的会话')
    .alias('gm.my')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:我的会话] 执行命令', {
          userId: session.userId,
        })

        const userId = await userService.getUserIdFromSession(session)

        // 调用服务层查询用户的会话
        const conversations = await memberService.getMyConversations(userId)

        if (!conversations || conversations.length === 0) {
          return '📋 你还没有加入任何会话\n\n' +
                 '💡 提示：使用 "会话列表" 查看可用的会话\n' +
                 '💡 或使用 "会话加入 <会话ID>" 加入会话'
        }

        // 按状态分组
        const active = conversations.filter(c => c.isActive)
        const paused = conversations.filter(c => !c.isActive && c.conversation.status === 1)
        const ended = conversations.filter(c => c.conversation.status === 2)

        let message = `📋 你参与的会话（共 ${conversations.length} 个）\n\n`

        if (active.length > 0) {
          message += '✅ 进行中：\n'
          active.forEach(c => {
            const roleEmoji = c.role === 'creator' ? '👑' : c.role === 'admin' ? '⭐' : '👤'
            const ruleText = c.conversation.rule_system || 'generic'
            message += `  ${roleEmoji} [${c.conversation.id}] ${c.conversation.name} (${ruleText})\n`
          })
          message += '\n'
        }

        if (paused.length > 0) {
          message += '⏸️ 已暂停：\n'
          paused.forEach(c => {
            const roleEmoji = c.role === 'creator' ? '👑' : c.role === 'admin' ? '⭐' : '👤'
            const ruleText = c.conversation.rule_system || 'generic'
            message += `  ${roleEmoji} [${c.conversation.id}] ${c.conversation.name} (${ruleText})\n`
          })
          message += '\n'
        }

        if (ended.length > 0) {
          message += '❌ 已结束：\n'
          ended.forEach(c => {
            const roleEmoji = c.role === 'creator' ? '👑' : c.role === 'admin' ? '⭐' : '👤'
            const ruleText = c.conversation.rule_system || 'generic'
            message += `  ${roleEmoji} [${c.conversation.id}] ${c.conversation.name} (${ruleText})\n`
          })
        }

        message += '\n💡 提示：使用 "会话加入 <会话ID>" 切换到指定会话'

        return message
      } catch (error) {
        logger.error('[Command:我的会话] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：我的会话')
}
