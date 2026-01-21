/**
 * 用户信息接口
 *
 * @description
 * 表示一个用户的完整信息，包含平台和用户ID。
 * 在 Koishi 中，用户是跨平台的，因此需要标识用户来源的平台。
 *
 * @property {string} platform - 消息平台标识（如: 'discord', 'qq', 'telegram' 等）
 * @property {string} userId - 用户在该平台上的唯一标识
 */
export interface UserInfo {
  platform: string;
  userId: string;
}

/**
 * 用户标识符工具类
 *
 * @description
 * 提供统一的用户标识符格式化和解析功能。
 *
 * 主要用途：
 * 1. 格式化：将平台和用户ID组合成统一的字符串标识符
 * 2. 解析：将字符串标识符还原为用户信息对象
 *
 * 标识符格式：`{platform}:{userId}`
 *
 * 示例：
 * - Discord: `discord:123456789012345678`
 * - QQ: `qq:123456789`
 * - Telegram: `telegram:123456789`
 *
 * @module utils/user-id
 */
export class UserIdUtil {
  /**
   * 格式化用户标识符
   *
   * @description
   * 将平台和用户ID组合成统一的字符串格式。
   * 这个标识符用于：
   * - 在数据库中唯一标识一个用户
   * - 关联用户与会话成员关系
   * - 追踪消息发送者
   * - 存储和查询用户权限信息
   *
   * @param {string} platform - 消息平台标识（如: 'discord', 'qq', 'telegram'）
   * @param {string} userId - 用户在该平台上的唯一ID
   * @returns {string} 格式化后的用户标识符，格式为 `{platform}:{userId}`
   *
   * @example
   * ```typescript
   * const userId = UserIdUtil.formatUserId('discord', '123456789012345678');
   * // 返回: 'discord:123456789012345678'
   *
   * const userId2 = UserIdUtil.formatUserId('qq', '123456789');
   * // 返回: 'qq:123456789'
   * ```
   */
  static formatUserId(platform: string, userId: string): string {
    return `${platform}:${userId}`;
  }

  /**
   * 从 Koishi Session 对象格式化用户标识符
   *
   * @description
   * 这是一个便捷方法，直接从 Koishi 的 Session 对象中提取平台和用户ID。
   * Session 对象包含了消息的上下文信息。
   *
   * 使用场景：
   * - 在消息中间件中快速获取发送者标识符
   * - 在命令处理中获取命令执行者标识符
   * - 避免手动访问 session 的多个属性
   *
   * @param {any} session - Koishi Session 对象
   * @returns {string} 格式化后的用户标识符
   *
   * @example
   * ```typescript
   * // 在消息中间件中
   * const userId = UserIdUtil.formatUserIdFromSession(session);
   * // 返回: 'discord:123456789012345678'
   * ```
   */
  static formatUserIdFromSession(session: any): string {
    return `${session.platform}:${session.userId}`;
  }

  /**
   * 解析用户标识符
   *
   * @description
   * 将格式化的用户标识符字符串解析为 UserInfo 对象。
   *
   * 使用场景：
   * - 从数据库读取用户信息后解析
   * - 从会话成员记录中提取用户信息
   * - 从消息记录中提取发送者信息
   * - 处理用户命令中的用户ID参数
   *
   * @param {string} userIdString - 格式化的用户标识符（如: 'discord:123456789012345678'）
   * @returns {UserInfo} 包含 platform 和 userId 的对象
   * @throws {Error} 如果标识符格式无效（不是2个部分）
   *
   * @example
   * ```typescript
   * const info = UserIdUtil.parseUserId('discord:123456789012345678');
   * // 返回: { platform: 'discord', userId: '123456789012345678' }
   *
   * const info2 = UserIdUtil.parseUserId('qq:123456789');
   * // 返回: { platform: 'qq', userId: '123456789' }
   * ```
   */
  static parseUserId(userIdString: string): UserInfo {
    const parts = userIdString.split(':');

    if (parts.length !== 2) {
      throw new Error(`Invalid user ID format: ${userIdString}. Expected format: {platform}:{userId}`);
    }

    return {
      platform: parts[0],
      userId: parts[1],
    };
  }

  /**
   * 验证用户标识符格式是否有效
   *
   * @description
   * 检查字符串是否符合用户标识符的格式要求。
   *
   * 使用场景：
   * - 在存储到数据库前验证格式
   * - 解析前的预检查
   * - 验证用户输入的用户ID参数
   * - 在命令执行前验证参数有效性
   *
   * @param {string} userIdString - 待验证的用户标识符字符串
   * @returns {boolean} 如果格式有效返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * UserIdUtil.isValidUserId('discord:123456789012345678'); // true
   * UserIdUtil.isValidUserId('invalid-format'); // false
   * UserIdUtil.isValidUserId('discord'); // false (缺少 userId)
   * UserIdUtil.isValidUserId('discord:123:456'); // false (多余的分隔符)
   * ```
   */
  static isValidUserId(userIdString: string): boolean {
    try {
      this.parseUserId(userIdString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 提取平台信息
   *
   * @description
   * 从用户标识符中快速提取平台信息。
   *
   * 使用场景：
   * - 按平台分类统计用户
   * - 平台特定的处理逻辑
   * - 日志和调试信息
   *
   * @param {string} userIdString - 格式化的用户标识符
   * @returns {string} 平台标识符
   *
   * @example
   * ```typescript
   * const platform = UserIdUtil.extractPlatform('discord:123456789012345678');
   * // 返回: 'discord'
   * ```
   */
  static extractPlatform(userIdString: string): string {
    const parts = userIdString.split(':');
    return parts[0];
  }

  /**
   * 提取用户ID（不包含平台）
   *
   * @description
   * 从用户标识符中快速提取纯用户ID部分。
   *
   * 使用场景：
   * - 需要向用户展示不包含平台的ID
   * - 平台API调用（通常只需要用户ID）
   * - 比较同一平台的用户ID
   *
   * @param {string} userIdString - 格式化的用户标识符
   * @returns {string} 用户ID（不包含平台前缀）
   *
   * @example
   * ```typescript
   * const userId = UserIdUtil.extractUserId('discord:123456789012345678');
   * // 返回: '123456789012345678'
   * ```
   */
  static extractUserId(userIdString: string): string {
    const parts = userIdString.split(':');
    return parts[1];
  }
}
