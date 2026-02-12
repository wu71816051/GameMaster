# Schema 配置模式

## 概述

Schema 是 Koishi 的配置模式定义系统，用于描述插件配置的结构、类型和验证规则。通过 Schema，插件可以提供类型安全的配置，并在配置界面中自动生成表单。

Schema 系统支持多种数据类型、嵌套结构、默认值设置和配置验证。

## 类型定义

```typescript
/**
 * Schema 接口
 */
interface Schema<T = any> {
  /**
   * 配置类型描述
   */
  type: string

  /**
   * 定义配置结构
   */
  define<T>(config: SchemaConfig<T>): Schema<T>

  /**
   * 验证配置值
   */
  validate(value: any): T

  /**
   * 设置默认值
   */
  default(value: T): Schema<T>

  /**
   * 添加描述
   */
  description(desc: string): Schema<T>
}

/**
 * Schema 静态方法
 */
interface SchemaStatic {
  /**
   * 创建对象类型 Schema
   */
  object<T extends Record<string, any>>(config: T): Schema<T>

  /**
   * 创建数组类型 Schema
   */
  array<T>(item: Schema<T>): Schema<T[]>

  /**
   * 创建字符串类型 Schema
   */
  string(): Schema<string>

  /**
   * 创建数字类型 Schema
   */
  number(): Schema<number>

  /**
   * 创建布尔类型 Schema
   */
  boolean(): Schema<boolean>

  /**
   * 创建任意类型 Schema
   */
  any(): Schema<any>
}
```

## 核心方法

### 1. Schema.object() - 对象类型

定义一个对象类型的配置结构。

#### 方法签名
```typescript
Schema.object<T extends Record<string, any>>(config: T): Schema<T>
```

#### 参数
- `config`: 配置对象，每个属性都是一个 Schema

#### 返回值
返回 Schema 对象

#### 示例

**文件**: [src/index.ts:12](../../src/index.ts#L12)

```typescript
import { Context, Schema } from 'koishi'

// 定义配置接口
export interface Config {}

// 定义配置 Schema
export const Config: Schema<Config> = Schema.object({})
```

### 2. 完整配置示例

```typescript
import { Context, Schema } from 'koishi'

// 定义配置接口
export interface Config {
  /** 是否启用消息记录 */
  enabled?: boolean

  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'

  /** 数据库配置 */
  database?: {
    /** 主机地址 */
    host: string
    /** 端口 */
    port: number
  }

  /** 关键词列表 */
  keywords?: string[]
}

// 定义配置 Schema
export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('是否启用消息记录').default(true),

  logLevel: Schema.union(['debug', 'info', 'warn', 'error'] as const)
    .description('日志级别')
    .default('info'),

  database: Schema.object({
    host: Schema.string().description('主机地址').default('localhost'),
    port: Schema.number().description('端口').default(3306),
  }).description('数据库配置'),

  keywords: Schema.array(Schema.string())
    .description('关键词列表')
    .default([]),
})
```

## 项目中的使用情况

**使用频率**: ⭐⭐⭐ (中)

**主要用途**:
- 定义插件配置结构
- 提供配置验证
- 在控制台生成配置表单

**当前状态**:
- 项目中定义了空的 Config 接口
- 使用 `Schema.object({})` 创建空配置
- 未来可以扩展为完整的配置 Schema

**相关文件**:
- [src/index.ts](../../src/index.ts) - Config 定义和导出

## 常用 Schema 类型

### 1. 基本类型

```typescript
Schema.string()    // 字符串
Schema.number()    // 数字
Schema.boolean()   // 布尔值
Schema.any()       // 任意类型
```

### 2. 对象类型

```typescript
Schema.object({
  name: Schema.string(),
  age: Schema.number(),
  active: Schema.boolean(),
})
```

### 3. 数组类型

```typescript
Schema.array(Schema.string())  // 字符串数组
Schema.array(Schema.number())  // 数字数组
```

### 4. 枚举类型

```typescript
Schema.union(['option1', 'option2', 'option3'] as const)
```

### 5. 嵌套对象

```typescript
Schema.object({
  basic: Schema.object({
    name: Schema.string(),
    age: Schema.number(),
  }),
  advanced: Schema.object({
    settings: Schema.object({
      enabled: Schema.boolean(),
    }),
  }),
})
```

## Schema 方法链

### description() - 添加描述

```typescript
Schema.string().description('用户名')
Schema.number().description('端口号')
Schema.boolean().description('是否启用')
```

### default() - 设置默认值

```typescript
Schema.string().default('hello')
Schema.number().default(100)
Schema.boolean().default(true)
Schema.array(Schema.string()).default([])
```

### required() - 设置必填

```typescript
Schema.string().required()
Schema.number().required()
```

## 实际应用示例

### 示例 1: 简单配置

```typescript
export interface Config {
  /** 命令前缀 */
  prefix?: string
}

export const Config: Schema<Config> = Schema.object({
  prefix: Schema.string()
    .description('命令前缀')
    .default('/'),
})
```

### 示例 2: 复杂配置

```typescript
export interface Config {
  /** 消息记录配置 */
  messageLog?: {
    /** 是否启用 */
    enabled: boolean
    /** 最大记录数 */
    maxRecords: number
  }

  /** 权限配置 */
  permissions?: {
    /** 管理员列表 */
    admins: string[]
    /** 黑名单 */
    blacklist: string[]
  }
}

export const Config: Schema<Config> = Schema.object({
  messageLog: Schema.object({
    enabled: Schema.boolean()
      .description('是否启用消息记录')
      .default(true),
    maxRecords: Schema.number()
      .description('最大记录数')
      .default(1000)
      .min(1)
      .max(10000),
  }).description('消息记录配置'),

  permissions: Schema.object({
    admins: Schema.array(Schema.string())
      .description('管理员列表')
      .default([]),
    blacklist: Schema.array(Schema.string())
      .description('黑名单')
      .default([]),
  }).description('权限配置'),
})
```

### 示例 3: 条件配置

```typescript
export interface Config {
  /** 认证方式 */
  authType: 'token' | 'oauth'

  /** Token 配置（authType 为 token 时需要） */
  tokenConfig?: {
    token: string
  }

  /** OAuth 配置（authType 为 oauth 时需要） */
  oauthConfig?: {
    clientId: string
    clientSecret: string
  }
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    authType: Schema.union(['token', 'oauth'] as const)
      .description('认证方式')
      .default('token'),
  }),

  Schema.intersect([
    Schema.object({
      tokenConfig: Schema.object({
        token: Schema.string().description('Token'),
      }),
    }).hidden((config) => config.authType !== 'token'),

    Schema.object({
      oauthConfig: Schema.object({
        clientId: Schema.string().description('Client ID'),
        clientSecret: Schema.string().description('Client Secret'),
      }),
    }).hidden((config) => config.authType !== 'oauth'),
  ]),
])
```

## 依赖注入

项目使用 `inject` 声明插件依赖的服务。

**文件**: [src/index.ts:14](../../src/index.ts#L14)

```typescript
export const inject = ['database']
```

这表示插件依赖 Koishi 的数据库服务。

## 配置使用

### 在插件中访问配置

```typescript
export function apply(ctx: Context, config: Config) {
  // config 是经过 Schema 验证的配置对象

  if (config.enabled) {
    // 启用功能
  }

  const port = config.database?.port || 3306

  // 使用配置...
}
```

### 配置文件（YAML）

```yaml
plugins:
  gamemaster:
    enabled: true
    logLevel: info
    database:
      host: localhost
      port: 3306
    keywords:
      - help
      - about
```

## 最佳实践

### 1. 提供合理的默认值

```typescript
// ✅ 好的做法
Schema.string().default('default value')
Schema.number().default(0)
Schema.boolean().default(true)

// ❌ 不好的做法（缺少默认值）
Schema.string()
Schema.number()
```

### 2. 添加清晰的描述

```typescript
// ✅ 好的做法
Schema.string()
  .description('用户名，用于登录系统')
  .default('admin')

// ❌ 不好的做法（描述不清晰）
Schema.string().description('名称')
```

### 3. 使用 TypeScript 接口

```typescript
// 先定义接口
export interface Config {
  enabled?: boolean
  prefix?: string
}

// 再定义 Schema
export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(true),
  prefix: Schema.string().default('/'),
})
```

### 4. 分组相关配置

```typescript
// ✅ 好的做法（分组清晰）
Schema.object({
  database: Schema.object({
    host: Schema.string(),
    port: Schema.number(),
  }),
  cache: Schema.object({
    enabled: Schema.boolean(),
    ttl: Schema.number(),
  }),
})

// ❌ 不好的做法（扁平结构）
Schema.object({
  dbHost: Schema.string(),
  dbPort: Schema.number(),
  cacheEnabled: Schema.boolean(),
  cacheTtl: Schema.number(),
})
```

## 注意事项

1. **类型一致**: Schema 定义应与 Config 接口保持一致
2. **默认值**: 为可选字段提供合理的默认值
3. **验证**: Schema 会自动验证配置，不符合类型会报错
4. **性能**: 复杂的 Schema 可能影响配置加载性能
5. **向后兼容**: 添加新配置时考虑旧版本的兼容性

## 相关 API

- [Context - 上下文对象](./context.md)
- [Schema 官方文档](https://koishi.chat/zh-CN/api/core/schema.html) - Koishi 官方文档
