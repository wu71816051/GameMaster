/**
 * 会话管理服务
 *
 * @description
 * 负责处理 TRPG 会话的创建、查询和验证等核心业务逻辑。
 *
 * 核心职责：
 * - 创建新会话
 * - 验证频道唯一性（一个频道只能有一个活跃会话）
 * - 自动将创建者添加为成员（role: creator）
 * - 更新用户的 conversations 列表
 * - 查询活跃会话
 *
 * @module core/conversation.service
 */

import { Context } from 'koishi'
import { ConversationStatus, Conversation, ChannelInfo } from '../models/conversation'
import { ConversationChannel } from '../models/conversation-channel'
import { ChannelIdUtil } from '../utils/channel-id'
import { UserIdUtil } from '../utils/user-id'

/**
 * 创建会话的参数接口
 */
export interface CreateConversationParams {
  /** 会话名称 */
  name: string
  /** 创建者的用户 ID (Koishi 原生 userId) */
  creatorId: number
  /** 频道信息 */
  channel: {
    platform: string
    guildId: string
    channelId: string
  }
  /** 会话元数据（可选） */
  metadata?: Record<string, any>
}

/**
 * 创建会话的结果接口
 */
export interface CreateConversationResult {
  /** 是否成功 */
  success: boolean
  /** 创建的会话ID（成功时） */
  conversationId?: number
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 查询活跃会话的参数接口
 */
export interface GetActiveConversationParams {
  /** 频道信息 */
  channel: {
    platform: string
    guildId: string
    channelId: string
  }
}

/**
 * 会话管理服务类
 */
export class ConversationService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  /**
   * 创建新会话
   *
   * @description
   * 创建一个新的 TRPG 会话，并自动将创建者添加为会话成员（角色为 creator）。
   *
   * 创建流程：
   * 1. 检查该频道是否已有活跃会话
   * 2. 创建 conversation 记录（status: ACTIVE）
   * 3. 创建 conversation_member 记录（role: creator）
   * 4. 更新创建者用户的 conversations 列表
   *
   * @param {CreateConversationParams} params - 创建会话的参数
   * @returns {Promise<CreateConversationResult>} 创建结果
   *
   * @example
   * ```typescript
   * const result = await conversationService.createConversation({
   *   name: '我的第一个TRPG团',
   *   creatorId: 1234567890,  // Koishi 原生 userId
   *   channel: {
   *     platform: 'discord',
   *     guildId: '123456789',
   *     channelId: '987654321'
   *   }
   * })
   *
   * if (result.success) {
   *   console.log(`会话创建成功，ID: ${result.conversationId}`)
   * } else {
   *   console.error(`创建失败: ${result.error}`)
   * }
   * ```
   */
  async createConversation(params: CreateConversationParams): Promise<CreateConversationResult> {
    try {
      this.logger.info('[ConversationService] 开始创建会话', {
        name: params.name,
        creatorId: params.creatorId,
        channel: params.channel,
      })

      // 1. 格式化频道标识符
      const channelIdString = ChannelIdUtil.formatChannelId(
        params.channel.platform,
        params.channel.guildId,
        params.channel.channelId
      )

      this.logger.debug('[ConversationService] 频道标识符', { channelId: channelIdString })

      // 2. 检查该频道是否已有活跃会话
      const existingConversation = await this.getActiveConversation({ channel: params.channel })

      if (existingConversation) {
        this.logger.warn('[ConversationService] 该频道已有活跃会话', {
          channelId: channelIdString,
          existingConversationId: existingConversation.id,
        })

        return {
          success: false,
          error: `该频道已有活跃会话（ID: ${existingConversation.id}），一个频道只能有一个活跃会话`,
        }
      }

      // 3. 创建 conversation 记录
      const now = new Date()
      const conversation = await this.ctx.database.create('conversation', {
        name: params.name,
        creator_id: params.creatorId,
        channels: [{ ...params.channel }],  // 直接存储数组（list 类型）
        status: ConversationStatus.ACTIVE,
        created_at: now,
        updated_at: now,
        metadata: params.metadata || {},
      })

      this.logger.info('[ConversationService] conversation 记录创建成功', {
        conversationId: conversation.id,
      })

      // 4. 创建 conversation_channel 记录（中间表）
      await this.ctx.database.create('conversation_channel', {
        conversation_id: conversation.id!,
        platform: params.channel.platform,
        guild_id: params.channel.guildId,
        channel_id: params.channel.channelId,
        joined_at: now,
      })

      this.logger.info('[ConversationService] conversation_channel 记录创建成功', {
        conversationId: conversation.id,
        platform: params.channel.platform,
        guild_id: params.channel.guildId,
        channel_id: params.channel.channelId,
      })

      // 5. 创建 conversation_member 记录（role: creator）
      await this.ctx.database.create('conversation_member', {
        conversation_id: conversation.id!,
        user_id: params.creatorId,
        joined_at: now,
        role: 'creator',
      })

      this.logger.info('[ConversationService] conversation_member 记录创建成功', {
        conversationId: conversation.id,
        userId: params.creatorId,
        role: 'creator',
      })

      // 5. 更新创建者用户的 conversations 列表
      await this.updateUserConversations(params.creatorId, conversation.id!)

      this.logger.info('[ConversationService] 用户 conversations 列表更新成功', {
        userId: params.creatorId,
        conversationId: conversation.id,
      })

      this.logger.info('[ConversationService] 会话创建完成', {
        conversationId: conversation.id,
        name: params.name,
        creatorId: params.creatorId,
      })

      return {
        success: true,
        conversationId: conversation.id,
      }
    } catch (error) {
      this.logger.error('[ConversationService] 创建会话时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取频道的活跃会话
   *
   * @description
   * 查询指定频道的活跃会话（status = ACTIVE）。
   * 一个频道只能有一个活跃会话。
   *
   * @param {GetActiveConversationParams} params - 查询参数
   * @returns {Promise<Conversation | null>} 活跃会话对象，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const conversation = await conversationService.getActiveConversation({
   *   channel: {
   *     platform: 'discord',
   *     guildId: '123456789',
   *     channelId: '987654321'
   *   }
   * })
   *
   * if (conversation) {
   *   console.log(`找到活跃会话: ${conversation.name}`)
   * } else {
   *   console.log('该频道没有活跃会话')
   * }
   * ```
   */
  async getActiveConversation(params: GetActiveConversationParams): Promise<Conversation | null> {
    try {
      this.logger.debug('[ConversationService] 查询频道的活跃会话（使用中间表）', {
        channel: params.channel,
      })

      // 1. 通过中间表查询频道的 conversation_id
      const channelLinks = await this.ctx.database.get('conversation_channel', {
        platform: params.channel.platform,
        guild_id: params.channel.guildId,
        channel_id: params.channel.channelId,
      })

      if (channelLinks.length === 0) {
        this.logger.debug('[ConversationService] 该频道未关联到任何会话')
        return null
      }

      this.logger.debug('[ConversationService] 找到频道关联记录', {
        count: channelLinks.length,
        conversationIds: channelLinks.map(link => link.conversation_id),
      })

      // 2. 查询这些会话中哪些是活跃的
      const conversations = await this.ctx.database.get('conversation', {
        id: channelLinks.map(link => link.conversation_id),
        status: ConversationStatus.ACTIVE,
      })

      if (conversations.length === 0) {
        this.logger.debug('[ConversationService] 频道关联的会话均非活跃状态')
        return null
      }

      // 3. 返回第一个活跃会话（一个频道只能有一个活跃会话）
      const targetConversation = conversations[0]

      this.logger.debug('[ConversationService] 找到活跃会话', {
        conversationId: targetConversation.id,
        name: targetConversation.name,
      })

      return targetConversation
    } catch (error) {
      this.logger.error('[ConversationService] 查询活跃会话时发生错误', error)
      return null
    }
  }

  /**
   * 根据 ID 获取会话
   *
   * @description
   * 根据会话 ID 获取会话详情。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<Conversation | null>} 会话对象，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const conversation = await conversationService.getConversationById(1)
   * if (conversation) {
   *   console.log(`会话名称: ${conversation.name}`)
   * }
   * ```
   */
  async getConversationById(conversationId: number): Promise<Conversation | null> {
    try {
      this.logger.debug('[ConversationService] 根据 ID 查询会话', { conversationId })

      const conversations = await this.ctx.database.get('conversation', {
        id: conversationId,
      })

      return conversations[0] || null
    } catch (error) {
      this.logger.error('[ConversationService] 查询会话时发生错误', error)
      return null
    }
  }

  /**
   * 更新会话的最后更新时间
   *
   * @description
   * 当会话中有新消息或成员变动时，调用此方法更新 updated_at 字段。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<boolean>} 是否更新成功
   *
   * @example
   * ```typescript
   * await conversationService.updateTimestamp(1)
   * ```
   */
  async updateTimestamp(conversationId: number): Promise<boolean> {
    try {
      this.logger.debug('[ConversationService] 更新会话时间戳', { conversationId })

      await this.ctx.database.set('conversation', { id: conversationId }, {
        updated_at: new Date(),
      })

      return true
    } catch (error) {
      this.logger.error('[ConversationService] 更新时间戳时发生错误', error)
      return false
    }
  }

  /**
   * 更新用户的 conversations 列表
   *
   * @description
   * 将会话 ID 添加到用户的 conversations 列表中。
   * 如果列表中已存在该会话 ID，则不会重复添加。
   *
   * @param {number} userId - 用户 ID (Koishi 原生 userId)
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<boolean>} 是否更新成功
   *
   * @private
   */
  private async updateUserConversations(userId: number, conversationId: number): Promise<boolean> {
    try {
      this.logger.debug('[ConversationService] 更新用户 conversations 列表', {
        userId,
        conversationId,
      })

      // 查询用户是否存在
      const users = await this.ctx.database.get('user', { id: userId })

      if (users.length === 0) {
        this.logger.info('[ConversationService] 用户不存在，创建用户记录', { userId })

        // 创建用户记录
        await this.ctx.database.create('user', {
          id: userId,
          conversations: [conversationId],
        })

        this.logger.info('[ConversationService] 用户记录创建成功', {
          userId,
          conversations: [conversationId],
        })

        return true
      }

      // 获取用户的当前 conversations 列表
      const user = users[0]
      const conversations = user.conversations || []

      // 检查会话 ID 是否已存在
      if (conversations.includes(conversationId)) {
        this.logger.debug('[ConversationService] 会话 ID 已存在于用户的 conversations 列表中', {
          userId,
          conversationId,
        })
        return true
      }

      // 添加会话 ID 到列表
      const updatedConversations = [...conversations, conversationId]

      // 更新用户记录
      await this.ctx.database.set('user', { id: userId }, {
        conversations: updatedConversations,
      })

      this.logger.debug('[ConversationService] 用户 conversations 列表更新成功', {
        userId,
        conversations: updatedConversations,
      })

      return true
    } catch (error) {
      this.logger.error('[ConversationService] 更新用户 conversations 列表时发生错误', error)
      return false
    }
  }

  /**
   * 暂停会话
   *
   * @description
   * 将会话状态设置为 PAUSED，暂停消息记录。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<boolean>} 是否更新成功
   *
   * @example
   * ```typescript
   * const success = await conversationService.pauseConversation(1)
   * ```
   */
  async pauseConversation(conversationId: number): Promise<boolean> {
    try {
      this.logger.info('[ConversationService] 暂停会话', { conversationId })

      await this.ctx.database.set('conversation', { id: conversationId }, {
        status: ConversationStatus.PAUSED,
        updated_at: new Date(),
      })

      return true
    } catch (error) {
      this.logger.error('[ConversationService] 暂停会话时发生错误', error)
      return false
    }
  }

  /**
   * 恢复会话
   *
   * @description
   * 将会话状态从 PAUSED 改回 ACTIVE，恢复消息记录。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<boolean>} 是否更新成功
   *
   * @example
   * ```typescript
   * const success = await conversationService.resumeConversation(1)
   * ```
   */
  async resumeConversation(conversationId: number): Promise<boolean> {
    try {
      this.logger.info('[ConversationService] 恢复会话', { conversationId })

      await this.ctx.database.set('conversation', { id: conversationId }, {
        status: ConversationStatus.ACTIVE,
        updated_at: new Date(),
      })

      return true
    } catch (error) {
      this.logger.error('[ConversationService] 恢复会话时发生错误', error)
      return false
    }
  }

  /**
   * 结束会话
   *
   * @description
   * 将会话状态设置为 ENDED，永久终止会话。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<boolean>} 是否更新成功
   *
   * @example
   * ```typescript
   * const success = await conversationService.endConversation(1)
   * ```
   */
  async endConversation(conversationId: number): Promise<boolean> {
    try {
      this.logger.info('[ConversationService] 结束会话', { conversationId })

      await this.ctx.database.set('conversation', { id: conversationId }, {
        status: ConversationStatus.ENDED,
        updated_at: new Date(),
      })

      return true
    } catch (error) {
      this.logger.error('[ConversationService] 结束会话时发生错误', error)
      return false
    }
  }

  /**
   * 获取频道的所有会话
   *
   * @description
   * 查询指定频道的所有会话（包括活跃、暂停和已结束的）。
   *
   * @param {GetActiveConversationParams} params - 频道参数
   * @returns {Promise<Conversation[]>} 会话列表
   *
   * @example
   * ```typescript
   * const conversations = await conversationService.getChannelConversations({
   *   channel: {
   *     platform: 'discord',
   *     guildId: '123456789',
   *     channelId: '987654321'
   *   }
   * })
   *
   * console.log(`找到 ${conversations.length} 个会话`)
   * ```
   */
  async getChannelConversations(params: GetActiveConversationParams): Promise<Conversation[]> {
    try {
      this.logger.debug('[ConversationService] 查询频道的所有会话', {
        channel: params.channel,
      })

      // 查询所有会话
      const allConversations = await this.ctx.database.get('conversation', {})

      this.logger.debug('[ConversationService] 查询到总会话数量', {
        count: allConversations.length,
      })

      // 过滤出包含指定频道的会话（使用中间表优化查询）
      const channelLinks = await this.ctx.database.get('conversation_channel', {
        platform: params.channel.platform,
        guild_id: params.channel.guildId,
        channel_id: params.channel.channelId,
      })

      if (channelLinks.length === 0) {
        this.logger.debug('[ConversationService] 该频道未关联到任何会话')
        return []
      }

      // 查询这些会话的详细信息
      const channelConversations = await this.ctx.database.get('conversation', {
        id: channelLinks.map(link => link.conversation_id),
      })

      this.logger.debug('[ConversationService] 查询到频道会话数量', {
        count: channelConversations.length,
      })

      return channelConversations
    } catch (error) {
      this.logger.error('[ConversationService] 查询频道会话时发生错误', error)
      return []
    }
  }
}

/**
 * 创建会话管理服务实例的工厂函数
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {ConversationService} 会话管理服务实例
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { createConversationService } from './core/conversation.service'
 *
 * export function apply(ctx: Context) {
 *   const conversationService = createConversationService(ctx)
 *   // 使用服务...
 * }
 * ```
 */
export function createConversationService(ctx: Context): ConversationService {
  return new ConversationService(ctx)
}
