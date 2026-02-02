/**
 * CoC7 战斗命令实现
 *
 * @description
 * 战斗命令处理器，集成角色卡服务。
 *
 * @module rule/coc7/combat/combat-commands
 */

import { Context, Session } from 'koishi'
import { getWeapon } from '../data/weapons'
import { DamageCalculator } from './damage-calculator'
import { createCombatManager } from './combat-manager'
import { ConversationService, createConversationService } from '../../../core/services/conversation.service'
import { CharacterService } from '../../../core/services/character.service'
import { CoC7CharacterService } from '../coc7-character-service'
import { CoC7Adapter } from '../coc7-adapter'

/**
 * 战斗命令处理器类
 */
export class CombatCommands {
  private ctx: Context
  private characterService: CoC7CharacterService
  private globalService: CharacterService

  constructor(ctx: Context) {
    this.ctx = ctx
    this.characterService = new CoC7CharacterService(ctx)
    this.globalService = new CharacterService(ctx)
  }

  /**
   * 获取会话服务
   */
  private getConversationService(): ConversationService {
    return createConversationService(this.ctx)
  }

  /**
   * 获取当前会话的激活角色
   */
  private async getActiveCharacter(session: Session) {
    const conversationService = this.getConversationService()
    const conversation = await conversationService.getActiveConversation({
      channel: {
        platform: session.platform,
        guildId: session.guildId || '0',
        channelId: session.channelId || '0',
      },
    })

    if (!conversation) {
      return null
    }

    return await this.globalService.getActiveCharacter(
      conversation.id!,
      parseInt(session.userId) || 0
    )
  }

  /**
   * 战斗开始命令
   */
  async handleCombatStart(session: Session): Promise<string> {
    try {
      const conversationService = this.getConversationService()
      const conversation = await conversationService.getActiveConversation({
        channel: {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        },
      })

      if (!conversation) {
        return '❌ 未找到活跃会话\n💡 请先创建或加入会话'
      }

      // 检查是否已有战斗
      const combatManager = createCombatManager(this.ctx)
      const existingState = combatManager.getCombatState(conversation.id!)
      if (existingState) {
        return '❌ 当前会话已有进行中的战斗\n💡 使用 ".战斗结束" 结束当前战斗'
      }

      // 获取激活角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先使用 ".char create" 创建角色'
      }

      // 获取角色战斗数据
      const combatData = await this.characterService.getCombatData(character.id!)

      if (!combatData) {
        return '❌ 无法获取角色战斗数据\n💡 请确保角色数据完整'
      }

      // 启动战斗
      const state = combatManager.startCombat(conversation.id!, [{
        characterId: character.id!,
        characterName: combatData.characterName,
        dexterity: combatData.dexterity,
        combatSkill: combatData.combatSkill || 0,
        isNpc: false,
        hasActed: false,
        isDelayed: false,
      }])

      return `⚔️ 战斗开始！\n\n` +
             `📊 回合: ${state.round}\n` +
             `👤 参与者: ${state.turnOrder.map(t => t.characterName).join(', ')}\n` +
             `🎯 当前行动: ${state.turnOrder[0]?.characterName}\n\n` +
             `💡 提示：使用 ".攻击 <武器>" 开始攻击`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:战斗开始] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 战斗结束命令
   */
  async handleCombatEnd(session: Session): Promise<string> {
    try {
      const conversationService = this.getConversationService()
      const conversation = await conversationService.getActiveConversation({
        channel: {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        },
      })

      if (!conversation) {
        return '❌ 未找到活跃会话'
      }

      const combatManager = createCombatManager(this.ctx)
      await combatManager.loadCombatState(conversation.id!)

      const state = combatManager.getCombatState(conversation.id!)

      if (!state) {
        return '❌ 当前没有进行中的战斗'
      }

      combatManager.endCombat(conversation.id!)

      return `⚔️ 战斗结束！\n\n` +
             `📊 总回合数: ${state.round}\n` +
             `⏱️ 持续时间: ${Math.round((Date.now() - state.startTime.getTime()) / 60000)} 分钟`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:战斗结束] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 战斗状态命令
   */
  async handleCombatStatus(session: Session): Promise<string> {
    try {
      const conversationService = this.getConversationService()
      const conversation = await conversationService.getActiveConversation({
        channel: {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        },
      })

      if (!conversation) {
        return '❌ 未找到活跃会话'
      }

      const combatManager = createCombatManager(this.ctx)
      await combatManager.loadCombatState(conversation.id!)

      return combatManager.getCombatSummary(conversation.id!)
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:战斗状态] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 下一回合命令
   */
  async handleCombatNext(session: Session): Promise<string> {
    try {
      const conversationService = this.getConversationService()
      const conversation = await conversationService.getActiveConversation({
        channel: {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        },
      })

      if (!conversation) {
        return '❌ 未找到活跃会话'
      }

      const combatManager = createCombatManager(this.ctx)
      await combatManager.loadCombatState(conversation.id!)

      const nextTurn = combatManager.nextTurn(conversation.id!)

      if (!nextTurn) {
        return '❌ 战斗已结束或不存在'
      }

      return `➡️ 下一回合\n\n` +
             `👤 当前行动: ${nextTurn.characterName} (DEX: ${nextTurn.dexterity})\n` +
             `💡 提示：使用 ".攻击 <武器>" 进行攻击`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:下一回合] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 攻击命令（重构版 - 使用服务层接口）
   */
  async handleAttack(session: Session, args: string): Promise<string> {
    try {
      const parts = args.trim().split(/\s+/)
      if (parts.length === 0 || !parts[0]) {
        return '❌ 请指定武器\n💡 格式: .攻击 <武器> [目标]\n💡 示例: .攻击 匕首 邪教徒'
      }

      const weaponName = parts[0]
      const target = parts[1] || '目标'

      // 获取激活角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先使用 ".char create" 创建角色'
      }

      // 获取武器数据
      const weapon = getWeapon(weaponName)
      if (!weapon) {
        return `❌ 未找到武器: ${weaponName}\n💡 常见武器: 匕首, 军刀, 左轮手枪, 霰弹枪`
      }

      // 从服务层获取攻击技能（统一入口）
      const attackSkill = await this.characterService.getAttackSkill(
        character.id!,
        weapon.name
      )

      if (!attackSkill) {
        return `❌ 角色未学习技能: ${weapon.skill}\n💡 请先使用 ".skill set ${weapon.skill} <值>" 设置技能`
      }

      // 执行技能检定
      const adapter = new CoC7Adapter()
      const checkResult = adapter.checkSkill({
        skillName: weapon.skill,
        skillValue: attackSkill,
      })

      // 如果命中，计算并应用伤害
      let damageText = ''
      if (checkResult.success) {
        // 计算基础伤害
        const calculator = new DamageCalculator()

        // 将成功等级字符串转换为数字
        const successLevelMap: Record<string, number> = {
          '💎 大成功': 5,
          '✨ 极难成功': 4,
          '👍 困难成功': 3,
          '✅ 普通成功': 2,
          '❌ 失败': 0,
        }
        const successLevelNumber = checkResult.successLevel
          ? successLevelMap[checkResult.successLevel] || 2
          : 2

        const baseDamage = calculator.calculateDamage(
          weapon,
          0,  // DB 将在服务层计算
          successLevelNumber
        ).total

        // 调用服务层应用战斗伤害（服务层会处理 DB 和状态判定）
        const damageResult = await this.characterService.applyCombatDamage(
          character.id!,
          baseDamage
        )

        damageText = `\n💥 伤害: ${damageResult.damage}`
        damageText += `\n❤️ HP: ${damageResult.oldHp} → ${damageResult.newHp}`

        if (damageResult.isUnconscious) {
          damageText += '\n\n⚠️ 角色已昏迷！'
        }
        if (damageResult.isDead) {
          damageText += '\n\n💀 角色已死亡！'
        }
      }

      return `⚔️ ${character.name} 使用 ${weapon.name} 攻击 ${target}\n\n` +
             `🎲 掷骰: ${checkResult.rawRoll}\n` +
             `📊 技能: ${weapon.skill} (${attackSkill})\n` +
             `✅ 结果: ${checkResult.successLevel}${damageText}`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:攻击] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 闪避命令
   */
  async handleDodge(session: Session): Promise<string> {
    try {
      // 获取激活角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先使用 ".char create" 创建角色'
      }

      // 获取闪避技能
      const skillResult = await this.characterService.getSkillValue(
        character.id!,
        '闪避'
      )

      const skillValue = skillResult?.value || 0
      const roll = Math.floor(Math.random() * 100) + 1

      let successLevelName = '失败'
      if (roll <= 5) {
        successLevelName = '💎 大成功'
      } else if (roll <= Math.floor(skillValue / 5)) {
        successLevelName = '✨ 极难成功'
      } else if (roll <= Math.floor(skillValue / 2)) {
        successLevelName = '👍 困难成功'
      } else if (roll <= skillValue) {
        successLevelName = '✅ 普通成功'
      }

      return `💨 ${character.name} 尝试闪避\n\n` +
             `🎲 掷骰: ${roll}\n` +
             `📊 技能: 闪避 (${skillValue})\n` +
             `✅ 结果: ${successLevelName}`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:闪避] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 反击命令
   */
  async handleCounter(session: Session, args: string): Promise<string> {
    try {
      const weaponName = args.trim()

      if (!weaponName) {
        return '❌ 请指定武器\n💡 格式: .反击 <武器>\n💡 示例: .反击 匕首'
      }

      // 获取激活角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先使用 ".char create" 创建角色'
      }

      const weapon = getWeapon(weaponName)
      if (!weapon) {
        return `❌ 未找到武器: ${weaponName}`
      }

      // 获取技能值
      const skillResult = await this.characterService.getSkillValue(
        character.id!,
        weapon.skill
      )

      const skillValue = skillResult?.value || 0
      const roll = Math.floor(Math.random() * 100) + 1

      let successLevel = 0
      let successLevelName = '失败'
      if (roll <= 5) {
        successLevel = 5
        successLevelName = '💎 大成功'
      } else if (roll <= Math.floor(skillValue / 5)) {
        successLevel = 4
        successLevelName = '✨ 极难成功'
      } else if (roll <= Math.floor(skillValue / 2)) {
        successLevel = 3
        successLevelName = '👍 困难成功'
      } else if (roll <= skillValue) {
        successLevel = 2
        successLevelName = '✅ 普通成功'
      }

      let damageText = ''
      if (successLevel >= 2) {
        const calculator = new DamageCalculator()

        // 获取属性值
        const str = await this.characterService.getAttributeValue(character.id!, 'str')
        const siz = await this.characterService.getAttributeValue(character.id!, 'siz')

        const db = calculator.rollDB(
          calculator.calculateDB(str || 50, siz || 50)
        )
        const damageResult = calculator.calculateDamage(
          weapon,
          db,
          successLevel
        )
        damageText = `\n${calculator.formatDamageResult(damageResult)}`
      }

      return `⚔️ ${character.name} 使用 ${weapon.name} 反击\n\n` +
             `🎲 掷骰: ${roll}\n` +
             `📊 技能: ${weapon.skill} (${skillValue})\n` +
             `✅ 结果: ${successLevelName}${damageText}`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:反击] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 伤害命令
   */
  async handleDamage(session: Session, args: string): Promise<string> {
    try {
      const parts = args.trim().split(/\s+/)
      if (parts.length === 0 || !parts[0]) {
        return '❌ 请指定伤害数值\n💡 格式: .伤害 <数值> [原因]\n💡 示例: .伤害 5 匕首'
      }

      const damage = parseInt(parts[0])
      const reason = parts.slice(1).join(' ') || '伤害'

      if (isNaN(damage)) {
        return `❌ 无效的伤害数值: ${parts[0]}`
      }

      // 获取激活角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先使用 ".char create" 创建角色'
      }

      // 使用规则服务应用伤害
      const result = await this.characterService.applyDamage(
        character.id!,
        damage,
        reason
      )

      let output = `💔 ${character.name} 受到 ${damage} 点 ${reason}\n\n`
      output += `❤️ HP: ${result.oldHp} → ${result.newHp}`

      if (result.isUnconscious) {
        output += '\n\n⚠️ 警告：角色已失去意识！'
      }

      if (result.isDead) {
        output += '\n\n💀 角色已死亡！'
      }

      return output
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:伤害] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }
}
