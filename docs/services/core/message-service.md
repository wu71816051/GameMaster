# Message Service - 消息服务

## 概述

消息服务提供会话消息的查询、过滤、排序和统计功能。支持批量查询用户信息以避免 N+1 查询问题。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Database**:
  - `conversation_message` 表
  - `user` 表
  - `binding` 表
- **Models**:
  - `ContentType`: 内容类型枚举
  - `MessageType`: 消息类型枚举
  - `ConversationMessage`: 会话消息模型

### 外部依赖
- Koishi 框架

## 数据类型

### ConversationMessageData
包含用户信息的消息数据。

```typescript
interface ConversationMessageData {
  id: number
  conversation_id: number
  user_id: number
  user_name?: string          // 用户名称
  user_pid?: string           // 平台用户 ID
  user_platform?: string     // 平台标识
  message_id: string
  content: string
  content_type: ContentType
  message_type: MessageType
  timestamp: Date
  platform: string
  guild_id: string
  attachments?: any
}
```

### MessageFilters
消息过滤条件。

```typescript
interface MessageFilters {
  userId?: number                    // 按用户过滤
  contentType?: ContentType          // 按内容类型过滤
  messageType?: MessageType          // 按消息类型过滤
  after?: Date                      // 时间范围起始
  before?: Date                     // 时间范围结束
}
```

### MessageStats
消息统计信息。

```typescript
interface MessageStats {
  total: number                     // 总消息数
  byContentType: Record<string, number>  // 按内容类型统计
  byMessageType: Record<string, number>   // 按消息类型统计
  byUser: Record<string, number>         // 按用户统计
}
```

## 对外提供的服务

### 1. getMessages
获取会话消息列表（带过滤）。

**工作流程**:
1. 从数据库获取消息
2. 批量查询用户信息（避免 N+1 问题）
3. 应用过滤条件

**参数**:
- `conversationId: number` - 会话 ID
- `filters?: MessageFilters` - 过滤条件（可选）

**返回值**: `Promise<ConversationMessageData[]>`

### 2. sortMessages
排序消息。

**参数**:
- `messages: ConversationMessageData[]` - 消息列表
- `order: 'asc' | 'desc'` - 排序方式（默认 'asc'）

**返回值**: `ConversationMessageData[]`

### 3. getMessageStats
统计消息信息。

**参数**:
- `messages: ConversationMessageData[]` - 消息列表

**返回值**: `MessageStats`

## 性能优化

### 批量查询避免 N+1 问题
服务使用批量查询来获取用户信息，而不是为每条消息单独查询：

```typescript
// 批量查询用户信息
const users = await this.ctx.database.get('user', {
  id: { $in: userIds },
})

// 批量查询 binding 信息
const bindings = await this.ctx.database.get('binding', {
  aid: { $in: userIds },
})
```

### 用户标识符
统计时使用 `pid@platform` 作为用户标识符，以支持跨平台场景。

## 使用示例

```typescript
import { createMessageService } from './core/services/message.service'

const messageService = createMessageService(ctx)

// 获取会话的所有消息
const messages = await messageService.getMessages(1)
console.log(`共有 ${messages.length} 条消息`)

// 按用户过滤
const userMessages = await messageService.getMessages(1, {
  userId: 1234567890
})

// 按时间范围过滤
const recentMessages = await messageService.getMessages(1, {
  after: new Date('2024-01-01'),
  before: new Date('2024-12-31')
})

// 排序消息
const sortedMessages = messageService.sortMessages(messages, 'desc')

// 统计消息
const stats = messageService.getMessageStats(messages)
console.log(`总消息数: ${stats.total}`)
console.log(`按用户统计:`, stats.byUser)
console.log(`按类型统计:`, stats.byContentType)
```

## 工厂函数

```typescript
export function createMessageService(ctx: Context): MessageService
```

## 私有方法

- `enrichWithUserInfo(messages)`: 批量查询用户信息并填充到消息中
- `applyFilters(messages, filters)`: 应用过滤条件

## 日志

- `[MessageService]` - 所有日志前缀
- debug: 查询操作、过滤结果

## 注意事项

1. **N+1 问题**: 服务已优化，使用批量查询避免 N+1 问题
2. **跨平台用户**: 统计时使用 `pid@platform` 作为用户标识
3. **过滤条件**: 所有过滤条件都是可选的，可以组合使用
