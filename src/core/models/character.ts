/**
 * Character 表模型
 *
 * @description
 * 角色（角色卡）数据模型，用于 TRPG 角色管理。
 * 支持多种规则系统（CoC、D&D、通用系统等）。
 *
 * @module core/models/character
 */

/**
 * 规则系统枚举
 */
export enum RuleSystem {
  COC7 = 'coc7',        // 克苏鲁的呼唤 7版
  DND5E = 'dnd5e',      // 龙与地下城 5版
  GENERIC = 'generic',  // 通用系统
}

/**
 * 角色卡元数据接口
 */
export interface CharacterMetadata {
  [key: string]: any
}

/**
 * Character 表模型接口
 */
export interface Character {
  id?: number
  conversation_id: number  // 所属会话
  user_id: number  // 所有者（Koishi 用户 ID）
  name: string  // 角色名称
  portrait_url?: string  // 头像图片（可选）
  rule_system: string  // 规则系统（'coc7', 'dnd5e', 'generic'）
  attributes: any  // 属性（JSON：灵活存储不同规则的属性）
  skills: any  // 技能（JSON：灵活存储不同规则的技能）
  inventory?: any  // 物品栏（可选）
  notes?: string  // 备注
  metadata?: CharacterMetadata  // 规则系统特定数据
  created_at?: Date  // 创建时间
  updated_at?: Date  // 更新时间
  is_active: boolean  // 是否为当前激活角色
}

/**
 * 定义 Character 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    character: Character
  }
}
