/**
 * 内容类型枚举
 *
 * @description
 * 标识消息在 TRPG 会话中的功能类型
 */
export enum ContentType {
  /** 角色扮演内容 */
  ROLEPLAY = 'roleplay',
  /** 超游发言 (Out of Character) - 玩家脱离角色的讨论 */
  OUT_OF_CHARACTER = 'out_of_character',
  /** 游戏检定（如属性检定、技能检定） */
  CHECK = 'check',
  /** 系统命令或指令 */
  COMMAND = 'command',
  /** 其他类型消息 */
  OTHER = 'other',
}

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
  content_type: ContentType  // TRPG 内容类型
  message_type: MessageType
  timestamp: Date
  platform: string
  guild_id: string
  channel_id: string  // 频道 ID
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
