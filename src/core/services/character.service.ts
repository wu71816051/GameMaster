/**
 * 角色卡管理服务
 *
 * @description
 * 负责处理 TRPG 角色卡的完整生命周期管理。
 *
 * 核心职责：
 * - 创建、编辑、删除角色
 * - 查询角色（按用户、会话、激活状态）
 * - 激活角色切换
 * - 角色导出/导入
 * - 技能值查询
 *
 * @module core/services/character.service
 */

import { Context } from 'koishi'
import { Character, RuleSystem } from '../models/character'
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'
import { CreateCharacterParams as RuleCreateCharacterParams } from '../../rule/base/rule-system-adapter'

/**
 * 创建角色的参数接口
 */
export interface CreateCharacterParams {
  /** 所属会话 ID（可选，用于会话内创建） */
  conversationId?: number
  /** 所有者用户 ID */
  userId: number
  /** 角色名称 */
  name: string
  /** 规则系统（可选，会话内创建时使用会话规则，会话外默认为 generic） */
  ruleSystem?: string
  /** 头像 URL（可选） */
  portraitUrl?: string
  /** 属性数据 */
  attributes?: Record<string, any>
  /** 技能数据 */
  skills?: Record<string, any>
  /** 物品栏（可选） */
  inventory?: Record<string, any>
  /** 备注（可选） */
  notes?: string
  /** 元数据（可选） */
  metadata?: Record<string, any>
}

/**
 * 创建角色的结果接口
 */
export interface CreateCharacterResult {
  /** 是否成功 */
  success: boolean
  /** 创建的角色ID（成功时） */
  characterId?: number
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 更新角色的参数接口
 */
export interface UpdateCharacterParams {
  /** 角色 ID */
  characterId: number
  /** 用户 ID（用于权限验证） */
  userId: number
  /** 要更新的字段 */
  updates: Partial<{
    name: string
    portrait_url: string
    attributes: Record<string, any>
    skills: Record<string, any>
    inventory: Record<string, any>
    notes: string
    metadata: Record<string, any>
  }>
}

/**
 * 设置激活角色的参数接口
 */
export interface SetActiveCharacterParams {
  /** 会话 ID */
  conversationId: number
  /** 用户 ID */
  userId: number
  /** 要激活的角色 ID */
  characterId: number
}

/**
 * 角色卡管理服务类
 */
export class CharacterService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  /**
   * 创建新角色
   *
   * @description
   * 创建一个新角色，支持会话内和会话外两种创建模式。
   *
   * **会话内创建（提供了 conversationId）**：
   * - 禁止携带 ruleSystem 参数（自动使用会话规则）
   * - 自动激活角色
   * - 验证用户是否为会话成员
   *
   * **会话外创建（未提供 conversationId）**：
   * - 可选指定 ruleSystem，默认为 'generic'
   * - 不自动激活（因为没有会话）
   *
   * @param params - 创建角色参数
   * @returns 创建结果
   */
  async createCharacter(params: CreateCharacterParams): Promise<CreateCharacterResult> {
    try {
      this.logger.info('[CharacterService] 开始创建角色', {
        conversationId: params.conversationId,
        userId: params.userId,
        name: params.name,
        ruleSystem: params.ruleSystem,
      })

      // 验证角色名称
      const trimmedName = params.name.trim()
      if (!trimmedName) {
        return {
          success: false,
          error: '角色名称不能为空',
        }
      }

      if (trimmedName.length > 50) {
        return {
          success: false,
          error: '角色名称不能超过50个字符',
        }
      }

      // 检查用户是否已存在同名角色（全局唯一性）
      const existingCharacters = await this.ctx.database.get('character', {
        user_id: params.userId,
        name: trimmedName,
      })

      if (existingCharacters.length > 0) {
        return {
          success: false,
          error: `您已经创建了名为"${trimmedName}"的角色`,
        }
      }

      let ruleSystem = params.ruleSystem
      let conversationId = params.conversationId
      let shouldAutoActivate = false

      if (conversationId) {
        // ========== 在会话中创建 ==========

        // 验证会话是否存在
        const conversations = await this.ctx.database.get('conversation', {
          id: conversationId,
        })

        if (conversations.length === 0) {
          return {
            success: false,
            error: `会话 ${conversationId} 不存在`,
          }
        }

        const conversation = conversations[0]

        // 验证用户是否是会话成员
        const members = await this.ctx.database.get('conversation_member', {
          conversation_id: conversationId,
          user_id: params.userId,
        })

        if (members.length === 0) {
          return {
            success: false,
            error: '您不是该会话的成员',
          }
        }

        // ❌ 检查：会话内不能携带规则参数
        if (ruleSystem) {
          this.logger.warn('[CharacterService] 会话内创建角色时携带了规则参数', {
            conversationId,
            requestedRule: ruleSystem,
            conversationRule: conversation.rule_system,
          })

          return {
            success: false,
            error: `❌ 会话内不能携带"规则"参数\n` +
                   `💡 当前会话规则：${conversation.rule_system}\n` +
                   `💡 只能创建对应会话规则的角色\n` +
                   `💡 若要创建其他规则的角色，请先退出会话后创建`,
          }
        }

        // ✅ 使用会话规则
        ruleSystem = conversation.rule_system
        shouldAutoActivate = true

        this.logger.info('[CharacterService] 会话内创建角色，使用会话规则', {
          conversationId,
          ruleSystem,
        })
      } else {
        // ========== 在会话外创建 ==========

        // 未指定规则，默认使用 generic
        if (!ruleSystem) {
          ruleSystem = 'generic'
        }

        shouldAutoActivate = false

        this.logger.info('[CharacterService] 会话外创建角色', {
          ruleSystem,
        })
      }

      // ========== 调用规则系统创建角色 ==========
      const registry = getRuleSystemRegistry()

      // 验证规则系统是否支持
      if (!registry.hasSystem(ruleSystem)) {
        return {
          success: false,
          error: `不支持的规则系统: ${ruleSystem}\n` +
                 `💡 支持的规则系统: ${registry.getRegisteredSystems().join(', ')}`
        }
      }

      const adapter = registry.getAdapter(ruleSystem)

      // 调用规则系统的 createCharacter 方法
      const ruleParams: RuleCreateCharacterParams = {
        name: trimmedName,
        attributes: params.attributes,
        skills: params.skills,
        background: params.notes,
        metadata: params.metadata,
      }

      this.logger.info('[CharacterService] 调用规则系统创建角色', {
        ruleSystem,
        adapterName: adapter?.displayName,
      })

      const createResult = adapter.createCharacter(ruleParams)

      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || '角色创建失败',
        }
      }

      this.logger.info('[CharacterService] 规则系统角色创建成功', {
        ruleSystem,
        hasAttributes: !!createResult.attributes,
        hasSkills: !!createResult.skills,
      })

      // ========== 保存角色到数据库 ==========
      const now = new Date()
      const newCharacter = await this.ctx.database.create('character', {
        user_id: params.userId,
        name: trimmedName,
        portrait_url: params.portraitUrl || null,
        rule_system: ruleSystem,
        attributes: createResult.attributes || {},
        skills: createResult.skills || {},
        inventory: params.inventory || null,
        notes: params.notes || null,
        metadata: createResult.metadata || null,
        created_at: now,
        updated_at: now,
      })

      this.logger.info('[CharacterService] 角色记录创建成功', {
        characterId: newCharacter.id,
        name: trimmedName,
        ruleSystem,
      })

      // 如果提供了会话ID，加入会话
      if (conversationId) {
        await this.addCharacterToConversation(
          newCharacter.id!,
          conversationId,
          shouldAutoActivate,
          params.userId,
          'pc'  // 会话内创建的角色默认为 PC
        )

        // 如果自动激活，取消该用户在此会话的其他角色的激活状态
        if (shouldAutoActivate) {
          await this.deactivateOtherCharacters(
            conversationId,
            params.userId,
            newCharacter.id!
          )
        }

        this.logger.info('[CharacterService] 角色已加入会话', {
          characterId: newCharacter.id,
          conversationId,
          isActive: shouldAutoActivate,
        })
      }

      return {
        success: true,
        characterId: newCharacter.id,
      }
    } catch (error) {
      this.logger.error('[CharacterService] 创建角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取用户的激活角色
   *
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID
   * @returns 激活角色，如果不存在则返回 null
   */
  async getActiveCharacter(conversationId: number, userId: number): Promise<Character | null> {
    try {
      // 1. 从 conversation_character 查询激活角色ID
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        is_active: true,
        current_player_id: userId,
        archived: false,
      })

      if (relations.length === 0) return null

      // 2. 获取角色详情
      const characters = await this.ctx.database.get('character', {
        id: relations[0].character_id,
      })

      return characters.length > 0 ? characters[0] : null
    } catch (error) {
      this.logger.error('[CharacterService] 获取激活角色时发生错误', error)
      return null
    }
  }

  /**
   * 设置激活角色
   *
   * @description
   * 将指定角色设为激活状态，同时将该用户在该会话的其他角色设为非激活状态。
   * 会验证角色与会话的规则系统是否一致。
   *
   * @param params - 设置激活角色参数
   * @returns 是否成功
   */
  async setActiveCharacter(params: SetActiveCharacterParams): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. 验证角色属于用户（通过 user_id）
      const characters = await this.ctx.database.get('character', {
        id: params.characterId,
        user_id: params.userId,
      })

      if (characters.length === 0) {
        return {
          success: false,
          error: '角色不存在或无权访问',
        }
      }

      const character = characters[0]

      // 2. 验证规则一致性
      const conversations = await this.ctx.database.get('conversation', {
        id: params.conversationId,
      })

      if (conversations.length === 0) {
        return {
          success: false,
          error: '会话不存在',
        }
      }

      const conversation = conversations[0]

      if (character.rule_system !== conversation.rule_system) {
        this.logger.warn('[CharacterService] 角色与会话规则不一致', {
          characterId: params.characterId,
          characterRule: character.rule_system,
          conversationId: params.conversationId,
          conversationRule: conversation.rule_system,
        })

        return {
          success: false,
          error: `❌ 无法激活角色：角色规则(${character.rule_system})与会话规则(${conversation.rule_system})不一致\n` +
                 `提示: 请创建规则为 ${conversation.rule_system} 的新角色，或联系 GM 修改会话规则系统`,
        }
      }

      // 3. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: params.conversationId,
        character_id: params.characterId,
      })

      if (relations.length === 0) {
        // 角色不在会话中，先加入
        await this.addCharacterToConversation(
          params.characterId,
          params.conversationId,
          false,
          params.userId,
          'pc'
        )
      }

      // 4. 将该用户在此会话的所有角色设为非激活
      await this.ctx.database.set('conversation_character', {
        conversation_id: params.conversationId,
        current_player_id: params.userId,
      }, {
        is_active: false,
      })

      // 5. 将指定角色在此会话设为激活
      await this.ctx.database.set('conversation_character', {
        conversation_id: params.conversationId,
        character_id: params.characterId,
      }, {
        is_active: true,
      })

      this.logger.info('[CharacterService] 激活角色设置成功', {
        characterId: params.characterId,
        userId: params.userId,
        ruleSystem: character.rule_system,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 设置激活角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取用户在指定会话中的所有角色
   *
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID
   * @returns 角色列表，激活角色在前
   */
  async getCharactersByUser(conversationId: number, userId: number): Promise<Character[]> {
    try {
      // 1. 获取该用户在此会话的角色关联
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        current_player_id: userId,
        archived: false,
      })

      if (relations.length === 0) return []

      // 2. 获取角色详情
      const characterIds = relations.map(r => r.character_id)
      const characters = await this.ctx.database.get('character', {
        id: { $in: characterIds },
      })

      // 3. 按激活状态排序（激活角色在前）
      return characters.sort((a, b) => {
        const aActive = relations.find(r => r.character_id === a.id)?.is_active ? 1 : 0
        const bActive = relations.find(r => r.character_id === b.id)?.is_active ? 1 : 0
        return bActive - aActive
      })
    } catch (error) {
      this.logger.error('[CharacterService] 获取用户角色列表时发生错误', error)
      return []
    }
  }

  /**
   * 根据 ID 获取角色
   *
   * @param characterId - 角色 ID
   * @returns 角色，如果不存在则返回 null
   */
  async getCharacterById(characterId: number): Promise<Character | null> {
    try {
      const characters = await this.ctx.database.get('character', {
        id: characterId,
      })

      return characters.length > 0 ? characters[0] : null
    } catch (error) {
      this.logger.error('[CharacterService] 获取角色时发生错误', error)
      return null
    }
  }

  /**
   * 更新角色
   *
   * @description
   * 更新角色的指定字段，只有角色所有者可以更新。
   *
   * @param params - 更新角色参数
   * @returns 是否成功
   */
  async updateCharacter(params: UpdateCharacterParams): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. 验证角色是否存在且属于该用户
      const characters = await this.ctx.database.get('character', {
        id: params.characterId,
        user_id: params.userId,
      })

      if (characters.length === 0) {
        return {
          success: false,
          error: '角色不存在或无权访问',
        }
      }

      // 2. 更新角色
      await this.ctx.database.set('character', {
        id: params.characterId,
      }, {
        ...params.updates,
        updated_at: new Date(),
      })

      this.logger.info('[CharacterService] 角色更新成功', {
        characterId: params.characterId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 更新角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 删除角色
   *
   * @param characterId - 角色 ID
   * @param userId - 用户 ID（用于权限验证）
   * @returns 是否成功
   */
  async deleteCharacter(characterId: number, userId: number): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. 验证角色是否存在且属于该用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: userId,
      })

      if (characters.length === 0) {
        return {
          success: false,
          error: '角色不存在或无权访问',
        }
      }

      // 2. 删除角色
      await this.ctx.database.remove('character', {
        id: characterId,
      })

      this.logger.info('[CharacterService] 角色删除成功', {
        characterId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 删除角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取角色的技能值
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称
   * @returns 技能值，如果技能不存在则返回 undefined
   */
  async getSkillValue(characterId: number, skillName: string): Promise<number | undefined> {
    try {
      const character = await this.getCharacterById(characterId)

      if (!character || !character.skills) {
        return undefined
      }

      return character.skills[skillName]
    } catch (error) {
      this.logger.error('[CharacterService] 获取技能值时发生错误', error)
      return undefined
    }
  }

  /**
   * 导出角色为 JSON
   *
   * @param characterId - 角色 ID
   * @param userId - 用户 ID（用于权限验证）
   * @returns JSON 字符串或 null
   */
  async exportCharacter(characterId: number, userId: number): Promise<{
    success: boolean
    data?: string
    error?: string
  }> {
    try {
      // 1. 验证角色是否存在且属于该用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: userId,
      })

      if (characters.length === 0) {
        return {
          success: false,
          error: '角色不存在或无权访问',
        }
      }

      const character = characters[0]

      // 2. 移除内部字段（id, user_id, created_at, updated_at）
      const { id, user_id, created_at, updated_at, ...exportData } = character

      // 3. 转为 JSON 字符串
      const jsonString = JSON.stringify(exportData, null, 2)

      return {
        success: true,
        data: jsonString,
      }
    } catch (error) {
      this.logger.error('[CharacterService] 导出角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 从 JSON 导入角色
   *
   * @param jsonString - JSON 字符串
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID
   * @returns 导入结果
   */
  async importCharacter(
    jsonString: string,
    conversationId: number,
    userId: number
  ): Promise<CreateCharacterResult> {
    try {
      // 1. 解析 JSON
      const data = JSON.parse(jsonString)

      // 2. 验证必要字段
      if (!data.name || !data.rule_system) {
        return {
          success: false,
          error: 'JSON 缺少必要字段（name, rule_system）',
        }
      }

      // 3. 创建角色
      return await this.createCharacter({
        conversationId,
        userId,
        name: data.name,
        ruleSystem: data.rule_system,
        portraitUrl: data.portrait_url,
        attributes: data.attributes,
        skills: data.skills,
        inventory: data.inventory,
        notes: data.notes,
        metadata: data.metadata,
      })
    } catch (error) {
      this.logger.error('[CharacterService] 导入角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取会话的所有角色
   *
   * @param conversationId - 会话 ID
   * @returns 角色列表
   */
  async getCharactersByConversation(conversationId: number): Promise<Character[]> {
    try {
      // 1. 获取会话的所有角色关联
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        archived: false,
      })

      if (relations.length === 0) return []

      // 2. 获取角色详情
      const characterIds = relations.map(r => r.character_id)
      const characters = await this.ctx.database.get('character', {
        id: { $in: characterIds },
      })

      return characters
    } catch (error) {
      this.logger.error('[CharacterService] 获取会话角色列表时发生错误', error)
      return []
    }
  }

  /**
   * 获取用户的所有角色ID列表
   *
   * @param userId - 用户 ID
   * @returns 角色 ID 列表
   */
  private async getUserCharacterIds(userId: number): Promise<number[]> {
    try {
      const characters = await this.ctx.database.get('character', {
        user_id: userId,
      })
      return characters.map(c => c.id!)
    } catch (error) {
      this.logger.error('[CharacterService] 获取用户角色ID列表时发生错误', error)
      return []
    }
  }

  /**
   * 为角色添加到会话
   *
   * @description
   * 将角色添加到指定会话。如果角色已在该会话中，则不重复添加。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param isActive - 是否激活，默认 false
   * @returns 操作结果
   */
  async addCharacterToConversation(
    characterId: number,
    conversationId: number,
    isActive: boolean = false,
    currentPlayerId: number,
    characterType: 'pc' | 'npc' = 'pc'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 检查角色是否存在
      const characters = await this.ctx.database.get('character', {
        id: characterId,
      })
      if (characters.length === 0) {
        return { success: false, error: '角色不存在' }
      }

      // 2. 检查是否已存在
      const existing = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (existing.length > 0) {
        return { success: true } // 已存在，无需重复添加
      }

      // 3. 创建关联记录
      await this.ctx.database.create('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
        is_active: isActive,
        joined_at: new Date(),
        archived: false,
        current_player_id: currentPlayerId,
        character_type: characterType,
      })

      this.logger.info('[CharacterService] 角色添加到会话成功', {
        characterId,
        conversationId,
        currentPlayerId,
        characterType,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 添加角色到会话时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 获取角色参与的所有会话
   *
   * @param characterId - 角色 ID
   * @returns 会话 ID 列表
   */
  async getCharacterConversations(characterId: number): Promise<number[]> {
    try {
      const relations = await this.ctx.database.get('conversation_character', {
        character_id: characterId,
        archived: false,
      })
      return relations.map(r => r.conversation_id)
    } catch (error) {
      this.logger.error('[CharacterService] 获取角色会话列表时发生错误', error)
      return []
    }
  }

  /**
   * 取消用户在会话中其他角色的激活状态
   *
   * @description
   * 将指定用户在会话中除指定角色外的所有角色设为非激活状态。
   *
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID
   * @param exceptCharacterId - 要排除的角色 ID（不取消其激活状态）
   * @returns 操作结果
   */
  async deactivateOtherCharacters(
    conversationId: number,
    userId: number,
    exceptCharacterId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 取消该用户在此会话的所有角色的激活状态（除了 exceptCharacterId）
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        current_player_id: userId,
        character_id: { $ne: exceptCharacterId },
        is_active: true,
      }, {
        is_active: false,
      })

      this.logger.info('[CharacterService] 其他角色激活状态已取消', {
        conversationId,
        userId,
        exceptCharacterId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 取消其他角色激活状态时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 检查角色在会话中是否激活
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @returns 是否激活
   */
  async isCharacterActiveInConversation(
    characterId: number,
    conversationId: number
  ): Promise<boolean> {
    try {
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
        is_active: true,
        archived: false,
      })

      return relations.length > 0
    } catch (error) {
      this.logger.error('[CharacterService] 检查角色激活状态时发生错误', error)
      return false
    }
  }

  /**
   * 获取角色的所有会话（带激活状态）
   *
   * @param characterId - 角色 ID
   * @returns 会话列表及激活状态
   */
  async getCharacterConversationsWithStatus(
    characterId: number
  ): Promise<Array<{ conversationId: number; isActive: boolean }>> {
    try {
      const relations = await this.ctx.database.get('conversation_character', {
        character_id: characterId,
        archived: false,
      })

      return relations.map(r => ({
        conversationId: r.conversation_id,
        isActive: r.is_active,
      }))
    } catch (error) {
      this.logger.error('[CharacterService] 获取角色会话状态时发生错误', error)
      return []
    }
  }

  /**
   * 归档角色
   *
   * @description
   * 将角色在指定会话中归档（不删除，只是不显示）。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID（用于权限验证）
   * @returns 操作结果
   */
  async archiveCharacter(
    characterId: number,
    conversationId: number,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证角色属于用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: userId,
      })

      if (characters.length === 0) {
        return { success: false, error: '角色不存在或无权访问' }
      }

      // 2. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (relations.length === 0) {
        return { success: false, error: '角色不在此会话中' }
      }

      // 3. 归档角色
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      }, {
        archived: true,
        archived_at: new Date(),
        is_active: false,
      })

      this.logger.info('[CharacterService] 角色归档成功', {
        characterId,
        conversationId,
        userId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 归档角色时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 取消归档角色
   *
   * @description
   * 将已归档的角色恢复显示。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param userId - 用户 ID（用于权限验证）
   * @returns 操作结果
   */
  async unarchiveCharacter(
    characterId: number,
    conversationId: number,
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证角色属于用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: userId,
      })

      if (characters.length === 0) {
        return { success: false, error: '角色不存在或无权访问' }
      }

      // 2. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (relations.length === 0) {
        return { success: false, error: '角色不在此会话中' }
      }

      // 3. 取消归档
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      }, {
        archived: false,
        archived_at: null,
      })

      this.logger.info('[CharacterService] 角色取消归档成功', {
        characterId,
        conversationId,
        userId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 取消归档角色时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 转移角色
   *
   * @description
   * 将角色转移给另一个用户。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param fromUserId - 当前用户 ID
   * @param toUserId - 目标用户 ID
   * @returns 操作结果
   */
  async transferCharacter(
    characterId: number,
    conversationId: number,
    fromUserId: number,
    toUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证角色属于当前用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: fromUserId,
      })

      if (characters.length === 0) {
        return { success: false, error: '角色不存在或无权访问' }
      }

      // 2. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (relations.length === 0) {
        return { success: false, error: '角色不在此会话中' }
      }

      // 3. 转移角色
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      }, {
        current_player_id: toUserId,
        is_active: false,
      })

      this.logger.info('[CharacterService] 角色转移成功', {
        characterId,
        conversationId,
        fromUserId,
        toUserId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 转移角色时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 将角色转为 NPC
   *
   * @description
   * 将 PC 角色转为 NPC，由 GM 控制。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param userId - 当前用户 ID
   * @param gmUserId - GM 用户 ID
   * @returns 操作结果
   */
  async convertCharacterToNPC(
    characterId: number,
    conversationId: number,
    userId: number,
    gmUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证角色属于用户
      const characters = await this.ctx.database.get('character', {
        id: characterId,
        user_id: userId,
      })

      if (characters.length === 0) {
        return { success: false, error: '角色不存在或无权访问' }
      }

      // 2. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (relations.length === 0) {
        return { success: false, error: '角色不在此会话中' }
      }

      // 3. 转为 NPC
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      }, {
        character_type: 'npc',
        current_player_id: gmUserId,
        is_active: false,
      })

      this.logger.info('[CharacterService] 角色转为 NPC 成功', {
        characterId,
        conversationId,
        userId,
        gmUserId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 将角色转为 NPC 时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 将 NPC 转为角色
   *
   * @description
   * 将 NPC 角色转为 PC，分配给指定用户。
   *
   * @param characterId - 角色 ID
   * @param conversationId - 会话 ID
   * @param gmUserId - GM 用户 ID（用于权限验证）
   * @param toUserId - 目标用户 ID
   * @returns 操作结果
   */
  async convertNPCToCharacter(
    characterId: number,
    conversationId: number,
    gmUserId: number,
    toUserId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 验证角色存在
      const characters = await this.ctx.database.get('character', {
        id: characterId,
      })

      if (characters.length === 0) {
        return { success: false, error: '角色不存在' }
      }

      // 2. 检查角色是否在会话中
      const relations = await this.ctx.database.get('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      })

      if (relations.length === 0) {
        return { success: false, error: '角色不在此会话中' }
      }

      // 3. 验证当前角色是否为 NPC
      if (relations[0].character_type !== 'npc') {
        return { success: false, error: '该角色不是 NPC' }
      }

      // 4. 转为 PC
      await this.ctx.database.set('conversation_character', {
        conversation_id: conversationId,
        character_id: characterId,
      }, {
        character_type: 'pc',
        current_player_id: toUserId,
        is_active: false,
      })

      this.logger.info('[CharacterService] NPC 转为角色成功', {
        characterId,
        conversationId,
        gmUserId,
        toUserId,
      })

      return { success: true }
    } catch (error) {
      this.logger.error('[CharacterService] 将 NPC 转为角色时发生错误', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }
}
