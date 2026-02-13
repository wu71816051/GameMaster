/**
 * 骰子命令模块
 *
 * @description
 * 提供骰子投掷的用户交互命令接口。
 *
 * @module core/commands/dice
 */

import { Context } from 'koishi'
import { createDiceService } from '../services/dice.service'
import { ConversationService } from '../services/conversation.service'
import { MemberService } from '../services/member.service'
import { createUserService } from '../services/user.service'
import { createDiceCommandParser } from '../utils/dice-parser'
import { createDiceResultRenderer } from '../utils/dice-renderer'
import { DiceParseError } from '../utils/dice-types'
import { ContentType, MessageType } from '../models/conversation-message'

/**
 * 注册骰子命令
 *
 * @description
 * 在插件初始化时调用此函数来注册骰子命令。
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerDiceCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const diceService = createDiceService(ctx)
  const diceParser = createDiceCommandParser()
  const diceRenderer = createDiceResultRenderer()
  const conversationService = new ConversationService(ctx)
  const memberService = new MemberService(ctx)
  const userService = createUserService(ctx)

  logger.info('[Commands] 开始注册骰子命令')

  // ========================================
  // 命令: 骰子
  // ========================================
  ctx.command('gm.roll <expression:text>')
    .alias('dice')
    .alias('roll')
    .alias('r')
    .action(async ({ session }, expression) => {
      try {
        if (!session) {
          return '❌ 无法获取会话信息'
        }

        logger.info('[Command:gm.roll] 执行命令', {
          expression,
          userId: session.userId,
        })

        // 参数验证
        if (!expression || expression.trim().length === 0) {
          return '❌ 请提供骰子表达式\n' +
                 '示例：gm.roll 3d6\n\n' +
                 '支持的语法：\n' +
                 '• 3d6 - 3个6面骰\n' +
                 '• 2d10+5 - 2个10面骰加5\n' +
                 '• 4d6k3 - 4个6面骰保留最高的3个\n' +
                 '• 4d6kl2 - 4个6面骰保留最低的2个\n' +
                 '• 3d8! - 3个8面骰暴骰\n' +
                 '• 2d20d1 - 2个20面骰舍弃最低的1个\n' +
                 '• 2d20dh1 - 2个20面骰舍弃最高的1个'
        }

        // 解析骰子命令
        const parsed = diceParser.parse(expression)

        if (!parsed) {
          return `❌ 无法解析骰子表达式: ${expression}\n\n💡 请检查语法是否正确`
        }

        logger.info('[Command:gm.roll] 解析成功', {
          dice: parsed.dice,
          method: parsed.method,
          modifiers: parsed.modifiers,
        })

        // 执行骰点
        const result = diceService.roll(parsed)

        // 准备用户信息
        const userInfo = {
          pid: session.userId || 'unknown',
          platform: session.platform || 'unknown',
        }

        // 渲染结果
        const output = diceRenderer.render(result, parsed, userInfo)

        logger.info('[Command:gm.roll] 骰点完成', {
          final: result.final,
          hasExplosion: result.hasExplosion,
        })

        // 尝试记录到活跃会话
        try {
          // 解析频道信息
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '',
            channelId: session.channelId || '',
          }

          // 查询活跃会话
          const conversation = await conversationService.getActiveConversation({
            channel: channelInfo,
          })

          if (conversation) {
            // 获取用户ID
            const userId = await userService.getUserIdFromSession(session)

            // 检查是否为会话成员
            const isMember = await memberService.isMember(conversation.id!, userId)

            if (isMember) {
              // 记录骰子结果到会话
              await ctx.database.create('conversation_message', {
                conversation_id: conversation.id!,
                user_id: userId,
                message_id: `dice_${Date.now()}_${userId}`,
                content: output,
                content_type: ContentType.CHECK,
                message_type: MessageType.TEXT,
                timestamp: new Date(),
                platform: session.platform,
                guild_id: session.guildId || '',
              })

              // 更新会话时间戳
              await conversationService.updateTimestamp(conversation.id!)

              logger.info('[Command:gm.roll] 骰子结果已记录到会话', {
                conversationId: conversation.id,
                userId,
              })
            } else {
              logger.info('[Command:gm.roll] 用户不是会话成员，跳过记录', {
                conversationId: conversation.id,
                userId,
              })
            }
          } else {
            logger.info('[Command:gm.roll] 当前频道没有活跃会话，跳过记录')
          }
        } catch (recordError) {
          // 记录失败不影响骰点结果，只记录警告
          logger.warn('[Command:gm.roll] 记录骰子结果到会话失败', recordError)
        }

        return output
      } catch (error) {
        if (error instanceof DiceParseError) {
          logger.warn('[Command:gm.roll] 解析失败', { message: error.message })
          return `❌ ${error.message}`
        }
        if (error instanceof Error) {
          logger.error('[Command:gm.roll] 执行命令时发生错误', error)
        } else {
          logger.error('[Command:gm.roll] 执行命令时发生未知错误', { error })
        }
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  // ========================================
  // 命令: 暗骰
  // ========================================
  ctx.command('gm.roll.hide <expression:text>')
    .alias('roll.hide')
    .alias('rh')
    .action(async ({ session }, expression) => {
      try {
        if (!session) {
          return '❌ 无法获取会话信息'
        }

        logger.info('[Command:gm.roll.hide] 执行暗骰命令', {
          expression,
          userId: session.userId,
        })

        // 参数验证
        if (!expression || expression.trim().length === 0) {
          return '❌ 请提供骰子表达式\n' +
                 '示例：gm.roll.hide 3d6\n\n' +
                 '支持的语法：\n' +
                 '• 3d6 - 3个6面骰\n' +
                 '• 2d10+5 - 2个10面骰加5\n' +
                 '• 4d6k3 - 4个6面骰保留最高的3个\n' +
                 '• 4d6kl2 - 4个6面骰保留最低的2个\n' +
                 '• 3d8! - 3个8面骰暴骰\n' +
                 '• 2d20d1 - 2个20面骰舍弃最低的1个\n' +
                 '• 2d20dh1 - 2个20面骰舍弃最高的1个'
        }

        // 解析骰子命令
        const parsed = diceParser.parse(expression)

        if (!parsed) {
          return `❌ 无法解析骰子表达式: ${expression}\n\n💡 请检查语法是否正确`
        }

        logger.info('[Command:gm.roll.hide] 解析成功', {
          dice: parsed.dice,
          method: parsed.method,
          modifiers: parsed.modifiers,
        })

        // 执行骰点
        const result = diceService.roll(parsed)

        // 准备用户信息
        const userInfo = {
          pid: session.userId || 'unknown',
          platform: session.platform || 'unknown',
        }

        // 渲染结果
        const output = diceRenderer.render(result, parsed, userInfo)

        logger.info('[Command:gm.roll.hide] 骰点完成', {
          final: result.final,
          hasExplosion: result.hasExplosion,
        })

        // 尝试发送私聊
        try {
          await session.bot.sendPrivateMessage(
            session.userId,
            `🎲 暗骰结果\n\n${output}`
          )

          logger.info('[Command:gm.roll.hide] 私聊发送成功', {
            userId: session.userId,
          })
        } catch (privateError) {
          logger.error('[Command:gm.roll.hide] 私聊发送失败', privateError)
          return `❌ 私聊发送失败，请确保已添加机器人为好友\n\n💡 骰点结果：${output}`
        }

        // 尝试记录到活跃会话
        try {
          // 解析频道信息
          const channelInfo = {
            platform: session.platform,
            guildId: session.guildId || '',
            channelId: session.channelId || '',
          }

          // 查询活跃会话
          const conversation = await conversationService.getActiveConversation({
            channel: channelInfo,
          })

          if (conversation) {
            // 获取用户ID
            const userId = await userService.getUserIdFromSession(session)

            // 检查是否为会话成员
            const isMember = await memberService.isMember(conversation.id!, userId)

            if (isMember) {
              // 记录暗骰结果到会话
              await ctx.database.create('conversation_message', {
                conversation_id: conversation.id!,
                user_id: userId,
                message_id: `dice_hide_${Date.now()}_${userId}`,
                content: output,
                content_type: ContentType.CHECK,
                message_type: MessageType.TEXT,
                timestamp: new Date(),
                platform: session.platform,
                guild_id: session.guildId || '',
              })

              // 更新会话时间戳
              await conversationService.updateTimestamp(conversation.id!)

              logger.info('[Command:gm.roll.hide] 暗骰结果已记录到会话', {
                conversationId: conversation.id,
                userId,
              })
            } else {
              logger.info('[Command:gm.roll.hide] 用户不是会话成员，跳过记录', {
                conversationId: conversation.id,
                userId,
              })
            }
          } else {
            logger.info('[Command:gm.roll.hide] 当前频道没有活跃会话，跳过记录')
          }
        } catch (recordError) {
          // 记录失败不影响骰点结果，只记录警告
          logger.warn('[Command:gm.roll.hide] 记录暗骰结果到会话失败', recordError)
        }

        // 在群聊中返回提示信息（不包含结果）
        return `✅ 暗骰成功，结果已私聊发送给 ${session.username || session.userId}`
      } catch (error) {
        if (error instanceof DiceParseError) {
          logger.warn('[Command:gm.roll.hide] 解析失败', { message: error.message })
          return `❌ ${error.message}`
        }
        if (error instanceof Error) {
          logger.error('[Command:gm.roll.hide] 执行命令时发生错误', error)
        } else {
          logger.error('[Command:gm.roll.hide] 执行命令时发生未知错误', { error })
        }
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：gm.roll.hide')
  logger.info('[Commands] 命令注册成功：gm.roll')
  logger.info('[Commands] 骰子命令注册完成')
}
