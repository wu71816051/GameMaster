/**
 * 控制权转移记录模型
 * @description 记录角色卡的控制权转移历史
 */

/**
 * 控制权转移记录
 * @description 每次控制权转移都会创建一条记录，支持审计和查询
 */
export interface ControlTransfer {
  id?: number
  card_id: number              // 角色卡ID
  from_user_id: number | null  // 从谁转移（null表示从所有者）
  to_user_id: number            // 转移给谁
  transferred_at: Date          // 转移时间
  reason?: string               // 转移原因（可选）
  reverted_at?: Date            // 收回时间（null表示未收回）
}

/**
 * 注册 ControlTransfer 表
 * @description 在 koishi 的 Tables 接口中声明 control_transfer 表
 */
declare module 'koishi' {
  interface Tables {
    control_transfer: ControlTransfer
  }
}
