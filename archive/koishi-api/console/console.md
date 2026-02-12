# 控制台集成

## 概述

Koishi Console 是 Koishi 的 Web 管理界面，插件可以通过 `ctx.console` 接口添加自定义页面和功能。控制台集成允许插件提供可视化的管理界面、数据查看和配置管理。

## 类型定义

```typescript
/**
 * Console 接口
 */
interface Console {
  /**
   * 添加控制台页面入口
   * @param entry 页面配置
   */
  addEntry(entry: Console.Entry): void
}

/**
 * 页面入口配置
 */
interface Console.Entry {
  /** 开发环境入口文件 */
  dev: string

  /** 生产环境入口文件 */
  prod: string
}
```

## 核心方法

### ctx.console.addEntry() - 添加页面入口

在控制台中添加一个自定义页面入口。

#### 方法签名
```typescript
addEntry(entry: Console.Entry): void
```

#### 参数
- `entry`: 页面入口配置
  - `dev`: 开发环境的入口文件路径
  - `prod`: 生产环境的入口文件路径

#### 返回值
无返回值

### ctx.inject() - 依赖注入

注入控制台服务，确保控制台可用后再执行回调。

#### 方法签名
```typescript
inject(services: string[], callback: (ctx: Context) => void): void
```

#### 参数
- `services`: 服务名称数组，如 `['console']`
- `callback`: 控制台可用后的回调函数

#### 返回值
无返回值

## 实际应用示例

### 示例 1: 添加控制台页面

**文件**: [src/index.ts:25-30](../../src/index.ts#L25-L30)

```typescript
import { Context } from 'koishi'
import { resolve } from 'path'

export function apply(ctx: Context, config: Config) {
  // 注册数据库模型
  registerDatabaseModels(ctx)

  // 注册命令
  registerCommands(ctx)

  // 注入控制台依赖
  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),   // 开发环境
      prod: resolve(__dirname, '../dist'),            // 生产环境
    })
  })
}
```

### 示例 2: 完整的控制台集成

```typescript
import { Context, Schema } from 'koishi'
import { resolve } from 'path'

export interface Config {
  /** 是否启用控制台页面 */
  enableConsole?: boolean
}

export const Config: Schema<Config> = Schema.object({
  enableConsole: Schema.boolean().default(true),
})

export function apply(ctx: Context, config: Config) {
  // 检查是否启用控制台
  if (!config.enableConsole) {
    return
  }

  // 注入控制台依赖
  ctx.inject(['console'], (ctx) => {
    // 添加控制台页面
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })

    ctx.logger.info('[GameMaster] 控制台页面已注册')
  })
}
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐ (中)

**主要用途**:
- 添加插件管理页面到控制台
- 提供可视化的数据查看和编辑
- 管理插件配置

**当前状态**:
- 项目已添加控制台入口
- 客户端文件位于 `client/` 目录
- 生产构建输出到 `dist/` 目录

**相关文件**:
- [src/index.ts](../../src/index.ts) - 控制台入口注册
- [client/index.ts](../../client/index.ts) - 客户端入口
- [client/](../../client/) - 前端代码目录

## 控制台页面开发

### 1. 创建客户端入口

**文件**: [client/index.ts](../../client/index.ts)

```typescript
import {} from '@koishijs/client'

// 控制台页面逻辑
export default {
  // 页面配置
}
```

### 2. 开发环境配置

开发环境使用 TypeScript 源码：

```typescript
ctx.console.addEntry({
  dev: resolve(__dirname, '../client/index.ts'),  // TypeScript 文件
  prod: resolve(__dirname, '../dist'),            // 编译后的文件
})
```

### 3. 生产环境配置

生产环境使用编译后的文件：

```bash
# 构建客户端代码
npm run build

# 输出到 dist/ 目录
```

## 依赖注入详解

### 为什么需要 inject()

控制台插件可能未安装或未启用，使用 `inject()` 确保只在控制台可用时才执行相关代码。

```typescript
// ❌ 不好的做法（控制台不存在时会报错）
ctx.console.addEntry({
  dev: resolve(__dirname, '../client/index.ts'),
  prod: resolve(__dirname, '../dist'),
})

// ✅ 好的做法（使用 inject）
ctx.inject(['console'], (ctx) => {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
})
```

### 多个依赖注入

```typescript
// 注入多个服务
ctx.inject(['console', 'database'], (ctx) => {
  // console 和 database 都可用时执行
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
})
```

## 控制台页面示例

### 基本页面结构

```typescript
// client/index.ts
import {} from '@koishijs/client'

export default {
  // 页面 ID
  id: 'gamemaster',

  // 页面名称
  name: 'Game Master',

  // 页面图标（使用 Material Icons）
  icon: 'game',

  // 页面组件
  component: () => import('./views/index.vue'),

  // 页面权限
  authority: 4,
}
```

### 使用 Vue 组件

```vue
<!-- client/views/index.vue -->
<template>
  <div class="gamemaster-page">
    <h1>TRPG 会话管理</h1>

    <k-card>
      <template #header>会话列表</template>
      <div v-for="conv in conversations" :key="conv.id">
        {{ conv.name }}
      </div>
    </k-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { database } from '@koishijs/client'

const conversations = ref([])

onMounted(async () => {
  // 获取会话列表
  conversations.value = await database.get('conversation', {})
})
</script>
```

### 使用 Koishi 客户端组件

```vue
<template>
  <div>
    <!-- 卡片 -->
    <k-card title="会话管理">
      <p>会话内容</p>
    </k-card>

    <!-- 表格 -->
    <k-table :data="conversations">
      <k-table-column prop="name" label="名称" />
      <k-table-column prop="status" label="状态" />
    </k-table>

    <!-- 表单 -->
    <k-form :model="form">
      <k-form-item label="会话名称">
        <k-input v-model="form.name" />
      </k-form-item>
    </k-form>

    <!-- 对话框 -->
    <k-dialog v-model="dialogVisible" title="创建会话">
      <p>对话框内容</p>
    </k-dialog>
  </div>
</template>
```

## 路径解析

### resolve() 方法

使用 Node.js 的 `path.resolve()` 解析相对路径：

```typescript
import { resolve } from 'path'

// 解析相对路径
const devPath = resolve(__dirname, '../client/index.ts')

// __dirname 是当前文件的目录
// ../client/index.ts 是相对于当前文件的路径

// 示例：
// 当前文件: /path/to/plugin/dist/index.js
// __dirname: /path/to/plugin/dist
// 解析结果: /path/to/plugin/client/index.ts
```

### 常见路径模式

```typescript
// 1. 同级目录
resolve(__dirname, './client/index.ts')

// 2. 上级目录
resolve(__dirname, '../client/index.ts')

// 3. 上级目录的子目录
resolve(__dirname, '../lib/index.js')

// 4. 绝对路径
resolve('/path/to/file')
```

## 注意事项

1. **控制台依赖**: 必须使用 `inject()` 包裹控制台相关代码
2. **路径正确**: 确保开发和生产路径都正确
3. **构建输出**: 生产环境需要先构建客户端代码
4. **版本兼容**: 客户端代码需要与 Koishi 版本兼容
5. **权限控制**: 合理设置页面访问权限

## 最佳实践

### 1. 条件启用控制台

```typescript
export interface Config {
  enableConsole?: boolean
}

export function apply(ctx: Context, config: Config) {
  if (!config.enableConsole) {
    ctx.logger.info('[GameMaster] 控制台页面已禁用')
    return
  }

  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({...})
  })
}
```

### 2. 添加日志记录

```typescript
ctx.inject(['console'], (ctx) => {
  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.logger.info('[GameMaster] 控制台页面已注册', {
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })
})
```

### 3. 错误处理

```typescript
ctx.inject(['console'], (ctx) => {
  try {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
    ctx.logger.info('[GameMaster] 控制台页面注册成功')
  } catch (error) {
    ctx.logger.error('[GameMaster] 控制台页面注册失败', error)
  }
})
```

## 相关 API

- [Context - 上下文对象](../core/context.md)
- [Console 官方文档](https://koishi.chat/zh-CN/api/console/) - Koishi 官方文档
- [@koishijs/client - 客户端文档](https://koishi.chat/zh-CN/api/console/client.html) - 客户端 API
