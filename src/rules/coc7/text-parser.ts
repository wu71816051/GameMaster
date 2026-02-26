/**
 * COC7 角色卡文本解析器
 * @description
 * 从文本格式解析 COC7 角色卡数据
 *
 * 输入格式：
 * Wilhelm Müller-力量50str50敏捷55dex55意志80pow80体质70con70外貌40app40教育90edu90体型80siz80智力65灵感65int65san80san值80理智80理智值80幸运70运气70mp16魔法16hp15体力15会计5人类学1...
 *
 * @module rules/coc7/text-parser
 */

import { RuleParser, ParseResult, ImportedCard } from '../base'

/**
 * 属性映射表：中文名/英文缩写 -> 标准属性名
 * @private
 */
const ATTRIBUTE_MAPPING: Record<string, string> = {
  // 基础属性
  力量: 'attributes.strength',
  str: 'attributes.strength',
  敏捷: 'attributes.dexterity',
  dex: 'attributes.dexterity',
  意志: 'attributes.power',
  pow: 'attributes.power',
  体质: 'attributes.constitution',
  con: 'attributes.constitution',
  外貌: 'attributes.appearance',
  app: 'attributes.appearance',
  教育: 'attributes.education',
  edu: 'attributes.education',
  体型: 'attributes.size',
  siz: 'attributes.size',
  智力: 'attributes.intelligence',
  int: 'attributes.intelligence',
  灵感: 'attributes.intelligence',

  // 特殊属性
  san: 'san',
  san值: 'san',
  理智: 'san',
  理智值: 'san',
  幸运: 'luck',
  运气: 'luck',
  mp: 'magic_points',
  魔法: 'magic_points',
  hp: 'hit_points',
  体力: 'hit_points',

  // 技能（简体中文）
  会计: 'skills.accounting',
  人类学: 'skills.anthropology',
  估价: 'skills.appraise',
  考古学: 'skills.archaeology',
  表演: 'skills.art',
  伪造: 'skills.forgery',
  取悦: 'skills.charm',
  魅惑: 'skills.charm',
  攀爬: 'skills.climb',
  计算机: 'skills.computer_use',
  计算机使用: 'skills.computer_use',
  电脑: 'skills.computer_use',
  信用: 'skills.credit_rating',
  信誉: 'skills.credit_rating',
  信用评级: 'skills.credit_rating',
  克苏鲁: 'skills.cthulhu_mythos',
  克苏鲁神话: 'skills.cthulhu_mythos',
  cm: 'skills.cthulhu_mythos',
  乔装: 'skills.disguise',
  闪避: 'skills.dodge',
  汽车: 'skills.drive_auto',
  驾驶: 'skills.drive_auto',
  汽车驾驶: 'skills.drive_auto',
  电气维修: 'skills.electrical_repair',
  电子学: 'skills.electronics',
  话术: 'skills.fast_talk',
  斗殴: 'skills.fighting',
  斧: 'skills.axe',
  矛: 'skills.spear',
  手枪: 'skills.handgun',
  投掷: 'skills.throw',
  步枪: 'skills.rifle',
  霰弹枪: 'skills.shotgun',
  步霰: 'skills.rifle_shotgun',
  机枪: 'skills.machine_gun',
  急救: 'skills.first_aid',
  历史: 'skills.history',
  恐吓: 'skills.intimidate',
  跳跃: 'skills.jump',
  英语: 'skills.english',
  法语: 'skills.french',
  母语: 'skills.mother_tongue',
  法律: 'skills.law',
  图书馆: 'skills.library_use',
  图书馆使用: 'skills.library_use',
  聆听: 'skills.listen',
  开锁: 'skills.locksmith',
  撬锁: 'skills.locksmith',
  锁匠: 'skills.locksmith',
  机械维修: 'skills.mechanical_repair',
  医学: 'skills.medicine',
  博物学: 'skills.natural_history',
  自然学: 'skills.natural_history',
  领航: 'skills.navigate',
  导航: 'skills.navigate',
  神秘学: 'skills.occult',
  重型操作: 'skills.operate_heavy_machinery',
  重型机械: 'skills.operate_heavy_machinery',
  操作重型机械: 'skills.operate_heavy_machinery',
  重型: 'skills.operate_heavy_machinery',
  说服: 'skills.persuade',
  精神分析: 'skills.psychoanalysis',
  心理学: 'skills.psychology',
  骑术: 'skills.ride',
  生物学: 'skills.biology',
  植物学: 'skills.botany',
  妙手: 'skills.sleight_of_hand',
  侦查: 'skills.spot_hidden',
  潜行: 'skills.stealth',
  生存: 'skills.survival',
  游泳: 'skills.swim',
  追踪: 'skills.track',
  驯兽: 'skills.animal_handling',
  潜水: 'skills.diving',
  爆破: 'skills.demolitions',
  读唇: 'skills.lip_reading',
  催眠: 'skills.hypnosis',
  炮术: 'skills.artillery'
}

/**
 * 属性值范围验证：基础属性应该在1-100之间
 * @private
 */
const ATTRIBUTE_RANGES: Record<string, { min: number; max: number }> = {
  // 基础属性
  'attributes.strength': { min: 1, max: 100 },
  'attributes.dexterity': { min: 1, max: 100 },
  'attributes.power': { min: 1, max: 100 },
  'attributes.constitution': { min: 1, max: 100 },
  'attributes.appearance': { min: 1, max: 100 },
  'attributes.education': { min: 1, max: 100 },
  'attributes.size': { min: 1, max: 100 },
  'attributes.intelligence': { min: 1, max: 100 },

  // 特殊属性
  'san': { min: 0, max: 99 },
  'luck': { min: 1, max: 100 },
  'magic_points': { min: 0, max: 50 },
  'hit_points': { min: 1, max: 20 },

  // 技能通常在0-100之间
  'skills': { min: 0, max: 100 }
}

/**
 * 检查属性值是否在允许范围内
 * @private
 */
function isValidAttributeValue(key: string, value: number): { valid: boolean; range?: { min: number; max: number } } {
  // 检查是否匹配skills前缀
  if (key.startsWith('skills.')) {
    const range = ATTRIBUTE_RANGES['skills']
    return { valid: value >= range.min && value <= range.max, range }
  }

  // 检查精确匹配
  const range = ATTRIBUTE_RANGES[key]
  if (range) {
    return { valid: value >= range.min && value <= range.max, range }
  }

  // 未知属性，不做验证
  return { valid: true }
}

/**
 * 解析文本数据为角色卡
 * @private
 */
function parseText(text: string): { card: ImportedCard; warnings: string[] } {
  // 分割角色名和属性部分（以第一个"-"分隔）
  const parts = text.split(/-(.+)/)
  const name = parts[0].trim()
  const attributesPart = parts[1] || ''

  const data: any = {
    rule_system: 'coc7'
  }

  const warnings: string[] = []
  const unknownAttributes: string[] = []
  const invalidValues: string[] = []

  // 使用正则表达式匹配所有属性：中文/英文属性名 + 数字
  const regex = /([a-zA-Z\u4e00-\u9fa5]+)(\d+)/g
  let match

  while ((match = regex.exec(attributesPart)) !== null) {
    const attrName = match[1].toLowerCase()
    const attrValue = parseInt(match[2], 10)

    // 查找属性映射
    const standardKey = ATTRIBUTE_MAPPING[attrName]
    if (!standardKey) {
      unknownAttributes.push(attrName)
      continue
    }

    // 验证属性值范围
    const validation = isValidAttributeValue(standardKey, attrValue)
    if (!validation.valid) {
      invalidValues.push(
        `${attrName}${attrValue} (${standardKey}: 允许范围 ${validation.range!.min}-${validation.range!.max})`
      )
      continue
    }

    // 处理嵌套路径
    const keys = standardKey.split('.')
    let current = data

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key]) {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = attrValue
  }

  // 生成警告信息
  if (unknownAttributes.length > 0) {
    warnings.push(`未知属性: ${unknownAttributes.join(', ')}`)
  }
  if (invalidValues.length > 0) {
    warnings.push(`无效值: ${invalidValues.join(', ')}`)
  }

  return {
    card: {
      name,
      data,
      rule_system: 'coc7',
      tags: ['手动创建']
    },
    warnings
  }
}

/**
 * COC7 角色卡文本解析器实现
 */
export class Coc7TextParser implements RuleParser {
  readonly name = 'coc7-text'
  readonly description = '从文本格式解析 COC7 角色卡数据'

  validate(text: string): boolean {
    // 简单验证：至少包含角色名和一些属性
    return text.trim().length > 0
  }

  async parse(text: string): Promise<ParseResult> {
    try {
      const { card, warnings } = parseText(text)

      // 如果有警告，返回带有警告信息的结果
      const result: ParseResult = {
        success: true,
        cards: [card]
      }

      if (warnings.length > 0) {
        result.warnings = warnings
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败'
      }
    }
  }
}

// 导出单例
export const coc7TextParser = new Coc7TextParser()
