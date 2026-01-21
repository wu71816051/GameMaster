/**
 * 消息类型枚举
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

/**
 * 附件信息接口
 */
export interface MessageAttachments {
  images?: string[]
  files?: Array<{
    name: string
    url: string
    size?: number
    mimeType?: string
  }>
  [key: string]: any
}

/**
 * ConversationMessage 表模型接口
 */
export interface ConversationMessage {
  id?: number
  conversation_id: number
  user_id: number  // Koishi 用户 ID (使用 number 类型以适配 Koishi 的 id 类型)
  message_id: string
  content: string
  message_type: MessageType
  timestamp: Date
  platform: string
  guild_id: string
  attachments?: MessageAttachments
}

/**
 * 定义 ConversationMessage 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    conversation_message: ConversationMessage
  }
}
