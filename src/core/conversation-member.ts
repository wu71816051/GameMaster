/**
 * 成员角色枚举
 */
export enum MemberRole {
  CREATOR = 'creator',  // 创建者，拥有所有权限
  ADMIN = 'admin',      // 管理员，可以管理会话和成员
  MEMBER = 'member',    // 普通成员，只能查看、退出和导出
}

/**
 * ConversationMember 表模型接口
 */
export interface ConversationMember {
  id?: number
  conversation_id: number
  user_id: string
  joined_at?: Date
  role: MemberRole
}

/**
 * 定义 ConversationMember 数据库表结构
 */
declare module 'koishi' {
  interface Tables {
    conversation_member: ConversationMember
  }
}
