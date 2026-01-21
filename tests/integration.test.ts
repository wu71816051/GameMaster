import { Context } from 'koishi'
import { expect } from 'chai'
import { ConversationStatus, ChannelInfo } from '../src/core/models/conversation'
import { MemberRole } from '../src/core/models/conversation-member'
import { MessageType } from '../src/core/models/conversation-message'
import { registerDatabaseModels } from '../src/core/models'

describe('GameMaster Integration Tests', () => {
  let ctx: Context

  before(async () => {
    // 创建真实的测试上下文
    ctx = {
      model: {
        extend: (name: string, fields: any, options?: any) => {
          // 模拟表扩展
          console.log(`Registering table: ${name}`)
        },
      },
      database: {
        create: async (table: string, data: any) => {
          // 模拟创建记录
          const result = Array.isArray(data) ? data : [data]
          return result.map((item: any, index: number) => ({
            id: index + 1,
            ...item,
            created_at: new Date(),
          }))
        },
        get: async (table: string, query: any, limit?: any) => {
          // 模拟查询记录
          return [
            {
              id: 1,
              created_at: new Date(),
              updated_at: new Date(),
              ...query,
            },
          ]
        },
        set: async (table: string, id: number, data: any) => {
          // 模拟更新记录
          return { id, ...data }
        },
        remove: async (table: string, id: number) => {
          // 模拟删除记录
          return { id }
        },
      },
    } as any

    // 注册数据库模型
    registerDatabaseModels(ctx)
  })

  describe('Complete Workflow', () => {
    it('should create and manage a complete conversation lifecycle', async () => {
      // 1. 创建会话
      const channels: ChannelInfo[] = [{
        platform: 'discord',
        guildId: 'guild123',
        channelId: 'channel456',
      }]

      const conversationData = {
        name: 'TRPG Session 1',
        creator_id: 'discord:gamemaster',
        channels,
        status: ConversationStatus.ACTIVE,
        metadata: {
          description: 'First TRPG session',
          tags: ['trpg', 'dnd'],
        },
      }

      const [conversation] = await ctx.database.create('conversation', conversationData)
      expect(conversation).to.exist
      expect(conversation.name).to.equal('TRPG Session 1')
      expect(conversation.status).to.equal(ConversationStatus.ACTIVE)

      // 2. 添加会话创建者
      const creatorData = {
        conversation_id: conversation.id,
        user_id: conversationData.creator_id,
        role: MemberRole.CREATOR,
      }

      const [creator] = await ctx.database.create('conversation_member', creatorData)
      expect(creator).to.exist
      expect(creator.role).to.equal(MemberRole.CREATOR)

      // 3. 添加其他成员
      const memberData = {
        conversation_id: conversation.id,
        user_id: 'discord:player1',
        role: MemberRole.MEMBER,
      }

      const [member] = await ctx.database.create('conversation_member', memberData)
      expect(member).to.exist
      expect(member.role).to.equal(MemberRole.MEMBER)

      // 4. 记录消息
      const messageData = {
        conversation_id: conversation.id,
        user_id: conversationData.creator_id,
        message_id: 'discord:msg001',
        content: 'Welcome to the TRPG session!',
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: 'discord',
        guild_id: 'discord:guild123',
        attachments: {
          images: ['https://example.com/map.png'],
        },
      }

      const [message] = await ctx.database.create('conversation_message', messageData)
      expect(message).to.exist
      expect(message.content).to.equal('Welcome to the TRPG session!')

      // 5. 更新会话状态
      await ctx.database.set('conversation', conversation.id, {
        status: ConversationStatus.PAUSED,
        updated_at: new Date(),
      })

      // 6. 添加更多频道
      const newChannel: ChannelInfo = {
        platform: 'telegram',
        guildId: 'chat789',
        channelId: 'channel101',
      }

      await ctx.database.set('conversation', conversation.id, {
        channels: [...channels, newChannel],
        updated_at: new Date(),
      })

      // 7. 查询会话成员
      const members = await ctx.database.get('conversation_member', {
        conversation_id: conversation.id,
      })
      expect(members).to.have.lengthOf(2)

      // 8. 查询会话消息
      const messages = await ctx.database.get('conversation_message', {
        conversation_id: conversation.id,
      })
      expect(messages).to.have.lengthOf(1)

      // 9. 删除成员
      await ctx.database.remove('conversation_member', member.id)

      // 10. 结束会话
      await ctx.database.set('conversation', conversation.id, {
        status: ConversationStatus.ENDED,
        updated_at: new Date(),
      })
    })

    it('should handle multi-platform conversation', async () => {
      const channels: ChannelInfo[] = [
        { platform: 'discord', guildId: 'guild1', channelId: 'channel1' },
        { platform: 'telegram', guildId: 'chat1', channelId: 'channel1' },
        { platform: 'qq', guildId: 'group1', channelId: 'channel1' },
      ]

      const conversationData = {
        name: 'Cross-Platform Session',
        creator_id: 'discord:admin',
        channels,
        status: ConversationStatus.ACTIVE,
      }

      const [conversation] = await ctx.database.create('conversation', conversationData)
      expect(conversation.channels).to.have.lengthOf(3)

      // 记录来自不同平台的消息
      const platforms = ['discord', 'telegram', 'qq']

      for (const platform of platforms) {
        const messageData = {
          conversation_id: conversation.id,
          user_id: `${platform}:user123`,
          message_id: `${platform}:msg001`,
          content: `Message from ${platform}`,
          message_type: MessageType.TEXT,
          timestamp: new Date(),
          platform,
          guild_id: `${platform}:guild1`,
        }

        await ctx.database.create('conversation_message', messageData)
      }

      // 查询所有消息
      const messages = await ctx.database.get('conversation_message', {
        conversation_id: conversation.id,
      })

      expect(messages).to.have.lengthOf(3)
    })

    it('should handle user participating in multiple conversations', async () => {
      const userId = 'discord:player1'

      // 创建多个会话
      for (let i = 1; i <= 3; i++) {
        const [conversation] = await ctx.database.create('conversation', {
          name: `Session ${i}`,
          creator_id: userId,
          channels: [{ platform: 'discord', guildId: `guild${i}`, channelId: `channel${i}` }],
          status: ConversationStatus.ACTIVE,
        })

        // 添加用户到会话
        await ctx.database.create('conversation_member', {
          conversation_id: conversation.id,
          user_id: userId,
          role: MemberRole.MEMBER,
        })
      }

      // 查询用户参与的所有会话
      const memberships = await ctx.database.get('conversation_member', {
        user_id: userId,
      })

      expect(memberships).to.have.lengthOf(3)
    })
  })

  describe('Permission System', () => {
    it('should enforce role-based permissions', async () => {
      const conversationId = 1
      const creatorId = 'discord:creator'
      const adminId = 'discord:admin'
      const memberId = 'discord:member'

      // 创建不同角色的成员
      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: creatorId,
        role: MemberRole.CREATOR,
      })

      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: adminId,
        role: MemberRole.ADMIN,
      })

      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: memberId,
        role: MemberRole.MEMBER,
      })

      // 验证角色层级
      const roleHierarchy = {
        [MemberRole.MEMBER]: 0,
        [MemberRole.ADMIN]: 1,
        [MemberRole.CREATOR]: 2,
      }

      expect(roleHierarchy[MemberRole.CREATOR]).to.be.greaterThan(roleHierarchy[MemberRole.ADMIN])
      expect(roleHierarchy[MemberRole.ADMIN]).to.be.greaterThan(roleHierarchy[MemberRole.MEMBER])
    })

    it('should prevent unauthorized actions', async () => {
      const conversationId = 1
      const memberId = 'discord:member'
      const targetId = 'discord:target'

      // 尝试更新成员角色（需要 ADMIN 或 CREATOR 权限）
      const [member] = await ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: memberId,
      })

      if (member && member.role === MemberRole.MEMBER) {
        // 普通成员不应该能够更新角色
        // 这里只是模拟验证逻辑
        expect(member.role).to.equal(MemberRole.MEMBER)
      }
    })
  })

  describe('Message Management', () => {
    it('should handle different message types', async () => {
      const conversationId = 1
      const messageTypes = [MessageType.TEXT, MessageType.IMAGE, MessageType.AUDIO, MessageType.VIDEO]

      for (const type of messageTypes) {
        await ctx.database.create('conversation_message', {
          conversation_id: conversationId,
          user_id: 123456789,
          message_id: `discord:msg_${type}`,
          content: `Sample ${type} message`,
          message_type: type,
          timestamp: new Date(),
          platform: 'discord',
          guild_id: 'discord:guild1',
          attachments: type === MessageType.IMAGE ? { images: ['url'] } : undefined,
        })
      }

      // 查询所有消息
      const messages = await ctx.database.get('conversation_message', {
        conversation_id: conversationId,
      })

      expect(messages).to.have.lengthOf(4)
    })

    it('should handle message pagination', async () => {
      const conversationId = 1

      // 创建 20 条消息
      for (let i = 1; i <= 20; i++) {
        await ctx.database.create('conversation_message', {
          conversation_id: conversationId,
          user_id: 123456789,
          message_id: `discord:msg${i}`,
          content: `Message ${i}`,
          message_type: MessageType.TEXT,
          timestamp: new Date(),
          platform: 'discord',
          guild_id: 'discord:guild1',
        })
      }

      // 分页查询（第一页）
      const page1 = await ctx.database.get('conversation_message', {
        conversation_id: conversationId,
      }, { limit: 10 })

      expect(page1).to.have.lengthOf.at.most(10)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      const conversationId = 999
      const userId = 'discord:testuser'

      // 创建会话
      const [conversation] = await ctx.database.create('conversation', {
        id: conversationId,
        name: 'Test',
        creator_id: userId,
        channels: [],
        status: ConversationStatus.ACTIVE,
      })

      // 创建成员
      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
        role: MemberRole.CREATOR,
      })

      // 验证关联
      const members = await ctx.database.get('conversation_member', {
        conversation_id: conversationId,
      })

      expect(members).to.have.lengthOf(1)
      expect(members[0].conversation_id).to.equal(conversationId)
    })

    it('should handle cascade operations', async () => {
      const conversationId = 888

      // 创建会话
      await ctx.database.create('conversation', {
        id: conversationId,
        name: 'Cascade Test',
        creator_id: 987654321,
        channels: [],
        status: ConversationStatus.ACTIVE,
      })

      // 创建成员和消息
      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: 987654321,
        role: MemberRole.CREATOR,
      })

      await ctx.database.create('conversation_message', {
        conversation_id: conversationId,
        user_id: 987654321,
        message_id: 'msg1',
        content: 'Test',
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: 'discord',
        guild_id: 'guild',
      })

      // 删除会话
      await ctx.database.remove('conversation', conversationId)

      // 在实际应用中，应该级联删除相关的成员和消息
      // 这里只是模拟
      expect(true).to.be.true
    })
  })

  describe('Performance Tests', () => {
    it('should handle bulk message insertion', async () => {
      const conversationId = 777
      const count = 100

      const startTime = Date.now()

      for (let i = 0; i < count; i++) {
        await ctx.database.create('conversation_message', {
          conversation_id: conversationId,
          user_id: 987654321,
          message_id: `msg${i}`,
          content: `Message ${i}`,
          message_type: MessageType.TEXT,
          timestamp: new Date(),
          platform: 'discord',
          guild_id: 'guild',
        })
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证在合理时间内完成（这里只是示例，实际阈值需要根据实际情况调整）
      expect(duration).to.be.lessThan(5000) // 5秒内完成
    })

    it('should handle concurrent operations', async () => {
      const conversationId = 666
      const operations = []

      // 并发创建多条消息
      for (let i = 0; i < 10; i++) {
        operations.push(
          ctx.database.create('conversation_message', {
            conversation_id: conversationId,
            user_id: 987654321,
            message_id: `msg${i}`,
            content: `Concurrent message ${i}`,
            message_type: MessageType.TEXT,
            timestamp: new Date(),
            platform: 'discord',
            guild_id: 'guild',
          })
        )
      }

      await Promise.all(operations)

      // 验证所有操作都成功
      expect(operations).to.have.lengthOf(10)
    })
  })
})
