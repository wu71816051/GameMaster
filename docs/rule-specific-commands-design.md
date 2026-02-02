# 不同规则系统专属命令实现方案

## 文档信息

- **创建时间**: 2026-01-25
- **最后更新**: 2026-01-25
- **状态**: 设计阶段
- **优先级**: 高

---

## 问题概述

用户希望在不同规则系统(CoC7, D&D3R等)的会话中,能够使用该规则系统特定的专属命令,例如:
- CoC7: `.san`, `.对抗`, `.战技`
- D&D3R: `.先攻`, `.豁免`, `.法术`

---

## 当前架构状态

### 已实现功能 ✅

1. **会话级规则系统**
   - 创建会话时指定规则: `会话创建 "团名" coc7`
   - 会话的 `rule_system` 字段存储当前规则
   - 角色的 `rule_system` 字段绑定规则系统

2. **规则适配器系统**
   - `RuleSystemAdapter` 抽象基类
   - `RuleSystemRegistry` 注册表管理所有适配器
   - 已实现: GenericAdapter, CoC7Adapter
   - 规则系统验证和适配器获取

3. **通用命令系统**
   - `.check` - 通用技能检定(自动选择适配器)
   - `.r` - 骰子掷骰(规则无关)
   - `.char` - 角色管理(跨规则)

### 缺失的功能 ❌

**规则专属命令** - 当前未实现
- CoC7专属命令: `.san`, `.对抗`, `.战技`, `.奖励骰/惩罚骰`
- D&D3R专属命令: `.先攻`, `.豁免`, `.法术`
- 规则特定提示和帮助信息

---

## 实现方案 ⭐

### 核心思路

**基于会话的规则系统，使用规则前缀的命令注册 + 软注销机制**

### 关键决策：命令前缀策略 ⭐⭐⭐

**采用规则前缀避免命令冲突**

- 命令格式：`.<规则>.<命令名>`
- 示例：`.coc7.san`、`.dnd.先攻`
- 提供短别名：`.c7.san`
- 支持无前缀别名（仅在对应规则会话中有效）：`.san`

### 命令分类原则

| 类型 | 定义 | 示例 | 是否加前缀 |
|------|------|------|-----------|
| **通用命令** | 所有规则系统都使用 | `.r`, `.rh`, `.check`, `.char` | ❌ 无前缀 |
| **规则专属命令** | 仅某个规则系统特有 | `.san` (CoC7), `.先攻` (D&D) | ✅ 加规则前缀 |

### 命令通用性分析

#### `.ra`（成长骰/技能成长检定）

**结论**：CoC7 独有机制 → **应加 `.coc7.` 前缀**

| 规则系统 | 是否有成长骰 | 说明 |
|---------|-------------|------|
| CoC7 | ✅ 有 | 技能成功使用后可成长，掷骰 > 当前技能值则提升 |
| D&D 3.5/5E | ❌ 无 | 通过升级分配技能点，无需成长骰 |
| Pathfinder | ❌ 无 | 类似 D&D，升级分配技能点 |
| GURPS | ❌ 无 | 通过训练和经验提升 |
| FATE | ❌ 无 | 通过里程碑升级 |

#### `.rh`（暗骰/隐藏骰）

**结论**：所有规则通用 → **不加前缀**

| 规则系统 | 是否有暗骰 | 说明 |
|---------|-----------|------|
| CoC7 | ✅ 有 | KP 可以暗骰 |
| D&D | ✅ 有 | DM 可以暗骰（Secret Check） |
| Pathfinder | ✅ 有 | GM 可以暗骰 |
| GURPS | ✅ 有 | GM 可以暗骰 |
| FATE | ✅ 有 | GM 可以暗骰 |

### 最终命令分类表

| 命令 | 类型 | 分类 | 前缀 | 原因 |
|------|------|------|------|------|
| `.r` | 掷骰 | **通用** | ❌ 无 | 所有规则通用 |
| `.rh` | 暗骰 | **通用** | ❌ 无 | 所有规则通用 |
| `.check` | 技能检定 | **通用** | ❌ 无 | 所有规则通用 |
| `.char` | 角色管理 | **通用** | ❌ 无 | 所有规则通用 |
| **`.ra`** | **成长骰** | **CoC7 专属** | **✅ `.coc7.`** | **仅 CoC7 有此机制** |
| `.san` | 理智检定 | CoC7 专属 | ✅ `.coc7.` | 仅 CoC7 |
| `.对抗` | 对抗检定 | CoC7 专属 | ✅ `.coc7.` | 仅 CoC7 |
| `.奖励骰` | 奖励骰 | CoC7 专属 | ✅ `.coc7.` | 仅 CoC7 |
| `.惩罚骰` | 惩罚骰 | CoC7 专属 | ✅ `.coc7.` | 仅 CoC7 |
| `.先攻` | 先攻检定 | D&D 专属 | ✅ `.dnd.` | 仅 D&D |
| `.豁免` | 豁免检定 | D&D 专属 | ✅ `.dnd.` | 仅 D&D |
| `.法术` | 法术施放 | D&D 专属 | ✅ `.dnd.` | 仅 D&D |

### 规则前缀映射表

| 规则系统 | 完整前缀 | 短前缀 | 示例 |
|---------|---------|--------|------|
| CoC7 | `.coc7.` | `.c7.` | `.coc7.san`, `.c7.san` |
| D&D3R | `.dnd.` | `.dnd.` | `.dnd.先攻` |
| Generic | - | - | （无专属命令） |

### 三层别名策略

```typescript
// 1. 主命令：带完整规则前缀
ctx.command('.coc7.san')

// 2. 短别名：带短前缀
.alias('.c7.san')

// 3. 无前缀别名：仅在对应规则会话中有效
.alias('.san')

// 4. 中文别名
.alias('.理智检定')
```

### 软注销实现

**核心原理**：命令永久存在，通过运行时验证禁用

```typescript
ctx.command('.coc7.san')
  .alias('.c7.san')
  .alias('.san')
  .action(async ({ session }, args) => {
    const commandUsed = session.content.trim().split(' ')[0]
    const conversation = await getActiveConversation(session)

    // 判断使用的命令类型
    const hasRulePrefix = commandUsed.startsWith('.coc7.') ||
                          commandUsed.startsWith('.c7.')

    // 验证逻辑
    if (conversation.rule_system !== 'coc7') {
      if (hasRulePrefix) {
        // 带前缀：明确告知此命令不适用于当前规则
        return `❌ ${commandUsed} 仅适用于 CoC7 规则系统\n` +
               `💡 当前会话规则：${conversation.rule_system}\n` +
               `💡 D&D 规则请使用：.dnd.先攻`
      } else {
        // 无前缀：建议使用带前缀版本或切换会话
        return `❌ .san 仅适用于 CoC7 规则系统\n` +
               `💡 当前会话规则：${conversation.rule_system}\n` +
               `💡 请使用：.coc7.san 或 .c7.san`
      }
    }

    // 执行命令
    return executeSanCheck(args)
  })
```

### 技术手段

1. 为每个规则适配器添加 `registerCommands()` 方法
2. 为每个规则适配器添加 `getCommandPrefix()` 方法
3. 在会话激活/切换时调用对应规则的命令注册
4. 使用命令前缀避免冲突
5. 运行时验证实现软注销
6. 提供三层别名策略

### 架构设计

```
┌─────────────────────────────────────────────────┐
│  RuleSystemAdapter (基类扩展)                    │
│  + registerCommands(ctx, conversationId)         │  ← 注册命令
│  + getRuleCommands()                            │  ← 获取命令列表
│  + getCommandPrefix()                           │  ← 获取命令前缀 ⭐
│  + getShortPrefix()                             │  ← 获取短前缀 ⭐
├─────────────────────────────────────────────────┤
│  CoC7Adapter                                     │
│  + getCommandPrefix() → '.coc7.'                 │  ← CoC7 前缀 ⭐
│  + getShortPrefix() → '.c7.'                    │  ← CoC7 短前缀 ⭐
│  + registerCommands() → .coc7.san, .coc7.对抗   │  ← CoC7专属命令
│  DnD3RAdapter (未来)                             │
│  + getCommandPrefix() → '.dnd.'                 │  ← D&D 前缀 ⭐
│  + registerCommands() → .dnd.先攻, .dnd.豁免   │  ← D&D专属命令
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  命令前缀系统 ⭐                                   │
│  - 完整前缀: .coc7.san                           │
│  - 短前缀: .c7.san                               │
│  - 无前缀: .san (仅对应规则会话中)               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  CommandRegistry                                  │
│  + registerRuleCommands(ctx, ruleSystem)        │  ← 注册规则命令
│  + unregisterRuleCommands(ruleSystem)           │  ← 软注销命令
│  + getActiveRuleCommands(conversationId)         │  ← 获取当前命令
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  SessionMiddleware                                │
│  + validateRuleCommand(session, command)        │  ← 验证命令权限
│  + getConversationRule(session)                 │  ← 获取会话规则
└─────────────────────────────────────────────────┘
```

---

## 用户确认的实现方案

基于讨论确认，采用以下方案:
- ✅ **采用规则前缀避免冲突**: `.coc7.san`, `.dnd.先攻`
- ✅ **三层别名策略**: 完整前缀、短前缀、无前缀（对应规则会话中）
- ✅ **优先实现 CoC7 命令**: `.coc7.san`, `.coc7.ra`, `.coc7.对抗`, `.coc7.奖励骰/惩罚骰`
- ✅ **完整预留 D&D3R 接口**: 实现完整的命令框架
- ✅ **实现策略**: 完整架构 + 2-3 个核心命令

---

## 实现步骤

### 步骤1: 扩展 RuleSystemAdapter 基类 ⭐

**文件**: `src/rule/base/rule-system-adapter.ts`

**添加方法**:

```typescript
/**
 * 规则专属命令注册接口
 */
export interface RuleCommand {
  /** 命令名称（不含前缀） */
  name: string
  /** 命令别名（不含前缀） */
  aliases?: string[]
  /** 命令描述 */
  description: string
  /** 命令用法 */
  usage?: string
  /** 示例 */
  examples?: string[]
  /** 命令执行函数 */
  handler: (ctx: Context, session: Session, args: any) => Promise<string>
}

/**
 * 命令验证结果接口
 */
export interface CommandValidationResult {
  /** 是否通过验证 */
  valid: boolean
  /** 错误消息 */
  error?: string
  /** 会话ID */
  conversationId?: number
  /** 用户ID */
  userId?: number
  /** 角色数据 */
  character?: any
}

export abstract class RuleSystemAdapter {
  // ... 现有代码 ...

  /**
   * 获取命令前缀 ⭐
   *
   * @description
   * 返回该规则系统的命令前缀
   * 默认返回 `.<ruleSystem>.`
   * 子类可以覆盖此方法以自定义前缀
   *
   * @returns 命令前缀（包含点号）
   *
   * @example
   * CoC7Adapter → '.coc7.'
   * DnD3RAdapter → '.dnd.'
   */
  getCommandPrefix(): string {
    return `.${this.ruleSystem}.`
  }

  /**
   * 获取短前缀 ⭐
   *
   * @description
   * 提供更短的命令别名
   *
   * @returns 短前缀（包含点号）
   *
   * @example
   * CoC7Adapter → '.c7.'
   * DnD3RAdapter → '.dnd.'
   */
  getShortPrefix(): string {
    const shortMap: Record<string, string> = {
      'coc7': 'c7',
      'dnd3r': 'dnd',
      'generic': 'gen'
    }
    return `.${shortMap[this.ruleSystem] || this.ruleSystem}.`
  }

/**
 * 命令验证结果接口
 */
export interface CommandValidationResult {
  /** 是否通过验证 */
  valid: boolean
  /** 错误消息 */
  error?: string
  /** 会话ID */
  conversationId?: number
  /** 用户ID */
  userId?: number
  /** 角色数据 */
  character?: any
}

export abstract class RuleSystemAdapter {
  // ... 现有代码 ...

  /**
   * 注册该规则系统的专属命令
   *
   * @description
   * 子类实现此方法以注册规则特定的命令。
   *
   * @param ctx - Koishi 上下文
   * @param conversationId - 会话ID
   */
  abstract registerCommands(ctx: Context, conversationId: number): Promise<void>

  /**
   * 获取该规则系统的命令列表
   */
  abstract getRuleCommands(): RuleCommand[]

  /**
   * 验证会话内命令执行条件 ⭐
   *
   * @description
   * 会话内命令的双重验证:
   * 1. 用户必须在活跃会话中
   * 2. 用户必须在会话中有激活角色
   *
   * @param ctx - Koishi 上下文
   * @param session - Koishi 会话对象
   * @returns 验证结果
   */
  async validateInConversationCommand(
    ctx: Context,
    session: Session
  ): Promise<CommandValidationResult> {
    const { ConversationService } = await import('../core/services/conversation.service')
    const { CharacterService } = await import('../core/services/character.service')
    const { UserService } = await import('../core/services/user.service')

    const conversationService = new ConversationService(ctx)
    const characterService = new CharacterService(ctx)
    const userService = new UserService(ctx)

    // 1. 验证用户是否在活跃会话中
    const channelInfo = {
      platform: session.platform,
      guildId: session.guildId || '0',
      channelId: session.channelId || '0',
    }

    const conversation = await conversationService.getActiveConversation({
      channel: channelInfo,
    })

    if (!conversation) {
      return {
        valid: false,
        error: '❌ 当前频道没有活跃的会话\n' +
               '💡 请先使用 "会话创建" 或 "会话加入" 命令创建或加入一个会话'
      }
    }

    // 2. 获取用户ID
    const userId = await userService.getUserIdFromSession(session)

    // 3. 验证用户是否有激活角色
    const character = await characterService.getActiveCharacter(
      conversation.id!,
      userId
    )

    if (!character) {
      return {
        valid: false,
        error: '❌ 您在该会话中没有激活的角色\n' +
               '💡 请先使用 ".char create <角色名>" 创建角色，\n' +
               '    或使用 ".char set <角色名>" 激活已有角色'
      }
    }

    // 4. 验证角色规则系统是否与会话匹配
    if (character.rule_system !== conversation.rule_system) {
      return {
        valid: false,
        error: `❌ 角色规则(${character.rule_system})与会话规则(${conversation.rule_system})不一致\n` +
               `💡 请激活规则为 ${conversation.rule_system} 的角色`
      }
    }

    // 验证通过
    return {
      valid: true,
      conversationId: conversation.id,
      userId,
      character
    }
  }

  /**
   * 获取命令帮助信息
   */
  getCommandHelp(): string {
    const commands = this.getRuleCommands()
    let help = `📚 ${this.displayName} 规则专属命令:\n\n`

    for (const cmd of commands) {
      help += `• ${cmd.name}`
      if (cmd.aliases && cmd.aliases.length > 0) {
        help += ` (别名: ${cmd.aliases.join(', ')})`
      }
      help += `\n  ${cmd.description}\n\n`
    }

    return help
  }
}
```

**关键修改**:
- 添加 `RuleCommand` 接口定义命令结构
- 添加 `registerCommands()` 抽象方法(子类必须实现)
- 添加 `getRuleCommands()` 抽象方法(子类必须实现)
- 添加 `getCommandHelp()` 默认实现(生成帮助文本)

### 步骤2: 实现 CoC7 专属命令 ⭐

**文件**: `src/rule/coc7/coc7-commands.ts` (新建)

```typescript
import { Context, Session } from 'koishi'
import { CoC7Adapter } from './coc7-adapter'
import { RuleCommand } from '../base/rule-system-adapter'

export class CoC7Commands {
  private adapter: CoC7Adapter

  constructor(adapter: CoC7Adapter) {
    this.adapter = adapter
  }

  /**
   * 获取 CoC7 专属命令列表
   *
   * @description
   * 注意：命令名称不包含前缀，前缀由适配器添加
   */
  getCommands(): RuleCommand[] {
    return [
      {
        name: 'san',
        aliases: ['理智检定', 'sanity'],
        description: '理智检定 - 掷骰判定是否损失理智值',
        usage: '.coc7.san [当前SAN] [成功损失/失败损失]',
        examples: [
          '.coc7.san 50 0/1d6',
          '.c7.san 60 1/1d10',
          '.coc7.理智检定 50 0/1d6'
        ],
        handler: this.handleSanCheck.bind(this)
      },
      {
        name: 'ra',  // ⭐ CoC7 独有的成长骰
        aliases: ['成长骰', 'advancement'],
        description: '成长骰 - 技能成功使用后的成长检定',
        usage: '.coc7.ra <技能名> [当前技能值]',
        examples: [
          '.coc7.ra 侦查 60',
          '.c7.ra 斗殴',
          '.coc7.成长骰 侦查 60'
        ],
        handler: this.handleAdvancementRoll.bind(this)
      },
      {
        name: '对抗',
        aliases: ['opposed', '对战'],
        description: '对抗检定 - 两个技能值的对抗',
        usage: '.coc7.对抗 <技能1> <技能2>',
        examples: [
          '.coc7.对抗 斗殴 闪避',
          '.c7.对抗 侦查 侦察'
        ],
        handler: this.handleOpposedRoll.bind(this)
      },
      {
        name: '奖励骰',
        aliases: ['bonus', '奖励'],
        description: '奖励骰 - 在下次检定中添加奖励骰',
        usage: '.coc7.奖励骰 <数量>',
        examples: [
          '.coc7.奖励骰 2',
          '.c7.bonus 1'
        ],
        handler: this.handleBonusDice.bind(this)
      },
      {
        name: '惩罚骰',
        aliases: ['penalty', '惩罚'],
        description: '惩罚骰 - 在下次检定中添加惩罚骰',
        usage: '.coc7.惩罚骰 <数量>',
        examples: [
          '.coc7.惩罚骰 1',
          '.c7.penalty 2'
        ],
        handler: this.handlePenaltyDice.bind(this)
      }
    ]
  }

  /**
   * 理智检定命令 ⭐
   */
  private async handleSanCheck(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // ⭐ 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    // ⭐ 步骤2: 从验证结果中获取必要信息
    const { conversationId, userId, character } = validation

    // ⭐ 步骤3: 执行理智检定逻辑
    // ...

    return `🎲 理智检定 (${currentSan})\n...`
  }

  /**
   * 成长骰命令 ⭐ (CoC7 独有)
   *
   * 格式: .coc7.ra <技能名> [当前技能值]
   * 示例: .coc7.ra 侦查 60
   */
  private async handleAdvancementRoll(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // ⭐ 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    const { conversationId, userId, character } = validation

    // ⭐ 步骤2: 解析参数
    const parts = args.trim().split(/\s+/)

    if (parts.length === 0) {
      return '❌ 参数格式错误\n' +
             '📝 正确格式: .coc7.ra <技能名> [当前技能值]\n' +
             '💡 示例: .coc7.ra 侦查 60'
    }

    const skillName = parts[0]
    let currentSkillValue = character.skills?.[skillName]

    // 如果提供了技能值，使用提供的值
    if (parts.length >= 2) {
      currentSkillValue = parseInt(parts[1], 10)
    }

    if (!currentSkillValue) {
      return `❌ 角色 ${character.name} 没有技能: ${skillName}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // ⭐ 步骤3: 执行成长骰逻辑
    // 1. 掷骰 1d100
    const roll = Math.floor(Math.random() * 100) + 1

    // 2. 判定是否成长
    const hasAdvanced = roll > currentSkillValue

    let result = `📈 成长检定：${skillName} (${currentSkillValue})\n`
    result += `📊 掷骰: ${roll}/100\n`

    if (hasAdvanced) {
      // 3. 计算成长值 (1d10 或 5)
      const advancement = Math.floor(Math.random() * 10) + 1
      const newSkillValue = Math.min(
        currentSkillValue + advancement,
        100  // CoC7 技能上限
      )

      result += `✅ 成功！技能提升 ${advancement} 点\n`
      result += `📈 ${skillName}: ${currentSkillValue} → ${newSkillValue}\n`

      // TODO: 更新数据库中的技能值
      // await characterService.updateSkill(userId, conversationId, skillName, newSkillValue)
    } else {
      result += `❌ 失败！技能值未提升\n`
    }

    return result
  }

  /**
   * 理智检定命令 ⭐
   *
   * 格式: .san [当前SAN值] [成功损失/失败损失]
   * 示例: .san 50 0/1d6
   *
   * 验证流程:
   * 1. 检查用户是否在会话中
   * 2. 检查用户是否有激活角色
   * 3. 执行理智检定逻辑
   */
  private async handleSanCheck(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // ⭐ 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    // ⭐ 步骤2: 从验证结果中获取必要信息
    const { conversationId, userId, character } = validation

    // ⭐ 步骤3: 执行理智检定逻辑
    // 解析参数: [当前SAN] [成功损失/失败损失]
    const parts = args.trim().split(/\s+/)

    let currentSan: number
    let sanLoss: string

    if (parts.length === 0) {
      // 未提供参数,使用角色当前SAN值
      currentSan = character.attributes?.SAN || character.attributes?.san || 0
      sanLoss = '0/1d6' // 默认损失
    } else if (parts.length === 1) {
      // 只提供了SAN值
      currentSan = parseInt(parts[0], 10)
      sanLoss = '0/1d6'
    } else {
      // 提供了SAN值和损失骰
      currentSan = parseInt(parts[0], 10)
      sanLoss = parts[1]
    }

    if (isNaN(currentSan)) {
      return '❌ SAN值格式错误\n示例: .san 50 0/1d6'
    }

    // 执行理智检定
    // TODO: 实现完整的理智检定逻辑
    // 1. 掷骰 1d100
    // 2. 判定成功/失败
    // 3. 根据成功/失败计算损失
    // 4. 更新角色SAN值
    // 5. 记录到数据库

    return `🎲 理智检定 (${currentSan})\n` +
           `📊 掷骰: [骰出结果]/100\n` +
           `💡 损失: ${sanLoss}\n` +
           `📈 当前SAN: ${currentSan}`
  }

  /**
   * 对抗检定命令 ⭐
   *
   * 格式: .对抗 <技能1> <技能2>
   * 示例: .对抗 斗殴 闪避
   *
   * 验证流程:
   * 1. 检查用户是否在会话中
   * 2. 检查用户是否有激活角色
   * 3. 检查是否有第二个角色(可以是自己对抗自己,用于测试)
   * 4. 执行对抗检定逻辑
   */
  private async handleOpposedRoll(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // ⭐ 步骤1: 验证会话和角色
    const validation = await this.adapter.validateInConversationCommand(ctx, session)

    if (!validation.valid) {
      return validation.error
    }

    const { character: character1 } = validation

    // ⭐ 步骤2: 解析参数
    const parts = args.trim().split(/\s+/)

    if (parts.length < 2) {
      return '❌ 参数格式错误\n' +
             '📝 正确格式: .对抗 <技能1> <技能2>\n' +
             '💡 示例: .对抗 斗殴 闪避\n' +
             '💡 提示: 对抗检定需要两个技能值'
    }

    const skill1Name = parts[0]
    const skill2Name = parts[1]

    // ⭐ 步骤3: 获取技能值
    const skill1Value = character1.skills?.[skill1Name] ||
                        character1.skills?.[this.adapter.normalizeSkillName(skill1Name)]

    if (!skill1Value) {
      return `❌ 角色 ${character1.name} 没有技能: ${skill1Name}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // TODO: 支持两人对抗(需要第二个角色的标识)
    // 当前简化为: 技能1 vs 技能2 (都来自同一角色,用于测试)

    const skill2Value = character1.skills?.[skill2Name] ||
                        character1.skills?.[this.adapter.normalizeSkillName(skill2Name)]

    if (!skill2Value) {
      return `❌ 角色 ${character1.name} 没有技能: ${skill2Name}\n` +
             `💡 请使用 ".char show" 查看角色技能列表`
    }

    // ⭐ 步骤4: 执行对抗检定
    // TODO: 实现完整的对抗检定逻辑
    // 1. 为技能1掷骰 1d100
    // 2. 为技能2掷骰 1d100
    // 3. 计算各自的成功等级
    // 4. 比较成功等级,决定胜负
    // 5. 返回格式化结果

    return `⚔️ 对抗检定\n` +
           `${character1.name} (${skill1Name} ${skill1Value}): [骰出结果]\n` +
           `${character1.name} (${skill2Name} ${skill2Value}): [骰出结果]\n` +
           `🏆 [胜负结果]`
  }

  /**
   * 奖励骰命令
   *
   * 格式: .奖励骰 <数量>
   * 示例: .奖励骰 2
   */
  private async handleBonusDice(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // TODO: 实现奖励骰逻辑
    // 1. 解析奖励骰数量(1-2个)
    // 2. 在下次检定中应用
    // 3. 额外十位骰取较低值
    return '🚧 奖励骰命令开发中...'
  }

  /**
   * 惩罚骰命令
   *
   * 格式: .惩罚骰 <数量>
   * 示例: .惩罚骰 1
   */
  private async handlePenaltyDice(
    ctx: Context,
    session: Session,
    args: string
  ): Promise<string> {
    // TODO: 实现惩罚骰逻辑
    // 1. 解析惩罚骰数量(1-2个)
    // 2. 在下次检定中应用
    // 3. 额外十位骰取较高值
    return '🚧 惩罚骰命令开发中...'
  }
}
```

**修改 CoC7Adapter**:

**文件**: `src/rule/coc7/coc7-adapter.ts`

```typescript
import { CoC7Commands } from './coc7-commands'

export class CoC7Adapter extends RuleSystemAdapter {
  readonly ruleSystem = 'coc7'
  readonly displayName = '克苏鲁的呼唤 7版'

  private commands: CoC7Commands

  constructor() {
    super()
    this.commands = new CoC7Commands(this)
  }

  /**
   * 获取命令前缀 ⭐
   *
   * @description
   * 覆盖基类方法，返回 CoC7 专属前缀
   */
  getCommandPrefix(): string {
    return '.coc7.'
  }

  /**
   * 获取短前缀 ⭐
   *
   * @description
   * 返回 CoC7 的短前缀
   */
  getShortPrefix(): string {
    return '.c7.'
  }

  /**
   * 注册 CoC7 专属命令 ⭐
   *
   * @description
   * 使用命令前缀注册，避免与其他规则冲突
   */
  async registerCommands(ctx: Context, conversationId: number): Promise<void> {
    const prefix = this.getCommandPrefix()
    const shortPrefix = this.getShortPrefix()
    const ruleCommands = this.commands.getCommands()

    for (const cmd of ruleCommands) {
      // ⭐ 使用前缀注册命令
      const fullCommandName = prefix + cmd.name
      const shortCommandName = shortPrefix + cmd.name

      ctx.command(fullCommandName)
        .alias(shortCommandName)  // 添加短前缀别名
        .alias(...(cmd.aliases || []).map(a => prefix + a))  // 其他别名也加前缀
        .alias(cmd.name)  // 无前缀别名（软注销验证会处理）
        .action(async ({ session }, args) => {
          // ⭐ 软注销：运行时验证
          const validation = await this.validateInConversationCommand(ctx, session)

          if (!validation.valid) {
            return validation.error
          }

          // 验证会话规则
          const conversation = await this.getActiveConversation(session)
          if (conversation.rule_system !== 'coc7') {
            // 获取用户使用的命令名
            const commandUsed = session.content.trim().split(' ')[0]
            const hasRulePrefix = commandUsed.startsWith('.coc7.') ||
                                  commandUsed.startsWith('.c7.')

            if (hasRulePrefix) {
              // 带前缀：明确告知此命令不适用于当前规则
              return `❌ ${commandUsed} 仅适用于 CoC7 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 D&D 规则请使用：.dnd.先攻`
            } else {
              // 无前缀：建议使用带前缀版本或切换会话
              return `❌ ${cmd.name} 仅适用于 CoC7 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 请使用：${fullCommandName} 或 ${shortCommandName}`
            }
          }

          // 执行命令
          return cmd.handler(ctx, session, args)
        })

      ctx.logger.info(`[CoC7Adapter] 已注册命令: ${fullCommandName} (别名: ${shortCommandName})`)
    }
  }

  /**
   * 获取规则命令列表
   */
  getRuleCommands(): RuleCommand[] {
    return this.commands.getCommands()
  }
}
```

### 步骤3: 创建 DnD3RAdapter 预留接口 ⭐

**文件**: `src/rule/dnd3r/dnd3r-adapter.ts` (新建)

```typescript
import { Context } from 'koishi'
import { RuleSystemAdapter, RuleCommand } from '../base/rule-system-adapter'

export class DnD3RAdapter extends RuleSystemAdapter {
  readonly ruleSystem = 'dnd3r'
  readonly displayName = '龙与地下城 3.5版'
  readonly defaultDiceExpression = '1d20'

  /**
   * 获取命令前缀 ⭐
   *
   * @description
   * 返回 D&D3R 的命令前缀
   */
  getCommandPrefix(): string {
    return '.dnd.'
  }

  /**
   * 获取短前缀 ⭐
   *
   * @description
   * D&D3R 的短前缀与完整前缀相同
   */
  getShortPrefix(): string {
    return '.dnd.'
  }

  /**
   * 注册 D&D3R 专属命令 ⭐
   *
   * @description
   * 使用命令前缀注册
   */
  async registerCommands(ctx: Context, conversationId: number): Promise<void> {
    const prefix = this.getCommandPrefix()
    const ruleCommands = this.getRuleCommands()

    for (const cmd of ruleCommands) {
      // ⭐ 使用前缀注册命令
      const fullCommandName = prefix + cmd.name

      ctx.command(fullCommandName)
        .alias(...(cmd.aliases || []).map(a => prefix + a))  // 别名也加前缀
        .alias(cmd.name)  // 无前缀别名（软注销验证会处理）
        .action(async ({ session }, args) => {
          // ⭐ 软注销：运行时验证
          const validation = await this.validateInConversationCommand(ctx, session)

          if (!validation.valid) {
            return validation.error
          }

          // 验证会话规则
          const conversation = await this.getActiveConversation(session)
          if (conversation.rule_system !== 'dnd3r') {
            const commandUsed = session.content.trim().split(' ')[0]
            const hasRulePrefix = commandUsed.startsWith('.dnd.')

            if (hasRulePrefix) {
              return `❌ ${commandUsed} 仅适用于 D&D3R 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 CoC7 规则请使用：.coc7.san`
            } else {
              return `❌ ${cmd.name} 仅适用于 D&D3R 规则系统\n` +
                     `💡 当前会话规则：${conversation.rule_system}\n` +
                     `💡 请使用：${fullCommandName}`
            }
          }

          // 执行命令（或返回开发中提示）
          return cmd.handler(ctx, session, args)
        })

      ctx.logger.info(`[DnD3RAdapter] 已注册命令: ${fullCommandName}`)
    }
  }

  /**
   * 获取 D&D3R 规则命令列表
   */
  getRuleCommands(): RuleCommand[] {
    return [
      {
        name: '先攻',
        aliases: ['initiative'],
        description: '先攻检定 - 确定战斗行动顺序',
        usage: '.dnd.先攻',
        examples: ['.dnd.先攻'],
        handler: async (ctx, session, args) => '🚧 先攻命令开发中...'
      },
      {
        name: '豁免',
        aliases: ['save'],
        description: '豁免检定 - 抵抗有害效果',
        usage: '.dnd.豁免 <类型> [DC]',
        examples: ['.dnd.豁免 坚定 15', '.dnd.豁免 反射 12'],
        handler: async (ctx, session, args) => '🚧 豁免命令开发中...'
      },
      {
        name: '法术',
        aliases: ['spell'],
        description: '法术施放 - 施放法术',
        usage: '.dnd.法术 <法术名>',
        examples: ['.dnd.法术 火球术'],
        handler: async (ctx, session, args) => '🚧 法术命令开发中...'
      }
    ]
  }

  // 其他必需方法的占位实现
  createCharacter(params: any): any {
    // TODO: 实现 D&D3R 角色创建
    throw new Error('D&D3R 角色创建尚未实现')
  }

  checkSkill(params: any): any {
    // TODO: 实现 D&D3R 技能检定
    throw new Error('D&D3R 技能检定尚未实现')
  }

  // ... 其他方法
}
```

**注册到规则注册表**:

**文件**: `src/rule/rule-system-registry.ts`

```typescript
import { DnD3RAdapter } from './dnd3r/dnd3r-adapter'

export function getRuleSystemRegistry(): RuleSystemRegistry {
  const registry = RuleSystemRegistry.getInstance()

  // 注册 D&D3R 适配器(占位)
  if (!registry.hasSystem('dnd3r')) {
    registry.registerAdapter(new DnD3RAdapter())
  }

  return registry
}
```

### 步骤4: 创建命令注册管理器 ⭐

**文件**: `src/core/services/command-registry.service.ts` (新建)

```typescript
import { Context } from 'koishi'
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'

/**
 * 命令注册服务
 *
 * 负责管理不同规则系统的专属命令注册和注销
 */
export class CommandRegistryService {
  private ctx: Context
  private registeredConversations: Map<number, string> = new Map()

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 为会话注册规则系统的专属命令
   *
   * @param conversationId - 会话ID
   * @param ruleSystem - 规则系统标识
   */
  async registerConversationCommands(
    conversationId: number,
    ruleSystem: string
  ): Promise<void> {
    this.ctx.logger.info(`[CommandRegistry] 注册会话 ${conversationId} 的 ${ruleSystem} 命令`)

    // 如果会话已注册其他规则命令,先注销
    if (this.registeredConversations.has(conversationId)) {
      await this.unregisterConversationCommands(conversationId)
    }

    // 获取规则适配器
    const registry = getRuleSystemRegistry()
    const adapter = registry.getAdapter(ruleSystem)

    if (!adapter) {
      this.ctx.logger.warn(`[CommandRegistry] 未找到规则适配器: ${ruleSystem}`)
      return
    }

    // 注册规则命令
    await adapter.registerCommands(this.ctx, conversationId)

    // 记录注册状态
    this.registeredConversations.set(conversationId, ruleSystem)

    this.ctx.logger.info(`[CommandRegistry] ✅ 已为会话 ${conversationId} 注册 ${ruleSystem} 命令`)
  }

  /**
   * 注销会话的规则命令
   *
   * @param conversationId - 会话ID
   */
  async unregisterConversationCommands(conversationId: number): Promise<void> {
    const ruleSystem = this.registeredConversations.get(conversationId)

    if (ruleSystem) {
      // Koishi 不支持动态注销命令
      // 这里只能标记为已注销,下次检查时跳过
      this.registeredConversations.delete(conversationId)
      this.ctx.logger.info(`[CommandRegistry] 已注销会话 ${conversationId} 的命令`)
    }
  }

  /**
   * 获取会话当前注册的规则系统
   *
   * @param conversationId - 会话ID
   * @returns 规则系统标识
   */
  getConversationRule(conversationId: number): string | undefined {
    return this.registeredConversations.get(conversationId)
  }

  /**
   * 检查会话是否已注册命令
   *
   * @param conversationId - 会话ID
   * @param ruleSystem - 规则系统标识
   * @returns 是否已注册
   */
  isConversationRegistered(conversationId: number, ruleSystem: string): boolean {
    const registered = this.registeredConversations.get(conversationId)
    return registered === ruleSystem
  }
}

/**
 * 创建命令注册服务实例
 */
export function createCommandRegistryService(ctx: Context): CommandRegistryService {
  return new CommandRegistryService(ctx)
}
```

### 步骤5: 集成到会话管理 ⭐

**文件**: `src/core/services/conversation.service.ts`

**修改 `createConversation` 方法**:

```typescript
import { createCommandRegistryService } from './command-registry.service'

async createConversation(params: CreateConversationParams): Promise<CreateConversationResult> {
  // ... 现有代码 ...

  // 创建会话成功后,注册规则命令
  if (result.success && result.conversationId) {
    try {
      const commandRegistry = createCommandRegistryService(this.ctx)
      await commandRegistry.registerConversationCommands(
        result.conversationId,
        ruleSystem
      )
    } catch (error) {
      this.logger.warn('[ConversationService] 注册规则命令失败', error)
      // 不影响会话创建,只记录警告
    }
  }

  return result
}
```

**文件**: `src/core/commands/conversation.commands.ts`

**修改"会话加入"命令**:

```typescript
ctx.command('会话加入 <会话ID:posint>')
  .action(async ({ session }, conversationId) => {
    // ... 现有代码 ...

    if (result.success) {
      // 为该频道注册会话的规则命令
      try {
        const commandRegistry = createCommandRegistryService(ctx)
        const conversation = await conversationService.getById(conversationId)

        if (conversation && conversation.rule_system) {
          await commandRegistry.registerConversationCommands(
            conversationId,
            conversation.rule_system
          )
        }
      } catch (error) {
        logger.warn('[Command:会话加入] 注册规则命令失败', error)
        // 不影响加入,只记录警告
      }
    }

    return `✅ ${result.message}`
  })
```

### 步骤6: 添加规则命令帮助 ⭐

**文件**: `src/core/commands/help.commands.ts`

**扩展帮助命令**:

```typescript
import { getRuleSystemRegistry } from '../../rule/rule-system-registry'

// 在现有的帮助系统中添加规则命令帮助

ctx.command('规则命令')
  .alias('rule.help')
  .action(async ({ session }) => {
    // 获取当前会话的规则系统
    const channelInfo = {
      platform: session.platform,
      guildId: session.guildId || '0',
      channelId: session.channelId || '0',
    }

    const conversation = await conversationService.getActiveConversation({
      channel: channelInfo,
    })

    if (!conversation) {
      return '❌ 当前频道没有活跃的会话\n' +
             '💡 请先使用 "会话创建" 或 "会话加入" 命令'
    }

    // 获取规则适配器
    const registry = getRuleSystemRegistry()
    const adapter = registry.getAdapter(conversation.rule_system)

    if (!adapter) {
      return `❌ 未找到规则适配器: ${conversation.rule_system}`
    }

    // 返回规则专属命令帮助
    return adapter.getCommandHelp()
  })

// 添加到通用帮助中
ctx.command('帮助')
  .action(() => {
    return '📚 GameMaster 帮助\n\n' +
           '📋 通用命令:\n' +
           '  • 会话创建 <名称> [规则] - 创建会话\n' +
           '  • 会话加入 <ID> - 加入会话\n' +
           '  • .check <技能> - 技能检定\n' +
           '  • .r <表达式> - 掷骰\n' +
           '  • .char show - 显示角色\n\n' +
           '🎮 规则专属命令:\n' +
           '  • .规则命令 - 查看当前规则的专属命令\n\n' +
           '💡 输入 "帮助 <命令名>" 查看具体命令的详细帮助'
  })
```

---

## 会话内命令的双重验证机制 ⭐⭐⭐

### 为什么需要双重验证?

规则相关的命令(如 `.san`, `.对抗`)属于**会话内命令**,具有两个关键特征:

1. **会话依赖**: 命令必须在活跃的 TRPG 会话中执行
2. **角色依赖**: 命令必须由用户扮演的角色来执行

### 验证流程图

```
用户输入: .san 50 0/1d6
    ↓
┌─────────────────────────────────────┐
│  第一层验证: 会话检查                │
│  - 用户是否在活跃会话中?             │
│  - 当前频道是否有活跃会话?           │
└─────────────────────────────────────┘
    ↓ 未通过: "❌ 当前频道没有活跃的会话"
    ↓ 通过
┌─────────────────────────────────────┐
│  第二层验证: 角色检查                │
│  - 用户在该会话中是否有激活角色?     │
│  - 角色规则系统是否与会话匹配?       │
└─────────────────────────────────────┘
    ↓ 未通过: "❌ 您在该会话中没有激活的角色"
    ↓ 通过
┌─────────────────────────────────────┐
│  执行命令逻辑                         │
│  - 获取角色数据(技能、属性等)        │
│  - 执行规则特定的检定逻辑            │
│  - 返回格式化结果                    │
└─────────────────────────────────────┘
```

### 验证场景示例

#### 场景1: 用户不在会话中

```bash
# 用户A在一个没有活跃会话的频道
用户A: .san 50 0/1d6

Bot: ❌ 当前频道没有活跃的会话
     💡 请先使用 "会话创建" 或 "会话加入" 命令创建或加入一个会话
```

#### 场景2: 用户在会话中但没有角色

```bash
# 用户A在活跃会话中,但还没有创建角色
用户A: .san 50 0/1d6

Bot: ❌ 您在该会话中没有激活的角色
     💡 请先使用 ".char create <角色名>" 创建角色，
        或使用 ".char set <角色名>" 激活已有角色
```

#### 场景3: 角色规则与会话不匹配

```bash
# 用户A在 CoC7 会话中,但激活的是 Generic 规则角色
用户A: .san 50 0/1d6

Bot: ❌ 角色规则(generic)与会话规则(coc7)不一致
     💡 请激活规则为 coc7 的角色
```

#### 场景4: 所有验证通过 ✅

```bash
# 用户A在 CoC7 会话中,激活了 CoC7 角色
用户A: .san 50 0/1d6

Bot: 🎲 理智检定 (50)
     📊 掷骰: 35/100
     ✅ 成功！
     💡 损失: 0 点理智
     📈 当前SAN: 50
```

### 验证方法的实现

**位置**: `src/rule/base/rule-system-adapter.ts`

**方法名**: `validateInConversationCommand()`

**返回值**: `CommandValidationResult`

```typescript
interface CommandValidationResult {
  valid: boolean              // 是否通过验证
  error?: string              // 错误消息(未通过时)
  conversationId?: number     // 会话ID(通过时)
  userId?: number             // 用户ID(通过时)
  character?: any             // 角色数据(通过时)
}
```

### 使用验证方法的标准模式

每个规则专属命令都应遵循这个模式:

```typescript
private async handleSomeCommand(
  ctx: Context,
  session: Session,
  args: string
): Promise<string> {
  // ⭐ 步骤1: 验证会话和角色
  const validation = await this.adapter.validateInConversationCommand(ctx, session)

  if (!validation.valid) {
    return validation.error  // 返回友好的错误提示
  }

  // ⭐ 步骤2: 从验证结果中提取数据
  const { conversationId, userId, character } = validation

  // ⭐ 步骤3: 执行命令逻辑
  // 使用 character 的属性、技能等数据
  // ...

  // ⭐ 步骤4: 返回格式化结果
  return result
}
```

### 为什么这样设计?

#### 1. 统一验证逻辑
- 所有会话内命令使用相同的验证方法
- 避免重复代码
- 确保错误消息一致

#### 2. 用户体验友好
- 清晰的错误提示
- 指导用户如何解决问题
- 分步骤引导用户完成前置条件

#### 3. 数据完整性
- 确保命令执行时有所需的上下文
- 避免"命令执行了一半才发现缺数据"的情况
- 提前验证可以减少后续逻辑的复杂度

#### 4. 可维护性
- 验证逻辑集中在一处
- 未来修改验证规则只需改一个地方
- 便于测试和调试

---

## 关键文件清单

### 需要修改的文件 (5个)

1. **`src/rule/base/rule-system-adapter.ts`** ⭐
   - 添加 `RuleCommand` 接口
   - 添加 `registerCommands()` 抽象方法
   - 添加 `getRuleCommands()` 抽象方法
   - 添加 `getCommandHelp()` 方法

2. **`src/rule/coc7/coc7-adapter.ts`** ⭐
   - 实现 `registerCommands()` 方法
   - 实现 `getRuleCommands()` 方法
   - 集成 `CoC7Commands` 类

3. **`src/core/services/conversation.service.ts`** ⭐
   - 在 `createConversation()` 中调用命令注册

4. **`src/core/commands/conversation.commands.ts`** ⭐
   - 在"会话加入"命令中注册规则命令

5. **`src/core/commands/help.commands.ts`** ⭐
   - 添加 `.规则命令` 帮助命令
   - 更新通用帮助信息

### 需要新建的文件 (3个)

6. **`src/rule/coc7/coc7-commands.ts`** ⭐⭐⭐
   - 实现 CoC7 专属命令逻辑
   - `.san` 理智检定
   - `.对抗` 对抗检定
   - `.奖励骰/惩罚骰` 奖惩骰机制

7. **`src/core/services/command-registry.service.ts`** ⭐⭐⭐
   - `CommandRegistryService` 类
   - 管理会话规则命令注册状态
   - 处理规则切换时的命令更新

8. **`src/rule/dnd3r/dnd3r-adapter.ts`** ⭐
   - `DnD3RAdapter` 类(占位实现)
   - 预留 `.先攻`, `.豁免`, `.法术` 命令接口
   - 添加"未实现"提示

---

## 第一阶段实现内容 (本次实现)

### 核心架构 (100%)
1. ✅ 扩展 `RuleSystemAdapter` 基类
   - `registerCommands()` 抽象方法
   - `getRuleCommands()` 抽象方法
   - `getCommandHelp()` 帮助方法

2. ✅ 创建 `CommandRegistryService`
   - 会话规则命令管理
   - 动态注册/注销机制
   - 规则切换处理

3. ✅ 集成到会话管理
   - 创建会话时注册命令
   - 加入会话时注册命令
   - 切换会话时更新命令

### CoC7 专属命令 (3个核心命令)
4. ✅ `.san` 理智检定命令
   - 支持格式: `.san [当前SAN] [损失骰]`
   - 示例: `.san 50 0/1d6`
   - 功能: 执行理智检定,计算损失,返回结果

5. ✅ `.对抗` 对抗检定命令
   - 支持格式: `.对抗 <技能1> <技能2>`
   - 示例: `.对抗 斗殴 闪避`
   - 功能: 两人对抗检定,比较成功等级

6. ✅ `.奖励骰/惩罚骰` 命令
   - 支持格式: `.check 侦查 +奖励骰2`
   - 功能: 应用奖惩骰机制到检定

### D&D3R 接口预留 (框架)
7. ✅ 创建 `DnD3RAdapter` 类
   - 实现基础命令注册接口
   - 预留 `.先攻`, `.豁免` 等命令占位
   - 添加"未实现"提示

### 帮助系统
8. ✅ `.规则命令` 帮助
   - 显示当前规则的专属命令列表
   - 显示命令格式和示例

---

## 未来扩展 (后续阶段)

### 第二阶段 (1-2周后)
1. 完善剩余 CoC7 命令
   - `.战技` 战技检定完整实现
   - `.奖励骰` 独立命令
   - `.惩罚骰` 独立命令

2. D&D3R 命令实现
   - `.先攻` 先攻检定
   - `.豁免` 豁免检定
   - 完整实现 D&D3R 规则适配器

### 第三阶段 (长期)
3. 高级功能
   - 命令别名系统
   - 命令宏系统
   - 命令权限系统

---

## 使用示例

### CoC7 会话

```bash
# 创建 CoC7 会话
用户A: 会话创建 "恐怖之夜" coc7

# 自动激活 CoC7 专属命令

# 使用完整前缀命令
用户A: .coc7.san 50 0/1d6
Bot: 🎲 理智检定 (50)
     📊 掷骰: 35/100
     ✅ 成功！
     💡 损失: 0 点理智
     📈 当前SAN: 50

# 使用短前缀命令
用户A: .c7.对抗 斗殴 斗殴
Bot: ⚔️ 对抗检定
     调查员A (斗殴 60): 25 → 困难成功
     调查员B (斗殴 55): 45 → 普通成功
     🏆 调查员A 胜出！

# 使用无前缀命令（仅在 CoC7 会话中可用）
用户A: .san 50 0/1d6
Bot: 🎲 理智检定 (50)
     📊 掷骰: 35/100
     ✅ 成功！
     💡 损失: 0 点理智

# CoC7 独有的成长骰
用户A: .coc7.ra 侦查 60
Bot: 📈 成长检定：侦查 (60)
     📊 掷骰: 75/100
     ✅ 成功！技能提升 1d10 = 5 点
     📈 当前侦查：65

# 查看规则命令帮助
用户A: .规则命令
Bot: 📚 克苏鲁的呼唤 7版 规则专属命令:

     • .coc7.san (别名: .c7.san, .san, .理智检定)
       理智检定 - 掷骰判定是否损失理智值
       用法: .coc7.san [当前SAN] [成功损失/失败损失]

     • .coc7.ra (别名: .c7.ra, .ra, .成长骰)
       成长骰 - 技能成功使用后的成长检定
       用法: .coc7.ra <技能名> [当前技能值]

     • .coc7.对抗 (别名: .c7.对抗, .对抗, .opposed)
       对抗检定 - 两个技能值的对抗
       用法: .coc7.对抗 <技能1> <技能2>

     • .coc7.奖励骰 (别名: .c7.奖励骰, .奖励骰)
       奖励骰 - 在下次检定中添加奖励骰
       用法: .coc7.奖励骰 <数量>

     • .coc7.惩罚骰 (别名: .c7.惩罚骰, .惩罚骰)
       惩罚骰 - 在下次检定中添加惩罚骰
       用法: .coc7.惩罚骰 <数量>

💡 提示：
  - 使用完整前缀可避免命令冲突
  - 在本规则会话中可省略规则前缀
  - 使用 .help <命令名> 查看详细帮助
```

### D&D3R 会话

```bash
# 创建 D&D3R 会话
用户A: 会话创建 "地下城探险" dnd3r

# 自动激活 D&D3R 专属命令

# 使用 D&D3R 专属命令
用户A: .dnd.先攻
Bot: ⚔️ 先攻检定
     战士: 18 🎯
     法师: 12
     游荡者: 15
     📋 行动顺序: 战士 → 游荡者 → 法师

用户A: .dnd.豁免 坚定 15
Bot: 💪 坚定豁免 (DC 15)
     📊 掷骰: 16 + 2 = 18
     ✅ 成功！通过豁免检定

# 尝试使用 CoC7 命令（被软注销阻止）
用户A: .coc7.san 50 0/1d6
Bot: ❌ .coc7.san 仅适用于 CoC7 规则系统
     💡 当前会话规则：dnd3r
     💡 D&D 规则请使用：.dnd.先攻
```

### 跨规则会话示例

```bash
# ========== 用户参与两个不同规则的会话 ==========

# CoC7 会话（频道 A）
用户A（频道 A）: 会话创建 "恐怖之夜" coc7
用户A（频道 A）: .san 50 0/1d6  # ✅ 可用（无前缀）
Bot: 🎲 理智检定 (50) ...

# D&D 会话（频道 B）
用户A（频道 B）: 会话创建 "地下城探险" dnd3r
用户A（频道 B）: .dnd.先攻  # ✅ 可用
Bot: ⚔️ 先攻检定 ...

# 在 D&D 会话尝试 CoC7 命令
用户A（频道 B）: .san 50 0/1d6  # ❌ 不可用（会话不匹配）
Bot: ❌ .san 仅适用于 CoC7 规则系统
     💡 当前会话规则：dnd3r
     💡 请使用：.coc7.san 或 .c7.san

# 在 D&D 会话使用带前缀的 CoC7 命令
用户A（频道 B）: .coc7.san 50 0/1d6  # ❌ 仍然被软注销阻止
Bot: ❌ .coc7.san 仅适用于 CoC7 规则系统
     💡 当前会话规则：dnd3r
     💡 D&D 规则请使用：.dnd.先攻
```

### 通用命令示例

```bash
# ========== 通用命令（所有规则都可用）==========

# 掷骰命令
用户A: .r 1d100
Bot: 🎲 掷骰: 42

# 暗骰命令（所有规则通用）
用户A: .rh 侦查 70
Bot: 🕵️ 暗骰：侦查 (70) - 结果仅KP可见

# 技能检定（通用，自动适配规则）
用户A: .check 侦查
Bot: 🔍 侦查检定: 35/70 → 成功！

# 角色管理
用户A: .char show
Bot: 📜 角色: 调查员A
  ...
```

---

## 验证计划

### 测试场景

1. **会话创建测试**
   ```
   1. 创建 CoC7 会话
   2. 验证 CoC7 专属命令可用
   3. 测试 .san, .对抗 等命令
   4. 验证命令帮助正确显示
   ```

2. **会话切换测试**
   ```
   1. 当前在 CoC7 会话
   2. 加入 Generic 会话
   3. 验证 CoC7 命令不可用
   4. 验证通用命令仍然可用
   ```

3. **错误处理测试**
   ```
   1. 在 Generic 会话使用 .san 命令
   2. 验证返回友好的错误提示
   3. 在无会话时使用规则命令
   4. 验证提示先创建/加入会话
   ```

4. **多会话测试**
   ```
   1. 用户同时参与多个不同规则的会话
   2. 在不同频道切换
   3. 验证命令始终使用当前频道会话的规则
   ```

### 预期结果

- ✅ CoC7 会话可使用 `.coc7.san`, `.c7.ra`, `.coc7.对抗` 等命令
- ✅ D&D 会话可使用 `.dnd.先攻`, `.dnd.豁免` 等命令
- ✅ 通用命令（`.r`, `.rh`, `.check`, `.char`）在所有会话中可用
- ✅ 切换会话时命令自动切换（通过软注销）
- ✅ 命令前缀避免冲突
- ✅ 错误使用命令时有友好提示
- ✅ `.规则命令` 显示当前规则的专属命令帮助
- ✅ **会话内命令自动验证会话和角色状态** ⭐

---

## 优势分析

### 1. 规则隔离
- 每个规则的专属命令独立实现
- 避免命令冲突和命名混乱
- 用户体验更清晰

### 2. 动态注册
- 会话切换时自动更新可用命令
- 无需重启插件
- 支持运行时添加新规则

### 3. 可扩展性
- 添加新规则只需实现适配器接口
- 不影响现有规则命令
- 符合开闭原则

### 4. 用户友好
- 专属命令更符合规则术语
- 帮助信息针对当前规则
- 错误提示更精确

---

## 技术难点与解决方案

### 难点1: Koishi 不支持动态注销命令

**问题描述**: Koishi 框架不支持运行时注销已注册的命令

**解决方案**:
- 命令处理函数中验证会话规则系统
- 如果不匹配,返回友好错误提示
- 维护一个内存注册表用于追踪

### 难点2: 命令参数解析

**问题描述**: 不同规则的命令参数格式差异较大

**解决方案**:
- 每个命令处理器独立解析参数
- 使用统一的错误处理机制
- 提供详细的帮助信息

### 难点3: 会话上下文获取

**问题描述**: 命令执行时需要获取当前会话信息

**解决方案**:
- 通过 session 对象获取频道信息
- 查询 conversation_channel 表获取会话
- 缓存活跃会话信息提高性能

---

## 总结

本方案通过**规则适配器命令注册 + 命令前缀 + 软注销**机制，实现了在不同规则系统会话中使用专属命令的功能:

✅ **核心机制**: 每个规则适配器实现 `registerCommands()` 方法
✅ **命令前缀**: 使用 `.<规则>.<命令>` 格式避免冲突（如 `.coc7.san`, `.dnd.先攻`）
✅ **三层别名**: 完整前缀、短前缀、无前缀（对应规则会话中）
✅ **软注销**: 命令永久存在，通过运行时验证禁用
✅ **动态管理**: 会话切换时自动验证和切换
✅ **规则隔离**: 不同规则的命令完全隔离，避免冲突
✅ **可扩展**: 添加新规则只需实现接口
✅ **命令分类**:
  - 通用命令（`.r`, `.rh`, `.check`, `.char`）- 无前缀
  - CoC7 专属命令（`.coc7.san`, `.coc7.ra`, `.coc7.对抗`）- 加 `.coc7.` 前缀
  - D&D 专属命令（`.dnd.先攻`, `.dnd.豁免`）- 加 `.dnd.` 前缀

实现后，用户在 CoC7 会话中可以使用 `.coc7.san`、`.coc7.ra`（成长骰）、`.coc7.对抗` 等专属命令，在 D&D3R 会话中使用 `.dnd.先攻`、`.dnd.豁免` 等专属命令，大大提升游戏体验的沉浸感和便利性。

---

## 相关文档

- [CoC7 实现状态分析](./coc7-implementation-status.md)
- [TRPG 游戏机制设计](./trpg-mechanics-design.md)
- [规则系统架构](../src/rule/base/rule-system-adapter.ts)

---

**文档维护**: GameMaster 开发团队
**最后更新**: 2026-01-25
