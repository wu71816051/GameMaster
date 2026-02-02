/**
 * CoC7 专属命令实现
 *
 * @description
 * 实现克苏鲁的呼唤 7版规则系统的专属命令：
 * - .san - 理智检定
 * - .ra - 成长骰（CoC7 独有）
 * - .对抗 - 对抗检定
 * - .奖励骰 - 奖励骰机制
 * - .惩罚骰 - 惩罚骰机制
 *
 * @module rule/coc7/coc7-commands
 */

import { Context, Session } from 'koishi'
import { CoC7Adapter } from './coc7-adapter'
import { RuleCommand } from '../base/rule-system-adapter'
import { DiceParser } from '../../core/utils/dice-parser'
import { ConversationService } from '../../core/services/conversation.service'
import {
  rollImmediateMadness,
  rollSummaryMadness,
  rollPhobia,
  rollMania
} from './data/madness-tables'

export class CoC7Commands {
  private adapter: CoC7Adapter
  private ctx: Context

  constructor(adapter: CoC7Adapter, ctx?: Context) {
    this.adapter = adapter
    this.ctx = ctx || (adapter as any).ctx
  }

  /**
   * 获取会话服务
   */
  private getConversationService(): ConversationService {
    return new ConversationService(this.ctx)
  }

  /**
   * 获取 CoC7 专属命令列表
   *
   * @description
   * 注意：命令名称不包含前缀，前缀由适配器添加
   */
  getCommands(): RuleCommand[] {
    return [
      {
        name: 'san',
        aliases: ['理智检定', 'sanity'],
        description: '理智检定 - 掷骰判定是否损失理智值',
        usage: '.coc7.san [当前SAN] [成功损失/失败损失]',
        examples: [
          '.coc7.san 50 0/1d6',
          '.c7.san 60 1/1d10',
          '.coc7.理智检定 50 0/1d6'
        ],
        handler: this.handleSanCheck.bind(this)
      },
      {
        name: 'ra',  // CoC7 独有的成长骰
        aliases: ['成长骰', 'advancement'],
        description: '成长骰 - 技能成功使用后的成长检定（CoC7 独有）',
        usage: '.coc7.ra <技能名> [当前技能值]',
        examples: [
          '.coc7.ra 侦查 60',
          '.c7.ra 斗殴',
          '.coc7.成长骰 侦查 60'
        ],
        handler: this.handleAdvancementRoll.bind(this)
      },
      {
        name: '对抗',
        aliases: ['opposed', '对战'],
        description: '对抗检定 - 两个技能值的对抗',
        usage: '.coc7.对抗 <技能1> <技能2>',
        examples: [
          '.coc7.对抗 斗殴 闪避',
          '.c7.对抗 侦查 侦察'
        ],
        handler: this.handleOpposedRoll.bind(this)
      },
      {
        name: '奖励骰',
        aliases: ['bonus', '奖励'],
        description: '奖励骰 - 在下次检定中添加奖励骰',
        usage: '.coc7.奖励骰 <数量>',
        examples: [
          '.coc7.奖励骰 2',
          '.c7.bonus 1'
        ],
        handler: this.handleBonusDice.bind(this)
      },
      {
        name: '惩罚骰',
        aliases: ['penalty', '惩罚'],
        description: '惩罚骰 - 在下次检定中添加惩罚骰',
        usage: '.coc7.惩罚骰 <数量>',
        examples: [
          '.coc7.惩罚骰 1',
          '.c7.penalty 2'
        ],
        handler: this.handlePenaltyDice.bind(this)
      },
      {
        name: '精神治疗',
        aliases: ['psychotherapy', '心理治疗'],
        description: '精神治疗 - 通过心理分析检定恢复理智值',
        usage: '.coc7.精神治疗 [心理分析技能值]',
        examples: [
          '.coc7.精神治疗 60',
          '.c7.psychotherapy'
        ],
        handler: this.handlePsychotherapy.bind(this)
      },
      {
        name: '查看疯狂',
        aliases: ['madness', '疯狂症状'],
        description: '查看疯狂 - 查看角色当前的疯狂症状',
        usage: '.coc7.查看疯狂',
        examples: [
          '.coc7.查看疯狂',
          '.c7.madness'
        ],
        handler: this.handleViewMadness.bind(this)
      },
      // ========================================
      // 战斗系统帮助（战斗命令已移至独立模块）
      // ========================================
      {
        name: '战斗帮助',
        aliases: ['combat.help', '战斗指引'],
        description: '战斗帮助 - 查看战斗系统命令',
        usage: '.coc7.战斗帮助',
        examples: [
          '.coc7.战斗帮助',
          '.c7.combat.help',
          '.战斗帮助'
        ],
        handler: this.handleCombatHelp.bind(this)
      }
    ]
  }

  /**
   * 理智检定命令
   *
   * 格式: .san [当前SAN值] [成功损失/失败损失]
   * 示例: .san 50 0/1d6
   */
  private async handleSanCheck(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    // 步骤2: 从验证结果中获取必要信息
    const { conversationId, userId, character } = validation

    // 步骤3: 执行理智检定逻辑
    // 解析参数: [当前SAN] [成功损失/失败损失]
    const parts = args.trim().split(/\s+/)

    let currentSan: number
    let sanLoss: string

    if (parts.length === 0 || parts[0] === '') {
      // 未提供参数,使用角色当前SAN值
      currentSan = character.attributes?.SAN || character.attributes?.san || character.attributes?.mp || 0
      sanLoss = '0/1d6' // 默认损失
    } else if (parts.length === 1) {
      // 只提供了SAN值
      currentSan = parseInt(parts[0], 10)
      sanLoss = '0/1d6'
    } else {
      // 提供了SAN值和损失骰
      currentSan = parseInt(parts[0], 10)
      sanLoss = parts[1]
    }

    if (isNaN(currentSan)) {
      return '❌ SAN值格式错误\n示例: .san 50 0/1d6'
    }

    // 执行理智检定
    const diceResult = DiceParser.evaluate('1d100')
    const roll = diceResult.total

    // 判定成功/失败
    const success = roll <= currentSan
    const isCritical = roll <= 5
    const isFumble = roll === 100 || (roll >= 96 && currentSan < 50)

    // 解析损失骰
    const lossParts = sanLoss.split('/')
    const successLoss = lossParts[0] || '0'
    const failureLoss = lossParts[1] || '1d6'

    // 计算实际损失
    let actualLoss = 0
    let lossRoll = ''

    if (isFumble) {
      // 大失败：失败损失 x 2
      if (failureLoss.includes('d')) {
        const lossResult = DiceParser.evaluate(failureLoss)
        actualLoss = lossResult.total * 2
        lossRoll = `${failureLoss} x 2 = ${actualLoss}`
      } else {
        actualLoss = parseInt(failureLoss) * 2
        lossRoll = `${failureLoss} x 2 = ${actualLoss}`
      }
    } else if (success) {
      // 成功：使用成功损失
      if (successLoss.includes('d')) {
        const lossResult = DiceParser.evaluate(successLoss)
        actualLoss = lossResult.total
        lossRoll = `${successLoss} = ${actualLoss}`
      } else {
        actualLoss = parseInt(successLoss)
        lossRoll = successLoss
      }
    } else {
      // 失败：使用失败损失
      if (failureLoss.includes('d')) {
        const lossResult = DiceParser.evaluate(failureLoss)
        actualLoss = lossResult.total
        lossRoll = `${failureLoss} = ${actualLoss}`
      } else {
        actualLoss = parseInt(failureLoss)
        lossRoll = failureLoss
      }
    }

    // 计算新SAN值
    const newSan = Math.max(0, currentSan - actualLoss)

    // 构建结果
    let result = `🎲 理智检定 (${currentSan})\n`
    result += `📊 掷骰: ${roll}/100`

    if (isCritical) {
      result += ` ✨ 大成功！`
    } else if (isFumble) {
      result += ` 💀 大失败！`
    } else if (success) {
      result += ` ✅ 成功`
    } else {
      result += ` ❌ 失败`
    }

    result += `\n💡 损失: ${lossRoll}`
    result += `\n📈 当前SAN: ${currentSan} → ${newSan}`

    if (actualLoss > 0) {
      result += ` (-${actualLoss})`
    }

    // 持久化 SAN 值到数据库
    if (actualLoss > 0 || newSan !== currentSan) {
      try {
        await ctx.database.set('character', character.id!, {
          attributes: {
            ...character.attributes,
            san: newSan,
            SAN: newSan, // 同时更新大写版本（兼容性）
          }
        })
        result += `\n✅ SAN值已更新`
      } catch (error) {
        this.ctx.logger.error('[CoC7Commands] 更新SAN值失败', error)
        result += `\n⚠️ SAN值更新失败（已记录到日志）`
      }
    }

    // 触发疯狂发作（单次损失 ≥ 5 点）
    if (actualLoss >= 5) {
      result += `\n\n💀 疯狂发作！`

      // 掷骰确定即时症状
      const symptom = rollImmediateMadness()
      const durationRoll = Math.floor(Math.random() * 10) + 1

      result += `\n🎲 疯狂症状: ${symptom.effect}`
      result += `\n📖 ${symptom.description}`
      result += `\n⏱️ 持续时间: ${durationRoll} 轮`
      result += `\n💡 行为: ${symptom.behavior}`

      // 存储到角色 metadata
      try {
        await ctx.database.set('character', character.id!, {
          metadata: {
            ...character.metadata,
            madness: {
              ...(character.metadata?.madness || {}),
              immediateSymptom: symptom,
              immediateDuration: durationRoll,
              immediateRemainingRounds: durationRoll,
              triggeredAt: new Date().toISOString()
            }
          }
        })
        result += `\n✅ 疯狂症状已记录到角色卡`
      } catch (error) {
        this.ctx.logger.error('[CoC7Commands] 记录疯狂症状失败', error)
      }
    }

    return result
  }

  /**
   * 成长骰命令（CoC7 独有）
   *
   * 格式: .coc7.ra <技能名> [当前技能值]
   * 示例: .coc7.ra 侦查 60
   */
  private async handleAdvancementRoll(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    const { conversationId, userId, character } = validation

    // 步骤2: 解析参数
    const parts = args.trim().split(/\s+/)

    if (parts.length === 0 || parts[0] === '') {
      return '❌ 参数格式错误\n' +
             '📝 正确格式: .coc7.ra <技能名> [当前技能值]\n' +
             '💡 示例: .coc7.ra 侦查 60'
    }

    const skillName = this.adapter.normalizeSkillName(parts[0])
    let currentSkillValue = character.skills?.[skillName]

    // 如果提供了技能值，使用提供的值
    if (parts.length >= 2) {
      currentSkillValue = parseInt(parts[1], 10)
    }

    if (!currentSkillValue || typeof currentSkillValue !== 'number') {
      return `❌ 角色 ${character.name} 没有技能: ${parts[0]}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // 步骤3: 执行成长骰逻辑
    // 1. 掷骰 1d100
    const roll = Math.floor(Math.random() * 100) + 1

    // 2. 判定是否成长
    const hasAdvanced = roll > currentSkillValue

    let result = `📈 成长检定：${parts[0]} (${currentSkillValue})\n`
    result += `📊 掷骰: ${roll}/100\n`

    if (hasAdvanced) {
      // 3. 计算成长值 (1d10 或 5)
      const advancementRoll = Math.floor(Math.random() * 10) + 1
      const advancement = Math.max(advancementRoll, 5)
      const newSkillValue = Math.min(
        currentSkillValue + advancement,
        100  // CoC7 技能上限
      )

      result += `✅ 成功！技能提升 ${advancement} 点 (掷骰: ${advancementRoll})\n`
      result += `📈 ${parts[0]}: ${currentSkillValue} → ${newSkillValue}`

      // TODO: 更新数据库中的技能值
      // await characterService.updateSkill(userId, conversationId, skillName, newSkillValue)
    } else {
      result += `❌ 失败！技能值未提升`
    }

    return result
  }

  /**
   * 对抗检定命令
   *
   * 格式: .对抗 <技能1> <技能2>
   * 示例: .对抗 斗殴 闪避
   */
  private async handleOpposedRoll(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    const { character: character1 } = validation

    // 步骤2: 解析参数
    const parts = args.trim().split(/\s+/)

    if (parts.length < 2) {
      return '❌ 参数格式错误\n' +
             '📝 正确格式: .coc7.对抗 <技能1> <技能2>\n' +
             '💡 示例: .coc7.对抗 斗殴 闪避\n' +
             '💡 提示: 对抗检定需要两个技能值'
    }

    const skill1Name = this.adapter.normalizeSkillName(parts[0])
    const skill2Name = this.adapter.normalizeSkillName(parts[1])

    // 步骤3: 获取技能值
    const skill1Value = character1.skills?.[skill1Name]

    if (!skill1Value) {
      return `❌ 角色 ${character1.name} 没有技能: ${parts[0]}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // TODO: 支持两人对抗(需要第二个角色的标识)
    // 当前简化为: 技能1 vs 技能2 (都来自同一角色,用于测试)

    const skill2Value = character1.skills?.[skill2Name]

    if (!skill2Value) {
      return `❌ 角色 ${character1.name} 没有技能: ${parts[1]}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // 步骤4: 执行对抗检定
    const roll1 = Math.floor(Math.random() * 100) + 1
    const roll2 = Math.floor(Math.random() * 100) + 1

    // 计算成功等级
    const getSuccessLevel = (roll: number, skill: number) => {
      if (roll <= 5) return { level: 5, name: '大成功' }
      if (roll > skill) return { level: 0, name: '失败' }
      if (roll <= Math.floor(skill / 5)) return { level: 4, name: '极难成功' }
      if (roll <= Math.floor(skill / 2)) return { level: 3, name: '困难成功' }
      return { level: 2, name: '普通成功' }
    }

    const result1 = getSuccessLevel(roll1, skill1Value)
    const result2 = getSuccessLevel(roll2, skill2Value)

    // 比较胜负
    let winner = 'draw'
    if (result1.level > result2.level) {
      winner = 'skill1'
    } else if (result2.level > result1.level) {
      winner = 'skill2'
    } else {
      // 成功等级相同，比较骰子点数（越小越好）
      if (roll1 < roll2) winner = 'skill1'
      else if (roll2 < roll1) winner = 'skill2'
    }

    let output = `⚔️ 对抗检定\n`
    output += `${character1.name} (${parts[0]} ${skill1Value}): ${roll1} → ${result1.name}\n`
    output += `${character1.name} (${parts[1]} ${skill2Value}): ${roll2} → ${result2.name}\n`

    if (winner === 'skill1') {
      output += `🏆 ${parts[0]} 胜出！`
    } else if (winner === 'skill2') {
      output += `🏆 ${parts[1]} 胜出！`
    } else {
      output += `🤝 平局！`
    }

    return output
  }

  /**
   * 奖励骰命令
   *
   * 格式: .奖励骰 <数量>
   * 示例: .奖励骰 2
   *
   * @description
   * 设置奖励骰，在下次技能检定中生效。
   * 奖励骰机制：额外掷 N 个十位骰，取最低值（更有利）
   *
   * CoC7 规则：
   * - 最多 2 个奖励骰
   * - 奖励骰与惩罚骰会相互抵消
   * - 效果持续到下次检定后自动清除
   */
  private async handleBonusDice(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 1. 验证用户在会话中有激活角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)
    if (!validation.valid) {
      return validation.error || '❌ 验证失败'
    }

    // 2. 解析奖励骰数量
    const count = parseInt(args.trim()) || 1
    if (count < 1 || count > 2) {
      return '❌ 奖励骰数量必须为 1 或 2\n' +
             '💡 用法: .奖励骰 1 或 .奖励骰 2'
    }

    // 3. 获取会话信息
    const conversationService = this.getConversationService()
    const conversation = await conversationService.getActiveConversation({
      channel: {
        platform: session.platform,
        guildId: session.guildId || '0',
        channelId: session.channelId || '0',
      }
    })

    if (!conversation) {
      return '❌ 未找到活跃会话'
    }

    // 4. 检查并抵消惩罚骰
    const currentPenalty = conversation.metadata?.diceModifiers?.penaltyDice || 0
    let actualBonus = count
    let remainingPenalty = currentPenalty

    if (currentPenalty > 0) {
      // 抵消逻辑
      if (count >= currentPenalty) {
        actualBonus = count - currentPenalty
        remainingPenalty = 0
      } else {
        actualBonus = 0
        remainingPenalty = currentPenalty - count
      }

      // 更新会话 metadata
      await ctx.database.set('conversation', conversation.id!, {
        metadata: {
          ...conversation.metadata,
          diceModifiers: {
            ...conversation.metadata?.diceModifiers,
            bonusDice: actualBonus,
            penaltyDice: remainingPenalty
          }
        }
      })

      if (actualBonus === 0 && remainingPenalty === 0) {
        return `✅ 奖励骰与惩罚骰完全抵消\n` +
               `当前无骰子修正`
      } else if (actualBonus === 0) {
        return `⚠️ 奖励骰已与惩罚骰部分抵消\n` +
               `📊 剩余惩罚骰: ${remainingPenalty}`
      } else {
        return `✅ 奖励骰已设置（部分抵消惩罚骰）\n` +
               `📊 奖励骰: ${actualBonus} | 惩罚骰: ${remainingPenalty}\n` +
               `💡 下次检定时生效`
      }
    }

    // 5. 保存到会话 metadata
    await ctx.database.set('conversation', conversation.id!, {
      metadata: {
        ...conversation.metadata,
        diceModifiers: {
          ...conversation.metadata?.diceModifiers,
          bonusDice: actualBonus
        }
      }
    })

    // 6. 返回成功消息
    return `✅ 奖励骰已设置\n` +
           `📊 奖励骰数量: ${actualBonus}\n` +
           `💡 下次检定时将使用 ${actualBonus} 个奖励骰\n` +
           `🎲 效果：掷 ${actualBonus + 1} 个十位骰，取最低值`
  }

  /**
   * 惩罚骰命令
   *
   * 格式: .惩罚骰 <数量>
   * 示例: .惩罚骰 1
   *
   * @description
   * 设置惩罚骰，在下次技能检定中生效。
   * 惩罚骰机制：额外掷 N 个十位骰，取最高值（更不利）
   *
   * CoC7 规则：
   * - 最多 2 个惩罚骰
   * - 惩罚骰与奖励骰会相互抵消
   * - 效果持续到下次检定后自动清除
   */
  private async handlePenaltyDice(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 1. 验证用户在会话中有激活角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)
    if (!validation.valid) {
      return validation.error || '❌ 验证失败'
    }

    // 2. 解析惩罚骰数量
    const count = parseInt(args.trim()) || 1
    if (count < 1 || count > 2) {
      return '❌ 惩罚骰数量必须为 1 或 2\n' +
             '💡 用法: .惩罚骰 1 或 .惩罚骰 2'
    }

    // 3. 获取会话信息
    const conversationService = this.getConversationService()
    const conversation = await conversationService.getActiveConversation({
      channel: {
        platform: session.platform,
        guildId: session.guildId || '0',
        channelId: session.channelId || '0',
      }
    })

    if (!conversation) {
      return '❌ 未找到活跃会话'
    }

    // 4. 检查并抵消奖励骰
    const currentBonus = conversation.metadata?.diceModifiers?.bonusDice || 0
    let actualPenalty = count
    let remainingBonus = currentBonus

    if (currentBonus > 0) {
      // 抵消逻辑
      if (count >= currentBonus) {
        actualPenalty = count - currentBonus
        remainingBonus = 0
      } else {
        actualPenalty = 0
        remainingBonus = currentBonus - count
      }

      // 更新会话 metadata
      await ctx.database.set('conversation', conversation.id!, {
        metadata: {
          ...conversation.metadata,
          diceModifiers: {
            ...conversation.metadata?.diceModifiers,
            bonusDice: remainingBonus,
            penaltyDice: actualPenalty
          }
        }
      })

      if (actualPenalty === 0 && remainingBonus === 0) {
        return `✅ 惩罚骰与奖励骰完全抵消\n` +
               `当前无骰子修正`
      } else if (actualPenalty === 0) {
        return `⚠️ 惩罚骰已与奖励骰部分抵消\n` +
               `📊 剩余奖励骰: ${remainingBonus}`
      } else {
        return `✅ 惩罚骰已设置（部分抵消奖励骰）\n` +
               `📊 奖励骰: ${remainingBonus} | 惩罚骰: ${actualPenalty}\n` +
               `💡 下次检定时生效`
      }
    }

    // 5. 保存到会话 metadata
    await ctx.database.set('conversation', conversation.id!, {
      metadata: {
        ...conversation.metadata,
        diceModifiers: {
          ...conversation.metadata?.diceModifiers,
          penaltyDice: actualPenalty
        }
      }
    })

    // 6. 返回成功消息
    return `✅ 惩罚骰已设置\n` +
           `📊 惩罚骰数量: ${actualPenalty}\n` +
           `💡 下次检定时将使用 ${actualPenalty} 个惩罚骰\n` +
           `🎲 效果：掷 ${actualPenalty + 1} 个十位骰，取最高值`
  }

  /**
   * 精神治疗命令
   *
   * 格式: .精神治疗 [心理分析技能值]
   * 示例: .精神治疗 60
   *
   * @description
   * 通过心理分析检定恢复理智值。
   * CoC7 规则：
   * - 成功：恢复 1d6 SAN
   * - 失败：无恢复
   * - 需要花费 1 小时进行治疗
   */
  private async handlePsychotherapy(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // 1. 验证用户在会话中有激活角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)
    if (!validation.valid) {
      return validation.error || '❌ 验证失败'
    }

    const { character } = validation
    const currentSan = character.attributes?.san || character.attributes?.SAN || 0
    const maxSan = character.attributes?.pow || 99

    // 检查是否已满
    if (currentSan >= maxSan) {
      return `⚠️ 理智值已满\n` +
             `当前SAN: ${currentSan}/${maxSan}\n` +
             `💡 无需治疗`
    }

    // 2. 获取心理分析技能值
    let psychotherapySkill = 0
    const arg = args.trim()

    if (arg) {
      // 手动指定技能值
      const skillValue = parseInt(arg)
      if (isNaN(skillValue)) {
        // 尝试从角色技能中获取
        psychotherapySkill = character.skills?.['心理分析'] ||
                           character.skills?.['psychoanalysis'] ||
                           character.skills?.['精神治疗'] || 0
      } else {
        psychotherapySkill = skillValue
      }
    } else {
      // 从角色技能中获取
      psychotherapySkill = character.skills?.['心理分析'] ||
                         character.skills?.['psychoanalysis'] ||
                         character.skills?.['精神治疗'] || 0
    }

    if (psychotherapySkill === 0) {
      return `❌ 未找到心理分析技能\n` +
             `💡 请先学习该技能，或手动指定技能值\n` +
             `用法: .精神治疗 <技能值>`
    }

    // 3. 执行心理分析检定
    const diceResult = DiceParser.evaluate('1d100')
    const roll = diceResult.total
    const success = roll <= psychotherapySkill

    let result = `🧠 精神治疗\n\n`
    result += `📊 心理分析检定 (${psychotherapySkill}): ${roll}\n`

    if (success) {
      // 成功：恢复 1d6 SAN
      const recoveryResult = DiceParser.evaluate('1d6')
      const recovery = recoveryResult.total
      const newSan = Math.min(maxSan, currentSan + recovery)

      result += `✅ 治疗成功！\n`
      result += `📈 恢复: ${recovery} 点SAN\n`
      result += `📊 SAN: ${currentSan} → ${newSan}/${maxSan}\n`
      result += `⏱️ 治疗时长: 1 小时`

      // 更新数据库
      try {
        await ctx.database.set('character', character.id!, {
          attributes: {
            ...character.attributes,
            san: newSan,
            SAN: newSan
          }
        })
        result += `\n✅ SAN值已更新`
      } catch (error) {
        this.ctx.logger.error('[CoC7Commands] 更新SAN值失败', error)
        result += `\n⚠️ SAN值更新失败（已记录到日志）`
      }
    } else {
      // 失败
      result += `❌ 治疗失败\n`
      result += `💡 无法恢复理智值\n`
      result += `⏱️ 治疗时长: 1 小时`
    }

    return result
  }

  /**
   * 查看疯狂症状命令
   *
   * 格式: .查看疯狂
   * 示例: .查看疯狂
   *
   * @description
   * 查看角色当前的疯狂症状和持续时间。
   */
  private async handleViewMadness(
    ctx: Context,
    session: Session,
    _args: string
  ): Promise<string> {
    // 1. 验证用户在会话中有激活角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)
    if (!validation.valid) {
      return validation.error || '❌ 验证失败'
    }

    const { character } = validation
    const madness = character.metadata?.madness

    if (!madness) {
      return `🧠 疯狂状态\n\n` +
             `✅ 角色目前没有疯狂症状\n` +
             `💡 保持理智，避免触发SAN检定`
    }

    let result = `🧠 疯狂状态\n\n`

    // 即时症状
    if (madness.immediateSymptom) {
      const remaining = madness.immediateRemainingRounds || 0
      result += `💀 即时症状: ${madness.immediateSymptom.effect}\n`
      result += `📖 ${madness.immediateSymptom.description}\n`
      result += `⏱️ 剩余轮数: ${remaining}/${madness.immediateDuration}\n`
      result += `💡 行为: ${madness.immediateSymptom.behavior}\n\n`
    }

    // 总结症状
    if (madness.summarySymptom) {
      result += `🌀 总结症状: ${madness.summarySymptom.effect}\n`
      result += `📖 ${madness.summarySymptom.description}\n`

      // 如果是恐惧症或躁狂症，显示详细信息
      if (madness.summarySymptom.subtable === '恐惧症表' && madness.phobia) {
        result += `😱 恐惧症: ${madness.phobia.phobia}\n`
        result += `   ${madness.phobia.description}\n`
      } else if (madness.summarySymptom.subtable === '躁狂症表' && madness.mania) {
        result += `😵 躁狂症: ${madness.mania.mania}\n`
        result += `   ${madness.mania.description}\n`
      }

      if (madness.summaryRemainingHours) {
        result += `⏱️ 剩余时间: ${madness.summaryRemainingHours} 小时\n\n`
      } else {
        result += `⏱️ 状态: 永久\n\n`
      }
    }

    // 恐惧症
    if (madness.phobia && !madness.summarySymptom) {
      result += `😱 恐惧症: ${madness.phobia.phobia}\n`
      result += `   ${madness.phobia.description}\n\n`
    }

    // 躁狂症
    if (madness.mania && !madness.summarySymptom) {
      result += `😵 躁狂症: ${madness.mania.mania}\n`
      result += `   ${madness.mania.description}\n\n`
    }

    result += `💡 提示: 使用 .精神治疗 命令可以恢复理智`

    return result
  }

  /**
   * 战斗帮助命令
   */
  private async handleCombatHelp(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    return `⚔️ CoC7 战斗系统\n\n` +
           `📝 战斗命令：\n` +
           `• .战斗开始 - 启动战斗轮\n` +
           `• .攻击 <武器> [目标] - 进行攻击\n` +
           `• .闪避 - 闪避检定\n` +
           `• .反击 <武器> - 反击攻击\n` +
           `• .伤害 <数值> [原因] - 应用伤害\n` +
           `• .战斗状态 - 查看战斗状态\n` +
           `• .下一回合 - 进入下一轮\n` +
           `• .战斗结束 - 结束战斗\n\n` +
           `💡 提示：\n` +
           `• 战斗系统需要先创建并激活角色\n` +
           `• 使用 .角色创建 创建角色\n` +
           `• 使用 .角色激活 激活角色\n` +
           `• 使用 .角色状态 查看角色状态\n` +
           `• 使用 .角色恢复 恢复 HP\n\n` +
           `📖 武器示例：\n` +
           `• 匕首、军刀、左轮手枪、霰弹枪\n` +
           `• 步枪、冲锋枪、手榴弹等\n\n` +
           `🎲 常见武器技能：\n` +
           `• 格斗、斗殴、闪避\n` +
           `• 手枪、步枪、霰弹枪`
  }
}
