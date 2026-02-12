# Session 属性

## 概述

Session 对象包含了一次交互的完整上下文信息，包括用户身份、频道信息、消息内容等。在命令处理和事件监听中，Session 对象作为关键参数传递。

## 类型定义

```typescript
interface Session {
  platform: string
  userId: string
  username?: string
  guildId?: string
  channelId?: string
  messageId?: string
  content?: string
  elements?: Element[]
  author?: {
    name: string
    userId: string
  }
}
```

## 核心属性

### 1. platform - 平台标识符

**文件**: [src/core/middleware/message-recorder.ts:78](../../src/core/middleware/message-recorder.ts#L78)

```typescript
logger.info('[MessageMiddleware] 监听到消息', {
  platform: session.platform,  // 'discord', 'telegram' 等
})
```

### 2. userId - 用户 ID

**文件**: [src/core/middleware/message-recorder.ts:79](../../src/core/middleware/message-recorder.ts#L79)

```typescript
logger.info('[MessageMiddleware] 监听到消息', {
  userId: session.userId,  // 平台原生用户 ID
})
```

### 3. guildId - 群组/服务器 ID

**文件**: [src/core/commands/index.ts:73](../../src/core/commands/index.ts#L73)

```typescript
const channelInfo = {
  platform: session.platform,
  guildId: session.guildId || '0',  // 私聊时使用 '0'
  channelId: session.channelId || '0',
}
```

### 4. channelId - 频道 ID

**文件**: [src/core/commands/index.ts:74](../../src/core/commands/index.ts#L74)

```typescript
const channelInfo = {
  platform: session.platform,
  guildId: session.guildId || '0',
  channelId: session.channelId || '0',  // 频道 ID
}
```

### 5. content - 消息内容

**文件**: [src/core/middleware/message-recorder.ts:84](../../src/core/middleware/message-recorder.ts#L84)

```typescript
logger.info('[MessageMiddleware] 监听到消息', {
  content: session.content || '',
})
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**主要用途**:
- 获取平台信息（platform）
- 获取频道信息（guildId, channelId）
- 获取用户信息（userId, username）
- 获取消息内容（content, elements）

## 相关 API

- [Events - 消息事件](../events/message.md)
- [Command - 命令注册](../command/registration.md)
