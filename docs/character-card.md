# 角色卡系统 API 文档

## 概述

角色卡系统提供统一的角色卡操作接口，支持多种规则系统的角色卡管理，包括：

- **零 Schema 设计**：完全动态的数据结构，支持任意规则系统
- **版本追踪**：通过 `parent_id` 字段记录角色卡继承关系
- **控制权转移**：支持临时转移角色控制权，不影响所有权
- **内存缓存**：活跃会话的角色卡保存在内存中，暂停时自动持久化
- **完整审计**：记录所有控制权转移历史，支持调试和查询

## 核心概念

### 所有权 vs 控制权

- **所有者（user_id）**：角色卡的永久拥有者，不会改变
- **控制者（controller_id）**：当前可以操作角色卡的用户，可随时转移
- **默认状态**：`controller_id = null`，表示所有者自己控制

### 会话状态与数据同步

- **ACTIVE**：会话活跃中，角色卡在内存中，快速读写
- **PAUSED**：会话已暂停，角色卡同步到数据库并从内存卸载
- **ENDED**：会话已结束，角色卡同步到数据库并从内存卸载

## 数据模型

### CharacterCard

角色卡数据模型。

```typescript
interface CharacterCard {
  id?: number                        // 角色卡ID
  conversation_id: number            // 所属会话ID
  user_id: number                    // 拥有者用户ID（永久）
  controller_id?: number             // 当前控制者ID（可转移，null=所有者控制）
  name: string                      // 角色名称
  parent_id: number                 // 父角色卡ID（-1表示根角色卡）
  rule_system?: string              // 规则系统标识（可选）
  data: CharacterData              // 完全动态的角色数据
  tags?: string[]                  // 标签（可选）
  created_at?: Date
  updated_at?: Date
}
```

### ControlTransfer

控制权转移记录。

```typescript
interface ControlTransfer {
  id?: number
  card_id: number                    // 角色卡ID
  from_user_id: number | null        // 从谁转移（null表示从所有者）
  to_user_id: number                 // 转移给谁
  transferred_at: Date               // 转移时间
  reason?: string                    // 转移原因（可选）
  reverted_at?: Date                // 收回时间（null表示未收回）
}
```

## 服务层 API

### CharacterCardService

角色卡服务类，提供所有角色卡业务逻辑。

#### 方法列表

##### createCard

创建新角色卡。

```typescript
async createCard(params: {
  conversationId: number
  userId: number
  name: string
  data: CharacterData
  options?: {
    parentId?: number           // 默认-1（根角色卡）
    rule_system?: string
    tags?: string[]
  }
}): Promise<CreateCardResult>
```

**参数说明**：
- `conversationId`：会话ID
- `userId`：创建者用户ID
- `name`：角色卡名称（同一会话中不能重复）
- `data`：角色数据（任意结构）
- `options.parentId`：父角色卡ID（默认-1表示根角色卡）
- `options.rule_system`：规则系统标识（可选）
- `options.tags`：标签列表（可选）

**返回值**：
```typescript
interface CreateCardResult {
  success: boolean
  cardId?: number          // 创建成功时返回
  message?: string         // 成功消息
  error?: string          // 错误消息
}
```

**验证规则**：
1. 会话必须存在
2. 同一会话中角色卡名称不能重复
3. 如果指定 `parentId`，父角色卡必须存在
4. 如果会话不是活跃状态，会立即保存到数据库

**示例**：
```typescript
const result = await cardService.createCard({
  conversationId: 1,
  userId: 123,
  name: "英雄",
  data: {
    level: 1,
    hp: 100,
    mp: 50
  },
  options: {
    parentId: -1,
    rule_system: "dnd_5e",
    tags: ["战士", "人类"]
  }
})

if (result.success) {
  console.log(`角色卡创建成功，ID: ${result.cardId}`)
}
```

---

##### createFromParent

基于父角色卡创建新角色卡（继承）。

```typescript
async createFromParent(params: {
  conversationId: number       // 新会话ID
  userId: number              // 用户ID
  parentCardId: number        // 父角色卡ID
}): Promise<CreateCardResult>
```

**参数说明**：
- `conversationId`：新会话ID
- `userId`：创建者用户ID
- `parentCardId`：父角色卡ID

**返回值**：同 `createCard`

**行为**：
1. 深度复制父角色卡的 `data` 字段
2. 继承父角色卡的名称、规则系统和标签
3. 设置 `parent_id` 为父角色卡ID

**示例**：
```typescript
const result = await cardService.createFromParent({
  conversationId: 2,
  userId: 123,
  parentCardId: 1
})

if (result.success) {
  console.log(`基于角色卡1创建了新角色卡，ID: ${result.cardId}`)
}
```

---

##### transferControl

转移角色卡控制权。

```typescript
async transferControl(params: {
  conversationId: number
  cardId: number
  fromUserId: number       // 当前控制者（发起转移的用户）
  toUserId: number         // 目标控制者
  reason?: string
}): Promise<TransferControlResult>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID
- `fromUserId`：当前控制者用户ID（发起转移的用户）
- `toUserId`：目标用户ID
- `reason`：转移原因（可选）

**返回值**：
```typescript
interface TransferControlResult {
  success: boolean
  message?: string
  error?: string
}
```

**验证规则**：
1. 角色卡必须存在
2. `fromUserId` 必须是当前控制者
3. 目标用户必须在会话中

**行为**：
1. 更新角色卡的 `controller_id` 为目标用户
2. 创建控制权转移记录到 `control_transfer` 表
3. 标记角色卡为脏数据

**示例**：
```typescript
const result = await cardService.transferControl({
  conversationId: 1,
  cardId: 1,
  fromUserId: 123,
  toUserId: 456,
  reason: "临时托管"
})

if (result.success) {
  console.log("控制权已转移")
}
```

---

##### revokeControl

收回角色卡控制权。

```typescript
async revokeControl(params: {
  conversationId: number
  cardId: number
  userId: number            // 要求收回的用户
}): Promise<RevokeControlResult>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID
- `userId`：要求收回的用户ID

**返回值**：
```typescript
interface RevokeControlResult {
  success: boolean
  message?: string
  error?: string
}
```

**验证规则**：
1. 角色卡必须存在
2. `userId` 必须是所有者或当前控制者

**行为**：
1. 将 `controller_id` 设为 `null`（表示所有者控制）
2. 更新最近的未收回转移记录的 `reverted_at` 字段
3. 标记角色卡为脏数据

**示例**：
```typescript
const result = await cardService.revokeControl({
  conversationId: 1,
  cardId: 1,
  userId: 123
})

if (result.success) {
  console.log("控制权已归还给所有者")
}
```

---

##### getCard

获取角色卡（优先从内存）。

```typescript
async getCard(
  conversationId: number,
  cardId: number
): Promise<MemoryCharacterCard | null>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID

**返回值**：
```typescript
interface MemoryCharacterCard extends CharacterCard {
  _dirty: boolean                // 是否为脏数据
  _dirtyFields: Set<string>      // 脏数据字段集合
  _lastModified: Date            // 最后修改时间
}
```

**行为**：
1. 先查内存缓存
2. 如果缓存中没有，查询数据库
3. 如果从数据库加载，会自动添加到缓存

**示例**：
```typescript
const card = await cardService.getCard(1, 1)
if (card) {
  console.log(`角色卡名称: ${card.name}`)
  console.log(`数据:`, card.data)
}
```

---

##### updateCardData

更新角色卡数据（支持动态路径）。

```typescript
async updateCardData(
  conversationId: number,
  cardId: number,
  path: string,              // 点号分隔的路径，如 "attributes.strength"
  value: any
): Promise<{ success: boolean; error?: string }>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID
- `path`：点号分隔的路径（如 `"attributes.strength"`）
- `value`：新值

**返回值**：
```typescript
{
  success: boolean
  error?: string
}
```

**行为**：
1. 动态创建不存在的中间路径
2. 标记指定路径为脏数据

**示例**：
```typescript
// 简单路径
const result1 = await cardService.updateCardData(1, 1, "level", 5)

// 嵌套路径
const result2 = await cardService.updateCardData(1, 1, "attributes.strength", 18)

// 深度嵌套
const result3 = await cardService.updateCardData(1, 1, "equipment.weapon.attack", 10)
```

---

##### getCardData

查询角色卡数据（支持动态路径）。

```typescript
async getCardData(
  conversationId: number,
  cardId: number,
  path?: string             // 可选的点号分隔路径
): Promise<any>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID
- `path`：可选的点号分隔路径

**返回值**：
- 如果 `path` 为空，返回完整的 `data` 对象
- 如果指定 `path`，返回对应路径的值
- 如果路径不存在，返回 `undefined`

**示例**：
```typescript
// 获取完整数据
const allData = await cardService.getCardData(1, 1)

// 获取简单路径
const level = await cardService.getCardData(1, 1, "level")

// 获取嵌套路径
const strength = await cardService.getCardData(1, 1, "attributes.strength")

// 获取不存在的路径
const nonexistent = await cardService.getCardData(1, 1, "nonexistent")
// 返回: undefined
```

---

##### getControlledCards

获取用户当前控制的角色卡。

```typescript
async getControlledCards(
  conversationId: number,
  userId: number
): Promise<MemoryCharacterCard[]>
```

**参数说明**：
- `conversationId`：会话ID
- `userId`：用户ID

**返回值**：用户控制的角色卡列表

**行为**：
- 返回 `controller_id` 等于 `userId` 或 `controller_id` 为空且 `user_id` 等于 `userId` 的角色卡

**示例**：
```typescript
const cards = await cardService.getControlledCards(1, 123)
console.log(`用户123控制 ${cards.length} 张角色卡`)
```

---

##### getOwnedCards

获取用户拥有的角色卡。

```typescript
async getOwnedCards(
  conversationId: number,
  userId: number
): Promise<MemoryCharacterCard[]>
```

**参数说明**：
- `conversationId`：会话ID
- `userId`：用户ID

**返回值**：用户拥有的角色卡列表

**行为**：
- 返回 `user_id` 等于 `userId` 的角色卡

**示例**：
```typescript
const cards = await cardService.getOwnedCards(1, 123)
console.log(`用户123拥有 ${cards.length} 张角色卡`)
```

---

##### getControlHistory

查询角色卡的控制权转移历史。

```typescript
async getControlHistory(
  cardId: number
): Promise<ControlTransfer[]>
```

**参数说明**：
- `cardId`：角色卡ID

**返回值**：按转移时间倒序排列的转移记录列表

**示例**：
```typescript
const history = await cardService.getControlHistory(1)

history.forEach(record => {
  console.log(`${record.from_user_id || '所有者'} → ${record.to_user_id}`)
  console.log(`  时间: ${record.transferred_at}`)
  console.log(`  原因: ${record.reason || '无'}`)
  console.log(`  状态: ${record.reverted_at ? '已收回' : '当前'}`)
})
```

---

##### canControlCard

检查用户是否可以操作角色卡。

```typescript
async canControlCard(
  conversationId: number,
  cardId: number,
  userId: number
): Promise<boolean>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID
- `userId`：用户ID

**返回值**：用户是否可以操作该角色卡

**行为**：
- 检查用户是否是当前控制者

**示例**：
```typescript
const canControl = await cardService.canControlCard(1, 1, 123)
if (canControl) {
  console.log("用户可以操作该角色卡")
}
```

---

##### getCardFamilyTree

查询角色卡的家族树（所有子角色卡）。

```typescript
async getCardFamilyTree(
  cardId: number
): Promise<CharacterCard[]>
```

**参数说明**：
- `cardId`：角色卡ID

**返回值**：所有子角色卡的扁平列表（递归）

**示例**：
```typescript
const familyTree = await cardService.getCardFamilyTree(1)
console.log(`角色卡1有 ${familyTree.length} 个子角色卡`)
```

---

##### getCardAncestorChain

查询角色卡的祖先链。

```typescript
async getCardAncestorChain(
  cardId: number
): Promise<CharacterCard[]>
```

**参数说明**：
- `cardId`：角色卡ID

**返回值**：从根角色卡到当前角色卡的路径列表

**示例**：
```typescript
const chain = await cardService.getCardAncestorChain(1)
chain.forEach(card => {
  console.log(`[${card.id}] ${card.name}`)
})
```

---

##### deleteCard

删除角色卡。

```typescript
async deleteCard(
  conversationId: number,
  cardId: number
): Promise<boolean>
```

**参数说明**：
- `conversationId`：会话ID
- `cardId`：角色卡ID

**返回值**：是否删除成功

**行为**：
1. 从内存缓存中删除
2. 从数据库中删除

**示例**：
```typescript
const success = await cardService.deleteCard(1, 1)
if (success) {
  console.log("角色卡已删除")
}
```

---

##### listCards

列出会话的所有角色卡。

```typescript
async listCards(
  conversationId: number
): Promise<MemoryCharacterCard[]>
```

**参数说明**：
- `conversationId`：会话ID

**返回值**：会话的所有角色卡列表

**示例**：
```typescript
const cards = await cardService.listCards(1)
console.log(`会话1有 ${cards.length} 张角色卡`)
```

---

##### flushConversation

批量保存会话的脏数据（手动触发）。

```typescript
async flushConversation(
  conversationId: number
): Promise<void>
```

**参数说明**：
- `conversationId`：会话ID

**行为**：
- 将会话的所有脏数据同步到数据库

**示例**：
```typescript
await cardService.flushConversation(1)
```

---

##### reloadConversation

强制从数据库重新加载会话数据。

```typescript
async reloadConversation(
  conversationId: number
): Promise<void>
```

**参数说明**：
- `conversationId`：会话ID

**行为**：
1. 卸载会话的内存缓存
2. 从数据库重新加载到内存

**示例**：
```typescript
await cardService.reloadConversation(1)
```

## 命令行接口

### 创建角色卡

```
/card.create <name:text>
```

**示例**：
```
/card.create "英雄"
```

**返回**：
```
✅ 角色卡 "英雄" 创建成功 (ID: 1)
```

---

### 基于父角色卡创建

```
/card.inherit <parentCardId:number>
```

**示例**：
```
/card.inherit 1
```

**返回**：
```
✅ 角色卡创建成功 (ID: 2)
```

---

### 更新角色卡数据

```
/card.set <cardId:number> <path:text> <value:text>
```

**示例**：
```
/card.set 1 level 5
/card.set 1 attributes.strength 18
```

**返回**：
```
✅ 已更新 level = 5
```

---

### 查询角色卡数据

```
/card.get <cardId:number> [path:text]
```

**示例**：
```
/card.get 1
/card.get 1 level
/card.get 1 attributes.strength
```

**返回**：
```
📋 角色卡 "英雄" 的数据:
{
  "level": 5,
  "attributes": {
    "strength": 18
  }
}
```

---

### 删除角色卡

```
/card.delete <cardId:number>
```

**示例**：
```
/card.delete 1
```

**返回**：
```
✅ 角色卡 "英雄" 已删除
```

---

### 列出所有角色卡

```
/card.list
```

**返回**：
```
📭 当前会话的角色卡 (2张):
- [1] 英雄 (拥有者: 123)
- [2] 法师 (拥有者: 456, 控制者: 123)
```

---

### 转移控制权

```
/card.transfer <cardId:number> <toUserId:number> [reason:text]
```

**示例**：
```
/card.transfer 1 456 "临时托管"
```

**返回**：
```
✅ 控制权已转移给用户 456
```

---

### 收回控制权

```
/card.revoke <cardId:number>
```

**示例**：
```
/card.revoke 1
```

**返回**：
```
✅ 控制权已归还给所有者
```

---

### 查看控制的角色卡

```
/card.controlling
```

**返回**：
```
🎮 你当前控制的角色卡 (2张):
- [1] 英雄 (拥有者)
- [2] 法师 (来自玩家456)
```

---

### 查看拥有的角色卡

```
/card.owned
```

**返回**：
```
👑 你拥有的角色卡 (2张):
- [1] 英雄 (你控制)
- [2] 法师 (由玩家123控制)
```

---

### 查看控制权历史

```
/card.history <cardId:number>
```

**示例**：
```
/card.history 1
```

**返回**：
```
📜 角色卡 [1] 的控制权历史:
2024-01-15 14:30:00: 所有者 → 456 (已收回于 2024-01-15 18:00:00)
```

---

### 查看当前控制者

```
/card.controller <cardId:number>
```

**示例**：
```
/card.controller 1
```

**返回**：
```
🎮 角色卡 "英雄" 的控制者：456 (临时控制，所有者：123)
```

---

### 查看家族树

```
/card.tree <cardId:number>
```

**示例**：
```
/card.tree 1
```

**返回**：
```
🌳 角色卡 [1] 的家族树:
  ├─ [2] 英雄 (会话: 2)
  ├─ [3] 英雄 (会话: 3)
```

---

### 查看祖先链

```
/card.ancestors <cardId:number>
```

**示例**：
```
/card.ancestors 3
```

**返回**：
```
🔗 角色卡 [3] 的祖先链:
[1] 英雄 (根角色卡)
  ├─ [2] 英雄
```

## 事件系统

### 会话状态事件

角色卡缓存服务监听以下事件来自动同步数据：

#### character-conversation-paused

会话暂停时触发。

**参数**：
- `conversationId: number` - 会话ID

**行为**：
1. 将会话的所有脏数据同步到数据库
2. 卸载会话的内存缓存

#### character-conversation-resumed

会话恢复时触发。

**参数**：
- `conversationId: number` - 会话ID

**行为**：
1. 从数据库加载会话的所有角色卡到内存

#### character-conversation-ended

会话结束时触发。

**参数**：
- `conversationId: number` - 会话ID

**行为**：
1. 将会话的所有脏数据同步到数据库
2. 卸载会话的内存缓存

## 使用示例

### 示例1：基本角色卡操作

```typescript
// 1. 创建角色卡
const result1 = await cardService.createCard({
  conversationId: 1,
  userId: 123,
  name: "战士",
  data: {
    level: 1,
    hp: 100,
    mp: 50,
    attributes: {
      strength: 16,
      dexterity: 14
    }
  }
})

// 2. 更新属性
await cardService.updateCardData(1, result1.cardId!, "level", 2)

// 3. 查询数据
const level = await cardService.getCardData(1, result1.cardId!, "level")
console.log(`等级: ${level}`) // 等级: 2
```

### 示例2：控制权转移

```typescript
// 1. 玩家123创建角色卡
const card = await cardService.createCard({
  conversationId: 1,
  userId: 123,
  name: "法师",
  data: { level: 1 }
})

// 2. 玩家123转移控制权给玩家456
await cardService.transferControl({
  conversationId: 1,
  cardId: card.cardId!,
  fromUserId: 123,
  toUserId: 456,
  reason: "临时托管"
})

// 3. 玩家456可以修改
await cardService.updateCardData(1, card.cardId!, "level", 2) // ✅ 成功

// 4. 玩家123不能修改
await cardService.updateCardData(1, card.cardId!, "level", 3) // ❌ 失败

// 5. 玩家123收回控制权
await cardService.revokeControl({
  conversationId: 1,
  cardId: card.cardId!,
  userId: 123
})

// 6. 玩家123可以修改
await cardService.updateCardData(1, card.cardId!, "level", 3) // ✅ 成功
```

### 示例3：角色卡继承

```typescript
// 1. 会话1中创建角色卡
const card1 = await cardService.createCard({
  conversationId: 1,
  userId: 123,
  name: "英雄",
  data: { level: 5, gold: 100 }
})

// 2. 会话1结束后，在会话2中基于角色卡1创建
const card2 = await cardService.createFromParent({
  conversationId: 2,
  userId: 123,
  parentCardId: card1.cardId!
})

// card2 继承了 card1 的数据
const data = await cardService.getCardData(2, card2.cardId!)
console.log(data) // { level: 5, gold: 100 }

// 3. 查询祖先链
const chain = await cardService.getCardAncestorChain(card2.cardId!)
console.log(chain) // [{id: 1, name: "英雄", parent_id: -1}, {id: 2, name: "英雄", parent_id: 1}]
```

### 示例4：审计和调试

```typescript
// 1. 查看角色卡的控制权历史
const history = await cardService.getControlHistory(1)

history.forEach(record => {
  console.log(`${record.from_user_id || '所有者'} → ${record.to_user_id}`)
  console.log(`  时间: ${record.transferred_at}`)
  console.log(`  原因: ${record.reason || '无'}`)
  console.log(`  状态: ${record.reverted_at ? '已收回' : '当前'}`)
})

// 输出示例：
// 所有者 → 456
//   时间: 2024-01-15 14:30:00
//   原因: 临时托管
//   状态: 已收回
```

## 性能优化

### 内存缓存

活跃会话的角色卡保存在内存中（双层 Map 结构）：
- 外层：`Map<conversationId, Map<cardId, MemoryCharacterCard>>`
- 内层：`Map<cardId, MemoryCharacterCard>`

访问时间复杂度：O(1)

### 脏数据跟踪

只同步修改过的字段到数据库：
- `_dirty: boolean` - 标记卡片是否为脏数据
- `_dirtyFields: Set<string>` - 记录修改过的字段路径

最小化数据库写入次数。

### 事件驱动同步

会话状态变化时自动同步：
- ACTIVE：数据在内存，快速读写
- PAUSED/ENDED：自动持久化到数据库并卸载

无需手动管理缓存。

## 错误处理

所有服务方法都会捕获异常并返回错误信息：

```typescript
const result = await cardService.createCard({...})

if (!result.success) {
  console.error(`创建失败: ${result.error}`)
  // 处理错误
}
```

常见的错误信息：
- `会话不存在`
- `会话中已存在名为 "XXX" 的角色卡`
- `父角色卡 XXX 不存在`
- `只有当前控制者才能转移控制权`
- `目标用户不在当前会话中`
- `只有所有者或当前控制者才能收回控制权`
- `只有角色卡的所有者才能删除`
- `角色卡不存在`

## 最佳实践

### 1. 数据结构设计

使用嵌套结构组织相关数据：

```typescript
// ✅ 推荐：嵌套结构
{
  level: 5,
  attributes: {
    strength: 16,
    dexterity: 14,
    constitution: 15
  },
  equipment: {
    weapon: {
      name: "长剑",
      attack: 8
    }
  }
}

// ❌ 避免：扁平结构
{
  level: 5,
  strength: 16,
  dexterity: 14,
  constitution: 15,
  weapon_name: "长剑",
  weapon_attack: 8
}
```

### 2. 控制权管理

- 临时转移：使用 `transferControl` + `revokeControl`
- 永久转移：先转移，然后所有者不收回
- 权限检查：操作前调用 `canControlCard` 验证

### 3. 版本追踪

- 根角色卡：`parent_id = -1`
- 子角色卡：`parent_id` 指向父角色卡
- 查询祖先：`getCardAncestorChain`
- 查询后代：`getCardFamilyTree`

### 4. 批量操作

- 手动保存：`flushConversation`
- 强制重载：`reloadConversation`
- 通常不需要：会话状态变化时自动处理

## 相关文档

- [会话管理服务](./conversation.service.md)
- [权限管理服务](./permission.service.md)
- [数据模型参考](../../models/README.md)

## 更新日志

### v1.0.0 (2024-01-15)

- 初始版本
- 支持零 Schema 角色卡
- 支持控制权转移
- 支持版本追踪
- 支持内存缓存
- 支持完整审计
