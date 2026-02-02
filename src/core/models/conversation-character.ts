/**
 * ConversationCharacter 表模型
 *
 * @description
 * 角色-会话关联表（多对多关系）
 * 一个角色可以在多个会话中使用
 * 一个会话可以有多个角色
 *
 * @module core/models/conversation-character
 */

/**
 * ConversationCharacter 表模型接口
 */
export interface ConversationCharacter {
  id?: number
  conversation_id: number  // 会话 ID（外键）
  character_id: number      // 角色 ID（外键）
  is_active: boolean        // 在此会话中是否激活
  joined_at?: Date          // 加入会话的时间（只设置一次）
  archived?: boolean        // 角色是否已归档（用户主动归档）
  archived_at?: Date        // 归档时间
  current_player_id: number // 当前扮演这个角色的用户 ID
  character_type: 'pc' | 'npc' // 角色类型：'pc'（玩家角色）或 'npc'（非玩家角色）
}

/**
 * 定义 ConversationCharacter 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    conversation_character: ConversationCharacter
  }
}
