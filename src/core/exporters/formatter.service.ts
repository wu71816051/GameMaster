/**
 * 导出格式化器模块
 *
 * @description
 * 提供将会话消息导出为不同格式的功能。
 *
 * @module core/exporters/formatter
 */

import {
  ConversationMessageData,
  MessageStats,
} from '../services/message.service'
import { ContentType, MessageType } from '../models/conversation-message'

/**
 * 会话信息接口
 */
export interface ConversationInfo {
  id: number
  name: string
  created_at?: Date | string
}

/**
 * 导出格式化器接口
 */
export interface ExportFormatter {
  format(
    conversation: ConversationInfo,
    messages: ConversationMessageData[],
    stats: MessageStats
  ): string
}

/**
 * 内容类型标签映射
 */
const CONTENT_TYPE_LABELS: Record<string, string> = {
  [ContentType.ROLEPLAY]: 'RP',
  [ContentType.OUT_OF_CHARACTER]: 'OOC',
  [ContentType.CHECK]: 'CHECK',
  [ContentType.COMMAND]: 'CMD',
  [ContentType.OTHER]: 'OTHER',
}

/**
 * 纯文本格式化器
 */
export class TextFormatter implements ExportFormatter {
  format(
    conversation: ConversationInfo,
    messages: ConversationMessageData[],
    stats: MessageStats
  ): string {
    const lines: string[] = []

    // 标题
    lines.push('='.repeat(40))
    lines.push(`会话：${conversation.name}`)
    lines.push(`会话ID：${conversation.id}`)
    lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`)
    lines.push('='.repeat(40))
    lines.push('')

    // 消息内容
    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN')
      // 使用 pid@platform 显示用户，如果没有则使用 user_id
      const userIdentifier = msg.user_pid && msg.user_platform
        ? `${msg.user_pid}@${msg.user_platform}`
        : msg.user_name || msg.user_id.toString()
      const typeLabel = CONTENT_TYPE_LABELS[msg.content_type] || 'UNKNOWN'

      lines.push(`[${time}] ${userIdentifier} (${typeLabel}):`)
      lines.push(msg.content)
      lines.push('')
    }

    // 统计信息
    const ctStats = stats.byContentType
    lines.push('='.repeat(40))
    lines.push(
      `统计：总消息数 ${stats.total} | RP: ${ctStats[ContentType.ROLEPLAY] || 0} | OOC: ${ctStats[ContentType.OUT_OF_CHARACTER] || 0} | CHECK: ${ctStats[ContentType.CHECK] || 0}`
    )
    lines.push('='.repeat(40))

    return lines.join('\n')
  }
}

/**
 * Markdown 格式化器
 */
export class MarkdownFormatter implements ExportFormatter {
  format(
    conversation: ConversationInfo,
    messages: ConversationMessageData[],
    stats: MessageStats
  ): string {
    const lines: string[] = []

    // 标题
    lines.push(`# 会话导出：${conversation.name}`)
    lines.push('')
    lines.push(`**会话ID**: ${conversation.id}`)
    lines.push(
      `**导出时间**: ${new Date().toLocaleString('zh-CN', { hour12: false })}`
    )
    lines.push('')

    // 消息记录
    lines.push('---')
    lines.push('')
    lines.push('## 消息记录')
    lines.push('')

    // 按日期分组
    const messagesByDate = this.groupMessagesByDate(messages)

    for (const [date, dateMessages] of Object.entries(messagesByDate)) {
      lines.push(`### ${date}`)
      lines.push('')

      for (const msg of dateMessages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
        // 使用 pid@platform 显示用户，如果没有则使用 user_id
        const userIdentifier = msg.user_pid && msg.user_platform
          ? `${msg.user_pid}@${msg.user_platform}`
          : msg.user_name || msg.user_id.toString()
        const typeLabel = CONTENT_TYPE_LABELS[msg.content_type] || 'UNKNOWN'

        lines.push(`#### ${time} - ${userIdentifier}`)
        lines.push(`**[${typeLabel}]**`)
        lines.push(msg.content)
        lines.push('')

        // 处理附件
        if (msg.attachments) {
          const att = msg.attachments as any
          if (att.images && att.images.length > 0) {
            for (const imgUrl of att.images) {
              lines.push(`![image](${imgUrl})`)
            }
            lines.push('')
          }
        }
      }
    }

    // 统计表格
    lines.push('---')
    lines.push('')
    lines.push('## 统计')
    lines.push('')
    lines.push('| 项目 | 数量 |')
    lines.push('|------|------|')

    // 内容类型统计
    for (const [type, count] of Object.entries(stats.byContentType)) {
      const label = CONTENT_TYPE_LABELS[type] || type
      lines.push(`| ${label} | ${count} |`)
    }

    // 消息类型统计
    lines.push('| **总计** | **' + stats.total + '** |')

    return lines.join('\n')
  }

  /**
   * 按日期分组消息
   */
  private groupMessagesByDate(
    messages: ConversationMessageData[]
  ): Record<string, ConversationMessageData[]> {
    const groups: Record<string, ConversationMessageData[]> = {}

    for (const msg of messages) {
      const date = new Date(msg.timestamp).toLocaleDateString('zh-CN')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    }

    return groups
  }
}

/**
 * JSON 格式化器
 */
export class JsonFormatter implements ExportFormatter {
  format(
    conversation: ConversationInfo,
    messages: ConversationMessageData[],
    stats: MessageStats
  ): string {
    const data = {
      conversation: {
        id: conversation.id,
        name: conversation.name,
        created_at: conversation.created_at,
        exported_at: new Date().toISOString(),
      },
      filters: {
        // 可以添加过滤条件信息
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        user: {
          id: msg.user_id,
          name: msg.user_name,
          pid: msg.user_pid,
          platform: msg.user_platform,
        },
        content: msg.content,
        content_type: msg.content_type,
        message_type: msg.message_type,
        timestamp: new Date(msg.timestamp).toISOString(),
        attachments: msg.attachments,
      })),
      statistics: {
        total: stats.total,
        by_content_type: stats.byContentType,
        by_message_type: stats.byMessageType,
        by_user: stats.byUser,
      },
    }

    return JSON.stringify(data, null, 2)
  }
}

/**
 * 创建格式化器实例
 *
 * @param {string} format - 格式类型：'txt', 'md', 'json'
 * @returns {ExportFormatter} 格式化器实例
 */
export function createFormatter(format: string): ExportFormatter {
  switch (format.toLowerCase()) {
    case 'txt':
      return new TextFormatter()
    case 'md':
      return new MarkdownFormatter()
    case 'json':
      return new JsonFormatter()
    default:
      return new TextFormatter()
  }
}
