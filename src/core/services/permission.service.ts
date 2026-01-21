/**
 * 权限验证服务
 *
 * @description
 * 负责处理 TRPG 会话的权限验证相关业务逻辑。
 *
 * 核心职责：
 * - 查询用户在会话中的角色
 * - 验证用户是否有权限执行操作
 * - 提供权限比较功能
 *
 * @module core/services/permission.service
 */

import { Context } from 'koishi'
import { ConversationMember, MemberRole } from '../models/conversation-member'

/**
 * 获取成员角色的参数接口
 */
export interface GetMemberRoleParams {
  /** 会话 ID */
  conversationId: number
  /** 用户 ID (Koishi 原生 userId) */
  userId: number
}

/**
 * 获取成员角色的结果接口
 */
export interface GetMemberRoleResult {
  /** 是否成功 */
  success: boolean
  /** 用户角色（成功时） */
  role?: MemberRole
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 检查权限的参数接口
 */
export interface CheckPermissionParams {
  /** 会话 ID */
  conversationId: number
  /** 用户 ID (Koishi 原生 userId) */
  userId: number
  /** 所需的最低角色等级 */
  requiredRole: MemberRole
}

/**
 * 检查权限的结果接口
 */
export interface CheckPermissionResult {
  /** 是否有权限 */
  hasPermission: boolean
  /** 用户的实际角色 */
  userRole?: MemberRole
  /** 错误消息（无权限时） */
  error?: string
}

/**
 * 权限等级映射
 * 数值越大，权限等级越高
 */
const ROLE_LEVELS: Record<MemberRole, number> = {
  [MemberRole.MEMBER]: 1,
  [MemberRole.ADMIN]: 2,
  [MemberRole.CREATOR]: 3,
}

/**
 * 权限验证服务类
 */
export class PermissionService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  /**
   * 获取用户在会话中的角色
   *
   * @description
   * 查询指定用户在指定会话中的角色。
   * 如果用户不是该会话的成员，返回错误。
   *
   * @param {GetMemberRoleParams} params - 查询参数
   * @returns {Promise<GetMemberRoleResult>} 查询结果
   *
   * @example
   * ```typescript
   * const result = await permissionService.getMemberRole({
   *   conversationId: 1,
   *   userId: 1234567890  // Koishi 原生 userId
   * })
   *
   * if (result.success) {
   *   console.log(`用户角色: ${result.role}`)
   * } else {
   *   console.error(`查询失败: ${result.error}`)
   * }
   * ```
   */
  async getMemberRole(params: GetMemberRoleParams): Promise<GetMemberRoleResult> {
    try {
      this.logger.debug('[PermissionService] 查询用户角色', {
        conversationId: params.conversationId,
        userId: params.userId,
      })

      // 查询会话成员记录
      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: params.conversationId,
        user_id: params.userId,
      })

      if (members.length === 0) {
        this.logger.warn('[PermissionService] 用户不是该会话的成员', {
          conversationId: params.conversationId,
          userId: params.userId,
        })

        return {
          success: false,
          error: `用户 ${params.userId} 不是会话 ${params.conversationId} 的成员`,
        }
      }

      const member = members[0]
      const role = member.role as MemberRole

      this.logger.debug('[PermissionService] 查询到用户角色', {
        conversationId: params.conversationId,
        userId: params.userId,
        role,
      })

      return {
        success: true,
        role,
      }
    } catch (error) {
      this.logger.error('[PermissionService] 查询用户角色时发生错误', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 检查用户是否有权限执行操作
   *
   * @description
   * 检查指定用户在指定会话中的角色等级是否达到或超过所需的角色等级。
   * 如果用户不是会话成员，或者角色等级不足，返回无权限。
   *
   * @param {CheckPermissionParams} params - 检查参数
   * @returns {Promise<CheckPermissionResult>} 检查结果
   *
   * @example
   * ```typescript
   * // 检查用户是否有 admin 权限
   * const result = await permissionService.checkPermission({
   *   conversationId: 1,
   *   userId: 1234567890,  // Koishi 原生 userId
   *   requiredRole: MemberRole.ADMIN
   * })
   *
   * if (result.hasPermission) {
   *   console.log('用户有权限')
   * } else {
   *   console.error(`无权限: ${result.error}`)
   * }
   * ```
   */
  async checkPermission(params: CheckPermissionParams): Promise<CheckPermissionResult> {
    try {
      this.logger.debug('[PermissionService] 检查用户权限', {
        conversationId: params.conversationId,
        userId: params.userId,
        requiredRole: params.requiredRole,
      })

      // 1. 获取用户角色
      const roleResult = await this.getMemberRole({
        conversationId: params.conversationId,
        userId: params.userId,
      })

      if (!roleResult.success) {
        return {
          hasPermission: false,
          error: roleResult.error,
        }
      }

      const userRole = roleResult.role!

      // 2. 比较角色等级
      const userRoleLevel = ROLE_LEVELS[userRole]
      const requiredRoleLevel = ROLE_LEVELS[params.requiredRole]

      if (userRoleLevel < requiredRoleLevel) {
        this.logger.warn('[PermissionService] 用户权限不足', {
          conversationId: params.conversationId,
          userId: params.userId,
          userRole,
          userRoleLevel,
          requiredRole: params.requiredRole,
          requiredRoleLevel,
        })

        return {
          hasPermission: false,
          userRole,
          error: `权限不足：需要 ${params.requiredRole} 或更高权限，当前角色为 ${userRole}`,
        }
      }

      this.logger.debug('[PermissionService] 用户有权限', {
        conversationId: params.conversationId,
        userId: params.userId,
        userRole,
        requiredRole: params.requiredRole,
      })

      return {
        hasPermission: true,
        userRole,
      }
    } catch (error) {
      this.logger.error('[PermissionService] 检查权限时发生错误', error)

      return {
        hasPermission: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 检查用户是否为会话创建者
   *
   * @description
   * 快速检查用户是否为指定会话的创建者（creator 角色）。
   *
   * @param {number} conversationId - 会话 ID
   * @param {number} userId - 用户 ID (Koishi 原生 userId)
   * @returns {Promise<boolean>} 是否为创建者
   *
   * @example
   * ```typescript
   * const isCreator = await permissionService.isCreator(1, 1234567890)
   * if (isCreator) {
   *   console.log('用户是创建者')
   * }
   * ```
   */
  async isCreator(conversationId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.checkPermission({
        conversationId,
        userId,
        requiredRole: MemberRole.CREATOR,
      })

      return result.hasPermission
    } catch (error) {
      this.logger.error('[PermissionService] 检查创建者权限时发生错误', error)
      return false
    }
  }

  /**
   * 检查用户是否为管理员或创建者
   *
   * @description
   * 快速检查用户是否为指定会话的管理员（admin 或 creator 角色）。
   *
   * @param {number} conversationId - 会话 ID
   * @param {number} userId - 用户 ID (Koishi 原生 userId)
   * @returns {Promise<boolean>} 是否为管理员或创建者
   *
   * @example
   * ```typescript
   * const isAdmin = await permissionService.isAdmin(1, 1234567890)
   * if (isAdmin) {
   *   console.log('用户是管理员或创建者')
   * }
   * ```
   */
  async isAdmin(conversationId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.checkPermission({
        conversationId,
        userId,
        requiredRole: MemberRole.ADMIN,
      })

      return result.hasPermission
    } catch (error) {
      this.logger.error('[PermissionService] 检查管理员权限时发生错误', error)
      return false
    }
  }

  /**
   * 比较两个角色等级
   *
   * @description
   * 比较两个角色的权限等级。
   * 返回值：
   * - 正数：role1 > role2（role1 权限更高）
   * - 0：role1 = role2（权限相同）
   * - 负数：role1 < role2（role1 权限更低）
   *
   * @param {MemberRole} role1 - 角色 1
   * @param {MemberRole} role2 - 角色 2
   * @returns {number} 比较结果
   *
   * @example
   * ```typescript
   * const comparison = permissionService.compareRoles(MemberRole.CREATOR, MemberRole.ADMIN)
   * if (comparison > 0) {
   *   console.log('CREATOR 权限高于 ADMIN')
   * }
   * ```
   */
  compareRoles(role1: MemberRole, role2: MemberRole): number {
    const level1 = ROLE_LEVELS[role1]
    const level2 = ROLE_LEVELS[role2]
    return level1 - level2
  }

  /**
   * 检查用户是否是会话成员
   *
   * @description
   * 快速检查用户是否为指定会话的成员（任何角色）。
   *
   * @param {number} conversationId - 会话 ID
   * @param {number} userId - 用户 ID (Koishi 原生 userId)
   * @returns {Promise<boolean>} 是否为会话成员
   *
   * @example
   * ```typescript
   * const isMember = await permissionService.isMember(1, 1234567890)
   * if (isMember) {
   *   console.log('用户是会话成员')
   * }
   * ```
   */
  async isMember(conversationId: number, userId: number): Promise<boolean> {
    try {
      this.logger.debug('[PermissionService] 检查用户是否为会话成员', {
        conversationId,
        userId,
      })

      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
        user_id: userId,
      })

      const isMember = members.length > 0

      this.logger.debug('[PermissionService] 检查完成', {
        conversationId,
        userId,
        isMember,
      })

      return isMember
    } catch (error) {
      this.logger.error('[PermissionService] 检查成员身份时发生错误', error)
      return false
    }
  }

  /**
   * 获取会话的所有成员
   *
   * @description
   * 获取指定会话的所有成员列表。
   *
   * @param {number} conversationId - 会话 ID
   * @returns {Promise<ConversationMember[]>} 成员列表
   *
   * @example
   * ```typescript
   * const members = await permissionService.getConversationMembers(1)
   * members.forEach(member => {
   *   console.log(`${member.userId}: ${member.role}`)
   * })
   * ```
   */
  async getConversationMembers(conversationId: number): Promise<ConversationMember[]> {
    try {
      this.logger.debug('[PermissionService] 获取会话成员列表', {
        conversationId,
      })

      const members = await this.ctx.database.get('conversation_member', {
        conversation_id: conversationId,
      })

      this.logger.debug('[PermissionService] 获取到成员列表', {
        conversationId,
        count: members.length,
      })

      return members
    } catch (error) {
      this.logger.error('[PermissionService] 获取成员列表时发生错误', error)
      return []
    }
  }
}

/**
 * 创建权限验证服务实例的工厂函数
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {PermissionService} 权限验证服务实例
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { createPermissionService } from './core/services/permission.service'
 *
 * export function apply(ctx: Context) {
 *   const permissionService = createPermissionService(ctx)
 *   // 使用服务...
 * }
 * ```
 */
export function createPermissionService(ctx: Context): PermissionService {
  return new PermissionService(ctx)
}
