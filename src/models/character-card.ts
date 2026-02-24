/**
 * 角色卡数据模型（零Schema + 版本管理 + 控制权）
 * @description 支持多种规则系统的角色卡，含版本追踪和控制权转移
 */

/**
 * 规则系统枚举
 */
export enum RuleSystem {
  DND_5E = 'dnd_5e',          // D&D 5th Edition
  COC_7TH = 'coc_7th',          // Call of Cthulhu 7th Edition
  PATHFINDER = 'pathfinder',      // Pathfinder
  WOD = 'wod',                  // World of Darkness
  CUSTOM = 'custom'              // 自定义规则
}

/**
 * 角色卡状态
 */
export enum CharacterCardStatus {
  ACTIVE = 'active',              // 活跃使用中
  ARCHIVED = 'archived',          // 已归档
  DELETED = 'deleted'             // 已删除（软删除）
}

/**
 * 角色卡数据接口
 * @description 存储角色卡的基本信息和规则特定数据
 */
export interface CharacterCard {
  id?: number
  conversation_id: number      // 所属会话ID
  user_id: number             // 拥有者用户ID（永久）
  controller_id?: number      // 当前控制者ID（可转移，null=所有者控制）
  name: string                // 角色名称（同一角色在不同会话中名称相同）
  parent_id: number           // 父角色卡ID（-1表示根角色卡）
  rule_system?: string        // 可选的规则标识
  data: CharacterData          // 完全动态的数据
  tags?: string[]             // 可选的标签系统
  status?: CharacterCardStatus  // 状态
  created_at?: Date
  updated_at?: Date
}

/**
 * 动态角色数据（任意结构）
 * @description 完全动态，支持任意规则系统的数据结构
 */
export interface CharacterData {
  [key: string]: any
}

/**
 * 内存中的角色卡（带脏数据标记）
 * @description 扩展自CharacterCard，用于内存缓存中的脏数据跟踪
 */
export interface MemoryCharacterCard extends CharacterCard {
  _dirty: boolean
  _dirtyFields: Set<string>
  _lastModified: Date
}

/**
 * 角色卡元数据接口
 * @description 扩展元数据，用于存储额外信息
 */
export interface CharacterCardMetadata {
  tags?: string[]                 // 标签
  notes?: string                // 备注信息
  template_id?: string           // 使用的模板ID
  custom_fields?: Record<string, any>  // 自定义字段
  [key: string]: any
}

/**
 * 注册 CharacterCard 表
 * @description 在 koishi 的 Tables 接口中声明 character_card 表
 */
declare module 'koishi' {
  interface Tables {
    character_card: CharacterCard
  }
}
