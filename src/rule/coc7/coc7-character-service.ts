/**
 * CoC7 角色卡服务实现
 *
 * @description
 * 实现 CoC7 规则系统的角色卡服务。
 * 提供角色创建、战斗数据获取、伤害处理等功能。
 *
 * @module rule/coc7/coc7-character-service
 */

import { Context } from 'koishi'
import { Character } from '../../core/models/character'
import { CharacterService } from '../../core/services/character.service'
import {
  IRuleCharacterService,
  CharacterCombatData,
  DamageResult,
  SkillValue,
  CreateCharacterParams,
  CreateCharacterResult,
  CombatStateUpdates,
  CharacterStatus,
  SkillAdvancementResult,
} from '../../core/interfaces/rule-character-service.interface'
import { CoC7Adapter } from './coc7-adapter'
import { getWeapon } from './data/weapons'
import { DamageCalculator } from './combat/damage-calculator'

/**
 * CoC7 角色战斗数据接口
 *
 * @description
 * 扩展通用战斗数据接口，添加 CoC7 特定字段
 */
export interface CoC7CharacterCombatData extends CharacterCombatData {
  // CoC7 特有属性
  /** 力量 */
  strength: number
  /** 体型 */
  size: number
  /** 意志（POW） */
  power: number
  /** 教育 */
  education: number

  // CoC7 战斗技能
  /** 格斗技能 */
  fightingSkill?: number
  /** 斗殴技能 */
  brawlingSkill?: number
  /** 手枪技能 */
  handgunSkill?: number
  /** 步枪技能 */
  rifleSkill?: number
  /** 霰弹枪技能 */
  shotgunSkill?: number

  // CoC7 状态
  /** 伤害加值表达式 */
  damageBonus: string
  /** 体格 */
  build: number

  // 装备
  /** 武器列表 */
  weapons: Array<{
    id: string
    name: string
  }>
}

/**
 * CoC7 角色卡服务实现类
 *
 * @description
 * 实现 IRuleCharacterService 接口，提供 CoC7 规则系统的角色卡管理功能。
 *
 * @example
 * ```typescript
 * const service = new CoC7CharacterService(ctx)
 * const combatData = await service.getCombatData(characterId)
 * const result = await service.applyDamage(characterId, 5, '匕首')
 * ```
 */
export class CoC7CharacterService implements IRuleCharacterService {
  readonly ruleSystem = 'coc7'

  private ctx: Context
  private globalService: CharacterService
  private adapter: CoC7Adapter
  private damageCalculator: DamageCalculator

  constructor(ctx: Context) {
    this.ctx = ctx
    this.globalService = new CharacterService(ctx)
    this.adapter = new CoC7Adapter()
    this.damageCalculator = new DamageCalculator()
  }

  // ========== 实现接口方法 ==========

  /**
   * 获取角色战斗数据
   *
   * @description
   * 从角色卡数据中提取战斗所需的所有信息，包括属性、技能、装备等。
   *
   * @param characterId - 角色 ID
   * @returns CoC7 角色战斗数据，如果角色不存在则返回 null
   */
  async getCombatData(characterId: number): Promise<CoC7CharacterCombatData | null> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character || character.rule_system !== 'coc7') {
        return null
      }

      // 解析物品栏中的武器
      const weapons = this.parseWeapons(character.inventory)

      // 计算最高战斗技能
      const fighting = character.skills?.fighting || 0
      const brawling = character.skills?.brawling || 0
      const handgun = character.skills?.handgun || 0
      const rifle = character.skills?.rifle || 0
      const shotgun = character.skills?.shotgun || 0
      const combatSkill = Math.max(fighting, brawling, handgun)

      return {
        characterId: character.id!,
        characterName: character.name,
        userId: character.user_id,

        // 属性
        dexterity: character.attributes?.dex || 50,
        strength: character.attributes?.str || 50,
        constitution: character.attributes?.con || 50,
        size: character.attributes?.siz || 50,
        power: character.attributes?.pow || 50,
        education: character.attributes?.edu || 50,
        intelligence: character.attributes?.int || 50,
        appearance: character.attributes?.app || 50,

        // 战斗状态
        currentHp: character.metadata?.combat?.currentHp || character.attributes?.hp || 10,
        maxHp: character.attributes?.hp || 10,

        // 战斗技能
        combatSkill,
        fightingSkill: fighting || undefined,
        brawlingSkill: brawling || undefined,
        handgunSkill: handgun || undefined,
        rifleSkill: rifle || undefined,
        shotgunSkill: shotgun || undefined,
        dodgeSkill: character.skills?.dodge,

        // CoC7 特有
        damageBonus: character.attributes?.damageBonus || '0',
        build: character.attributes?.build || 0,

        // 装备
        weapons,
      }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 获取战斗数据失败', error)
      return null
    }
  }

  /**
   * 应用伤害
   *
   * @description
   * 对角色造成伤害，更新 HP 和战斗状态。
   * CoC7 规则：
   * - HP ≤ 0: 意识丧失
   * - HP ≤ -maxHp/2: 死亡
   *
   * @param characterId - 角色 ID
   * @param damage - 伤害值
   * @param reason - 伤害原因
   * @returns 伤害结果
   */
  async applyDamage(
    characterId: number,
    damage: number,
    reason: string
  ): Promise<DamageResult> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        throw new Error(`角色不存在: ${characterId}`)
      }

      const maxHp = character.attributes?.hp || 10
      const combatState = character.metadata?.combat || {}
      const currentHp = combatState.currentHp || maxHp

      const newHp = Math.max(0, currentHp - damage)

      // 使用适配器判定状态（规则特定逻辑）
      const statusResult = this.adapter.checkDamageStatus(newHp, maxHp)

      // 更新战斗状态
      await this.updateCombatState(characterId, {
        currentHp: newHp,
        conditions: statusResult.conditions,
      })

      this.ctx.logger.info('[CoC7CharacterService] 应用伤害', {
        characterId,
        damage,
        reason,
        oldHp: currentHp,
        newHp,
        isUnconscious: statusResult.isUnconscious,
        isDead: statusResult.isDead,
      })

      return {
        oldHp: currentHp,
        newHp,
        damage,
        isUnconscious: statusResult.isUnconscious,
        isDead: statusResult.isDead,
      }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 应用伤害失败', error)
      throw error
    }
  }

  /**
   * 获取技能值
   *
   * @description
   * 获取角色的指定技能值。
   * 支持中文名称和别名，会自动规范化为标准名称。
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称（可以是中文或英文）
   * @returns 技能值，如果技能不存在则返回 undefined
   */
  async getSkillValue(
    characterId: number,
    skillName: string
  ): Promise<SkillValue | undefined> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character || character.rule_system !== 'coc7') {
        return undefined
      }

      // 规范化技能名称
      const normalizedName = this.adapter.normalizeSkillName(skillName)

      // 获取技能值
      const value = character.skills?.[normalizedName]

      if (value === undefined) {
        return undefined
      }

      return {
        name: normalizedName,
        displayName: skillName, // 保持原始输入名称用于显示
        value,
      }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 获取技能值失败', error)
      return undefined
    }
  }

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
  async getAttributeValue(
    characterId: number,
    attributeName: string
  ): Promise<number | undefined> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character || character.rule_system !== 'coc7') {
        return undefined
      }

      return character.attributes?.[attributeName]
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 获取属性值失败', error)
      return undefined
    }
  }

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
  async addWeapon(
    characterId: number,
    userId: number,
    weaponIdentifier: string
  ): Promise<{success: boolean; error?: string}> {
    try {
      // 验证角色所有权
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        return { success: false, error: '角色不存在' }
      }

      if (character.user_id !== userId) {
        return { success: false, error: '无权修改此角色' }
      }

      if (character.rule_system !== 'coc7') {
        return { success: false, error: `角色规则系统不是 CoC7` }
      }

      // 查找武器
      const weapon = getWeapon(weaponIdentifier)

      if (!weapon) {
        return {
          success: false,
          error: `未找到武器: ${weaponIdentifier}\n💡 常见武器: 匕首, 军刀, 左轮手枪, 霰弹枪`,
        }
      }

      // 添加到物品栏
      const currentInventory = character.inventory || {}
      const currentWeapons = currentInventory.weapons || []

      // 检查是否已存在
      const exists = currentWeapons.some((w: any) => w.id === weapon.name)

      if (exists) {
        return { success: false, error: `角色已拥有此武器` }
      }

      await this.globalService.updateCharacter({
        characterId,
        userId,
        updates: {
          inventory: {
            ...currentInventory,
            weapons: [
              ...currentWeapons,
              { id: weapon.name, name: weapon.name },
            ],
          },
        },
      })

      this.ctx.logger.info('[CoC7CharacterService] 添加武器成功', {
        characterId,
        weapon: weapon.name,
      })

      return { success: true }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 添加武器失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加武器失败',
      }
    }
  }

  /**
   * 创建角色
   *
   * @description
   * 创建符合 CoC7 规则系统的角色。
   * 验证属性、计算衍生属性、初始化默认技能。
   *
   * @param params - 创建角色参数
   * @returns 创建结果
   */
  async createCharacter(params: CreateCharacterParams): Promise<CreateCharacterResult> {
    try {
      // 1. 验证 CoC7 必需属性
      const requiredAttrs = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu']
      const missingAttrs = requiredAttrs.filter(attr => !(attr in params.attributes))

      if (missingAttrs.length > 0) {
        return {
          success: false,
          error: `缺少必需属性: ${missingAttrs.join(', ')}\n提示: CoC7 需要提供 8 个核心属性`,
        }
      }

      // 2. 使用适配器计算衍生属性
      const adapterResult = this.adapter.createCharacter({
        name: params.name,
        attributes: params.attributes,
        skills: params.skills,
        background: params.background,
        metadata: params.metadata,
      })

      if (!adapterResult.success) {
        return {
          success: false,
          error: adapterResult.error || '角色创建失败',
        }
      }

      // 3. 调用全局服务创建角色
      const result = await this.globalService.createCharacter({
        conversationId: params.conversationId,
        userId: params.userId,
        name: params.name,
        ruleSystem: 'coc7',
        attributes: adapterResult.attributes,
        skills: adapterResult.skills,
        metadata: adapterResult.metadata,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || '角色创建失败',
        }
      }

      this.ctx.logger.info('[CoC7CharacterService] 角色创建成功', {
        characterId: result.characterId,
        name: params.name,
      })

      return {
        success: true,
        characterId: result.characterId,
      }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 角色创建失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '角色创建失败',
      }
    }
  }

  /**
   * 更新角色战斗状态
   *
   * @description
   * 更新角色的战斗状态（HP、Sanity、状态效果等）。
   * 持久化到 character.metadata.combat。
   *
   * @param characterId - 角色 ID
   * @param updates - 要更新的字段
   */
  async updateCombatState(
    characterId: number,
    updates: CombatStateUpdates
  ): Promise<void> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        this.ctx.logger.warn('[CoC7CharacterService] 角色不存在', { characterId })
        return
      }

      const currentCombatState = character.metadata?.combat || {
        currentHp: character.attributes?.hp || 10,
        maxHp: character.attributes?.hp || 10,
        currentSanity: character.attributes?.san || character.attributes?.pow || 0,
        maxSanity: character.attributes?.san || character.attributes?.pow || 0,
        temporaryWounds: 0,
        conditions: [],
      }

      const newCombatState = {
        ...currentCombatState,
        ...updates,
      }

      await this.globalService.updateCharacter({
        characterId,
        userId: character.user_id,
        updates: {
          metadata: {
            ...character.metadata,
            combat: newCombatState,
          },
        },
      })

      this.ctx.logger.debug('[CoC7CharacterService] 战斗状态已更新', {
        characterId,
        updates,
      })
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 更新战斗状态失败', error)
      throw error
    }
  }

  /**
   * 格式化角色卡展示
   *
   * @description
   * 生成角色卡的格式化文本，用于显示。
   *
   * @param characterId - 角色 ID
   * @returns 格式化的角色卡文本
   */
  async formatCharacterCard(characterId: number): Promise<string> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character || character.rule_system !== 'coc7') {
        return '❌ 角色不存在或不是 CoC7 角色'
      }

      const combatState = character.metadata?.combat || {}
      const attrs = character.attributes || {}
      const skills = character.skills || {}

      let output = `📖 **${character.name}**\n\n`

      // 属性
      output += `📊 **属性**\n`
      output += `力量 STR: ${attrs.str || 0} | 体质 CON: ${attrs.con || 0} | 体型 SIZ: ${attrs.siz || 0} | 敏捷 DEX: ${attrs.dex || 0}\n`
      output += `外貌 APP: ${attrs.app || 0} | 智力 INT: ${attrs.int || 0} | 意志 POW: ${attrs.pow || 0} | 教育 EDU: ${attrs.edu || 0}\n\n`

      // 衍生属性
      output += `💓 **状态**\n`
      output += `耐久 HP: ${combatState.currentHp || attrs.hp || 0}/${attrs.hp || 0}\n`
      output += `理智 SAN: ${combatState.currentSanity || attrs.san || 0}/${attrs.san || 0}\n`
      output += `幸运 LUCK: ${attrs.luck || 0}\n`
      output += `移动力 MOV: ${attrs.move || 0}\n`
      output += `伤害加值 DB: ${attrs.damageBonus || '0'}\n`
      output += `体格 BUILD: ${attrs.build || 0}\n\n`

      // 战斗技能
      output += `⚔️ **战斗技能**\n`
      if (skills.fighting) output += `格斗: ${skills.fighting}\n`
      if (skills.brawling) output += `斗殴: ${skills.brawling}\n`
      if (skills.dodge) output += `闪避: ${skills.dodge}\n`
      if (skills.handgun) output += `手枪: ${skills.handgun}\n`
      if (skills.rifle) output += `步枪: ${skills.rifle}\n`
      output += `\n`

      // 装备
      if (character.inventory?.weapons?.length > 0) {
        output += `🎒 **装备**\n`
        character.inventory.weapons.forEach((weapon: any) => {
          output += `- ${weapon.name}\n`
        })
      }

      return output
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 格式化角色卡失败', error)
      return '❌ 格式化角色卡时发生错误'
    }
  }

  // ========== CoC7 特有方法 ==========

  /**
   * 计算伤害加值 (DB)
   *
   * @description
   * CoC7 特定的 DB 计算逻辑（委托给适配器）
   *
   * @param characterId - 角色 ID
   * @returns DB 表达式（如 "+1d4"）
   */
  async calculateDamageBonus(characterId: number): Promise<string> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        return '0'
      }

      const str = character.attributes?.str || 0
      const siz = character.attributes?.siz || 0

      // 委托给适配器计算（纯规则逻辑）
      return this.adapter.calculateDamageBonus(str, siz)
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 计算 DB 失败', error)
      return '0'
    }
  }

  // ========================================
  // 新增：为战斗系统提供的接口
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
  async getAttackSkill(
    characterId: number,
    weaponName: string
  ): Promise<number | undefined> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character || character.rule_system !== 'coc7') {
        return undefined
      }

      // 获取武器数据
      const weapon = getWeapon(weaponName)
      if (!weapon) {
        return undefined
      }

      // 使用适配器规范化技能名称
      const normalizedName = this.adapter.normalizeSkillName(weapon.skill)

      // 返回技能值
      return character.skills?.[normalizedName]
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 获取攻击技能失败', error)
      return undefined
    }
  }

  /**
   * 获取防御技能值
   *
   * @description
   * 战斗系统调用此接口获取闪避等防御值。
   *
   * @param characterId - 角色 ID
   * @returns 防御技能值，如果技能不存在则返回 undefined
   */
  async getDefenseSkill(characterId: number): Promise<number | undefined> {
    try {
      const skillResult = await this.getSkillValue(characterId, '闪避')
      return skillResult?.value
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 获取防御技能失败', error)
      return undefined
    }
  }

  /**
   * 应用战斗伤害
   *
   * @description
   * 战斗系统调用此接口应用伤害，自动处理伤害加值（DB）计算和状态判定。
   *
   * @param characterId - 角色 ID
   * @param baseDamage - 基础伤害值（不含 DB）
   * @param _damageType - 伤害类型（预留参数，CoC7 当前未区分伤害类型）
   * @returns 伤害结果
   */
  async applyCombatDamage(
    characterId: number,
    baseDamage: number,
    _damageType?: string
  ): Promise<DamageResult> {
    try {
      // 1. 计算伤害加值
      const dbExpression = await this.calculateDamageBonus(characterId)
      const db = this.damageCalculator.rollDB(dbExpression)

      // 2. 计算总伤害
      const totalDamage = baseDamage + db

      // 3. 应用伤害（调用规则特定的业务方法）
      return await this.applyDamage(characterId, totalDamage, '战斗伤害')
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 应用战斗伤害失败', error)
      throw error
    }
  }

  // ========================================
  // 新增：为技能系统提供的接口
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
  async updateSkillValue(
    characterId: number,
    skillName: string,
    newValue: number
  ): Promise<{success: boolean; error?: string}> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        return { success: false, error: '角色不存在' }
      }

      if (character.user_id === undefined) {
        return { success: false, error: '角色用户 ID 不存在' }
      }

      // 使用适配器规范化技能名称
      const normalizedName = this.adapter.normalizeSkillName(skillName)

      // 更新技能
      const currentSkills = character.skills || {}
      const updatedSkills = { ...currentSkills, [normalizedName]: newValue }

      await this.globalService.updateCharacter({
        characterId,
        userId: character.user_id,
        updates: { skills: updatedSkills },
      })

      this.ctx.logger.info('[CoC7CharacterService] 更新技能成功', {
        characterId,
        skillName: normalizedName,
        newValue,
      })

      return { success: true }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 更新技能失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新技能失败',
      }
    }
  }

  /**
   * 技能成长检定
   *
   * @description
   * 规则特定的技能成长机制（CoC7 成长骰）。
   *
   * @param characterId - 角色 ID
   * @param skillName - 技能名称
   * @returns 成长结果
   */
  async advanceSkill(
    characterId: number,
    skillName: string
  ): Promise<SkillAdvancementResult> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        return { success: false, error: '角色不存在' }
      }

      // 使用适配器规范化技能名称
      const normalizedName = this.adapter.normalizeSkillName(skillName)
      const currentSkillValue = character.skills?.[normalizedName]

      if (!currentSkillValue || typeof currentSkillValue !== 'number') {
        return {
          success: false,
          error: `角色未学习技能: ${skillName}`,
        }
      }

      // CoC7 成长骰逻辑
      // 1. 掷骰 1d100
      const roll = Math.floor(Math.random() * 100) + 1

      // 2. 判定是否成长（掷骰值 > 技能值）
      const hasAdvanced = roll > currentSkillValue

      if (!hasAdvanced) {
        return {
          success: true,
          oldValue: currentSkillValue,
          newValue: currentSkillValue,
        }
      }

      // 3. 计算成长值 (1d10 或 5，取较大值)
      const advancementRoll = Math.floor(Math.random() * 10) + 1
      const advancement = Math.max(advancementRoll, 5)
      const newSkillValue = Math.min(
        currentSkillValue + advancement,
        100  // CoC7 技能上限
      )

      // 4. 更新技能值
      const updateResult = await this.updateSkillValue(
        characterId,
        normalizedName,
        newSkillValue
      )

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || '更新技能值失败',
        }
      }

      this.ctx.logger.info('[CoC7CharacterService] 技能成长成功', {
        characterId,
        skillName: normalizedName,
        oldValue: currentSkillValue,
        newValue: newSkillValue,
        advancement,
      })

      return {
        success: true,
        oldValue: currentSkillValue,
        newValue: newSkillValue,
        advancement,
      }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 技能成长失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '技能成长失败',
      }
    }
  }

  // ========================================
  // 新增：为判定系统提供的接口
  // ========================================

  /**
   * 检查角色状态
   *
   * @description
   * 判定角色是否死亡、昏迷等状态。
   *
   * @param characterId - 角色 ID
   * @returns 角色状态
   */
  async checkCharacterStatus(characterId: number): Promise<CharacterStatus> {
    try {
      const combatData = await this.getCombatData(characterId)

      if (!combatData) {
        return {
          isDead: false,
          isUnconscious: false,
          conditions: [],
        }
      }

      // 使用适配器判定状态
      const statusResult = this.adapter.checkDamageStatus(
        combatData.currentHp,
        combatData.maxHp
      )

      return statusResult
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 检查角色状态失败', error)
      return {
        isDead: false,
        isUnconscious: false,
        conditions: [],
      }
    }
  }

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
  async updateAttributeValue(
    characterId: number,
    attributeName: string,
    newValue: number
  ): Promise<{success: boolean; error?: string}> {
    try {
      const character = await this.globalService.getCharacterById(characterId)

      if (!character) {
        return { success: false, error: '角色不存在' }
      }

      if (character.user_id === undefined) {
        return { success: false, error: '角色用户 ID 不存在' }
      }

      // 更新属性
      const currentAttributes = character.attributes || {}
      const updatedAttributes = { ...currentAttributes, [attributeName]: newValue }

      await this.globalService.updateCharacter({
        characterId,
        userId: character.user_id,
        updates: { attributes: updatedAttributes },
      })

      this.ctx.logger.info('[CoC7CharacterService] 更新属性成功', {
        characterId,
        attributeName,
        newValue,
      })

      return { success: true }
    } catch (error) {
      this.ctx.logger.error('[CoC7CharacterService] 更新属性失败', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新属性失败',
      }
    }
  }

  /**
   * 从物品栏解析武器列表
   *
   * @param inventory - 物品栏数据
   * @returns 武器列表
   */
  private parseWeapons(inventory: any): Array<{id: string; name: string}> {
    if (!inventory?.weapons) {
      return []
    }

    return inventory.weapons.map((weaponData: any) => ({
      id: weaponData.id,
      name: weaponData.name,
    }))
  }
}
