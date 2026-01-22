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

// 导出 ConversationChannel 相关
export * from './conversation-channel'

// 导出 User 扩展
export * from './user-extension'

// 导出 Character 相关
export * from './character'

/**
 * 注册数据库表扩展
 * 在插件初始化时调用此函数来注册所有数据库表
 */
export function registerDatabaseModels(ctx: Context) {
  const logger = ctx.logger

  logger.info('[GameMaster] 开始注册数据库模型')

  // 注册 conversation 表
  logger.debug('[GameMaster] 注册 conversation 表')
  ctx.model.extend('conversation' as any, {
    id: 'unsigned',
    name: 'string',
    creator_id: 'integer',  // 改为 integer 类型
    channels: 'list',
    status: 'integer',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    metadata: 'json',
  }, {
    autoInc: true,
  })
  logger.info('[GameMaster] conversation 表注册成功', '字段: id, name, creator_id, channels, status, created_at, updated_at, metadata')

  // 注册 conversation_member 表
  logger.debug('[GameMaster] 注册 conversation_member 表')
  ctx.model.extend('conversation_member' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    user_id: 'integer',  // 改为 integer 类型
    joined_at: 'timestamp',
    role: 'string',
  }, {
    autoInc: true,
  })
  logger.info('[GameMaster] conversation_member 表注册成功', '字段: id, conversation_id, user_id, joined_at, role')

  // 注册 conversation_message 表
  logger.debug('[GameMaster] 注册 conversation_message 表')
  ctx.model.extend('conversation_message' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    user_id: 'integer',  // 改为 integer 类型
    message_id: 'string',
    content: 'text',
    content_type: 'string',  // TRPG 内容类型
    message_type: 'string',
    timestamp: 'timestamp',
    platform: 'string',
    guild_id: 'string',
    channel_id: 'string',  // 频道 ID
    attachments: 'json',
  }, {
    autoInc: true,
  })
  logger.info('[GameMaster] conversation_message 表注册成功', '字段: id, conversation_id, user_id, message_id, content, content_type, message_type, timestamp, platform, guild_id, channel_id, attachments')

  // 注册 conversation_channel 表
  logger.debug('[GameMaster] 注册 conversation_channel 表')
  ctx.model.extend('conversation_channel' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    platform: 'string',
    guild_id: 'string',
    channel_id: 'string',
    joined_at: 'timestamp',
  }, {
    autoInc: true,
  })
  logger.info('[GameMaster] conversation_channel 表注册成功', '字段: id, conversation_id, platform, guild_id, channel_id, joined_at')

  // 注册 character 表
  logger.debug('[GameMaster] 注册 character 表')
  ctx.model.extend('character' as any, {
    id: 'unsigned',
    conversation_id: 'unsigned',
    user_id: 'integer',
    name: 'string',
    portrait_url: 'string',
    rule_system: 'string',
    attributes: 'json',
    skills: 'json',
    inventory: 'json',
    notes: 'text',
    metadata: 'json',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    is_active: 'boolean',
  }, {
    autoInc: true,
  })
  logger.info('[GameMaster] character 表注册成功', '字段: id, conversation_id, user_id, name, portrait_url, rule_system, attributes, skills, inventory, notes, metadata, created_at, updated_at, is_active')

  // 扩展 user 表
  logger.debug('[GameMaster] 扩展 user 表')
  ctx.model.extend('user' as any, {
    conversations: 'list',
  })
  logger.info('[GameMaster] user 表扩展成功', '新增字段: conversations')

  logger.info('[GameMaster] 所有数据库模型注册完成', '共注册 5 个新表，扩展 1 个现有表')
}

// 让导入时自动执行注册
export function apply(ctx: Context) {
  registerDatabaseModels(ctx)
}
