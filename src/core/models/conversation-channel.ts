/**
 * 会话频道关联表模型
 *
 * @description
 * 用于存储会话与频道的关联关系，优化查询性能。
 * 通过 (platform, guild_id, channel_id) 复合索引，将频道查询从 O(n) 全表扫描优化为 O(log n) 索引查询。
 *
 * @module core/models/conversation-channel
 */

/**
 * ConversationChannel 表模型接口
 */
export interface ConversationChannel {
  id?: number
  conversation_id: number
  platform: string
  guild_id: string
  channel_id: string
  joined_at: Date
}

/**
 * 定义 ConversationChannel 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    conversation_channel: ConversationChannel
  }
}
