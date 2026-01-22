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
import { pathToFileURL } from 'url'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

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
 * 生成导出文件名
 *
 * @param {number} conversationId - 会话 ID
 * @param {ExportFormat} format - 导出格式
 * @returns {string} 生成的文件名
 *
 * @example
 * ```typescript
 * const filename = generateExportFilename(1, 'markdown')
 * // 返回: "会话记录_1_20260122_143000.md"
 * ```
 */
export function generateExportFilename(
  conversationId: number,
  format: ExportFormat
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
    .replace('T', '_')

  const ext = FILE_EXTENSIONS[format]
  return `会话记录_${conversationId}_${timestamp}.${ext}`
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
 * 创建临时文件并返回路径
 *
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @returns {Promise<string>} 临时文件路径
 *
 * @private
 */
async function createTempFile(
  content: string,
  filename: string
): Promise<string> {
  const tempDir = os.tmpdir()
  const filePath = path.join(tempDir, filename)

  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * 删除临时文件
 *
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>}
 *
 * @private
 */
async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    // 忽略删除失败（文件可能已不存在）
  }
}

/**
 * 发送内容作为文件
 *
 * @description
 * 将内容写入临时文件，然后作为文件附件发送给用户。
 * 发送后自动清理临时文件。
 *
 * @param {Session} session - Koishi 会话对象
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendAsFile(session, 'Hello World', 'test.txt')
 * ```
 */
export async function sendAsFile(
  session: Session,
  content: string,
  filename: string
): Promise<void> {
  let filePath: string | null = null

  try {
    // 创建临时文件
    filePath = await createTempFile(content, filename)

    // 发送文件（使用 file:// 协议，由 OneBot 适配器处理）
    const fileUrl = pathToFileURL(filePath).href
    await session.send(h.file(fileUrl))

    // 异步清理临时文件（延迟 1 秒以确保发送完成）
    if (filePath) {
      setTimeout(() => cleanupTempFile(filePath!), 1000)
    }
  } catch (error) {
    // 发送失败时清理临时文件
    if (filePath) {
      await cleanupTempFile(filePath)
    }
    throw error
  }
}

/**
 * 发送导出内容
 *
 * @description
 * 将导出内容直接发送为文本消息。
 *
 * **注意:** 当前实现为直接发送文本内容,而非文件附件。
 *
 * **原因:** OneBot 适配器的文件上传功能存在兼容性问题 (retcode: 1200)。
 * 可能的原因包括:
 * - 文件名包含中文字符导致编码问题
 * - OneBot 实现对临时文件路径的限制
 * - 文件大小或类型的限制
 *
 * **后续改进:**
 * - 调查 OneBot 错误码 1200 的具体原因
 * - 考虑使用其他文件发送方式 (如 Buffer、data URL 等)
 * - 或实现文件上传到外部存储服务后发送链接
 *
 * @param {Session} session - Koishi 会话对象
 * @param {number} conversationId - 会话 ID
 * @param {string} content - 导出内容
 * @param {ExportFormat} format - 导出格式
 * @returns {Promise<string>} 返回格式描述
 *
 * @example
 * ```typescript
 * const format = await sendExportContent(session, 1, content, 'markdown')
 * // 返回: "markdown"
 * ```
 */
export async function sendExportContent(
  session: Session,
  conversationId: number,
  content: string,
  format: ExportFormat
): Promise<string> {
  // 检查内容长度,避免超过消息长度限制
  const maxLength = 3000 // QQ 消息长度限制
  const formatNames: Record<ExportFormat, string> = {
    text: '纯文本',
    markdown: 'Markdown',
    json: 'JSON',
  }

  if (content.length > maxLength) {
    // 内容过长,分段发送
    const chunks = []
    for (let i = 0; i < content.length; i += maxLength) {
      chunks.push(content.slice(i, i + maxLength))
    }

    await session.send(`📄 会话记录 #${conversationId} (${formatNames[format]})\n⚠️ 内容较长,将分 ${chunks.length} 条消息发送...`)

    for (let i = 0; i < chunks.length; i++) {
      await session.send(`[第 ${i + 1}/${chunks.length} 部分]\n${chunks[i]}`)
    }

    await session.send('✅ 发送完成')
  } else {
    // 内容较短,直接发送
    await session.send(`📄 会话记录 #${conversationId} (${formatNames[format]})\n\n${content}`)
  }

  return format
}
