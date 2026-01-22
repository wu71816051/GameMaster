/**
 * 角色卡格式化工具
 *
 * @description
 * 提供角色卡的各种格式化显示方法。
 *
 * @module core/utils/character-formatter
 */

import { Character } from '../models/character'

/**
 * 角色卡格式化工具类
 */
export class CharacterFormatter {
  /**
   * 格式化角色卡显示（精美框图格式）
   *
   * @param character - 角色数据
   * @returns 格式化后的角色卡字符串
   */
  static formatCard(character: Character): string {
    const lines: string[] = []

    // 顶部边框
    lines.push('┌─────────────────────────────┐')

    // 角色名称
    const name = character.name || '未命名'
    lines.push(`│  ${name.padEnd(25)}│`)

    // 规则系统
    const ruleSystem = character.rule_system || 'unknown'
    const ruleSystemText = this.formatRuleSystem(ruleSystem)
    lines.push(`│  ${ruleSystemText.padEnd(25)}│`)

    // 分隔线
    lines.push('├─────────────────────────────┤')

    // 属性显示
    if (character.attributes && Object.keys(character.attributes).length > 0) {
      const attrLines = this.formatAttributes(character.attributes)
      attrLines.forEach(line => {
        lines.push(`│  ${line.padEnd(25)}│`)
      })
      lines.push('├─────────────────────────────┤')
    }

    // 技能显示
    if (character.skills && Object.keys(character.skills).length > 0) {
      lines.push('│  技能：                       │')
      const skillLines = this.formatSkills(character.skills)
      skillLines.forEach(line => {
        lines.push(`│   ${line.padEnd(24)}│`)
      })
    }

    // 底部边框
    lines.push('└─────────────────────────────┘')

    // 激活状态
    if (character.is_active) {
      lines.push('✅ 当前激活角色')
    }

    return lines.join('\n')
  }

  /**
   * 格式化角色详细信息（文本格式）
   *
   * @param character - 角色数据
   * @returns 格式化后的详细信息字符串
   */
  static formatDetail(character: Character): string {
    const lines: string[] = []

    lines.push(`📝 角色：${character.name || '未命名'}`)
    lines.push(`🆔 ID：${character.id || 'N/A'}`)
    lines.push(`🎲 规则系统：${this.formatRuleSystem(character.rule_system)}`)
    lines.push(`✨ 激活状态：${character.is_active ? '✅ 激活' : '❌ 未激活'}`)

    if (character.portrait_url) {
      lines.push(`🖼️ 头像：${character.portrait_url}`)
    }

    // 属性
    if (character.attributes && Object.keys(character.attributes).length > 0) {
      lines.push('\n📊 属性：')
      const attrLines = this.formatAttributes(character.attributes)
      attrLines.forEach(line => {
        lines.push(`  ${line}`)
      })
    }

    // 技能
    if (character.skills && Object.keys(character.skills).length > 0) {
      lines.push('\n🎯 技能：')
      const skillLines = this.formatSkills(character.skills)
      skillLines.forEach(line => {
        lines.push(`  ${line}`)
      })
    }

    // 物品栏
    if (character.inventory && Object.keys(character.inventory).length > 0) {
      lines.push('\n🎒 物品栏：')
      const inventoryLines = this.formatInventory(character.inventory)
      inventoryLines.forEach(line => {
        lines.push(`  ${line}`)
      })
    }

    // 备注
    if (character.notes) {
      lines.push(`\n📝 备注：${character.notes}`)
    }

    // 时间戳
    if (character.created_at) {
      lines.push(`\n⏰ 创建时间：${new Date(character.created_at).toLocaleString('zh-CN')}`)
    }

    return lines.join('\n')
  }

  /**
   * 格式化角色列表
   *
   * @param characters - 角色数组
   * @returns 格式化后的角色列表字符串
   */
  static formatList(characters: Character[]): string {
    const lines: string[] = []

    lines.push(`📜 您的角色列表（共 ${characters.length} 个）`)
    lines.push('')

    characters.forEach((character, index) => {
      const activeMark = character.is_active ? '✅ ' : '   '
      const ruleSystemText = this.formatRuleSystem(character.rule_system)
      lines.push(
        `${activeMark}${index + 1}. ${character.name} ` +
        `(ID: ${character.id}, ${ruleSystemText})`
      )
    })

    lines.push('')
    lines.push('💡 提示：')
    lines.push('  • 使用 "角色设置 <ID或名称>" 设置激活角色')
    lines.push('  • 使用 "角色卡" 或 "card" 查看激活角色的详细信息')

    return lines.join('\n')
  }

  /**
   * 格式化规则系统名称
   *
   * @param ruleSystem - 规则系统代码
   * @returns 格式化后的规则系统名称
   */
  private static formatRuleSystem(ruleSystem: string): string {
    const ruleMap: Record<string, string> = {
      'coc7': 'CoC 7版',
      'dnd5e': 'D&D 5e',
      'generic': '通用',
    }

    return ruleMap[ruleSystem] || ruleSystem
  }

  /**
   * 格式化属性显示
   *
   * @param attributes - 属性对象
   * @returns 格式化后的属性行数组
   */
  private static formatAttributes(attributes: Record<string, any>): string[] {
    const lines: string[] = []
    const attrKeys = Object.keys(attributes)
    const attrValues = Object.values(attributes)

    // 每行显示 3 个属性（两列格式）
    for (let i = 0; i < attrKeys.length; i += 3) {
      const part1 = `${attrKeys[i]}: ${attrValues[i] || 0}`
      const part2 = i + 1 < attrKeys.length ? `${attrKeys[i + 1]}: ${attrValues[i + 1] || 0}` : ''
      const part3 = i + 2 < attrKeys.length ? `${attrKeys[i + 2]}: ${attrValues[i + 2] || 0}` : ''

      // 组合一行，用空格分隔
      const line = [part1, part2, part3].filter(Boolean).join('  ')
      lines.push(line)
    }

    return lines
  }

  /**
   * 格式化技能显示
   *
   * @param skills - 技能对象
   * @returns 格式化后的技能行数组
   */
  private static formatSkills(skills: Record<string, any>): string[] {
    const lines: string[] = []
    const skillKeys = Object.keys(skills)

    // 每行显示 2 个技能
    for (let i = 0; i < skillKeys.length; i += 2) {
      const part1 = `${skillKeys[i]}: ${skills[skillKeys[i]] || 0}`
      const part2 = i + 1 < skillKeys.length ? `${skillKeys[i + 1]}: ${skills[skillKeys[i + 1]] || 0}` : ''

      // 组合一行
      const line = [part1, part2].filter(Boolean).join('  ')
      lines.push(line)
    }

    return lines
  }

  /**
   * 格式化物品栏显示
   *
   * @param inventory - 物品栏对象
   * @returns 格式化后的物品栏行数组
   */
  private static formatInventory(inventory: Record<string, any>): string[] {
    const lines: string[] = []

    if (Array.isArray(inventory)) {
      // 如果是数组，每行一个物品
      inventory.forEach((item, index) => {
        lines.push(`${index + 1}. ${item}`)
      })
    } else if (typeof inventory === 'object') {
      // 如果是对象，显示键值对
      Object.entries(inventory).forEach(([key, value]) => {
        lines.push(`• ${key}: ${value}`)
      })
    }

    return lines
  }

  /**
   * 格式化错误信息
   *
   * @param error - 错误信息
   * @returns 格式化后的错误字符串
   */
  static formatError(error: string): string {
    return `❌ ${error}`
  }
}
