/**
 * 消息服务模块
 *
 * @description
 * 提供会话消息的查询、过滤和统计功能。
 *
 * @module core/services/message
 */

import { Context } from 'koishi'
import { ContentType, MessageType, ConversationMessage } from '../models/conversation-message'

/**
 * 消息数据（包含用户信息）
 */
export interface ConversationMessageData {
  id: number
  conversation_id: number
  user_id: number
  user_name?: string
  user_pid?: string
  user_platform?: string
  message_id: string
  content: string
  content_type: ContentType
  message_type: MessageType
  timestamp: Date
  platform: string
  guild_id: string
  attachments?: any
}

/**
 * 消息过滤条件
 */
export interface MessageFilters {
  userId?: number
  contentType?: ContentType | string
  messageType?: MessageType | string
  after?: Date
  before?: Date
}

/**
 * 消息统计信息
 */
export interface MessageStats {
  total: number
  byContentType: Record<string, number>
  byMessageType: Record<string, number>
  byUser: Record<string, number>
}

/**
 * 创建消息服务实例
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {MessageService} 消息服务实例
 */
export class MessageService {
  constructor(private ctx: Context) {}

  /**
   * 获取会话消息列表（带过滤）
   *
   * @param {number} conversationId - 会话ID
   * @param {MessageFilters} filters - 过滤条件
   * @returns {Promise<ConversationMessageData[]>} 消息列表
   */
  async getMessages(
    conversationId: number,
    filters?: MessageFilters
  ): Promise<ConversationMessageData[]> {
    const logger = this.ctx.logger

    // 从数据库获取消息
    const messages = await this.ctx.database.get('conversation_message', {
      conversation_id: conversationId,
    })

    logger.debug('[MessageService] 查询到消息', {
      conversationId,
      count: messages.length,
    })

    // 批量查询用户信息（避免 N+1 问题）
    const enrichedMessages = await this.enrichWithUserInfo(messages)

    // 应用过滤条件
    const filteredMessages = this.applyFilters(enrichedMessages, filters)

    logger.debug('[MessageService] 过滤后消息', {
      before: enrichedMessages.length,
      after: filteredMessages.length,
    })

    return filteredMessages
  }

  /**
   * 批量查询用户信息并填充到消息中
   *
   * @param {ConversationMessage[]} messages - 原始消息列表
   * @returns {Promise<ConversationMessageData[]>} 包含用户信息的消息列表
   */
  private async enrichWithUserInfo(
    messages: ConversationMessage[]
  ): Promise<ConversationMessageData[]> {
    // 提取所有唯一的用户ID
    const userIds = [...new Set(messages.map((m) => m.user_id))]

    if (userIds.length === 0) {
      return []
    }

    // 批量查询用户信息
    const users = await this.ctx.database.get('user', {
      id: { $in: userIds },
    })

    // 批量查询 binding 信息
    const bindings = await this.ctx.database.get('binding', {
      aid: { $in: userIds },
    })

    // 创建映射表
    const userMap = new Map(users.map((u) => [u.id, u]))
    const bindingMap = new Map()

    for (const binding of bindings) {
      // 一个 aid 可能有多个绑定（不同平台），保存第一个
      if (!bindingMap.has(binding.aid)) {
        bindingMap.set(binding.aid, binding)
      }
    }

    // 填充用户信息
    const result: ConversationMessageData[] = []
    for (const msg of messages) {
      const user = userMap.get(msg.user_id)
      const binding = bindingMap.get(msg.user_id)

      result.push({
        id: msg.id!,
        conversation_id: msg.conversation_id,
        user_id: msg.user_id,
        user_name: user?.name,
        user_pid: binding?.pid,
        user_platform: binding?.platform,
        message_id: msg.message_id,
        content: msg.content,
        content_type: msg.content_type,
        message_type: msg.message_type,
        timestamp: msg.timestamp,
        platform: msg.platform,
        guild_id: msg.guild_id,
        attachments: msg.attachments,
      })
    }

    return result
  }

  /**
   * 应用过滤条件
   *
   * @param {ConversationMessageData[]} messages - 消息列表
   * @param {MessageFilters} filters - 过滤条件
   * @returns {ConversationMessageData[]} 过滤后的消息列表
   */
  private applyFilters(
    messages: ConversationMessageData[],
    filters?: MessageFilters
  ): ConversationMessageData[] {
    if (!filters) {
      return messages
    }

    let result = messages

    // 按用户过滤
    if (filters.userId !== undefined) {
      result = result.filter((m) => m.user_id === filters.userId)
    }

    // 按内容类型过滤
    if (filters.contentType !== undefined) {
      result = result.filter((m) => m.content_type === filters.contentType)
    }

    // 按消息类型过滤
    if (filters.messageType !== undefined) {
      result = result.filter((m) => m.message_type === filters.messageType)
    }

    // 按时间范围过滤
    if (filters.after !== undefined) {
      const afterTime = filters.after.getTime()
      result = result.filter((m) => new Date(m.timestamp).getTime() >= afterTime)
    }

    if (filters.before !== undefined) {
      const beforeTime = filters.before.getTime()
      result = result.filter((m) => new Date(m.timestamp).getTime() <= beforeTime)
    }

    return result
  }

  /**
   * 排序消息
   *
   * @param {ConversationMessageData[]} messages - 消息列表
   * @param {string} order - 排序方式：'asc' 或 'desc'
   * @returns {ConversationMessageData[]} 排序后的消息列表
   */
  sortMessages(messages: ConversationMessageData[], order: 'asc' | 'desc' = 'asc'): ConversationMessageData[] {
    const sorted = [...messages]
    sorted.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return order === 'asc' ? timeA - timeB : timeB - timeA
    })
    return sorted
  }

  /**
   * 统计消息信息
   *
   * @param {ConversationMessageData[]} messages - 消息列表
   * @returns {MessageStats} 统计信息
   */
  getMessageStats(messages: ConversationMessageData[]): MessageStats {
    const stats: MessageStats = {
      total: messages.length,
      byContentType: {},
      byMessageType: {},
      byUser: {},
    }

    for (const msg of messages) {
      // 按内容类型统计
      const ct = msg.content_type
      stats.byContentType[ct] = (stats.byContentType[ct] || 0) + 1

      // 按消息类型统计
      const mt = msg.message_type
      stats.byMessageType[mt] = (stats.byMessageType[mt] || 0) + 1

      // 按用户统计
      // 使用 pid@platform 作为用户标识
      const userIdentifier = msg.user_pid && msg.user_platform
        ? `${msg.user_pid}@${msg.user_platform}`
        : msg.user_name || msg.user_id.toString()
      stats.byUser[userIdentifier] = (stats.byUser[userIdentifier] || 0) + 1
    }

    return stats
  }
}

/**
 * 创建消息服务实例
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {MessageService} 消息服务实例
 */
export function createMessageService(ctx: Context): MessageService {
  return new MessageService(ctx)
}
