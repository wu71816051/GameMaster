import { Context } from 'koishi'
import { parseSession, ParsedSessionInfo } from '../utils/session-parser'

/**
 * 消息中间件模块
 * 目前实现消息解析和回显功能：解析 session 并将所有信息发送回去
 *
 * 未来功能规划（按实现文档）：
 * - 监听 Koishi 的 message 事件
 * - 判断消息来源频道是否有活跃会话
 * - 验证发送者是否为会话成员
 * - 如果是会话成员，记录消息到数据库
 * - 更新会话的 updated_at 时间戳
 */

export function applyMessageMiddleware(ctx: Context) {
  // 监听所有消息事件
  ctx.on('message', (session) => {
    // 使用 session-parser 工具解析 session
    const parsedInfo: ParsedSessionInfo = parseSession(session)

    // 格式化解析结果为可读的字符串
    const message = formatSessionInfo(parsedInfo)

    // 将解析后的信息发送回去
    session.send(message)
  })

  // 记录中间件已加载
  ctx.logger.info('消息中间件已加载 (当前模式: Session 解析测试)')
}

/**
 * 将解析后的 session 信息格式化为可读字符串
 */
function formatSessionInfo(info: ParsedSessionInfo): string {
  const lines: string[] = []

  lines.push('=== 收到的消息信息 ===')
  lines.push(`📱 平台: ${info.platform}`)
  lines.push(`💬 消息内容: ${info.content}`)
  lines.push(`👤 用户ID: ${info.author.userId || info.author.id || '未知'}`)
  lines.push(`👤 用户名: ${info.author.name || '未知'}`)
  lines.push(`🎭 昵称: ${info.author.nickname || info.author.nick || '无'}`)
  lines.push(`🖼️ 头像: ${info.author.avatar || '无'}`)
  lines.push(`🔒 会话类型: ${info.isDirect ? '私聊' : '群聊'}`)

  if (info.guildInfo) {
    lines.push('--- 群聊信息 ---')
    lines.push(`🏠 群组ID: ${info.guildInfo.guildId}`)
    lines.push(`📢 频道ID: ${info.guildInfo.channelId}`)
  }

  lines.push('====================')

  return lines.join('\n')
}
