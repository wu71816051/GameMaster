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
   * 迁移 character.conversation_id 数据到 conversation_character 表
   *
   * @description
   * 读取所有 character 的 conversation_id 和 is_active 字段，
   * 将这些数据迁移到 conversation_character 中间表。
   *
   * @returns {Promise<{success: boolean, migrated: number, errors: string[]}>}
   */
  async migrateCharacterToIntermediateTable(): Promise<{
    success: boolean
    migrated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migrated = 0

    try {
      this.logger.info('[MigrationService] 开始迁移 character.conversation_id 数据')

      // 1. 查询所有有 conversation_id 的角色
      const characters = await this.ctx.database.get('character', {})

      // 过滤出有 conversation_id 的角色
      const charactersWithConversation = characters.filter(
        (char: any) => char.conversation_id !== null && char.conversation_id !== undefined && char.conversation_id !== 0
      )

      this.logger.info('[MigrationService] 查询到需要迁移的角色数量', {
        total: characters.length,
        withConversation: charactersWithConversation.length,
      })

      // 2. 遍历每个角色，迁移到 conversation_character 表
      for (const char of charactersWithConversation) {
        try {
          const charAny = char as any

          // 检查是否已存在关联（避免重复迁移）
          const existing = await this.ctx.database.get('conversation_character', {
            conversation_id: charAny.conversation_id,
            character_id: charAny.id,
          })

          if (existing.length > 0) {
            this.logger.debug('[MigrationService] 角色关联已存在，跳过', {
              characterId: charAny.id,
              conversationId: charAny.conversation_id,
            })
            continue
          }

          this.logger.debug('[MigrationService] 迁移角色数据', {
            characterId: charAny.id,
            characterName: charAny.name,
            conversationId: charAny.conversation_id,
            isActive: charAny.is_active,
          })

          // 创建关联记录
          await this.ctx.database.create('conversation_character', {
            conversation_id: charAny.conversation_id,
            character_id: charAny.id,
            is_active: charAny.is_active || false,
            joined_at: charAny.created_at || new Date(),
            archived: false,
            archived_at: null,
            current_player_id: charAny.user_id,
            character_type: 'pc',
          })

          migrated++
        } catch (error) {
          const errorMsg = `迁移角色 ${char.id} 时发生错误: ${error instanceof Error ? error.message : '未知错误'}`
          this.logger.error('[MigrationService] ' + errorMsg, error)
          errors.push(errorMsg)
        }
      }

      this.logger.info('[MigrationService] 角色迁移完成', {
        total: charactersWithConversation.length,
        migrated,
        errors: errors.length,
      })

      return {
        success: errors.length === 0,
        migrated,
        errors,
      }
    } catch (error) {
      this.logger.error('[MigrationService] 角色迁移过程发生错误', error)

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
   * 验证角色迁移结果
   *
   * @description
   * 检查所有有 conversation_id 的角色是否都已迁移到 conversation_character 表。
   *
   * @returns {Promise<{valid: boolean, characterCount: number, linkCount: number, missing: number[]}>}
   */
  async validateCharacterMigration(): Promise<{
    valid: boolean
    characterCount: number
    linkCount: number
    missing: number[]
  }> {
    try {
      this.logger.info('[MigrationService] 开始验证角色迁移结果')

      // 1. 统计有 conversation_id 的角色数
      const characters = await this.ctx.database.get('character', {})
      const charactersWithConversation = characters.filter(
        (char: any) => char.conversation_id !== null && char.conversation_id !== undefined && char.conversation_id !== 0
      )
      const characterCount = charactersWithConversation.length

      this.logger.info('[MigrationService] 需要迁移的角色数量', {
        count: characterCount,
      })

      // 2. 统计 conversation_character 记录数
      const links = await this.ctx.database.get('conversation_character', {})
      const linkCount = links.length

      this.logger.info('[MigrationService] conversation_character 记录数', {
        count: linkCount,
      })

      // 3. 检查是否所有角色都已迁移
      const missing: number[] = []

      for (const char of charactersWithConversation) {
        const charAny = char as any
        const exists = await this.ctx.database.get('conversation_character', {
          conversation_id: charAny.conversation_id,
          character_id: charAny.id,
        })

        if (exists.length === 0) {
          missing.push(charAny.id)
          this.logger.warn('[MigrationService] 发现缺失的角色关联', {
            characterId: charAny.id,
            characterName: charAny.name,
            conversationId: charAny.conversation_id,
          })
        }
      }

      const valid = missing.length === 0

      this.logger.info('[MigrationService] 角色迁移验证完成', {
        valid,
        characterCount,
        linkCount,
        missing: missing.length,
      })

      return {
        valid,
        characterCount,
        linkCount,
        missing,
      }
    } catch (error) {
      this.logger.error('[MigrationService] 角色迁移验证过程发生错误', error)

      return {
        valid: false,
        characterCount: 0,
        linkCount: 0,
        missing: [],
      }
    }
  }

  /**
   * 验证迁移结果（conversation.channels）
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
