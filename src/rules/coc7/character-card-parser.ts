/**
 * COC7 角色卡解析器（基于 Google Sheets）
 * @description
 * 从 Google Sheets 表格中解析 COC7 角色卡数据
 *
 * 表格格式要求：
 * - 第一行：字段名称（如：名称、等级、属性.力量、属性.敏捷等）
 * - 第二行开始：角色卡数据
 * - "名称" 或 "name" 列是必需的
 *
 * @module rules/coc7/character-card-parser
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
  console.log('[CSV解析] 开始解析 CSV 数据')
  const lines = csvText.split('\n').filter(line => line.trim())
  console.log(`[CSV解析] 共 ${lines.length} 行数据`)

  if (lines.length < 2) {
    console.error('[CSV解析] 表格数据不足')
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
  console.log(`[CSV解析] 标题行 (${headers.length} 列):`, headers)

  // 查找名称列的索引
  const nameIndex = headers.findIndex(h => h === '名称' || h.toLowerCase() === 'name')

  if (nameIndex === -1) {
    console.error('[CSV解析] 未找到"名称"或"name"列')
    console.error('[CSV解析] 可用的列名:', headers)
    throw new Error('表格缺少"名称"或"name"列，请在第一行添加"名称"列')
  }

  console.log(`[CSV解析] 找到名称列，位置: ${nameIndex}`)

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
      console.log(`[CSV解析] 第 ${i + 1} 行：名称为空，跳过`)
      continue // 跳过没有名称的行
    }

    console.log(`[CSV解析] 第 ${i + 1} 行：解析角色卡 "${name}"`)

    // 构建角色卡数据
    const data: Record<string, any> = {}

    // 遍历所有列，构建嵌套数据结构
    let fieldCount = 0
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j].trim()
      const value = values[j]?.trim()

      if (header === '' || header === '名称' || header.toLowerCase() === 'name') {
        continue
      }

      if (value === '' || value === undefined) {
        continue
      }

      fieldCount++

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

    console.log(`[CSV解析] 第 ${i + 1} 行：解析了 ${fieldCount} 个字段`)

    cards.push({
      name: name.trim(),
      data,
      rule_system: 'coc7',
      tags: ['导入']
    })
  }

  console.log(`[CSV解析] 解析完成，共生成 ${cards.length} 张角色卡`)
  return cards
}

/**
 * OC7 角色卡解析器实现
 */
class Coc7CharacterCardParser implements RuleParser {
  readonly name = 'coc7'
  readonly description = '从 Google Sheets 表格导入 COC7 角色卡数据'

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
        console.error(`[COC7解析器] 无法从 URL 中提取表格 ID: ${url}`)
        return {
          success: false,
          error: '无法从 URL 中提取表格 ID，请确保使用有效的 Google Sheets 链接'
        }
      }

      console.log(`[COC7解析器] 成功提取表格 ID: ${sheetId}`)

      // 构建导出 URL
      const exportUrl = buildExportUrl(sheetId)
      console.log(`[COC7解析器] 导出 URL: ${exportUrl}`)

      // 获取 CSV 数据
      console.log('[COC7解析器] 正在获取表格数据...')
      const response = await fetch(exportUrl)
      if (!response.ok) {
        console.error(`[COC7解析器] 获取失败: ${response.status} ${response.statusText}`)
        return {
          success: false,
          error: `无法获取表格数据: ${response.status} ${response.statusText}\n可能原因：\n1. 表格未设置为"知道链接的任何人都可以查看"\n2. 表格 URL 不正确\n3. 网络连接问题`
        }
      }

      console.log('[COC7解析器] 成功获取表格数据，正在解析 CSV...')
      const csvText = await response.text()
      console.log(`[COC7解析器] CSV 数据长度: ${csvText.length} 字符`)

      // 解析 CSV
      const cards = await parseCsv(csvText)
      console.log(`[COC7解析器] 解析完成，共 ${cards.length} 张角色卡`)

      return {
        success: true,
        cards
      }
    } catch (error) {
      console.error('[COC7解析器] 解析异常:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
}

// 注册解析器
registerParser(new Coc7CharacterCardParser())
