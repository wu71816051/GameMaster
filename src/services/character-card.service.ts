/**
 * 角色卡服务
 * @description
 * 负责：
 * 1. 提供统一的角色卡操作接口
 * 2. 自动处理内存/数据库切换
 * 3. 提供灵活的数据查询
 * 4. 支持控制权转移和历史记录
 *
 * @module core/services/character-card
 */

import { Context } from 'koishi'
import { CharacterCard, MemoryCharacterCard, CharacterData, RuleSystem, CharacterCardStatus } from '../models/character-card'
import { ControlTransfer } from '../models/control-transfer'
import { ConversationStatus } from '../core/models/conversation'
import { CharacterCacheService } from './character-cache.service'

/**
 * 创建角色卡参数
 */
export interface CreateCardParams {
  conversationId: number
  userId: number
  name: string
  data: CharacterData
  options?: {
    parentId?: number           // 默认-1（根角色卡）
    rule_system?: string
    tags?: string[]
  }
}

/**
 * 基于父角色卡创建参数
 */
export interface CreateFromParentParams {
  conversationId: number       // 新会话ID
  userId: number              // 用户ID
  parentCardId: number        // 父角色卡ID
}

/**
 * 转移控制权参数
 */
export interface TransferControlParams {
  conversationId: number
  cardId: number
  fromUserId: number       // 当前控制者（发起转移的用户）
  toUserId: number         // 目标控制者
  reason?: string
}

/**
 * 收回控制权参数
 */
export interface RevokeControlParams {
  conversationId: number
  cardId: number
  userId: number            // 要求收回的用户
}

/**
 * 创建角色卡结果
 */
export interface CreateCardResult {
  success: boolean
  cardId?: number
  message?: string
  error?: string
}

/**
 * 转移控制权结果
 */
export interface TransferControlResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * 收回控制权结果
 */
export interface RevokeControlResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * 角色卡服务（零Schema + 版本管理 + 控制权）
 * @description 核心服务类，处理所有角色卡业务逻辑
 */
export class CharacterCardService {
  private ctx: Context
  private cache: CharacterCacheService

  constructor(ctx: Context, cache: CharacterCacheService) {
    this.ctx = ctx
    this.cache = cache
  }

  /**
   * 创建角色卡（手动创建，parent_id=-1）
   */
  async createCard(params: CreateCardParams): Promise<CreateCardResult> {
    try {
      // 验证会话存在
      const conversations = await this.ctx.database.get('conversation', {
        id: params.conversationId
      })

      if (!conversations || conversations.length === 0) {
        return { success: false, error: '会话不存在' }
      }

      // 验证名称唯一性（同一会话中不能有同名角色卡）
      const existingCards = await this.ctx.database.get('character_card', {
        conversation_id: params.conversationId,
        name: params.name
      })

      if (existingCards && existingCards.length > 0) {
        return { success: false, error: `会话中已存在名为 "${params.name}" 的角色卡` }
      }

      // 验证parentId（如果提供）
      if (params.options?.parentId && params.options.parentId !== -1) {
        const parentCards = await this.ctx.database.get('character_card', {
          id: params.options.parentId
        })

        if (!parentCards || parentCards.length === 0) {
          return { success: false, error: `父角色卡 ${params.options.parentId} 不存在` }
        }
      }

      // 创建内存卡片
      const card: MemoryCharacterCard = {
        conversation_id: params.conversationId,
        user_id: params.userId,
        name: params.name,
        parent_id: params.options?.parentId ?? -1,
        data: params.data,
        rule_system: params.options?.rule_system,
        tags: params.options?.tags || [],
        _dirty: true,
        _dirtyFields: new Set(['name', 'data', 'parent_id']),
        _lastModified: new Date()
      }

      // 存入缓存
      this.cache.setCard(params.conversationId, card)

      // 如果会话不是活跃状态，立即保存
      const conversation = conversations[0]
      if (conversation.status !== ConversationStatus.ACTIVE) {
        await this.cache.flushConversation(params.conversationId)
      }

      this.ctx.logger.info(`[CharacterCard] 创建角色卡 "${params.name}" (parent=${card.parent_id})`)

      return {
        success: true,
        cardId: card.id,
        message: `角色卡 "${params.name}" 创建成功`
      }
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 创建失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 基于父角色卡创建新角色卡（继承）
   */
  async createFromParent(params: CreateFromParentParams): Promise<CreateCardResult> {
    try {
      // 获取父角色卡
      const parentCards = await this.ctx.database.get('character_card', {
        id: params.parentCardId
      })

      if (!parentCards || parentCards.length === 0) {
        return { success: false, error: `父角色卡 ${params.parentCardId} 不存在` }
      }

      const parentCard = parentCards[0]

      // 验证会话存在
      const conversations = await this.ctx.database.get('conversation', {
        id: params.conversationId
      })

      if (!conversations || conversations.length === 0) {
        return { success: false, error: '会话不存在' }
      }

      // 深度复制父角色卡的数据（深拷贝）
      const clonedData = JSON.parse(JSON.stringify(parentCard.data))

      // 创建新角色卡
      return this.createCard(
        params.conversationId,
        params.userId,
        parentCard.name,           // 继承名称
        clonedData,                 // 继承数据
        {
          parentId: parentCard.id,    // 设置父角色卡ID
          rule_system: parentCard.rule_system,
          tags: parentCard.tags
        }
      )
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 基于父角色卡创建失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 转移控制权（含历史记录）
   */
  async transferControl(params: TransferControlParams): Promise<TransferControlResult> {
    try {
      // 获取角色卡
      const card = await this.getCard(params.conversationId, params.cardId)
      if (!card) {
        return { success: false, error: '角色卡不存在' }
      }

      // 验证转移权限
      const currentController = card.controller_id || card.user_id

      if (params.fromUserId !== currentController) {
        return {
          success: false,
          error: `只有当前控制者才能转移控制权（当前控制者：${currentController}）`
        }
      }

      // 验证目标用户在会话中
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: params.conversationId,
        user_id: params.toUserId
      })

      if (!members || members.length === 0) {
        return { success: false, error: '目标用户不在当前会话中' }
      }

      // 记录旧控制者（用于历史记录）
      const oldController = card.controller_id

      // 转移控制权
      card.controller_id = params.toUserId

      // 标记脏数据
      this.cache.markDirty(params.conversationId, params.cardId, 'controller_id')

      // 记录转移历史
      await this.ctx.database.create('control_transfer', {
        card_id: params.cardId,
        from_user_id: oldController || null,
        to_user_id: params.toUserId,
        transferred_at: new Date(),
        reason: params.reason || ''
      })

      this.ctx.logger.info(`[CharacterCard] 控制权转移: ${card.name} (${params.fromUserId} → ${params.toUserId})`)

      return {
        success: true,
        message: `控制权已转移给用户 ${params.toUserId}`
      }
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 控制权转移失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 收回控制权（恢复所有者控制）
   */
  async revokeControl(params: RevokeControlParams): Promise<RevokeControlResult> {
    try {
      // 获取角色卡
      const card = await this.getCard(params.conversationId, params.cardId)
      if (!card) {
        return { success: false, error: '角色卡不存在' }
      }

      // 验证权限：只有所有者或当前控制者可以收回
      const currentController = card.controller_id || card.user_id
      const isOwner = card.user_id === params.userId
      const isCurrentController = currentController === params.userId

      if (!isOwner && !isCurrentController) {
        return {
          success: false,
          error: '只有所有者或当前控制者才能收回控制权'
        }
      }

      // 记录之前的控制者
      const previousController = card.controller_id

      // 收回控制权（设为null，表示所有者控制）
      card.controller_id = null

      // 标记脏数据
      this.cache.markDirty(params.conversationId, params.cardId, 'controller_id')

      // 更新转移记录（标记为已收回）
      if (previousController) {
        await this.ctx.database.set('control_transfer', {
          card_id: params.cardId,
          to_user_id: previousController,
          reverted_at: null
        }, {
          reverted_at: new Date()
        })
      }

      this.ctx.logger.info(`[CharacterCard] 控制权收回: ${card.name} (来自 ${previousController || '所有者'})`)

      return {
        success: true,
        message: `控制权已归还给所有者`
      }
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 控制权收回失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取角色卡（优先从内存）
   */
  async getCard(
    conversationId: number,
    cardId: number
  ): Promise<MemoryCharacterCard | null> {
    try {
      // 先查内存
      const cachedCard = this.cache.getCardById(conversationId, cardId)
      if (cachedCard) {
        return cachedCard
      }

      // 查数据库
      const cards = await this.ctx.database.get('character_card', {
        id: cardId,
        conversation_id: conversationId
      })

      if (!cards || cards.length === 0) {
        return null
      }

      // 加载到缓存
      const card: MemoryCharacterCard = {
        ...cards[0],
        _dirty: false,
        _dirtyFields: new Set(),
        _lastModified: new Date()
      }

      this.cache.setCard(conversationId, card)
      return card
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 获取角色卡失败', error)
      return null
    }
  }

  /**
   * 更新角色卡数据（零Schema更新）
   */
  async updateCardData(
    conversationId: number,
    cardId: number,
    path: string,  // 点号分隔的路径，如 "attributes.strength"
    value: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const card = await this.getCard(conversationId, cardId)
      if (!card) {
        return { success: false, error: '角色卡不存在' }
      }

      // 使用动态路径更新
      this.updateDynamicValue(card.data, path, value)

      // 标记脏数据
      this.cache.markDirty(conversationId, cardId, `data.${path}`)

      return { success: true }
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 更新失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 动态更新嵌套值
   * @private
   */
  private updateDynamicValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  /**
   * 查询角色卡数据（动态路径）
   */
  async getCardData(
    conversationId: number,
    cardId: number,
    path?: string
  ): Promise<any> {
    try {
      const card = await this.getCard(conversationId, cardId)
      if (!card) {
        return null
      }

      if (!path) {
        return card.data
      }

      // 动态路径访问
      const keys = path.split('.')
      let current = card.data

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key]
        } else {
          return undefined
        }
      }

      return current
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 获取数据失败', error)
      return null
    }
  }

  /**
   * 获取用户当前控制的角色卡
   */
  async getControlledCards(
    conversationId: number,
    userId: number
  ): Promise<MemoryCharacterCard[]> {
    try {
      // 查询内存中 controller_id = userId 的角色卡
      const allCards = this.cache.getConversationCards(conversationId)

      return allCards.filter(card => {
        // controller_id为null时，只有user_id匹配才是控制者
        const controller = card.controller_id || card.user_id
        return controller === userId
      })
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 查询控制的角色卡失败', error)
      return []
    }
  }

  /**
   * 获取用户拥有的角色卡（包括被他控制的）
   */
  async getOwnedCards(
    conversationId: number,
    userId: number
  ): Promise<MemoryCharacterCard[]> {
    try {
      const allCards = this.cache.getConversationCards(conversationId)

      return allCards.filter(card =>
        card.user_id === userId
      )
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 查询拥有的角色卡失败', error)
      return []
    }
  }

  /**
   * 查询角色卡的控制权转移历史
   */
  async getControlHistory(
    cardId: number
  ): Promise<ControlTransfer[]> {
    try {
      const history = await this.ctx.database.get('control_transfer', {
        card_id: cardId
      }, {
        sort: ['transferred_at', 'desc']
      })

      return history
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 查询控制权历史失败', error)
      return []
    }
  }

  /**
   * 检查用户是否可以操作角色卡
   */
  async canControlCard(
    conversationId: number,
    cardId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const card = await this.getCard(conversationId, cardId)
      if (!card) {
        return false
      }

      const controller = card.controller_id || card.user_id
      return controller === userId
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 检查控制权失败', error)
      return false
    }
  }

  /**
   * 查询角色卡的家族树
   */
  async getCardFamilyTree(
    cardId: number
  ): Promise<CharacterCard[]> {
    try {
      // 查找所有子角色卡
      const children = await this.ctx.database.get('character_card', {
        parent_id: cardId
      })

      // 递归查找子角色卡的子角色卡
      const familyTree: CharacterCard[] = []

      for (const child of children) {
        familyTree.push(child)
        const grandchildren = await this.getCardFamilyTree(child.id!)
        familyTree.push(...grandchildren)
      }

      return familyTree
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 查询家族树失败', error)
      return []
    }
  }

  /**
   * 查询角色卡的祖先链
   */
  async getCardAncestorChain(
    cardId: number
  ): Promise<CharacterCard[]> {
    try {
      const chain: CharacterCard[] = []
      let currentCardId = cardId

      while (currentCardId !== -1) {
        const cards = await this.ctx.database.get('character_card', {
          id: currentCardId
        })

        if (!cards || cards.length === 0) {
          break
        }

        const card = cards[0]
        chain.unshift(card)  // 添加到开头

        if (card.parent_id === -1) {
          break
        }

        currentCardId = card.parent_id
      }

      return chain
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 查询祖先链失败', error)
      return []
    }
  }

  /**
   * 删除角色卡
   */
  async deleteCard(
    conversationId: number,
    cardId: number
  ): Promise<boolean> {
    try {
      // 从内存删除
      this.cache.deleteCard(conversationId, cardId)

      // 从数据库删除
      await this.ctx.database.remove('character_card', {
        id: cardId,
        conversation_id: conversationId
      })

      return true
    } catch (error) {
      this.ctx.logger.error('[CharacterCard] 删除失败', error)
      return false
    }
  }

  /**
   * 列出会话的所有角色卡
   */
  async listCards(conversationId: number): Promise<MemoryCharacterCard[]> {
    return this.cache.getConversationCards(conversationId)
  }

  /**
   * 批量保存会话的脏数据（手动触发）
   */
  async flushConversation(conversationId: number): Promise<void> {
    await this.cache.flushConversation(conversationId)
  }

  /**
   * 强制从数据库重新加载会话数据
   */
  async reloadConversation(conversationId: number): Promise<void> {
    await this.cache.reloadConversation(conversationId)
  }
}

/**
 * 创建角色卡服务实例
 * @param ctx Koishi 上下文对象
 * @returns 角色卡服务实例
 */
export function createCharacterCardService(ctx: Context): CharacterCardService {
  const cache = new CharacterCacheService(ctx)
  return new CharacterCardService(ctx, cache)
}
