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
