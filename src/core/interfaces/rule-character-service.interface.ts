/**
 * 规则角色卡服务接口
 *
 * @description
 * 定义规则系统必须实现的角色卡服务方法。
 * 所有规则系统的角色服务都应该实现这个接口。
 *
 * @module core/interfaces/rule-character-service
 */

/**
 * 角色战斗数据接口
 *
 * @description
 * 通用的战斗数据结构，各规则系统可以扩展
 */
export interface CharacterCombatData {
  /** 角色 ID */
  characterId: number
  /** 角色名称 */
  characterName: string
  /** 用户 ID */
  userId: number

  // 基础属性
  /** 敏捷（用于战斗轮排序） */
  dexterity: number
  /** 力量 */
  strength?: number
  /** 体质 */
  constitution?: number
  /** 体型 */
  size?: number
  /** 意志 */
  power?: number
  /** 智力 */
  intelligence?: number
  /** 教育 */
  education?: number
  /** 外貌 */
  appearance?: number

  // 战斗状态
  /** 当前 HP */
  currentHp: number
  /** 最大 HP */
  maxHp: number

  // 技能（通用）
  /** 主要战斗技能值 */
  combatSkill?: number
  /** 闪避技能 */
  dodgeSkill?: number
}

/**
 * 伤害结果接口
 */
export interface DamageResult {
  /** 伤害前的 HP */
  oldHp: number
  /** 伤害后的 HP */
  newHp: number
  /** 造成的伤害值 */
  damage: number
  /** 是否失去意识 */
  isUnconscious: boolean
  /** 是否死亡 */
  isDead: boolean
}

/**
 * 技能值接口
 */
export interface SkillValue {
  /** 技能标准化名称（英文，用于内部查询） */
  name: string
  /** 技能显示名称（用户看到） */
  displayName: string
  /** 技能数值 */
  value: number
}

/**
 * 创建角色参数接口
 */
export interface CreateCharacterParams {
  /** 所属会话 ID（可选） */
  conversationId?: number
  /** 所有者用户 ID */
  userId: number
  /** 角色名称 */
  name: string
  /** 属性数据 */
  attributes: Record<string, number>
  /** 技能数据（可选） */
  skills?: Record<string, number>
  /** 背景故事（可选） */
  background?: string
  /** 元数据（可选） */
  metadata?: Record<string, any>
}

/**
 * 创建角色结果接口
 */
export interface CreateCharacterResult {
  /** 是否成功 */
  success: boolean
  /** 创建的角色ID（成功时） */
  characterId?: number
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 战斗状态更新参数接口
 */
export interface CombatStateUpdates {
  /** 当前 HP */
  currentHp?: number
  /** 当前理智值（CoC7） */
  currentSanity?: number
  /** 临时伤害值 */
  temporaryWounds?: number
  /** 状态效果列表 */
  conditions?: string[]
}

/**
 * 角色状态接口
 *
 * @description
 * 定义角色的状态信息
 */
export interface CharacterStatus {
  /** 是否死亡 */
  isDead: boolean
  /** 是否昏迷 */
  isUnconscious: boolean
  /** 状态效果列表（如昏迷、恐惧等） */
  conditions: string[]
}

/**
 * 技能成长结果接口
 *
 * @description
 * 定义技能成长检定的结果
 */
export interface SkillAdvancementResult {
  /** 是否成功 */
  success: boolean
  /** 旧技能值 */
  oldValue?: number
  /** 新技能值 */
  newValue?: number
  /** 提升点数 */
  advancement?: number
  /** 错误消息（失败时） */
  error?: string
}

/**
 * 规则角色卡服务接口
 *
 * @description
 * 定义规则系统必须实现的角色卡服务方法。
 * 所有规则系统的角色服务都应该实现这个接口。
 *
 * @example
 * ```typescript
 * class CoC7CharacterService implements IRuleCharacterService {
 *   readonly ruleSystem = 'coc7'
 *
 *   async getCombatData(characterId: number): Promise<CharacterCombatData | null> {
 *     // 实现获取战斗数据逻辑
 *   }
 *
 *   async applyDamage(characterId: number, damage: number, reason: string): Promise<DamageResult> {
 *     // 实现伤害应用逻辑
 *   }
 * }
 * ```
 */
export interface IRuleCharacterService {
  /**
   * 规则系统标识
   */
  readonly ruleSystem: string

  /**
   * 获取角色战斗数据
   *
   * @description
   * 获取角色在战斗中需要使用的数据。
   * 包括属性、技能、状态等。
   *
   * @param characterId - 角色 ID
   * @returns 角色战斗数据，如果角色不存在则返回 null
   */
  getCombatData(characterId: number): Promise<CharacterCombatData | null>

  /**
   * 应用伤害
   *
   * @description
   * 对角色造成伤害，更新 HP 和战斗状态。
   * 根据规则处理意识丧失、死亡等状态。
   *
   * @param characterId - 角色 ID
   * @param damage - 伤害值
   * @param reason - 伤害原因
   * @returns 伤害结果
   */
  applyDamage(
    characterId: number,
    damage: number,
    reason: string
  ): Promise<DamageResult>

  /**
   * 获取技能值
   *
   * @description
   * 获取角色的指定技能值。
   * 支持中文名称和别名。
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称（可以是中文或英文）
   * @returns 技能值，如果技能不存在则返回 undefined
   */
  getSkillValue(
    characterId: number,
    skillName: string
  ): Promise<SkillValue | undefined>

  /**
   * 获取属性值
   *
   * @description
   * 获取角色的指定属性值。
   *
   * @param characterId - 角色 ID
   * @param attributeName - 属性名称（标准化）
   * @returns 属性值，如果属性不存在则返回 undefined
   */
  getAttributeValue(
    characterId: number,
    attributeName: string
  ): Promise<number | undefined>

  /**
   * 添加武器到物品栏
   *
   * @description
   * 将武器添加到角色的物品栏。
   * 验证武器合法性和权限。
   *
   * @param characterId - 角色 ID
   * @param userId - 用户 ID（用于权限验证）
   * @param weaponIdentifier - 武器标识（ID 或名称）
   * @returns 操作结果
   */
  addWeapon(
    characterId: number,
    userId: number,
    weaponIdentifier: string
  ): Promise<{success: boolean; error?: string}>

  /**
   * 创建角色
   *
   * @description
   * 创建符合规则系统的角色。
   * 验证属性、计算衍生属性、初始化默认技能。
   *
   * @param params - 创建角色参数
   * @returns 创建结果
   */
  createCharacter(params: CreateCharacterParams): Promise<CreateCharacterResult>

  /**
   * 更新角色战斗状态
   *
   * @description
   * 更新角色的战斗状态（HP、状态效果等）。
   * 持久化到 character.metadata。
   *
   * @param characterId - 角色 ID
   * @param updates - 要更新的字段
   */
  updateCombatState(
    characterId: number,
    updates: CombatStateUpdates
  ): Promise<void>

  /**
   * 格式化角色卡展示
   *
   * @description
   * 生成角色卡的格式化文本，用于显示。
   *
   * @param characterId - 角色 ID
   * @returns 格式化的角色卡文本
   */
  formatCharacterCard(characterId: number): Promise<string>

  // ========================================
  // 为战斗系统提供的接口
  // ========================================

  /**
   * 获取攻击技能值
   *
   * @description
   * 战斗系统调用此接口获取武器对应的技能值。
   *
   * @param characterId - 角色 ID
   * @param weaponName - 武器名称
   * @returns 技能值，如果武器不存在或角色未学习该技能则返回 undefined
   */
  getAttackSkill(
    characterId: number,
    weaponName: string
  ): Promise<number | undefined>

  /**
   * 获取防御技能值
   *
   * @description
   * 战斗系统调用此接口获取闪避/护甲等防御值。
   *
   * @param characterId - 角色 ID
   * @returns 防御技能值，如果技能不存在则返回 undefined
   */
  getDefenseSkill(characterId: number): Promise<number | undefined>

  /**
   * 应用战斗伤害
   *
   * @description
   * 战斗系统调用此接口应用伤害，自动处理伤害加值（DB）计算和状态判定。
   *
   * @param characterId - 角色 ID
   * @param baseDamage - 基础伤害值（不含 DB）
   * @param damageType - 伤害类型（可选）
   * @returns 伤害结果
   */
  applyCombatDamage(
    characterId: number,
    baseDamage: number,
    damageType?: string
  ): Promise<DamageResult>

  // ========================================
  // 为技能系统提供的接口
  // ========================================

  /**
   * 更新技能值
   *
   * @description
   * 技能系统调用此接口更新技能值。
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称
   * @param newValue - 新的技能值
   * @returns 操作结果
   */
  updateSkillValue(
    characterId: number,
    skillName: string,
    newValue: number
  ): Promise<{success: boolean; error?: string}>

  /**
   * 技能成长检定
   *
   * @description
   * 规则特定的技能成长机制（如 CoC7 的成长骰）。
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称
   * @returns 成长结果
   */
  advanceSkill(
    characterId: number,
    skillName: string
  ): Promise<SkillAdvancementResult>

  // ========================================
  // 为判定系统提供的接口
  // ========================================

  /**
   * 检查角色状态
   *
   * @description
   * 判定角色是否死亡、昏迷、恐惧等状态。
   *
   * @param characterId - 角色 ID
   * @returns 角色状态
   */
  checkCharacterStatus(characterId: number): Promise<CharacterStatus>

  /**
   * 更新属性值
   *
   * @description
   * 更新角色属性（临时或永久）。
   *
   * @param characterId - 角色 ID
   * @param attributeName - 属性名称
   * @param newValue - 新的属性值
   * @returns 操作结果
   */
  updateAttributeValue(
    characterId: number,
    attributeName: string,
    newValue: number
  ): Promise<{success: boolean; error?: string}>
}
