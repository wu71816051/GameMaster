/**
 * 默认角色卡解析器（基于 Google Sheets）
 * @description
 * 从 Google Sheets 表格中解析通用角色卡数据
 *
 * 这是默认的解析器，当用户不指定规则时使用
 * 适用于任何通用的角色卡格式
 *
 * 表格格式要求：
 * - 第一行：字段名称（如：名称、等级、属性.力量、属性.敏捷等）
 * - 第二行开始：角色卡数据
 * - "名称" 或 "name" 列是必需的
 *
 * @module rules/default/parser
 */

import { RuleParser, ParseResult, ImportedCard } from '../base'
import { registerParser } from '../base'

/**
 * 从 Google Sheets URL 提取表格 ID
 * @private
 */
function extractSheetId(url: string): string | null {
  // 支持多种 Google Sheets URL 格式
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * 从 Google Sheets URL 构建导出 URL
 * @private
 */
function buildExportUrl(sheetId: string): string {
  // 使用 CSV 格式导出
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
}

/**
 * 解析 CSV 数据为角色卡数组
 * @private
 */
async function parseCsv(csvText: string): Promise<ImportedCard[]> {
  const lines = csvText.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    throw new Error('表格数据不足，至少需要标题行和一行数据')
  }

  // 解析 CSV 行（处理引号包裹的字段）
  const parseRow = (row: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  // 第一行是标题
  const headers = parseRow(lines[0])

  // 查找名称列的索引
  const nameIndex = headers.findIndex(h => h === '名称' || h.toLowerCase() === 'name')

  if (nameIndex === -1) {
    throw new Error('表格缺少"名称"或"name"列')
  }

  // 解析数据行
  const cards: ImportedCard[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])

    // 跳过空行
    if (values.length === 0 || (values.length === 1 && values[0] === '')) {
      continue
    }

    const name = values[nameIndex]
    if (!name || name.trim() === '') {
      continue // 跳过没有名称的行
    }

    // 构建角色卡数据
    const data: Record<string, any> = {}

    // 遍历所有列，构建嵌套数据结构
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j].trim()
      const value = values[j]?.trim()

      if (header === '' || header === '名称' || header.toLowerCase() === 'name') {
        continue
      }

      if (value === '' || value === undefined) {
        continue
      }

      // 尝试解析值类型
      let parsedValue: any = value
      if (!isNaN(Number(value))) {
        parsedValue = Number(value)
      } else if (value === 'true') {
        parsedValue = true
      } else if (value === 'false') {
        parsedValue = false
      }

      // 处理嵌套路径（如 "属性.力量" -> data.attributes.strength）
      const keys = header.split('.')
      let current = data

      for (let k = 0; k < keys.length - 1; k++) {
        const key = keys[k]
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {}
        }
        current = current[key]
      }

      current[keys[keys.length - 1]] = parsedValue
    }

    cards.push({
      name: name.trim(),
      data,
      rule_system: 'default',
      tags: ['导入']
    })
  }

  return cards
}

/**
 * 默认角色卡解析器实现
 */
class DefaultCharacterCardParser implements RuleParser {
  readonly name = 'default'
  readonly description = '从 Google Sheets 表格导入通用角色卡数据（默认解析器）'

  validate(url: string): boolean {
    // 检查是否为 Google Sheets URL
    return (
      url.includes('docs.google.com/spreadsheets') ||
      url.includes('sheets.google.com')
    )
  }

  async parse(url: string): Promise<ParseResult> {
    try {
      // 提取表格 ID
      const sheetId = extractSheetId(url)
      if (!sheetId) {
        return {
          success: false,
          error: '无法从 URL 中提取表格 ID，请确保使用有效的 Google Sheets 链接'
        }
      }

      // 构建导出 URL
      const exportUrl = buildExportUrl(sheetId)

      // 获取 CSV 数据
      const response = await fetch(exportUrl)
      if (!response.ok) {
        return {
          success: false,
          error: `无法获取表格数据: ${response.status} ${response.statusText}`
        }
      }

      const csvText = await response.text()

      // 解析 CSV
      const cards = await parseCsv(csvText)

      return {
        success: true,
        cards
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

// 注册解析器
registerParser(new DefaultCharacterCardParser())
