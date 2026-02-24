# 角色卡导入功能文档

## 概述

角色卡导入功能允许用户从外部数据源（如 COC7）批量导入角色卡数据。

## 支持的导入规则

### coc7

从 COC7 表格导入角色卡数据。

#### 表格格式要求

- **第一行**：字段名称（如：名称、等级、属性.力量、属性.敏捷等）
- **第二行开始**：角色卡数据
- **"名称" 或 "name" 列**：必需的，用于标识角色卡名称

#### 示例表格

| 名称 | 等级 | 属性.力量 | 属性.敏捷 | 属性.体质 | 装备.武器 | 装备.攻击力 |
|------|------|-----------|-----------|-----------|------------------|------------------|
| 战士 | 5 | 16 | 14 | 15 | 长剑 | 8 |
| 法师 | 3 | 10 | 12 | 14 | 法杖 | 5 |
| 游侠 | 4 | 14 | 16 | 13 | 短剑 | 6 |

#### 生成的角色卡数据

```json
{
  "name": "战士",
  "data": {
    "等级": 5,
    "attributes": {
      "力量": 16,
      "敏捷": 14,
      "体质": 15
    },
    "equipment": {
      "武器": "长剑",
      "攻击力": 8
    }
  },
  "rule_system": "coc7",
  "tags": ["导入"]
}
```

## 使用方法

### 查看可用规则

```
/card.import.rules
```

**输出示例**：
```
📋 可用的导入规则:
- coc7: 从 COC7 表格导入角色卡数据
```

### 从 URL 导入角色卡

```
/card.import <规则名称> <URL>
```

**示例**：
```
/card.import coc7 https://docs.google.com/spreadsheets/d/1Sf3TGPPPYeMsNaH0xQHlxc2ZNo2ZMARe63m4nbnjNvY/edit?usp=sharing
```

**输出示例**：
```
📊 导入完成: 3 成功, 0 失败
✅ "战士" (ID: 1)
✅ "法师" (ID: 2)
✅ "游侠" (ID: 3)
```

## 命令列表

| 命令 | 描述 | 参数 |
|------|------|------|
| `/card.import.rules` | 列出所有可用的导入规则 | 无 |
| `/card.import` | 从 URL 导入角色卡 | `<规则名称> <URL>` |

## 技术细节

### 规则解析器接口

每个规则解析器需要实现以下接口：

```typescript
interface RuleParser {
  readonly name: string          // 解析器名称（唯一标识）
  readonly description: string   // 解析器描述

  // 解析 URL 并提取角色卡数据
  parse(url: string): Promise<ParseResult>

  // 验证 URL 是否适用于此解析器
  validate(url: string): boolean
}
```

### 添加新的解析器

1. 在 `src/rules` 目录下创建新文件夹（如 `src/rules/my-parser`）
2. 创建解析器文件（如 `parser.ts`）
3. 实现 `RuleParser` 接口
4. 在 `src/rules/index.ts` 中导入并注册解析器

**示例**：

```typescript
// src/rules/my-parser/parser.ts
import { RuleParser, ParseResult, ImportedCard, registerParser } from '../base'

class MyParser implements RuleParser {
  readonly name = 'my-parser'
  readonly description = '我的自定义解析器'

  validate(url: string): boolean {
    return url.includes('myservice.com')
  }

  async parse(url: string): Promise<ParseResult> {
    // 实现解析逻辑
    // ...
  }
}

registerParser(new MyParser())
```

```typescript
// src/rules/index.ts
import './my-parser/parser'
```

## 错误处理

### 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `未找到规则 "xxx"` | 指定的规则名称不存在 | 使用 `/card.import.rules` 查看可用规则 |
| `URL 格式不符合规则 "xxx" 的要求` | URL 不符合该规则的格式要求 | 确保使用正确的 URL 格式 |
| `无法从 URL 中提取表格 ID` | COC7 URL 格式不正确 | 确保使用完整的 COC7 链接 |
| `表格缺少"名称"或"name"列` | 表格缺少必需的列 | 在表格第一行添加"名称"或"name"列 |
| `无法获取表格数据: xxx` | 无法访问表格 | 确保表格已公开分享 |

## 注意事项

1. **表格访问权限**：确保 COC7 表格已设置为"知道链接的任何人都可以查看"
2. **数据类型**：解析器会自动识别数字和布尔值，其他字段保持为字符串
3. **嵌套结构**：使用点号（.）分隔的列名会创建嵌套的数据结构（如 "属性.力量" -> `data.attributes.力量`）
4. **批量导入**：一次导入可以创建多张角色卡，每行一张
5. **命名冲突**：如果会话中已存在同名角色卡，导入会失败

## 示例工作流

### 场景：从 COC7 导入 NPC 数据

1. 准备 COC7 表格，包含 NPC 的属性数据
2. 设置表格分享权限为"知道链接的任何人都可以查看"
3. 获取表格的完整 URL
4. 在 Koishi 中执行：
   ```
   /card.import coc7 <表格URL>
   ```
5. 系统自动解析表格并创建角色卡
6. 导入成功后可以使用 `/card.list` 查看所有角色卡

## 相关文档

- [角色卡系统 API 文档](./character-card.md)
- [会话管理服务](./conversation.service.md)
- [权限管理服务](./permission.service.md)
