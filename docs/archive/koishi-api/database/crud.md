# 数据库 CRUD 操作

## 概述

Koishi 提供了简单而强大的数据库操作接口，支持常见的 CRUD（创建、读取、更新、删除）操作。通过 `ctx.database` 对象，开发者可以轻松地进行数据库操作，无需编写原生 SQL 语句。

数据库接口支持多种数据库后端（如 MySQL、PostgreSQL、SQLite 等），并提供了统一的 API。

## 类型定义

```typescript
interface Database {
  create<T extends Table>(table: T, data: Partial<Tables[T]>): Promise<Tables[T]>
  get<T extends Table>(table: T, query?: Query<T>): Promise<Tables[T][]>
  set<T extends Table>(table: T, query: Query<T>, data: Partial<Tables[T]>): Promise<void>
  remove<T extends Table>(table: T, query: Query<T>): Promise<void>
}
```

## 核心方法

### 1. create() - 创建记录

**文件**: [src/core/services/conversation.service.ts:163](../../src/core/services/conversation.service.ts#L163)

```typescript
const conversation = await this.ctx.database.create('conversation', {
  name: params.name,
  creator_id: params.creatorId,
  channels: this.serializeChannels([{ ...params.channel }]),
  status: ConversationStatus.ACTIVE,
  created_at: now,
  updated_at: now,
})
```

### 2. get() - 查询记录

**文件**: [src/core/services/conversation.service.ts:253](../../src/core/services/conversation.service.ts#L253)

```typescript
const conversations = await this.ctx.database.get('conversation', {
  status: ConversationStatus.ACTIVE,
})
```

### 3. set() - 更新记录

**文件**: [src/core/services/conversation.service.ts:339](../../src/core/services/conversation.service.ts#L339)

```typescript
await this.ctx.database.set('conversation', { id: conversationId }, {
  updated_at: new Date(),
})
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**主要用途**:
- 创建会话、成员、消息记录
- 查询活跃会话、成员信息
- 更新会话状态、用户信息

## 相关 API

- [Model - 模型扩展](./models.md)
- [Context - 上下文对象](../core/context.md)
