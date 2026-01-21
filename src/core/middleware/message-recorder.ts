/**
 * 消息中间件模块
 *
 * @description
 * 监听 Koishi 的 message 事件，自动记录会话成员的消息到数据库。
 *
 * 核心职责：
 * - 判断消息来源频道是否有活跃会话
 * - 验证发送者是否为会话成员
 * - 如果是会话成员，记录消息到数据库
 * - 更新会话的 updated_at 时间戳
 *
 * @module core/middleware/message-recorder
 */

import { Context } from 'koishi'
import { ConversationService } from '../services/conversation.service'
import { MemberService } from '../services/member.service'
import { createUserService } from '../services/user.service'
import { MessageParser } from '../utils/message-parser'
import { MessageType } from '../models/conversation-message'

/**
 * 消息中间件配置接口
 */
export interface MessageRecorderConfig {
  /** 是否启用消息记录（默认启用） */
  enabled?: boolean
}

/**
 * 应用消息中间件
 *
 * @description
 * 监听所有消息事件，将活跃会话中成员的消息记录到数据库。
 *
 * 工作流程：
 * 1. 解析消息来源频道信息
 * 2. 查询该频道的活跃会话（status = ACTIVE）
 * 3. 检查发送者是否为会话成员
 * 4. 如果是成员，提取消息内容并记录到数据库
 * 5. 更新会话的 updated_at 时间戳
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @param {MessageRecorderConfig} config - 配置选项
 *
 * @example
 * ```typescript
 * import { applyMessageMiddleware } from './core/middleware/message-recorder'
 *
 * export function apply(ctx: Context) {
 *   applyMessageMiddleware(ctx, { debugMode: true })
 * }
 * ```
 */
export function applyMessageMiddleware(ctx: Context, config: MessageRecorderConfig = {}) {
  const logger = ctx.logger

  // 合并默认配置
  const enabled = config.enabled !== false

  if (!enabled) {
    logger.info('[MessageMiddleware] 消息中间件已禁用')
    return
  }

  logger.info('[MessageMiddleware] 消息中间件已加载 (模式: 消息记录)')

  // 创建服务实例
  const conversationService = new ConversationService(ctx)
  const memberService = new MemberService(ctx)
  const userService = createUserService(ctx)

  // 监听所有消息事件
  ctx.on('message', async (session) => {
    try {
      logger.info('[MessageMiddleware] 监听到消息', {
        platform: session.platform,
        userId: session.userId,
        username: session.username || session.author?.name || '未知',
        guildId: session.guildId,
        channelId: session.channelId,
        messageId: session.messageId,
        content: session.content || '',
        subtype: (session as any).subtype || '无',
        elements: session.elements ? JSON.stringify(session.elements) : '无',
      })

      // 1. 解析消息来源频道
      const channelInfo = {
        platform: session.platform,
        guildId: session.guildId || '',
        channelId: session.channelId || '',
      }

      // 2. 查询该频道的活跃会话
      const conversation = await conversationService.getActiveConversation({
        channel: channelInfo,
      })

      // 如果没有活跃会话，直接返回
      if (!conversation) {
        logger.info('[MessageMiddleware] 该频道没有活跃会话，忽略消息')
        return
      }

      logger.info('[MessageMiddleware] 找到活跃会话', {
        conversationId: conversation.id,
        conversationName: conversation.name,
      })

      // 3. 检查发送者是否为会话成员
      const userId = await userService.getUserIdFromSession(session)

      if (!userId || userId <= 0) {
        logger.warn('[MessageMiddleware] 无效的用户ID', { userId })
        return
      }

      const isMember = await memberService.isMember(conversation.id!, userId)

      if (!isMember) {
        logger.info('[MessageMiddleware] 发送者不是会话成员，忽略消息', {
          conversationId: conversation.id,
          userId,
        })
        return
      }

      logger.info('[MessageMiddleware] 发送者是会话成员，准备记录消息', {
        conversationId: conversation.id,
        userId,
      })

      // 4. 提取消息内容
      const parsedMessage = MessageParser.parseMessage(session)

      // 将 MessageParser 的 MessageType 转换为数据库模型期望的 MessageType
      let messageType: MessageType
      switch (parsedMessage.messageType) {
        case 'text':
          messageType = MessageType.TEXT
          break
        case 'image':
          messageType = MessageType.IMAGE
          break
        case 'audio':
          messageType = MessageType.AUDIO
          break
        case 'video':
          messageType = MessageType.VIDEO
          break
        default:
          messageType = MessageType.TEXT
      }

      logger.info('[MessageMiddleware] 消息解析结果', {
        messageType: parsedMessage.messageType,
        contentLength: parsedMessage.content.length,
        attachmentCount: parsedMessage.attachments.length,
      })

      // 构建 attachments 对象
      const attachments: { images?: string[]; files?: Array<{ name: string; url: string; size?: number; mimeType?: string }> } = {}

      // 提取图片 URL
      const imageAttachments = parsedMessage.attachments.filter(a => a.type === 'image')
      if (imageAttachments.length > 0) {
        attachments.images = imageAttachments.map(a => a.url)
      }

      // 提取其他文件
      const otherAttachments = parsedMessage.attachments.filter(a => a.type !== 'image')
      if (otherAttachments.length > 0) {
        attachments.files = otherAttachments.map(a => ({
          name: a.name || 'unknown',
          url: a.url,
          size: a.size,
        }))
      }

      // 5. 创建消息记录
      await ctx.database.create('conversation_message', {
        conversation_id: conversation.id!,
        user_id: userId,
        message_id: session.messageId || `msg_${Date.now()}_${userId}`,
        content: parsedMessage.content,
        message_type: messageType,
        timestamp: new Date(),
        platform: session.platform,
        guild_id: session.guildId || '',
        attachments: Object.keys(attachments).length > 0 ? attachments : undefined,
      })

      logger.info('[MessageMiddleware] 消息已记录', {
        conversationId: conversation.id,
        userId,
        messageType,
        contentLength: parsedMessage.content.length,
      })

      // 6. 更新会话的 updated_at 时间戳
      await conversationService.updateTimestamp(conversation.id!)

    } catch (error) {
      logger.error('[MessageMiddleware] 处理消息时发生错误', error)
    }
  })

  logger.info('[MessageMiddleware] 消息监听器已注册')
}
