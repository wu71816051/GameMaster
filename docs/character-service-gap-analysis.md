# 角色卡服务架构 - 设计与实现差距分析

**文档创建日期**: 2026-01-25
**最后更新**: 2026-01-25

## 📋 概述

本文档分析了角色卡服务分层架构的设计目标与当前代码实现之间的差距，明确了哪些部分已实现、哪些部分待实现。

## 🎯 架构设计目标

基于 [角色卡系统分层架构设计](./character-card-architecture.md)，理想的架构如下：

```
┌─────────────────────────────────────────────────────────────┐
│                      战斗/游戏层                              │
│  - 战斗命令                                                 │
│  - 技能检定命令                                              │
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
│              数据持久化层 (Database)                         │
│  - character 表                                             │
│  - conversation_character 表                                │
└─────────────────────────────────────────────────────────────┘
```

## 📊 当前实现状态

### 1. 数据持久化层 ✅ 100% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| character 表 | `src/core/models/character.ts` | ✅ 已实现 | 数据库表结构 |
| conversation_character 表 | `src/core/models/conversation-character.ts` | ✅ 已实现 | 角色与会话关联 |
| 数据库迁移 | `src/index.ts` | ✅ 已实现 | 表创建和索引 |

### 2. 全局角色卡服务层 ✅ 100% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| CharacterService | `src/core/services/character.service.ts` | ✅ 已实现 | 1300+ 行完整实现 |
| createCharacter() | character.service.ts:122-337 | ✅ 已实现 | 角色创建、验证、持久化 |
| getActiveCharacter() | character.service.ts:346-368 | ✅ 已实现 | 获取激活角色 |
| setActiveCharacter() | character.service.ts:380-477 | ✅ 已实现 | 设置激活角色，验证规则一致性 |
| getCharactersByUser() | character.service.ts:486-513 | ✅ 已实现 | 获取用户的角色列表 |
| getCharacterById() | character.service.ts:521-532 | ✅ 已实现 | 根据 ID 获取角色 |
| updateCharacter() | character.service.ts:543-582 | ✅ 已实现 | 更新角色数据 |
| deleteCharacter() | character.service.ts:591-627 | ✅ 已实现 | 删除角色 |
| addCharacterToConversation() | character.service.ts:805-857 | ✅ 已实现 | 添加角色到会话 |
| getSkillValue() | character.service.ts:636-649 | ✅ 已实现 | 获取角色技能值 |
| exportCharacter() | character.service.ts:658-697 | ✅ 已实现 | 导出角色为 JSON |
| importCharacter() | character.service.ts:707-745 | ✅ 已实现 | 从 JSON 导入角色 |

### 3. 规则角色卡服务接口层 ❌ 0% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| IRuleCharacterService | `src/core/interfaces/rule-character-service.interface.ts` | ❌ 未实现 | 仅存在于设计文档 |
| CharacterCombatData | - | ❌ 未实现 | 接口定义 |
| DamageResult | - | ❌ 未实现 | 接口定义 |
| SkillValue | - | ❌ 未实现 | 接口定义 |

**差距分析**：
- ❌ 没有定义统一的服务接口
- ❌ 没有类型契约约束规则服务实现
- ❌ 无法保证不同规则系统的一致性行为

### 4. 规则适配器层 ⚠️ 部分完成

#### CoC7 适配器 ✅ 90% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| CoC7Adapter | `src/rule/coc7/coc7-adapter.ts` | ✅ 已实现 | 完整的适配器实现 |
| createCharacter() | coc7-adapter.ts:70-128 | ✅ 已实现 | 验证属性、计算衍生属性 |
| checkSkill() | coc7-adapter.ts:204-349 | ✅ 已实现 | 技能检定、成功等级判定 |
| normalizeSkillName() | coc7-adapter.ts:403-526 | ✅ 已实现 | 技能名称规范化 |
| calculateDBAndBuild() | coc7-adapter.ts:178-187 | ✅ 已实现 | DB 和体格计算 |

**缺失功能**：
- ❌ 没有角色战斗数据获取方法
- ❌ 没有伤害应用方法
- ❌ 没有与 CharacterService 的集成

#### D&D 3R 适配器 ❌ 10% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| DND3RAdapter | `src/rule/dnd3r/dnd3r-adapter.ts` | 🔴 占位实现 | 仅框架代码 |
| 命令注册 | dnd3r-adapter.ts:全文件 | 🔴 占位实现 | 返回"开发中"提示 |

**差距分析**：
- ❌ 缺少核心规则算法
- ❌ 缺少角色创建逻辑
- ❌ 缺少战斗检定逻辑

### 5. 规则服务实现层 ❌ 0% 完成

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| CoC7CharacterService | - | ❌ 未实现 | 仅存在于设计文档 |
| DND3RCharacterService | - | ❌ 未实现 | 仅存在于设计文档 |

**差距分析**：
- ❌ 没有规则特定的角色服务实现
- ❌ 战斗命令直接使用默认值，不使用真实角色数据
- ❌ 战斗状态管理未实现

### 6. 战斗/游戏层 ⚠️ 70% 完成（简化版）

#### CoC7 战斗系统

| 组件 | 文件位置 | 状态 | 说明 |
|------|---------|------|------|
| 战斗类型定义 | `src/rule/coc7/combat/combat-types.ts` | ✅ 已实现 | 完整的类型定义 |
| 武器数据表 | `src/rule/coc7/data/weapons.ts` | ✅ 已实现 | 30+ 武器数据 |
| 伤害计算器 | `src/rule/coc7/combat/damage-calculator.ts` | ✅ 已实现 | 完整的伤害计算逻辑 |
| 战斗管理器 | `src/rule/coc7/combat/combat-manager.ts` | ✅ 已实现 | 战斗轮管理 |
| 战斗命令 | `src/rule/coc7/combat/combat-commands.ts` | ⚠️ 简化实现 | 使用默认值，未集成角色卡 |

**问题**：
- ❌ 使用默认属性值（DEX=50, STR=50, SIZ=50）
- ❌ 不从角色卡读取真实数据
- ❌ 不使用角色服务
- ❌ 战斗状态不持久化到角色

## 🔍 详细差距分析

### 差距 1: 缺少规则服务接口定义

**设计要求**：
```typescript
// src/core/interfaces/rule-character-service.interface.ts
export interface IRuleCharacterService {
  readonly ruleSystem: string
  getCombatData(characterId: number): Promise<CharacterCombatData | null>
  applyDamage(characterId: number, damage: number, reason: string): Promise<DamageResult>
  getSkillValue(characterId: number, skillName: string): Promise<SkillValue | undefined>
  getAttributeValue(characterId: number, attributeName: string): Promise<number | undefined>
  addWeapon(characterId: number, userId: number, weaponIdentifier: string): Promise<{success: boolean; error?: string}>
  createCharacter(params: {...}): Promise<{success: boolean; characterId?: number; error?: string}>
  updateCombatState(characterId: number, updates: {...}): Promise<void>
  formatCharacterCard(characterId: number): Promise<string>
}
```

**当前状态**：❌ 完全未实现

**影响**：
- 无法强制规则服务实现标准接口
- 无法保证类型安全
- 不同规则系统实现可能不一致

---

### 差距 2: 缺少 CoC7 角色服务实现

**设计要求**：
```typescript
// src/rule/coc7/coc7-character-service.ts
export class CoC7CharacterService implements IRuleCharacterService {
  readonly ruleSystem = 'coc7'

  private globalService: CharacterService
  private adapter: CoC7Adapter

  async getCombatData(characterId: number): Promise<CoC7CharacterCombatData | null> {
    // 从 character 表读取角色数据
    // 解析 attributes, skills, inventory
    // 返回格式化的战斗数据
  }

  async applyDamage(characterId: number, damage: number, reason: string): Promise<DamageResult> {
    // 读取当前 HP
    // 计算新 HP
    // 检查意识丧失/死亡
    // 更新 metadata.combat
    // 持久化到数据库
  }
}
```

**当前状态**：❌ 完全未实现

**当前替代方案**：
- 战斗命令直接使用默认值
- 不使用角色卡系统

**影响**：
- 战斗系统无法使用真实角色数据
- 伤害不持久化
- 无法追踪角色状态

---

### 差距 3: 战斗命令未集成角色服务

**设计要求**：
```typescript
export class CombatCommands {
  private characterService: CoC7CharacterService  // ✅ 使用规则服务

  async handleAttack(session: Session, args: string): Promise<string> {
    // ✅ 从规则服务获取角色数据
    const character = await this.getActiveCharacter(session)
    const combatData = await this.characterService.getCombatData(character.id!)

    // ✅ 从规则服务获取技能值
    const skillResult = await this.characterService.getSkillValue(
      character.id!,
      weapon.skill
    )

    // ✅ 从规则服务获取属性值
    const str = await this.characterService.getAttributeValue(character.id!, 'str')
    const siz = await this.characterService.getAttributeValue(character.id!, 'siz')

    // ✅ 使用真实数据计算伤害
    const db = calculator.calculateDB(str, siz)
    const damageResult = calculator.calculateDamage(weapon, db, successLevel)

    // ✅ 应用伤害到角色
    if (successLevel >= 2) {
      await this.characterService.applyDamage(targetId, damageResult.total, weapon.name)
    }
  }
}
```

**当前实现**：
```typescript
// src/rule/coc7/combat/combat-commands.ts:186-247
async handleAttack(session: Session, args: string): Promise<string> {
  // ❌ 使用默认技能值
  const skillValue = 50

  // ❌ 使用默认属性值
  const db = calculator.rollDB(
    calculator.calculateDB(50, 50)  // 默认 STR=50, SIZ=50
  )

  // ❌ 伤害不持久化到角色
  // ❌ 无法获取真实角色数据
}
```

**差距**：
- ❌ 不使用 `CoC7CharacterService`
- ❌ 硬编码默认值
- ❌ 伤害不应用到角色
- ❌ 不验证角色拥有武器

---

### 差距 4: 角色创建流程不完整

**当前流程**：
1. 用户调用 `.char create` 命令
2. `CharacterService.createCharacter()` 验证基本参数
3. 调用 `CoC7Adapter.createCharacter()` 计算衍生属性
4. 保存到 `character` 表

**缺失环节**：
- ❌ 没有使用 `CoC7CharacterService` 封装逻辑
- ❌ 规则验证散落在适配器中
- ❌ 没有统一的角色服务接口

**设计流程**：
1. 用户调用 `.char create` 命令
2. `CoC7CharacterService.createCharacter()` 处理：
   - 验证 CoC7 特定属性（8 个核心属性）
   - 调用 `CoC7Adapter` 计算衍生属性
   - 调用 `CharacterService` 保存数据
   - 返回标准化结果

---

### 差距 5: 战斗状态管理缺失

**设计要求**：
- ✅ 战斗状态存储在 `character.metadata.combat`
- ✅ 包含 `currentHp`, `currentSanity`, `conditions` 等字段
- ✅ 通过 `updateCombatState()` 更新

**当前状态**：
- ❌ 战斗状态存储在 `conversation.metadata.combat`（战斗管理器）
- ❌ 与角色卡状态不同步
- ❌ 无法追踪角色的持久化战斗状态

**问题**：
- 战斗结束后角色状态丢失
- 多个战斗无法同时进行
- 无法恢复角色 HP

---

## 📈 实现优先级建议

### 第一优先级：定义接口和实现 CoC7 服务（1周）

**理由**：
1. 建立架构基础
2. 解决战斗系统与角色卡集成的核心问题
3. 为其他规则系统提供参考

**任务**：
1. 创建 `src/core/interfaces/rule-character-service.interface.ts`
2. 创建 `src/rule/coc7/coc7-character-service.ts`
3. 实现 `getCombatData()` 方法
4. 实现 `applyDamage()` 方法
5. 实现 `getSkillValue()` 方法

### 第二优先级：重构战斗命令（2天）

**理由**：
1. 完成角色卡集成
2. 提升用户体验
3. 验证架构设计

**任务**：
1. 修改 `CombatCommands` 使用 `CoC7CharacterService`
2. 重构 `handleAttack()` 方法
3. 重构 `handleDamage()` 方法
4. 测试战斗流程

### 第三优先级：实现 D&D 3R 服务（1周）

**理由**：
1. 验证架构的通用性
2. 为 D&D 系统提供完整支持

**任务**：
1. 创建 `src/rule/dnd3r/dnd3r-character-service.ts`
2. 实现 D&D 特定的业务逻辑
3. 实现 D&D 适配器核心功能

---

## 📊 完成度总结

| 层级 | 设计目标 | 当前实现 | 完成度 | 关键差距 |
|------|---------|---------|--------|----------|
| **数据持久化层** | 完整的表结构 | ✅ 已实现 | 100% | 无 |
| **全局服务层** | 完整的 CRUD | ✅ 已实现 | 100% | 无 |
| **规则服务接口** | 标准接口定义 | ❌ 未实现 | 0% | 缺少接口定义 |
| **规则适配器** | 规则算法实现 | ⚠️ 部分完成 | 50% | CoC7 完成，DND3R 缺失 |
| **规则服务实现** | 业务逻辑封装 | ❌ 未实现 | 0% | 缺少服务实现 |
| **战斗/游戏层** | 使用角色服务 | ⚠️ 简化实现 | 70% | 使用默认值，未集成角色 |

**总体完成度**: 约 **53%**（基础设施完整，业务逻辑待实现）

---

## 🎯 关键指标

### 代码行数统计

| 组件 | 设计行数 | 实现行数 | 完成度 |
|------|---------|---------|--------|
| 全局服务 | - | 1300+ | 100% |
| CoC7 适配器 | - | 600+ | 90% |
| CoC7 角色服务（设计） | ~800 | 0 | 0% |
| D&D 3R 角色服务（设计） | ~800 | 0 | 0% |
| 规则服务接口（设计） | ~300 | 0 | 0% |

### 功能覆盖率

| 功能模块 | 设计功能点 | 已实现 | 未实现 | 完成率 |
|---------|----------|--------|--------|--------|
| 角色创建 | 8 | 8 | 0 | 100% |
| 角色查询 | 6 | 6 | 0 | 100% |
| 角色更新 | 4 | 4 | 0 | 100% |
| 战斗数据获取 | 3 | 0 | 3 | 0% |
| 伤害应用 | 4 | 0 | 4 | 0% |
| 技能查询 | 2 | 1 | 1 | 50% |
| 装备管理 | 2 | 0 | 2 | 0% |
| 战斗状态管理 | 3 | 0 | 3 | 0% |

**总体功能完成率**: 约 **55%**

---

## 💡 结论

当前实现的优势：
- ✅ 完整的数据持久化层
- ✅ 强大的全局角色服务
- ✅ CoC7 适配器实现完整

主要差距：
- ❌ 缺少规则服务接口层
- ❌ 缺少规则服务实现层
- ❌ 战斗系统未集成角色卡

下一步行动：
1. 实现规则服务接口定义
2. 实现 CoC7 角色服务
3. 重构战斗命令使用角色服务
4. 验证架构设计

完成这些任务后，系统将达到 **85%+** 的完成度，基本满足核心功能需求。
