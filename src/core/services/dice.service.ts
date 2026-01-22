/**
 * 骰子服务
 *
 * @description
 * 负责处理骰子掷骰的业务逻辑，包括：
 * - 调用骰子解析器进行掷骰
 * - 在活跃会话中记录掷骰结果
 * - 格式化掷骰结果的输出
 *
 * @module services/dice.service
 */

import { Context } from 'koishi'
import { DiceParser, DiceResult } from '../utils/dice-parser'
import { ConversationService } from './conversation.service'
import { ContentType, MessageType } from '../models/conversation-message'

/**
 * 掷骰参数接口
 */
export interface RollDiceParams {
  /** 骰子表达式 */
  expression: string
  /** 用户 ID */
  userId: number
  /** 频道信息 */
  channel: {
    platform: string
    guildId: string
    channelId: string
  }
  /** 描述（可选） */
  description?: string
}

/**
 * 掷骰结果接口
 */
export interface RollDiceResult {
  /** 是否成功 */
  success: boolean
  /** 格式化的结果文本 */
  result?: string
  /** 原始掷骰数据（用于调试或扩展） */
  diceResult?: DiceResult
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 骰子服务类
 */
export class DiceService {
  private ctx: Context
  private logger: typeof Context.prototype.logger
  private conversationService: ConversationService

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
    this.conversationService = new ConversationService(ctx)
  }

  /**
   * 掷骰子
   *
   * @description
   * 解析骰子表达式并执行掷骰，如果在活跃会话中则记录结果。
   *
   * @param params - 掷骰参数
   * @returns 掷骰结果
   */
  async rollDice(params: RollDiceParams): Promise<RollDiceResult> {
    try {
      // 1. 验证表达式
      if (!params.expression || params.expression.trim().length === 0) {
        return {
          success: false,
          error: '❌ 骰子表达式不能为空',
        }
      }

      // 2. 解析并计算骰子表达式
      let diceResult: DiceResult
      try {
        diceResult = DiceParser.evaluate(params.expression)
      } catch (error) {
        this.logger.warn('[DiceService] 骰子表达式解析失败', error)
        return {
          success: false,
          error: `❌ 无效的骰子表达式: ${params.expression}`,
        }
      }

      // 3. 检查是否在活跃会话中
      const activeConversation = await this.conversationService.getActiveConversation({
        channel: params.channel,
      })

      // 4. 格式化结果
      const resultText = this.formatResult(diceResult, params.description)

      // 5. 如果在活跃会话中，记录掷骰结果
      if (activeConversation) {
        await this.recordDiceRoll({
          conversationId: activeConversation.id!,
          userId: params.userId,
          expression: params.expression,
          diceResult,
          description: params.description,
        })
        this.logger.info(
          `[DiceService] 用户 ${params.userId} 在会话 ${activeConversation.id} 中掷骰: ${params.expression} = ${diceResult.total}`
        )
      } else {
        this.logger.info(`[DiceService] 用户 ${params.userId} 掷骰: ${params.expression} = ${diceResult.total}`)
      }

      return {
        success: true,
        result: resultText,
        diceResult,
      }
    } catch (error) {
      this.logger.error('[DiceService] 掷骰失败', error)
      return {
        success: false,
        error: '❌ 掷骰失败，请稍后重试',
      }
    }
  }

  /**
   * 格式化掷骰结果
   *
   * @param diceResult - 掷骰结果
   * @param description - 描述（可选）
   * @returns 格式化的结果文本
   */
  private formatResult(diceResult: DiceResult, description?: string): string {
    let result = ''

    // 添加描述（如果有）
    if (description && description.trim()) {
      result += `${description}\n`
    }

    // 添加掷骰结果
    result += `🎲 ${diceResult.expression} = ${diceResult.detail} = ${diceResult.total}`

    return result
  }

  /**
   * 记录掷骰结果到会话消息表
   *
   * @param params - 记录参数
   */
  private async recordDiceRoll(params: {
    conversationId: number
    userId: number
    expression: string
    diceResult: DiceResult
    description?: string
  }): Promise<void> {
    try {
      // 生成消息 ID（基于时间戳和随机数）
      const messageId = `dice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // 构建消息内容
      const content = this.formatResult(params.diceResult, params.description)

      // 构建 metadata
      const metadata = {
        expression: params.expression,
        rolls: params.diceResult.rolls.map((roll) => ({
          faces: roll.faces,
          results: roll.results,
          finalResults: roll.finalResults,
          total: roll.total,
        })),
        total: params.diceResult.total,
        description: params.description || null,
      }

      // 记录到数据库
      await this.ctx.database.create('conversation_message', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        message_id: messageId,
        content,
        content_type: ContentType.CHECK,
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: 'system',
        guild_id: '',
        metadata,
      } as any)

      this.logger.debug(`[DiceService] 掷骰结果已记录到会话 ${params.conversationId}`)
    } catch (error) {
      this.logger.error('[DiceService] 记录掷骰结果失败', error)
      // 记录失败不影响掷骰结果，仅记录错误日志
    }
  }

  /**
   * 获取骰子表达式的帮助信息
   *
   * @returns 帮助文本
   */
  getHelp(): string {
    return `🎲 骰子系统帮助

基础用法：
  .r <表达式>        - 掷骰子（如 .r 3d6+2）
  .ra <表达式>       - 使用激活角色掷骰
  .rd <表达式> <描述> - 带描述的掷骰

支持的骰子表达式：
  d20                - 掷一个 20 面骰
  3d6                - 掷三个 6 面骰
  2d10+5             - 掷两个 10 面骰并加 5
  4d6kh1             - 掷四个 6 面骰，保留最高值
  4d6kl1             - 掷四个 6 面骰，保留最低值
  4d6dh1             - 掷四个 6 面骰，丢弃最高值
  4d6dl1             - 掷四个 6 面骰，丢弃最低值
  d20!               - 掷一个 20 面骰，支持爆骰
  3d6+2d4-1          - 复杂表达式

算术运算符：
  +  - 加法
  -  - 减法
  *  - 乘法
  /  - 除法（整除）

修饰符：
  khN - 保留最高的 N 个骰子
  klN - 保留最低的 N 个骰子
  dhN - 丢弃最高的 N 个骰子
  dlN - 丢弃最低的 N 个骰子
  !   - 爆骰（掷出最大值时再骰一次）

示例：
  .r d20             - 🎲 d20 = [15] = 15
  .r 3d6+2           - 🎲 3d6+2 = [4,5,3] + 2 = 14
  .r 4d6kh1          - 🎲 4d6kh1 = [4,5,3,2]→[5] = 5
  .rd 2d6 "攻击伤害" - 攻击伤害\n🎲 2d6 = [4,3] = 7`
  }
}

/**
 * 创建骰子服务实例
 *
 * @param ctx - Koishi 上下文
 * @returns 骰子服务实例
 */
export function createDiceService(ctx: Context): DiceService {
  return new DiceService(ctx)
}
