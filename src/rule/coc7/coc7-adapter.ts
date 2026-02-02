/**
 * CoC7 规则适配器
 *
 * @description
 * 实现《克苏鲁的呼唤》第7版规则系统的适配器。
 * - 5级成功等级（大成功、极难成功、困难成功、普通成功、失败、大失败）
 * - 伤害加值（DB）计算
 * - 技能熟练度系统
 * - 中英文技能名称映射
 * - 规则专属命令（.san, .ra, .对抗等）
 *
 * @module rule/coc7/coc7-adapter
 */

import {
  RuleSystemAdapter,
  SkillCheckParams,
  SkillCheckResult,
  ModifierBreakdown,
  SkillSchema,
  CreateCharacterParams,
  CreateCharacterResult,
  RuleCommand
} from '../base/rule-system-adapter'
import { DiceParser } from '../../core/utils/dice-parser'
import { Context, Session } from 'koishi'
import {
  COC7_DEFAULT_SKILLS,
  COC7_SKILL_MAPPINGS,
  COC7_DB_TABLE,
  COC7_SUCCESS_LEVELS,
  COC7_SUCCESS_EMOJIS
} from './coc7-defaults'
import { CoC7Commands } from './coc7-commands'
import { ConversationService } from '../../core/services/conversation.service'

/**
 * CoC7 规则适配器
 */
export class CoC7Adapter extends RuleSystemAdapter {
  readonly ruleSystem = 'coc7'
  readonly displayName = '克苏鲁的呼唤 7版'
  readonly defaultDiceExpression = '1d100'

  // 成功等级常量（实例访问）
  readonly SUCCESS_LEVELS = COC7_SUCCESS_LEVELS

  // CoC7 专属命令管理器
  private commands: CoC7Commands

  constructor() {
    super()
    this.commands = new CoC7Commands(this)
  }

  // ========== 角色创建方法 ==========

  /**
   * 创建角色
   *
   * @description
   * CoC7 规则系统的角色创建逻辑：
   * - 验证必需属性（力量、体质、体型、敏捷、外貌、智力、意志、教育）
   * - 计算衍生属性（耐久、理智、幸运、移动力、体格、伤害加值）
   * - 初始化默认技能
   *
   * @param params - 创建角色参数
   * @returns 创建角色结果
   */
  createCharacter(params: CreateCharacterParams): CreateCharacterResult {
    const attributes = params.attributes || {}
    const skills = params.skills || {}

    // 验证必需属性（CoC7 的 8 个核心属性）
    const requiredAttrs = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu']
    const missingAttrs = requiredAttrs.filter(attr => !(attr in attributes))

    if (missingAttrs.length > 0) {
      return {
        success: false,
        error: `缺少必需属性: ${missingAttrs.join(', ')}\n提示: CoC7 规则系统需要提供 8 个核心属性（力量、体质、体型、敏捷、外貌、智力、意志、教育）`
      }
    }

    // 验证属性值为数字
    for (const attr of requiredAttrs) {
      if (typeof attributes[attr] !== 'number' || isNaN(attributes[attr])) {
        return {
          success: false,
          error: `属性 ${attr} 的值必须为数字`
        }
      }
    }

    // 计算衍生属性
    const derivedAttrs: Record<string, any> = {
      hp: Math.floor((attributes.con + attributes.siz) / 10),  // 耐久
      mp: attributes.pow,                                       // 理智值
      san: attributes.pow,                                      // 理智上限
      luck: attributes.pow,                                     // 幸运
      move: this.calculateMove(attributes.str, attributes.dex, attributes.siz, attributes.ages || 0),  // 移动力
      build: 0,                                                 // 体格
      damageBonus: '',                                          // 伤害加值
    }

    // 计算伤害加值和体格
    const sumStrSiz = attributes.str + attributes.siz
    const dbResult = this.calculateDBAndBuild(sumStrSiz)
    derivedAttrs.damageBonus = dbResult.damageBonus
    derivedAttrs.build = dbResult.build

    // 合并属性
    const finalAttributes = {
      ...attributes,
      ...derivedAttrs,
    }

    // 初始化默认技能（如果未提供）
    const defaultSkills = this.getDefaultSkills()
    const finalSkills = { ...defaultSkills, ...skills }

    return {
      success: true,
      attributes: finalAttributes,
      skills: finalSkills,
      metadata: params.metadata || {},
    }
  }

  /**
   * 计算移动力
   *
   * @description
   * CoC7 移动力计算规则：
   * - 敏捷+力量 ≤ 64: 7
   * - 敏捷+力量 ≤ 124: 8
   * - 敏捷+力量 ≤ 164: 9
   * - 敏捷+力量 > 164: 移动力为 9
   * - 如果年龄 >= 40，移动力 -1
   *
   * @param str - 力量
   * @param dex - 敏捷
   * @param siz - 体型
   * @param age - 年龄
   * @returns 移动力
   */
  private calculateMove(str: number, dex: number, siz: number = 0, age: number = 0): number {
    const sum = str + dex + siz
    let move = 8

    if (sum <= 64) {
      move = 7
    } else if (sum <= 124) {
      move = 8
    } else if (sum <= 164) {
      move = 9
    } else {
      move = 9
    }

    // 年龄修正：40 岁以上 -1
    if (age >= 40) {
      move = Math.max(1, move - 1)
    }

    return move
  }

  /**
   * 计算伤害加值和体格
   *
   * @description
   * 根据力量和体型的总和计算伤害加值和体格。
   *
   * @param sumStrSiz - 力量 + 体型
   * @returns 伤害加值和体格
   */
  private calculateDBAndBuild(sumStrSiz: number): { damageBonus: string; build: number } {
    // 伤害加值表
    if (sumStrSiz >= 165) return { damageBonus: '+1d6', build: 2 }
    if (sumStrSiz >= 125) return { damageBonus: '+1d4', build: 1 }
    if (sumStrSiz >= 85) return { damageBonus: '+0', build: 0 }
    if (sumStrSiz >= 65) return { damageBonus: '-1', build: -1 }
    if (sumStrSiz >= 45) return { damageBonus: '-1d4', build: -2 }
    if (sumStrSiz >= 25) return { damageBonus: '-1d6', build: -3 }
    return { damageBonus: '-2d6', build: -4 }
  }

  // ========== 技能检定方法 ==========

  /**
   * 执行技能检定
   *
   * @description
   * CoC7 规则：
   * - 使用 1d100 掷骰
   * - 掷骰值 ≤ 技能值为成功
   * - 5个成功等级：大成功、极难成功、困难成功、普通成功、失败
   * - 大失败判定：技能<50时96+大失败，任何技能100大失败
   * - 支持奖励骰和惩罚骰机制
   *
   * @param params - 检定参数
   * @returns 检定结果
   */
  checkSkill(params: SkillCheckParams): SkillCheckResult {
    const { skillName, skillValue, modifier = 0, attributes, character } = params

    // 计算最终技能值
    const finalSkillValue = skillValue + modifier

    // 检查是否有骰子修正（奖励骰或惩罚骰）
    const bonusDice = (params.metadata?.bonusDice as number) || 0
    const penaltyDice = (params.metadata?.penaltyDice as number) || 0

    let roll: number
    let diceResult: any
    let diceExpression = this.defaultDiceExpression

    // 应用骰子修正
    if (bonusDice > 0 && penaltyDice > 0) {
      // 同时有奖励骰和惩罚骰，先抵消
      const netBonus = Math.max(0, bonusDice - penaltyDice)
      const netPenalty = Math.max(0, penaltyDice - bonusDice)

      if (netBonus > 0) {
        const result = DiceParser.rollWithBonusDice(netBonus)
        roll = result.final
        diceExpression = `${1 + netBonus}个十位骰(奖励骰) + 1个位骰`
        diceResult = {
          total: roll,
          detail: result.detail,
          rolls: [{ results: result.tens, finalResults: [result.tens[0]], total: roll }]
        }
      } else if (netPenalty > 0) {
        const result = DiceParser.rollWithPenaltyDice(netPenalty)
        roll = result.final
        diceExpression = `${1 + netPenalty}个十位骰(惩罚骰) + 1个位骰`
        diceResult = {
          total: roll,
          detail: result.detail,
          rolls: [{ results: result.tens, finalResults: [result.tens[0]], total: roll }]
        }
      } else {
        // 完全抵消，使用普通掷骰
        diceResult = DiceParser.evaluate(this.defaultDiceExpression)
        roll = diceResult.total
      }
    } else if (bonusDice > 0) {
      // 只有奖励骰
      const result = DiceParser.rollWithBonusDice(bonusDice)
      roll = result.final
      diceExpression = `${1 + bonusDice}个十位骰(奖励骰) + 1个位骰`
      diceResult = {
        total: roll,
        detail: result.detail,
        rolls: [{ results: result.tens, finalResults: [result.tens[0]], total: roll }]
      }
    } else if (penaltyDice > 0) {
      // 只有惩罚骰
      const result = DiceParser.rollWithPenaltyDice(penaltyDice)
      roll = result.final
      diceExpression = `${1 + penaltyDice}个十位骰(惩罚骰) + 1个位骰`
      diceResult = {
        total: roll,
        detail: result.detail,
        rolls: [{ results: result.tens, finalResults: [result.tens[0]], total: roll }]
      }
    } else {
      // 普通掷骰
      diceResult = DiceParser.evaluate(this.defaultDiceExpression)
      roll = diceResult.total
    }

    // 判定成功等级
    const successInfo = this.determineSuccessLevel(roll, finalSkillValue)

    // 计算伤害加值
    let dbString = ''
    if (attributes?.STR !== undefined && attributes?.SIZ !== undefined) {
      dbString = this.calculateDamageBonus(attributes.STR, attributes.SIZ)
    } else if (character?.attributes?.STR !== undefined && character?.attributes?.SIZ !== undefined) {
      dbString = this.calculateDamageBonus(character.attributes.STR, character.attributes.SIZ)
    }

    // 构建修正值明细
    const modifierBreakdown: ModifierBreakdown = {
      autoModifier: 0,
      manualModifier: modifier,
      totalModifier: modifier,
      breakdown: {
        manualBonus: modifier !== 0 ? modifier : undefined
      }
    }

    // 构建结果对象
    return {
      success: successInfo.level !== this.SUCCESS_LEVELS.FAILURE,
      successLevel: successInfo.level,
      criticalSuccess: successInfo.isCritical,
      criticalFailure: successInfo.isFumble,
      diceExpression,
      diceResult,
      skillValue,
      finalValue: finalSkillValue,
      rawRoll: roll,
      description: this.buildDescription(roll, finalSkillValue, successInfo),
      modifierBreakdown,
      metadata: {
        ruleSystem: this.ruleSystem,
        skillName,
        db: dbString || null,
        bonusDice: bonusDice > 0 ? bonusDice : undefined,
        penaltyDice: penaltyDice > 0 ? penaltyDice : undefined
      }
    }
  }

  /**
   * 判定成功等级
   *
   * @param roll - 掷骰值
   * @param skillValue - 技能值
   * @returns 成功等级信息
   */
  private determineSuccessLevel(
    roll: number,
    skillValue: number
  ): {
    level: string
    isCritical: boolean
    isFumble: boolean
  } {
    // 规则1：大成功（掷骰 ≤ 5，无条件）
    if (roll <= 5) {
      return {
        level: this.SUCCESS_LEVELS.CRITICAL_SUCCESS,
        isCritical: true,
        isFumble: false
      }
    }

    // 规则2：大失败
    // 技能 < 50 时，96+ 为大失败
    // 技能 ≥ 50 时，只有 100 为大失败
    if (roll === 100 || (roll >= 96 && skillValue < 50)) {
      return {
        level: this.SUCCESS_LEVELS.CRITICAL_FAILURE,
        isCritical: false,
        isFumble: true
      }
    }

    // 规则3：失败
    if (roll > skillValue) {
      return {
        level: this.SUCCESS_LEVELS.FAILURE,
        isCritical: false,
        isFumble: false
      }
    }

    // 规则4：极难成功（掷骰 ≤ 技能值 / 5）
    if (roll <= Math.floor(skillValue / 5)) {
      return {
        level: this.SUCCESS_LEVELS.EXTREME_SUCCESS,
        isCritical: false,
        isFumble: false
      }
    }

    // 规则5：困难成功（掷骰 ≤ 技能值 / 2）
    if (roll <= Math.floor(skillValue / 2)) {
      return {
        level: this.SUCCESS_LEVELS.HARD_SUCCESS,
        isCritical: false,
        isFumble: false
      }
    }

    // 规则6：普通成功（默认）
    return {
      level: this.SUCCESS_LEVELS.REGULAR_SUCCESS,
      isCritical: false,
      isFumble: false
    }
  }

  /**
   * 构建结果描述
   *
   * @param roll - 掷骰值
   * @param skillValue - 技能值
   * @param successInfo - 成功等级信息
   * @returns 描述文本
   */
  private buildDescription(
    roll: number,
    skillValue: number,
    successInfo: { level: string; isCritical: boolean; isFumble: boolean }
  ): string {
    const emoji = COC7_SUCCESS_EMOJIS[successInfo.level] || '🎲'
    return `${emoji} ${successInfo.level}`
  }

  /**
   * 计算伤害加值（DB）
   *
   * @description
   * 纯规则逻辑，根据力量和体型计算伤害加值。
   * CoC7 规则：
   * - STR+SIZ ≥ 165: +1d6
   * - STR+SIZ ≥ 125: +1d4
   * - STR+SIZ ≥ 85: 0
   * - STR+SIZ ≥ 65: -1
   * - STR+SIZ ≥ 45: -1d4
   * - STR+SIZ ≥ 25: -1d6
   * - STR+SIZ < 25: -2d6
   *
   * @param str - 力量属性
   * @param siz - 体型属性
   * @returns DB 字符串（如 "+1d4"）
   */
  calculateDamageBonus(str: number, siz: number): string {
    const sum = str + siz

    for (const [min, max, db] of COC7_DB_TABLE) {
      if (sum >= min && sum <= max) {
        return db
      }
    }

    // 超出表格范围，返回最大值
    return '+4d6'
  }

  /**
   * 判定伤害后的状态
   *
   * @description
   * 纯规则逻辑，判定伤害导致的角色状态。
   * CoC7 规则：
   * - HP ≤ 0: 意识丧失
   * - HP ≤ -maxHp/2: 死亡
   *
   * @param newHp - 新的 HP 值
   * @param maxHp - 最大 HP
   * @returns 状态判定结果
   */
  checkDamageStatus(
    newHp: number,
    maxHp: number
  ): {
    isUnconscious: boolean
    isDead: boolean
    conditions: string[]
  } {
    const conditions: string[] = []

    // CoC7 规则：HP ≤ 0 意识丧失
    const isUnconscious = newHp <= 0
    if (isUnconscious) {
      conditions.push('昏迷')
    }

    // CoC7 规则：HP ≤ -maxHp/2 死亡
    const deathThreshold = -Math.floor(maxHp / 2)
    const isDead = newHp <= deathThreshold
    if (isDead) {
      conditions.push('死亡')
    }

    return { isUnconscious, isDead, conditions }
  }

  /**
   * 格式化检定结果
   *
   * @param result - 检定结果
   * @returns 格式化后的文本
   */
  formatResult(result: SkillCheckResult): string {
    const lines: string[] = []

    // 技能名和基础值
    const skillName = result.metadata?.skillName || '技能检定'
    lines.push(`🎲 ${skillName} (${result.skillValue})`)

    // 掷骰结果
    lines.push(`📊 掷骰: ${result.rawRoll}/100`)

    // 成功等级
    const levelEmoji = COC7_SUCCESS_EMOJIS[result.successLevel || ''] || '🎲'
    lines.push(`${levelEmoji} ${result.successLevel}`)

    // 困难和极难阈值
    const skillValue = result.finalValue || result.skillValue
    const thresholds = this.getThresholds(skillValue)
    lines.push(`📈 困难:${thresholds.hard} 极难:${thresholds.extreme}`)

    // 伤害加值
    if (result.metadata?.db && result.metadata.db !== '0') {
      lines.push(`💥 伤害加值: ${result.metadata.db}`)
    }

    // 修正值
    if (result.modifierBreakdown?.totalModifier !== 0) {
      const mod = result.modifierBreakdown.totalModifier
      const modText = mod > 0 ? `+${mod}` : `${mod}`
      lines.push(`📊 修正值: ${modText}`)
    }

    return lines.join('\n')
  }

  /**
   * 获取困难和极难成功阈值
   *
   * @param skillValue - 技能值
   * @returns 阈值对象
   */
  private getThresholds(skillValue: number): { hard: number; extreme: number } {
    return {
      hard: Math.floor(skillValue / 2),
      extreme: Math.floor(skillValue / 5)
    }
  }

  // ========== 技能管理方法 ==========

  /**
   * 验证技能
   *
   * @description
   * CoC7 规则：
   * - 接受任何技能名称（灵活）
   * - 技能值必须为数字且在 0-150 范围内
   *
   * @param skillName - 技能名称（已规范化）
   * @param skillValue - 技能值
   * @returns 是否有效
   */
  validateSkill(skillName: string, skillValue: any): boolean {
    // 验证技能值是否为数字
    if (typeof skillValue !== 'number') {
      return false
    }

    // 验证范围：0-150
    return skillValue >= 0 && skillValue <= 150
  }

  /**
   * 获取默认技能列表
   *
   * @returns 技能名到默认值的映射
   */
  getDefaultSkills(): Record<string, any> {
    return { ...COC7_DEFAULT_SKILLS }
  }

  /**
   * 获取技能 Schema
   *
   * @returns 技能数据结构定义
   */
  getSkillSchema(): SkillSchema {
    return {
      type: 'simple' // CoC7 使用简单值格式
    }
  }

  /**
   * 格式化技能值
   *
   * @description
   * 转换为数字，限制在 0-150 范围内。
   *
   * @param skillValue - 用户输入的技能值
   * @returns 格式化后的技能值
   */
  formatSkillValue(skillValue: any): any {
    const num = Number(skillValue)
    if (isNaN(num)) {
      throw new Error(`无效的技能值: ${skillValue}`)
    }
    if (num < 0) {
      throw new Error(`技能值不能为负数: ${skillValue}`)
    }
    return Math.min(num, 150)
  }

  /**
   * 计算技能修正值
   *
   * @description
   * CoC7 通常不使用属性加值。
   * 特殊情况：闪避 = DEX / 2
   *
   * @param skillName - 技能名称
   * @param character - 角色数据
   * @returns 修正值明细
   */
  calculateSkillModifier(skillName: string, character: any): ModifierBreakdown {
    const breakdown: ModifierBreakdown = {
      autoModifier: 0,
      manualModifier: 0,
      totalModifier: 0,
      breakdown: {}
    }

    // 特殊情况：闪避 = DEX / 2
    if (skillName === 'dodge' || skillName === '闪避') {
      const dex =
        character?.attributes?.DEX ||
        character?.attributes?.['敏捷'] ||
        character?.attributes?.['dex'] ||
        0
      const dodgeValue = Math.floor(dex / 2)
      breakdown.autoModifier = dodgeValue
      breakdown.totalModifier = dodgeValue
      breakdown.breakdown.attributeBonus = dodgeValue
    }

    return breakdown
  }

  // ========== 通用方法 ==========

  /**
   * 获取技能名称映射
   *
   * @returns 技能别名到标准名的映射表
   */
  getSkillMappings(): Record<string, string> {
    return { ...COC7_SKILL_MAPPINGS }
  }

  /**
   * 规范化技能名称
   *
   * @description
   * 将中文技能名称转换为英文标准名称。
   *
   * @param skillName - 原始技能名称
   * @returns 规范化后的技能名称
   */
  normalizeSkillName(skillName: string): string {
    const mappings = this.getSkillMappings()
    return mappings[skillName] || skillName
  }

  // ========== 规则专属命令方法 ==========

  /**
   * 获取命令前缀
   *
   * @description
   * 覆盖基类方法，返回 CoC7 专属前缀
   */
  getCommandPrefix(): string {
    return '.coc7.'
  }

  /**
   * 获取短前缀
   *
   * @description
   * 返回 CoC7 的短前缀
   */
  getShortPrefix(): string {
    return '.c7.'
  }

  /**
   * 注册 CoC7 专属命令
   *
   * @description
   * 使用命令前缀注册，避免与其他规则冲突
   */
  async registerCommands(ctx: Context, conversationId: number): Promise<void> {
    const prefix = this.getCommandPrefix()
    const shortPrefix = this.getShortPrefix()
    const ruleCommands = this.commands.getCommands()

    for (const cmd of ruleCommands) {
      // 使用前缀注册命令
      const fullCommandName = prefix + cmd.name
      const shortCommandName = shortPrefix + cmd.name

      ctx.command(fullCommandName)
        .alias(shortCommandName)  // 添加短前缀别名
        .alias(...(cmd.aliases || []).map(a => prefix + a))  // 其他别名也加前缀
        .alias(cmd.name)  // 无前缀别名（软注销验证会处理）
        .action(async ({ session }, args) => {
          // 软注销：运行时验证
          const validation = await this.validateInConversationCommand(ctx, session)

          if (!validation.valid) {
            return validation.error
          }

          // 验证会话规则
          const conversationService = new ConversationService(ctx)
          const conversation = await conversationService.getActiveConversation({
            channel: {
              platform: session.platform,
              guildId: session.guildId || '0',
              channelId: session.channelId || '0',
            }
          })

          if (conversation && conversation.rule_system !== 'coc7') {
            // 获取用户使用的命令名
            const commandUsed = session.content.trim().split(' ')[0]
            const hasRulePrefix = commandUsed.startsWith('.coc7.') ||
                                  commandUsed.startsWith('.c7.')

            if (hasRulePrefix) {
              // 带前缀：明确告知此命令不适用于当前规则
              return `❌ ${commandUsed} 仅适用于 CoC7 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 如需使用 CoC7 规则，请创建 CoC7 会话`
            } else {
              // 无前缀：建议使用带前缀版本或切换会话
              return `❌ ${cmd.name} 仅适用于 CoC7 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 请使用：${fullCommandName} 或 ${shortCommandName}`
            }
          }

          // 执行命令
          return cmd.handler(ctx, session, args)
        })

      ctx.logger.info(`[CoC7Adapter] 已注册命令: ${fullCommandName} (别名: ${shortCommandName})`)
    }
  }

  /**
   * 获取规则命令列表
   *
   * @returns CoC7 规则命令数组
   */
  getRuleCommands(): RuleCommand[] {
    return this.commands.getCommands()
  }
}
