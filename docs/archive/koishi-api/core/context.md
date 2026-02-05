# Context 上下文对象

## 概述

Context（上下文对象）是 Koishi 插件的核心入口点，提供了访问框架所有功能的接口。插件通过 Context 对象访问数据库、注册命令、监听事件、记录日志等。

在插件开发中，Context 对象通常作为 `apply()` 函数的第一个参数传入，并在整个插件生命周期中使用。

## 类型定义

```typescript
/**
 * Koishi 上下文对象
 * @description 插件的主要入口点，提供对框架所有功能的访问
 */
interface Context {
  /**
   * 日志记录器
   */
  logger: Logger

  /**
   * 数据库访问接口
   */
  database: Database

  /**
   * 模型扩展接口
   */
  model: Model

  /**
   * 命令注册接口
   */
  command: Command

  /**
   * 事件监听接口
   */
  on(event: string, callback: Function): Context

  /**
   * 依赖注入
   */
  inject(services: string[], callback: (ctx: Context) => void): void

  /**
   * 控制台接口
   */
  console: Console
}
```

## 核心属性和方法

### logger
- **类型**: `Logger`
- **描述**: 日志记录器，用于记录不同级别的日志信息

### database
- **类型**: `Database`
- **描述**: 数据库访问接口，提供 CRUD 操作

### model
- **类型**: `Model`
- **描述**: 数据库模型扩展接口

### command()
- **类型**: `(name: string) => Command`
- **描述**: 注册用户命令
- **返回值**: Command 对象，支持链式调用

### on()
- **类型**: `(event: string, callback: Function) => Context`
- **描述**: 监听事件
- **参数**:
  - `event`: 事件名称（如 'message'）
  - `callback`: 事件回调函数
- **返回值**: Context 对象，支持链式调用

### inject()
- **类型**: `(services: string[], callback: (ctx: Context) => void) => void`
- **描述**: 依赖注入，用于在特定服务可用后执行回调
- **参数**:
  - `services`: 服务名称数组
  - `callback`: 回调函数

### console
- **类型**: `Console`
- **描述**: 控制台接口，用于添加管理页面

## 实际应用示例

### 示例 1: 在插件中使用 Context

**文件**: [src/index.ts:16](../../src/index.ts#L16)

```typescript
import { Context, Schema } from 'koishi'

export const inject = ['database']

export function apply(ctx: Context, config: Config) {
  // 注册数据库模型
  registerDatabaseModels(ctx)

  // 注册用户命令
  registerCommands(ctx)

  // 应用消息中间件
  applyMessageMiddleware(ctx)

  // 注入控制台依赖
  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}
```

### 示例 2: 在服务中使用 Context

**文件**: [src/core/services/conversation.service.ts:71](../../src/core/services/conversation.service.ts#L71)

```typescript
export class ConversationService {
  private ctx: Context
  private logger

  constructor(ctx: Context) {
    this.ctx = ctx
    this.logger = ctx.logger
  }

  async createConversation(params: CreateConversationParams) {
    // 通过 ctx 访问数据库
    const conversation = await this.ctx.database.create('conversation', {
      name: params.name,
      creator_id: params.creatorId,
      channels: this.serializeChannels([{ ...params.channel }]),
      status: ConversationStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // 通过 ctx 记录日志
    this.logger.info('[ConversationService] conversation 记录创建成功', {
      conversationId: conversation.id,
    })

    return conversation
  }
}
```

### 示例 3: 使用 Context 注册数据库模型

**文件**: [src/core/models/index.ts:24](../../src/core/models/index.ts#L24)

```typescript
export function registerDatabaseModels(ctx: Context) {
  const logger = ctx.logger

  logger.info('[GameMaster] 开始注册数据库模型')

  // 注册 conversation 表
  ctx.model.extend('conversation' as any, {
    id: 'unsigned',
    name: 'string',
    creator_id: 'integer',
    channels: 'list',
    status: 'integer',
    created_at: 'timestamp',
    updated_at: 'timestamp',
    metadata: 'json',
  }, {
    autoInc: true,
  })

  logger.info('[GameMaster] conversation 表注册成功')
}
```

### 示例 4: 使用 Context 监听事件

**文件**: [src/core/middleware/message-recorder.ts:75](../../src/core/middleware/message-recorder.ts#L75)

```typescript
export function applyMessageMiddleware(ctx: Context) {
  const logger = ctx.logger

  // 监听所有消息事件
  ctx.on('message', async (session) => {
    try {
      logger.info('[MessageMiddleware] 监听到消息', {
        platform: session.platform,
        userId: session.userId,
        content: session.content,
      })

      // 处理消息逻辑...

    } catch (error) {
      logger.error('[MessageMiddleware] 处理消息时发生错误', error)
    }
  })
}
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**主要用途**:
- 插件入口参数传递
- 数据库操作（`ctx.database`）
- 命令注册（`ctx.command()`）
- 事件监听（`ctx.on()`）
- 日志记录（`ctx.logger`）
- 模型扩展（`ctx.model.extend()`）
- 依赖注入（`ctx.inject()`）
- 控制台集成（`ctx.console`）

**相关文件**:
- [src/index.ts](../../src/index.ts) - 插件入口
- [src/core/models/index.ts](../../src/core/models/index.ts) - 模型注册
- [src/core/services/conversation.service.ts](../../src/core/services/conversation.service.ts) - 服务层
- [src/core/commands/index.ts](../../src/core/commands/index.ts) - 命令注册
- [src/core/middleware/message-recorder.ts](../../src/core/middleware/message-recorder.ts) - 事件监听

## 使用模式

### 1. 作为插件入口参数

Context 是插件 `apply()` 函数的第一个参数：

```typescript
export function apply(ctx: Context, config: Config) {
  // 使用 ctx 实现插件功能
}
```

### 2. 传递到服务层

将 Context 传递到服务类中，以便服务访问框架功能：

```typescript
export class ConversationService {
  constructor(ctx: Context) {
    this.ctx = ctx
  }
}
```

### 3. 在整个插件中共享

Context 对象在插件生命周期中保持一致，可以在不同模块间传递使用。

## 注意事项

1. **不要修改 Context 对象**: Context 是框架提供的单例对象，不应修改其属性
2. **及时释放资源**: 如果在事件监听中创建了资源，确保在适当时机释放
3. **避免循环依赖**: 通过 Context 访问服务时，注意避免循环依赖
4. **线程安全**: Context 对象不是线程安全的，不要在异步操作中共享状态

## 最佳实践

1. **依赖注入**: 使用 `inject()` 声明插件依赖的服务
   ```typescript
   export const inject = ['database', 'console']
   ```

2. **日志记录**: 使用 `ctx.logger` 而不是 `console.log`
   ```typescript
   ctx.logger.info('信息日志')
   ctx.logger.error('错误日志', error)
   ```

3. **链式调用**: 利用 Command 和事件系统的链式调用特性
   ```typescript
   ctx.command('命令名')
     .alias('别名')
     .action(async ({ session }, arg) => {
       // 命令逻辑
     })
   ```

## 相关 API

- [Logger - 日志记录](../logger/logger.md)
- [Database - 数据库操作](../database/crud.md)
- [Model - 模型扩展](../database/models.md)
- [Command - 命令注册](../command/registration.md)
- [Events - 事件监听](../events/message.md)
- [Console - 控制台集成](../console/console.md)
