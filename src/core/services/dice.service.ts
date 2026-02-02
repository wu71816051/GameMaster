/**
 * 骰子服务
 *
 * @description
 * 负责处理骰子掷骰的业务逻辑，包括：
 * - 调用骰子解析器进行掷骰
 * - 在活跃会话中记录掷骰结果
 *
 * @module services/dice.service
 */

import { Context } from 'koishi'
import { DiceParser, DiceResult } from '../utils/dice-parser'
import { DiceFormatter } from '../utils/dice-formatter'
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
  /** 原始掷骰数据（成功时返回） */
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
          error: '骰子表达式不能为空',
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
          error: `无效的骰子表达式: ${params.expression}`,
        }
      }

      // 3. 检查是否在活跃会话中
      const activeConversation = await this.conversationService.getActiveConversation({
        channel: params.channel,
      })

      // 4. 如果在活跃会话中，记录掷骰结果
      if (activeConversation) {
        await this.recordDiceRoll({
          conversationId: activeConversation.id!,
          userId: params.userId,
          expression: params.expression,
          diceResult,
          description: params.description,
          channel: params.channel,
        })
        this.logger.info(
          `[DiceService] 用户 ${params.userId} 在会话 ${activeConversation.id} 中掷骰: ${params.expression} = ${diceResult.total}`
        )
      } else {
        this.logger.info(`[DiceService] 用户 ${params.userId} 掷骰: ${params.expression} = ${diceResult.total}`)
      }

      return {
        success: true,
        diceResult,
      }
    } catch (error) {
      this.logger.error('[DiceService] 掷骰失败', error)
      return {
        success: false,
        error: '掷骰失败，请稍后重试',
      }
    }
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
    channel: {
      platform: string
      guildId: string
      channelId: string
    }
  }): Promise<void> {
    try {
      // 生成消息 ID（基于时间戳和随机数）
      const messageId = `dice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // 构建消息内容（使用 DiceFormatter 工具类）
      const content = DiceFormatter.format(params.diceResult, {
        description: params.description,
      })

      // 记录到数据库
      await this.ctx.database.create('conversation_message', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        message_id: messageId,
        content,
        content_type: ContentType.CHECK,
        message_type: MessageType.TEXT,
        timestamp: new Date(),
        platform: params.channel.platform,
        guild_id: params.channel.guildId,
        channel_id: params.channel.channelId,
      } as any)

      this.logger.debug(`[DiceService] 掷骰结果已记录到会话 ${params.conversationId}`)
    } catch (error) {
      this.logger.error('[DiceService] 记录掷骰结果失败', error)
      // 记录失败不影响掷骰结果，仅记录错误日志
    }
  }

  /**
   * 获取简要帮助信息
   *
   * @returns 简要帮助文本
   */
  getBriefHelp(): string {
    return `🎲 骰子系统 - 快速指南
    
📖 基础用法：
  .r <表达式>   - 掷骰子
  .rd <表达式> <描述> - 带描述的掷骰
  .rh           - 显示此简要帮助
  .rh -d        - 显示详细帮助（含 TRPG 场景）

🎯 基础骰子：
  d20           - 掷 1 个 20 面骰
  3d6           - 掷 3 个 6 面骰并求和
  2d10+5        - 掷 2 个 10 面骰并加 5

🔧 保留/丢弃修饰符：
  4d6kh1        - 掷 4 个骰子，保留最高 1 个
  4d6kl1        - 掷 4 个骰子，保留最低 1 个
  4d6dh1        - 掷 4 个骰子，丢弃最高 1 个
  4d6dl1        - 掷 4 个骰子，丢弃最低 1 个

🔄 重骰机制：
  2d10r2        - 掷出 ≤2 时重骰一次
  2d10rr2       - 掷出 ≤2 时递归重骰（直到 >2）

💥 爆骰机制：
  d20!          - 掷出最大值时再骰并累加
  2d6!          - 每个骰子独立爆骰

🧮 复杂表达式：
  3d6+2d4-1     - 多个骰子类型组合
  4d6kh1+2      - 保留最高 + 修正值
  2d10r2kh1     - 重骰 + 保留最高

⚠️ 注意事项：
  除法为整除（7/2=3）
  重骰阈值必须 < 骰子面数

💡 查看详细帮助和 TRPG 场景请输入：.rh -d`
  }

  /**
   * 获取骰子表达式的帮助信息
   *
   * @param detailed - 是否显示详细帮助
   * @returns 帮助文本
   */
  getHelp(detailed: boolean = false): string {
    // 如果不需要详细帮助，返回简要版本
    if (!detailed) {
      return this.getBriefHelp()
    }

    // 返回完整的详细帮助
    return `🎲 骰子系统完整指南

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 基础用法
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.r <表达式>        - 掷骰子
.ra <表达式>       - 使用激活角色掷骰
.rd <表达式> <描述> - 带描述的掷骰
.rh                - 显示此帮助

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 基础骰子示例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
单个骰子：
  .r d20             → 掷 1 个 20 面骰
  .r d6              → 掷 1 个 6 面骰

多个骰子：
  .r 3d6             → 掷 3 个 6 面骰并求和
  .r 2d10            → 掷 2 个 10 面骰并求和

带修正值：
  .r 3d6+2           → 掷 3 个 6 面骰，结果加 2
  .r 2d10-1          → 掷 2 个 10 面骰，结果减 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 保留/丢弃修饰符
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
属性生成（保留最高 3 个）：
  .r 6d4kh3          → 掷 6 个 4 面骰，保留最高的 3 个

D&D 5e 人物属性（保留最高）：
  .r 4d6kh1          → 掷 4 个 6 面骰，保留最高的 1 个

丢弃最低（去掉运气最差的）：
  .r 4d6dl1          → 掷 4 个 6 面骰，丢弃最低的 1 个

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 重骰机制
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
重骰一次（≤2 时重骰）：
  .r d10r2           → 掷出 1 或 2 时，重骰一次
  .r 2d10r2          → 两个骰子分别判断是否重骰

递归重骰（≤2 时持续重骰）：
  .r d10rr2          → 掷出 1 或 2 时，持续重骰直到 ≥3
  .r 2d10rr2         → 两个骰子分别递归重骰

大失败检查（重骰 1）：
  .r d100r1          → 掷出 1 时重骰，避免大失败

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💥 爆骰机制
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
简单爆骰：
  .r d6!             → 掷出 6 时，再骰一次并累加
  .r d20!            → 掷出 20 时，再骰一次并累加

组合使用：
  .r 2d6!            → 每个骰子独立爆骰
  .r 2d6!+3          → 爆骰后加修正值

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 TRPG 游戏场景示例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D&D 5e 攻击检定：
  .r d20+5           → 攻击检定（+5 是攻击加值）
  .r 2d6+3           → 双手剑伤害（2d6+3）

D&D 5e 优势/劣势：
  优势：.r 2d20kh1   → 掷 2 个 d20，保留高的
  劣势：.r 2d20kl1   → 掷 2 个 d20，保留低的

CoC 7th 技能检定：
  .r 1d100           → 基础百面骰检定
  .r d100r1          → 避免大失败（1 重骰）

CoC 7th 伤害掷骰：
  .r 1d8             → 武器伤害
  .r d6+d6           → 左右手伤害

属性生成（D&D 5e）：
  .r 4d6kh1          → 标准属性生成法
  .r 3d6             → 经典属性生成法

命运骰（FATE）：
  .r 4d3-2           → 4 个 Fate 骰（+1,0,-1）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧮 复杂表达式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
多个骰子类型：
  .r 3d6+2d4-1       → 3d6 + 2d4 - 1
  .r 2d10+3d6+5      → 复杂伤害计算

组合修饰符：
  .r 4d6kh1+2        → 保留最高 + 修正值
  .r 2d10r2kh1       → 重骰 + 保留最高

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 实际输出示例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.r d20
→ 🎲 d20 = [15] = 15

.r 3d6+2
→ 🎲 3d6+2 = [4,5,3] + 2 = 14

.r 4d6kh1
→ 🎲 4d6kh1 = [4,5,3,2]→[5] = 5

.r 2d10r2
→ 🎲 2d10r2 [~~2~~→8,6] = 14  (重骰: 2→8)

.r d20!
→ 🎲 d20! = [20,5] = 25

.rd 2d6 "火球术伤害"
→ 火球术伤害
  🎲 2d6 = [4,3] = 7

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 常用速查表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
D&D 5e:
  属性生成：4d6kh1
  攻击检定：d20+X
  优势攻击：2d20kh1+X
  劣势攻击：2d20kl1+X

CoC 7th:
  技能检定：1d100
  伤害掷骰：1d8
  属性掷骰：3d6*5

通用:
  随机数：d100
  硬币：d2
  百分比：d100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 注意事项
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 除法为整除：7/2 = 3
• 重骰阈值必须 < 骰子面数
• 爆骰可以连续触发
• 修饰符顺序不影响结果

━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  }

  /**
   * 获取骰子表达式的示例
   *
   * @param category - 示例类别（basic/advanced/coc7）
   * @returns 示例文本
   */
  getExamples(category?: string): string {
    const examples: Record<string, string> = {
      basic: `📚 基础示例

单个骰子：
  .r d20       → 掷 1 个 20 面骰
  .r d6        → 掷 1 个 6 面骰
  .r d100      → 掷 1 个 100 面骰

多个骰子：
  .r 3d6       → 掷 3 个 6 面骰并求和
  .r 2d10      → 掷 2 个 10 面骰并求和
  .r 4d8       → 掷 4 个 8 面骰并求和

带修正值：
  .r 3d6+2     → 掷 3 个 6 面骰，结果加 2
  .r 2d10-1    → 掷 2 个 10 面骰，结果减 1
  .r d20+5     → 掷 1 个 20 面骰，结果加 5`,

      advanced: `🔧 进阶示例

保留/丢弃修饰符：
  .r 4d6kh1    → 掷 4 个 6 面骰，保留最高 1 个
  .r 4d6kl1    → 掷 4 个 6 面骰，保留最低 1 个
  .r 4d6dl1    → 掷 4 个 6 面骰，丢弃最低 1 个

重骰机制：
  .r 2d10r2    → 掷 2 个 10 面骰，≤2 时重骰一次
  .r d10rr2    → 掷 1 个 10 面骰，≤2 时递归重骰
  .r d100r1    → 掷 1 个 100 面骰，掷出 1 时重骰

爆骰机制：
  .r d6!       → 掷 1 个 6 面骰，掷出 6 时爆骰
  .r d20!      → 掷 1 个 20 面骰，掷出 20 时爆骰
  .r 2d6!+3    → 2 个 6 面骰爆骰，结果加 3`,

      coc7: `🐙 CoC 7th 示例

技能检定：
  .r 1d100     → 基础检定
  .r d100      → 简写形式
  .r d100r1    → 避免大失败（1 重骰）

伤害掷骰：
  .r 1d8       → 武器伤害
  .r 1d10      → 重型武器伤害
  .r d6+d6     → 左右手伤害

属性掷骰：
  .r 3d6*5     → 力量属性
  .r 3d6*5     → 智力属性
  .r (3d6+3d6)*10 → 教育（特殊）`,
    }

    if (category && examples[category]) {
      return examples[category]
    }
    return Object.values(examples).join('\n\n')
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
