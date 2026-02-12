# Logger 日志记录

## 概述

Koishi 提供了强大的日志记录系统，通过 `ctx.logger` 对象，插件可以记录不同级别的日志信息。日志系统支持多个日志级别、结构化数据输出和日志分类。

## 类型定义

```typescript
interface Logger {
  info(...args: any[]): void
  debug(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}
```

## 核心方法

### 1. info() - 信息日志

**文件**: [src/core/commands/index.ts:60](../../src/core/commands/index.ts#L60)

```typescript
logger.info('[Command:会话创建] 执行命令', {
  name,
  userId: session.userId
})
```

### 2. debug() - 调试日志

**文件**: [src/core/models/index.ts:30](../../src/core/models/index.ts#L30)

```typescript
logger.debug('[GameMaster] 注册 conversation 表')
```

### 3. warn() - 警告日志

**文件**: [src/core/commands/index.ts:97](../../src/core/commands/index.ts#L97)

```typescript
logger.warn('[Command:会话创建] 创建失败', { error: result.error })
```

### 4. error() - 错误日志

**文件**: [src/core/commands/index.ts:101](../../src/core/commands/index.ts#L101)

```typescript
logger.error('[Command:会话创建] 执行命令时发生错误', error)
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**日志统计**:
- `logger.info()`: 约 40+ 次使用
- `logger.debug()`: 约 15+ 次使用
- `logger.warn()`: 约 10+ 次使用
- `logger.error()`: 约 10+ 次使用

## 相关 API

- [Context - 上下文对象](../core/context.md)
