/**
 * 文件发送工具
 *
 * @description
 * 提供文件发送相关的辅助功能，包括：
 * - 创建临时文件
 * - 发送文件附件
 * - 文件名生成
 * - MIME 类型映射
 *
 * @module core/utils/file-helper
 */

import { Session, h } from 'koishi'

/**
 * 导出格式类型
 */
export type ExportFormat = 'text' | 'markdown' | 'json'

/**
 * 文件类型映射
 */
const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  text: 'txt',
  markdown: 'md',
  json: 'json',
}

const MIME_TYPES: Record<ExportFormat, string> = {
  text: 'text/plain',
  markdown: 'text/markdown',
  json: 'application/json',
}

/**
 * 清理文件名中的非法字符
 *
 * @param {string} filename - 原始文件名
 * @returns {string} 清理后的文件名
 *
 * @private
 */
function sanitizeFilename(filename: string): string {
  // 移除或替换文件名中的非法字符
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // 移除 Windows 非法字符
    .replace(/\s+/g, '_') // 空格替换为下划线
    .slice(0, 100) // 限制长度
}

/**
 * 生成导出文件名
 *
 * @param {string} conversationName - 会话名称/标题
 * @param {number} conversationId - 会话 ID
 * @param {ExportFormat} format - 导出格式
 * @returns {string} 生成的文件名
 *
 * @example
 * ```typescript
 * const filename = generateExportFilename('我的TRPG团', 1, 'markdown')
 * // 返回: "我的TRPG团_20260122_143000.md"
 * ```
 */
export function generateExportFilename(
  conversationName: string,
  conversationId: number,
  format: ExportFormat
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_')

  const sanitizedName = sanitizeFilename(conversationName)
  const ext = FILE_EXTENSIONS[format]

  // 使用会话名称作为文件名
  return `${sanitizedName}_${timestamp}.${ext}`
}

/**
 * 获取 MIME 类型
 *
 * @param {ExportFormat} format - 导出格式
 * @returns {string} MIME 类型
 *
 * @example
 * ```typescript
 * const mimeType = getMimeType('json')
 * // 返回: "application/json"
 * ```
 */
export function getMimeType(format: ExportFormat): string {
  return MIME_TYPES[format]
}

/**
 * 发送内容作为文件
 *
 * @description
 * 使用 data URL 方式发送文件，无需创建临时文件。
 * 将内容转换为 base64 编码的 data URL，然后发送给用户。
 * 支持设置文件标题（用于显示在聊天界面中）。
 *
 * @param {Session} session - Koishi 会话对象
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名（用作文件标题）
 * @param {string} mimeType - MIME 类型
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendAsFile(session, 'Hello World', 'test.txt', 'text/plain')
 * ```
 */
export async function sendAsFile(
  session: Session,
  content: string,
  filename: string,
  mimeType: string
): Promise<void> {
  try {
    // 将内容转换为 base64
    const base64Content = Buffer.from(content, 'utf-8').toString('base64')

    // 使用 data URL 方式发送文件，并设置文件标题
    const dataUrl = `data:${mimeType};base64,${base64Content}`
    await session.send(h.file(dataUrl, { title: filename }))
  } catch (error) {
    throw error
  }
}

/**
 * 发送导出内容
 *
 * @description
 * 实现完整的会话导出流程：
 * 1. 从数据库获取会话内容（由调用方完成）
 * 2. 将内容转换为 data URL
 * 3. 使用 Koishi 方法发送文件
 *
 * @param {Session} session - Koishi 会话对象
 * @param {string} conversationName - 会话名称/标题
 * @param {number} conversationId - 会话 ID
 * @param {string} content - 导出内容
 * @param {ExportFormat} format - 导出格式
 * @returns {Promise<string>} 返回格式描述
 *
 * @example
 * ```typescript
 * const format = await sendExportContent(session, '我的TRPG团', 1, content, 'markdown')
 * // 返回: "markdown"
 * ```
 */
export async function sendExportContent(
  session: Session,
  conversationName: string,
  conversationId: number,
  content: string,
  format: ExportFormat
): Promise<string> {
  const formatNames: Record<ExportFormat, string> = {
    text: '纯文本',
    markdown: 'Markdown',
    json: 'JSON',
  }

  try {
    // 生成文件名和 MIME 类型
    const filename = generateExportFilename(conversationName, conversationId, format)
    const mimeType = getMimeType(format)

    // 发送提示消息
    await session.send(
      `📄 会话记录 #${conversationId} (${formatNames[format]})\n` +
      `📊 文件大小：${(content.length / 1024).toFixed(2)} KB\n` +
      `正在发送文件...`
    )

    // 使用 data URL 方式发送文件
    await sendAsFile(session, content, filename, mimeType)

    await session.send('✅ 文件发送完成')

    return format
  } catch (error) {
    // 如果文件发送失败，降级为文本消息发送
    console.error('[sendExportContent] 文件发送失败，降级为文本消息', error)

    await session.send(
      `⚠️ 文件发送失败，改为文本消息发送\n\n` +
      `📄 会话记录 #${conversationId} (${formatNames[format]})\n\n${content}`
    )

    return format
  }
}
