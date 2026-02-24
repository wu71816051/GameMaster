/**
 * 角色卡缓存管理服务
 * @description
 * 负责：
 * 1. 管理内存中的角色卡（双层Map结构）
 * 2. 监听会话状态变化，自动同步数据
 * 3. 提供快速的内存读写操作
 *
 * @module core/services/character-cache
 */

import { Context } from 'koishi'
import { MemoryCharacterCard, CharacterCard } from '../models/character-card'

/**
 * 角色卡缓存管理器
 * @description 管理角色卡的内存缓存，支持自动同步到数据库
 */
export class CharacterCacheService {
  private cache: Map<number, Map<number, MemoryCharacterCard>>
  private ctx: Context
  private logger: Context['logger']

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
    this.cache = new Map()

    // 监听会话状态变化
    this.setupStateChangeListeners()
  }

  /**
   * 监听会话状态变化，自动同步数据
   * @private
   */
  private setupStateChangeListeners() {
    // 监听会话暂停事件 - 将脏数据写入数据库并卸载
    this.ctx.on('character-conversation-paused', async (conversationId: number) => {
      await this.flushConversation(conversationId)
      this.unloadConversation(conversationId)
    })

    // 监听会话恢复事件 - 从数据库加载数据到内存
    this.ctx.on('character-conversation-resumed', async (conversationId: number) => {
      await this.loadConversation(conversationId)
    })

    // 监听会话结束事件 - 将脏数据写入数据库并卸载
    this.ctx.on('character-conversation-ended', async (conversationId: number) => {
      await this.flushConversation(conversationId)
      this.unloadConversation(conversationId)
    })
  }

  /**
   * 获取会话的所有角色卡（优先从内存）
   */
  getConversationCards(conversationId: number): MemoryCharacterCard[] {
    const convCache = this.cache.get(conversationId)
    return convCache ? Array.from(convCache.values()) : []
  }

  /**
   * 根据ID获取角色卡（优先从内存）
   */
  getCardById(conversationId: number, cardId: number): MemoryCharacterCard | null {
    const convCache = this.cache.get(conversationId)
    return convCache?.get(cardId) || null
  }

  /**
   * 根据名称获取角色卡（优先从内存）
   */
  getCardByName(conversationId: number, name: string): MemoryCharacterCard | null {
    const convCache = this.cache.get(conversationId)
    if (!convCache) return null

    return Array.from(convCache.values()).find(card => card.name === name) || null
  }

  /**
   * 创建或更新角色卡（内存操作）
   */
  setCard(conversationId: number, card: MemoryCharacterCard): void {
    if (!this.cache.has(conversationId)) {
      this.cache.set(conversationId, new Map())
    }

    const convCache = this.cache.get(conversationId)!
    card._dirty = true
    card._lastModified = new Date()

    if (card.id) {
      convCache.set(card.id, card)
    }
  }

  /**
   * 删除角色卡（内存操作）
   */
  deleteCard(conversationId: number, cardId: number): void {
    const convCache = this.cache.get(conversationId)
    if (convCache) {
      convCache.delete(cardId)
    }
  }

  /**
   * 从数据库加载会话的所有角色卡到内存
   * @private
   */
  private async loadConversation(conversationId: number): Promise<void> {
    this.logger.debug(`[CharacterCache] 加载会话 ${conversationId} 的角色卡`)

    const cards = await this.ctx.database.get('character_card', {
      conversation_id: conversationId
    })

    const convCache = new Map<number, MemoryCharacterCard>()

    for (const card of cards) {
      const memoryCard: MemoryCharacterCard = {
        ...card,
        _dirty: false,
        _dirtyFields: new Set(),
        _lastModified: new Date()
      }
      convCache.set(card.id!, memoryCard)
    }

    this.cache.set(conversationId, convCache)
    this.logger.debug(`[CharacterCache] 加载了 ${convCache.size} 张角色卡`)
  }

  /**
   * 将会话的脏数据同步到数据库
   * @private
   */
  async flushConversation(conversationId: number): Promise<void> {
    const convCache = this.cache.get(conversationId)
    if (!convCache) return

    this.logger.debug(`[CharacterCache] 同步会话 ${conversationId} 的角色卡`)

    const dirtyCards = Array.from(convCache.values()).filter(card => card._dirty)

    if (dirtyCards.length === 0) {
      this.logger.debug(`[CharacterCache] 会话 ${conversationId} 没有脏数据`)
      return
    }

    // 批量保存
    for (const card of dirtyCards) {
      const { _dirty, _dirtyFields, _lastModified, ...saveData } = card

      try {
        if (card.id) {
          // 更新现有卡片
          await this.ctx.database.set('character_card', { id: card.id }, {
            ...saveData,
            updated_at: new Date()
          })
        } else {
          // 创建新卡片
          const created = await this.ctx.database.create('character_card', {
            ...saveData,
            created_at: new Date(),
            updated_at: new Date()
          })
          card.id = created.id

          // 更新缓存中的ID
          const updatedCache = this.cache.get(conversationId)
          if (updatedCache) {
            updatedCache.set(created.id, card)
          }
        }

        // 清除脏标记
        card._dirty = false
        card._dirtyFields.clear()
      } catch (error) {
        this.logger.error(`[CharacterCache] 保存角色卡 ${card.id} 失败: ${error}`)
      }
    }

    this.logger.info(`[CharacterCache] 同步了 ${dirtyCards.length} 张角色卡`)
  }

  /**
   * 卸载会话的内存缓存
   * @private
   */
  private unloadConversation(conversationId: number): void {
    this.cache.delete(conversationId)
    this.logger.debug(`[CharacterCache] 卸载会话 ${conversationId}`)
  }

  /**
   * 标记字段为脏数据
   */
  markDirty(conversationId: number, cardId: number, field: string): void {
    const card = this.getCardById(conversationId, cardId)
    if (card) {
      card._dirty = true
      card._dirtyFields.add(field)
      card._lastModified = new Date()
    }
  }

  /**
   * 检查卡片是否有脏数据
   */
  isDirty(conversationId: number, cardId: number): boolean {
    const card = this.getCardById(conversationId, cardId)
    return card ? card._dirty : false
  }

  /**
   * 获取所有脏数据
   */
  getDirtyCards(conversationId: number): MemoryCharacterCard[] {
    const convCache = this.cache.get(conversationId)
    if (!convCache) return []

    return Array.from(convCache.values()).filter(card => card._dirty)
  }

  /**
   * 强制从数据库重新加载会话数据
   */
  async reloadConversation(conversationId: number): Promise<void> {
    this.unloadConversation(conversationId)
    await this.loadConversation(conversationId)
  }
}

/**
 * 创建角色卡缓存管理器实例
 * @param ctx Koishi 上下文对象
 * @returns 角色卡缓存管理器实例
 */
export function createCharacterCacheService(ctx: Context): CharacterCacheService {
  return new CharacterCacheService(ctx)
}
