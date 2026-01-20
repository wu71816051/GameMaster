/**
 * 会话状态枚举
 */
export enum ConversationStatus {
  ACTIVE = 0,  // 活跃，正常记录消息
  PAUSED = 1,  // 暂停，停止记录但保留会话
  ENDED = 2,   // 已结束，会话终止
}

/**
 * 频道信息接口
 */
export interface ChannelInfo {
  platform: string
  guildId: string
  channelId: string
}

/**
 * 会话元数据接口
 */
export interface ConversationMetadata {
  description?: string
  tags?: string[]
  max_members?: number
  [key: string]: any
}

/**
 * Conversation 表模型接口
 */
export interface Conversation {
  id?: number
  name: string
  creator_id: string
  channels: ChannelInfo[]
  status: ConversationStatus
  created_at?: Date
  updated_at?: Date
  metadata?: ConversationMetadata
}

/**
 * 定义 Conversation 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    conversation: Conversation
  }
}
