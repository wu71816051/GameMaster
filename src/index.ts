import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import { DataService } from '@koishijs/console'
import {} from '@koishijs/plugin-console'
import { registerDatabaseModels } from './core/models'
import { applyMessageMiddleware } from './core/middleware/message-recorder'
import { registerCommands } from './core/commands'
import { Conversation, ConversationStatus, ChannelInfo } from './core/models/conversation'

export const name = 'gamemaster'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export const inject = ['database']

// 声明 Koishi 事件
declare module 'koishi' {
  interface Events {
    'gamemaster/conversation-added'(conversation: Conversation): void
    'gamemaster/conversation-updated'(conversation: Conversation): void
    'gamemaster/conversation-deleted'(conversationId: number): void
  }
}

// 声明控制台服务
declare module '@koishijs/console' {
  namespace Console {
    interface Services {
      conversations: ConversationData
    }
  }

  interface Events {
    'gamemaster/get-conversations'(): Promise<ConversationCard[]>
    'gamemaster/update-conversation'(id: number, data: Partial<Conversation>): Promise<void>
    'gamemaster/delete-conversation'(id: number): Promise<void>
    'gamemaster/get-conversation-members'(conversationId: number): Promise<ConversationMember[]>
    'gamemaster/get-conversation-messages'(conversationId: number): Promise<ConversationMessageData[]>
  }
}

export interface ConversationMember {
  id?: number
  conversation_id: number
  user_id: number
  role: string
  joined_at: Date
  user_name?: string
  pid?: string
  platform?: string
}

export interface ConversationMessageData {
  id?: number
  conversation_id: number
  user_id: number
  content: string
  content_type: string
  timestamp: Date
  user_name?: string
}

export interface ConversationCard {
  id: number
  name: string
  creator_id: number
  creator_name?: string
  creator_pid?: string
  creator_platform?: string
  channels: ChannelInfo[]
  status: ConversationStatus
  created_at: Date
  updated_at: Date
  metadata?: Record<string, any>
  member_count?: number
}

class ConversationData extends DataService<ConversationCard[]> {
  constructor(ctx: Context) {
    super(ctx, 'conversations')

    // 监听数据库变化来刷新数据
    ctx.on('gamemaster/conversation-added', () => this.refresh())
    ctx.on('gamemaster/conversation-updated', () => this.refresh())
    ctx.on('gamemaster/conversation-deleted', () => this.refresh())
  }

  async get(): Promise<ConversationCard[]> {
    // 获取所有会话
    const conversations = await this.ctx.database.get('conversation', {})

    // 获取成员数量
    const cards: ConversationCard[] = []
    for (const conv of conversations) {
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conv.id,
      })

      // 解析频道信息
      let channels: ChannelInfo[] = []
      try {
        channels = JSON.parse(conv.channels)
      } catch (e) {
        channels = []
      }

      // 获取创建者名称和 binding 信息
      let creator_name: string | undefined
      let creator_pid: string | undefined
      let creator_platform: string | undefined
      try {
        const users = await this.ctx.database.get('user', { id: conv.creator_id }, ['id', 'name'])
        if (users.length > 0) {
          creator_name = users[0].name
        }

        // 获取 binding 信息
        const bindings = await this.ctx.database.get('binding', { aid: conv.creator_id })
        if (bindings.length > 0) {
          creator_pid = bindings[0].pid
          creator_platform = bindings[0].platform
        }
      } catch (e) {
        // 忽略错误
      }

      cards.push({
        id: conv.id!,
        name: conv.name,
        creator_id: conv.creator_id,
        creator_name,
        creator_pid,
        creator_platform,
        channels,
        status: conv.status,
        created_at: conv.created_at!,
        updated_at: conv.updated_at!,
        metadata: conv.metadata,
        member_count: members.length,
      })
    }

    return cards
  }
}

export function apply(ctx: Context, config: Config) {
  // 注册数据库模型
  registerDatabaseModels(ctx)

  // 注册用户命令
  registerCommands(ctx)

  applyMessageMiddleware(ctx)

  ctx.inject(['console'], (ctx) => {
    // 创建数据服务
    const conversationData = new ConversationData(ctx)

    // 添加前端入口
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })

    // 注册事件监听器
    ctx.console.addListener('gamemaster/get-conversations', async () => {
      return await conversationData.get()
    })

    ctx.console.addListener('gamemaster/update-conversation', async (id, data) => {
      await ctx.database.set('conversation', { id }, data)
      conversationData.refresh()
    })

    ctx.console.addListener('gamemaster/delete-conversation', async (id) => {
      // 删除关联的成员
      const members = await ctx.database.get('conversation_member', { conversation_id: id })
      for (const member of members) {
        await ctx.database.remove('conversation_member', member.id!)
      }
      // 删除会话
      await ctx.database.remove('conversation', id)
      conversationData.refresh()
    })

    // 获取会话成员列表
    ctx.console.addListener('gamemaster/get-conversation-members', async (conversationId) => {
      const members = await ctx.database.get('conversation_member', {
        conversation_id: conversationId,
      })

      // 获取用户名称和 binding 信息
      const result: ConversationMember[] = []
      for (const member of members) {
        let user_name: string | undefined
        let pid: string | undefined
        let platform: string | undefined
        try {
          const users = await ctx.database.get('user', { id: member.user_id }, ['id', 'name'])
          if (users.length > 0) {
            user_name = users[0].name
          }

          // 获取 binding 信息
          const bindings = await ctx.database.get('binding', { aid: member.user_id })
          if (bindings.length > 0) {
            pid = bindings[0].pid
            platform = bindings[0].platform
          }
        } catch (e) {
          // 忽略错误
        }

        result.push({
          id: member.id,
          conversation_id: member.conversation_id,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at!,
          user_name,
          pid,
          platform,
        })
      }

      return result
    })

    // 获取会话消息列表
    ctx.console.addListener('gamemaster/get-conversation-messages', async (conversationId) => {
      const messages = await ctx.database.get('conversation_message', {
        conversation_id: conversationId,
      })

      // 获取用户名称
      const result: ConversationMessageData[] = []
      for (const msg of messages) {
        let user_name: string | undefined
        try {
          const users = await ctx.database.get('user', { id: msg.user_id }, ['id', 'name'])
          if (users.length > 0) {
            user_name = users[0].name
          }
        } catch (e) {
          // 忽略错误
        }

        result.push({
          id: msg.id,
          conversation_id: msg.conversation_id,
          user_id: msg.user_id,
          content: msg.content,
          content_type: msg.content_type,
          timestamp: msg.timestamp,
          user_name,
        })
      }

      // 按时间排序（旧的在上）
      result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      return result
    })
  })
}
