/**
 * CoC7 战斗轮管理器
 *
 * @description
 * 负责管理 CoC7 战斗系统的战斗轮。
 * 包括战斗开始、结束、回合轮转、敏捷排序等功能。
 *
 * @module rule/coc7/combat/combat-manager
 */

import { Context } from 'koishi'
import { CombatState, CombatTurn } from './combat-types'

/**
 * 战斗管理器类
 */
export class CombatManager {
  private ctx: Context
  // 战斗状态存储（conversationId -> CombatState）
  private combatStates: Map<number, CombatState>

  constructor(ctx: Context) {
    this.ctx = ctx
    this.combatStates = new Map()
  }

  /**
   * 开始战斗
   *
   * @param conversationId - 会话 ID
   * @param participants - 参与者列表
   * @returns 战斗状态
   */
  startCombat(conversationId: number, participants: CombatTurn[]): CombatState {
    this.ctx.logger.info('[CombatManager] 开始战斗', {
      conversationId,
      participantCount: participants.length,
    })

    // 按敏捷排序（高到低）
    const sortedParticipants = this.sortByDexterity(participants)

    const combatState: CombatState = {
      isActive: true,
      round: 1,
      turnOrder: sortedParticipants.map(p => ({
        ...p,
        hasActed: false,
        isDelayed: false,
      })),
      currentTurnIndex: 0,
      startTime: new Date(),
    }

    // 存储战斗状态
    this.combatStates.set(conversationId, combatState)

    // 持久化到 conversation.metadata
    this.persistCombatState(conversationId, combatState)

    this.ctx.logger.info('[CombatManager] 战斗开始成功', {
      conversationId,
      firstActor: sortedParticipants[0]?.characterName,
    })

    return combatState
  }

  /**
   * 结束战斗
   *
   * @param conversationId - 会话 ID
   */
  endCombat(conversationId: number): void {
    this.ctx.logger.info('[CombatManager] 结束战斗', { conversationId })

    const state = this.combatStates.get(conversationId)
    if (!state) {
      this.ctx.logger.warn('[CombatManager] 战斗不存在', { conversationId })
      return
    }

    state.isActive = false

    // 从内存中移除
    this.combatStates.delete(conversationId)

    // 清除持久化数据
    this.clearCombatState(conversationId)

    this.ctx.logger.info('[CombatManager] 战斗已结束', {
      conversationId,
      rounds: state.round,
    })
  }

  /**
   * 获取当前战斗状态
   *
   * @param conversationId - 会话 ID
   * @returns 战斗状态，如果不存在或已结束则返回 null
   */
  getCombatState(conversationId: number): CombatState | null {
    const state = this.combatStates.get(conversationId)
    if (!state || !state.isActive) {
      return null
    }
    return state
  }

  /**
   * 获取当前回合的角色
   *
   * @param conversationId - 会话 ID
   * @returns 当前回合的角色，如果不存在则返回 null
   */
  getCurrentTurn(conversationId: number): CombatTurn | null {
    const state = this.getCombatState(conversationId)
    if (!state) {
      return null
    }
    return state.turnOrder[state.currentTurnIndex] || null
  }

  /**
   * 进入下一回合
   *
   * @param conversationId - 会话 ID
   * @returns 下一回合的角色，如果战斗已结束则返回 null
   */
  nextTurn(conversationId: number): CombatTurn | null {
    const state = this.getCombatState(conversationId)
    if (!state) {
      return null
    }

    // 标记当前角色已行动
    const currentTurn = state.turnOrder[state.currentTurnIndex]
    if (currentTurn) {
      currentTurn.hasActed = true
    }

    // 移动到下一个角色
    state.currentTurnIndex++

    // 检查是否所有角色都已行动
    if (state.currentTurnIndex >= state.turnOrder.length) {
      // 新回合
      state.round++
      state.currentTurnIndex = 0

      // 重置所有角色的行动状态
      state.turnOrder.forEach(turn => {
        turn.hasActed = false
        // 注意：不重置 isDelayed，因为延迟状态会持续
      })

      this.ctx.logger.info('[CombatManager] 新回合', {
        conversationId,
        round: state.round,
      })
    }

    // 持久化更新
    this.persistCombatState(conversationId, state)

    return this.getCurrentTurn(conversationId)
  }

  /**
   * 标记角色为延迟
   *
   * @param conversationId - 会话 ID
   * @param characterId - 角色 ID
   */
  setDelayed(conversationId: number, characterId: number): void {
    const state = this.getCombatState(conversationId)
    if (!state) {
      return
    }

    const turn = state.turnOrder.find(t => t.characterId === characterId)
    if (turn) {
      turn.isDelayed = true
      this.persistCombatState(conversationId, state)

      this.ctx.logger.debug('[CombatManager] 角色延迟', {
        conversationId,
        characterId,
        characterName: turn.characterName,
      })
    }
  }

  /**
   * 获取战斗状态摘要
   *
   * @param conversationId - 会话 ID
   * @returns 战斗状态摘要字符串
   */
  getCombatSummary(conversationId: number): string {
    const state = this.getCombatState(conversationId)
    if (!state) {
      return '❌ 当前没有进行中的战斗'
    }

    const currentTurn = this.getCurrentTurn(conversationId)

    let output = `⚔️ 战斗状态\n`
    output += `📊 回合: ${state.round}\n`
    output += `👤 当前行动: ${currentTurn?.characterName || '无'}\n\n`

    output += `📋 行动顺序:\n`
    state.turnOrder.forEach((turn, index) => {
      const isCurrent = index === state.currentTurnIndex
      const hasActed = turn.hasActed ? '✓' : '○'
      const delayed = turn.isDelayed ? ' [延迟]' : ''

      output += `${isCurrent ? '➤ ' : '  '}${hasActed} ${turn.characterName} (DEX: ${turn.dexterity})${delayed}\n`
    })

    return output
  }

  /**
   * 按敏捷排序参与者
   *
   * @param participants - 参与者列表
   * @returns 排序后的参与者列表
   * @private
   */
  private sortByDexterity(participants: CombatTurn[]): CombatTurn[] {
    return [...participants].sort((a, b) => {
      // 先按敏捷排序（高到低）
      if (b.dexterity !== a.dexterity) {
        return b.dexterity - a.dexterity
      }

      // 敏捷相同，按战斗技能排序
      const skillA = a.combatSkill || 0
      const skillB = b.combatSkill || 0
      if (skillB !== skillA) {
        return skillB - skillA
      }

      // 技能也相同，随机决定
      return Math.random() - 0.5
    })
  }

  /**
   * 持久化战斗状态到 conversation.metadata
   *
   * @param conversationId - 会话 ID
   * @param state - 战斗状态
   * @private
   */
  private async persistCombatState(
    conversationId: number,
    state: CombatState
  ): Promise<void> {
    try {
      await this.ctx.database.set('conversation', { id: conversationId }, {
        metadata: {
          combat: state,
        },
      })
    } catch (error) {
      this.ctx.logger.warn('[CombatManager] 持久化战斗状态失败', {
        conversationId,
        error,
      })
    }
  }

  /**
   * 清除持久化的战斗状态
   *
   * @param conversationId - 会话 ID
   * @private
   */
  private async clearCombatState(conversationId: number): Promise<void> {
    try {
      await this.ctx.database.set('conversation', { id: conversationId }, {
        metadata: {},
      })
    } catch (error) {
      this.ctx.logger.warn('[CombatManager] 清除战斗状态失败', {
        conversationId,
        error,
      })
    }
  }

  /**
   * 从持久化加载战斗状态
   *
   * @param conversationId - 会话 ID
   * @returns 战斗状态，如果不存在则返回 null
   */
  async loadCombatState(conversationId: number): Promise<CombatState | null> {
    try {
      const conversations = await this.ctx.database.get('conversation', {
        id: conversationId,
      })

      if (conversations.length > 0 && conversations[0].metadata?.combat) {
        const state = conversations[0].metadata.combat as CombatState

        // 恢复到内存
        if (state.isActive) {
          this.combatStates.set(conversationId, state)
          return state
        }
      }

      return null
    } catch (error) {
      this.ctx.logger.error('[CombatManager] 加载战斗状态失败', {
        conversationId,
        error,
      })
      return null
    }
  }
}

/**
 * 创建战斗管理器实例的工厂函数
 *
 * @param ctx - Koishi 上下文对象
 * @returns 战斗管理器实例
 */
export function createCombatManager(ctx: Context): CombatManager {
  return new CombatManager(ctx)
}
