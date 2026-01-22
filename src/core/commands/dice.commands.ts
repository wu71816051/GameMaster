/**
 * 骰子相关命令模块
 *
 * @description
 * 提供掷骰子相关命令（普通掷骰、带描述掷骰、角色掷骰、帮助）。
 *
 * @module core/commands/dice
 */

import { Context } from 'koishi'
import { createUserService } from '../services/user.service'
import { createDiceService } from '../services/dice.service'

/**
 * 注册骰子相关命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerDiceCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const userService = createUserService(ctx)
  const diceService = createDiceService(ctx)

  logger.info('[Commands] 开始注册骰子相关命令')

  // ========================================
  // 命令 1: 掷骰子
  // ========================================
  ctx.command('r <表达式:text>')
    .action(async ({ session }, expression) => {
      try {
        logger.info('[Command:掷骰子] 执行命令', {
          expression,
          userId: session.userId,
        })

        // 参数验证
        if (!expression || expression.trim().length === 0) {
          return '❌ 请提供骰子表达式\n示例：r 3d6+2\n使用 "rh" 查看帮助'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 调用骰子服务
        const result = await diceService.rollDice({
          expression: expression.trim(),
          userId,
          channel: channelInfo,
        })

        if (result.success) {
          return result.result
        } else {
          return result.error
        }
      } catch (error) {
        logger.error('[Command:掷骰子] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：掷骰子')

  // ========================================
  // 命令 2: 带描述的掷骰子
  // ========================================
  ctx.command('rd <表达式:text> <描述:text>')
    .action(async ({ session }, expression, description) => {
      try {
        logger.info('[Command:掷骰子描述] 执行命令', {
          expression,
          description,
          userId: session.userId,
        })

        // 参数验证
        if (!expression || expression.trim().length === 0) {
          return '❌ 请提供骰子表达式\n示例：rd 3d6+2 攻击伤害'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 调用骰子服务
        const result = await diceService.rollDice({
          expression: expression.trim(),
          userId,
          channel: channelInfo,
          description: description?.trim(),
        })

        if (result.success) {
          return result.result
        } else {
          return result.error
        }
      } catch (error) {
        logger.error('[Command:掷骰子描述] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：掷骰子描述')

  // ========================================
  // 命令 3: 使用角色掷骰子（预留，等角色系统实现后再完善）
  // ========================================
  ctx.command('ra <表达式:text>')
    .action(async ({ session }, expression) => {
      try {
        logger.info('[Command:角色掷骰子] 执行命令', {
          expression,
          userId: session.userId,
        })

        // 参数验证
        if (!expression || expression.trim().length === 0) {
          return '❌ 请提供骰子表达式\n示例：ra 3d6+2'
        }

        // TODO: 等角色系统实现后，这里需要：
        // 1. 获取用户的激活角色
        // 2. 根据角色属性修正掷骰结果
        // 3. 记录到角色相关的检定记录

        // 目前暂时直接使用普通掷骰
        const userId = await userService.getUserIdFromSession(session)
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        const result = await diceService.rollDice({
          expression: expression.trim(),
          userId,
          channel: channelInfo,
        })

        if (result.success) {
          return result.result
        } else {
          return result.error
        }
      } catch (error) {
        logger.error('[Command:角色掷骰子] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色掷骰子')

  // ========================================
  // 命令 4: 骰子帮助
  // ========================================
  ctx.command('rh')
    .action(() => {
      return diceService.getHelp()
    })

  logger.info('[Commands] 命令注册成功：骰子帮助')
}
