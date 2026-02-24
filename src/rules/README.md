# 规则解析器模块

本目录包含所有规则系统的角色卡导入解析器。

## 目录结构

```
rules/
├── base.ts                    # 基础接口和解析器管理
├── index.ts                   # 模块导出和解析器注册
├── README.md                  # 本文件
├── default/                   # 默认通用解析器
│   └── parser.ts
└── coc7/                     # COC7 规则系统解析器
    └── character-card-parser.ts
```

## 已实现的解析器

### default

**位置**: [default/parser.ts](default/parser.ts)

**描述**: 默认通用角色卡解析器

**规则名称**: `default`

**数据源**: Google Sheets

**适用场景**: 不指定特定规则系统时的通用角色卡导入

**特点**:
- 支持嵌套数据结构（使用点号分隔，如 `属性.力量`）
- 自动识别数据类型（数字、布尔值、字符串）
- 从 Google Sheets 导出 CSV 格式数据

### coc7

**位置**: [coc7/character-card-parser.ts](coc7/character-card-parser.ts)

**描述**: Call of Cthulhu 7th Edition 角色卡解析器

**规则名称**: `coc7`

**数据源**: Google Sheets

**适用场景**: COC7 规则系统的角色卡导入

**特点**:
- 支持 COC7 特定的属性结构
- 支持嵌套数据结构
- 自动识别数据类型

## 添加新的规则解析器

### 1. 创建目录结构

为新的规则系统创建目录：

```bash
mkdir -p src/rules/<rule-name>
```

### 2. 实现解析器

创建解析器文件（如 `parser.ts`）并实现 `RuleParser` 接口：

```typescript
import { RuleParser, ParseResult, ImportedCard } from '../base'
import { registerParser } from '../base'

class MyRuleParser implements RuleParser {
  readonly name = 'my-rule'
  readonly description = '我的规则系统解析器'

  validate(url: string): boolean {
    // 验证 URL 是否适用于此解析器
    return url.includes('myservice.com')
  }

  async parse(url: string): Promise<ParseResult> {
    // 解析 URL 并返回角色卡数据
    // ...
  }
}

// 注册解析器
registerParser(new MyRuleParser())
```

### 3. 注册解析器

在 `index.ts` 中导入新解析器：

```typescript
import './<rule-name>/parser'
```

## 使用示例

### 列出所有可用规则

```bash
/card.import.rules
```

输出：
```
📋 可用的导入规则:
- default: 从 Google Sheets 表格导入通用角色卡数据（默认解析器）
- coc7: 从 Google Sheets 表格导入 COC7 角色卡数据
```

### 导入角色卡

```bash
# 使用默认解析器
/card.import default https://docs.google.com/spreadsheets/d/...

# 使用 COC7 解析器
/card.import coc7 https://docs.google.com/spreadsheets/d/...
```

## 解析器接口

所有解析器必须实现 `RuleParser` 接口：

```typescript
interface RuleParser {
  readonly name: string          // 解析器名称（唯一标识）
  readonly description: string   // 解析器描述

  // 验证 URL 是否适用于此解析器
  validate(url: string): boolean

  // 解析 URL 并提取角色卡数据
  parse(url: string): Promise<ParseResult>
}
```

## 返回值

解析器的 `parse` 方法返回 `ParseResult`：

```typescript
interface ParseResult {
  success: boolean              // 是否成功
  cards?: ImportedCard[]        // 解析出的角色卡列表
  error?: string               // 错误信息
}
```

## 导入的角色卡数据

每个导入的角色卡包含以下信息：

```typescript
interface ImportedCard {
  name: string                 // 角色卡名称
  data: CharacterData          // 角色卡数据（动态结构）
  rule_system?: string         // 规则系统标识
  tags?: string[]              // 标签
}
```

## 相关文档

- [角色卡导入功能文档](../../docs/card-import.md)
- [角色卡系统 API 文档](../../docs/character-card.md)
- [基础接口定义](./base.ts)
