-- ============================================
-- 为 conversation_character 表添加索引
-- ============================================
--
-- 功能：为 conversation_character 表添加索引以提升查询性能
-- 原因：该表经常用于关联查询，添加索引可显著提升性能
--
-- 执行方式：
--   sqlite3 data/koishi.db < migrations/add_indexes.sql
--
-- ============================================

-- 开启事务
BEGIN TRANSACTION;

-- 为 conversation_character 表添加索引
CREATE INDEX IF NOT EXISTS idx_cc_conversation ON conversation_character(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cc_character ON conversation_character(character_id);
CREATE INDEX IF NOT EXISTS idx_cc_active ON conversation_character(is_active);
CREATE INDEX IF NOT EXISTS idx_cc_conversation_active ON conversation_character(conversation_id, is_active);

-- 提交事务
COMMIT;

-- 验证索引创建
SELECT '✅ 索引创建完成！' as status;

-- 查看所有索引
PRAGMA index_list('conversation_character');

-- 查看索引详情
PRAGMA index_info('idx_cc_conversation');
PRAGMA index_info('idx_cc_character');
PRAGMA index_info('idx_cc_active');
PRAGMA index_info('idx_cc_conversation_active');
