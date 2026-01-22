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

/**
 * 创建角色的参数接口
 */
export interface CreateCharacterParams {
  /** 所属会话 ID */
  conversationId: number
  /** 所有者用户 ID */
  userId: number
  /** 角色名称 */
  name: string
  /** 规则系统 */
  ruleSystem: string
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
   * 创建一个新角色，并将其设置为该用户在此会话中的激活角色。
   * 如果该用户已有激活角色，则将其 is_active 设为 false。
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

      // 1. 验证会话是否存在
      const conversations = await this.ctx.database.get('conversation', {
        id: params.conversationId,
      })

      if (conversations.length === 0) {
        return {
          success: false,
          error: `会话 ${params.conversationId} 不存在`,
        }
      }

      // 2. 验证用户是否是会话成员
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: params.conversationId,
        user_id: params.userId,
      })

      if (members.length === 0) {
        return {
          success: false,
          error: '您不是该会话的成员',
        }
      }

      // 2.5. 验证角色名称
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

      // 3. 检查是否已存在同名角色（使用修剪后的名称）
      const existingCharacters = await this.ctx.database.get('character', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        name: trimmedName,
      })

      if (existingCharacters.length > 0) {
        return {
          success: false,
          error: `您已经创建了名为"${trimmedName}"的角色`,
        }
      }

      // 4. 将该用户的其他角色的 is_active 设为 false
      await this.ctx.database.set('character', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        is_active: true,
      }, {
        is_active: false,
      })

      // 5. 创建新角色（is_active = true，使用修剪后的名称）
      const now = new Date()
      const newCharacter = await this.ctx.database.create('character', {
        conversation_id: params.conversationId,
        user_id: params.userId,
        name: trimmedName,
        portrait_url: params.portraitUrl || null,
        rule_system: params.ruleSystem,
        attributes: params.attributes || {},
        skills: params.skills || {},
        inventory: params.inventory || null,
        notes: params.notes || null,
        metadata: params.metadata || null,
        created_at: now,
        updated_at: now,
        is_active: true,
      })

      this.logger.info('[CharacterService] 角色创建成功', {
        characterId: newCharacter.id,
        name: trimmedName,
      })

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
      const characters = await this.ctx.database.get('character', {
        conversation_id: conversationId,
        user_id: userId,
        is_active: true,
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
   * 将指定角色设为激活状态，同时将该用户的其他角色设为非激活状态。
   *
   * @param params - 设置激活角色参数
   * @returns 是否成功
   */
  async setActiveCharacter(params: SetActiveCharacterParams): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // 1. 验证角色是否存在且属于该用户
      const characters = await this.ctx.database.get('character', {
        id: params.characterId,
        conversation_id: params.conversationId,
        user_id: params.userId,
      })

      if (characters.length === 0) {
        return {
          success: false,
          error: '角色不存在或无权访问',
        }
      }

      // 2. 将该用户的所有角色设为非激活
      await this.ctx.database.set('character', {
        conversation_id: params.conversationId,
        user_id: params.userId,
      }, {
        is_active: false,
      })

      // 3. 将指定角色设为激活
      await this.ctx.database.set('character', {
        id: params.characterId,
      }, {
        is_active: true,
        updated_at: new Date(),
      })

      this.logger.info('[CharacterService] 激活角色设置成功', {
        characterId: params.characterId,
        userId: params.userId,
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
   * @returns 角色列表
   */
  async getCharactersByUser(conversationId: number, userId: number): Promise<Character[]> {
    try {
      const characters = await this.ctx.database.get('character', {
        conversation_id: conversationId,
        user_id: userId,
      })

      // 按 is_active 降序排序（激活角色在前）
      return characters.sort((a, b) => (b.is_active === a.is_active) ? 0 : b.is_active ? 1 : -1)
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

      // 2. 移除内部字段（id, conversation_id, user_id, created_at, updated_at, is_active）
      const { id, conversation_id, user_id, created_at, updated_at, is_active, ...exportData } = character

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
      const characters = await this.ctx.database.get('character', {
        conversation_id: conversationId,
      })

      return characters
    } catch (error) {
      this.logger.error('[CharacterService] 获取会话角色列表时发生错误', error)
      return []
    }
  }
}
