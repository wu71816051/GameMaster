/**
 * CoC 7e 角色卡 Excel 读取工具
 *
 * @description
 * 从 Excel 文件中读取 CoC 7e 角色卡数据。
 *
 * 支持的文件格式：
 * - .xlsx 文件
 * - 包含"简化卡 骰娘导入"或"人物卡"工作表
 *
 * 功能：
 * - 解析 CoC 7e 属性（力量、敏捷、意志等）
 * - 解析衍生属性（HP、MP、SAN、幸运等）
 * - 解析技能数据
 * - 解析武器装备
 * - 解析背景故事
 *
 * @module core/utils/character-excel-reader
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { Character, RuleSystem } from '../models/character'

/**
 * CoC 7e 属性接口
 */
export interface CoC7Attributes {
  str: number  // 力量
  dex: number  // 敏捷
  pow: number  // 意志
  con: number  // 体质
  app: number  // 外貌
  edu: number  // 教育
  siz: number  // 体型
  int: number  // 智力
}

/**
 * CoC 7e 衍生属性接口
 */
export interface CoC7DerivedStats {
  hp: number         // 体力
  hpMax: number      // 最大体力
  mp: number         // 魔法
  mpMax: number      // 最大魔法
  san: number        // 理智
  sanMax: number     // 最大理智
  luck: number       // 幸运
  db: string         // 伤害加值
  build: number      // 体格
  mov: number        // 移动率
  armor: number      // 护甲
}

/**
 * CoC 7e 技能接口
 */
export interface CoC7Skill {
  name: string       // 技能名称
  value: number      // 技能值
  half: number       // 困难成功
  fifth: number      // 极端成功
}

/**
 * 技能标记类型
 */
export enum SkillMarker {
  STAR = 'star',           // ★ 固定本职技能
  HOLLOW = 'hollow',       // ⊙ 多选一（空心圆）
  FILLED = 'filled',       // ☆ 多选一（实心圆）
  NONE = 'none',           // 无标记（兴趣技能）
}

/**
 * 增强的技能接口（包含标记信息）
 */
export interface CoC7SkillEnhanced extends CoC7Skill {
  marker: SkillMarker       // 技能标记类型
  isOccupational: boolean  // 是否为本职技能
  markerSymbol?: string     // 原始标记符号 (★, ⊙, ☆)
}

/**
 * 技能分类统计
 */
export interface SkillClassification {
  occupational: CoC7SkillEnhanced[]    // 本职技能列表
  interest: CoC7SkillEnhanced[]        // 兴趣技能列表

  // 多选一技能组
  choiceGroups: {
    marker: SkillMarker              // 标记类型
    skills: CoC7SkillEnhanced[]      // 该组的所有技能
    selectedCount: number            // 被选为本职的数量
  }[]

  // 规则遵守检测
  strictMode: boolean               // 是否严格遵守多选一
  violations: string[]              // 违规说明
}

/**
 * CoC 7e 武器接口
 */
export interface CoC7Weapon {
  name: string       // 武器名称
  type: string       // 武器类型
  skill: string      // 使用技能
  value: number      // 基础值
  half: number       // 困难成功
  fifth: number      // 极端成功
  damage: string     // 伤害
  range: string      // 射程
  attacks: string    // 攻击次数
  ammo: string       // 弹药
  malfunction: number // 故障值
}

/**
 * CoC 7e 资产接口
 */
export interface CoC7Assets {
  creditRating: {      // 信用评级
    normal: number
    hard: number
    extreme: number
  }
  spendingLevel: number // 消费水平
  cash: number          // 现金
  assets: string        // 其他资产
  equipment: string[]   // 随身物品
}

/**
 * CoC 7e 角色卡完整数据接口
 */
export interface CoC7CharacterData {
  // 基本信息
  name: string
  age?: number
  occupation?: string
  era?: string
  residence?: string

  // 属性
  attributes: CoC7Attributes
  derivedStats: CoC7DerivedStats

  // 技能
  skills: Map<string, CoC7Skill>

  // 武器
  weapons: CoC7Weapon[]

  // 资产
  assets: CoC7Assets

  // 背景信息
  background?: {
    description?: string
    keyEvents?: string
    beliefs?: string
    importantPeople?: string
    importantPlaces?: string
    treasures?: string
    traits?: string
    scars?: string
    fears?: string
  }

  // 语言
  languages?: {
    native?: string
    others?: Map<string, number>
  }

  // 神话相关
  mythology?: {
    encounters?: Array<{
      name: string
      sanLoss: number
    }>
    totalSanLoss?: number
  }
}

/**
 * 从 Excel 文件读取 CoC 7e 角色卡
 *
 * @param {string} filePath - Excel 文件路径
 * @returns {CoC7CharacterData} 解析后的角色卡数据
 * @throws {Error} 文件不存在或格式错误
 *
 * @example
 * ```typescript
 * const characterData = readCoC7CharacterFromExcel('/path/to/character.xlsx')
 * console.log(characterData.name) // "威尔海姆"
 * console.log(characterData.attributes.str) // 50
 * ```
 */
export function readCoC7CharacterFromExcel(filePath: string): CoC7CharacterData {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  // 读取 Excel 文件
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.readFile(filePath)
  } catch (error) {
    throw new Error(`无法读取 Excel 文件: ${error.message}`)
  }

  // 查找"简化卡 骰娘导入"或"人物卡"工作表
  const sheetName = workbook.SheetNames.find(name =>
    name.includes('简化卡') || name.includes('人物卡')
  )
  if (!sheetName) {
    throw new Error('Excel 文件中未找到"简化卡 骰娘导入"或"人物卡"工作表')
  }

  const worksheet = workbook.Sheets[sheetName]

  // 将工作表转换为 JSON 数组
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  // 初始化角色数据
  const characterData: CoC7CharacterData = {
    name: '',
    attributes: {
      str: 0,
      dex: 0,
      pow: 0,
      con: 0,
      app: 0,
      edu: 0,
      siz: 0,
      int: 0,
    },
    derivedStats: {
      hp: 0,
      hpMax: 0,
      mp: 0,
      mpMax: 0,
      san: 0,
      sanMax: 0,
      luck: 0,
      db: '',
      build: 0,
      mov: 0,
      armor: 0,
    },
    skills: new Map(),
    weapons: [],
    assets: {
      creditRating: { normal: 0, hard: 0, extreme: 0 },
      spendingLevel: 0,
      cash: 0,
      assets: '',
      equipment: [],
    },
  }

  // 解析数据
  let currentSection: string = ''

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex]
    if (!row || row.length === 0) continue

    // 跳过空行和标题行
    const firstCell = row[0]
    if (firstCell === null || firstCell === undefined) continue

    // 检测当前行所在的section
    if (typeof firstCell === 'string') {
      const cellContent = firstCell.trim()

      // 基本信息（姓名、年龄、职业等）
      if (cellContent.includes('，') && cellContent.includes('岁') && !characterData.name) {
        // 格式: "Wilhelm Müller，男，25岁，猎人，1920s，现居：柏林，阿尔萨斯-洛林人"
        parseBasicInfo(characterData, cellContent)
        continue
      }

      // 属性行
      if (cellContent === 'STR' || cellContent === '力量') {
        parseAttributes(characterData, row)
        continue
      }

      if (cellContent === 'CON' || cellContent === '体质') {
        parseAttributesSecondRow(characterData, row)
        continue
      }

      // 衍生属性
      if (cellContent === 'HP') {
        parseDerivedStats(characterData, row)
        continue
      }

      if (cellContent === 'DB') {
        parseDerivedStatsSecondRow(characterData, row)
        continue
      }

      // 武器表
      if (cellContent === '武器表' || cellContent === '无') {
        parseWeapons(characterData, data, rowIndex)
        continue
      }

      // 资产
      if (cellContent === '资产') {
        parseAssets(characterData, data, rowIndex)
        continue
      }

      // 背景故事
      if (cellContent === '背景故事') {
        parseBackground(characterData, data, rowIndex)
        continue
      }

      // 随身物品
      if (cellContent === '随身物品') {
        parseEquipment(characterData, data, rowIndex)
        continue
      }

      // 技能检测
      if (isSkillRow(row)) {
        parseSkill(characterData, row)
        continue
      }
    }
  }

  return characterData
}

/**
 * 解析基本信息
 */
function parseBasicInfo(characterData: CoC7CharacterData, infoText: string): void {
  // 格式: "Wilhelm Müller，男，25岁，猎人，1920s，现居：柏林，阿尔萨斯-洛林人"
  const parts = infoText.split(/，|,/)

  characterData.name = parts[0]?.trim() || '未命名'

  // 提取年龄
  const ageMatch = infoText.match(/(\d+)岁/)
  if (ageMatch) {
    characterData.age = parseInt(ageMatch[1])
  }

  // 提取职业
  if (parts[3]) {
    characterData.occupation = parts[3].trim()
  }

  // 提取时代
  const eraMatch = infoText.match(/(1920s|1890s|现代|1920)/i)
  if (eraMatch) {
    characterData.era = eraMatch[1]
  }

  // 提取居住地
  const residenceMatch = infoText.match(/现居[：:]\s*([^\s，,]+)/)
  if (residenceMatch) {
    characterData.residence = residenceMatch[1]
  }
}

/**
 * 解析第一行属性（STR, DEX, POW, INT）
 */
function parseAttributes(characterData: CoC7CharacterData, row: any[]): void {
  // 格式: ["STR", 50, 25, "DEX", 55, 27, "POW", 80, 40, "INT", 65, 32]
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]
    if (typeof cell === 'string') {
      const attrName = cell.toUpperCase().trim()
      const value = row[i + 1]
      if (typeof value === 'number') {
        switch (attrName) {
          case 'STR':
          case '力量':
            characterData.attributes.str = value
            break
          case 'DEX':
          case '敏捷':
            characterData.attributes.dex = value
            break
          case 'POW':
          case '意志':
            characterData.attributes.pow = value
            break
          case 'INT':
          case '智力':
            characterData.attributes.int = value
            break
        }
      }
    }
  }
}

/**
 * 解析第二行属性（CON, APP, EDU, SIZ）
 */
function parseAttributesSecondRow(characterData: CoC7CharacterData, row: any[]): void {
  // 格式: ["CON", 70, 35, "APP", 40, 20, "EDU", 90, 45, "SIZ", 80, 40]
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]
    if (typeof cell === 'string') {
      const attrName = cell.toUpperCase().trim()
      const value = row[i + 1]
      if (typeof value === 'number') {
        switch (attrName) {
          case 'CON':
          case '体质':
            characterData.attributes.con = value
            break
          case 'APP':
          case '外貌':
            characterData.attributes.app = value
            break
          case 'EDU':
          case '教育':
            characterData.attributes.edu = value
            break
          case 'SIZ':
          case '体型':
            characterData.attributes.siz = value
            break
        }
      }
    }
  }
}

/**
 * 解析第一行衍生属性（HP, SAN, MP）
 */
function parseDerivedStats(characterData: CoC7CharacterData, row: any[]): void {
  // 格式: ["HP", 15, 15, "SAN", 80, 99, "MP", 16, 16, "Armor", 1]
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]
    if (typeof cell === 'string') {
      const statName = cell.toUpperCase().trim()
      const value = row[i + 1]
      const max = row[i + 2]

      if (statName === 'HP') {
        characterData.derivedStats.hp = value || 0
        characterData.derivedStats.hpMax = max || value || 0
      } else if (statName === 'SAN') {
        characterData.derivedStats.san = value || 0
        characterData.derivedStats.sanMax = max || value || 0
      } else if (statName === 'MP') {
        characterData.derivedStats.mp = value || 0
        characterData.derivedStats.mpMax = max || value || 0
      } else if (statName === 'ARMOR') {
        characterData.derivedStats.armor = value || 0
      }
    }
  }
}

/**
 * 解析第二行衍生属性（DB, Build, LUCK, MOV）
 */
function parseDerivedStatsSecondRow(characterData: CoC7CharacterData, row: any[]): void {
  // 格式: ["DB", "+1D4", "Build", 1, "LUCK", 70, "MOV", 7]
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]
    if (typeof cell === 'string') {
      const statName = cell.toUpperCase().trim()
      const value = row[i + 1]

      if (statName === 'DB') {
        characterData.derivedStats.db = String(value || '')
      } else if (statName === 'BUILD') {
        characterData.derivedStats.build = value || 0
      } else if (statName === 'LUCK' || statName === '幸运') {
        characterData.derivedStats.luck = value || 0
      } else if (statName === 'MOV') {
        characterData.derivedStats.mov = value || 0
      }
    }
  }
}

/**
 * 判断是否为技能行
 */
function isSkillRow(row: any[]): boolean {
  if (row.length < 3) return false

  // 检查是否包含技能名称和数值
  const hasString = row.some(cell => typeof cell === 'string' && cell.trim().length > 0)
  const hasNumbers = row.filter(cell => typeof cell === 'number').length >= 2

  // 排除已知的非技能行
  const firstCell = row[0]
  if (typeof firstCell === 'string') {
    const excludeKeywords = [
      '武器表', '资产', '背景故事', '随身物品', '下面就是',
      '请"复制"', '电脑', '技能名的改变', '可选规则',
      '经历包', '战场', '警务', '罪犯', '医务', '神话',
    ]
    if (excludeKeywords.some(keyword => firstCell.includes(keyword))) {
      return false
    }
  }

  return hasString && hasNumbers
}

/**
 * 解析技能
 */
function parseSkill(characterData: CoC7CharacterData, row: any[]): void {
  // 尝试找到技能名称和数值
  for (let i = 0; i < row.length; i++) {
    const cell = row[i]
    if (typeof cell === 'string' && cell.trim().length > 0) {
      const skillName = cell.trim()
      const value = row[i + 1]
      const half = row[i + 2]
      const fifth = row[i + 3]

      if (typeof value === 'number') {
        characterData.skills.set(skillName, {
          name: skillName,
          value: value,
          half: typeof half === 'number' ? half : Math.floor(value / 2),
          fifth: typeof fifth === 'number' ? fifth : Math.floor(value / 5),
        })
        break // 只处理第一个找到的技能
      }
    }
  }
}

/**
 * 解析武器
 */
function parseWeapons(characterData: CoC7CharacterData, data: any[][], startRow: number): void {
  // 武器表格式: 从"武器表"或"无"开始，后续几行是武器数据
  for (let i = startRow + 1; i < data.length && i < startRow + 10; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const firstCell = row[0]
    if (firstCell === null || firstCell === undefined) continue

    // 检查是否到达其他section
    if (typeof firstCell === 'string') {
      const sectionKeywords = ['资产', '背景故事', '随身物品', '下面就是']
      if (sectionKeywords.some(keyword => firstCell.includes(keyword))) {
        break
      }

      // 解析武器
      if (firstCell !== '武器表' && firstCell.trim().length > 0) {
        const weapon: CoC7Weapon = {
          name: String(firstCell),
          type: String(row[1] || ''),
          skill: String(row[2] || ''),
          value: row[3] || 0,
          half: row[4] || 0,
          fifth: row[5] || 0,
          damage: String(row[6] || ''),
          range: String(row[7] || ''),
          attacks: String(row[9] || ''),
          ammo: String(row[10] || ''),
          malfunction: row[11] || 0,
        }
        characterData.weapons.push(weapon)
      }
    }
  }
}

/**
 * 解析资产
 */
function parseAssets(characterData: CoC7CharacterData, data: any[][], startRow: number): void {
  // 查找信用评级等数据
  for (let i = startRow; i < data.length && i < startRow + 10; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    // 查找"信用评级"行
    if (row[0] === '信用评级' || row[12] === '信用评级') {
      const creditRating = row[0] === '信用评级' ? row[1] : row[13]
      if (typeof creditRating === 'string') {
        const parts = creditRating.split('/')
        characterData.assets.creditRating.normal = parseInt(parts[0]) || 0
        characterData.assets.creditRating.hard = parseInt(parts[1]) || 0
        characterData.assets.creditRating.extreme = parseInt(parts[2]) || 0
      }
    }

    // 查找"生活水平"、"消费水平"等
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]
      if (typeof cell === 'string') {
        if (cell.includes('生活水平') || cell.includes('消费水平')) {
          characterData.assets.spendingLevel = row[j + 2] || 0
        } else if (cell.includes('当前现金')) {
          characterData.assets.cash = row[j + 2] || 0
        } else if (cell.includes('其他资产')) {
          characterData.assets.assets = String(row[j + 2] || '')
        }
      }
    }
  }
}

/**
 * 解析背景故事
 */
function parseBackground(characterData: CoC7CharacterData, data: any[][], startRow: number): void {
  if (!characterData.background) {
    characterData.background = {}
  }

  // 背景故事通常在接下来的几行
  for (let i = startRow + 1; i < data.length && i < startRow + 10; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const firstCell = row[0]
    if (typeof firstCell === 'string' && firstCell.trim().length > 0) {
      // 检查是否到达其他section
      if (firstCell === '信仰' || firstCell === '重要人' || firstCell === '重要地' ||
          firstCell === '宝物' || firstCell === '特质' || firstCell === '伤疤' ||
          firstCell === '恐惧') {
        // 这些是背景故事的子项
        const value = row[1]
        if (value && typeof value === 'string') {
          switch (firstCell) {
            case '信仰':
              characterData.background.beliefs = value
              break
            case '重要人':
              characterData.background.importantPeople = value
              break
            case '重要地':
              characterData.background.importantPlaces = value
              break
            case '宝物':
              characterData.background.treasures = value
              break
            case '特质':
              characterData.background.traits = value
              break
            case '伤疤':
              characterData.background.scars = value
              break
            case '恐惧':
              characterData.background.fears = value
              break
          }
        }
      } else if (firstCell === '描述') {
        characterData.background.description = row[1] || ''
      } else if (firstCell === '关键') {
        characterData.background.keyEvents = row[1] || ''
      } else if (firstCell === '随身物品') {
        break // 到达随身物品section
      }
    }
  }
}

/**
 * 解析随身物品
 */
function parseEquipment(characterData: CoC7CharacterData, data: any[][], startRow: number): void {
  const equipment: string[] = []

  for (let i = startRow + 1; i < data.length && i < startRow + 10; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    const firstCell = row[0]
    if (typeof firstCell === 'string' && firstCell.trim().length > 0) {
      // 检查是否到达其他section
      if (firstCell === '背景故事' || firstCell.includes('下面就是') ||
          firstCell.includes('日份口粮')) {
        break
      }

      // 添加物品
      if (firstCell !== '随身物品') {
        equipment.push(String(firstCell))
      }
    }
  }

  characterData.assets.equipment = equipment
}

/**
 * 将 CoC 7e 角色卡数据转换为 Character 模型
 *
 * @param {CoC7CharacterData} coc7Data - CoC 7e 角色卡数据
 * @param {number} conversationId - 会话 ID
 * @param {number} userId - 用户 ID
 * @returns {Character} Character 模型
 *
 * @example
 * ```typescript
 * const coc7Data = readCoC7CharacterFromExcel('/path/to/character.xlsx')
 * const character = convertToCharacterModel(coc7Data, 1, 123)
 * ```
 */
export function convertToCharacterModel(
  coc7Data: CoC7CharacterData,
  conversationId: number,
  userId: number
): Character {
  // 将 Map 转换为普通对象
  const skillsObj: Record<string, number> = {}
  coc7Data.skills.forEach((skill, name) => {
    skillsObj[name] = skill.value
  })

  return {
    conversation_id: conversationId,
    user_id: userId,
    name: coc7Data.name,
    rule_system: RuleSystem.COC7,
    attributes: {
      ...coc7Data.attributes,
      ...coc7Data.derivedStats,
    },
    skills: skillsObj,
    inventory: {
      weapons: coc7Data.weapons,
      assets: coc7Data.assets,
      equipment: coc7Data.assets.equipment,
    },
    metadata: {
      age: coc7Data.age,
      occupation: coc7Data.occupation,
      era: coc7Data.era,
      residence: coc7Data.residence,
      background: coc7Data.background,
      languages: coc7Data.languages,
      mythology: coc7Data.mythology,
    },
    notes: coc7Data.background?.description || '',
    is_active: false,
  }
}

/**
 * 获取标记符号
 *
 * @param {SkillMarker} marker - 标记类型
 * @returns {string} 标记符号
 *
 * @private
 */
function getMarkerSymbol(marker: SkillMarker): string {
  switch (marker) {
    case SkillMarker.STAR: return '★'
    case SkillMarker.HOLLOW: return '⊙'
    case SkillMarker.FILLED: return '☆'
    default: return ''
  }
}

/**
 * 读取本职技能配置表
 *
 * @param {XLSX.WorkBook} workbook - Excel 工作簿
 * @param {string} occupation - 职业名称
 * @returns {Map<string, SkillMarker>} 技能标记映射
 *
 * @private
 */
function readOccupationSkillMarkers(
  workbook: XLSX.WorkBook,
  occupation: string
): Map<string, SkillMarker> {
  const markers = new Map<string, SkillMarker>()

  // 查找"本职技能"工作表
  const sheetName = workbook.SheetNames.find(name =>
    name.includes('本职技能')
  )
  if (!sheetName) return markers

  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  // 找到职业列
  const headerRow = data[1] as string[]
  const occCol = headerRow.findIndex(col =>
    col && col.includes(occupation)
  )
  if (occCol === -1) return markers

  // 读取该职业的技能标记
  for (let i = 7; i < data.length; i++) {
    const row = data[i]
    const skillName = row[0]
    const marker = row[occCol]

    if (skillName && marker && typeof marker === 'string') {
      if (marker.includes('★')) {
        markers.set(String(skillName), SkillMarker.STAR)
      } else if (marker.includes('⊙')) {
        markers.set(String(skillName), SkillMarker.HOLLOW)
      } else if (marker.includes('☆')) {
        markers.set(String(skillName), SkillMarker.FILLED)
      }
    }
  }

  return markers
}

/**
 * 处理多选一技能组
 *
 * @param {SkillClassification} result - 分类结果
 * @param {CoC7SkillEnhanced[]} group - 技能组
 * @param {SkillMarker} marker - 标记类型
 * @param {string} symbol - 标记符号
 *
 * @private
 */
function processChoiceGroup(
  result: SkillClassification,
  group: CoC7SkillEnhanced[],
  marker: SkillMarker,
  symbol: string
): void {
  if (group.length === 0) return

  // 检查有多少个技能被分配了点数（被认为是本职）
  const selected = group.filter(s => s.value > 0)

  result.choiceGroups.push({
    marker: marker,
    skills: group,
    selectedCount: selected.length
  })

  // 如果选择了超过1个，记录违规
  if (selected.length > 1) {
    result.strictMode = false
    result.violations.push(
      `${symbol} 多选一组违规: ${selected.map(s => s.name).join(', ')} ` +
      `共选择了 ${selected.length} 个技能（应只选1个）`
    )
  }

  // 将选中的技能归入本职技能
  result.occupational.push(...selected)

  // 未选中的归入兴趣技能（如果有值的话）
  group.filter(s => s.value === 0).forEach(s => {
    result.interest.push(s)
  })
}

/**
 * 解析技能并识别本职/兴趣分类
 *
 * @param {any[][]} data - Excel 数据
 * @param {Map<string, SkillMarker>} skillMarkers - 技能标记映射
 * @returns {SkillClassification} 技能分类统计
 *
 * @private
 */
function parseSkillsWithClassification(
  data: any[][],
  skillMarkers: Map<string, SkillMarker>
): SkillClassification {
  const result: SkillClassification = {
    occupational: [],
    interest: [],
    choiceGroups: [],
    strictMode: true,
    violations: []
  }

  // 收集所有多选一组
  const hollowGroup: CoC7SkillEnhanced[] = []
  const filledGroup: CoC7SkillEnhanced[] = []

  // 解析简化卡中的技能数据
  for (let i = 10; i < Math.min(30, data.length); i++) {
    const row = data[i]
    if (!row || row.length < 18) continue

    // 检查第12列和第18列的技能
    const skillsToProcess = [
      { name: row[12], value: row[15], half: row[16], fifth: row[17] },
      { name: row[18], value: row[21], half: row[22], fifth: row[23] }
    ]

    for (const skillData of skillsToProcess) {
      if (!skillData.name || typeof skillData.name !== 'string') continue
      if (skillData.name === ':' || skillData.name.trim().length === 0) continue
      if (skillData.value === 0 || skillData.value === undefined) continue

      const skillName = skillData.name.replace(':', '').trim()
      const marker = skillMarkers.get(skillName) || SkillMarker.NONE

      const enhancedSkill: CoC7SkillEnhanced = {
        name: skillName,
        value: skillData.value,
        half: skillData.half || Math.floor(skillData.value / 2),
        fifth: skillData.fifth || Math.floor(skillData.value / 5),
        marker: marker,
        isOccupational: marker !== SkillMarker.NONE,
        markerSymbol: getMarkerSymbol(marker)
      }

      // 分类收集
      if (marker === SkillMarker.STAR) {
        result.occupational.push(enhancedSkill)
      } else if (marker === SkillMarker.HOLLOW) {
        hollowGroup.push(enhancedSkill)
      } else if (marker === SkillMarker.FILLED) {
        filledGroup.push(enhancedSkill)
      } else {
        result.interest.push(enhancedSkill)
      }
    }
  }

  // 处理多选一组（检查是否严格遵守规则）
  processChoiceGroup(result, hollowGroup, SkillMarker.HOLLOW, '⊙')
  processChoiceGroup(result, filledGroup, SkillMarker.FILLED, '☆')

  return result
}

/**
 * 格式化技能分类显示
 *
 * @param {SkillClassification} classification - 技能分类统计
 * @returns {string} 格式化的文本
 */
export function formatSkillClassification(classification: SkillClassification): string {
  let output = '\n╔═══════════════════════════════════════════════════════════════╗'
  output += '\n║           技能分类分析                                        ║'
  output += '\n╚═══════════════════════════════════════════════════════════════╝\n'

  // 本职技能
  output += '━'.repeat(65) + '\n'
  output += '⭐ 本职技能 (使用职业点数)\n'
  output += '━'.repeat(65) + '\n'

  classification.occupational.forEach(skill => {
    output += `  ${skill.markerSymbol || ' '} ${skill.name.padEnd(20)} ${skill.value} (${skill.half}/${skill.fifth})\n`
  })

  // 兴趣技能
  output += '\n━'.repeat(65) + '\n'
  output += '🎨 兴趣技能 (使用兴趣点数)\n'
  output += '━'.repeat(65) + '\n'

  classification.interest.forEach(skill => {
    output += `  ${skill.name.padEnd(20)} ${skill.value} (${skill.half}/${skill.fifth})\n`
  })

  // 多选一说明
  if (classification.choiceGroups.length > 0) {
    output += '\n━'.repeat(65) + '\n'
    output += '📋 多选一技能组\n'
    output += '━'.repeat(65) + '\n'

    classification.choiceGroups.forEach(group => {
      const symbol = getMarkerSymbol(group.marker)
      output += `\n  ${symbol} 组:\n`
      output += `    技能: ${group.skills.map(s => s.name).join(', ')}\n`
      output += `    已选为本职: ${group.selectedCount} 个\n`
    })
  }

  // 规则遵守检测
  output += '\n━'.repeat(65) + '\n'
  output += '✅ 规则遵守检测\n'
  output += '━'.repeat(65) + '\n'

  if (classification.strictMode) {
    output += '  ✅ 严格遵守多选一规则\n'
  } else {
    output += '  ⚠️  未严格遵守多选一规则\n'
    classification.violations.forEach(v => {
      output += `  - ${v}\n`
    })
  }

  // 统计
  output += '\n━'.repeat(65) + '\n'
  output += '📊 统计\n'
  output += '━'.repeat(65) + '\n'
  output += `  本职技能: ${classification.occupational.length} 个\n`
  output += `  兴趣技能: ${classification.interest.length} 个\n`
  output += `  总技能数: ${classification.occupational.length + classification.interest.length} 个\n`

  return output
}

/**
 * 从 Excel 文件读取 CoC 7e 角色卡（增强版，支持技能分类）
 *
 * @param {string} filePath - Excel 文件路径
 * @param {Object} options - 可选配置
 * @param {boolean} options.includeSkillClassification - 是否包含技能分类
 * @param {string} options.occupation - 指定职业名称
 * @returns {CoC7CharacterData & { skillClassification?: SkillClassification }} 解析后的角色卡数据
 *
 * @example
 * ```typescript
 * // 读取并分类技能
 * const data = readCoC7CharacterFromExcel('/path/to/character.xlsx', {
 *   includeSkillClassification: true,
 *   occupation: '猎人'
 * })
 *
 * if (data.skillClassification) {
 *   console.log(formatSkillClassification(data.skillClassification))
 * }
 * ```
 */
export function readCoC7CharacterFromExcelEnhanced(
  filePath: string,
  options?: {
    includeSkillClassification?: boolean
    occupation?: string
  }
): CoC7CharacterData & { skillClassification?: SkillClassification } {
  // 先读取基础数据
  const characterData = readCoC7CharacterFromExcel(filePath)

  // 如果需要技能分类
  if (options?.includeSkillClassification) {
    // 读取 Excel 文件（需要重新读取以获取本职技能表）
    const workbook = XLSX.readFile(filePath)
    const occupation = options?.occupation || characterData.occupation

    if (occupation) {
      const skillMarkers = readOccupationSkillMarkers(workbook, occupation)

      if (skillMarkers.size > 0) {
        // 重新读取"简化卡"数据
        const sheetName = workbook.SheetNames.find(name =>
          name.includes('简化卡') || name.includes('人物卡')
        )
        if (sheetName) {
          const worksheet = workbook.Sheets[sheetName]
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          const classification = parseSkillsWithClassification(data, skillMarkers)
          return {
            ...characterData,
            skillClassification: classification
          }
        }
      }
    }
  }

  return characterData
}
