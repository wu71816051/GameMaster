/**
 * 角色卡命令接口
 * @description
 * 提供：
 * 1. 角色卡CRUD命令
 * 2. 控制权转移命令
 * 3. 数据查询命令
 * 4. 权限检查
 *
 * @module core/commands/character-card
 */

import { Context } from 'koishi'
import { CharacterCardService, createCharacterCardService } from '../services/character-card.service'
import { ConversationService, createConversationService } from '../core/services/conversation.service'
import { getParser, listParsers } from '../rules'

/**
 * 辅助函数：获取当前频道的活跃会话
 * @private
 */
async function getActiveConversation(
  session: any,
  conversationService: ConversationService
) {
  const channel = {
    platform: session.platform,
    guildId: session.guildId,
    channelId: session.channelId,
  }

  return await conversationService.getActiveConversation({ channel })
}

/**
 * 注册角色卡相关命令
 * @param ctx Koishi 上下文对象
 */
export function registerCharacterCardCommands(ctx: Context) {
  // 创建服务实例
  const cardService = createCharacterCardService(ctx)
  const conversationService = createConversationService(ctx)
  // ========================================
  // 角色卡CRUD命令
  // ========================================

  /**
   * 基于父角色卡创建新角色卡
   * 用法: /card.inherit <parentCardId:number>
   * 示例: /card.inherit 1
   */
  ctx.command('card.inherit <parentCardId:number>')
    .alias('card.inherit')
    .action(async ({ session }, parentCardId) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const result = await cardService.createFromParent({
        conversationId: conversation.id!,
        userId,
        parentCardId,
      })

      return result.success
        ? `✅ 角色卡创建成功 (ID: ${result.cardId})`
        : `❌ 创建失败: ${result.error}`
    })

  /**
   * 更新角色卡数据
   * 用法: /card.set <cardId:number> <path:text> <value:text>
   * 示例: /card.set 1 level 5
   * 示例: /card.set 1 attributes.strength 18
   */
  ctx.command('card.set <cardId:number> <path:text> <value:text>')
    .alias('card.set')
    .action(async ({ session }, cardId, path, value) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      // 验证权限：只有控制者可以修改
      const canControl = await cardService.canControlCard(conversation.id!, cardId, userId)
      if (!canControl) {
        return '❌ 你没有控制这个角色卡'
      }

      // 尝试解析value为数字或布尔值
      let parsedValue: any = value
      if (!isNaN(Number(value))) {
        parsedValue = Number(value)
      } else if (value === 'true') {
        parsedValue = true
      } else if (value === 'false') {
        parsedValue = false
      }

      const result = await cardService.updateCardData(conversation.id!, cardId, path, parsedValue)

      return result.success
        ? `✅ 已更新 ${path} = ${parsedValue}`
        : `❌ 更新失败: ${result.error}`
    })

  /**
   * 查询角色卡数据
   * 用法: /card.get <cardId:number> [path:text]
   * 示例: /card.get 1
   * 示例: /card.get 1 level
   * 示例: /card.get 1 attributes.strength
   */
  ctx.command('card.get <cardId:number> [path:text]')
    .alias('card.get')
    .action(async ({ session }, cardId, path) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const card = await cardService.getCard(conversation.id!, cardId)

      if (!card) {
        return `❌ 角色卡 ${cardId} 不存在`
      }

      if (!path) {
        // 返回完整数据
        return `📋 角色卡 "${card.name}" 的数据:\n${JSON.stringify(card.data, null, 2)}`
      }

      // 查询特定路径
      const value = await cardService.getCardData(conversation.id!, cardId, path)
      return value !== undefined
        ? `📋 ${path}: ${JSON.stringify(value)}`
        : `📋 ${path}: (不存在)`
    })

  /**
   * 删除角色卡
   * 用法: /card.delete <cardId:number>
   * 示例: /card.delete 1
   */
  ctx.command('card.delete <cardId:number>')
    .alias('card.delete')
    .action(async ({ session }, cardId) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      // 验证权限：只有所有者可以删除
      const card = await cardService.getCard(conversation.id!, cardId)
      if (!card) {
        return `❌ 角色卡 ${cardId} 不存在`
      }

      if (card.user_id !== userId) {
        return '❌ 只有角色卡的所有者才能删除'
      }

      const success = await cardService.deleteCard(conversation.id!, cardId)

      return success
        ? `✅ 角色卡 "${card.name}" 已删除`
        : '❌ 删除失败'
    })

  /**
   * 列出会话的所有角色卡
   * 用法: /card.list
   */
  ctx.command('card.list')
    .alias('card.list')
    .action(async ({ session }) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const cards = await cardService.listCards(conversation.id!)

      if (cards.length === 0) {
        return '📭 当前会话没有角色卡'
      }

      let output = `📭 当前会话的角色卡 (${cards.length}张):\n`
      output += cards
        .map(
          (card) =>
            `- [${card.id}] ${card.name} (拥有者: ${card.user_id}${
              card.controller_id ? `, 控制者: ${card.controller_id}` : ''
            }`
        )
        .join('\n')

      return output
    })

  // ========================================
  // 角色卡导入命令
  // ========================================

  /**
   * 列出可用的导入规则
   * 用法: /card.import.rules
   */
  ctx.command('card.import.rules')
    .alias('card.import.rules')
    .action(() => {
      const parsers = listParsers()

      if (parsers.length === 0) {
        return '❌ 没有可用的导入规则'
      }

      let output = '📋 可用的导入规则:\n'
      output += parsers
        .map((parser) => `- ${parser.name}: ${parser.description}`)
        .join('\n')

      return output
    })

  /**
   * 从 URL 导入角色卡
   * 用法: /card.import <rule:text> <url:text>
   * 示例: /card.import google-sheets https://docs.google.com/spreadsheets/d/xxx
   */
  ctx.command('card.import <rule:text> <url:text>')
    .alias('card.import')
    .action(async ({ session }, rule, url) => {
      const logger = ctx.logger

      if (!session) {
        return '❌ Session 不存在'
      }

      logger.info(`[角色卡导入] 开始导入 - 用户: ${session.userId}, 规则: ${rule}, URL: ${url}`)

      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        logger.error('[角色卡导入] 当前频道没有活跃会话')
        return '❌ 当前频道没有活跃会话'
      }

      logger.info(`[角色卡导入] 找到活跃会话: ${conversation.id} (${conversation.name})`)

      // 获取解析器
      logger.info(`[角色卡导入] 查找解析器: ${rule}`)
      const parser = getParser(rule)
      if (!parser) {
        const available = listParsers().map((p) => p.name).join(', ')
        logger.error(`[角色卡导入] 未找到规则 "${rule}", 可用规则: ${available}`)
        return `❌ 未找到规则 "${rule}"，可用规则: ${available}`
      }

      logger.info(`[角色卡导入] 找到解析器: ${parser.name} - ${parser.description}`)

      // 验证 URL
      logger.info(`[角色卡导入] 验证 URL: ${url}`)
      if (!parser.validate(url)) {
        logger.error(`[角色卡导入] URL 格式不符合规则 "${rule}" 的要求`)
        return `❌ URL 格式不符合规则 "${rule}" 的要求，请确保使用有效的 Google Sheets 链接`
      }

      logger.info('[角色卡导入] URL 验证通过，开始解析数据...')

      // 解析数据
      void session.send('📥 正在导入角色卡数据...')
      const result = await parser.parse(url)

      logger.info(`[角色卡导入] 解析完成 - 成功: ${result.success}, 卡片数量: ${result.cards?.length || 0}`)

      if (!result.success || !result.cards) {
        logger.error(`[角色卡导入] 解析失败: ${result.error}`)
        return `❌ 导入失败: ${result.error}`
      }

      if (result.cards.length === 0) {
        logger.warn('[角色卡导入] 未找到任何角色卡数据')
        return '⚠️ 未找到任何角色卡数据'
      }

      logger.info(`[角色卡导入] 解析到 ${result.cards.length} 张角色卡，开始创建...`)

      // 批量创建角色卡
      const results: string[] = []
      let successCount = 0
      let failCount = 0

      for (const cardData of result.cards) {
        logger.info(`[角色卡导入] 创建角色卡: ${cardData.name}`)
        const createResult = await cardService.createCard({
          conversationId: conversation.id!,
          userId,
          name: cardData.name,
          data: cardData.data,
          options: {
            parentId: -1,
            rule_system: cardData.rule_system,
            tags: cardData.tags,
          },
        })

        if (createResult.success) {
          successCount++
          logger.info(`[角色卡导入] ✅ "${cardData.name}" 创建成功，ID: ${createResult.cardId}`)
          results.push(`✅ "${cardData.name}" (ID: ${createResult.cardId})`)
        } else {
          failCount++
          logger.error(`[角色卡导入] ❌ "${cardData.name}" 创建失败: ${createResult.error}`)
          results.push(`❌ "${cardData.name}": ${createResult.error}`)
        }
      }

      // 返回结果
      logger.info(`[角色卡导入] 导入完成 - 成功: ${successCount}, 失败: ${failCount}`)
      let output = `📊 导入完成: ${successCount} 成功, ${failCount} 失败\n`
      output += results.join('\n')

      return output
    })

  // ========================================
  // 控制权转移命令
  // ========================================

  /**
   * 转移角色卡控制权
   * 用法: /card.transfer <cardId:number> <toUserId:number> [reason:text]
   * 示例: /card.transfer 1 2 "临时托管"
   */
  ctx.command('card.transfer <cardId:number> <toUserId:number> [reason:text]')
    .alias('card.transfer')
    .action(async ({ session }, cardId, toUserId, reason) => {
      const fromUserId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const result = await cardService.transferControl({
        conversationId: conversation.id!,
        cardId,
        fromUserId,
        toUserId,
        reason,
      })

      return result.success
        ? `✅ ${result.message}`
        : `❌ ${result.error}`
    })

  /**
   * 收回角色卡控制权
   * 用法: /card.revoke <cardId:number>
   * 示例: /card.revoke 1
   */
  ctx.command('card.revoke <cardId:number>')
    .alias('card.revoke')
    .action(async ({ session }, cardId) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const result = await cardService.revokeControl({
        conversationId: conversation.id!,
        cardId,
        userId,
      })

      return result.success
        ? `✅ ${result.message}`
        : `❌ ${result.error}`
    })

  /**
   * 查看用户当前控制的角色卡
   * 用法: /card.controlling
   */
  ctx.command('card.controlling')
    .alias('card.controlling')
    .action(async ({ session }) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const cards = await cardService.getControlledCards(conversation.id!, userId)

      if (cards.length === 0) {
        return '🎮 你当前没有控制任何角色卡'
      }

      let output = `🎮 你当前控制的角色卡 (${cards.length}张):\n`
      output += cards
        .map((card) => {
          const owner = card.user_id === userId ? '(拥有者)' : `(来自玩家${card.user_id})`
          return `- [${card.id}] ${card.name} ${owner}`
        })
        .join('\n')

      return output
    })

  /**
   * 查看用户拥有的角色卡
   * 用法: /card.owned
   */
  ctx.command('card.owned')
    .alias('card.owned')
    .action(async ({ session }) => {
      const userId = session.userId!
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const cards = await cardService.getOwnedCards(conversation.id!, userId)

      if (cards.length === 0) {
        return '👑 你没有拥有任何角色卡'
      }

      let output = `👑 你拥有的角色卡 (${cards.length}张):\n`
      output += cards
        .map((card) => {
          const controller = card.controller_id
          const status = controller
            ? controller === userId
              ? '(你控制)'
              : `(由玩家${controller}控制)`
            : '(你控制)'
          return `- [${card.id}] ${card.name} ${status}`
        })
        .join('\n')

      return output
    })

  /**
   * 查看角色卡的控制权转移历史
   * 用法: /card.history <cardId:number>
   * 示例: /card.history 1
   */
  ctx.command('card.history <cardId:number>')
    .alias('card.history')
    .action(async ({ session }, cardId) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const history = await cardService.getControlHistory(cardId)

      if (history.length === 0) {
        return `📜 角色卡 [${cardId}] 没有控制权转移记录`
      }

      let output = `📜 角色卡 [${cardId}] 的控制权历史:\n`
      output += history
        .map((record) => {
          const reverted = record.reverted_at
            ? ` (已收回于 ${new Date(record.reverted_at!).toLocaleString()})`
            : ' (当前)'
          return `${new Date(record.transferred_at).toLocaleString()}: ${
            record.from_user_id || '所有者'
          } → ${record.to_user_id}${reverted}`
        })
        .join('\n')

      return output
    })

  /**
   * 查看角色卡当前控制者
   * 用法: /card.controller <cardId:number>
   * 示例: /card.controller 1
   */
  ctx.command('card.controller <cardId:number>')
    .alias('card.controller')
    .action(async ({ session }, cardId) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const card = await cardService.getCard(conversation.id!, cardId)

      if (!card) {
        return `❌ 角色卡 [${cardId}] 不存在`
      }

      const owner = card.user_id
      const controller = card.controller_id

      if (!controller || controller === owner) {
        return `🎮 角色卡 "${card.name}" 的控制者：${owner} (所有者)`
      }

      return `🎮 角色卡 "${card.name}" 的控制者：${controller} (临时控制，所有者：${owner})`
    })

  // ========================================
  // 高级查询命令
  // ========================================

  /**
   * 查看角色卡的家族树
   * 用法: /card.tree <cardId:number>
   * 示例: /card.tree 1
   */
  ctx.command('card.tree <cardId:number>')
    .alias('card.tree')
    .action(async ({ session }, cardId) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const familyTree = await cardService.getCardFamilyTree(cardId)

      if (familyTree.length === 0) {
        return `🌳 角色卡 [${cardId}] 没有子角色卡`
      }

      let output = `🌳 角色卡 [${cardId}] 的家族树:\n`
      output += familyTree
        .map((card) => `  ├─ [${card.id}] ${card.name} (会话: ${card.conversation_id})`)
        .join('\n')

      return output
    })

  /**
   * 查看角色卡的祖先链
   * 用法: /card.ancestors <cardId:number>
   * 示例: /card.ancestors 1
   */
  ctx.command('card.ancestors <cardId:number>')
    .alias('card.ancestors')
    .action(async ({ session }, cardId) => {
      const conversation = await getActiveConversation(session, conversationService)

      if (!conversation) {
        return '❌ 当前频道没有活跃会话'
      }

      const chain = await cardService.getCardAncestorChain(cardId)

      if (chain.length === 0) {
        return `🔗 角色卡 [${cardId}] 没有祖先记录`
      }

      let output = `🔗 角色卡 [${cardId}] 的祖先链:\n`
      output += chain
        .map((card, index) =>
          index === 0
            ? `[${card.id}] ${card.name} (根角色卡)`
            : `  ├─ [${card.id}] ${card.name}`
        )
        .join('\n')

      return output
    })
}
