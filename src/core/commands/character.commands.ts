/**
 * 角色管理命令模块
 *
 * @description
 * 提供角色卡创建、查看、编辑、删除等管理命令。
 *
 * @module core/commands/character
 */

import { Context } from 'koishi'
import { CharacterService } from '../services/character.service'
import { ConversationService } from '../services/conversation.service'
import { CharacterFormatter } from '../utils/character-formatter'
import { createUserService } from '../services/user.service'

/**
 * 注册角色管理命令
 *
 * @param {Context} ctx - Koishi 上下文对象
 */
export function registerCharacterCommands(ctx: Context) {
  const logger = ctx.logger

  // 创建服务实例
  const characterService = new CharacterService(ctx)
  const conversationService = new ConversationService(ctx)
  const userService = createUserService(ctx)

  logger.info('[Commands] 开始注册角色管理命令')

  // ========================================
  // 命令 1: 创建角色
  // ========================================
  ctx.command('角色创建 <名称:text>')
    .alias('char.create')
    .alias('ccreate')
    .action(async ({ session }, name) => {
      try {
        logger.info('[Command:角色创建] 执行命令', { name, userId: session.userId })

        // 参数验证
        if (!name || name.trim().length === 0) {
          return '❌ 请提供角色名称\n示例：角色创建 "约翰·多伊"\n或：ccreate "约翰·多伊"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话\n' +
                 '💡 请先使用 "会话创建" 或 "会话加入" 命令创建或加入一个会话'
        }

        const conversationId = conversation.id!

        // 创建角色（使用默认规则系统）
        const result = await characterService.createCharacter({
          conversationId,
          userId,
          name: name.trim(),
          ruleSystem: 'generic', // 默认使用通用规则系统
          attributes: {},
          skills: {},
        })

        if (result.success) {
          logger.info('[Command:角色创建] 创建成功', {
            characterId: result.characterId,
            name,
            userId,
          })

          return `✅ 角色创建成功！\n` +
                 `📝 角色名称：${name}\n` +
                 `🆔 角色ID：${result.characterId}\n` +
                 `🎲 规则系统：generic（通用）\n\n` +
                 `💡 提示：使用 "角色设置" 或 "card" 查看角色卡\n` +
                 `💡 提示：使用 "角色编辑" 可以修改角色属性和技能`
        } else {
          logger.warn('[Command:角色创建] 创建失败', { error: result.error })
          return `❌ 创建角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色创建] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色创建')

  // ========================================
  // 角色创建帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色创建')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色创建 <角色名称>\n' +
             '💡 示例：角色创建 "约翰·多伊"\n' +
             '💡 提示：如果名称包含空格，请使用引号包裹'
    })

  // ========================================
  // 命令 2: 显示角色卡（格式化）
  // ========================================
  ctx.command('角色卡')
    .alias('card')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:角色卡] 执行命令', { userId: session.userId })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取激活角色
        const character = await characterService.getActiveCharacter(conversationId, userId)

        if (!character) {
          return '❌ 您还没有创建角色\n' +
                 '💡 使用 "角色创建 <名称>" 命令创建您的第一个角色'
        }

        // 格式化显示角色卡
        return CharacterFormatter.formatCard(character)
      } catch (error) {
        logger.error('[Command:角色卡] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色卡')

  // ========================================
  // 命令 3: 显示激活角色（详细信息）
  // ========================================
  ctx.command('角色显示')
    .alias('char.show')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:角色显示] 执行命令', { userId: session.userId })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取激活角色
        const character = await characterService.getActiveCharacter(conversationId, userId)

        if (!character) {
          return '❌ 您还没有激活的角色\n' +
                 '💡 使用 "角色列表" 查看您的所有角色\n' +
                 '💡 使用 "角色设置 <角色ID或名称>" 设置激活角色'
        }

        // 格式化显示角色详细信息
        return CharacterFormatter.formatDetail(character)
      } catch (error) {
        logger.error('[Command:角色显示] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色显示')

  // ========================================
  // 命令 4: 设置激活角色
  // ========================================
  ctx.command('角色设置 <角色:text>')
    .alias('char.set')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色设置] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色设置 1\n或：角色设置 "约翰·多伊"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取用户的所有角色
        const characters = await characterService.getCharactersByUser(conversationId, userId)

        if (characters.length === 0) {
          return '❌ 您还没有创建任何角色\n' +
                 '💡 使用 "角色创建 <名称>" 命令创建您的第一个角色'
        }

        // 查找匹配的角色（支持 ID 或名称）
        const identifier = characterIdentifier.trim()
        const targetCharacter = characters.find(c =>
          c.id?.toString() === identifier ||
          c.name === identifier
        )

        if (!targetCharacter || !targetCharacter.id) {
          return `❌ 未找到角色 "${identifier}"\n` +
                 `💡 使用 "角色列表" 查看您的所有角色`
        }

        // 设置激活角色
        const result = await characterService.setActiveCharacter({
          conversationId,
          userId,
          characterId: targetCharacter.id,
        })

        if (result.success) {
          logger.info('[Command:角色设置] 设置成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `✅ 已将角色 "${targetCharacter.name}" 设为激活角色\n` +
                 `💡 使用 "角色卡" 或 "card" 查看角色详细信息`
        } else {
          logger.warn('[Command:角色设置] 设置失败', { error: result.error })
          return `❌ 设置激活角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色设置] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色设置')

  // ========================================
  // 角色设置帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色设置')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色设置 <角色ID或名称>\n' +
             '💡 示例：角色设置 1\n' +
             '💡 或：角色设置 "约翰·多伊"\n' +
             '💡 提示：使用 "角色列表" 查看您的角色'
    })

  // ========================================
  // 命令 5: 列出所有角色
  // ========================================
  ctx.command('角色列表')
    .alias('char.list')
    .alias('clist')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:角色列表] 执行命令', { userId: session.userId })

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取用户的所有角色
        const characters = await characterService.getCharactersByUser(conversationId, userId)

        if (characters.length === 0) {
          return '❌ 您还没有创建任何角色\n' +
                 '💡 使用 "角色创建 <名称>" 命令创建您的第一个角色'
        }

        // 格式化显示角色列表
        return CharacterFormatter.formatList(characters)
      } catch (error) {
        logger.error('[Command:角色列表] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色列表')

  // ========================================
  // 命令 6: 删除角色
  // ========================================
  ctx.command('角色删除 <角色:text>')
    .alias('char.delete')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色删除] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色删除 1\n或：角色删除 "约翰·多伊"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取用户的所有角色
        const characters = await characterService.getCharactersByUser(conversationId, userId)

        if (characters.length === 0) {
          return '❌ 您还没有创建任何角色'
        }

        // 查找匹配的角色
        const identifier = characterIdentifier.trim()
        const targetCharacter = characters.find(c =>
          c.id?.toString() === identifier ||
          c.name === identifier
        )

        if (!targetCharacter || !targetCharacter.id) {
          return `❌ 未找到角色 "${identifier}"`
        }

        // 删除角色
        const result = await characterService.deleteCharacter(targetCharacter.id, userId)

        if (result.success) {
          logger.info('[Command:角色删除] 删除成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `✅ 已删除角色 "${targetCharacter.name}"`
        } else {
          logger.warn('[Command:角色删除] 删除失败', { error: result.error })
          return `❌ 删除角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色删除] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色删除')

  // ========================================
  // 角色删除帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色删除')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色删除 <角色ID或名称>\n' +
             '💡 示例：角色删除 1\n' +
             '💡 或：角色删除 "约翰·多伊"'
    })

  // ========================================
  // 命令 7: 导出角色
  // ========================================
  ctx.command('角色导出 <角色:text>')
    .alias('char.export')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色导出] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色导出 1\n或：角色导出 "约翰·多伊"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 获取频道信息
        const channelInfo = {
          platform: session.platform,
          guildId: session.guildId || '0',
          channelId: session.channelId || '0',
        }

        // 查找活跃会话
        const conversation = await conversationService.getActiveConversation({
          channel: channelInfo,
        })

        if (!conversation) {
          return '❌ 当前频道没有活跃的会话'
        }

        const conversationId = conversation.id!

        // 获取用户的所有角色
        const characters = await characterService.getCharactersByUser(conversationId, userId)

        if (characters.length === 0) {
          return '❌ 您还没有创建任何角色'
        }

        // 查找匹配的角色
        const identifier = characterIdentifier.trim()
        const targetCharacter = characters.find(c =>
          c.id?.toString() === identifier ||
          c.name === identifier
        )

        if (!targetCharacter || !targetCharacter.id) {
          return `❌ 未找到角色 "${identifier}"`
        }

        // 导出角色
        const result = await characterService.exportCharacter(targetCharacter.id, userId)

        if (result.success) {
          logger.info('[Command:角色导出] 导出成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `📦 角色 "${targetCharacter.name}" 的数据：\n\`\`\`json\n${result.data}\n\`\`\``
        } else {
          logger.warn('[Command:角色导出] 导出失败', { error: result.error })
          return `❌ 导出角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色导出] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色导出')

  // ========================================
  // 角色导出帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色导出')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色导出 <角色ID或名称>\n' +
             '💡 示例：角色导出 1\n' +
             '💡 或：角色导出 "约翰·多伊"'
    })

  logger.info('[Commands] 角色管理命令注册完成')
}
