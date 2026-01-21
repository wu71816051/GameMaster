import { Context, Schema } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/plugin-console'
import { registerDatabaseModels } from './core/models'
import { applyMessageMiddleware } from './core/middleware/message-recorder'
import { registerCommands } from './core/commands'

export const name = 'gamemaster'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export const inject = ['database']

export function apply(ctx: Context, config: Config) {
  // 注册数据库模型
  registerDatabaseModels(ctx)

  // 注册用户命令
  registerCommands(ctx)

  applyMessageMiddleware(ctx)

  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
  })
}
