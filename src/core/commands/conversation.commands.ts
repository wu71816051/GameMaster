/**
 * 会话管理命令模块
 *
 * @description
 * 提供 TRPG 会话管理的用户交互命令接口。
 *
 * @module core/commands/conversation
 */

import { Context } from 'koishi'
import { createConversationService } from '../services/conversation.service'
import { createMemberService } from '../services/member.service'
import { createUserService } from '../services/user.service'

/**
 * 注册会话管理命令
 *
 * @description
 * 在插件初始化时调用此函数来注册会话管理命令。
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerConversationCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const conversationService = createConversationService(ctx)
  const memberService = createMemberService(ctx)
  const userService = createUserService(ctx)

  logger.info('[Commands] 开始注册会话管理命令')

  // ========================================
  // 命令 1: 创建会话
  // ========================================
  ctx.command('gm.create <name:text>')
    .alias('conv.create')
    .action(async ({ session }, name) => {
      try {
        logger.info('[Command:gm.create] 执行命令', { name, userId: session.userId })

        // 参数验证
        if (!name || name.trim().length === 0) {
          return '❌ 请提供会话名称\n示例：gm.create "My First TRPG Group"'
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
          logger.info('[Command:gm.create] 创建成功', {
            conversationId: result.conversationId,
            name,
            creatorId: userId,
          })

          return `✅ Conv created successfully!\n` +
                 `📝 Name: ${name}\n` +
                 `🆔 ID: ${result.conversationId}\n` +
                 `👤 Creator: ${userId}\n` +
                 `💡 Tip: Others can join using "gm.join ${result.conversationId}"`
        } else {
          logger.warn('[Command:gm.create] 创建失败', { error: result.error })
          return `❌ Failed to create conv: ${result.error}`
        }
      } catch (error) {
        logger.error('[Command:gm.create] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.create')

  // ========================================
  // 命令 2: 加入会话
  // ========================================
  ctx.command('gm.join <convId:posint>')
    .alias('conv.join')
    .action(async ({ session }, convId) => {
      try {
        logger.info('[Command:gm.join] 执行命令', {
          convId,
          userId: session?.userId,
        })

        // 参数验证
        if (!convId) {
          return '❌ 请提供会话ID\n示例：gm.join 1'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 调用服务层加入会话
        const result = await memberService.joinConversation(convId, userId)

        if (result.success) {
          logger.info('[Command:gm.join] 加入成功', {
            convId,
            userId,
          })

          return `✅ ${result.message}`
        } else {
          logger.warn('[Command:gm.join] 加入失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:gm.join] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.join')

  // ========================================
  // 命令 3: 会话列表
  // ========================================
  ctx.command('gm.list')
    .alias('conv.list')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:gm.list] 执行命令', {
          userId: session?.userId,
        })

        // 获取频道信息
        const channelInfo = {
          platform: session?.platform || '',
          guildId: session?.guildId || '0',
          channelId: session?.channelId || '0',
        }

        // Debug: 输出频道信息
        logger.info('[Command:gm.list] 频道信息', {
          platform: channelInfo.platform,
          guildId: channelInfo.guildId,
          channelId: channelInfo.channelId,
        })

        // 获取当前频道的所有会话
        const conversations = await conversationService.getChannelConversations({
          channel: channelInfo,
        })

        // Debug: 输出查询结果
        logger.info('[Command:gm.list] 查询结果', {
          会话数量: conversations.length,
          会话列表: conversations.map(c => ({
            id: c.id,
            name: c.name,
            channels: c.channels,
          })),
        })

        if (conversations.length === 0) {
          return '📋 No convs in this channel\n\n💡 Use "gm.create <name>" to create first conv'
        }

        // 构建会话列表
        const lines: string[] = []
        lines.push(`📋 Total ${conversations.length} conv(s)\n`)

        conversations.forEach((conv, index) => {
          const isActive = conv.status === 0 // ConversationStatus.ACTIVE
          const statusIcon = isActive ? '🟢' : '⚫'
          const statusText = isActive ? 'Active' : 'Paused/Ended'

          lines.push(`${statusIcon} **Conv ${index + 1}**`)
          lines.push(`   🆔 ID: ${conv.id}`)
          lines.push(`   📝 Name: ${conv.name}`)
          lines.push(`   👤 Creator: ${conv.creator_id}`)
          lines.push(`   📊 Status: ${statusText}`)

          if (conv.created_at) {
            const createdDate = new Date(conv.created_at)
            lines.push(`   📅 Created: ${createdDate.toLocaleString('en-US')}`)
          }

          if (conv.updated_at) {
            const updatedDate = new Date(conv.updated_at)
            lines.push(`   🕒 Updated: ${updatedDate.toLocaleString('en-US')}`)
          }

          lines.push('') // 空行分隔
        })

        lines.push('💡 Tips:')
        lines.push('- 🟢 = Active conv (recording)')
        lines.push('- ⚫ = Inactive conv (paused/ended)')
        lines.push('- Use "gm.join <ID>" to join conv')

        return lines.join('\n')
      } catch (error) {
        logger.error('[Command:gm.list] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.list')

  // ========================================
  // 命令 4: 帮助
  // ========================================
  ctx.command('gm.help')
    .alias('conv.help')
    .action(() => {
      return `🎭 TRPG Conv Mgmt - Commands\n\n` +
             `📝 Create conv:\n` +
             `  gm.create <name>\n` +
             `  Example: gm.create "My First TRPG Group"\n\n` +
             `➕ Join conv:\n` +
             `  gm.join <convId>\n` +
             `  Example: gm.join 1\n\n` +
             `📋 List convs:\n` +
             `  gm.list\n` +
             `  Example: gm.list\n\n` +
             `💡 Tip: After creating conv, all msgs will be auto-logged to DB`
    })

  logger.info('[Commands] 命令注册成功：gm.help')

  // ========================================
  // 命令 5: 提升权限
  // ========================================
  ctx.command('gm.promote <userId:text> [convId:posint]')
    .alias('conv.promote')
    .action(async ({ session }, targetUserId, convId) => {
      try {
        logger.info('[Command:gm.promote] 执行命令', {
          targetUserId,
          convId,
          operatorId: session?.userId || 0,
        })

        // 参数验证
        if (!targetUserId) {
          return '❌ Please provide userId to promote\nExample: gm.promote 3750403297 1'
        }

        // 获取操作者信息
        const operatorId = await userService.getUserIdFromSession(session)

        // 如果未指定会话ID，尝试使用当前频道的活跃会话
        if (!convId) {
          const channelInfo = {
            platform: session?.platform || '',
            guildId: session?.guildId || '0',
            channelId: session?.channelId || '0',
          }

          const allConversations = await conversationService.getChannelConversations({
            channel: channelInfo,
          })

          // 过滤出活跃会话
          const activeConversations = allConversations.filter(conv => conv.status === 0)

          if (activeConversations.length === 0) {
            return '❌ No active conv in current channel\n\n' +
                   '💡 Please specify convId: gm.promote <userId> <convId>\n' +
                   'Example: gm.promote 3750403297 1'
          }

          if (activeConversations.length > 1) {
            return '❌ Multiple active convs in current channel\n\n' +
                   '💡 Please specify convId: gm.promote <userId> <convId>\n' +
                   'Example: gm.promote 3750403297 1'
          }

          convId = activeConversations[0].id!
          logger.info('[Command:gm.promote] 使用当前频道的活跃会话', { convId })
        }

        // 解析目标用户ID（用户在平台中的ID）
        const platform = session?.platform || ''
        const pid = targetUserId

        // 在 binding 表中查询获取 Koishi 内部 userId
        const bindings = await ctx.database.get('binding', {
          platform,
          pid,
        })

        if (bindings.length === 0) {
          return `❌ User ${pid} not found on platform ${platform}\n\n💡 Please verify userId`
        }

        const parsedTargetUserId = bindings[0].aid

        if (isNaN(parsedTargetUserId)) {
          return `❌ Invalid userId: ${targetUserId}`
        }

        // 调用服务层修改角色为 admin
        const result = await memberService.updateMemberRole(
          convId,
          operatorId,
          parsedTargetUserId,
          'admin'
        )

        if (result.success) {
          logger.info('[Command:gm.promote] 提升成功', {
            convId,
            operatorId,
            targetUserId: parsedTargetUserId,
          })

          return `✅ ${result.message}\n` +
                 `🆔 Conv ID: ${convId}\n` +
                 `👤 UserId: ${targetUserId}`
        } else {
          logger.warn('[Command:gm.promote] 提升失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:gm.promote] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.promote')

  // ========================================
  // 命令 6: 降低权限
  // ========================================
  ctx.command('gm.demote <userId:text> [convId:posint]')
    .alias('conv.demote')
    .action(async ({ session }, targetUserId, convId) => {
      try {
        logger.info('[Command:gm.demote] 执行命令', {
          targetUserId,
          convId,
          operatorId: session?.userId || 0,
        })

        // 参数验证
        if (!targetUserId) {
          return '❌ Please provide userId to demote\nExample: gm.demote 3750403297 1'
        }

        // 获取操作者信息
        const operatorId = await userService.getUserIdFromSession(session)

        // 如果未指定会话ID，尝试使用当前频道的活跃会话
        if (!convId) {
          const channelInfo = {
            platform: session?.platform || '',
            guildId: session?.guildId || '0',
            channelId: session?.channelId || '0',
          }

          const allConversations = await conversationService.getChannelConversations({
            channel: channelInfo,
          })

          // 过滤出活跃会话
          const activeConversations = allConversations.filter(conv => conv.status === 0)

          if (activeConversations.length === 0) {
            return '❌ No active conv in current channel\n\n' +
                   '💡 Please specify convId: gm.demote <userId> <convId>\n' +
                   'Example: gm.demote 3750403297 1'
          }

          if (activeConversations.length > 1) {
            return '❌ Multiple active convs in current channel\n\n' +
                   '💡 Please specify convId: gm.demote <userId> <convId>\n' +
                   'Example: gm.demote 3750403297 1'
          }

          convId = activeConversations[0].id!
          logger.info('[Command:gm.demote] 使用当前频道的活跃会话', { convId })
        }

        // 解析目标用户ID（用户在平台中的ID）
        const platform = session?.platform || ''
        const pid = targetUserId

        // 在 binding 表中查询获取 Koishi 内部 userId
        const bindings = await ctx.database.get('binding', {
          platform,
          pid,
        })

        if (bindings.length === 0) {
          return `❌ User ${pid} not found on platform ${platform}\n\n💡 Please verify userId`
        }

        const parsedTargetUserId = bindings[0].aid

        if (isNaN(parsedTargetUserId)) {
          return `❌ Invalid userId: ${targetUserId}`
        }

        // 调用服务层修改角色为 member
        const result = await memberService.updateMemberRole(
          convId,
          operatorId,
          parsedTargetUserId,
          'member'
        )

        if (result.success) {
          logger.info('[Command:gm.demote] 降低成功', {
            convId,
            operatorId,
            targetUserId: parsedTargetUserId,
          })

          return `✅ ${result.message}\n` +
                 `🆔 Conv ID: ${convId}\n` +
                 `👤 UserId: ${targetUserId}`
        } else {
          logger.warn('[Command:gm.demote] 降低失败', { message: result.message })
          return `❌ ${result.message}`
        }
      } catch (error) {
        logger.error('[Command:gm.demote] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.demote')

  // ========================================
  // 命令 7: 查看会话状态
  // ========================================
  ctx.command('gm.status')
    .alias('conv.status')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:gm.status] 执行命令', {
          userId: session?.userId,
        })

        // 获取频道信息
        const channelInfo = {
          platform: session?.platform || '',
          guildId: session?.guildId || '0',
          channelId: session?.channelId || '0',
        }

        // 查询当前频道的活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        // 如果没有活跃会话
        if (!conversation) {
          return '📋 当前频道没有活跃的会话\n\n' +
                 '💡 提示：\n' +
                 '• 使用 "gm.create <name>" 创建新会话\n' +
                 '• 使用 "gm.list" 查看所有会话'
        }

        logger.info('[Command:gm.status] 找到活跃会话', {
          conversationId: conversation.id,
          conversationName: conversation.name,
        })

        // 获取用户ID
        const userId = await userService.getUserIdFromSession(session)

        // 检查用户是否为会话成员
        const isMember = await memberService.isMember(conversation.id!, userId)

        if (!isMember) {
          return '❌ 您不在当前活跃会话中\n\n' +
                 `📝 会话名称：${conversation.name}\n` +
                 `🆔 会话ID：${conversation.id}\n\n` +
                 `💡 提示：使用 "gm.join ${conversation.id}" 加入会话`
        }

        // 获取会话成员列表
        const members = await ctx.database.get('conversation_member', {
          conversation_id: conversation.id!,
        })

        // 获取成员详细信息
        const memberDetails = []
        for (const member of members) {
          try {
            // 获取用户名称
            const users = await ctx.database.get('user', { id: member.user_id }, ['id', 'name'])
            let userName = member.user_id.toString()
            if (users.length > 0) {
              userName = users[0].name || member.user_id.toString()
            }

            // 获取 binding 信息
            const bindings = await ctx.database.get('binding', { aid: member.user_id })
            let pid = member.user_id.toString()
            let platform = ''
            if (bindings.length > 0) {
              pid = bindings[0].pid
              platform = bindings[0].platform
            }

            memberDetails.push({
              userId: member.user_id,
              userName,
              pid,
              platform,
              role: member.role,
              joinedAt: member.joined_at,
            })
          } catch (e) {
            // 忽略错误
          }
        }

        // 统计成员角色
        const adminCount = memberDetails.filter(m => m.role === 'admin').length
        const memberCount = memberDetails.filter(m => m.role === 'member').length

        // 格式化时间
        const createdDate = conversation.created_at
          ? new Date(conversation.created_at).toLocaleString('zh-CN')
          : '未知'
        const updatedDate = conversation.updated_at
          ? new Date(conversation.updated_at).toLocaleString('zh-CN')
          : '未知'

        // 构建返回信息
        const lines: string[] = []

        lines.push('📋 **当前会话信息**\n')

        // 基本信息
        lines.push(`🆔 会话ID：${conversation.id}`)
        lines.push(`📝 会话名称：${conversation.name}`)
        lines.push(`👤 创建者ID：${conversation.creator_id}`)
        lines.push(`📊 状态：活跃`)
        lines.push(`👥 成员数量：${members.length} 人`)
        lines.push(`   • 管理员：${adminCount} 人`)
        lines.push(`   • 普通成员：${memberCount} 人`)

        // 时间信息
        lines.push(`📅 创建时间：${createdDate}`)
        lines.push(`🕒 更新时间：${updatedDate}`)

        // 成员列表
        if (memberDetails.length > 0) {
          lines.push('\n👥 **成员列表**：')
          memberDetails.forEach((member, index) => {
            const roleIcon = member.role === 'admin' ? '👑' : '👤'
            const roleText = member.role === 'admin' ? '管理员' : '成员'
            lines.push(`${roleIcon} ${index + 1}. ${member.userName} (${member.pid}@${member.platform}) - ${roleText}`)
          })
        }

        return lines.join('\n')
      } catch (error) {
        logger.error('[Command:gm.status] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.status')
  logger.info('[Commands] 会话管理命令注册完成')
}
