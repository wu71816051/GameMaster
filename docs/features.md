# GameMaster 插件功能列表

> **最后更新：** 2026-02-05
> **版本：** Phase 1 - 会话记录机器人 (已完成)

---

## 一、核心功能

### 1. 会话管理

#### 1.1 创建会话
- **功能描述：** 用户可以在任意频道创建新的 TRPG 会话
- **命令：** `会话创建 <名称>` 或 `gm.create <名称>`
- **权限：** 所有用户
- **实现位置：** [src/core/commands/index.ts:56-104](src/core/commands/index.ts)
- **功能特性：**
  - ✅ 创建者自动获得 `creator` 角色
  - ✅ 一个频道只能有一个活跃会话
  - ✅ 自动记录创建时间和创建者信息
  - ✅ 会话状态默认为活跃（ACTIVE）

#### 1.2 加入会话
- **功能描述：** 用户可以加入已存在的会话
- **命令：** `会话加入 <会话ID>` 或 `gm.join <会话ID>`
- **权限：** 所有用户
- **实现位置：** [src/core/commands/index.ts:111-146](src/core/commands/index.ts)
- **功能特性：**
  - ✅ 新成员默认获得 `member` 角色
  - ✅ 自动记录加入时间
  - ✅ 防止重复加入同一会话
  - ✅ 只能加入活跃状态的会话

#### 1.3 查看会话列表
- **功能描述：** 查看当前频道的所有会话
- **命令：** `会话列表` 或 `gm.list`
- **权限：** 所有用户
- **实现位置：** [src/core/commands/index.ts:153-234](src/core/commands/index.ts)
- **功能特性：**
  - ✅ 显示会话ID、名称、创建者
  - ✅ 显示会话状态（活跃/已暂停/已结束）
  - ✅ 显示创建和更新时间
  - ✅ 包括所有历史会话（非活跃的也会显示）

#### 1.4 会话状态管理
- **功能描述：** 管理会话的活跃状态
- **实现位置：** [src/core/services/conversation.service.ts:437-511](src/core/services/conversation.service.ts)
- **状态类型：**
  - `ACTIVE` (活跃) - 正在记录消息
  - `PAUSED` (暂停) - 暂停记录
  - `ENDED` (结束) - 永久终止
- **功能特性：**
  - ✅ 支持暂停会话
  - ✅ 支持恢复会话
  - ✅ 支持结束会话
  - ✅ 状态变更自动记录时间戳

---

### 2. 成员管理

#### 2.1 角色体系
- **功能描述：** 三级权限角色系统
- **实现位置：** [src/core/models/conversation-member.ts](src/core/models/conversation-member.ts)
- **角色类型：**
  1. **creator（创建者）** - 最高权限
     - ✅ 创建会话
     - ✅ 修改成员角色
     - ✅ 所有操作权限

  2. **admin（管理员）** - 中等权限
     - ✅ 发送消息被记录
     - ✅ 查看会话信息

  3. **member（成员）** - 基础权限
     - ✅ 发送消息被记录
     - ✅ 查看会话信息

#### 2.2 提升成员权限
- **功能描述：** 创建者可以将成员提升为管理员
- **命令：** `会话提升权限 <用户ID> [会话ID]` 或 `gm.promote <用户ID> [会话ID]`
- **权限：** 仅创建者
- **实现位置：** [src/core/commands/index.ts:260-357](src/core/commands/index.ts)
- **功能特性：**
  - ✅ 支持当前频道的活跃会话（可省略会话ID）
  - ✅ 支持指定其他会话ID
  - ✅ 验证操作者是否为创建者
  - ✅ 防止修改自己的角色

#### 2.3 降低成员权限
- **功能描述：** 创建者可以将管理员降为普通成员
- **命令：** `会话降低权限 <用户ID> [会话ID]` 或 `gm.demote <用户ID> [会话ID]`
- **权限：** 仅创建者
- **实现位置：** [src/core/commands/index.ts:362-457](src/core/commands/index.ts)
- **功能特性：**
  - ✅ 支持当前频道的活跃会话（可省略会话ID）
  - ✅ 支持指定其他会话ID
  - ✅ 验证操作者是否为创建者
  - ✅ 防止修改自己的角色

#### 2.4 成员查询
- **功能描述：** 查询和管理会话成员
- **实现位置：** [src/core/services/member.service.ts:263-315](src/core/services/member.service.ts)
- **功能特性：**
  - ✅ 获取会话所有成员列表
  - ✅ 查询特定成员信息
  - ✅ 检查用户是否为成员
  - ✅ 支持成员退出会话

---

### 3. 消息记录

#### 3.1 自动消息记录
- **功能描述：** 自动记录会话成员的所有消息
- **实现位置：** [src/core/middleware/message-recorder.ts:56-239](src/core/middleware/message-recorder.ts)
- **记录条件：**
  - ✅ 消息来自有活跃会话的频道
  - ✅ 发送者是会话成员
  - ✅ 会话状态为活跃（ACTIVE）
- **记录信息：**
  - ✅ 消息内容（文本）
  - ✅ 消息类型（text/image/audio/video）
  - ✅ 消息附件（图片、文件等）
  - ✅ 发送时间
  - ✅ 发送者ID
  - ✅ 平台信息
  - ✅ 频道/服务器信息

#### 3.2 消息类型识别
- **功能描述：** 自动识别消息的媒体类型
- **实现位置：** [src/core/utils/message-parser.ts](src/core/utils/message-parser.ts)
- **支持的类型：**
  - ✅ **text** - 纯文本消息
  - ✅ **image** - 图片消息（支持多个）
  - ✅ **audio** - 音频消息
  - ✅ **video** - 视频消息
- **功能特性：**
  - ✅ 自动提取图片URL
  - ✅ 保存文件附件信息
  - ✅ 记录文件大小和类型

#### 3.3 内容类型分类
- **功能描述：** 根据 TRPG 场景自动分类消息内容
- **实现位置：** [src/core/middleware/message-recorder.ts:164-188](src/core/middleware/message-recorder.ts)
- **分类类型：**
  1. **ROLEPLAY（角色扮演）**
     - 默认分类
     - 日常跑团对话

  2. **COMMAND（指令）**
     - 识别规则：以 `.`、`/` 或 `。` 开头
     - 例如：`.roll d20`、`/check`

  3. **CHECK（检定）**
     - 识别规则：包含 `检定`、`骰子`、`roll`、`d20`、`d100` 或 `XdY` 格式
     - 例如：`我进行一个检定`、`roll 3d6`

  4. **OUT_OF_CHARACTER（超游）**
     - 识别规则：包含 `((` 或 `)))` 标记
     - 例如：`((我们要休息一下))`

#### 3.4 附件处理
- **功能描述：** 提取和保存消息附件
- **实现位置：** [src/core/middleware/message-recorder.ts:190-220](src/core/middleware/message-recorder.ts)
- **支持的附件：**
  - ✅ 图片URL（多个）
  - ✅ 文件附件
  - ✅ 文件名、大小、MIME类型
- **存储格式：** JSON格式存储在数据库

---

## 二、数据库结构

### 1. conversation（会话表）
- **字段说明：**
  - `id` - 主键（自增）
  - `name` - 会话名称
  - `creator_id` - 创建者用户ID
  - `channels` - 频道信息（JSON数组）
  - `status` - 会话状态（0=活跃，1=暂停，2=结束）
  - `created_at` - 创建时间
  - `updated_at` - 最后更新时间
  - `metadata` - 扩展元数据（JSON）
- **实现位置：** [src/core/models/conversation.ts](src/core/models/conversation.ts)

### 2. conversation_member（会话成员表）
- **字段说明：**
  - `id` - 主键（自增）
  - `conversation_id` - 会话ID（外键）
  - `user_id` - 用户ID
  - `role` - 角色（creator/admin/member）
  - `joined_at` - 加入时间
- **实现位置：** [src/core/models/conversation-member.ts](src/core/models/conversation-member.ts)

### 3. conversation_message（消息记录表）
- **字段说明：**
  - `id` - 主键（自增）
  - `conversation_id` - 会话ID（外键）
  - `user_id` - 发送者用户ID
  - `message_id` - 原始消息ID
  - `content` - 消息内容
  - `content_type` - 内容类型（ROLEPLAY/COMMAND/CHECK/OOC）
  - `message_type` - 消息类型（text/image/audio/video）
  - `timestamp` - 发送时间
  - `platform` - 平台名称
  - `guild_id` - 服务器ID
  - `attachments` - 附件信息（JSON）
- **实现位置：** [src/core/models/conversation-message.ts](src/core/models/conversation-message.ts)

### 4. user（用户扩展表）
- **扩展字段：**
  - `conversations` - 用户参与的会话ID列表
- **实现位置：** [src/core/models/user-extension.ts](src/core/models/user-extension.ts)

---

## 三、用户命令

### 命令列表

| 命令 | 别名 | 描述 | 权限 | 实现位置 |
|------|------|------|------|----------|
| `会话创建 <名称>` | `gm.create` | 创建新会话 | 所有用户 | [代码](src/core/commands/index.ts:56-104) |
| `会话加入 <会话ID>` | `gm.join` | 加入会话 | 所有用户 | [代码](src/core/commands/index.ts:111-146) |
| `会话列表` | `gm.list` | 查看会话列表 | 所有用户 | [代码](src/core/commands/index.ts:153-234) |
| `会话帮助` | `gm.help` | 显示帮助信息 | 所有用户 | [代码](src/core/commands/index.ts:239-253) |
| `会话提升权限 <用户ID> [会话ID]` | `gm.promote` | 提升成员为管理员 | 仅创建者 | [代码](src/core/commands/index.ts:260-357) |
| `会话降低权限 <用户ID> [会话ID]` | `gm.demote` | 降低为普通成员 | 仅创建者 | [代码](src/core/commands/index.ts:362-457) |

---

## 四、技术特性

### 1. 多平台支持
- **支持的平台：** Discord、Telegram、QQ、OneBot 等
- **实现方式：** 通过 Koishi 框架的平台适配层
- **实现位置：** [src/core/middleware/message-recorder.ts:76-94](src/core/middleware/message-recorder.ts)

### 2. 数据库抽象
- **支持的数据库：**
  - SQLite（默认）
  - PostgreSQL
  - MySQL
  - MongoDB
- **实现方式：** 使用 Koishi ORM 层
- **实现位置：** [src/core/models/index.ts](src/core/models/index.ts)

### 3. 错误处理
- **特性：**
  - ✅ 所有关键操作都有 try-catch 保护
  - ✅ 详细的错误日志记录
  - ✅ 用户友好的错误提示
  - ✅ 优雅降级处理

### 4. 日志系统
- **日志级别：**
  - `debug` - 调试信息
  - `info` - 一般信息
  - `warn` - 警告信息
  - `error` - 错误信息
- **实现位置：** 所有模块均使用统一的日志系统

### 5. 类型安全
- **实现方式：** 完整的 TypeScript 类型定义
- **覆盖范围：**
  - ✅ 所有数据模型
  - ✅ 所有服务接口
  - ✅ 所有命令参数
  - ✅ 所有工具函数

---

## 五、架构设计

### 1. 分层架构
```
用户命令层（Commands）
    ↓
服务层（Services）
    ↓
数据模型层（Models）
    ↓
数据库层（Database）
```

### 2. 模块组织
- **models/** - 数据模型定义
- **services/** - 业务逻辑
- **middleware/** - 消息处理中间件
- **commands/** - 用户命令
- **utils/** - 工具函数

### 3. 依赖关系
- **服务层：**
  - ConversationService（会话管理）
  - MemberService（成员管理）
  - PermissionService（权限验证）
  - UserService（用户服务）

- **中间件：**
  - MessageRecorder（消息记录）

- **工具类：**
  - ChannelIdUtil（频道ID处理）
  - UserIdUtil（用户ID处理）
  - MessageParser（消息解析）

---

## 六、业务规则

### 1. 频道唯一性
- **规则：** 一个频道只能有一个活跃会话
- **目的：** 避免消息记录混乱
- **实现位置：** [src/core/services/conversation.service.ts:146-159](src/core/services/conversation.service.ts)

### 2. 权限矩阵

| 操作 | Creator | Admin | Member |
|------|---------|-------|--------|
| 创建会话 | ✅ | ✅ | ✅ |
| 加入会话 | ✅ | ✅ | ✅ |
| 修改角色 | ✅ | ❌ | ❌ |
| 发送消息被记录 | ✅ | ✅ | ✅ |

### 3. 消息记录规则
- **只记录：**
  - ✅ 活跃状态（ACTIVE）的会话
  - ✅ 会话成员的消息
- **不记录：**
  - ❌ 非成员的消息
  - ❌ 暂停/结束状态的会话消息

---

## 七、已完成功能清单

### ✅ 数据库层
- [x] 4个数据表定义
- [x] 表关系和索引
- [x] 类型安全的数据模型
- [x] 数据库自动初始化

### ✅ 服务层
- [x] 会话管理服务
- [x] 成员管理服务
- [x] 权限验证服务
- [x] 用户ID桥接服务

### ✅ 中间件
- [x] 消息记录中间件
- [x] 消息类型识别
- [x] 内容分类
- [x] 附件提取

### ✅ 用户命令
- [x] 会话创建
- [x] 会话加入
- [x] 会话列表
- [x] 会话帮助
- [x] 提升权限
- [x] 降低权限

### ✅ 工具函数
- [x] 频道ID处理
- [x] 用户ID处理
- [x] 消息解析

---

## 八、未实现功能（Phase 2）

以下功能已规划但尚未实现：

### 计划中
- [ ] 会话导出功能
- [ ] 消息查询和检索
- [ ] 会话统计
- [ ] 多语言支持
- [ ] Web UI界面
- [ ] 更多命令（退出、删除、修改等）

---

## 九、使用示例

### 示例1：创建并运行一个TRPG会话

```bash
# 1. 用户A创建会话
会话创建 "我的COC团"
# 输出：✅ 会话创建成功！📝 会话名称：我的COC团 🆔 会话ID：1

# 2. 用户B加入会话
会话加入 1
# 输出：✅ 成功加入会话 "我的COC团"

# 3. 用户A和用户B开始跑团，所有消息自动记录
用户A: 我进行一个侦查检定
用户B: 我也来帮忙
系统: [自动记录到数据库]

# 4. 查看会话列表
会话列表
# 输出：📋 该频道共有 1 个会话 🟢 **会话 1** ...
```

### 示例2：权限管理

```bash
# 1. 创建者提升用户B为管理员
会话提升权限 3750403297
# 输出：✅ 成功将 3750403297 的角色修改为管理员

# 2. 创建者降低用户B为普通成员
会话降低权限 3750403297
# 输出：✅ 成功将 3750403297 的角色修改为普通成员
```

---

## 十、技术文档索引

- **实现计划：** [docs/implementation-plan.md](implementation-plan.md)
- **数据库模型：** [src/core/models/](../src/core/models/)
- **服务层：** [src/core/services/](../src/core/services/)
- **命令层：** [src/core/commands/](../src/core/commands/)
- **中间件：** [src/core/middleware/](../src/core/middleware/)

---

**文档版本：** 1.0.0
**最后更新：** 2026-02-05
**维护者：** GameMaster 开发团队
