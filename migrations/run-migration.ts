/**
 * 角色数据迁移脚本
 *
 * 执行方式：
 *   node -r ts-node/register external/gamemaster/migrations/run-migration.ts
 */

import { Context } from 'koishi'
import { MigrationService } from '../src/core/services/migration.service'

// 创建一个简单的上下文
const ctx = new Context({
  database: {
    type: 'sqlite',
    path: 'data/koishi.db',
  },
})

async function main() {
  console.log('==================================')
  console.log('  角色数据迁移脚本')
  console.log('==================================\n')

  try {
    // 初始化数据库
    await ctx.database.connect()
    console.log('✅ 数据库连接成功\n')

    // 创建迁移服务
    const migrationService = new MigrationService(ctx)

    // 执行迁移
    console.log('开始执行数据迁移...\n')
    const result = await migrationService.migrateCharacterToIntermediateTable()

    // 显示结果
    console.log('\n==================================')
    console.log('  迁移结果')
    console.log('==================================')
    console.log(`成功: ${result.success}`)
    console.log(`迁移数量: ${result.migrated}`)
    console.log(`错误数量: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('\n错误详情:')
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    if (result.success) {
      console.log('\n✅ 数据迁移成功！')

      // 验证迁移结果
      console.log('\n开始验证迁移结果...\n')
      const validation = await migrationService.validateCharacterMigration()

      console.log('==================================')
      console.log('  验证结果')
      console.log('==================================')
      console.log(`验证通过: ${validation.valid}`)
      console.log(`需要迁移的角色数: ${validation.characterCount}`)
      console.log(`关联表记录数: ${validation.linkCount}`)
      console.log(`缺失的角色数: ${validation.missing.length}`)

      if (validation.missing.length > 0) {
        console.log('\n缺失的角色ID:')
        validation.missing.forEach((id) => {
          console.log(`  - ${id}`)
        })
      }

      if (validation.valid) {
        console.log('\n✅ 迁移验证通过！')
        console.log('\n下一步操作:')
        console.log('1. 执行数据库清理: sqlite3 data/koishi.db < external/gamemaster/migrations/cleanup_character_fields.sql')
        console.log('2. 添加数据库索引: sqlite3 data/koishi.db < external/gamemaster/migrations/add_indexes.sql')
        console.log('3. 重启应用并测试功能')
      } else {
        console.log('\n⚠️  迁移验证失败，请检查日志')
        process.exit(1)
      }
    } else {
      console.log('\n❌ 数据迁移失败，请检查错误信息')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ 执行迁移时发生错误:', error)
    process.exit(1)
  } finally {
    await ctx.database.disconnect()
    console.log('\n数据库连接已关闭')
  }
}

// 执行迁移
main()
