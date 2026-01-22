/**
 * 数据迁移服务
 *
 * @description
 * 负责将 conversation.channels 字段的数据迁移到 conversation_channel 中间表。
 * 这是一个一次性迁移操作，迁移完成后 conversation.channels 字段可以保留用于历史兼容。
 *
 * @module core/services/migration.service
 */

import { Context } from 'koishi'
import { Conversation } from '../models/conversation'
import { ConversationChannel } from '../models/conversation-channel'

/**
 * 数据迁移服务类
 */
export class MigrationService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  /**
   * 迁移 conversation.channels 数据到 conversation_channel 表
   *
   * @description
   * 读取所有 conversation 的 channels 字段（JSON 数组），
   * 将每个频道信息写入 conversation_channel 中间表。
   *
   * @returns {Promise<{success: boolean, migrated: number, errors: string[]}>}
   */
  async migrateChannelsToIntermediateTable(): Promise<{
    success: boolean
    migrated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migrated = 0

    try {
      this.logger.info('[MigrationService] 开始迁移 conversation.channels 数据')

      // 1. 查询所有会话
      const conversations = await this.ctx.database.get('conversation', {})

      this.logger.info('[MigrationService] 查询到会话数量', {
        count: conversations.length,
      })

      // 2. 遍历每个会话，迁移 channels 数据
      for (const conv of conversations) {
        try {
          // channels 现在是 ChannelInfo[] 类型（已反序列化）
          const channels: Array<{ platform: string; guildId: string; channelId: string }> = conv.channels as any

          if (!Array.isArray(channels) || channels.length === 0) {
            this.logger.debug('[MigrationService] 跳过无频道的会话', {
              conversationId: conv.id,
            })
            continue
          }

          this.logger.debug('[MigrationService] 迁移会话频道数据', {
            conversationId: conv.id,
            channelCount: channels.length,
          })

          // 3. 为每个频道创建 conversation_channel 记录
          for (const channel of channels) {
            // 检查是否已存在（避免重复迁移）
            const existing = await this.ctx.database.get('conversation_channel', {
              conversation_id: conv.id!,
              platform: channel.platform,
              guild_id: channel.guildId,
              channel_id: channel.channelId,
            })

            if (existing.length > 0) {
              this.logger.debug('[MigrationService] 频道记录已存在，跳过', {
                conversationId: conv.id,
                platform: channel.platform,
                guild_id: channel.guildId,
                channel_id: channel.channelId,
              })
              continue
            }

            // 创建中间表记录
            await this.ctx.database.create('conversation_channel', {
              conversation_id: conv.id!,
              platform: channel.platform,
              guild_id: channel.guildId,
              channel_id: channel.channelId,
              joined_at: conv.created_at || new Date(),
            })

            migrated++
          }
        } catch (error) {
          const errorMsg = `迁移会话 ${conv.id} 时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
          this.logger.error('[MigrationService] ' + errorMsg, error)
          errors.push(errorMsg)
        }
      }

      this.logger.info('[MigrationService] 迁移完成', {
        total: conversations.length,
        migrated,
        errors: errors.length,
      })

      return {
        success: errors.length === 0,
        migrated,
        errors,
      }
    } catch (error) {
      this.logger.error('[MigrationService] 迁移过程发生错误', error)

      return {
        success: false,
        migrated,
        errors: [
          ...errors,
          `迁移过程发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        ],
      }
    }
  }

  /**
   * 验证迁移结果
   *
   * @description
   * 对比 conversation.channels 和 conversation_channel 表的数据，
   * 确保所有频道都已正确迁移。
   *
   * @returns {Promise<{valid: boolean, conversationCount: number, channelCount: number, missing: number[]}>}
   */
  async validateMigration(): Promise<{
    valid: boolean
    conversationCount: number
    channelCount: number
    missing: number[]
  }> {
    try {
      this.logger.info('[MigrationService] 开始验证迁移结果')

      // 1. 统计 conversation_channel 表的记录数
      const channelLinks = await this.ctx.database.get('conversation_channel', {})
      const channelCount = channelLinks.length

      this.logger.info('[MigrationService] conversation_channel 记录数', {
        count: channelCount,
      })

      // 2. 查询所有会话
      const conversations = await this.ctx.database.get('conversation', {})
      const conversationCount = conversations.length

      this.logger.info('[MigrationService] conversation 记录数', {
        count: conversationCount,
      })

      // 3. 检查每个会话的频道是否都已迁移
      const missing: number[] = []

      for (const conv of conversations) {
        const channels: Array<{ platform: string; guildId: string; channelId: string }> = conv.channels as any

        if (!Array.isArray(channels) || channels.length === 0) {
          continue
        }

        // 检查该会话的所有频道是否都在中间表中
        for (const channel of channels) {
          const existing = await this.ctx.database.get('conversation_channel', {
            conversation_id: conv.id!,
            platform: channel.platform,
            guild_id: channel.guildId,
            channel_id: channel.channelId,
          })

          if (existing.length === 0) {
            missing.push(conv.id!)
            this.logger.warn('[MigrationService] 发现缺失的频道记录', {
              conversationId: conv.id,
              platform: channel.platform,
              guild_id: channel.guildId,
              channel_id: channel.channelId,
            })
          }
        }
      }

      const valid = missing.length === 0

      this.logger.info('[MigrationService] 验证完成', {
        valid,
        conversationCount,
        channelCount,
        missing: missing.length,
      })

      return {
        valid,
        conversationCount,
        channelCount,
        missing,
      }
    } catch (error) {
      this.logger.error('[MigrationService] 验证过程发生错误', error)

      return {
        valid: false,
        conversationCount: 0,
        channelCount: 0,
        missing: [],
      }
    }
  }
}
