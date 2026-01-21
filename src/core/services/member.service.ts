/**
 * 成员管理服务 (Member Service)
 *
 * 职责:
 * - 处理用户加入会话请求
 * - 修改成员角色权限
 * - 维护成员关系
 *
 * 核心方法:
 * - joinConversation(conversationId, userId) - 用户加入会话
 * - updateMemberRole(conversationId, operatorId, targetUserId, newRole) - 修改成员角色
 */

import { Context } from 'koishi'
import { ConversationStatus } from '../models/conversation'
import { ConversationMember, MemberRoleType } from '../models/conversation-member'

/**
 * 加入会话的结果
 */
export interface JoinResult {
  success: boolean
  message: string
  member?: ConversationMember
}

/**
 * 修改角色结果
 */
export interface UpdateRoleResult {
  success: boolean
  message: string
  member?: ConversationMember
}

/**
 * 成员管理服务类
 */
export class MemberService {
  constructor(private ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 用户加入会话
   *
   * 加入流程:
   * 1. 验证会话是否存在且活跃
   * 2. 检查用户是否已是成员
   * 3. 创建成员记录（role: member）
   * 4. 更新用户的 conversations 列表
   *
   * @param conversationId 会话ID
   * @param userId 用户ID (Koishi 原生 userId)
   * @returns 加入结果
   */
  async joinConversation(
    conversationId: number,
    userId: number
  ): Promise<JoinResult> {
    const logger = this.ctx.logger

    try {
      logger.debug(`[MemberService] 用户 ${userId} 尝试加入会话 ${conversationId}`)

      // 1. 验证会话是否存在且活跃
      const conversation = await this.ctx.database.get('conversation', { id: conversationId })

      if (!conversation || conversation.length === 0) {
        logger.debug(`[MemberService] 会话 ${conversationId} 不存在`)
        return {
          success: false,
          message: `会话 ${conversationId} 不存在`,
        }
      }

      const conv = conversation[0]

      if (conv.status !== ConversationStatus.ACTIVE) {
        logger.debug(`[MemberService] 会话 ${conversationId} 状态不是 ACTIVE`)
        return {
          success: false,
          message: `会话 ${conversationId} 未激活或已结束`,
        }
      }

      // 2. 检查用户是否已是成员
      const existingMembers = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      if (existingMembers.length > 0) {
        logger.debug(`[MemberService] 用户 ${userId} 已经是会话 ${conversationId} 的成员`)
        return {
          success: false,
          message: `你已经是会话 ${conversationId} 的成员了`,
        }
      }

      // 3. 创建成员记录（role: member）
      const newMember: ConversationMember = {
        conversation_id: conversationId,
        user_id: userId,
        role: 'member',
        joined_at: new Date(),
      }

      await this.ctx.database.create('conversation_member', newMember)
      logger.info(`[MemberService] 用户 ${userId} 成功加入会话 ${conversationId}`)

      // 4. 更新用户的 conversations 列表（暂时跳过，因为需要 database 注入）
      // TODO: 实现用户 conversations 列表更新

      // 返回创建的成员信息
      const createdMembers = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      return {
        success: true,
        message: `成功加入会话 "${conv.name}"`,
        member: createdMembers[0],
      }
    } catch (error) {
      logger.error(`[MemberService] 加入会话失败:`, error)
      return {
        success: false,
        message: `加入会话失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 修改成员角色
   *
   * 修改角色流程:
   * 1. 验证操作者是否为 creator
   * 2. 验证不能修改自己的角色
   * 3. 更新成员记录的 role 字段
   *
   * @param conversationId 会话ID
   * @param operatorId 操作者用户ID (Koishi 原生 userId)
   * @param targetUserId 目标用户ID (Koishi 原生 userId)
   * @param newRole 新角色
   * @returns 修改结果
   */
  async updateMemberRole(
    conversationId: number,
    operatorId: number,
    targetUserId: number,
    newRole: MemberRoleType
  ): Promise<UpdateRoleResult> {
    const logger = this.ctx.logger

    try {
      logger.debug(
        `[MemberService] 操作者 ${operatorId} 尝试将会话 ${conversationId} 中用户 ${targetUserId} 的角色修改为 ${newRole}`
      )

      // 1. 验证操作者是否为 creator
      const operatorMembers = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: operatorId,
      })

      if (operatorMembers.length === 0) {
        logger.debug(`[MemberService] 操作者 ${operatorId} 不是会话 ${conversationId} 的成员`)
        return {
          success: false,
          message: `你不是会话 ${conversationId} 的成员`,
        }
      }

      const operator = operatorMembers[0]

      if (operator.role !== 'creator') {
        logger.debug(`[MemberService] 操作者 ${operatorId} 不是 creator，当前角色: ${operator.role}`)
        return {
          success: false,
          message: '只有创建者可以修改成员角色',
        }
      }

      // 2. 验证不能修改自己的角色
      if (operatorId === targetUserId) {
        logger.debug(`[MemberService] 操作者尝试修改自己的角色`)
        return {
          success: false,
          message: '不能修改自己的角色',
        }
      }

      // 验证目标用户是否是成员
      const targetMembers = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: targetUserId,
      })

      if (targetMembers.length === 0) {
        logger.debug(`[MemberService] 目标用户 ${targetUserId} 不是会话 ${conversationId} 的成员`)
        return {
          success: false,
          message: `用户 ${targetUserId} 不是会话成员`,
        }
      }

      // 验证新角色是否有效
      const validRoles: MemberRoleType[] = ['creator', 'admin', 'member']
      if (!validRoles.includes(newRole)) {
        logger.debug(`[MemberService] 无效的角色: ${newRole}`)
        return {
          success: false,
          message: `无效的角色: ${newRole}`,
        }
      }

      // 3. 更新成员记录的 role 字段
      await this.ctx.database.set('conversation_member', {
        conversation_id: conversationId,
        user_id: targetUserId,
      }, {
        role: newRole,
      })

      logger.info(
        `[MemberService] 成功将会话 ${conversationId} 中用户 ${targetUserId} 的角色修改为 ${newRole}`
      )

      // 获取更新后的成员信息
      const updatedMembers = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: targetUserId,
      })

      const roleNames: Record<MemberRoleType, string> = {
        creator: '创建者',
        admin: '管理员',
        member: '普通成员',
      }

      return {
        success: true,
        message: `成功将 ${targetUserId} 的角色修改为 ${roleNames[newRole]}`,
        member: updatedMembers[0],
      }
    } catch (error) {
      logger.error(`[MemberService] 修改成员角色失败:`, error)
      return {
        success: false,
        message: `修改角色失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 获取会话的所有成员
   *
   * @param conversationId 会话ID
   * @returns 成员列表
   */
  async getConversationMembers(conversationId: number): Promise<ConversationMember[]> {
    try {
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
      })

      this.ctx.logger.debug(`[MemberService] 获取会话 ${conversationId} 的成员列表，共 ${members.length} 人`)
      return members
    } catch (error) {
      this.ctx.logger.error(`[MemberService] 获取成员列表失败:`, error)
      return []
    }
  }

  /**
   * 获取用户在会话中的成员信息
   *
   * @param conversationId 会话ID
   * @param userId 用户ID (Koishi 原生 userId)
   * @returns 成员信息，如果不存在则返回 null
   */
  async getMember(
    conversationId: number,
    userId: number
  ): Promise<ConversationMember | null> {
    try {
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      if (members.length === 0) {
        return null
      }

      return members[0]
    } catch (error) {
      this.ctx.logger.error(`[MemberService] 获取成员信息失败:`, error)
      return null
    }
  }

  /**
   * 检查用户是否是会话成员
   *
   * @param conversationId 会话ID
   * @param userId 用户ID (Koishi 原生 userId)
   * @returns 是否是成员
   */
  async isMember(conversationId: number, userId: number): Promise<boolean> {
    const member = await this.getMember(conversationId, userId)
    return member !== null
  }

  /**
   * 移除会话成员（退出会话）
   *
   * @param conversationId 会话ID
   * @param userId 用户ID (Koishi 原生 userId)
   * @returns 是否成功
   */
  async leaveConversation(conversationId: number, userId: number): Promise<boolean> {
    const logger = this.ctx.logger

    try {
      logger.debug(`[MemberService] 用户 ${userId} 尝试退出会话 ${conversationId}`)

      // 检查用户是否是成员
      const member = await this.getMember(conversationId, userId)

      if (!member) {
        logger.debug(`[MemberService] 用户 ${userId} 不是会话 ${conversationId} 的成员`)
        return false
      }

      // 如果是创建者，不允许退出
      if (member.role === 'creator') {
        logger.debug(`[MemberService] 创建者不能退出会话`)
        return false
      }

      // 删除成员记录
      await this.ctx.database.remove('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      logger.info(`[MemberService] 用户 ${userId} 成功退出会话 ${conversationId}`)
      return true
    } catch (error) {
      logger.error(`[MemberService] 退出会话失败:`, error)
      return false
    }
  }
}

/**
 * 创建成员管理服务实例
 *
 * @param ctx Koishi 上下文
 * @returns 成员管理服务实例
 */
export function createMemberService(ctx: Context): MemberService {
  return new MemberService(ctx)
}
