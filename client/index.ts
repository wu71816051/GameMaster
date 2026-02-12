import { Context } from '@koishijs/client'
import Page from './page.vue'

import 'virtual:uno.css'

// 声明前端自定义事件类型
declare module '@koishijs/console' {
  interface Events {
    'gamemaster/get-conversations'(): Promise<any[]>
    'gamemaster/update-conversation'(id: number, data: any): Promise<void>
    'gamemaster/delete-conversation'(id: number): Promise<void>
  }
}

export default (ctx: Context) => {
  ctx.page({
    id: 'gamemaster',
    name: 'Game Master',
    path: '/gamemaster',
    component: Page,
  })
}
