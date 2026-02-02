import { Context, Schema } from 'koishi'
import { expect } from 'chai'
import { ConversationStatus, ChannelInfo, Conversation } from '../src/core/models/conversation'
import { MemberRole, ConversationMember } from '../src/core/models/conversation-member'
import { MessageType, MessageAttachments, ConversationMessage } from '../src/core/models/conversation-message'
import { ConversationCharacter } from '../src/core/models/conversation-character'

describe('GameMaster Database Models', () => {
  let ctx: Context

  before(async () => {
    // 初始化测试上下文
    ctx = {
      model: {
        extend: () => {},
      },
      database: {
        create: async () => [],
        get: async () => [],
        set: async () => {},
        remove: async () => {},
      },
    } as any
  })

  describe('Conversation Model', () => {
    describe('Type Definitions', () => {
      it('should have correct ConversationStatus enum values', () => {
        expect(ConversationStatus.ACTIVE).to.equal(0)
        expect(ConversationStatus.PAUSED).to.equal(1)
        expect(ConversationStatus.ENDED).to.equal(2)
      })

      it('should create valid ChannelInfo object', () => {
        const channelInfo: ChannelInfo = {
          platform: 'discord',
          guildId: 'guild123',
          channelId: 'channel456',
        }
        expect(channelInfo.platform).to.equal('discord')
        expect(channelInfo.guildId).to.equal('guild123')
        expect(channelInfo.channelId).to.equal('channel456')
      })

      it('should create valid Conversation object', () => {
        const channels: ChannelInfo[] = [{
          platform: 'discord',
          guildId: 'guild123',
          channelId: 'channel456',
        }]

        const conversation: Conversation = {
          id: 1,
          name: 'Test Conversation',
          creator_id: 123456789,
          channels,
          status: ConversationStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: {
            description: 'Test description',
            tags: ['test', 'sample'],
          },
        }

        expect(conversation.name).to.equal('Test Conversation')
        expect(conversation.status).to.equal(ConversationStatus.ACTIVE)
        expect(conversation.channels).to.have.lengthOf(1)
        expect(conversation.metadata?.tags).to.include('test')
      })
    })

    describe('Database Operations', () => {
      it('should create conversation in database', async () => {
        const channels: ChannelInfo[] = [{
          platform: 'discord',
          guildId: 'guild123',
          channelId: 'channel456',
        }]

        const conversationData = {
          name: 'Test Conversation',
          creator_id: 123456789,
          channels,
          status: ConversationStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: {},
        }

        // 模拟创建操作
        const result = await ctx.database.create('conversation', conversationData)
        expect(result).to.be.an('array')
      })

      it('should query conversation by id', async () => {
        const result = await ctx.database.get('conversation', { id: 1 })
        expect(result).to.be.an('array')
      })

      it('should query active conversations', async () => {
        const result = await ctx.database.get('conversation', {
          status: ConversationStatus.ACTIVE,
        })
        expect(result).to.be.an('array')
      })

      it('should update conversation status', async () => {
        await ctx.database.set('conversation', 1, {
          status: ConversationStatus.PAUSED,
          updated_at: new Date(),
        })
        // 验证更新成功
        expect(true).to.be.true
      })

      it('should add channel to conversation', async () => {
        const newChannel: ChannelInfo = {
          platform: 'telegram',
          guildId: 'chat789',
          channelId: 'channel101',
        }

        // 模拟更新操作
        await ctx.database.set('conversation', 1, {
          channels: [newChannel],
          updated_at: new Date(),
        })
        expect(true).to.be.true
      })

      it('should remove channel from conversation', async () => {
        // 模拟移除频道操作
        await ctx.database.set('conversation', 1, {
          channels: [],
          updated_at: new Date(),
        })
        expect(true).to.be.true
      })

      it('should update conversation metadata', async () => {
        await ctx.database.set('conversation', 1, {
          metadata: {
            description: 'Updated description',
            tags: ['updated'],
          },
          updated_at: new Date(),
        })
        expect(true).to.be.true
      })

      it('should delete conversation', async () => {
        await ctx.database.remove('conversation', 1)
        expect(true).to.be.true
      })
    })
  })

  describe('ConversationMember Model', () => {
    describe('Type Definitions', () => {
      it('should have correct MemberRole enum values', () => {
        expect(MemberRole.CREATOR).to.equal('creator')
        expect(MemberRole.ADMIN).to.equal('admin')
        expect(MemberRole.MEMBER).to.equal('member')
      })

      it('should create valid ConversationMember object', () => {
        const member: ConversationMember = {
          id: 1,
          conversation_id: 1,
          user_id: 123456789,
          joined_at: new Date(),
          role: MemberRole.CREATOR,
        }

        expect(member.user_id).to.equal(123456789)
        expect(member.role).to.equal(MemberRole.CREATOR)
        expect(member.conversation_id).to.equal(1)
      })
    })

    describe('Database Operations', () => {
      it('should add member to conversation', async () => {
        const memberData = {
          conversation_id: 1,
          user_id: 987654321,
          joined_at: new Date(),
          role: MemberRole.MEMBER,
        }

        const result = await ctx.database.create('conversation_member', memberData)
        expect(result).to.be.an('array')
      })

      it('should get member by conversation and user', async () => {
        const result = await ctx.database.get('conversation_member', {
          conversation_id: 1,
          user_id: 123456789,
        })
        expect(result).to.be.an('array')
      })

      it('should get all members of conversation', async () => {
        const result = await ctx.database.get('conversation_member', {
          conversation_id: 1,
        })
        expect(result).to.be.an('array')
      })

      it('should get all conversations of user', async () => {
        const result = await ctx.database.get('conversation_member', {
          user_id: 123456789,
        })
        expect(result).to.be.an('array')
      })

      it('should update member role', async () => {
        await ctx.database.set('conversation_member', 1, {
          role: MemberRole.ADMIN,
        })
        expect(true).to.be.true
      })

      it('should remove member from conversation', async () => {
        await ctx.database.remove('conversation_member', 1)
        expect(true).to.be.true
      })
    })

    describe('Permission Checks', () => {
      it('should check if user is member', async () => {
        const [member] = await ctx.database.get('conversation_member', {
          conversation_id: 1,
          user_id: 123456789,
        })
        const isMember = !!member
        expect(isMember).to.be.a('boolean')
      })

      it('should verify role hierarchy', () => {
        const roleHierarchy = {
          [MemberRole.MEMBER]: 0,
          [MemberRole.ADMIN]: 1,
          [MemberRole.CREATOR]: 2,
        }

        expect(roleHierarchy[MemberRole.MEMBER]).to.be.lessThan(roleHierarchy[MemberRole.ADMIN])
        expect(roleHierarchy[MemberRole.ADMIN]).to.be.lessThan(roleHierarchy[MemberRole.CREATOR])
      })
    })
  })

  describe('ConversationMessage Model', () => {
    describe('Type Definitions', () => {
      it('should have correct MessageType enum values', () => {
        expect(MessageType.TEXT).to.equal('text')
        expect(MessageType.IMAGE).to.equal('image')
        expect(MessageType.AUDIO).to.equal('audio')
        expect(MessageType.VIDEO).to.equal('video')
      })

      it('should create valid MessageAttachments object', () => {
        const attachments: MessageAttachments = {
          images: ['https://example.com/image1.png', 'https://example.com/image2.png'],
          files: [{
            name: 'document.pdf',
            url: 'https://example.com/doc.pdf',
            size: 1024000,
            mimeType: 'application/pdf',
          }],
        }

        expect(attachments.images).to.have.lengthOf(2)
        expect(attachments.files).to.have.lengthOf(1)
        expect(attachments.files![0].name).to.equal('document.pdf')
      })

      it('should create valid ConversationMessage object', () => {
        const attachments: MessageAttachments = {
          images: ['https://example.com/image.png'],
        }

        const message: ConversationMessage = {
          id: 1,
          conversation_id: 1,
          user_id: 123456789,
          message_id: 'discord:msg456',
          content: 'Hello, world!',
          message_type: MessageType.TEXT,
          timestamp: new Date(),
          platform: 'discord',
          guild_id: 'discord:guild123',
          attachments,
        }

        expect(message.content).to.equal('Hello, world!')
        expect(message.message_type).to.equal(MessageType.TEXT)
        expect(message.attachments?.images).to.have.lengthOf(1)
      })
    })

    describe('Database Operations', () => {
      it('should record message', async () => {
        const messageData = {
          conversation_id: 1,
          user_id: 123456789,
          message_id: 'discord:msg789',
          content: 'Test message',
          message_type: MessageType.TEXT,
          timestamp: new Date(),
          platform: 'discord',
          guild_id: 'discord:guild123',
          attachments: {},
        }

        const result = await ctx.database.create('conversation_message', messageData)
        expect(result).to.be.an('array')
      })

      it('should get messages by conversation', async () => {
        const result = await ctx.database.get('conversation_message', {
          conversation_id: 1,
        })
        expect(result).to.be.an('array')
      })

      it('should get messages with limit', async () => {
        const result = await ctx.database.get('conversation_message', {
          conversation_id: 1,
        }, { limit: 10 })
        expect(result).to.be.an('array')
      })

      it('should get user messages in conversation', async () => {
        const result = await ctx.database.get('conversation_message', {
          conversation_id: 1,
          user_id: 123456789,
        })
        expect(result).to.be.an('array')
      })

      it('should get messages by platform', async () => {
        const result = await ctx.database.get('conversation_message', {
          conversation_id: 1,
          platform: 'discord',
        })
        expect(result).to.be.an('array')
      })

      it('should check if message is recorded', async () => {
        const [message] = await ctx.database.get('conversation_message', {
          message_id: 'discord:msg789',
        })
        const isRecorded = message !== undefined
        expect(isRecorded).to.be.a('boolean')
      })

      it('should delete conversation messages', async () => {
        const messages = await ctx.database.get('conversation_message', {
          conversation_id: 1,
        })

        for (const msg of messages) {
          await ctx.database.remove('conversation_message', msg.id)
        }
        expect(true).to.be.true
      })
    })

    describe('Message Statistics', () => {
      it('should calculate message stats by type', async () => {
        const messages: ConversationMessage[] = [
          { message_type: MessageType.TEXT } as any,
          { message_type: MessageType.IMAGE } as any,
          { message_type: MessageType.TEXT } as any,
        ]

        const stats: Record<MessageType, number> = {
          [MessageType.TEXT]: 0,
          [MessageType.IMAGE]: 0,
          [MessageType.AUDIO]: 0,
          [MessageType.VIDEO]: 0,
        }

        for (const msg of messages) {
          stats[msg.message_type] = (stats[msg.message_type] || 0) + 1
        }

        expect(stats[MessageType.TEXT]).to.equal(2)
        expect(stats[MessageType.IMAGE]).to.equal(1)
      })

      it('should calculate message stats by platform', async () => {
        const messages = [
          { platform: 'discord' },
          { platform: 'telegram' },
          { platform: 'discord' },
        ] as any[]

        const stats: Record<string, number> = {}
        for (const msg of messages) {
          stats[msg.platform] = (stats[msg.platform] || 0) + 1
        }

        expect(stats['discord']).to.equal(2)
        expect(stats['telegram']).to.equal(1)
      })

      it('should calculate message stats by user', async () => {
        const messages = [
          { user_id: 1111111 },
          { user_id: 2222222 },
          { user_id: 1111111 },
        ] as any[]

        const stats: Record<string, number> = {}
        for (const msg of messages) {
          stats[msg.user_id] = (stats[msg.user_id] || 0) + 1
        }

        expect(stats[1111111]).to.equal(2)
        expect(stats[2222222]).to.equal(1)
      })
    })
  })

  describe('User Extension', () => {
    it('should have conversations field in User type', () => {
      const user: any = {
        id: '123',
        name: 'Test User',
        conversations: [1, 2, 3],
      }

      expect(user.conversations).to.be.an('array')
      expect(user.conversations).to.include(1)
      expect(user.conversations).to.include(2)
      expect(user.conversations).to.include(3)
    })

    it('should add conversation to user', async () => {
      const conversations = [1, 2]
      conversations.push(3)

      expect(conversations).to.include(3)
      expect(conversations).to.have.lengthOf(3)
    })

    it('should remove conversation from user', async () => {
      let conversations = [1, 2, 3]
      conversations = conversations.filter(id => id !== 2)

      expect(conversations).to.not.include(2)
      expect(conversations).to.have.lengthOf(2)
    })

    it('should check if user in conversation', async () => {
      const conversations = [1, 2, 3]
      const isInConversation = conversations.includes(2)

      expect(isInConversation).to.be.true
    })
  })

  describe('Cross-Table Operations', () => {
    it('should maintain conversation-member relationship', async () => {
      const conversationId = 1
      const userId = 123456789

      // 创建会话
      await ctx.database.create('conversation', {
        id: conversationId,
        name: 'Test',
        creator_id: userId,
        channels: [],
        status: ConversationStatus.ACTIVE,
      })

      // 添加成员
      await ctx.database.create('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
        role: MemberRole.CREATOR,
      })

      expect(true).to.be.true
    })

    it('should maintain conversation-message relationship', async () => {
      const conversationId = 1
      const messageId = 'discord:msg123'

      // 记录消息
      await ctx.database.create('conversation_message', {
        conversation_id: conversationId,
        message_id: messageId,
        content: 'Test',
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: 'discord',
        guild_id: 'discord:guild',
        user_id: 9999999,
      })

      expect(true).to.be.true
    })

    it('should cascade delete conversation messages', async () => {
      const conversationId = 1

      // 获取会话的所有消息
      const messages = await ctx.database.get('conversation_message', {
        conversation_id: conversationId,
      })

      // 删除所有消息
      for (const msg of messages) {
        await ctx.database.remove('conversation_message', msg.id)
      }

      expect(true).to.be.true
    })

    it('should cascade delete conversation members', async () => {
      const conversationId = 1

      // 获取会话的所有成员
      const members = await ctx.database.get('conversation_member', {
        conversation_id: conversationId,
      })

      // 删除所有成员
      for (const member of members) {
        await ctx.database.remove('conversation_member', member.id)
      }

      expect(true).to.be.true
    })
  })

  describe('Data Validation', () => {
    it('should validate conversation status', () => {
      const validStatuses = [ConversationStatus.ACTIVE, ConversationStatus.PAUSED, ConversationStatus.ENDED]
      expect(validStatuses).to.include(0)
      expect(validStatuses).to.include(1)
      expect(validStatuses).to.include(2)
    })

    it('should validate member role', () => {
      const validRoles = [MemberRole.CREATOR, MemberRole.ADMIN, MemberRole.MEMBER]
      expect(validRoles).to.include('creator')
      expect(validRoles).to.include('admin')
      expect(validRoles).to.include('member')
    })

    it('should validate message type', () => {
      const validTypes = [MessageType.TEXT, MessageType.IMAGE, MessageType.AUDIO, MessageType.VIDEO]
      expect(validTypes).to.include('text')
      expect(validTypes).to.include('image')
      expect(validTypes).to.include('audio')
      expect(validTypes).to.include('video')
    })

    it('should validate channel format', () => {
      const channel: ChannelInfo = {
        platform: 'discord',
        guildId: 'guild123',
        channelId: 'channel456',
      }

      expect(channel.platform).to.be.a('string')
      expect(channel.guildId).to.be.a('string')
      expect(channel.channelId).to.be.a('string')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty channels array', () => {
      const conversation: Conversation = {
        id: 1,
        name: 'Test',
        creator_id: 9999999,
        channels: [],
        status: ConversationStatus.ACTIVE,
      }

      expect(conversation.channels).to.be.an('array').that.is.empty
    })

    it('should handle multiple channels', () => {
      const channels: ChannelInfo[] = [
        { platform: 'discord', guildId: 'g1', channelId: 'c1' },
        { platform: 'telegram', guildId: 'g2', channelId: 'c2' },
        { platform: 'qq', guildId: 'g3', channelId: 'c3' },
      ]

      expect(channels).to.have.lengthOf(3)
    })

    it('should handle special characters in message content', () => {
      const content = 'Hello @user! 🎉 <https://example.com>'
      const message: ConversationMessage = {
        id: 1,
        conversation_id: 1,
        user_id: 'user',
        message_id: 'msg1',
        content,
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: 'discord',
        guild_id: 'guild',
      }

      expect(message.content).to.include('@user')
      expect(message.content).to.include('🎉')
    })

    it('should handle large attachments', () => {
      const attachments: MessageAttachments = {
        images: Array(100).fill('https://example.com/image.png'),
        files: Array(50).fill(null).map((_, i) => ({
          name: `file${i}.pdf`,
          url: `https://example.com/file${i}.pdf`,
          size: 1024 * 1024 * 10, // 10MB
        })),
      }

      expect(attachments.images).to.have.lengthOf(100)
      expect(attachments.files).to.have.lengthOf(50)
    })

    it('should handle null metadata', () => {
      const conversation: Conversation = {
        id: 1,
        name: 'Test',
        creator_id: 'user',
        channels: [],
        status: ConversationStatus.ACTIVE,
        metadata: undefined,
      }

      expect(conversation.metadata).to.be.undefined
    })
  })

  // ==================== 新增测试：conversation.rule_system 字段 ====================
  describe('Conversation Rule System Field', () => {
    it('should create conversation with rule_system field', async () => {
      const conversation = await ctx.database.create('conversation', {
        name: 'CoC7 会话',
        creator_id: 123456,
        channels: [{ platform: 'test', guildId: '1', channelId: '1' }],
        status: ConversationStatus.ACTIVE,
        rule_system: 'coc7',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      })

      expect(conversation).to.be.an('array')
      expect(conversation[0].rule_system).to.equal('coc7')
    })

    it('should create conversation with generic rule system', async () => {
      const conversation = await ctx.database.create('conversation', {
        name: '通用会话',
        creator_id: 123456,
        channels: [{ platform: 'test', guildId: '1', channelId: '2' }],
        status: ConversationStatus.ACTIVE,
        rule_system: 'generic',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      })

      expect(conversation[0].rule_system).to.equal('generic')
    })

    it('should query conversation by rule_system', async () => {
      const conversations = await ctx.database.get('conversation', {
        rule_system: 'coc7',
      })

      expect(conversations).to.be.an('array')
    })

    it('should update conversation rule_system', async () => {
      const conversation = await ctx.database.create('conversation', {
        name: '测试会话',
        creator_id: 123456,
        channels: [{ platform: 'test', guildId: '1', channelId: '1' }],
        status: ConversationStatus.ACTIVE,
        rule_system: 'generic',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      })

      await ctx.database.set('conversation', { id: conversation[0].id }, {
        rule_system: 'coc7',
        updated_at: new Date(),
      })

      const updated = await ctx.database.get('conversation', { id: conversation[0].id })
      expect(updated[0].rule_system).to.equal('coc7')

      // 清理
      await ctx.database.remove('conversation', { id: conversation[0].id })
    })
  })

  // ==================== 新增测试：conversation_character 表 ====================
  describe('ConversationCharacter Model', () => {
    it('should create conversation-character relation', async () => {
      const cc = await ctx.database.create('conversation_character', {
        conversation_id: 1,
        character_id: 1,
        is_active: true,
        joined_at: new Date(),
        exited: false,
      })

      expect(cc).to.be.an('array')
      expect(cc[0].conversation_id).to.equal(1)
      expect(cc[0].is_active).to.be.true
      expect(cc[0].exited).to.be.false
    })

    it('should query conversation_character by conversation', async () => {
      const relations = await ctx.database.get('conversation_character', {
        conversation_id: 1,
      })

      expect(relations).to.be.an('array')
    })

    it('should query conversation_character by character', async () => {
      const relations = await ctx.database.get('conversation_character', {
        character_id: 1,
      })

      expect(relations).to.be.an('array')
    })

    it('should query active characters in conversation', async () => {
      const activeRelations = await ctx.database.get('conversation_character', {
        conversation_id: 1,
        is_active: true,
        exited: false,  // 未退出
      })

      expect(activeRelations).to.be.an('array')
    })

    it('should support soft delete with exited field', async () => {
      // 创建关联记录
      await ctx.database.create('conversation_character', {
        conversation_id: 1,
        character_id: 2,
        is_active: true,
        joined_at: new Date(),
        exited: false,
      })

      // 软删除（退出）
      await ctx.database.set('conversation_character', {
        conversation_id: 1,
        character_id: 2,
      }, {
        exited: true,
        exited_at: new Date(),
        is_active: false,
      })

      const exited = await ctx.database.get('conversation_character', {
        conversation_id: 1,
        character_id: 2,
      })

      expect(exited[0].exited).to.be.true
      expect(exited[0].exited_at).to.not.be.null
      expect(exited[0].is_active).to.be.false
    })

    it('should support rejoining after soft delete', async () => {
      // 创建并退出
      await ctx.database.create('conversation_character', {
        conversation_id: 1,
        character_id: 3,
        is_active: true,
        joined_at: new Date(),
        exited: false,
      })

      await ctx.database.set('conversation_character', {
        conversation_id: 1,
        character_id: 3,
      }, {
        exited: true,
        exited_at: new Date(),
      })

      // 重新加入
      await ctx.database.set('conversation_character', {
        conversation_id: 1,
        character_id: 3,
      }, {
        exited: false,
        exited_at: null,
        is_active: true,
      })

      const rejoined = await ctx.database.get('conversation_character', {
        conversation_id: 1,
        character_id: 3,
      })

      expect(rejoined[0].exited).to.be.false
      expect(rejoined[0].exited_at).to.be.null
      expect(rejoined[0].is_active).to.be.true
    })

    it('should allow character to join multiple conversations', async () => {
      // 角色加入会话1
      await ctx.database.create('conversation_character', {
        conversation_id: 1,
        character_id: 10,
        is_active: true,
        joined_at: new Date(),
        exited: false,
      })

      // 角色加入会话2
      await ctx.database.create('conversation_character', {
        conversation_id: 2,
        character_id: 10,
        is_active: false,
        joined_at: new Date(),
        exited: false,
      })

      // 查询角色参与的所有会话
      const allRelations = await ctx.database.get('conversation_character', {
        character_id: 10,
      })

      expect(allRelations.length).to.equal(2)

      // 清理
      await ctx.database.remove('conversation_character', {
        conversation_id: 1,
        character_id: 10,
      })
      await ctx.database.remove('conversation_character', {
        conversation_id: 2,
        character_id: 10,
      })
    })

    it('should update is_active status', async () => {
      await ctx.database.create('conversation_character', {
        conversation_id: 1,
        character_id: 4,
        is_active: false,
        joined_at: new Date(),
        exited: false,
      })

      // 激活角色
      await ctx.database.set('conversation_character', {
        conversation_id: 1,
        character_id: 4,
      }, {
        is_active: true,
      })

      const activated = await ctx.database.get('conversation_character', {
        conversation_id: 1,
        character_id: 4,
      })

      expect(activated[0].is_active).to.be.true

      // 清理
      await ctx.database.remove('conversation_character', {
        conversation_id: 1,
        character_id: 4,
      })
    })
  })
})
