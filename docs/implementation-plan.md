# TRPG 会话管理系统 - MVP 实现规划

## 功能需求

实现以下 5 个核心功能：

1. **创建会话**: 用户A在群聊中创建会话1，获得 creator 权限
2. **加入会话**: 用户B加入会话1，获得 member 权限
3. **提升权限**: 用户A提升用户B的权限，用户B获得 admin 权限
4. **降低权限**: 用户A去除用户B的权限，用户B变成 member 权限
5. **消息记录**: 会话中所有人的发言都会被保存到数据库中

---

## 模块设计

### 模块 1: 消息中间件 (Message Middleware)
**文件位置**: `src/middleware/message-recorder.ts`

**职责**:
- 监听 Koishi 的 `message` 事件
- 判断消息来源频道是否有活跃会话
- 验证发送者是否为会话成员
- 如果是会话成员，记录消息到数据库
- 更新会话的 `updated_at` 时间戳

**核心逻辑流程**:
1. 解析消息来源：`{platform}:{guildId}:{channelId}`
2. 查询该频道的活跃会话（`status = ACTIVE`）
3. 检查发送者是否在会话成员列表中
4. 提取消息内容、类型、附件等信息
5. 创建 `conversation_message` 记录
6. 更新会话时间戳

**依赖**:
- 数据库模型：`conversation`, `conversation_member`, `conversation_message`
- 工具类：`channel-id`, `user-id`, `message-parser`

---

### 模块 2: 会话管理服务 (Conversation Service)
**文件位置**: `src/services/conversation.service.ts`

**职责**:
- 创建新会话
- 验证频道唯一性（一个频道只能有一个活跃会话）
- 自动将创建者添加为成员（role: creator）
- 更新用户的 `conversations` 列表

**核心方法**:
- `createConversation(name, creatorId, channelId)` - 创建会话

**创建流程**:
1. 检查该频道是否已有活跃会话
2. 创建 `conversation` 记录（status: ACTIVE）
3. 创建 `conversation_member` 记录（role: creator）
4. 更新创建者用户的 `conversations` 列表

**依赖**:
- 数据库模型：`conversation`, `conversation_member`, `user`
- 工具类：`channel-id`, `user-id`

---

### 模块 3: 成员管理服务 (Member Service)
**文件位置**: `src/services/member.service.ts`

**职责**:
- 处理用户加入会话请求
- 修改成员角色权限
- 维护成员关系

**核心方法**:
- `joinConversation(conversationId, userId)` - 用户加入会话
- `updateMemberRole(conversationId, operatorId, targetUserId, newRole)` - 修改成员角色

**加入流程**:
1. 验证会话是否存在且活跃
2. 检查用户是否已是成员
3. 创建成员记录（role: member）
4. 更新用户的 `conversations` 列表

**修改角色流程**:
1. 验证操作者是否为 creator
2. 验证不能修改自己的角色
3. 更新成员记录的 role 字段

**依赖**:
- 数据库模型：`conversation`, `conversation_member`, `user`
- 工具类：`user-id`

---

### 模块 4: 权限验证服务 (Permission Service)
**文件位置**: `src/services/permission.service.ts`

**职责**:
- 查询用户在会话中的角色
- 验证用户是否有权限执行操作

**核心方法**:
- `getMemberRole(conversationId, userId)` - 获取用户角色
- `checkPermission(conversationId, userId, requiredRole)` - 检查权限

**权限等级**:
- `creator` - 创建者，最高权限
- `admin` - 管理员，中等权限
- `member` - 普通成员，基础权限

**依赖**:
- 数据库模型：`conversation_member`

---

### 模块 5: 用户命令 (Commands)
**文件位置**: `src/commands/index.ts`

**职责**:
- 注册 Koishi 命令
- 解析命令参数
- 调用对应的服务层方法
- 返回执行结果

**命令列表**:

1. **会话创建** `会话创建 <名称>`
   - 调用：`createConversation()`
   - 自动获取当前频道和用户信息

2. **会话加入** `会话加入 <会话ID>`
   - 调用：`joinConversation()`
   - 自动获取当前用户信息

3. **会话提升权限** `会话提升权限 <用户ID> [会话ID]`
   - 调用：`updateMemberRole(..., 'admin')`
   - 如果不指定会话ID，使用当前频道的活跃会话
   - 如果当前频道没有活跃会话，提醒必须指定会话ID

4. **会话降低权限** `会话降低权限 <用户ID> [会话ID]`
   - 调用：`updateMemberRole(..., 'member')`
   - 如果不指定会话ID，使用当前频道的活跃会话
   - 如果当前频道没有活跃会话，提醒必须指定会话ID

**依赖**:
- 服务层：`conversation.service`, `member.service`
- 工具类：`channel-id`, `user-id`

---

### 模块 6: 工具类 (Utils)

#### 6.1 频道标识符工具
**文件位置**: `src/utils/channel-id.ts`

**职责**:
- 统一的频道标识符格式化
- 频道标识符解析

**方法**:
- `formatChannelId(platform, guildId, channelId)` - 格式化为 `{platform}:{guildId}:{channelId}`
- `parseChannelId(channelIdString)` - 解析为 `ChannelInfo` 对象

#### 6.2 用户标识符工具
**文件位置**: `src/utils/user-id.ts`

**职责**:
- 统一的用户标识符格式化
- 用户标识符解析

**方法**:
- `formatUserId(platform, userId)` - 格式化为 `{platform}:{userId}`
- `parseUserId(userIdString)` - 解析为平台和用户ID

#### 6.3 消息解析工具
**文件位置**: `src/utils/message-parser.ts`

**职责**:
- 检测消息类型（text/image/audio/video）
- 提取附件信息

**方法**:
- `detectMessageType(session)` - 返回消息类型字符串
- `extractAttachments(session)` - 返回附件数组


## 依赖关系图

```
用户命令 (Commands)
    ↓
    ├─→ 会话管理服务 (Conversation Service)
    │       ↓
    │       ├─→ conversation 表
    │       ├─→ conversation_member 表
    │       ├─→ user 表
    │       ├─→ channel-id 工具
    │       └─→ user-id 工具
    │
    └─→ 成员管理服务 (Member Service)
            ↓
            ├─→ conversation_member 表
            ├─→ conversation 表
            ├─→ user 表
            ├─→ permission.service (权限验证)
            └─→ user-id 工具

消息中间件 (Message Middleware)
    ↓
    ├─→ conversation 表
    ├─→ conversation_member 表
    ├─→ conversation_message 表
    ├─→ channel-id 工具
    ├─→ user-id 工具
    └─→ message-parser 工具
```

**依赖说明**:
- 所有模块最终都依赖于数据库模型层（`core/`）
- 服务层之间相对独立，只有成员管理服务依赖权限验证服务
- 工具类模块相互独立，无内部依赖

---

## 文件结构

```
external/gamemaster/
├── src/
│   ├── core/                # ✅ 已存在
│   │   ├── conversation.ts
│   │   ├── conversation-member.ts
│   │   ├── conversation-message.ts
│   │   ├── user-extension.ts
│   │   └── index.ts
│   │
│   ├── utils/               # ✅ 已创建
│   │   ├── channel-id.ts
│   │   ├── user-id.ts
│   │   └── message-parser.ts
│   │
│   ├── services/            # ✅ 已创建
│   │   ├── permission.service.ts
│   │   ├── conversation.service.ts
│   │   └── member.service.ts
│   │
│   ├── middleware/          # ✅ 已创建
│   │   └── message-recorder.ts
│   │
│   ├── commands/            # ✅ 已创建
│   │   └── index.ts
│   │
│   └── index.ts             # ✅ 已修改
│
└── tests/                   # ⚠️ 建议添加对应测试
```

---

## 实现顺序

### 阶段 1: 工具类（优先级：★★★★★）
**原因**: 无依赖，其他模块都依赖这些工具

- [x] `src/utils/channel-id.ts`
- [x] `src/utils/user-id.ts`
- [x] `src/utils/message-parser.ts`

**验证方式**: 编写简单的单元测试验证格式化和解析功能

### 阶段 2: 服务层（优先级：★★★★☆）
**原因**: 依赖工具类，为命令和中间件提供核心逻辑

- [x] `src/services/permission.service.ts`
- [x] `src/services/conversation.service.ts`
- [x] `src/services/member.service.ts`

**验证方式**: 使用 Koishi 的测试框架进行单元测试

### 阶段 3: 消息中间件（优先级：★★★☆☆）
**原因**: 依赖服务层，实现消息自动记录

- [x] `src/middleware/message-recorder.ts`

**验证方式**:
1. 在测试群组中创建会话
2. 发送多条消息
3. 检查数据库中的记录

### 阶段 4: 用户命令（优先级：★★★★☆）
**原因**: 依赖服务层，提供用户交互入口

- [x] `src/commands/index.ts`

**验证方式**: 在实际环境中测试所有命令

### 阶段 5: 插件集成（优先级：★★★★★）
**原因**: 将所有模块注册到 Koishi 插件系统

- [x] 修改 `src/index.ts`，导入并初始化所有模块

**验证方式**: 启动 Koishi，检查插件是否正常加载

---

## 测试场景

### 场景 1: 创建会话并自动记录消息
**前置条件**: 无

**操作步骤**:
1. 用户A在群聊中发送：`会话创建 "我的第一个TRPG团"`
2. 用户A发送：`大家好`
3. 用户A发送：`今天我们来玩COC`

**预期结果**:
- 会话创建成功，获得会话ID（如：1）
- 用户A自动获得 creator 权限
- 用户A的两条消息都被记录到 `conversation_message` 表
- 会话的 `updated_at` 时间戳被更新

**验证查询**:
```sql
SELECT * FROM conversation WHERE id = 1;
SELECT * FROM conversation_member WHERE conversation_id = 1;
SELECT * FROM conversation_message WHERE conversation_id = 1;
```

---

### 场景 2: 用户加入会话并记录消息
**前置条件**: 场景1完成，会话1已存在

**操作步骤**:
1. 用户B发送：`会话加入 1`
2. 用户B发送：`我现在也参与了`
3. 用户A发送：`欢迎`

**预期结果**:
- 用户B成功加入会话，role 为 `member`
- 用户B的 `conversations` 列表包含会话ID 1
- 用户B和用户A的消息都被记录

**验证查询**:
```sql
SELECT * FROM conversation_member WHERE conversation_id = 1;
SELECT * FROM user WHERE id = '用户B的platform:userId';
SELECT * FROM conversation_message WHERE conversation_id = 1 ORDER BY timestamp DESC;
```

---

### 场景 3: 提升成员权限
**前置条件**: 场景2完成，用户A为creator，用户B为member

**操作步骤**:
1. 用户A发送：`会话提升权限 discord:123456789 1`
   （假设用户B的完整用户ID是 discord:123456789）

**预期结果**:
- 用户B的 role 从 `member` 变为 `admin`
- 返回成功提示

**验证查询**:
```sql
SELECT * FROM conversation_member
WHERE conversation_id = 1 AND user_id = 'discord:123456789';
```

---

### 场景 4: 降低成员权限
**前置条件**: 场景3完成，用户B为admin

**操作步骤**:
1. 用户A发送：`会话降低权限 discord:123456789 1`

**预期结果**:
- 用户B的 role 从 `admin` 变为 `member`
- 返回成功提示

**验证查询**:
```sql
SELECT * FROM conversation_member
WHERE conversation_id = 1 AND user_id = 'discord:123456789';
```

---

### 场景 5: 权限验证（边界测试）
**前置条件**: 用户B为member

**操作步骤**:
1. 用户B尝试：`会话提升权限 discord:999999999 1`

**预期结果**:
- 操作失败，提示"只有创建者可以修改成员角色"
- 数据库无变化

---

### 场景 6: 消息自动记录（多用户）
**前置条件**: 会话1存在，用户A（creator）、用户B（member）

**操作步骤**:
1. 用户A、用户B、用户C（非成员）同时在群聊中发送消息
2. 用户A：`今天我们跑团`
3. 用户B：`好的，我准备好了`
4. 用户C：`我能参加吗？`

**预期结果**:
- 用户A和用户B的消息被记录
- 用户C的消息不被记录（非成员）

**验证查询**:
```sql
SELECT user_id, content FROM conversation_message
WHERE conversation_id = 1
ORDER BY timestamp ASC;
```

---

## 数据库操作总结

### 涉及的表
- **conversation** - 会话表
- **conversation_member** - 会话成员表
- **conversation_message** - 消息记录表
- **user** - 用户表（扩展字段 `conversations`）

### 操作类型

#### CREATE 操作
- 创建会话
- 添加成员
- 记录消息

#### GET 操作
- 查询频道的活跃会话
- 查询会话成员
- 查询用户信息

#### SET 操作
- 更新成员角色
- 更新会话时间戳
- 更新用户的 conversations 列表

---

## 关键业务逻辑

### 频道唯一性约束
- 一个频道（`{platform}:{guildId}:{channelId}`）只能有一个活跃会话
- 创建会话前必须检查该频道是否已有活跃会话
- 如果已有活跃会话，拒绝创建并提示用户

### 成员权限矩阵
| 操作 | creator | admin | member |
|------|---------|-------|--------|
| 创建会话 | 任何用户 | - | - |
| 加入会话 | 任何用户 | 任何用户 | 任何用户 |
| 修改角色 | ✅ | ❌ | ❌ |
| 发送消息被记录 | ✅ | ✅ | ✅ |

### 消息记录规则
- 只记录 `status = ACTIVE` 的会话消息
- 只记录会话成员的消息
- 非成员的消息被忽略
- 自动更新会话的 `updated_at` 时间戳

---

## 总结

实现这些功能需要 **6 个模块**：

1. **消息中间件** - 自动记录会话消息
2. **会话管理服务** - 创建会话
3. **成员管理服务** - 管理成员和角色
4. **权限验证服务** - 验证操作权限
5. **用户命令** - 会话管理命令接口
6. **工具类** - 标识符处理和消息解析

**实现顺序**:
- ✅ 阶段 1-5: 工具类 → 服务层 → 消息中间件 + 用户命令 → 插件集成（已完成）

**验证方式**:
- 通过 6 个测试场景验证完整功能流程
- 场景 1-6: 会话管理功能（已完成）
