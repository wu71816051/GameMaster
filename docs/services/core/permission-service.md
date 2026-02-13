# Permission Service - 权限验证服务

## 概述

权限验证服务负责处理 TRPG 会话的权限验证相关业务逻辑，提供基于角色的访问控制（RBAC）功能。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Database**: `conversation_member` 表
- **Models**:
  - `ConversationMember`: 会话成员模型
  - `MemberRole`: 成员角色枚举 (MEMBER, ADMIN, CREATOR)

### 外部依赖
- Koishi 框架

## 角色等级

| 角色 | 等级 | 说明 |
|------|------|------|
| MEMBER | 1 | 普通成员 |
| ADMIN | 2 | 管理员 |
| CREATOR | 3 | 创建者 |

## 对外提供的服务

### 1. getMemberRole
获取用户在会话中的角色。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID (Koishi 原生 userId)

**返回值**:
- `success: boolean` - 是否成功
- `role?: MemberRole` - 用户角色（成功时）
- `error?: string` - 错误消息（失败时）

### 2. checkPermission
检查用户是否有权限执行操作。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID
- `requiredRole: MemberRole` - 所需的最低角色等级

**返回值**:
- `hasPermission: boolean` - 是否有权限
- `userRole?: MemberRole` - 用户的实际角色
- `error?: string` - 错误消息（无权限时）

### 3. isCreator
快速检查用户是否为会话创建者。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<boolean>`

### 4. isAdmin
快速检查用户是否为管理员或创建者。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<boolean>`

### 5. compareRoles
比较两个角色等级。

**参数**:
- `role1: MemberRole` - 角色 1
- `role2: MemberRole` - 角色 2

**返回值**: `number`
- 正数: role1 > role2
- 0: role1 = role2
- 负数: role1 < role2

### 6. isMember
检查用户是否是会话成员。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<boolean>`

### 7. getConversationMembers
获取会话的所有成员。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<ConversationMember[]>`

## 使用示例

```typescript
import { createPermissionService } from './core/services/permission.service'

const permissionService = createPermissionService(ctx)

// 检查用户是否有 admin 权限
const result = await permissionService.checkPermission({
  conversationId: 1,
  userId: 1234567890,
  requiredRole: MemberRole.ADMIN
})

if (result.hasPermission) {
  console.log('用户有权限')
} else {
  console.error(`无权限: ${result.error}`)
}
```

## 工厂函数

```typescript
export function createPermissionService(ctx: Context): PermissionService
```

## 日志

- `[PermissionService]` - 所有日志前缀
- debug: 查询操作、权限检查
- warn: 用户不是成员、权限不足
- error: 数据库错误、异常错误
