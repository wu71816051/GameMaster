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
  ctx.command('角色创建 <名称:text> [属性:text] [技能:text]')
    .alias('char.create')
    .alias('ccreate')
    .action(async ({ session }, name, attributesJson, skillsJson) => {
      try {
        logger.info('[Command:角色创建] 执行命令', {
          name,
          attributesJson,
          skillsJson,
          userId: session.userId
        })

        // 参数验证
        if (!name || name.trim().length === 0) {
          return '❌ 请提供角色名称\n示例：角色创建 "约翰·多伊"\n或：ccreate "约翰·多伊"'
        }

        // 解析属性 JSON（如果提供）
        let parsedAttributes: Record<string, any> = {}
        if (attributesJson && attributesJson.trim().length > 0) {
          try {
            parsedAttributes = JSON.parse(attributesJson)
          } catch (error) {
            return `❌ 属性 JSON 格式错误: ${error instanceof Error ? error.message : String(error)}\n` +
                   `💡 示例：角色创建 "约翰" '{"str":50,"con":50}'`
          }
        }

        // 解析技能 JSON（如果提供）
        let parsedSkills: Record<string, any> = {}
        if (skillsJson && skillsJson.trim().length > 0) {
          try {
            parsedSkills = JSON.parse(skillsJson)
          } catch (error) {
            return `❌ 技能 JSON 格式错误: ${error instanceof Error ? error.message : String(error)}\n` +
                   `💡 示例：角色创建 "约翰" '{}' '{"spot_hidden":30}'`
          }
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

        // 创建角色（不指定规则系统，会自动使用会话规则）
        const result = await characterService.createCharacter({
          conversationId,
          userId,
          name: name.trim(),
          attributes: parsedAttributes,
          skills: parsedSkills,
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
                 `🎲 规则系统：${conversation.rule_system}\n\n` +
                 `💡 提示：使用 "角色卡" 或 "card" 查看角色卡\n` +
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
             '📝 正确格式：角色创建 <角色名称> [属性JSON] [技能JSON]\n' +
             '💡 示例：角色创建 "约翰·多伊"\n' +
             '💡 示例：角色创建 "约翰" \'{"str":50,"con":50,"siz":50,"dex":50,"app":50,"int":50,"pow":50,"edu":50}\'\n' +
             '💡 提示：如果名称包含空格，请使用引号包裹\n' +
             '💡 提示：属性和技能使用 JSON 格式提供，不同规则系统有不同要求'
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
  // 命令: 角色激活
  // ========================================
  ctx.command('角色激活 <角色:text>')
    .alias('char.activate')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色激活] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色激活 1\n或：角色激活 "约翰·多伊"'
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
          logger.info('[Command:角色激活] 激活成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `✅ 角色 "${targetCharacter.name}" 已激活\n` +
                 `💡 使用 "角色卡" 或 "card" 查看角色详细信息`
        } else {
          logger.warn('[Command:角色激活] 激活失败', { error: result.error })
          return `❌ 激活角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色激活] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色激活')

  // ========================================
  // 角色激活帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色激活')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色激活 <角色ID或名称>\n' +
             '💡 示例：角色激活 1\n' +
             '💡 或：角色激活 "约翰·多伊"\n' +
             '💡 提示：使用 "角色列表" 查看您的角色'
    })

  // ========================================
  // 命令: 角色加入
  // ========================================
  ctx.command('角色加入 <会话名称:text> <角色名称:text>')
    .alias('char.join')
    .action(async ({ session }, conversationName, characterName) => {
      try {
        logger.info('[Command:角色加入] 执行命令', {
          conversationName,
          characterName,
          userId: session.userId,
        })

        // 参数验证
        if (!conversationName || conversationName.trim().length === 0) {
          return '❌ 请提供会话名称\n示例：角色加入 "会话名" "角色名"'
        }

        if (!characterName || characterName.trim().length === 0) {
          return '❌ 请提供角色名称\n示例：角色加入 "会话名" "角色名"'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 查找会话
        const conversations = await ctx.database.get('conversation', {
          name: conversationName.trim(),
        })

        if (conversations.length === 0) {
          return `❌ 未找到会话 "${conversationName}"\n` +
                 `💡 使用 "会话列表" 查看可用的会话`
        }

        const conversation = conversations[0]

        // 验证用户是否为会话成员
        const members = await ctx.database.get('conversation_member', {
          conversation_id: conversation.id!,
          user_id: userId,
        })

        if (members.length === 0) {
          return `❌ 您不是会话 "${conversationName}" 的成员\n` +
                 `💡 请先使用 "会话加入 ${conversation.id}" 加入会话`
        }

        // 查找角色
        const characters = await ctx.database.get('character', {
          name: characterName.trim(),
          user_id: userId,
        })

        if (characters.length === 0) {
          return `❌ 未找到角色 "${characterName}"\n` +
                 `💡 使用 "角色列表" 查看您的所有角色`
        }

        const character = characters[0]

        // 尝试加入角色到会话
        const result = await characterService.addCharacterToConversation(
          character.id!,
          conversation.id!,
          character.rule_system === conversation.rule_system,
          userId,
          'pc'
        )

        if (!result.success) {
          return `❌ 加入角色失败：${result.error}`
        }

        const isActive = character.rule_system === conversation.rule_system

        logger.info('[Command:角色加入] 加入成功', {
          characterId: character.id,
          characterName: character.name,
          conversationId: conversation.id,
          conversationName: conversation.name,
          isActive,
        })

        let message = `✅ 角色 "${characterName}" 已加入会话 "${conversationName}"\n`

        if (isActive) {
          message += `✅ 已自动激活（规则一致：${character.rule_system}）`
        } else {
          message += `⚠️ 角色规则(${character.rule_system})与会话规则(${conversation.rule_system})不一致，未激活\n` +
                     `💡 提示：使用 "角色激活 ${characterName}" 激活此角色`
        }

        return message
      } catch (error) {
        logger.error('[Command:角色加入] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色加入')

  // ========================================
  // 角色加入帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色加入')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色加入 <会话名称> <角色名称>\n' +
             '💡 示例：角色加入 "克苏鲁团" "调查员"\n' +
             '💡 提示：使用 "会话列表" 查看可用的会话\n' +
             '💡 提示：使用 "角色列表" 查看您的角色'
    })

  // ========================================
  // 命令: 角色归档
  // ========================================
  ctx.command('角色归档 <角色:text>')
    .alias('char.archive')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色归档] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色归档 1\n或：角色归档 "约翰·多伊"'
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

        // 归档角色
        const result = await characterService.archiveCharacter(
          targetCharacter.id,
          conversationId,
          userId
        )

        if (result.success) {
          logger.info('[Command:角色归档] 归档成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `✅ 角色 "${targetCharacter.name}" 已归档\n` +
                 `💡 使用 "角色取消归档 ${targetCharacter.name}" 恢复角色`
        } else {
          logger.warn('[Command:角色归档] 归档失败', { error: result.error })
          return `❌ 归档角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色归档] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色归档')

  // ========================================
  // 角色归档帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色归档')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色归档 <角色ID或名称>\n' +
             '💡 示例：角色归档 1\n' +
             '💡 或：角色归档 "约翰·多伊"\n' +
             '💡 提示：归档的角色不会在角色列表中显示'
    })

  // ========================================
  // 命令: 角色取消归档
  // ========================================
  ctx.command('角色取消归档 <角色:text>')
    .alias('char.unarchive')
    .action(async ({ session }, characterIdentifier) => {
      try {
        logger.info('[Command:角色取消归档] 执行命令', {
          characterIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色取消归档 1\n或：角色取消归档 "约翰·多伊"'
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

        // 获取用户的所有角色（包括已归档的）
        const allCharacters = await ctx.database.get('character', {
          user_id: userId,
        })

        if (allCharacters.length === 0) {
          return '❌ 您还没有创建任何角色'
        }

        // 查找匹配的角色
        const identifier = characterIdentifier.trim()
        const targetCharacter = allCharacters.find(c =>
          c.id?.toString() === identifier ||
          c.name === identifier
        )

        if (!targetCharacter || !targetCharacter.id) {
          return `❌ 未找到角色 "${identifier}"`
        }

        // 检查角色是否在此会话中
        const relations = await ctx.database.get('conversation_character', {
          conversation_id: conversationId,
          character_id: targetCharacter.id,
        })

        if (relations.length === 0) {
          return `❌ 角色 "${targetCharacter.name}" 不在此会话中`
        }

        // 取消归档
        const result = await characterService.unarchiveCharacter(
          targetCharacter.id,
          conversationId,
          userId
        )

        if (result.success) {
          logger.info('[Command:角色取消归档] 取消归档成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
          })

          return `✅ 角色 "${targetCharacter.name}" 已恢复\n` +
                 `💡 使用 "角色列表" 查看所有角色`
        } else {
          logger.warn('[Command:角色取消归档] 取消归档失败', { error: result.error })
          return `❌ 取消归档失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色取消归档] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色取消归档')

  // ========================================
  // 角色取消归档帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色取消归档')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色取消归档 <角色ID或名称>\n' +
             '💡 示例：角色取消归档 1\n' +
             '💡 或：角色取消归档 "约翰·多伊"\n' +
             '💡 提示：恢复已归档的角色'
    })

  // ========================================
  // 命令: 角色转移
  // ========================================
  ctx.command('角色转移 <角色:text> <用户:text>')
    .alias('char.transfer')
    .action(async ({ session }, characterIdentifier, userIdentifier) => {
      try {
        logger.info('[Command:角色转移] 执行命令', {
          characterIdentifier,
          userIdentifier,
          userId: session.userId,
        })

        // 参数验证
        if (!characterIdentifier || characterIdentifier.trim().length === 0) {
          return '❌ 请提供角色ID或名称\n示例：角色转移 1 @用户\n或：角色转移 "约翰·多伊" @用户'
        }

        if (!userIdentifier || userIdentifier.trim().length === 0) {
          return '❌ 请提供目标用户\n示例：角色转移 1 @用户\n或：角色转移 "约翰·多伊" @用户'
        }

        // 获取用户信息
        const userId = await userService.getUserIdFromSession(session)

        // 解析目标用户ID（支持 @用户 格式）
        let toUserId: number
        const match = userIdentifier.match(/<at:id=(\d+)>/) ||
                      userIdentifier.match(/@(\d+)/) ||
                      userIdentifier.match(/^(\d+)$/)

        if (match) {
          toUserId = parseInt(match[1])
        } else {
          return '❌ 无法识别目标用户\n💡 请使用 @用户 或用户ID'
        }

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

        // 转移角色
        const result = await characterService.transferCharacter(
          targetCharacter.id,
          conversationId,
          userId,
          toUserId
        )

        if (result.success) {
          logger.info('[Command:角色转移] 转移成功', {
            characterId: targetCharacter.id,
            name: targetCharacter.name,
            toUserId,
          })

          return `✅ 角色 "${targetCharacter.name}" 已转移\n` +
                 `💡 目标用户现在可以使用此角色`
        } else {
          logger.warn('[Command:角色转移] 转移失败', { error: result.error })
          return `❌ 转移角色失败：${result.error}`
        }
      } catch (error) {
        logger.error('[Command:角色转移] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色转移')

  // ========================================
  // 角色转移帮助命令（无参数时触发）
  // ========================================
  ctx.command('角色转移')
    .action(() => {
      return '❌ 命令格式错误\n\n' +
             '📝 正确格式：角色转移 <角色ID或名称> <目标用户>\n' +
             '💡 示例：角色转移 1 @用户\n' +
             '💡 或：角色转移 "约翰·多伊" @用户\n' +
             '💡 提示：转移后目标用户将成为角色的新主人'
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

  // ========================================
  // 命令: 角色恢复
  // ========================================
  ctx.command('角色恢复 [HP:number] [SAN:number]')
    .alias('char.recover')
    .alias('crecover')
    .action(async ({ session }, hp, san) => {
      try {
        logger.info('[Command:角色恢复] 执行命令', {
          hp,
          san,
          userId: session.userId,
        })

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
          return '❌ 未找到激活角色\n💡 请先使用 "角色激活 <角色>" 命令激活角色'
        }

        // 检查角色规则系统
        if (character.rule_system !== 'coc7') {
          return '❌ 此命令仅支持 CoC7 规则的角色'
        }

        // 导入 CoC7 角色服务
        const { CoC7CharacterService } = await import('../../rule/coc7/coc7-character-service')
        const coc7Service = new CoC7CharacterService(ctx)

        // 获取角色战斗数据
        const combatData = await coc7Service.getCombatData(character.id!)

        if (!combatData) {
          return '❌ 无法获取角色战斗数据'
        }

        // 准备更新
        const updates: any = {}

        // 恢复 HP
        if (hp !== undefined) {
          if (hp < 0 || hp > combatData.maxHp) {
            return `❌ HP 值必须在 0-${combatData.maxHp} 之间`
          }
          updates.currentHp = hp
        } else {
          // 默认恢复到最大 HP
          updates.currentHp = combatData.maxHp
        }

        // 恢复 SAN
        if (san !== undefined) {
          updates.currentSanity = san
        }

        // 更新战斗状态
        await coc7Service.updateCombatState(character.id!, updates)

        let output = `✅ 角色 "${character.name}" 状态已恢复\n\n`
        output += `❤️ HP: ${combatData.currentHp} → ${updates.currentHp}/${combatData.maxHp}`

        if (updates.currentSanity !== undefined) {
          output += `\n🧠 SAN: ${updates.currentSanity}`
        }

        return output
      } catch (error) {
        logger.error('[Command:角色恢复] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色恢复')

  // ========================================
  // 命令: 角色状态
  // ========================================
  ctx.command('角色状态')
    .alias('char.status')
    .alias('cstatus')
    .action(async ({ session }) => {
      try {
        logger.info('[Command:角色状态] 执行命令', {
          userId: session.userId,
        })

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
          return '❌ 未找到激活角色\n💡 请先使用 "角色激活 <角色>" 命令激活角色'
        }

        // 检查角色规则系统
        if (character.rule_system !== 'coc7') {
          return '❌ 此命令仅支持 CoC7 规则的角色'
        }

        // 导入 CoC7 角色服务
        const { CoC7CharacterService } = await import('../../rule/coc7/coc7-character-service')
        const coc7Service = new CoC7CharacterService(ctx)

        // 获取角色战斗数据
        const combatData = await coc7Service.getCombatData(character.id!)

        if (!combatData) {
          return '❌ 无法获取角色战斗数据'
        }

        // 格式化战斗状态
        let output = `📊 **${character.name}** 的战斗状态\n\n`
        output += `❤️ HP: ${combatData.currentHp}/${combatData.maxHp}\n`
        output += `💓 HP 百分比: ${Math.round((combatData.currentHp / combatData.maxHp) * 100)}%\n\n`

        // 状态警告
        if (combatData.currentHp <= 0) {
          output += `⚠️ **警告：角色已失去意识！**\n\n`
        } else if (combatData.currentHp <= combatData.maxHp / 3) {
          output += `⚠️ **警告：HP 低于 1/3，角色重伤！**\n\n`
        } else if (combatData.currentHp <= combatData.maxHp / 2) {
          output += `⚠️ **注意：HP 低于 50%**\n\n`
        }

        // 属性信息
        output += `📊 **属性**\n`
        output += `力量 STR: ${combatData.strength || 0}\n`
        output += `体型 SIZ: ${combatData.size || 0}\n`
        output += `敏捷 DEX: ${combatData.dexterity}\n\n`

        // 战斗技能
        output += `⚔️ **战斗技能**\n`
        if (combatData.fightingSkill) output += `格斗: ${combatData.fightingSkill}\n`
        if (combatData.brawlingSkill) output += `斗殴: ${combatData.brawlingSkill}\n`
        if (combatData.handgunSkill) output += `手枪: ${combatData.handgunSkill}\n`
        if (combatData.dodgeSkill) output += `闪避: ${combatData.dodgeSkill}\n`

        return output
      } catch (error) {
        logger.error('[Command:角色状态] 执行命令时发生错误', error)
        return '❌ 执行命令时发生错误，请稍后重试'
      }
    })

  logger.info('[Commands] 命令注册成功：角色状态')

  logger.info('[Commands] 角色管理命令注册完成')
}
