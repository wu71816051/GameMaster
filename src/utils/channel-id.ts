/**
 * 频道信息接口
 *
 * @description
 * 表示一个频道的完整信息，包含平台、群组/服务器和频道ID。
 * 在 Koishi 中，频道是消息发送的上下文环境。
 *
 * @property {string} platform - 消息平台标识（如: 'discord', 'qq', 'telegram' 等）
 * @property {string} guildId - 群组或服务器ID（Guild ID）
 * @property {string} channelId - 频道ID（Channel ID）
 */
export interface ChannelInfo {
  platform: string;
  guildId: string;
  channelId: string;
}

/**
 * 频道标识符工具类
 *
 * @description
 * 提供统一的频道标识符格式化和解析功能。
 *
 * 主要用途：
 * 1. 格式化：将平台的频道信息转换为统一的字符串标识符
 * 2. 解析：将字符串标识符还原为频道信息对象
 *
 * 标识符格式：`{platform}:{guildId}:{channelId}`
 *
 * 示例：
 * - Discord: `discord:123456789:987654321`
 * - QQ: `qq:123456:789`
 * - Telegram: `telegram:-100123456789:0`
 *
 * @module utils/channel-id
 */
export class ChannelIdUtil {
  /**
   * 格式化频道标识符
   *
   * @description
   * 将平台的频道信息（平台、群组ID、频道ID）组合成统一的字符串格式。
   * 这个标识符用于：
   * - 在数据库中唯一标识一个频道
   * - 检查频道是否有活跃的会话
   * - 关联消息与特定频道
   *
   * @param {string} platform - 消息平台标识（如: 'discord', 'qq', 'telegram'）
   * @param {string} guildId - 群组或服务器ID
   * @param {string} channelId - 频道ID
   * @returns {string} 格式化后的频道标识符，格式为 `{platform}:{guildId}:{channelId}`
   *
   * @example
   * ```typescript
   * const channelId = ChannelIdUtil.formatChannelId('discord', '123456789', '987654321');
   * // 返回: 'discord:123456789:987654321'
   *
   * const channelId2 = ChannelIdUtil.formatChannelId('qq', '123456', '789');
   * // 返回: 'qq:123456:789'
   * ```
   */
  static formatChannelId(platform: string, guildId: string, channelId: string): string {
    return `${platform}:${guildId}:${channelId}`;
  }

  /**
   * 解析频道标识符
   *
   * @description
   * 将格式化的频道标识符字符串解析为 ChannelInfo 对象。
   *
   * 使用场景：
   * - 从数据库读取频道信息后解析
   * - 从会话记录中提取频道信息
   * - 日志或调试时显示频道详情
   *
   * @param {string} channelIdString - 格式化的频道标识符（如: 'discord:123456789:987654321'）
   * @returns {ChannelInfo} 包含 platform、guildId、channelId 的对象
   * @throws {Error} 如果标识符格式无效（不是3个部分）
   *
   * @example
   * ```typescript
   * const info = ChannelIdUtil.parseChannelId('discord:123456789:987654321');
   * // 返回: { platform: 'discord', guildId: '123456789', channelId: '987654321' }
   *
   * const info2 = ChannelIdUtil.parseChannelId('qq:123456:789');
   * // 返回: { platform: 'qq', guildId: '123456', channelId: '789' }
   * ```
   */
  static parseChannelId(channelIdString: string): ChannelInfo {
    const parts = channelIdString.split(':');

    if (parts.length !== 3) {
      throw new Error(`Invalid channel ID format: ${channelIdString}. Expected format: {platform}:{guildId}:{channelId}`);
    }

    return {
      platform: parts[0],
      guildId: parts[1],
      channelId: parts[2],
    };
  }

  /**
   * 验证频道标识符格式是否有效
   *
   * @description
   * 检查字符串是否符合频道标识符的格式要求。
   *
   * 使用场景：
   * - 在存储到数据库前验证格式
   * - 解析前的预检查
   * - 用户输入验证
   *
   * @param {string} channelIdString - 待验证的频道标识符字符串
   * @returns {boolean} 如果格式有效返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * ChannelIdUtil.isValidChannelId('discord:123456789:987654321'); // true
   * ChannelIdUtil.isValidChannelId('invalid-format'); // false
   * ChannelIdUtil.isValidChannelId('discord:123456789'); // false (缺少 channelId)
   * ```
   */
  static isValidChannelId(channelIdString: string): boolean {
    try {
      this.parseChannelId(channelIdString);
      return true;
    } catch {
      return false;
    }
  }
}
