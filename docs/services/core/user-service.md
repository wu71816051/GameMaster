# User Service - 用户服务

## 概述

用户服务负责处理用户相关的业务逻辑，特别是用户身份识别和跨平台账号绑定。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Database**:
  - `binding` 表 - 用于跨平台账号绑定

### 外部依赖
- Koishi 框架

## 对外提供的服务

### 1. getUserIdFromSession
从 Koishi Session 对象获取用户ID。

这是正确的跨平台用户识别方式，Koishi 会自动处理跨平台账号绑定。

**工作原理**:
通过 platform 和 pid 查询 binding 表获取 aid（Koishi 用户 ID）。

**参数**:
- `session: any` - Koishi Session 对象

**返回值**: `Promise<number>` - 用户ID（Koishi 原生 userId），如果查询失败返回 0

### 2. isValidUserId (静态方法)
验证用户ID是否有效。

**参数**:
- `userId: number` - 用户ID

**返回值**: `boolean` - 如果用户ID有效返回 true，否则返回 false

**验证规则**: 用户ID必须是正数

## 跨平台账号绑定

Koishi 使用 `binding` 表来管理跨平台账号绑定：

| 字段 | 说明 |
|------|------|
| platform | 平台标识（如 discord, onebot） |
| pid | 平台用户 ID |
| aid | Koishi 统一用户 ID |

通过 `platform + pid` 可以查询到对应的 `aid`，从而实现跨平台的统一用户管理。

## 使用示例

```typescript
import { createUserService } from './core/services/user.service'

const userService = createUserService(ctx)

// 从 Session 获取用户 ID
const userId = await userService.getUserIdFromSession(session)
if (userId === 0) {
  console.error('无法识别用户')
  return
}

// 验证用户 ID
if (UserService.isValidUserId(userId)) {
  console.log(`用户 ID 有效: ${userId}`)
} else {
  console.error('用户 ID 无效')
}
```

## 工厂函数

```typescript
export function createUserService(ctx: Context): UserService
```

## 日志

- `[UserService]` - 所有日志前缀
- warn: Session 缺少 platform 或 pid、未找到 binding 记录
- debug: 成功查询到 userId
- error: 查询 binding 表失败

## 注意事项

1. **跨平台识别**: 始终使用 `getUserIdFromSession` 从 Session 中获取用户 ID，不要直接使用 `session.userId`
2. **用户 ID 验证**: 在使用用户 ID 前，建议使用 `isValidUserId` 进行验证
3. **Binding 表**: 确保数据库中已正确配置 binding 表
