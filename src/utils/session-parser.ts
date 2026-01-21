import { Session } from 'koishi'

/**
 * 解析后的会话信息
 */
export interface ParsedSessionInfo {
  // 平台信息
  platform: string

  // 发送者信息（GuildMember & User 类型）
  author: Session['author']

  // 消息内容
  content: string

  // 会话类型
  isDirect: boolean // true 为私聊，false 为群聊

  // 群聊相关信息（仅当 isDirect 为 false 时有值）
  guildInfo?: {
    guildId: string
    channelId: string
  }
}

/**
 * 解析 Session 对象，提取关键信息
 *
 * @param session Koishi Session 对象
 * @returns 解析后的会话信息
 *
 * @description
 * 提取的信息包括：
 * 1. 平台信息 (session.platform)
 * 2. 发送者信息 (session.author)
 * 3. 消息内容 (session.content)
 * 4. 会话类型 (session.isDirect)
 * 5. 群聊信息 (session.guildId, session.channelId) - 仅群聊时有值
 */
export function parseSession(session: Session): ParsedSessionInfo {
  const result: ParsedSessionInfo = {
    // 1. 获取平台信息
    platform: session.platform,

    // 2. 获取发送者信息（包含所有 User 和 GuildMember 字段，包括 nickname）
    author: session.author,

    // 3. 获取消息内容
    content: session.content || '',

    // 4. 判断是私聊还是群聊
    isDirect: session.isDirect,
  }

  // 5. 如果是群聊，获取群组和频道信息
  if (!session.isDirect) {
    result.guildInfo = {
      guildId: session.guildId,
      channelId: session.channelId,
    }
  }

  return result
}
