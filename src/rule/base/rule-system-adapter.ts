/**
 * 规则系统适配器基类
 *
 * @description
 * 定义了所有规则系统适配器必须实现的接口。
 * 采用策略模式，每个规则系统（CoC7、D&D 5e等）都有自己的适配器实现。
 *
 * @module rule/base/rule-system-adapter
 */

import { DiceResult } from '../../core/utils/dice-parser'
import { Context, Session } from 'koishi'

/**
 * 规则专属命令接口
 *
 * @description
 * 定义了规则系统的专属命令结构
 */
export interface RuleCommand {
  /** 命令名称（不含前缀） */
  name: string
  /** 命令别名（不含前缀） */
  aliases?: string[]
  /** 命令描述 */
  description: string
  /** 命令用法 */
  usage?: string
  /** 示例 */
  examples?: string[]
  /** 命令执行函数 */
  handler: (ctx: Context, session: Session, args: string) => Promise<string>
}

/**
 * 命令验证结果接口
 *
 * @description
 * 定义了会话内命令的验证结果
 */
export interface CommandValidationResult {
  /** 是否通过验证 */
  valid: boolean
  /** 错误消息 */
  error?: string
  /** 会话ID */
  conversationId?: number
  /** 用户ID */
  userId?: number
  /** 角色数据 */
  character?: any
}

/**
 * 创建角色参数
 */
export interface CreateCharacterParams {
  /** 角色名称 */
  name: string
  /** 属性数据 (JSON) */
  attributes?: Record<string, any>
  /** 技能数据 (JSON) */
  skills?: Record<string, any>
  /** 背景故事 */
  background?: string
  /** 其他元数据 */
  metadata?: Record<string, any>
}

/**
 * 创建角色结果
 */
export interface CreateCharacterResult {
  /** 是否成功 */
  success: boolean
  /** 处理后的属性数据 */
  attributes?: Record<string, any>
  /** 处理后的技能数据 */
  skills?: Record<string, any>
  /** 元数据 */
  metadata?: Record<string, any>
  /** 错误消息 */
  error?: string
}

/**
 * 技能检定参数接口
 */
export interface SkillCheckParams {
  /** 技能名称 */
  skillName: string
  /** 技能基础值 */
  skillValue: number
  /** 角色属性 (用于自动计算修正) */
  attributes?: Record<string, number>
  /** 熟练度等级 */
  proficiencyLevel?: string
  /** 命令行临时修正值 */
  modifier?: number
  /** 角色数据 */
  character?: any
  /** 元数据（用于骰子修正等额外信息） */
  metadata?: {
    bonusDice?: number
    penaltyDice?: number
    [key: string]: any
  }
}

/**
 * 修正值明细接口
 */
export interface ModifierBreakdown {
  /** 自动修正值 (属性加值、熟练度等) */
  autoModifier: number
  /** 命令行临时修正值 */
  manualModifier: number
  /** 总修正值 */
  totalModifier: number
  /** 修正值详细说明 */
  breakdown: {
    /** 属性加值 */
    attributeBonus?: number
    /** 熟练度加值 */
    proficiencyBonus?: number
    /** CoC伤害加值 */
    dbBonus?: number
    /** 其他规则特定修正 */
    otherBonus?: number
    /** 命令行修正 */
    manualBonus?: number
  }
}

/**
 * 技能检定结果接口
 */
export interface SkillCheckResult {
  /** 是否成功 */
  success: boolean
  /** 成功等级 (CoC: 困难成功, D&D: 成功) */
  successLevel?: string
  /** 是否为大成功 */
  criticalSuccess?: boolean
  /** 是否为大失败 */
  criticalFailure?: boolean
  /** 骰子表达式 (如 "1d100" 或 "1d20+5") */
  diceExpression: string
  /** 骰子结果对象 */
  diceResult: DiceResult
  /** 技能基础值 */
  skillValue: number
  /** 最终对比值 (技能+修正) */
  finalValue?: number
  /** 原始掷骰值 */
  rawRoll: number
  /** 结果描述 */
  description?: string
  /** 修正值明细 (用于详细显示) */
  modifierBreakdown?: ModifierBreakdown
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 技能数据结构定义
 */
export interface SkillSchema {
  /** 数据类型 */
  type: 'simple' | 'object'
  /** 对象结构的字段定义（仅type=object时） */
  fields?: Record<string, {
    type: 'string' | 'number' | 'enum'
    enum?: string[]
    required?: boolean
    default?: any
  }>
}

/**
 * 规则系统适配器抽象基类
 *
 * 所有规则系统适配器必须继承此类并实现抽象方法。
 *
 * @example
 * ```typescript
 * class CoC7Adapter extends RuleSystemAdapter {
 *   readonly ruleSystem = 'coc7'
 *   readonly displayName = '克苏鲁的呼唤 7版'
 *
 *   checkSkill(params: SkillCheckParams): SkillCheckResult {
 *     // 实现CoC7的检定逻辑
 *   }
 *
 *   formatResult(result: SkillCheckResult): string {
 *     // 格式化CoC7的输出
 *   }
 *
 *   // ... 其他方法实现
 * }
 * ```
 */
export abstract class RuleSystemAdapter {
  /** 规则系统标识符 */
  abstract readonly ruleSystem: string

  /** 规则系统显示名称 */
  abstract readonly displayName: string

  /** 默认骰子表达式 */
  abstract readonly defaultDiceExpression: string

  // ========== 角色创建方法 ==========

  /**
   * 创建角色
   *
   * @description
   * 根据规则系统处理角色创建逻辑。
   * 验证并规范化属性和技能数据，计算衍生属性。
   *
   * @param params - 创建角色参数
   * @returns 创建角色结果
   */
  abstract createCharacter(params: CreateCharacterParams): CreateCharacterResult

  // ========== 技能检定方法 ==========

  /**
   * 执行技能检定
   *
   * @description
   * 核心方法：根据规则系统的逻辑执行技能检定。
   *
   * @param params - 检定参数
   * @returns 检定结果
   */
  abstract checkSkill(params: SkillCheckParams): SkillCheckResult

  /**
   * 计算自动修正值（可选）
   *
   * @description
   * 计算规则系统特定的自动修正值（如属性加值、熟练度加值等）。
   * 如果不需要，可以不实现此方法。
   *
   * @param params - 检定参数
   * @returns 修正值明细
   */
  calculateAutoModifier?(params: SkillCheckParams): ModifierBreakdown

  /**
   * 格式化检定结果
   *
   * @param result - 检定结果
   * @returns 格式化后的文本
   */
  abstract formatResult(result: SkillCheckResult): string

  // ========== 技能管理方法 ==========

  /**
   * 验证技能名称和值是否有效
   *
   * @param skillName - 技能名称（已规范化）
   * @param skillValue - 技能值
   * @returns 是否有效
   */
  abstract validateSkill(skillName: string, skillValue: any): boolean

  /**
   * 获取规则系统的默认技能列表
   *
   * @returns 技能名到默认值的映射
   */
  abstract getDefaultSkills(): Record<string, any>

  /**
   * 获取技能数据结构定义
   *
   * @returns 技能Schema（简单值或对象结构）
   */
  abstract getSkillSchema(): SkillSchema

  /**
   * 格式化技能值
   *
   * @description
   * 将用户输入的技能值转换为规则系统所需的格式。
   *
   * @param skillValue - 用户输入的技能值
   * @returns 格式化后的技能值
   */
  abstract formatSkillValue(skillValue: any): any

  /**
   * 计算技能的自动修正值
   *
   * @param skillName - 技能名称
   * @param character - 角色数据
   * @returns 修正值明细
   */
  abstract calculateSkillModifier(
    skillName: string,
    character: any
  ): ModifierBreakdown

  // ========== 通用方法 ==========

  /**
   * 获取技能名称映射
   *
   * @returns 技能别名到标准名的映射表
   */
  abstract getSkillMappings(): Record<string, string>

  /**
   * 规范化技能名称
   *
   * @description
   * 将用户输入的技能名称转换为规则系统的标准名称。
   * 例如：CoC7中"侦查" → "spot_hidden"。
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
   * 返回该规则系统的命令前缀。
   * 默认返回 `.<ruleSystem>.`
   * 子类可以覆盖此方法以自定义前缀。
   *
   * @returns 命令前缀（包含点号）
   *
   * @example
   * CoC7Adapter → '.coc7.'
   * GenericAdapter → '.generic.'
   */
  getCommandPrefix(): string {
    return `.${this.ruleSystem}.`
  }

  /**
   * 获取短前缀
   *
   * @description
   * 提供更短的命令别名。
   *
   * @returns 短前缀（包含点号）
   *
   * @example
   * CoC7Adapter → '.c7.'
   * GenericAdapter → '.gen.'
   */
  getShortPrefix(): string {
    const shortMap: Record<string, string> = {
      'coc7': 'c7',
      'generic': 'gen'
    }
    return `.${shortMap[this.ruleSystem] || this.ruleSystem}.`
  }

  /**
   * 注册该规则系统的专属命令
   *
   * @description
   * 子类实现此方法以注册规则特定的命令。
   *
   * @param ctx - Koishi 上下文
   * @param conversationId - 会话ID
   */
  abstract registerCommands(ctx: Context, conversationId: number): Promise<void>

  /**
   * 获取该规则系统的命令列表
   *
   * @returns 规则命令数组
   */
  abstract getRuleCommands(): RuleCommand[]

  /**
   * 获取命令帮助信息
   *
   * @returns 帮助文本
   */
  getCommandHelp(): string {
    const commands = this.getRuleCommands()
    let help = `📚 ${this.displayName} 规则专属命令:\n\n`

    for (const cmd of commands) {
      help += `• ${cmd.name}`
      if (cmd.aliases && cmd.aliases.length > 0) {
        help += ` (别名: ${cmd.aliases.join(', ')})`
      }
      help += `\n  ${cmd.description}\n`
      if (cmd.usage) {
        help += `  用法: ${cmd.usage}\n`
      }
      help += '\n'
    }

    return help
  }

  /**
   * 验证会话内命令执行条件
   *
   * @description
   * 会话内命令的双重验证:
   * 1. 用户必须在活跃会话中
   * 2. 用户必须在会话中有激活角色
   *
   * @param ctx - Koishi 上下文
   * @param session - Koishi 会话对象
   * @returns 验证结果
   */
  async validateInConversationCommand(
    ctx: Context,
    session: Session
  ): Promise<CommandValidationResult> {
    const { ConversationService } = await import('../../core/services/conversation.service')
    const { CharacterService } = await import('../../core/services/character.service')
    const { UserService } = await import('../../core/services/user.service')

    const conversationService = new ConversationService(ctx)
    const characterService = new CharacterService(ctx)
    const userService = new UserService(ctx)

    // 1. 验证用户是否在活跃会话中
    const channelInfo = {
      platform: session.platform,
      guildId: session.guildId || '0',
      channelId: session.channelId || '0',
    }

    const conversation = await conversationService.getActiveConversation({
      channel: channelInfo,
    })

    if (!conversation) {
      return {
        valid: false,
        error: '❌ 当前频道没有活跃的会话\n' +
               '💡 请先使用 "会话创建" 或 "会话加入" 命令创建或加入一个会话'
      }
    }

    // 2. 获取用户ID
    const userId = await userService.getUserIdFromSession(session)

    // 3. 验证用户是否有激活角色
    const character = await characterService.getActiveCharacter(
      conversation.id!,
      userId
    )

    if (!character) {
      return {
        valid: false,
        error: '❌ 您在该会话中没有激活的角色\n' +
               '💡 请先使用 ".char create <角色名>" 创建角色，\n' +
               '    或使用 ".char set <角色名>" 激活已有角色'
      }
    }

    // 4. 验证角色规则系统是否与会话匹配
    if (character.rule_system !== conversation.rule_system) {
      return {
        valid: false,
        error: `❌ 角色规则(${character.rule_system})与会话规则(${conversation.rule_system})不一致\n` +
               `💡 请激活规则为 ${conversation.rule_system} 的角色`
      }
    }

    // 验证通过
    return {
      valid: true,
      conversationId: conversation.id,
      userId,
      character
    }
  }
}
