# 数据库表设计

### 设计原则

1. **会话可以跨平台、跨频道**：一个会话可以同时存在于多个平台（Discord、Telegram、QQ等）的多个频道中
2. **一个频道只能有一个活跃会话**：避免混乱，同一频道中同时只能有一个活跃会话（但一个 guild 可以有多个活跃会话）
3. **用户可以加入多个会话**：用户可以同时参与多个会话，不受限制
4. **频道 ID 唯一性**：使用 `{platform}:{guildId}:{channelId}` 格式确保频道标识全局唯一，避免不同平台的 channelId 冲突

### 2.1 conversation (会话表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一个会话，自增整数。所有对会话的引用都使用这个 ID。 |
| **name** | string | **会话名称**。用户自定义的会话标题，例如 "TRPG团练"、"COC7模组" 等，便于识别和管理。 |
| **creator_id** | integer | **创建者标识**。Koishi 用户 ID（数字类型）。用于记录谁创建了这个会话，权限管理时使用。 |
| **channels** | list | **关联频道列表**。Koishi list 类型，存储频道信息数组。<br>**注意**：此字段已废弃，推荐使用 conversation_channel 中间表。<br>**核心作用**：<br>• 记录会话覆盖的所有频道（历史兼容）<br>• 实际查询请使用 conversation_channel 表（性能优化）<br>**示例内容**：包含 platform、guildId、channelId 的对象数组 |
| **status** | integer | **会话状态**。控制消息记录行为：<br>• `0` (ACTIVE) - 活跃，正常记录消息<br>• `1` (PAUSED) - 暂停，停止记录但保留会话<br>• `2` (ENDED) - 已结束，会话终止<br>**作用**：<br>• 控制是否记录消息<br>• 实现暂停/恢复功能<br>• 防止同一频道有多个活跃会话 |
| **created_at** | timestamp | **创建时间**。记录会话何时被创建，用于统计和排序。 |
| **updated_at** | timestamp | **最后更新时间**。每次有消息记录或会话状态变更时更新，用于判断会话活跃度。 |
| **metadata** | json | **元数据**。存储额外的会话配置信息：<br><br>**通用配置**：<br>• `description` - 会话描述<br>• `tags` - 标签数组<br>• `max_members` - 最大成员数限制<br><br>**TRPG 特定配置**：<br>• `rule_system` - 规则系统（'coc7', 'dnd5e', 'generic'）<br>• `rule_config` - 规则系统特定配置（JSON 格式）<br><br>**作用**：灵活扩展会话属性，无需修改表结构 |

### 2.2 conversation_member (会话成员表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一条成员记录，自增整数。 |
| **conversation_id** | unsigned | **外键关联**。指向 conversation 表的 id。<br>**作用**：<br>• 表示该成员属于哪个会话<br>• 用于查询会话的所有成员<br>• 与 user_id 一起建立用户与会话的多对多关系 |
| **user_id** | integer | **用户标识**。Koishi 用户 ID（数字类型）。<br>**作用**：<br>• 标识是哪个用户加入了会话<br>• 用于查询用户所在的所有会话<br>• 防止重复加入同一会话 |
| **joined_at** | timestamp | **加入时间**。记录用户何时加入会话。<br>**作用**：<br>• 统计用户参与时长<br>• 追溯成员加入顺序<br>• 导出时按时间排序 |
| **role** | string | **角色权限**。控制用户在会话中的权限：<br>• `creator` - 创建者，拥有所有权限（暂停、恢复、结束、踢人、删除）<br>• `admin` - 管理员，可以管理会话和成员<br>• `member` - 普通成员，只能查看、退出和导出<br>**作用**：实现细粒度的权限控制 |

### 2.3 conversation_message (消息记录表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一条消息记录，自增整数。 |
| **conversation_id** | unsigned | **外键关联**。指向 conversation 表的 id。<br>**作用**：<br>• 表示这条消息属于哪个会话<br>• 用于查询会话的所有消息<br>• 按会话分组导出消息记录 |
| **user_id** | integer | **发送者标识**。Koishi 用户 ID（数字类型）。<br>**作用**：<br>• 记录是谁发送的消息<br>• 区分不同用户的消息<br>• 查询某个用户的所有发言 |
| **message_id** | string | **原始消息ID**。唯一标识符。<br>**作用**：<br>• 对应平台原始消息的唯一标识<br>• 用于去重（防止重复记录同一条消息）<br>• 可定位到平台原始消息 |
| **content** | text | **消息内容**。存储消息的文本内容。<br>**作用**：<br>• 记录用户发言的完整文本<br>• 支持长文本（text 类型）<br>• 导出时展示的主要内容 |
| **content_type** | string | **内容类型**。标识消息在 TRPG 会话中的功能类型：<br>• `roleplay` (RP) - 角色扮演内容<br>• `out_of_character` (OOC/超游) - 超游发言，玩家脱离角色的讨论<br>• `check` (检定) - 游戏检定（如属性检定、技能检定）<br>• `command` (命令) - 系统命令或指令<br>• `other` (其他) - 其他类型消息<br>**默认值**：`roleplay`<br>**作用**：<br>• 区分不同性质的消息内容<br>• 导出时按类型筛选或分组<br>• 统计会话中各类消息的比例<br>• 支持后续的分析和过滤功能 |
| **message_type** | string | **消息类型**。标识消息的媒体类型：<br>• `text` - 文本消息<br>• `image` - 图片消息<br>• `audio` - 音频消息<br>• `video` - 视频消息<br>**作用**：<br>• 导出时格式化不同类型<br>• 统计消息类型分布<br>• 决定如何处理 attachments |
| **timestamp** | timestamp | **消息时间戳**。记录消息发送的时间。<br>**作用**：<br>• 按时间排序和导出<br>• 追溯消息发生时间<br>• 统计消息频率 |
| **platform** | string | **消息来源平台**。例如：`discord`、`telegram`、`qq`。<br>**作用**：<br>• 标识消息来自哪个平台<br>• 支持跨平台消息统计<br>• 导出时按平台分组展示 |
| **guild_id** | string | **消息来源群组ID**。<br>**作用**：<br>• 标识消息来自哪个群组<br>• 支持跨群组消息统计<br>• 与 conversation.channels 配合验证 |
| **channel_id** | string | **消息来源频道ID**。<br>**作用**：<br>• 标识消息来自哪个频道<br>• 支持同一会话内多频道的消息区分<br>• 支持频道级别的消息统计和导出<br>• 精确定位原始消息来源 |
| **attachments** | json | **附件信息**。存储消息的附加数据：<br>• 图片 URL 数组<br>• 文件信息<br>• 其他平台特定的元数据<br>**作用**：<br>• 在导出时恢复完整消息内容<br>• 保存图片等富媒体信息<br>• 灵活扩展附件类型 |

### 2.4 conversation_channel (会话频道关联表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一条频道关联记录，自增整数。 |
| **conversation_id** | unsigned | **会话ID**。指向 conversation 表的 id。<br>**作用**：<br>• 表示该频道属于哪个会话<br>• 用于查询会话的所有频道 |
| **platform** | string | **平台标识**。例如：`discord`、`telegram`、`qq`。<br>**作用**：标识频道来自哪个平台 |
| **guild_id** | string | **群组/服务器ID**。频道所属的群组或服务器标识。<br>**作用**：<br>• 标识频道所属的群组<br>• 支持跨群组会话管理 |
| **channel_id** | string | **频道ID**。频道的唯一标识。<br>**作用**：<br>• 唯一标识一个频道<br>• 与 platform、guild_id 组成复合唯一键<br>• 用于快速查找频道的所属会话 |
| **joined_at** | timestamp | **加入时间**。频道加入会话的时间。<br>**作用**：<br>• 记录频道何时加入会话<br>• 追溯频道加入顺序 |

**设计说明**：
- **性能优化**：通过 `(platform, guild_id, channel_id)` 复合索引，实现 O(log n) 的频道查询性能
- **唯一性约束**：一个频道只能属于一个活跃会话（通过应用层逻辑保证）
- **替代方案**：此表替代了 `conversation.channels` 字段用于查询，channels 字段仅保留用于历史兼容

### 2.5 character (角色卡表)

> **注意**：此表已设计但**尚未实现**。当前代码中没有创建该表的模型文件和数据库注册。

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一个角色，自增整数。 |
| **conversation_id** | unsigned | **所属会话**。指向 conversation 表的 id。<br>**作用**：<br>• 表示角色属于哪个会话<br>• 用于查询会话的所有角色 |
| **user_id** | integer | **所有者标识**。Koishi 用户 ID（数字类型）。<br>**作用**：<br>• 标识角色归属于哪个用户<br>• 用于查询用户拥有的所有角色 |
| **name** | string | **角色名称**。角色的名字，例如 "约翰·多伊"。 |
| **portrait_url** | string | **头像图片**。角色头像的 URL（可选）。 |
| **rule_system** | string | **规则系统**。角色所属的规则系统：<br>• `coc7` - 克苏鲁的呼唤 7版<br>• `dnd5e` - 龙与地下城 5版<br>• `generic` - 通用系统<br>**作用**：确定角色属性和技能的结构 |
| **attributes** | json | **属性数据**。存储角色的属性值（灵活格式）。<br>**示例**：<br>• CoC: `{"STR": 60, "CON": 50, "POW": 50, ...}`<br>• D&D: `{"strength": 14, "dexterity": 16, ...}`<br>**作用**：支持不同规则系统的不同属性结构 |
| **skills** | json | **技能数据**。存储角色的技能值（灵活格式）。<br>**示例**：<br>• CoC: `{"侦查": 60, "聆听": 50, ...}`<br>• D&D: `{"athletics": 5, "stealth": 7, ...}` |
| **inventory** | json | **物品栏**。角色携带的物品（可选）。 |
| **notes** | string | **备注**。角色的额外说明或笔记。 |
| **metadata** | json | **规则系统特定数据**。存储规则系统特定的扩展数据。 |
| **created_at** | timestamp | **创建时间**。角色创建的时间。 |
| **updated_at** | timestamp | **更新时间**。角色最后更新的时间。 |
| **is_active** | boolean | **是否激活**。标识角色是否为当前激活角色。<br>**作用**：允许用户在同一会话拥有多个角色，但只有一个激活 |

**实现状态**：待实现
**相关命令**：
- `.char create [名称]` - 创建新角色
- `.char show` - 显示激活角色
- `.char set [名称]` - 设置激活角色
- `.char list` - 列出所有角色

### 2.6 扩展 user 表

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **conversations** | list | **参与的会话ID列表**。格式：`[convId1, convId2, ...]`<br><br>**作用**：<br>1. **记录用户的会话历史**：包括活跃、暂停、已结束的所有会话<br><br>2. **权限验证**：检查用户是否有权访问某个会话<br><br>3. **快速查询**：获取用户参与的所有会话，无需查询 conversation_member 表<br><br>4. **跨平台会话支持**：用户可以在不同平台群组加入同一个会话<br><br>**示例数据**：<br>```typescript<br>[1, 3, 7]  // 用户参与过会话 1, 3, 7<br>```<br><br>**维护逻辑**：<br>• 用户加入任何会话时：追加会话ID（如果不存在）<br>• 用户退出会话时：移除会话ID（可选）<br>• 会话被删除时：从所有用户的列表中移除 |

### 2.7 binding (平台账号绑定表)

该表格由koishi自带

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **pid** | string | **平台用户id**。例如：`123213`、`23423423`。<br>**作用**：<br>• 在对应平台中的用户id|
| **platform** | string | **名称平台**。例如：`discord`、`telegram`、`qq`。<br>**作用**：<br>• 标志哪个平台的用户|
| **aid** | id | **消息来源平台**。例如：`234234`、`345435`。<br>**作用**：<br>• 标识koishi中对应的用户id|

#### 设计原则

1. **多对一关系**：一个 Koishi 用户可以绑定多个平台账号（同一平台或不同平台）
2. **一对一约束**：一个平台账号只能绑定一个 Koishi 用户（通过复合唯一键实现）
3. **跨平台支持**：支持 Discord、Telegram、QQ 等多平台账号统一管理

#### 使用场景

1. **跨平台会话成员识别**：
   - 用户 A 在 Discord 加入会话
   - 用户 A 在 Telegram 加入同一会话
   - 系统识别为同一 Koishi 用户，统一权限管理

2. **平台账号管理**：
   - 用户绑定新平台账号：`.bind-account <platform>`
   - 用户解绑平台账号：`.unbind-account <platform>`
   - 查看已绑账号：`.list-accounts`

3. **身份验证**：
   - 绑定时发送验证码到平台私信
   - 验证后状态从 pending 变为 active
   - 防止恶意绑定他人账号

4. **数据迁移**：
   - 从旧的 `{platform}:{userId}` 格式迁移到新表
   - 保持向后兼容性

---

### 数据库索引建议

为了优化查询性能，建议为以下表创建索引：

#### conversation_message 表
- `(conversation_id, message_type, created_at)` - 用于高效查询投骰和检定记录
- `(user_id, timestamp)` - 用于查询用户的发言历史
- `(platform, guild_id, channel_id, timestamp)` - 用于频道级别的消息查询

#### conversation_channel 表
- `(platform, guild_id, channel_id)` - **复合唯一键**，用于快速查找频道所属会话
- `conversation_id` - 用于查询会话的所有频道

#### character 表（待实现）
- `(conversation_id, user_id)` - 查询会话中用户的角色
- `(rule_system)` - 按规则系统筛选角色
- `is_active` - 查询激活角色

#### conversation_member 表
- `(conversation_id)` - 查询会话的所有成员
- `(user_id)` - 查询用户参与的会话

---

### 枚举值命名说明

**注意**：本文档中使用小写字符串描述数据库中实际存储的值，例如：
- `content_type`: `'roleplay'`, `'check'`, `'command'`, `'out_of_character'`, `'other'`
- `message_type`: `'text'`, `'image'`, `'audio'`, `'video'`

在代码实现中，使用 TypeScript 枚举类型进行类型安全的访问：
- `ContentType.ROLEPLAY`, `ContentType.CHECK`, `ContentType.COMMAND`, etc.
- `MessageType.TEXT`, `MessageType.IMAGE`, `MessageType.AUDIO`, `MessageType.VIDEO`

枚举类型与数据库存储值的映射由代码自动处理。

---

## 实现状态说明

> **重要更新 (2026-01-22)**: 以下实现状态已根据当前代码实际情况更新。

### 已实现的表 ✅

1. **conversation** - 会话表 ✅
2. **conversation_member** - 会话成员表 ✅
3. **conversation_message** - 消息记录表 ✅
4. **conversation_channel** - 会话频道关联表 ✅
5. **character** - 角色卡表 ✅ (2026-01-22 更新：已完全实现)
6. **user (扩展)** - 用户表扩展 ✅
7. **binding** - 平台账号绑定表 ✅ (Koishi 自带)

### Character 表实现详情 ✅

**文件位置**: [src/core/models/character.ts](../src/core/models/character.ts)

**已实现的功能**:
- ✅ 完整的数据库表结构定义
- ✅ 支持多规则系统（CoC7, D&D5e, Generic）
- ✅ JSON 属性和技能存储
- ✅ 激活角色机制（is_active 字段）
- ✅ 完整的 CRUD 服务（560 行代码）
- ✅ 角色管理命令（创建、显示、设置、列表、删除、导出、导入）
- ✅ CharacterFormatter 角色卡格式化显示

**服务实现**: [src/core/services/character.service.ts](../src/core/services/character.service.ts)
**命令实现**: [src/core/commands/character.commands.ts](../src/core/commands/character.commands.ts)
**格式化工具**: [src/core/utils/character-formatter.ts](../src/core/utils/character-formatter.ts)

### 字段差异说明

#### conversation_member 表

**文档设计**：包含 `active_character_id` 字段（用于激活角色切换）
**当前实现**：未使用该字段
**说明**：激活角色通过 `character.is_active` 字段实现，无需在 conversation_member 表中存储

#### conversation_message 表

**文档设计**：基础结构已实现，可以扩展以下字段（可选）：
- `character_id` - 关联的角色ID
- `dice_expression` - 骰子表达式
- `dice_result` - 骰子原始结果
- `check_skill` - 检定的技能名称
- `check_result` - 检定结果

**当前实现**：使用 `content_type: CHECK` 标识检定类消息，具体信息存储在 `content` 字段中

---

## 功能实现进度

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 会话管理 | ✅ 已实现 | 创建、加入、管理会话 |
| 消息记录 | ✅ 已实现 | 自动记录和分类消息 |
| 权限系统 | ✅ 已实现 | 三层权限（创建者、管理员、成员） |
| 骰子系统 | ✅ 已实现 | 普通掷骰（.r）、带描述掷骰（.rd）、高级功能完整 |
| 角色掷骰 | ⏳ 部分实现 | .ra 命令存在但仅作普通掷骰，待集成角色属性 |
| 角色卡系统 | ✅ 已实现 | 创建、编辑、删除、导出、导入角色 (2026-01-22 更新) |
| 技能检定 | ❌ 未实现 | 基于角色的技能检定，依赖角色卡系统 ✅ 已满足 |
| 规则引擎 | ❌ 未实现 | 多规则系统支持（CoC、D&D） |

### 整体完成度

**数据库表**: 100% (所有表已实现)
**基础功能**: 100% (会话、消息、权限、骰子、角色)
**核心 TRPG 功能**: 50% (缺技能检定和规则引擎)
| 技能检定 | ❌ 未实现 | 基于角色属性的检定，依赖 character 表 |
| 规则引擎 | ❌ 未实现 | 多规则系统支持 |

