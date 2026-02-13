# Conversation Service - 会话管理服务

## 概述

会话管理服务负责处理 TRPG 会话的创建、查询和验证等核心业务逻辑。一个频道只能有一个活跃会话。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Database**:
  - `conversation` 表
  - `user` 表
  - `conversation_member` 表
- **Models**:
  - `ConversationStatus`: 会话状态枚举 (ACTIVE, PAUSED, ENDED)
  - `Conversation`: 会话模型
  - `ChannelInfo`: 频道信息接口
- **Utils**:
  - `ChannelIdUtil`: 频道标识符工具
  - `UserIdUtil`: 用户标识符工具

### 外部依赖
- Koishi 框架

## 对外提供的服务

### 1. createConversation
创建新会话，并自动将创建者添加为会话成员（角色为 creator）。

**创建流程**:
1. 检查该频道是否已有活跃会话
2. 创建 conversation 记录（status: ACTIVE）
3. 创建 conversation_member 记录（role: creator）
4. 更新创建者用户的 conversations 列表

**参数**:
- `name: string` - 会话名称
- `creatorId: number` - 创建者的用户 ID (Koishi 原生 userId)
- `channel: { platform, guildId, channelId }` - 频道信息
- `metadata?: Record<string, any>` - 会话元数据（可选）

**返回值**:
- `success: boolean` - 是否成功
- `conversationId?: number` - 创建的会话ID（成功时）
- `error?: string` - 错误消息（失败时）

### 2. getActiveConversation
查询指定频道的活跃会话（status = ACTIVE）。

**参数**:
- `channel: { platform, guildId, channelId }` - 频道信息

**返回值**: `Promise<Conversation | null>`

### 3. getConversationById
根据会话 ID 获取会话详情。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<Conversation | null>`

### 4. updateTimestamp
更新会话的最后更新时间。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<boolean>` - 是否更新成功

### 5. pauseConversation
将会话状态设置为 PAUSED，暂停消息记录。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<boolean>`

### 6. resumeConversation
将会话状态从 PAUSED 改回 ACTIVE，恢复消息记录。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<boolean>`

### 7. endConversation
将会话状态设置为 ENDED，永久终止会话。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<boolean>`

### 8. getChannelConversations
查询指定频道的所有会话（包括活跃、暂停和已结束的）。

**参数**:
- `channel: { platform, guildId, channelId }` - 频道信息

**返回值**: `Promise<Conversation[]>`

## 会话状态

| 状态 | 说明 |
|------|------|
| ACTIVE | 活跃中，正在记录消息 |
| PAUSED | 已暂停，暂停记录消息 |
| ENDED | 已结束，不再记录消息 |

## 使用示例

```typescript
import { createConversationService } from './core/services/conversation.service'

const conversationService = createConversationService(ctx)

// 创建会话
const result = await conversationService.createConversation({
  name: '我的第一个TRPG团',
  creatorId: 1234567890,
  channel: {
    platform: 'discord',
    guildId: '123456789',
    channelId: '987654321'
  }
})

if (result.success) {
  console.log(`会话创建成功，ID: ${result.conversationId}`)
} else {
  console.error(`创建失败: ${result.error}`)
}

// 获取活跃会话
const conversation = await conversationService.getActiveConversation({
  channel: {
    platform: 'discord',
    guildId: '123456789',
    channelId: '987654321'
  }
})
```

## 工厂函数

```typescript
export function createConversationService(ctx: Context): ConversationService
```

## 私有方法

- `serializeChannels(channels)`: 将频道数组序列化为 JSON 字符串
- `deserializeChannels(channelsJson)`: 将 JSON 字符串反序列化为频道数组
- `updateUserConversations(userId, conversationId)`: 更新用户的 conversations 列表

## 日志

- `[ConversationService]` - 所有日志前缀
- info: 会话创建、状态变更
- debug: 查询操作、时间戳更新
- warn: 频道已有活跃会话
- error: 数据库错误、异常错误
