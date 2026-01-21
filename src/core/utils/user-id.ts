/**
 * 用户信息接口（用于向后兼容）
 *
 * @description
 * 保留用于数据迁移或向后兼容。
 *
 * @property {string} platform - 消息平台标识（如: 'discord', 'qq', 'telegram' 等）
 * @property {string} userId - 用户在该平台上的唯一标识
 *
 * @deprecated 现在直接使用 Koishi 的 userId (number 类型)
 */
export interface UserInfo {
  platform: string
  userId: string
}

/**
 * 用户标识符工具类
 *
 * @description
 * 提供用户ID的辅助功能。
 *
 * 直接使用 Koishi 原生的 userId（number 类型），
 * Koishi 会自动通过 binding 表管理跨平台账号绑定。
 *
 * @module utils/user-id
 */
export class UserIdUtil {
  /**
   * 从 Koishi Session 对象获取用户ID
   *
   * @description
   * 直接返回 session.user?.id（Koishi 原生 userId）。
   * Koishi 会自动处理跨平台账号绑定，binding 表维护平台用户 ID 到 Koishi 用户 ID 的映射。
   *
   * @deprecated 请使用 UserService.getUserIdFromSession() 代替。该方法不会查询 binding 表，可能导致跨平台用户识别错误。
   *
   * @param {any} session - Koishi Session 对象
   * @returns {number} 用户ID（Koishi 原生 userId）
   *
   * @example
   * ```typescript
   * // 在消息中间件中
   * const userId = UserIdUtil.getUserIdFromSession(session);
   * // 返回: 12345 (Koishi 用户 ID)
   *
   * // 推荐的新用法:
   * const userService = createUserService(ctx)
   * const userId = await userService.getUserIdFromSession(session)
   * ```
   */
  static getUserIdFromSession(session: any): number {
    const userId = session.user?.id || session.userId || 0
    // 确保返回数字类型（处理某些适配器返回字符串的情况）
    return typeof userId === 'number' ? userId : parseInt(userId as string, 10)
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
   * UserIdUtil.isValidUserId(1234567890) // true
   * UserIdUtil.isValidUserId(0) // false
   * UserIdUtil.isValidUserId(-1) // false
   * ```
   */
  static isValidUserId(userId: number): boolean {
    return typeof userId === 'number' && userId > 0
  }

  /**
   * 从旧格式的用户标识符中提取平台信息（用于数据迁移）
   *
   * @description
   * 解析旧格式的 "platform:userId" 字符串，提取平台信息。
   * 仅用于数据迁移和向后兼容。
   *
   * @param {string} userIdString - 旧格式的用户标识符（如: 'discord:123456789012345678'）
   * @returns {string} 平台标识符
   *
   * @deprecated 现在直接使用 Koishi 的 userId
   *
   * @example
   * ```typescript
   * const platform = UserIdUtil.extractPlatformFromOldFormat('discord:123456789012345678');
   * // 返回: 'discord'
   * ```
   */
  static extractPlatformFromOldFormat(userIdString: string): string {
    const parts = userIdString.split(':')
    return parts[0]
  }

  /**
   * 从旧格式的用户标识符中提取用户ID（用于数据迁移）
   *
   * @description
   * 解析旧格式的 "platform:userId" 字符串，提取纯用户ID部分。
   * 仅用于数据迁移和向后兼容。
   *
   * @param {string} userIdString - 旧格式的用户标识符
   * @returns {string} 用户ID（不包含平台前缀）
   *
   * @deprecated 现在直接使用 Koishi 的 userId
   *
   * @example
   * ```typescript
   * const userId = UserIdUtil.extractUserIdFromOldFormat('discord:123456789012345678');
   * // 返回: '123456789012345678'
   * ```
   */
  static extractUserIdFromOldFormat(userIdString: string): string {
    const parts = userIdString.split(':')
    return parts[1]
  }
}
