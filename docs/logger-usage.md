# Logger 使用指南

## 快速开始

### 1. 导入 Logger

```typescript
import { createLogger } from './utils'
```

### 2. 创建 Logger 实例

```typescript
const logger = createLogger(ctx, 'YourServiceName')
```

### 3. 使用 Logger

```typescript
logger.info('这是一条信息')
logger.warn('这是一条警告')
logger.error('这是一条错误')
logger.debug('这是一条调试信息')
```

---

## 基础方法

### `info(message, ...args)`
记录一般性的操作信息

```typescript
logger.info('会话创建成功', 'ID: 123', '名称: TRPG团')
// 输出: [YourServiceName] 会话创建成功 ID: 123 名称: TRPG团
```

### `warn(message, ...args)`
记录潜在的问题

```typescript
logger.warn('频道已有活跃会话', '频道ID: discord:123:456')
```

### `error(message, ...args)`
记录错误信息

```typescript
logger.error('数据库操作失败', error.message, error.stack)
```

### `debug(message, ...args)`
记录详细的调试信息（通常只在开发环境）

```typescript
logger.debug('查询数据库', { table: 'conversation', query: { id: 1 } })
```

---

## 专用方法

### `logConversation(operation, conversationId, details)`
记录会话相关操作

```typescript
logger.logConversation('创建', conversationId, {
  name: 'TRPG团',
  creatorId: 'discord:123'
})
// 输出: [YourServiceName] 会话创建 ID: 123 {"name":"TRPG团",...}
```

**常用操作**: '创建', '暂停', '恢复', '结束', '删除'

### `logMember(operation, userId, conversationId, details)`
记录成员相关操作

```typescript
logger.logMember('加入', userId, conversationId)
logger.logMember('离开', userId, conversationId)
logger.logMember('权限提升', userId, conversationId, { newRole: 'admin' })
```

**常用操作**: '加入', '离开', '权限提升', '权限降低', '踢出'

### `logPermissionDenied(userId, operation, reason)`
记录权限验证失败

```typescript
logger.logPermissionDenied(userId, '修改角色', '只有创建者可以修改角色')
// 输出: [YourServiceName] 权限验证失败 用户: discord:123, 操作: 修改角色, 原因: ...
```

### `logDatabase(operation, table, details)`
记录数据库操作

```typescript
logger.logDatabase('create', 'conversation', { name: 'Test' })
// 输出: [YourServiceName] 数据库操作: create 表: conversation {"name":"Test"}
```

### `logDatabaseError(operation, table, error)`
记录数据库错误

```typescript
try {
  await ctx.database.create('conversation', data)
} catch (error) {
  logger.logDatabaseError('create', 'conversation', error)
}
```

### `logMessage(operation, messageId, conversationId, details)`
记录消息相关操作

```typescript
logger.logMessage('记录成功', messageId, conversationId)
logger.logMessage('记录失败', messageId, conversationId, { error: '非成员' })
```

---

## 实际使用场景

### 场景 1: 在服务类中使用

```typescript
import { createLogger } from '../utils'

class ConversationService {
  private logger: Logger

  constructor(private ctx: Context) {
    this.logger = createLogger(ctx, 'ConversationService')
  }

  async createConversation(name: string, creatorId: string) {
    this.logger.info('开始创建会话', { name, creatorId })

    try {
      // 业务逻辑...
      const conversation = await this.ctx.database.create('conversation', {...})

      this.logger.logConversation('创建成功', conversation.id, { name })
      return conversation
    } catch (error) {
      this.logger.error('会话创建失败', error.message)
      throw error
    }
  }
}
```

### 场景 2: 在中间件中使用

```typescript
function setupMessageMiddleware(ctx: Context) {
  const logger = createLogger(ctx, 'MessageMiddleware')

  ctx.on('message', async (session) => {
    logger.debug('处理消息', `ID: ${session.messageId}`)

    try {
      // 处理消息...
      logger.logMessage('记录成功', session.messageId, conversationId)
    } catch (error) {
      logger.error('消息处理失败', error.message)
    }
  })
}
```

### 场景 3: 在命令中使用

```typescript
ctx.command('会话创建 <名称:text>')
  .action(async ({ session }, name) => {
    const logger = createLogger(session.ctx, 'Command')

    logger.info('执行命令: 会话创建', { name, userId: session.userId })

    try {
      // 执行命令...
      logger.logOperation('会话创建', { name, creatorId: session.userId })
      return `会话 "${name}" 创建成功`
    } catch (error) {
      logger.error('命令执行失败', error.message)
      return `创建失败: ${error.message}`
    }
  })
```

---

## 日志级别说明

| 级别 | 方法 | 用途 | 示例 |
|------|------|------|------|
| **error** | `logger.error()` | 错误信息，需要立即关注 | 数据库连接失败 |
| **warn** | `logger.warn()` | 警告信息，可能存在问题 | 权限不足、重复操作 |
| **info** | `logger.info()` | 一般信息，记录正常操作 | 会话创建成功、成员加入 |
| **debug** | `logger.debug()` | 调试信息，详细的执行过程 | 查询参数、中间变量 |

---

## 最佳实践

### 1. 使用有意义的前缀

```typescript
// ✅ 推荐
const logger = createLogger(ctx, 'ConversationService')

// ❌ 不推荐
const logger = createLogger(ctx, 'Service')
```

### 2. 记录关键操作

```typescript
// ✅ 推荐 - 记录关键操作
logger.logConversation('创建', conversationId, { name, creatorId })

// ❌ 不推荐 - 记录过多细节
logger.debug('变量赋值', { x: 1, y: 2 })
```

### 3. 包含上下文信息

```typescript
// ✅ 推荐 - 包含关键信息
logger.error('会话创建失败', `ID: ${id}`, `错误: ${error.message}`)

// ❌ 不推荐 - 信息不足
logger.error('失败')
```

### 4. 使用专用方法

```typescript
// ✅ 推荐 - 使用专用方法
logger.logConversation('创建', conversationId)

// ❌ 不推荐 - 使用通用方法
logger.info('会话创建', `ID: ${conversationId}`)
```

### 5. 正确处理错误

```typescript
// ✅ 推荐 - 记录完整错误信息
try {
  await operation()
} catch (error) {
  logger.error('操作失败', error.message, error.stack)
}

// ❌ 不推荐 - 只记录错误消息
catch (error) {
  logger.error('操作失败', '出错了')
}
```

---

## 注意事项

1. **日志级别选择**
   - 开发环境可以使用 `debug` 级别
   - 生产环境建议使用 `info` 及以上级别

2. **敏感信息保护**
   - 不要记录密码、令牌等敏感信息
   - 用户 ID 等信息可以记录用于追踪

3. **性能考虑**
   - 避免在循环中频繁记录日志
   - 大量数据日志使用 `debug` 级别

4. **日志格式**
   - 保持一致的日志格式
   - 使用 JSON 对象传递结构化数据

---

## 完整示例

```typescript
import { Context } from 'koishi'
import { createLogger } from './utils'

export class ConversationService {
  private logger: Logger

  constructor(private ctx: Context) {
    this.logger = createLogger(ctx, 'ConversationService')
  }

  async createConversation(name: string, creatorId: string, channelId: string) {
    // 开始
    this.logger.info('创建会话', { name, creatorId, channelId })

    try {
      // 验证
      this.logger.debug('验证频道唯一性', channelId)
      const existing = await this.ctx.database.get('conversation', {
        channels: { $contains: channelId }
      })

      if (existing.length > 0) {
        this.logger.warn('频道已有活跃会话', { channelId })
        throw new Error('该频道已有活跃会话')
      }

      // 创建
      this.logger.logDatabase('create', 'conversation')
      const [conversation] = await this.ctx.database.create('conversation', {
        name,
        creator_id: creatorId,
        channels: [{ platform: 'discord', guildId: 'temp', channelId }],
        status: 0
      })

      // 成功
      this.logger.logConversation('创建成功', conversation.id!, { name })
      return conversation

    } catch (error) {
      // 失败
      this.logger.error('会话创建失败', error.message, error.stack)
      throw error
    }
  }
}
```
