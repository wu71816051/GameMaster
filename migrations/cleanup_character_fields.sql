-- ============================================
-- 清理 character 表的废弃字段
-- ============================================
--
-- 功能：移除 character 表中的 conversation_id 和 is_active 字段
-- 原因：这些字段已迁移到 conversation_character 关联表
--
-- 执行前请确保：
-- 1. 已备份数据库
-- 2. 已执行数据迁移，所有数据已迁移到 conversation_character 表
-- 3. 已验证迁移结果
--
-- 执行方式：
--   sqlite3 data/koishi.db < migrations/cleanup_character_fields.sql
--
-- ============================================

-- 开启事务
BEGIN TRANSACTION;

-- 1. 备份当前表
CREATE TABLE character_backup AS SELECT * FROM character;

-- 2. 创建新表（不包含废弃字段）
CREATE TABLE character_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  portrait_url TEXT,
  rule_system TEXT NOT NULL DEFAULT '',
  attributes TEXT NOT NULL DEFAULT '{}',
  skills TEXT NOT NULL DEFAULT '{}',
  inventory TEXT DEFAULT '{}',
  notes TEXT,
  metadata TEXT DEFAULT '{}',
  created_at INTEGER,
  updated_at INTEGER
);

-- 3. 复制数据（排除废弃字段）
INSERT INTO character_new (
  id,
  user_id,
  name,
  portrait_url,
  rule_system,
  attributes,
  skills,
  inventory,
  notes,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  name,
  portrait_url,
  rule_system,
  attributes,
  skills,
  inventory,
  notes,
  metadata,
  created_at,
  updated_at
FROM character;

-- 4. 删除旧表
DROP TABLE character;

-- 5. 重命名新表
ALTER TABLE character_new RENAME TO character;

-- 6. 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_character_user_id ON character(user_id);
CREATE INDEX IF NOT EXISTS idx_character_rule_system ON character(rule_system);
CREATE INDEX IF NOT EXISTS idx_character_name ON character(name);

-- 提交事务
COMMIT;

-- 7. 验证结果
.schema character

SELECT COUNT(*) as character_count FROM character;
SELECT COUNT(*) as backup_count FROM character_backup;

-- 完成提示
SELECT '✅ character 表清理完成！' as status;
SELECT '⚠️  备份表 character_backup 已保留，如无问题可手动删除' as reminder;
