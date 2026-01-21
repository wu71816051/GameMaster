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
| **creator_id** | string | **创建者标识**。格式为 `{platform}:{userId}`，例如 `discord:123456789`。用于记录谁创建了这个会话，权限管理时使用。 |
| **channels** | list | **关联频道列表**。格式：`[{platform, guildId, channelId}, ...]`<br>**核心作用**：<br>• 记录会话覆盖的所有频道<br>• 验证消息来源（中间件检查消息是否来自这些频道）<br>• 实现频道级别的唯一性约束（一个 channel 只能有一个活跃会话）<br>• 使用 `{platform}:{guildId}:{channelId}` 格式避免不同平台 channelId 冲突<br>**示例**：`[{platform: 'discord', guildId: 'guild1', channelId: 'channel1'}, {platform: 'telegram', guildId: 'chat2', channelId: 'channel2'}]` |
| **status** | integer | **会话状态**。控制消息记录行为：<br>• `0` (ACTIVE) - 活跃，正常记录消息<br>• `1` (PAUSED) - 暂停，停止记录但保留会话<br>• `2` (ENDED) - 已结束，会话终止<br>**作用**：<br>• 控制是否记录消息<br>• 实现暂停/恢复功能<br>• 防止同一频道有多个活跃会话 |
| **created_at** | timestamp | **创建时间**。记录会话何时被创建，用于统计和排序。 |
| **updated_at** | timestamp | **最后更新时间**。每次有消息记录或会话状态变更时更新，用于判断会话活跃度。 |
| **metadata** | json | **元数据**。存储额外的会话配置信息：<br>• `description` - 会话描述<br>• `tags` - 标签数组<br>• `max_members` - 最大成员数限制<br>**作用**：灵活扩展会话属性，无需修改表结构 |

### 2.2 conversation_member (会话成员表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一条成员记录，自增整数。 |
| **conversation_id** | unsigned | **外键关联**。指向 conversation 表的 id。<br>**作用**：<br>• 表示该成员属于哪个会话<br>• 用于查询会话的所有成员<br>• 与 user_id 一起建立用户与会话的多对多关系 |
| **user_id** | string | **用户标识**。格式为 `{platform}:{userId}`。<br>**作用**：<br>• 标识是哪个用户加入了会话<br>• 用于查询用户所在的所有会话<br>• 防止重复加入同一会话 |
| **joined_at** | timestamp | **加入时间**。记录用户何时加入会话。<br>**作用**：<br>• 统计用户参与时长<br>• 追溯成员加入顺序<br>• 导出时按时间排序 |
| **role** | string | **角色权限**。控制用户在会话中的权限：<br>• `creator` - 创建者，拥有所有权限（暂停、恢复、结束、踢人、删除）<br>• `admin` - 管理员，可以管理会话和成员<br>• `member` - 普通成员，只能查看、退出和导出<br>**作用**：实现细粒度的权限控制 |

### 2.3 conversation_message (消息记录表)

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **id** | unsigned | **主键标识**。唯一标识一条消息记录，自增整数。 |
| **conversation_id** | unsigned | **外键关联**。指向 conversation 表的 id。<br>**作用**：<br>• 表示这条消息属于哪个会话<br>• 用于查询会话的所有消息<br>• 按会话分组导出消息记录 |
| **user_id** | string | **发送者标识**。格式为 `{platform}:{userId}`。<br>**作用**：<br>• 记录是谁发送的消息<br>• 区分不同用户的消息<br>• 查询某个用户的所有发言 |
| **message_id** | string | **原始消息ID**。格式为 `{platform}:{messageId}`。<br>**作用**：<br>• 对应平台原始消息的唯一标识<br>• 用于去重（防止重复记录同一条消息）<br>• 可定位到平台原始消息 |
| **content** | text | **消息内容**。存储消息的文本内容。<br>**作用**：<br>• 记录用户发言的完整文本<br>• 支持长文本（text 类型）<br>• 导出时展示的主要内容 |
| **content_type** | string | **内容类型**。标识消息在 TRPG 会话中的功能类型：<br>• `roleplay` (RP) - 角色扮演内容<br>• `out_of_character` (OOC/超游) - 超游发言，玩家脱离角色的讨论<br>• `check` (检定) - 游戏检定（如属性检定、技能检定）<br>• `command` (命令) - 系统命令或指令<br>• `other` (其他) - 其他类型消息<br>**默认值**：`roleplay`<br>**作用**：<br>• 区分不同性质的消息内容<br>• 导出时按类型筛选或分组<br>• 统计会话中各类消息的比例<br>• 支持后续的分析和过滤功能 |
| **message_type** | string | **消息类型**。标识消息的媒体类型：<br>• `text` - 文本消息<br>• `image` - 图片消息<br>• `audio` - 音频消息<br>• `video` - 视频消息<br>**作用**：<br>• 导出时格式化不同类型<br>• 统计消息类型分布<br>• 决定如何处理 attachments |
| **timestamp** | timestamp | **消息时间戳**。记录消息发送的时间。<br>**作用**：<br>• 按时间排序和导出<br>• 追溯消息发生时间<br>• 统计消息频率 |
| **platform** | string | **消息来源平台**。例如：`discord`、`telegram`、`qq`。<br>**作用**：<br>• 标识消息来自哪个平台<br>• 支持跨平台消息统计<br>• 导出时按平台分组展示 |
| **guild_id** | string | **消息来源群组ID**。格式为 `{platform}:{guildId}`。<br>**作用**：<br>• 标识消息来自哪个群组<br>• 支持跨群组消息统计<br>• 与 conversation.guilds 配合验证 |
| **attachments** | json | **附件信息**。存储消息的附加数据：<br>• 图片 URL 数组<br>• 文件信息<br>• 其他平台特定的元数据<br>**作用**：<br>• 在导出时恢复完整消息内容<br>• 保存图片等富媒体信息<br>• 灵活扩展附件类型 |

### 2.4 扩展 user 表

| 字段 | 类型 | 详细作用说明 |
|------|------|-------------|
| **conversations** | list | **参与的会话ID列表**。格式：`[convId1, convId2, ...]`<br><br>**作用**：<br>1. **记录用户的会话历史**：包括活跃、暂停、已结束的所有会话<br><br>2. **权限验证**：检查用户是否有权访问某个会话<br><br>3. **快速查询**：获取用户参与的所有会话，无需查询 conversation_member 表<br><br>4. **跨平台会话支持**：用户可以在不同平台群组加入同一个会话<br><br>**示例数据**：<br>```typescript<br>[1, 3, 7]  // 用户参与过会话 1, 3, 7<br>```<br><br>**维护逻辑**：<br>• 用户加入任何会话时：追加会话ID（如果不存在）<br>• 用户退出会话时：移除会话ID（可选）<br>• 会话被删除时：从所有用户的列表中移除 |

### 2.5 binding (平台账号绑定表)

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
