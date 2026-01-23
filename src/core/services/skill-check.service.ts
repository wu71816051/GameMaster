/**
 * 技能检定服务
 *
 * @description
 * 负责处理技能检定的业务逻辑。
 * 协调规则系统适配器、角色服务和骰子服务。
 *
 * 核心职责：
 * - 获取激活角色
 * - 从 character.skills JSON 读取技能值
 * - 根据规则系统选择适配器
 * - 调用适配器执行检定
 * - 记录检定结果到 conversation_message 表
 *
 * @module core/services/skill-check.service
 */

import { Context } from 'koishi'
import { CharacterService } from './character.service'
import { ConversationService } from './conversation.service'
import { RuleSystemAdapter, SkillCheckParams, SkillCheckResult } from '../../rule/base/rule-system-adapter'
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'

/**
 * 执行技能检定的参数接口
 */
export interface PerformSkillCheckParams {
  /** 会话 ID */
  conversationId: number
  /** 用户 ID */
  userId: number
  /** 技能名称 */
  skillName: string
  /** 手动指定的技能值（可选） */
  manualValue?: number
  /** 命令行修正值（可选） */
  modifier?: number
  /** 目标难度 - D&D的DC（可选） */
  difficulty?: number
}

/**
 * 执行技能检定的结果接口
 */
export interface PerformSkillCheckResult {
  /** 是否成功 */
  success: boolean
  /** 检定结果 */
  result?: SkillCheckResult
  /** 错误消息 */
  error?: string
}

/**
 * 技能检定服务类
 */
export class SkillCheckService {
  private ctx: Context
  private logger
  private characterService: CharacterService
  private conversationService: ConversationService

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
    this.characterService = new CharacterService(ctx)
    this.conversationService = new ConversationService(ctx)
  }

  /**
   * 执行技能检定
   *
   * @description
   * 主要方法：执行完整的技能检定流程。
   *
   * 流程：
   * 1. 获取激活角色
   * 2. 根据角色规则系统选择适配器
   * 3. 规范化技能名称
   * 4. 获取技能值（从角色数据或手动指定）
   * 5. 调用适配器执行检定
   *
   * @param params - 检定参数
   * @returns 检定结果
   */
  async performSkillCheck(params: PerformSkillCheckParams): Promise<PerformSkillCheckResult> {
    try {
      this.logger.info('[SkillCheckService] ========== 开始技能检定 ==========', {
        userId: params.userId,
        skillName: params.skillName,
        manualValue: params.manualValue,
        modifier: params.modifier,
        conversationId: params.conversationId,
      })

      // 1. 获取激活角色
      this.logger.debug('[SkillCheckService] 步骤 1: 获取激活角色')
      const character = await this.characterService.getActiveCharacter(
        params.conversationId,
        params.userId
      )

      if (!character) {
        this.logger.warn('[SkillCheckService] 未找到激活角色', {
          conversationId: params.conversationId,
          userId: params.userId,
        })
        return {
          success: false,
          error: '未找到激活角色，请先创建或激活角色'
        }
      }

      this.logger.info('[SkillCheckService] 步骤 1: 找到激活角色', {
        characterId: character.id,
        characterName: character.name,
        ruleSystem: character.rule_system,
      })

      // 2. 获取规则系统适配器
      this.logger.debug('[SkillCheckService] 步骤 2: 获取规则系统适配器')
      const registry = getRuleSystemRegistry()
      const availableSystems = registry.getRegisteredSystems()
      this.logger.debug('[SkillCheckService] 已注册的规则系统', { systems: availableSystems })

      const adapter = registry.getAdapter(character.rule_system)

      if (!adapter) {
        this.logger.error('[SkillCheckService] 不支持的规则系统', {
          requestedRuleSystem: character.rule_system,
          availableSystems,
        })
        return {
          success: false,
          error: `不支持的规则系统: ${character.rule_system}`
        }
      }

      this.logger.info('[SkillCheckService] 步骤 2: 获取到规则适配器', {
        ruleSystem: adapter.ruleSystem,
        displayName: adapter.displayName,
      })

      // 3. 规范化技能名称
      this.logger.debug('[SkillCheckService] 步骤 3: 规范化技能名称')
      const normalizedSkillName = adapter.normalizeSkillName(params.skillName)

      this.logger.info('[SkillCheckService] 步骤 3: 技能名称规范化', {
        original: params.skillName,
        normalized: normalizedSkillName,
      })

      // 4. 获取技能值
      this.logger.debug('[SkillCheckService] 步骤 4: 获取技能值')
      let skillValue: number

      if (params.manualValue !== undefined) {
        // 手动指定技能值
        skillValue = params.manualValue
        this.logger.info('[SkillCheckService] 步骤 4: 使用手动指定的技能值', { skillValue })
      } else {
        // 从角色数据获取技能值
        this.logger.debug('[SkillCheckService] 步骤 4: 从角色数据获取技能值', {
          skillName: normalizedSkillName,
        })

        skillValue = this.getSkillValueFromCharacter(character, normalizedSkillName)

        if (skillValue === null) {
          this.logger.warn('[SkillCheckService] 步骤 4: 技能不存在', {
            skillName: normalizedSkillName,
            skillsKeys: Object.keys(character.skills || {}),
            skillsType: typeof character.skills,
          })
          return {
            success: false,
            error: `角色未学习技能: ${params.skillName}`
          }
        }

        this.logger.info('[SkillCheckService] 步骤 4: 从角色获取技能值成功', { skillValue })
      }

      // 5. 获取技能元数据（熟练度等）
      this.logger.debug('[SkillCheckService] 步骤 5: 获取技能元数据')
      const skillMetadata = this.getSkillMetadata(character, normalizedSkillName)
      this.logger.debug('[SkillCheckService] 步骤 5: 技能元数据', { metadata: skillMetadata })

      // 6. 构建检定参数
      this.logger.debug('[SkillCheckService] 步骤 6: 构建检定参数')
      const checkParams: SkillCheckParams = {
        skillName: normalizedSkillName,
        skillValue,
        attributes: character.attributes || {},
        proficiencyLevel: skillMetadata?.proficiencyLevel,
        modifier: params.modifier,
        character,
      }

      this.logger.debug('[SkillCheckService] 步骤 6: 检定参数', {
        skillName: checkParams.skillName,
        skillValue: checkParams.skillValue,
        modifier: checkParams.modifier,
        hasAttributes: Object.keys(checkParams.attributes || {}).length > 0,
      })

      // 7. 计算自动修正值（如果适配器支持）
      this.logger.debug('[SkillCheckService] 步骤 7: 计算自动修正值')
      let autoModifier = 0
      if (adapter.calculateAutoModifier) {
        const modifierBreakdown = adapter.calculateAutoModifier(checkParams)
        autoModifier = modifierBreakdown.autoModifier
        this.logger.debug('[SkillCheckService] 步骤 7: 自动修正值', {
          autoModifier,
          breakdown: modifierBreakdown,
        })
      } else {
        this.logger.debug('[SkillCheckService] 步骤 7: 适配器不支持自动修正值计算')
      }

      // 8. 执行检定
      this.logger.debug('[SkillCheckService] 步骤 8: 执行检定')
      const result = adapter.checkSkill(checkParams)

      this.logger.info('[SkillCheckService] 步骤 8: 检定完成', {
        success: result.success,
        roll: result.rawRoll,
        finalValue: result.finalValue,
        successLevel: result.successLevel,
      })

      // 9. 记录检定结果到数据库
      await this.recordCheckResult({
        conversationId: params.conversationId,
        userId: params.userId,
        skillName: normalizedSkillName,
        result,
        character,
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      this.logger.error('[SkillCheckService] 检定失败', error)
      return {
        success: false,
        error: '检定失败，请稍后重试'
      }
    }
  }

  /**
   * 从角色获取技能值
   *
   * @description
   * 支持 CoC7 简单值格式和 D&D 5e 对象格式。
   *
   * @param character - 角色数据
   * @param normalizedSkillName - 规范化后的技能名
   * @returns 技能值，如果技能不存在则返回null
   */
  private getSkillValueFromCharacter(
    character: any,
    normalizedSkillName: string
  ): number | null {
    this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: 开始', {
      skillName: normalizedSkillName,
      hasSkills: !!character.skills,
    })

    let skills = character.skills || {}

    this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: skills 原始数据', {
      skillsType: typeof skills,
      skillsKeys: typeof skills === 'object' ? Object.keys(skills) : 'N/A',
      skillsValue: typeof skills === 'string' ? skills.substring(0, 100) + '...' : 'N/A',
    })

    // 如果 skills 是字符串，尝试解析 JSON
    if (typeof skills === 'string') {
      this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: skills 是字符串，尝试解析 JSON')
      try {
        skills = JSON.parse(skills)
        this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: JSON 解析成功', {
          parsedKeys: Object.keys(skills),
        })
      } catch (error) {
        this.logger.error('[SkillCheckService] getSkillValueFromCharacter: 无法解析 skills JSON', {
          error: error instanceof Error ? error.message : String(error),
          skills: skills.substring(0, 200),
        })
        return null
      }
    }

    // 检查技能是否存在
    if (!(normalizedSkillName in skills)) {
      this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: 技能不存在', {
        skillName: normalizedSkillName,
        availableSkills: Object.keys(skills),
      })
      return null
    }

    const skillData = skills[normalizedSkillName]

    this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: 找到技能数据', {
      skillName: normalizedSkillName,
      skillDataType: typeof skillData,
      skillDataValue: typeof skillData === 'object' ? JSON.stringify(skillData) : skillData,
    })

    // CoC7 格式：简单值
    if (typeof skillData === 'number') {
      this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: 使用简单值格式', {
        value: skillData,
      })
      return skillData
    }

    // D&D 5e 格式：对象
    if (typeof skillData === 'object') {
      const value = skillData.value || 0
      this.logger.debug('[SkillCheckService] getSkillValueFromCharacter: 使用对象格式', {
        value,
        skillData,
      })
      return value
    }

    this.logger.warn('[SkillCheckService] getSkillValueFromCharacter: 未知的技能数据格式', {
      skillName: normalizedSkillName,
      skillDataType: typeof skillData,
    })
    return null
  }

  /**
   * 获取技能元数据
   *
   * @description
   * 从角色技能数据中提取元数据（如熟练度等级）。
   *
   * @param character - 角色数据
   * @param skillName - 技能名称
   * @returns 技能元数据
   */
  private getSkillMetadata(
    character: any,
    skillName: string
  ): { proficiencyLevel?: string; ability?: string } | null {
    this.logger.debug('[SkillCheckService] getSkillMetadata: 开始', {
      skillName,
    })

    let skills = character.skills || {}

    // 如果 skills 是字符串，尝试解析 JSON
    if (typeof skills === 'string') {
      try {
        skills = JSON.parse(skills)
      } catch (error) {
        this.logger.warn('[SkillCheckService] getSkillMetadata: 无法解析 skills JSON', {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }
    }

    if (!(skillName in skills)) {
      this.logger.debug('[SkillCheckService] getSkillMetadata: 技能不存在', {
        skillName,
        availableSkills: Object.keys(skills),
      })
      return null
    }

    const skillData = skills[skillName]

    this.logger.debug('[SkillCheckService] getSkillMetadata: 技能数据', {
      skillName,
      skillDataType: typeof skillData,
    })

    // D&D 5e 格式：对象
    if (typeof skillData === 'object') {
      const metadata = {
        proficiencyLevel: skillData.proficiency,
        ability: skillData.ability,
      }
      this.logger.debug('[SkillCheckService] getSkillMetadata: 返回元数据', { metadata })
      return metadata
    }

    // CoC7 格式或其他：无额外元数据
    this.logger.debug('[SkillCheckService] getSkillMetadata: 无额外元数据')
    return null
  }

  /**
   * 记录检定结果到数据库
   *
   * @description
   * 将检定结果保存到 conversation_message 表中。
   *
   * @param params - 记录参数
   */
  private async recordCheckResult(params: {
    conversationId: number
    userId: number
    skillName: string
    result: SkillCheckResult
    character: any
  }): Promise<void> {
    try {
      // 生成消息ID
      const messageId = `check_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // 构建消息内容（使用适配器的格式化方法）
      const registry = getRuleSystemRegistry()
      const adapter = registry.getAdapter(params.character.rule_system)

      if (!adapter) {
        this.logger.warn('[SkillCheckService] 无法找到适配器，跳过记录')
        return
      }

      const content = adapter.formatResult(params.result)

      // 记录到数据库
      await this.ctx.database.create('conversation_message', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        message_id: messageId,
        content,
        content_type: 'check', // 检定类型
        message_type: 'text',
        timestamp: new Date(),
        platform: '', // 从会话获取
        guild_id: '',
        channel_id: '',
      } as any)

      this.logger.debug(`[SkillCheckService] 检定结果已记录到会话 ${params.conversationId}`)
    } catch (error) {
      this.logger.error('[SkillCheckService] 记录检定结果失败', error)
      // 记录失败不影响检定结果，仅记录错误日志
    }
  }
}
