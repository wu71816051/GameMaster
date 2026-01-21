/**
 * 用户服务 (User Service)
 *
 * @description
 * 负责处理用户相关的业务逻辑，特别是用户身份识别和跨平台账号绑定。
 *
 * 核心职责：
 * - 从 Session 中正确识别用户（通过 binding 表）
 * - 支持跨平台账号统一管理
 * - 提供用户相关的辅助功能
 *
 * @module core/services/user.service
 */

import { Context } from 'koishi'

/**
 * 用户服务类
 */
export class UserService {
  constructor(private ctx: Context) {}

  /**
   * 从 Koishi Session 对象获取用户ID
   *
   * @description
   * 通过 platform 和 pid 查询 binding 表获取 aid（Koishi 用户 ID）。
   * 这是正确的跨平台用户识别方式，Koishi 会自动处理跨平台账号绑定。
   *
   * @param {any} session - Koishi Session 对象
   * @returns {Promise<number>} 用户ID（Koishi 原生 userId），如果查询失败返回 0
   *
   * @example
   * ```typescript
   * const userService = new UserService(ctx)
   * const userId = await userService.getUserIdFromSession(session)
   * // 返回: 12345 (Koishi 用户 ID)
   * ```
   */
  async getUserIdFromSession(session: any): Promise<number> {
    const platform = session.platform
    const pid = session.userId || session.user?.id

    if (!platform || !pid) {
      this.ctx.logger.warn('[UserService] Session 缺少 platform 或 pid', {
        platform,
        pid,
      })
      return 0
    }

    try {
      // 查询 binding 表，通过 platform + pid 获取 aid
      const bindings = await this.ctx.database.get('binding', {
        platform,
        pid: String(pid),
      })

      if (bindings.length === 0) {
        this.ctx.logger.warn('[UserService] 未找到 binding 记录', {
          platform,
          pid,
        })
        return 0
      }

      const aid = bindings[0].aid
      this.ctx.logger.debug('[UserService] 查询到 userId', {
        platform,
        pid,
        aid,
      })

      return aid
    } catch (error) {
      this.ctx.logger.error('[UserService] 查询 binding 表失败', error)
      return 0
    }
  }

  /**
   * 验证用户ID是否有效
   *
   * @description
   * 检查用户ID是否为有效的正数。
   *
   * @param {number} userId - 用户ID
   * @returns {boolean} 如果用户ID有效返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * UserService.isValidUserId(1234567890) // true
   * UserService.isValidUserId(0) // false
   * UserService.isValidUserId(-1) // false
   * ```
   */
  static isValidUserId(userId: number): boolean {
    return typeof userId === 'number' && userId > 0
  }
}

/**
 * 创建用户服务实例的工厂函数
 *
 * @param {Context} ctx - Koishi 上下文对象
 * @returns {UserService} 用户服务实例
 *
 * @example
 * ```typescript
 * import { Context } from 'koishi'
 * import { createUserService } from './core/services/user.service'
 *
 * export function apply(ctx: Context) {
 *   const userService = createUserService(ctx)
 *   // 使用服务...
 * }
 * ```
 */
export function createUserService(ctx: Context): UserService {
  return new UserService(ctx)
}
