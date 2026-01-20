/**
 * User 表扩展
 * 为 Koishi 的 User 表添加 conversations 字段
 */

// 扩展 Koishi 的 User 类型
declare module 'koishi' {
  interface User {
    conversations?: number[]  // 参与的会话ID列表
  }
}

export {}
