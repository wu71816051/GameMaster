# 角色卡系统分层架构设计

## 📋 概述

本文档阐述角色卡系统的分层架构设计，明确全局角色卡系统与规则角色卡系统的职责边界。

**核心原则**：
- **全局服务** (core) - 提供数据持久化和通用接口
- **规则服务接口** (core) - 定义规则角色卡服务的标准接口
- **规则服务实现** (rule) - 各规则系统实现具体接口

## 🏗️ 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                      战斗/游戏层                              │
│  - 战斗命令                                                 │
│  - 技能检定                                                 │
│  - 游戏逻辑                                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│          规则服务实现层 (Rule Implementations)               │
│  - CoC7CharacterServiceImpl                                  │
│  - DND3RCharacterServiceImpl                                │
│                                                             │
│  职责：                                                      │
│  ✅ 实现规则特定的业务逻辑                                    │
│  ✅ 规则验证（属性范围、技能规则）                            │
│  ✅ 衍生属性计算（HP、MP、DB等）                              │
│  ✅ 战斗状态管理                                             │
│  ✅ 规则特定的格式化输出                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│            规则适配器层 (Rule Adapter)                       │
│  - CoC7Adapter                                              │
│  - DND3RAdapter                                             │
│                                                             │
│  职责：                                                      │
│  ✅ 实现规则系统接口                                         │
│  ✅ 规则特定的算法实现                                       │
│  ✅ 规则数据转换                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              全局角色卡服务层 (Global Service)               │
│  - CharacterService (已实现)                                │
│                                                             │
│  职责：                                                      │
│  ✅ 数据库 CRUD 操作                                         │
│  ✅ 角色与会话的关联管理                                     │
│  ✅ 激活角色切换                                             │
│  ✅ 权限验证（角色所有权）                                    │
│  ✅ 规则系统一致性检查                                        │
│  ✅ 通用角色查询（按用户、会话、激活状态）                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│          规则角色卡服务接口层 (Rule Service Interface)       │
│  - IRuleCharacterService (接口定义)                          │
│                                                             │
│  职责：                                                      │
│  ✅ 定义规则服务必须实现的方法                                │
│  ✅ 提供类型安全的接口                                        │
│  ✅ 统一不同规则系统的行为                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              数据持久化层 (Database)                         │
│  - character 表                                             │
│  - conversation_character 表                                │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 职责划分

### 1. 规则角色卡服务接口 (IRuleCharacterService)

**文件**: `src/core/interfaces/rule-character-service.interface.ts`

**职责**：
- ✅ 定义规则服务必须实现的标准方法
- ✅ 提供类型安全的 TypeScript 接口
- ✅ 统一不同规则系统的行为契约

```typescript
/**
 * 角色战斗数据接口
 *
 * @description
 * 通用的战斗数据结构，各规则系统可以扩展
 */
export interface CharacterCombatData {
  characterId: number
  characterName: string
  userId: number

  // 基础属性
  dexterity: number       // 敏捷（用于战斗轮排序）
  strength?: number       // 力量
  constitution?: number   // 体质
  size?: number           // 体型

  // 战斗状态
  currentHp: number
  maxHp: number

  // 技能（通用）
  combatSkill?: number    // 主要战斗技能值
  dodgeSkill?: number     // 闪避技能
}

/**
 * 伤害结果接口
 */
export interface DamageResult {
  oldHp: number
  newHp: number
  damage: number
  isUnconscious: boolean
  isDead: boolean
}

/**
 * 技能值接口
 */
export interface SkillValue {
  name: string           // 技能名称（标准化）
  displayName: string    // 显示名称
  value: number          // 技能值
}

/**
 * 规则角色卡服务接口
 *
 * @description
 * 定义规则系统必须实现的角色卡服务方法。
 * 所有规则系统的角色服务都应该实现这个接口。
 *
 * @module core/interfaces/rule-character-service
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
  createCharacter(params: {
    conversationId?: number
    userId: number
    name: string
    attributes: Record<string, number>
    skills?: Record<string, number>
  }): Promise<{success: boolean; characterId?: number; error?: string}>

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
    updates: Partial<{
      currentHp: number
      currentSanity: number
      temporaryWounds: number
      conditions: string[]
    }>
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
}
```

### 2. CoC7 角色服务实现

**文件**: `src/rule/coc7/coc7-character-service.ts`

```typescript
import { Context } from 'koishi'
import { Character } from '../../core/models/character'
import { CharacterService } from '../../core/services/character.service'
import {
  IRuleCharacterService,
  CharacterCombatData,
  DamageResult,
  SkillValue,
} from '../../core/interfaces/rule-character-service.interface'
import { CoC7Adapter } from './coc7-adapter'
import { getWeapon } from './data/weapons'

/**
 * CoC7 角色战斗数据接口
 *
 * @description
 * 扩展通用战斗数据接口，添加 CoC7 特定字段
 */
export interface CoC7CharacterCombatData extends CharacterCombatData {
  // CoC7 特有属性
  strength: number
  size: number
  power: number
  education: number

  // CoC7 战斗技能
  fightingSkill?: number
  brawlingSkill?: number
  handgunSkill?: number
  rifleSkill?: number
  shotgunSkill?: number

  // CoC7 状态
  damageBonus: string      // 伤害加值表达式
  build: number            // 体格

  // 装备
  weapons: Array<{
    id: string
    name: string
  }>
}

/**
 * CoC7 角色卡服务实现
 *
 * @description
 * 实现 CoC7 规则系统的角色卡服务。
 * 提供角色创建、战斗数据获取、伤害处理等功能。
 *
 * @module rule/coc7/coc7-character-service
 */
export class CoC7CharacterService implements IRuleCharacterService {
  readonly ruleSystem = 'coc7'

  private ctx: Context
  private globalService: CharacterService
  private adapter: CoC7Adapter

  constructor(ctx: Context) {
    this.ctx = ctx
    this.globalService = new CharacterService(ctx)
    this.adapter = new CoC7Adapter()
  }

  // ========== 实现接口方法 ==========

  /**
   * 获取角色战斗数据
   */
  async getCombatData(characterId: number): Promise<CoC7CharacterCombatData | null> {
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

      // 战斗状态
      currentHp: character.metadata?.combat?.currentHp || character.attributes?.hp || 10,
      maxHp: character.attributes?.hp || 10,

      // 战斗技能
      combatSkill,
      fightingSkill: fighting || undefined,
      brawlingSkill: brawling || undefined,
      handgunSkill: handgun || undefined,
      rifleSkill: character.skills?.rifle,
      shotgunSkill: character.skills?.shotgun,
      dodgeSkill: character.skills?.dodge,

      // CoC7 特有
      damageBonus: character.attributes?.damageBonus || '0',
      build: character.attributes?.build || 0,

      // 装备
      weapons,
    }
  }

  /**
   * 应用伤害
   */
  async applyDamage(
    characterId: number,
    damage: number,
    reason: string
  ): Promise<DamageResult> {
    const character = await this.globalService.getCharacterById(characterId)

    if (!character) {
      throw new Error(`角色不存在: ${characterId}`)
    }

    const maxHp = character.attributes?.hp || 10
    const combatState = character.metadata?.combat || {}
    const currentHp = combatState.currentHp || maxHp

    const newHp = Math.max(0, currentHp - damage)

    // CoC7 规则：HP ≤ 0 意识丧失，HP ≤ -maxHp/2 死亡
    const isUnconscious = newHp <= 0
    const isDead = newHp <= -Math.floor(maxHp / 2)

    // 更新战斗状态
    await this.updateCombatState(characterId, {
      currentHp: newHp,
    })

    this.ctx.logger.info('[CoC7CharacterService] 应用伤害', {
      characterId,
      damage,
      reason,
      oldHp: currentHp,
      newHp,
      isUnconscious,
      isDead,
    })

    return {
      oldHp: currentHp,
      newHp,
      damage,
      isUnconscious,
      isDead,
    }
  }

  /**
   * 获取技能值
   */
  async getSkillValue(
    characterId: number,
    skillName: string
  ): Promise<SkillValue | undefined> {
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
  }

  /**
   * 获取属性值
   */
  async getAttributeValue(
    characterId: number,
    attributeName: string
  ): Promise<number | undefined> {
    const character = await this.globalService.getCharacterById(characterId)

    if (!character || character.rule_system !== 'coc7') {
      return undefined
    }

    return character.attributes?.[attributeName]
  }

  /**
   * 添加武器到物品栏
   */
  async addWeapon(
    characterId: number,
    userId: number,
    weaponIdentifier: string
  ): Promise<{success: boolean; error?: string}> {
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
  }

  /**
   * 创建角色
   */
  async createCharacter(params: {
    conversationId?: number
    userId: number
    name: string
    attributes: Record<string, number>
    skills?: Record<string, number>
  }): Promise<{success: boolean; characterId?: number; error?: string}> {
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
  }

  /**
   * 更新角色战斗状态
   */
  async updateCombatState(
    characterId: number,
    updates: Partial<{
      currentHp: number
      currentSanity: number
      temporaryWounds: number
      conditions: string[]
    }>
  ): Promise<void> {
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
  }

  /**
   * 格式化角色卡展示
   */
  async formatCharacterCard(characterId: number): Promise<string> {
    const character = await this.globalService.getCharacterById(characterId)

    if (!character || character.rule_system !== 'coc7') {
      return '❌ 角色不存在或不是 CoC7 角色'
    }

    let output = `📖 **${character.name}**\n\n`

    // 属性
    output += `📊 **属性**\n`
    const attrs = character.attributes || {}
    output += `力量 STR: ${attrs.str || 0} | 体质 CON: ${attrs.con || 0} | 体型 SIZ: ${attrs.siz || 0} | 敏捷 DEX: ${attrs.dex || 0}\n`
    output += `外貌 APP: ${attrs.app || 0} | 智力 INT: ${attrs.int || 0} | 意志 POW: ${attrs.pow || 0} | 教育 EDU: ${attrs.edu || 0}\n\n`

    // 衍生属性
    output += `💓 **状态**\n`
    output += `耐久 HP: ${attrs.hp || 0}/${attrs.hp || 0}\n`
    output += `理智 SAN: ${attrs.san || 0}/${attrs.san || 0}\n`
    output += `幸运 LUCK: ${attrs.luck || 0}\n`
    output += `移动力 MOV: ${attrs.move || 0}\n`
    output += `伤害加值 DB: ${attrs.damageBonus || '0'}\n`
    output += `体格 BUILD: ${attrs.build || 0}\n\n`

    // 战斗技能
    output += `⚔️ **战斗技能**\n`
    const skills = character.skills || {}
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
  }

  // ========== CoC7 特有方法 ==========

  /**
   * 计算伤害加值 (DB)
   *
   * @description
   * CoC7 特定的 DB 计算逻辑
   */
  calculateDamageBonus(characterId: number): string {
    const character = await this.globalService.getCharacterById(characterId)

    if (!character) {
      return '0'
    }

    const str = character.attributes?.str || 0
    const siz = character.attributes?.siz || 0
    const sumStrSiz = str + siz

    // CoC7 DB 表
    if (sumStrSiz >= 165) return '+1d6'
    if (sumStrSiz >= 125) return '+1d4'
    if (sumStrSiz >= 85) return '0'
    if (sumStrSiz >= 65) return '-1'
    if (sumStrSiz >= 45) return '-1d4'
    if (sumStrSiz >= 25) return '-1d6'
    return '-2d6'
  }

  /**
   * 从物品栏解析武器列表
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
```

### 3. 战斗命令使用规则服务

**文件**: `src/rule/coc7/combat/combat-commands.ts`

```typescript
import { Context, Session } from 'koishi'
import { CoC7CharacterService } from '../coc7-character-service'
import { CharacterService } from '../../../core/services/character.service'
import { ConversationService } from '../../../core/services/conversation.service'
import { getWeapon } from '../data/weapons'
import { DamageCalculator } from './damage-calculator'

export class CombatCommands {
  private ctx: Context
  private characterService: CoC7CharacterService  // ✅ 使用规则服务
  private globalService: CharacterService          // ✅ 需要全局服务获取会话

  constructor(ctx: Context) {
    this.ctx = ctx
    this.characterService = new CoC7CharacterService(ctx)
    this.globalService = new CharacterService(ctx)
  }

  /**
   * 获取会话服务
   */
  private getConversationService(): ConversationService {
    return new ConversationService(this.ctx)
  }

  /**
   * 攻击命令
   */
  async handleAttack(session: Session, args: string): Promise<string> {
    try {
      const parts = args.trim().split(/\s+/)
      if (parts.length === 0 || !parts[0]) {
        return '❌ 请指定武器\n💡 格式: .攻击 <武器> [目标]'
      }

      const weaponName = parts[0]
      const target = parts[1] || '目标'

      // ✅ 获取角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色\n💡 请先创建或激活角色'
      }

      // ✅ 获取武器数据
      const weapon = getWeapon(weaponName)
      if (!weapon) {
        return `❌ 未找到武器: ${weaponName}\n💡 常见武器: 匕首, 军刀, 左轮手枪, 霰弹枪`
      }

      // ✅ 从规则服务获取技能值
      const skillResult = await this.characterService.getSkillValue(
        character.id!,
        weapon.skill
      )

      if (!skillResult) {
        return `❌ 角色未学习技能: ${weapon.skill}\n💡 请先使用 .skill set ${weapon.skill} <值> 设置技能`
      }

      const skillValue = skillResult.value

      // 执行技能检定
      const roll = Math.floor(Math.random() * 100) + 1

      // 计算成功等级
      let successLevel = 0
      let successLevelName = '失败'
      if (roll <= 5) {
        successLevel = 5
        successLevelName = '💎 大成功'
      } else if (roll <= Math.floor(skillValue / 5)) {
        successLevel = 4
        successLevelName = '✨ 极难成功'
      } else if (roll <= Math.floor(skillValue / 2)) {
        successLevel = 3
        successLevelName = '👍 困难成功'
      } else if (roll <= skillValue) {
        successLevel = 2
        successLevelName = '✅ 普通成功'
      } else if (roll === 100 || (skillValue < 50 && roll >= 96)) {
        successLevelName = '💀 大失败'
      }

      // ✅ 计算伤害
      let damageText = ''
      if (successLevel >= 2) {
        const calculator = new DamageCalculator()
        const str = await this.characterService.getAttributeValue(character.id!, 'str')
        const siz = await this.characterService.getAttributeValue(character.id!, 'siz')

        const dbExpression = calculator.calculateDB(str || 50, siz || 50)
        const db = calculator.rollDB(dbExpression)

        const damageResult = calculator.calculateDamage(weapon, db, successLevel)
        damageText = `\n${calculator.formatDamageResult(damageResult)}`
      }

      return `⚔️ ${character.name} 使用 ${weapon.name} 攻击 ${target}\n\n` +
             `🎲 掷骰: ${roll}\n` +
             `📊 技能: ${weapon.skill} (${skillValue})\n` +
             `✅ 结果: ${successLevelName}${damageText}`
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:攻击] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 伤害命令
   */
  async handleDamage(session: Session, args: string): Promise<string> {
    try {
      const parts = args.trim().split(/\s+/)
      if (parts.length === 0 || !parts[0]) {
        return '❌ 请指定伤害数值\n💡 格式: .伤害 <数值> [原因]'
      }

      const damage = parseInt(parts[0])
      const reason = parts.slice(1).join(' ') || '伤害'

      if (isNaN(damage)) {
        return `❌ 无效的伤害数值: ${parts[0]}`
      }

      // ✅ 获取角色
      const character = await this.getActiveCharacter(session)

      if (!character) {
        return '❌ 未找到激活角色'
      }

      // ✅ 使用规则服务应用伤害
      const result = await this.characterService.applyDamage(
        character.id!,
        damage,
        reason
      )

      let output = `💔 ${character.name} 受到 ${damage} 点 ${reason}\n\n`
      output += `❤️ HP: ${result.oldHp} → ${result.newHp}`

      if (result.isUnconscious) {
        output += '\n\n⚠️ 警告：角色已失去意识！'
      }

      if (result.isDead) {
        output += '\n\n💀 角色已死亡！'
      }

      return output
    } catch (error) {
      this.ctx.logger.error('[CombatCommand:伤害] 执行失败', error)
      return '❌ 执行命令时发生错误'
    }
  }

  /**
   * 获取激活角色
   */
  private async getActiveCharacter(session: Session) {
    const conversationService = this.getConversationService()
    const conversation = await conversationService.getActiveConversation({
      channel: {
        platform: session.platform,
        guildId: session.guildId || '0',
        channelId: session.channelId || '0',
      },
    })

    if (!conversation) {
      return null
    }

    return await this.globalService.getActiveCharacter(
      conversation.id!,
      parseInt(session.userId) || 0
    )
  }
}
```

## 📁 文件组织

```
src/
├── core/
│   ├── interfaces/
│   │   └── rule-character-service.interface.ts  ✨ 新增 - 规则服务接口定义
│   │
│   └── services/
│       ├── character.service.ts                 # 全局角色卡服务
│       └── conversation.service.ts              # 全局会话服务
│
└── rule/
    ├── coc7/
    │   ├── coc7-adapter.ts                      # CoC7 适配器
    │   ├── coc7-character-service.ts            ✨ 新增 - CoC7 角色服务实现
    │   ├── coc7-commands.ts                     # CoC7 命令
    │   └── combat/
    │       ├── combat-manager.ts
    │       └── combat-commands.ts               # 使用 CoC7CharacterService
    │
    └── dnd3r/
        ├── dnd3r-adapter.ts                     # DND3R 适配器
        ├── dnd3r-character-service.ts           ✨ 未来 - DND3R 角色服务实现
        └── dnd3r-commands.ts                    # 使用 DND3RCharacterService
```

## 🎯 实现清单

### 第一阶段：定义接口（1天）

- [ ] 创建 `src/core/interfaces/rule-character-service.interface.ts`
  - [ ] 定义 `IRuleCharacterService` 接口
  - [ ] 定义 `CharacterCombatData` 接口
  - [ ] 定义 `DamageResult` 接口
  - [ ] 定义 `SkillValue` 接口

### 第二阶段：实现 CoC7 服务（2天）

- [ ] 创建 `src/rule/coc7/coc7-character-service.ts`
  - [ ] 实现 `IRuleCharacterService` 接口
  - [ ] 实现 `createCharacter()` 方法
  - [ ] 实现 `getCombatData()` 方法
  - [ ] 实现 `applyDamage()` 方法
  - [ ] 实现 `getSkillValue()` 方法
  - [ ] 实现 `addWeapon()` 方法
  - [ ] 实现 CoC7 特有方法（calculateDB 等）

### 第三阶段：重构战斗命令（1天）

- [ ] 修改 `CombatCommands` 使用 `CoC7CharacterService`
  - [ ] 重构 `handleAttack()` 方法
  - [ ] 重构 `handleDamage()` 方法
  - [ ] 重构 `handleCombatStart()` 方法
  - [ ] 移除命令中的规则逻辑

### 第四阶段：测试验证（1天）

- [ ] 单元测试
- [ ] 集成测试
- [ ] 用户测试

## 📚 参考资料

- [规则服务接口](../src/core/interfaces/rule-character-service.interface.ts)
- [全局角色服务](../src/core/services/character.service.ts)
- [CoC7 适配器](../src/rule/coc7/coc7-adapter.ts)
- [CoC7 角色服务实现](../src/rule/coc7/coc7-character-service.ts)
- [战斗命令](../src/rule/coc7/combat/combat-commands.ts)
