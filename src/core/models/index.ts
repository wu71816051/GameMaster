/**
 * 数据库模型导出
 * 统一导出所有数据库表模型和类型定义
 */

import { Context } from 'koishi'

// 导出 Conversation 相关
export * from './conversation'

// 导出 ConversationMember 相关
export * from './conversation-member'

// 导出 ConversationMessage 相关
export * from './conversation-message'

// 导出 User 扩展
export * from './user-extension'

/**
 * 注册数据库表扩展
 * 在插件初始化时调用此函数来注册所有数据库表
 */
export function registerDatabaseModels(ctx: Context) {
  // 注册 conversation 表
  ctx.model.extend('conversation' as any, {
    id: 'unsigned',
    name: 'string',
    creator_id: 'string',
    channels: 'list',
    status: 'integer',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    metadata: 'json',
  }, {
    autoInc: true,
  })

  // 注册 conversation_member 表
  ctx.model.extend('conversation_member' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    user_id: 'string',
    joined_at: 'timestamp',
    role: 'string',
  }, {
    autoInc: true,
  })

  // 注册 conversation_message 表
  ctx.model.extend('conversation_message' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    user_id: 'string',
    message_id: 'string',
    content: 'text',
    message_type: 'string',
    timestamp: 'timestamp',
    platform: 'string',
    guild_id: 'string',
    attachments: 'json',
  }, {
    autoInc: true,
  })

  // 扩展 user 表
  ctx.model.extend('user' as any, {
    conversations: 'list',
  })
}

// 让导入时自动执行注册
export function apply(ctx: Context) {
  registerDatabaseModels(ctx)
}
