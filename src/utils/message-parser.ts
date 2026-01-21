/**
 * 消息类型枚举
 *
 * @description
 * 定义支持的所有消息类型。
 * 这些类型对应 Koishi 支持的主要消息形式。
 *
 * @property {string} TEXT - 纯文本消息
 * @property {string} IMAGE - 图片消息
 * @property {string} AUDIO - 音频消息
 * @property {string} VIDEO - 视频消息
 * @property {string} UNKNOWN - 未知或不支持的消息类型
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  UNKNOWN = 'unknown',
}

/**
 * 附件信息接口
 *
 * @description
 * 表示消息中的附件信息（图片、音频、视频等）。
 *
 * @property {string} type - 附件类型（image/audio/video）
 * @property {string} url - 附件的URL地址
 * @property {string} [name] - 附件文件名（可选）
 * @property {number} [size] - 附件大小（字节）（可选）
 */
export interface Attachment {
  type: string;
  url: string;
  name?: string;
  size?: number;
}

/**
 * 解析后的消息信息接口
 *
 * @description
 * 表示从 Koishi Session 中提取的消息完整信息。
 *
 * @property {MessageType} messageType - 消息类型
 * @property {string} content - 消息文本内容
 * @property {Attachment[]} attachments - 附件列表
 * @property {any} elements - Koishi 原始消息元素（用于高级处理）
 */
export interface ParsedMessage {
  messageType: MessageType;
  content: string;
  attachments: Attachment[];
  elements: any[];
}

/**
 * 消息解析工具类
 *
 * @description
 * 提供消息类型检测、内容提取和附件解析功能。
 *
 * 主要用途：
 * 1. 检测消息类型（文本/图片/音频/视频）
 * 2. 提取消息文本内容
 * 3. 提取附件信息
 * 4. 统一的消息格式转换
 *
 * @module utils/message-parser
 */
export class MessageParser {
  /**
   * 检测消息类型
   *
   * @description
   * 分析 Koishi Session 对象，判断消息的主要类型。
   *
   * 检测逻辑：
   * 1. 检查消息元素数组是否为空
   * 2. 遍历消息元素，查找媒体元素
   * 3. 优先级：video > audio > image > text
   * 4. 如果包含多种类型，返回优先级最高的
   *
   * @param {any} session - Koishi Session 对象
   * @returns {MessageType} 检测到的消息类型
   *
   * @example
   * ```typescript
   * // 纯文本消息
   * const type1 = MessageParser.detectMessageType(textOnlySession);
   * // 返回: MessageType.TEXT
   *
   * // 图片消息
   * const type2 = MessageParser.detectMessageType(imageSession);
   * // 返回: MessageType.IMAGE
   *
   * // 包含图片和文字的消息
   * const type3 = MessageParser.detectMessageType(mixedSession);
   * // 返回: MessageType.IMAGE
   * ```
   */
  static detectMessageType(session: any): MessageType {
    // 获取消息元素数组
    const elements = session?.content || session?.elements || [];

    // 如果没有元素，返回未知类型
    if (!elements || elements.length === 0) {
      return MessageType.UNKNOWN;
    }

    // 检查是否是单个字符串（纯文本）
    if (typeof elements === 'string') {
      return MessageType.TEXT;
    }

    // 确保是数组
    const elementsArray = Array.isArray(elements) ? elements : [elements];

    // 按优先级检查消息元素
    // 优先级：video > audio > image > text
    let hasVideo = false;
    let hasAudio = false;
    let hasImage = false;
    let hasText = false;

    for (const element of elementsArray) {
      if (!element || typeof element !== 'object') {
        // 简单字符串被视为文本
        if (typeof element === 'string' && element.trim()) {
          hasText = true;
        }
        continue;
      }

      // Koishi 的元素类型通常在 type 字段
      const elementType = element.type;

      if (elementType === 'video') {
        hasVideo = true;
      } else if (elementType === 'audio') {
        hasAudio = true;
      } else if (elementType === 'image') {
        hasImage = true;
      } else if (elementType === 'text' || typeof element === 'string') {
        hasText = true;
      }
    }

    // 按优先级返回类型
    if (hasVideo) return MessageType.VIDEO;
    if (hasAudio) return MessageType.AUDIO;
    if (hasImage) return MessageType.IMAGE;
    if (hasText) return MessageType.TEXT;

    // 默认返回文本类型（即使内容为空）
    return MessageType.TEXT;
  }

  /**
   * 提取消息文本内容
   *
   * @description
   * 从 Session 对象中提取纯文本内容，过滤掉媒体元素。
   *
   * 处理逻辑：
   * 1. 遍历所有消息元素
   * 2. 提取类型为 'text' 的元素内容
   * 3. 过滤掉媒体元素（image/audio/video）
   * 4. 将所有文本片段拼接成一个字符串
   *
   * @param {any} session - Koishi Session 对象
   * @returns {string} 提取的文本内容
   *
   * @example
   * ```typescript
   * // 纯文本消息
   * const content1 = MessageParser.extractTextContent(textOnlySession);
   * // 返回: 'Hello, world!'
   *
   * // 混合消息（文字+图片）
   * const content2 = MessageParser.extractTextContent(mixedSession);
   * // 返回: 'Check out this image' （图片被过滤）
   * ```
   */
  static extractTextContent(session: any): string {
    const elements = session?.content || session?.elements || [];

    // 如果是简单字符串，直接返回
    if (typeof elements === 'string') {
      return elements;
    }

    // 确保是数组
    const elementsArray = Array.isArray(elements) ? elements : [elements];

    // 提取所有文本元素
    const textParts: string[] = [];

    for (const element of elementsArray) {
      if (!element) {
        continue;
      }

      // 如果是字符串，直接添加
      if (typeof element === 'string') {
        textParts.push(element);
        continue;
      }

      // 如果是对象，检查类型
      if (typeof element === 'object') {
        const elementType = element.type;

        // 只提取文本类型
        if (elementType === 'text' && element.content) {
          textParts.push(element.content);
        } else if (!elementType && typeof element.content === 'string') {
          // 没有 type 但有 content 属性的，也当作文本
          textParts.push(element.content);
        }
      }
    }

    // 拼接所有文本部分
    return textParts.join('').trim();
  }

  /**
   * 提取附件信息
   *
   * @description
   * 从 Session 对象中提取所有附件（图片、音频、视频）。
   *
   * 处理逻辑：
   * 1. 遍历所有消息元素
   * 2. 查找类型为 image/audio/video 的元素
   * 3. 提取附件的 URL 和其他元数据
   * 4. 返回附件数组
   *
   * @param {any} session - Koishi Session 对象
   * @returns {Attachment[]} 附件数组
   *
   * @example
   * ```typescript
   * // 图片消息
   * const attachments1 = MessageParser.extractAttachments(imageSession);
   * // 返回: [{ type: 'image', url: 'https://example.com/image.jpg' }]
   *
   * // 混合消息（文字+多张图片）
   * const attachments2 = MessageParser.extractAttachments(multiImageSession);
   * // 返回: [
   * //   { type: 'image', url: 'https://example.com/image1.jpg' },
   * //   { type: 'image', url: 'https://example.com/image2.jpg' }
   * // ]
   * ```
   */
  static extractAttachments(session: any): Attachment[] {
    const elements = session?.content || session?.elements || [];
    const attachments: Attachment[] = [];

    // 如果没有元素或不是数组，返回空数组
    if (!elements || !Array.isArray(elements)) {
      return attachments;
    }

    for (const element of elements) {
      if (!element || typeof element !== 'object') {
        continue;
      }

      const elementType = element.type;

      // 提取媒体元素
      if (elementType === 'image' || elementType === 'audio' || elementType === 'video') {
        const attachment: Attachment = {
          type: elementType,
          url: element.url || element.src || '',
        };

        // 添加可选属性
        if (element.name) {
          attachment.name = element.name;
        }
        if (element.size) {
          attachment.size = element.size;
        }

        attachments.push(attachment);
      }
    }

    return attachments;
  }

  /**
   * 完整解析消息
   *
   * @description
   * 综合提取消息的所有信息，包括类型、内容和附件。
   *
   * 这是一个便捷方法，一次性获取消息的所有相关信息。
   * 适用于需要完整消息信息的场景，如消息记录存储。
   *
   * @param {any} session - Koishi Session 对象
   * @returns {ParsedMessage} 包含所有消息信息的对象
   *
   * @example
   * ```typescript
   * const parsed = MessageParser.parseMessage(session);
   * // 返回: {
   * //   messageType: MessageType.IMAGE,
   * //   content: 'Check this out!',
   * //   attachments: [{ type: 'image', url: 'https://example.com/image.jpg' }],
   * //   elements: [...]
   * // }
   * ```
   */
  static parseMessage(session: any): ParsedMessage {
    return {
      messageType: this.detectMessageType(session),
      content: this.extractTextContent(session),
      attachments: this.extractAttachments(session),
      elements: session?.content || session?.elements || [],
    };
  }

  /**
   * 判断消息是否包含媒体
   *
   * @description
   * 快速检查消息是否包含任何媒体附件（图片/音频/视频）。
   *
   * 使用场景：
   * - 决定是否需要下载附件
   * - 统计媒体消息数量
   * - 过滤纯文本消息
   *
   * @param {any} session - Koishi Session 对象
   * @returns {boolean} 如果包含媒体返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * MessageParser.hasMedia(textOnlySession); // false
   * MessageParser.hasMedia(imageSession); // true
   * ```
   */
  static hasMedia(session: any): boolean {
    const type = this.detectMessageType(session);
    return type === MessageType.IMAGE ||
           type === MessageType.AUDIO ||
           type === MessageType.VIDEO;
  }

  /**
   * 获取附件总数
   *
   * @description
   * 统计消息中包含的附件数量。
   *
   * @param {any} session - Koishi Session 对象
   * @returns {number} 附件数量
   *
   * @example
   * ```typescript
   * MessageParser.getAttachmentCount(textOnlySession); // 0
   * MessageParser.getAttachmentCount(singleImageSession); // 1
   * MessageParser.getAttachmentCount(multiImageSession); // 3
   * ```
   */
  static getAttachmentCount(session: any): number {
    return this.extractAttachments(session).length;
  }
}
