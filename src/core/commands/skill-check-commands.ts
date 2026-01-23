/**
 * 技能检定命令模块
 *
 * @description
 * 提供技能检定相关的命令。
 * 支持使用角色现有技能值或手动指定技能值进行检定。
 *
 * @module core/commands/skill-check-commands
 */

import { Context } from 'koishi'
import { ConversationService } from '../services/conversation.service'
import { SkillCheckService } from '../services/skill-check.service'
import { createUserService } from '../services/user.service'
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'

/**
 * 注册技能检定命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerSkillCheckCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const userService = createUserService(ctx)
  const conversationService = new ConversationService(ctx)
  const skillCheckService = new SkillCheckService(ctx)

  logger.info('[Commands] 开始注册技能检定命令')

  // ========================================
  // 命令: .check <技能名> [数值] [修正值]
  // 支持格式:
  //   .check 侦查
  //   .check 侦查 +10
  //   .check 侦查 60
  //   .check 侦查 60 +10
  // ========================================
  ctx.command('check [...args:text]')
    .alias('rc')
    .action(async ({ session }, args) => {
      try {
        logger.info('[Command:check] 执行命令', {
          args,
          userId: session.userId,
        })

        // 参数验证
        if (!args || args.trim().length === 0) {
          return '❌ 请提供技能名称\n\n' +
                 '📝 格式：\n' +
                 '  • check 侦查\n' +
                 '  • check 侦查 +10\n' +
                 '  • check 侦查 60\n' +
                 '  • check 侦查 60 +10\n\n' +
                 '💡 提示：将自动使用激活角色的技能值'
        }

        // 解析参数
        const parts = args.trim().split(/\s+/)
        logger.debug('[Command:check] 解析参数', { parts })

        let skillName: string
        let manualValue: number | undefined
        let modifier: number | undefined

        if (parts.length === 1) {
          // .check 侦查
          skillName = parts[0]
        } else if (parts.length === 2) {
          // .check 侦查 60 或 .check 侦查 +10
          const secondParam = parts[1]

          if (secondParam.startsWith('+') || secondParam.startsWith('-')) {
            // .check 侦查 +10 或 .check 侦查 -10
            skillName = parts[0]
            modifier = parseInt(secondParam, 10)

            if (isNaN(modifier)) {
              return '❌ 修正值格式错误\n示例：check 侦查 +10\n或：check 侦查 -10'
            }
          } else {
            // .check 侦查 60
            skillName = parts[0]
            manualValue = parseInt(secondParam, 10)

            if (isNaN(manualValue)) {
              return '❌ 技能值格式错误\n示例：check 侦查 60'
            }
          }
        } else if (parts.length === 3) {
          // .check 侦查 60 +10 或 .check 侦查 60 -10
          skillName = parts[0]
          manualValue = parseInt(parts[1], 10)
          modifier = parseInt(parts[2], 10)

          if (isNaN(manualValue) || isNaN(modifier)) {
            return '❌ 参数格式错误\n示例：check 侦查 60 +10\n或：check 侦查 60 -10'
          }
        } else {
          return '❌ 参数过多\n\n' +
                 '📝 正确格式：\n' +
                 '  • check 侦查\n' +
                 '  • check 侦查 +10\n' +
                 '  • check 侦查 60\n' +
                 '  • check 侦查 60 +10'
        }

        logger.info('[Command:check] 解析结果', {
          skillName,
          manualValue,
          modifier,
        })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话\n' +
                 '💡 请先使用 "会话创建" 或 "会话加入" 命令创建或加入一个会话'
        }

        const conversationId = conversation.id!

        // 执行技能检定
        const result = await skillCheckService.performSkillCheck({
          conversationId,
          userId,
          skillName: skillName.trim(),
          manualValue,
          modifier,
        })

        if (!result.success) {
          return `❌ ${result.error}`
        }

        // 格式化输出结果
        const registry = getRuleSystemRegistry()
        const adapter = registry.getAdapter(
          (result.result as any).metadata?.ruleSystem || 'generic'
        )

        if (adapter) {
          return adapter.formatResult(result.result!)
        }

        // 降级：直接返回格式化结果
        return result.result!.description || '检定完成'
      } catch (error) {
        logger.error('[Command:check] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：check')
  logger.info('[Commands] 技能检定命令注册完成')
}
