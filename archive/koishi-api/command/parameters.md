# 命令参数定义

## 概述

Koishi 命令系统支持灵活的参数定义，包括必需参数、可选参数、类型验证和默认值。参数在命令名称中定义，使用特殊的语法来指定参数类型和可选性。

## 参数定义语法

### 基本语法

```typescript
// 必需参数
ctx.command('命令名 <参数名:类型>')

// 可选参数
ctx.command('命令名 [参数名:类型]')

// 多个参数
ctx.command('命令名 <必需:类型> [可选:类型] <另一个必需:类型>')
```

### 参数类型

| 类型 | 说明 | 示例输入 | 验证规则 |
|------|------|---------|---------|
| `text` | 文本（任意内容） | `hello world` | 无限制 |
| `string` | 字符串（不含空格） | `hello` | 不含空格 |
| `posint` | 正整数 | `42` | > 0 的整数 |
| `number` | 数字 | `3.14` | 有效的数字 |
| `date` | 日期 | `2024-01-01` | 有效的日期格式 |
| `boolean` | 布尔值 | `true`, `false` | true/false |
| `user` | 用户 | `@user` | 有效的用户 |

## 实际应用示例

### 示例 1: 文本参数

**文件**: [src/core/commands/index.ts:56](../../src/core/commands/index.ts#L56)

```typescript
// 定义带文本参数的命令
ctx.command('会话创建 <名称:text>')
  .action(async ({ session }, name) => {
    // name 是文本类型，可以包含空格
    // 示例输入: 会话创建 "我的第一个 TRPG 团"

    if (!name || name.trim().length === 0) {
      return '❌ 请提供会话名称'
    }

    // 使用 name 参数...
    return `✅ 会话 "${name}" 创建成功！`
  })
```

**使用示例**:
```
用户输入: 会话创建 "我的第一个 TRPG 团"
解析结果: name = "我的第一个 TRPG 团"

用户输入: 会话创建 测试团
解析结果: name = "测试团"
```

### 示例 2: 正整数参数

**文件**: [src/core/commands/index.ts:111](../../src/core/commands/index.ts#L111)

```typescript
// 定义带正整数参数的命令
ctx.command('会话加入 <会话ID:posint>')
  .action(async ({ session }, conversationId) => {
    // conversationId 是正整数类型
    // 示例输入: 会话加入 1
    // 无效输入: 会话加入 0 (会被拒绝)
    // 无效输入: 会话加入 -1 (会被拒绝)

    if (!conversationId) {
      return '❌ 请提供会话ID'
    }

    // 使用 conversationId 参数...
    const result = await memberService.joinConversation(conversationId, userId)
    return `✅ ${result.message}`
  })
```

**使用示例**:
```
用户输入: 会话加入 1
解析结果: conversationId = 1

用户输入: 会话加入 42
解析结果: conversationId = 42

用户输入: 会话加入 0
系统提示: 参数验证失败（0 不是正整数）
```

### 示例 3: 混合参数类型

**文件**: [src/core/commands/index.ts:260](../../src/core/commands/index.ts#L260)

```typescript
// 定义带必需和可选参数的命令
ctx.command('会话提升权限 <用户ID:text> [会话ID:posint]')
  .action(async ({ session }, targetUserId, conversationId) => {
    // targetUserId: text 类型（必需）
    // conversationId: posint 类型（可选）

    // 检查必需参数
    if (!targetUserId) {
      return '❌ 请提供要提升权限的用户ID\n示例：会话提升权限 3750403297 1'
    }

    // 处理可选参数
    if (!conversationId) {
      // 如果未提供会话ID，尝试使用当前频道的活跃会话
      const channelInfo = {
        platform: session.platform,
        guildId: session.guildId || '0',
        channelId: session.channelId || '0',
      }

      const activeConversations = await conversationService.getActiveConversation({
        channel: channelInfo,
      })

      if (activeConversations) {
        conversationId = activeConversations.id
      }
    }

    // 使用参数...
    const result = await memberService.updateMemberRole(
      conversationId,
      operatorId,
      targetUserId,
      'admin'
    )

    return `✅ ${result.message}`
  })
```

**使用示例**:
```
// 提供所有参数
用户输入: 会话提升权限 3750403297 1
解析结果: targetUserId = "3750403297", conversationId = 1

// 只提供必需参数
用户输入: 会话提升权限 3750403297
解析结果: targetUserId = "3750403297", conversationId = undefined
// 系统会使用当前频道的活跃会话
```

### 示例 4: 无参数命令

**文件**: [src/core/commands/index.ts:153](../../src/core/commands/index.ts#L153)

```typescript
// 定义不带参数的命令
ctx.command('会话列表')
  .action(async ({ session }) => {
    // 没有额外参数，只使用 session

    const channelInfo = {
      platform: session.platform,
      guildId: session.guildId || '0',
      channelId: session.channelId || '0',
    }

    const conversations = await conversationService.getChannelConversations({
      channel: channelInfo,
    })

    return `📋 该频道共有 ${conversations.length} 个会话`
  })
```

## 参数验证

### 自动验证

Koishi 会自动验证参数类型，不符合类型的输入会被拒绝：

```typescript
ctx.command('测试 <数字:posint>')
  .action(async ({ session }, num) => {
    return `数字是 ${num}`
  })

// 用户输入: 测试 5
// 结果: 数字是 5

// 用户输入: 测试 0
// 结果: 参数验证失败（0 不是正整数）

// 用户输入: 测试 abc
// 结果: 参数验证失败（abc 不是正整数）
```

### 手动验证

在 action 回调中进行额外的验证：

```typescript
ctx.command('会话创建 <名称:text>')
  .action(async ({ session }, name) => {
    // 手动验证
    if (!name || name.trim().length === 0) {
      return '❌ 请提供会话名称\n示例：会话创建 "我的第一个TRPG团"'
    }

    if (name.length > 100) {
      return '❌ 会话名称过长（最多 100 个字符）'
    }

    // 验证通过，继续处理...
  })
```

## 参数传递到 action

### 参数顺序

action 回调的参数按命令定义的顺序传递：

```typescript
ctx.command('命令 <参数1:text> <参数2:posint> [参数3:string]')
  .action(async ({ session }, param1, param2, param3) => {
    // param1: 第一个必需参数
    // param2: 第二个必需参数
    // param3: 可选参数（未提供时为 undefined）

    console.log(param1, param2, param3)
  })
```

### 解构 session

action 回调的第一个参数是包含 session 的对象：

```typescript
ctx.command('命令 <参数:text>')
  .action(async ({ session }, param) => {
    // { session } 是解构写法
    // 等价于：
    // .action(async (args, param) => {
    //   const session = args.session
    // })

    const userId = session.userId
    const platform = session.platform
    // ...
  })
```

## 特殊参数处理

### 引号处理

text 类型参数可以包含空格，使用引号包裹：

```
用户输入: 会话创建 "我的第一个 TRPG 团"
解析结果: name = "我的第一个 TRPG 团"

用户输入: 会话创建 我的团
解析结果: name = "我的团"
```

### 多个文本参数

```typescript
ctx.command('命令 <标题:text> <内容:text>')
  .action(async ({ session }, title, content) => {
    // 由于 text 可以包含空格，建议使用引号
    // 输入: 命令 "标题" "内容"
  })
```

## 参数默认值

### 在 action 中设置

```typescript
ctx.command('命令 [数量:number]')
  .action(async ({ session }, count) => {
    // 设置默认值
    const actualCount = count || 10

    return `数量是 ${actualCount}`
  })
```

### 使用解构默认值

```typescript
ctx.command('命令 [选项:string]')
  .action(async ({ session }, option = 'default') => {
    // 如果未提供 option，默认为 'default'

    return `选项是 ${option}`
  })
```

## 项目中的参数使用

| 命令 | 参数定义 | 参数类型 | 说明 |
|------|---------|---------|------|
| 会话创建 | `<名称:text>` | text, 必需 | 会话名称 |
| 会话加入 | `<会话ID:posint>` | posint, 必需 | 会话 ID |
| 会话列表 | 无 | - | 无参数 |
| 会话帮助 | 无 | - | 无参数 |
| 会话提升权限 | `<用户ID:text> [会话ID:posint]` | text, posint | 用户 ID（必需），会话 ID（可选） |
| 会话降低权限 | `<用户ID:text> [会话ID:posint]` | text, posint | 用户 ID（必需），会话 ID（可选） |

## 最佳实践

### 1. 合理选择参数类型

```typescript
// ✅ 使用合适的类型
ctx.command('命令 <ID:posint>')     // 正整数
ctx.command('命令 <名称:text>')     // 任意文本
ctx.command('命令 <选项:string>')   // 简单词

// ❌ 类型不匹配
ctx.command('命令 <年龄:text>')     // 应该用 number
ctx.command('命令 <ID:string>')     // 应该用 posint
```

### 2. 提供清晰的错误提示

```typescript
// ✅ 好的错误提示
ctx.command('会话创建 <名称:text>')
  .action(async ({ session }, name) => {
    if (!name) {
      return '❌ 请提供会话名称\n示例：会话创建 "我的第一个TRPG团"'
    }
  })

// ❌ 错误提示不清晰
if (!name) {
  return '错误'
}
```

### 3. 处理可选参数

```typescript
// ✅ 好的做法
ctx.command('命令 [可选:posint]')
  .action(async ({ session }, optional) => {
    if (!optional) {
      // 使用默认值或备用逻辑
      optional = getDefaultId()
    }
    // 使用 optional...
  })

// ❌ 不处理可选参数
ctx.command('命令 [可选:posint]')
  .action(async ({ session }, optional) => {
    // 直接使用 optional 可能为 undefined
    const id = optional  // 可能导致错误
  })
```

### 4. 参数验证

```typescript
// ✅ 验证参数
ctx.command('命令 <名称:text>')
  .action(async ({ session }, name) => {
    if (!name || name.trim().length === 0) {
      return '❌ 名称不能为空'
    }

    if (name.length > 100) {
      return '❌ 名称过长（最多 100 个字符）'
    }

    // 继续处理...
  })
```

## 注意事项

1. **类型严格**: 参数类型会被自动验证，不符合类型会报错
2. **参数顺序**: action 回调中的参数顺序必须与命令定义一致
3. **必需参数**: 使用 `<>` 定义的参数是必需的
4. **可选参数**: 使用 `[]` 定义的参数是可选的，可能为 undefined
5. **text 类型**: text 类型可以包含空格，建议用户使用引号
6. **参数解构**: 第一个参数使用 `{ session }` 解构获取 session 对象

## 相关 API

- [Command Registration - 命令注册](./registration.md)
- [Session - Session 对象](../session/properties.md)
- [Command 官方文档](https://koishi.chat/zh-CN/api/core/command.html) - Koishi 官方文档
