/**
 * 会话导出服务
 *
 * @description
 * 负责导出 TRPG 会话记录，支持多种格式（文本、Markdown、JSON）。
 *
 * 核心职责：
 * - 导出会话的所有消息记录
 * - 格式化导出内容（支持多种格式）
 * - 提供筛选功能（按内容类型、时间范围等）
 * - 生成可读的文本格式
 *
 * @module core/conversation-export.service
 */

import { Context } from 'koishi'
import { Conversation } from '../models/conversation'
import { ConversationMessage, ContentType } from '../models/conversation-message'
import { ConversationMember } from '../models/conversation-member'

/**
 * 导出选项接口
 */
export interface ExportOptions {
  /** 包含的内容类型（可选，不指定则导出全部） */
  contentTypes?: ContentType[]
  /** 时间范围筛选（可选） */
  timeRange?: {
    start?: Date
    end?: Date
  }
  /** 是否包含系统消息（默认 true） */
  includeSystemMessages?: boolean
  /** 导出格式（默认 text） */
  format?: 'text' | 'markdown' | 'json'
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean
  /** 导出的内容（成功时） */
  content?: string
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 消息统计接口
 */
export interface MessageSummary {
  totalMessages: number
  byContentType: Record<string, number>
}

/**
 * 格式化消息接口（用于导出）
 */
export interface FormattedMessage {
  timestamp: string
  userId: string
  userName: string
  content: string
  contentType: string
}

/**
 * JSON 导出数据结构接口
 */
export interface JsonExportData {
  conversation: {
    id: number
    name: string
    createdAt: string
    exportedAt: string
  }
  messages: FormattedMessage[]
  summary: MessageSummary
}

/**
 * 会话导出服务类
 */
export class ConversationExportService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  /**
   * 导出会话记录
   *
   * @description
   * 根据指定的选项导出会话记录。
   *
   * 导出流程：
   * 1. 验证用户是否为会话成员
   * 2. 查询会话的基本信息
   * 3. 根据选项筛选消息记录
   * 4. 格式化导出内容
   * 5. 返回导出结果
   *
   * @param {number} conversationId - 会话 ID
   * @param {number} userId - 用户 ID（用于权限验证）
   * @param {ExportOptions} options - 导出选项
   * @returns {Promise<ExportResult>} 导出结果
   *
   * @example
   * ```typescript
   * const result = await exportService.exportConversation(1, userId, {
   *   format: 'markdown',
   *   contentTypes: [ContentType.ROLEPLAY, ContentType.CHECK]
   * })
   *
   * if (result.success) {
   *   console.log(result.content)
   * }
   * ```
   */
  async exportConversation(
    conversationId: number,
    userId: number,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      this.logger.info('[ConversationExportService] 开始导出会话', {
        conversationId,
        userId,
        options,
      })

      // 1. 验证用户是否为会话成员
      const isMember = await this.verifyMember(conversationId, userId)

      if (!isMember) {
        this.logger.warn('[ConversationExportService] 用户不是会话成员', {
          conversationId,
          userId,
        })

        return {
          success: false,
          error: '您不是该会话的成员，无法导出记录',
        }
      }

      // 2. 查询会话信息
      const conversation = await this.ctx.database.get('conversation', {
        id: conversationId,
      })

      if (conversation.length === 0) {
        this.logger.warn('[ConversationExportService] 会话不存在', {
          conversationId,
        })

        return {
          success: false,
          error: '会话不存在',
        }
      }

      const conv = conversation[0]

      // 3. 查询消息记录
      const messages = await this.getMessages(conversationId, options)

      this.logger.info('[ConversationExportService] 查询到消息记录', {
        conversationId,
        messageCount: messages.length,
      })

      // 4. 根据格式生成导出内容
      const format = options.format || 'text'
      let content: string

      switch (format) {
        case 'markdown':
          content = await this.formatAsMarkdown(conv, messages)
          break
        case 'json':
          content = await this.formatAsJson(conv, messages)
          break
        case 'text':
        default:
          content = await this.formatAsText(conv, messages)
          break
      }

      this.logger.info('[ConversationExportService] 导出成功', {
        conversationId,
        format,
        contentLength: content.length,
      })

      return {
        success: true,
        content,
      }
    } catch (error) {
      this.logger.error('[ConversationExportService] 导出会话时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 验证用户是否为会话成员
   *
   * @param {number} conversationId - 会话 ID
   * @param {number} userId - 用户 ID
   * @returns {Promise<boolean>} 是否为成员
   * @private
   */
  private async verifyMember(
    conversationId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      return members.length > 0
    } catch (error) {
      this.logger.error('[ConversationExportService] 验证成员时发生错误', error)
      return false
    }
  }

  /**
   * 获取会话消息记录
   *
   * @param {number} conversationId - 会话 ID
   * @param {ExportOptions} options - 导出选项
   * @returns {Promise<ConversationMessage[]>} 消息列表
   * @private
   */
  private async getMessages(
    conversationId: number,
    options: ExportOptions
  ): Promise<ConversationMessage[]> {
    try {
      // 查询所有消息
      let messages = await this.ctx.database.get('conversation_message', {
        conversation_id: conversationId,
      })

      // 按时间范围筛选
      if (options.timeRange) {
        messages = messages.filter((msg) => {
          const msgTime = new Date(msg.timestamp)
          if (options.timeRange!.start && msgTime < options.timeRange!.start) {
            return false
          }
          if (options.timeRange!.end && msgTime > options.timeRange!.end) {
            return false
          }
          return true
        })
      }

      // 按内容类型筛选
      if (options.contentTypes && options.contentTypes.length > 0) {
        messages = messages.filter((msg) =>
          options.contentTypes!.includes(msg.content_type)
        )
      }

      // 按时间排序（从旧到新）
      messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB
      })

      return messages
    } catch (error) {
      this.logger.error('[ConversationExportService] 获取消息时发生错误', error)
      return []
    }
  }

  /**
   * 格式化为纯文本
   *
   * @param {Conversation} conversation - 会话对象
   * @param {ConversationMessage[]} messages - 消息列表
   * @returns {Promise<string>} 格式化的文本
   *
   * @example
   * ```text
   * === TRPG 会话记录导出 ===
   *
   * 会话信息：
   *   会话ID: 1
   *   会话名称: 我的第一个TRPG团
   *   创建时间: 2026-01-22 20:00:00
   *   导出时间: 2026-01-22 21:30:00
   *
   * ─────────────────────────────────────
   *
   * [2026-01-22 20:05:00] 用户A
   * 大家好
   *
   * [2026-01-22 20:05:30] 用户A
   * 今天我们来玩COC
   *
   * ─────────────────────────────────────
   * 总计: 2 条消息
   * ```
   */
  async formatAsText(
    conversation: Conversation,
    messages: ConversationMessage[]
  ): Promise<string> {
    const lines: string[] = []

    // 头部
    lines.push('=== TRPG 会话记录导出 ===\n')
    lines.push('会话信息：')
    lines.push(`  会话ID: ${conversation.id}`)
    lines.push(`  会话名称: ${conversation.name}`)

    if (conversation.created_at) {
      const createdDate = new Date(conversation.created_at)
      lines.push(`  创建时间: ${this.formatDateTime(createdDate)}`)
    }

    const exportedAt = new Date()
    lines.push(`  导出时间: ${this.formatDateTime(exportedAt)}`)
    lines.push('\n────────────────────────────────────\n')

    // 消息内容
    for (const message of messages) {
      const timestamp = this.formatDateTime(new Date(message.timestamp))
      const userName = await this.getUserName(message.user_id)

      lines.push(`[${timestamp}] ${userName}`)
      lines.push(message.content)
      lines.push('')
    }

    // 尾部
    lines.push('────────────────────────────────────')
    lines.push(`总计: ${messages.length} 条消息`)

    return lines.join('\n')
  }

  /**
   * 格式化为 Markdown
   *
   * @param {Conversation} conversation - 会话对象
   * @param {ConversationMessage[]} messages - 消息列表
   * @returns {Promise<string>} 格式化的 Markdown
   *
   * @example
   * ```markdown
   * # 我的第一个TRPG团 - 会话记录
   *
   * ## 会话信息
   * - **会话ID**: 1
   * - **会话名称**: 我的第一个TRPG团
   * - **创建时间**: 2026-01-22 20:00:00
   * - **导出时间**: 2026-01-22 21:30:00
   *
   * ## 消息记录
   *
   * ### 2026-01-22 20:05:00 - 用户A
   * > 大家好
   *
   * ---
   * **总计**: 2 条消息
   * ```
   */
  async formatAsMarkdown(
    conversation: Conversation,
    messages: ConversationMessage[]
  ): Promise<string> {
    const lines: string[] = []

    // 头部
    lines.push(`# ${conversation.name} - 会话记录\n`)
    lines.push('## 会话信息')
    lines.push(`- **会话ID**: ${conversation.id}`)
    lines.push(`- **会话名称**: ${conversation.name}`)

    if (conversation.created_at) {
      const createdDate = new Date(conversation.created_at)
      lines.push(`- **创建时间**: ${createdDate.toLocaleString('zh-CN')}`)
    }

    const exportedAt = new Date()
    lines.push(`- **导出时间**: ${exportedAt.toLocaleString('zh-CN')}`)
    lines.push('\n## 消息记录\n')

    // 消息内容
    for (const message of messages) {
      const timestamp = new Date(message.timestamp).toLocaleString('zh-CN')
      const userName = await this.getUserName(message.user_id)

      lines.push(`### ${timestamp} - ${userName}`)
      lines.push(`> ${message.content}`)
      lines.push('')
    }

    // 尾部
    lines.push('---')
    lines.push(`**总计**: ${messages.length} 条消息`)

    return lines.join('\n')
  }

  /**
   * 格式化为 JSON
   *
   * @param {Conversation} conversation - 会话对象
   * @param {ConversationMessage[]} messages - 消息列表
   * @returns {Promise<string>} 格式化的 JSON 字符串
   *
   * @example
   * ```json
   * {
   *   "conversation": {
   *     "id": 1,
   *     "name": "我的第一个TRPG团",
   *     "createdAt": "2026-01-22T20:00:00.000Z",
   *     "exportedAt": "2026-01-22T21:30:00.000Z"
   *   },
   *   "messages": [
   *     {
   *       "timestamp": "2026-01-22T20:05:00.000Z",
   *       "userId": "123",
   *       "userName": "用户A",
   *       "content": "大家好",
   *       "contentType": "roleplay"
   *     }
   *   ],
   *   "summary": {
   *     "totalMessages": 2,
   *     "byContentType": {
   *       "roleplay": 2
   *     }
   *   }
   * }
   * ```
   */
  async formatAsJson(
    conversation: Conversation,
    messages: ConversationMessage[]
  ): Promise<string> {
    // 构建消息数组
    const formattedMessages: FormattedMessage[] = []

    for (const message of messages) {
      const userName = await this.getUserName(message.user_id)

      formattedMessages.push({
        timestamp: new Date(message.timestamp).toISOString(),
        userId: String(message.user_id),
        userName,
        content: message.content,
        contentType: message.content_type,
      })
    }

    // 计算统计信息
    const summary = this.calculateSummary(messages)

    // 构建 JSON 数据结构
    const data: JsonExportData = {
      conversation: {
        id: conversation.id!,
        name: conversation.name,
        createdAt: conversation.created_at
          ? new Date(conversation.created_at).toISOString()
          : new Date().toISOString(),
        exportedAt: new Date().toISOString(),
      },
      messages: formattedMessages,
      summary,
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * 计算消息统计
   *
   * @param {ConversationMessage[]} messages - 消息列表
   * @returns {MessageSummary} 统计信息
   * @private
   */
  private calculateSummary(messages: ConversationMessage[]): MessageSummary {
    const summary: MessageSummary = {
      totalMessages: messages.length,
      byContentType: {},
    }

    for (const message of messages) {
      const type = message.content_type
      summary.byContentType[type] = (summary.byContentType[type] || 0) + 1
    }

    return summary
  }

  /**
   * 获取用户名称
   *
   * @param {number} userId - 用户 ID
   * @returns {Promise<string>} 用户名称
   * @private
   */
  private async getUserName(userId: number): Promise<string> {
    try {
      const users = await this.ctx.database.get('user', { id: userId })

      if (users.length > 0 && users[0].name) {
        return users[0].name
      }

      return `用户${userId}`
    } catch (error) {
      this.logger.error('[ConversationExportService] 获取用户名称时发生错误', error)
      return `用户${userId}`
    }
  }

  /**
   * 格式化日期时间
   *
   * @param {Date} date - 日期对象
   * @returns {string} 格式化的日期时间字符串
   * @private
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}

/**
 * 创建会话导出服务实例的工厂函数
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {ConversationExportService} 会话导出服务实例
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { createConversationExportService } from './core/services/conversation-export.service'
 *
 * export function apply(ctx: Context) {
 *   const exportService = createConversationExportService(ctx)
 *   // 使用服务...
 * }
 * ```
 */
export function createConversationExportService(
  ctx: Context
): ConversationExportService {
  return new ConversationExportService(ctx)
}
