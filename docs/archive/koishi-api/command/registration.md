# 命令注册

## 概述

Koishi 提供了强大的命令系统，允许插件注册自定义命令，支持参数定义、别名设置、权限控制等功能。通过 `ctx.command()` 方法，开发者可以轻松创建用户交互的命令接口。

## 类型定义

```typescript
interface Context {
  command(name: string): Command
}

interface Command {
  alias(...names: string[]): this
  action(callback: (args: Args, ...params: any[]) => Promise<string | void>): this
}
```

## 核心方法

### command() - 注册命令

**文件**: [src/core/commands/index.ts:56](../../src/core/commands/index.ts#L56)

```typescript
ctx.command('会话创建 <名称:text>')
  .alias('gm.create')
  .action(async ({ session }, name) => {
    if (!name || name.trim().length === 0) {
      return '❌ 请提供会话名称'
    }
    
    const result = await conversationService.createConversation({
      name: name.trim(),
      creatorId: userId,
      channel: channelInfo,
    })
    
    return `✅ 会话创建成功！`
  })
```

### alias() - 设置别名

**文件**: [src/core/commands/index.ts:57](../../src/core/commands/index.ts#L57)

```typescript
ctx.command('会话创建 <名称:text>')
  .alias('gm.create')
  .action(async ({ session }, name) => {
    // 命令逻辑...
  })
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐⭐⭐ (极高)

**命令列表**:
1. `会话创建 <名称:text>` / `gm.create`
2. `会话加入 <会话ID:posint>` / `gm.join`
3. `会话列表` / `gm.list`
4. `会话帮助` / `gm.help`
5. `会话提升权限 <用户ID:text> [会话ID:posint]` / `gm.promote`
6. `会话降低权限 <用户ID:text> [会话ID:posint]` / `gm.demote`

## 相关 API

- [Command Parameters - 命令参数](./parameters.md)
- [Session - Session 对象](../session/properties.md)
