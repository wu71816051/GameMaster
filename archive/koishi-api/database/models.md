# 数据库模型扩展

## 概述

Koishi 提供了灵活的数据模型扩展机制，通过 `ctx.model.extend()` 方法，插件可以扩展 Koishi 的数据库表结构，或创建新的自定义表。这是插件数据持久化的基础。

模型扩展支持定义字段类型、默认值、自动递增等属性，并与 Koishi 的数据库系统无缝集成。

## 类型定义

```typescript
/**
 * 模型扩展接口
 */
interface Model {
  /**
   * 扩展或创建表
   * @param table 表名
   * @param fields 字段定义
   * @param options 表选项
   */
  extend<T extends Table>(table: T, fields: Tables[T], options?: Model.Options): void
}

/**
 * 字段类型定义
 */
type FieldType =
  | 'string'      // 字符串
  | 'text'        // 长文本
  | 'integer'     // 整数
  | 'unsigned'    // 无符号整数（自动递增 ID）
  | 'float'       // 浮点数
  | 'boolean'     // 布尔值
  | 'date'        // 日期
  | 'timestamp'   // 时间戳
  | 'json'        // JSON 对象
  | 'list'        // 数组

/**
 * 表选项
 */
interface Model.Options {
  /** 是否自动递增（仅用于主键） */
  autoInc?: boolean

  /** 主键字段名 */
  primary?: string

  /** 是否唯一 */
  unique?: string[]

  /** 默认值 */
  initial?: {
    [key: string]: any
  }
}
```

## 核心方法

### extend() - 扩展表模型

扩展或创建数据库表。

#### 方法签名
```typescript
extend<T extends Table>(table: T, fields: Tables[T], options?: Model.Options): void
```

#### 参数
- `table`: 表名（字符串或表类型）
- `fields`: 字段定义对象
- `options`: 表配置选项（可选）

#### 返回值
无返回值

## 实际应用示例

### 示例 1: 创建新表

**文件**: [src/core/models/index.ts:31](../../src/core/models/index.ts#L31)

```typescript
export function registerDatabaseModels(ctx: Context) {
  const logger = ctx.logger

  // 注册 conversation 表
  ctx.model.extend('conversation' as any, {
    id: 'unsigned',              // 主键，自动递增
    name: 'string',              // 会话名称
    creator_id: 'integer',       // 创建者 ID
    channels: 'list',            // 频道列表（JSON 数组）
    status: 'integer',           // 会话状态
    created_at: 'timestamp',     // 创建时间
    updated_at: 'timestamp',     // 更新时间
    metadata: 'json',            // 元数据（JSON 对象）
  }, {
    autoInc: true,               // 主键自动递增
  })

  logger.info('[GameMaster] conversation 表注册成功')
}
```

### 示例 2: 扩展现有表

**文件**: [src/core/models/index.ts:79](../../src/core/models/index.ts#L79)

```typescript
export function registerDatabaseModels(ctx: Context) {
  const logger = ctx.logger

  // 扩展 user 表（Koishi 内置表）
  logger.debug('[GameMaster] 扩展 user 表')
  ctx.model.extend('user' as any, {
    conversations: 'list',      // 新增字段：用户的会话列表
  })

  logger.info('[GameMaster] user 表扩展成功', '新增字段: conversations')
}
```

### 示例 3: 创建关联表

**文件**: [src/core/models/index.ts:47](../../src/core/models/index.ts#L47)

```typescript
// 注册 conversation_member 表
ctx.model.extend('conversation_member' as any, {
  id: 'unsigned',              // 主键
  conversation_id: 'unsigned', // 外键：会话 ID
  user_id: 'integer',          // 外键：用户 ID
  joined_at: 'timestamp',      // 加入时间
  role: 'string',              // 角色（creator, admin, member）
}, {
  autoInc: true,
})

logger.info('[GameMaster] conversation_member 表注册成功')
```

### 示例 4: 创建消息记录表

**文件**: [src/core/models/index.ts:60](../../src/core/models/index.ts#L60)

```typescript
// 注册 conversation_message 表
ctx.model.extend('conversation_message' as any, {
  id: 'unsigned',              // 主键
  conversation_id: 'unsigned', // 所属会话
  user_id: 'integer',          // 发送者
  message_id: 'string',        // 消息唯一 ID
  content: 'text',             // 消息内容
  content_type: 'string',      // 内容类型
  message_type: 'string',      // 消息类型
  timestamp: 'timestamp',      // 发送时间
  platform: 'string',          // 平台
  guild_id: 'string',          // 群组 ID
  attachments: 'json',         // 附件（JSON 对象）
}, {
  autoInc: true,
})

logger.info('[GameMaster] conversation_message 表注册成功')
```

## 字段类型详解

### 基本类型

| 类型 | 说明 | 示例值 | 使用场景 |
|------|------|--------|---------|
| `string` | 短字符串 | `'hello'` | 名称、标识符 |
| `text` | 长文本 | `'long text...'` | 消息内容、描述 |
| `integer` | 整数 | `123` | 用户 ID、计数 |
| `unsigned` | 无符号整数 | `1, 2, 3` | 主键 ID |
| `float` | 浮点数 | `3.14` | 评分、比例 |
| `boolean` | 布尔值 | `true, false` | 开关、状态 |
| `date` | 日期 | `Date 对象` | 生日 |
| `timestamp` | 时间戳 | `Date 对象` | 创建/更新时间 |

### 复杂类型

| 类型 | 说明 | 存储格式 | 使用场景 |
|------|------|---------|---------|
| `json` | JSON 对象 | JSON 字符串 | 元数据、配置 |
| `list` | 数组 | JSON 数组 | 列表、集合 |

### 使用示例

```typescript
ctx.model.extend('example', {
  // 基本类型
  name: 'string',           // 短字符串
  description: 'text',      // 长文本
  age: 'integer',           // 整数
  id: 'unsigned',           // 无符号整数（主键）
  score: 'float',           // 浮点数
  active: 'boolean',        // 布尔值
  birthday: 'date',         // 日期
  created_at: 'timestamp',  // 时间戳

  // 复杂类型
  metadata: 'json',         // JSON 对象
  tags: 'list',             // 数组
})
```

## 表选项详解

### autoInc - 自动递增

指定主键字段自动递增。

```typescript
ctx.model.extend('table', {
  id: 'unsigned',  // 主键
  name: 'string',
}, {
  autoInc: true,   // id 字段自动递增
})
```

### primary - 主键

指定主键字段（默认为 'id'）。

```typescript
ctx.model.extend('table', {
  custom_id: 'unsigned',
  name: 'string',
}, {
  primary: 'custom_id',  // 使用 custom_id 作为主键
})
```

### unique - 唯一约束

指定字段的唯一约束。

```typescript
ctx.model.extend('table', {
  id: 'unsigned',
  email: 'string',
  username: 'string',
}, {
  unique: ['email', 'username'],  // email 和 username 必须唯一
})
```

### initial - 默认值

设置字段的默认值。

```typescript
ctx.model.extend('table', {
  id: 'unsigned',
  name: 'string',
  status: 'integer',
}, {
  initial: {
    status: 0,  // status 字段默认值为 0
  },
})
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**主要用途**:
- 创建自定义数据表
- 扩展 Koishi 内置表（如 user 表）
- 定义业务数据模型

**表定义统计**:
- 创建新表：3 个（conversation, conversation_member, conversation_message）
- 扩展现有表：1 个（user）
- 总字段数：约 30+ 个字段

**相关文件**:
- [src/core/models/index.ts](../../src/core/models/index.ts) - 所有模型定义
- [src/core/models/conversation.ts](../../src/core/models/conversation.ts) - Conversation 模型
- [src/core/models/conversation-member.ts](../../src/core/models/conversation-member.ts) - ConversationMember 模型
- [src/core/models/conversation-message.ts](../../src/core/models/conversation-message.ts) - ConversationMessage 模型
- [src/core/models/user-extension.ts](../../src/core/models/user-extension.ts) - User 扩展

## 命名规范

### 表名

- 使用小写字母和下划线
- 使用复数形式（可选）
- 清晰描述表的用途

```typescript
// ✅ 好的表名
'conversation'
'conversation_member'
'conversation_message'

// ❌ 不好的表名
'table1'
'data'
'Conversation'
```

### 字段名

- 使用小写字母和下划线
- 描述字段内容
- 关联字段使用 `_id` 后缀

```typescript
// ✅ 好的字段名
'created_at'
'conversation_id'
'user_id'

// ❌ 不好的字段名
'date'
'convId'
'ID'
```

## 最佳实践

### 1. 在插件初始化时注册表

```typescript
export function apply(ctx: Context) {
  // 立即注册表结构
  registerDatabaseModels(ctx)

  // 其他初始化...
}
```

### 2. 使用 TypeScript 接口定义类型

```typescript
// 定义数据接口
interface Conversation {
  id?: number
  name: string
  creator_id: number
  channels: string
  status: number
  created_at: Date
  updated_at: Date
  metadata: Record<string, any>
}

// 注册表时使用
ctx.model.extend('conversation' as any, {
  id: 'unsigned',
  name: 'string',
  // ...
})
```

### 3. 添加日志记录

```typescript
export function registerDatabaseModels(ctx: Context) {
  const logger = ctx.logger

  logger.info('[GameMaster] 开始注册数据库模型')

  ctx.model.extend('conversation' as any, {
    // ...
  })

  logger.info('[GameMaster] conversation 表注册成功')
}
```

### 4. 考虑字段的可选性

```typescript
// 创建记录时，非 nullable 字段必须提供值
await ctx.database.create('conversation', {
  name: '我的团',           // 必需
  creator_id: 123,         // 必需
  channels: '[]',          // 必需
  status: 0,               // 必需
  created_at: new Date(),  // 自动填充
  metadata: {},            // 可选（有默认值）
})
```

## 注意事项

1. **表结构变更**: 修改表结构后需要重启 Koishi
2. **数据迁移**: Koishi 会自动处理表结构迁移
3. **类型断言**: 使用 `as any` 绕过类型检查（如 'conversation' as any）
4. **主键字段**: 如果使用 `autoInc: true`，第一个字段必须是 `unsigned` 类型
5. **字段顺序**: 建议主键字段放在第一位
6. **索引字段**: 频繁查询的字段考虑添加索引

## 常见问题

### Q: 如何修改已存在的表结构？

A: 修改字段定义后重启 Koishi，Koishi 会自动执行迁移。

```typescript
// 修改前
ctx.model.extend('conversation' as any, {
  id: 'unsigned',
  name: 'string',
})

// 修改后（添加新字段）
ctx.model.extend('conversation' as any, {
  id: 'unsigned',
  name: 'string',
  description: 'text',  // 新增字段
})
```

### Q: 如何删除字段？

A: Koishi 不支持删除字段，可以保留字段不再使用。

### Q: list 和 json 类型有什么区别？

A:
- `list`: 存储数组 `['item1', 'item2']`
- `json`: 存储对象 `{ key: 'value' }`

## 相关 API

- [Database - CRUD 操作](./crud.md)
- [Context - 上下文对象](../core/context.md)
