# Member Service - 成员管理服务

## 概述

成员管理服务负责处理会话成员的加入、退出、角色管理等功能。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Database**:
  - `conversation` 表
  - `conversation_member` 表
- **Models**:
  - `ConversationStatus`: 会话状态枚举
  - `ConversationMember`: 会话成员模型
  - `MemberRoleType`: 成员角色类型 (creator, admin, member)

### 外部依赖
- Koishi 框架

## 对外提供的服务

### 1. joinConversation
用户加入会话。

**加入流程**:
1. 验证会话是否存在且活跃
2. 检查用户是否已是成员
3. 创建成员记录（role: member）
4. 更新用户的 conversations 列表（TODO）

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID (Koishi 原生 userId)

**返回值**:
- `success: boolean` - 是否成功
- `message: string` - 结果消息
- `member?: ConversationMember` - 成员信息（成功时）

### 2. updateMemberRole
修改成员角色。

**修改角色流程**:
1. 验证操作者是否为 creator
2. 验证不能修改自己的角色
3. 更新成员记录的 role 字段

**参数**:
- `conversationId: number` - 会话 ID
- `operatorId: number` - 操作者用户 ID
- `targetUserId: number` - 目标用户 ID
- `newRole: MemberRoleType` - 新角色

**返回值**:
- `success: boolean` - 是否成功
- `message: string` - 结果消息
- `member?: ConversationMember` - 更新后的成员信息

### 3. getConversationMembers
获取会话的所有成员。

**参数**:
- `conversationId: number` - 会话 ID

**返回值**: `Promise<ConversationMember[]>`

### 4. getMember
获取用户在会话中的成员信息。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<ConversationMember | null>`

### 5. isMember
检查用户是否是会话成员。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<boolean>`

### 6. leaveConversation
移除会话成员（退出会话）。

**参数**:
- `conversationId: number` - 会话 ID
- `userId: number` - 用户 ID

**返回值**: `Promise<boolean>` - 是否成功

**限制**:
- 创建者不能退出会话

## 角色类型

| 角色 | 说明 |
|------|------|
| creator | 创建者，拥有所有权限 |
| admin | 管理员 |
| member | 普通成员 |

## 使用示例

```typescript
import { createMemberService } from './core/services/member.service'

const memberService = createMemberService(ctx)

// 用户加入会话
const joinResult = await memberService.joinConversation(1, 1234567890)
if (joinResult.success) {
  console.log(joinResult.message)
  console.log(joinResult.member)
}

// 修改成员角色
const updateResult = await memberService.updateMemberRole(
  1,           // conversationId
  999999,      // operatorId (creator)
  1234567890,  // targetUserId
  'admin'      // newRole
)

if (updateResult.success) {
  console.log(updateResult.message)
}

// 获取会话成员列表
const members = await memberService.getConversationMembers(1)
console.log(`会话共有 ${members.length} 名成员`)

// 用户退出会话
const left = await memberService.leaveConversation(1, 1234567890)
```

## 工厂函数

```typescript
export function createMemberService(ctx: Context): MemberService
```

## 日志

- `[MemberService]` - 所有日志前缀
- info: 成员加入、角色修改、成员退出
- debug: 查询操作、验证过程
- error: 操作失败、异常错误
