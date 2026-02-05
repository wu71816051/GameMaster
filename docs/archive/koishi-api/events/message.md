# 消息事件

## 概述

Koishi 的事件系统允许插件监听和处理各种事件，其中最常用的是消息事件（message 事件）。通过 `ctx.on()` 方法，插件可以监听用户发送的消息，并执行相应的业务逻辑。

## 类型定义

```typescript
interface Context {
  on(event: string, callback: (session: Session) => void | Promise<void>): Context
}
```

## 核心方法

### on() - 监听事件

**文件**: [src/core/middleware/message-recorder.ts:75](../../src/core/middleware/message-recorder.ts#L75)

```typescript
ctx.on('message', async (session) => {
  try {
    logger.info('[MessageMiddleware] 监听到消息', {
      platform: session.platform,
      userId: session.userId,
      content: session.content,
    })
    
    // 查询活跃会话
    const conversation = await conversationService.getActiveConversation({
      channel: {
        platform: session.platform,
        guildId: session.guildId || '',
        channelId: session.channelId || '',
      }
    })
    
    if (!conversation) {
      return
    }
    
    // 处理消息...
    
  } catch (error) {
    logger.error('[MessageMiddleware] 处理消息时发生错误', error)
  }
})
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐ (高)

**主要用途**:
- 自动记录会话成员的消息到数据库
- 检测消息内容类型（命令、OOC、检定等）
- 提取消息附件（图片、文件）

## 相关 API

- [Session - Session 对象](../session/properties.md)
- [Context - 上下文对象](../core/context.md)
