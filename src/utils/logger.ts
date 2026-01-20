/**
 * GameMaster Logger
 * 提供统一的日志记录接口
 */

import { Context } from 'koishi'

export class Logger {
  private ctx: Context
  private prefix: string

  constructor(ctx: Context, prefix: string = 'GameMaster') {
    this.ctx = ctx
    this.prefix = prefix
  }

  /**
   * 调试级别日志
   * 用于详细的调试信息，通常只在开发环境使用
   */
  debug(message: string, ...args: any[]): void {
    this.ctx.logger.debug(`[${this.prefix}] ${message}`, ...args)
  }

  /**
   * 信息级别日志
   * 用于记录一般性的操作信息
   */
  info(message: string, ...args: any[]): void {
    this.ctx.logger.info(`[${this.prefix}] ${message}`, ...args)
  }

  /**
   * 警告级别日志
   * 用于记录潜在的问题或不正常的情况
   */
  warn(message: string, ...args: any[]): void {
    this.ctx.logger.warn(`[${this.prefix}] ${message}`, ...args)
  }

  /**
   * 错误级别日志
   * 用于记录错误信息和异常
   */
  error(message: string, ...args: any[]): void {
    this.ctx.logger.error(`[${this.prefix}] ${message}`, ...args)
  }

  /**
   * 记录操作日志
   * 专门用于记录用户操作和系统操作
   */
  logOperation(operation: string, details: Record<string, any>): void {
    this.info(`操作: ${operation}`, JSON.stringify(details, null, 2))
  }

  /**
   * 记录会话相关操作
   */
  logConversation(operation: string, conversationId: number, details?: Record<string, any>): void {
    this.info(`会话${operation}`, `ID: ${conversationId}`, details ? JSON.stringify(details) : '')
  }

  /**
   * 记录成员相关操作
   */
  logMember(operation: string, userId: string, conversationId: number, details?: Record<string, any>): void {
    this.info(`成员${operation}`, `用户: ${userId}, 会话: ${conversationId}`, details ? JSON.stringify(details) : '')
  }

  /**
   * 记录权限验证失败
   */
  logPermissionDenied(userId: string, operation: string, reason: string): void {
    this.warn(`权限验证失败`, `用户: ${userId}, 操作: ${operation}, 原因: ${reason}`)
  }

  /**
   * 记录数据库操作
   */
  logDatabase(operation: string, table: string, details?: Record<string, any>): void {
    this.debug(`数据库操作: ${operation}`, `表: ${table}`, details ? JSON.stringify(details) : '')
  }

  /**
   * 记录数据库错误
   */
  logDatabaseError(operation: string, table: string, error: Error): void {
    this.error(`数据库操作失败: ${operation}`, `表: ${table}`, error.message)
  }

  /**
   * 记录消息相关操作
   */
  logMessage(operation: string, messageId: string, conversationId: number, details?: Record<string, any>): void {
    this.debug(`消息${operation}`, `消息ID: ${messageId}, 会话: ${conversationId}`, details ? JSON.stringify(details) : '')
  }
}

/**
 * 创建 logger 实例的工厂函数
 */
export function createLogger(ctx: Context, prefix?: string): Logger {
  return new Logger(ctx, prefix)
}

/**
 * 默认导出的 logger 创建函数
 */
export default function(ctx: Context, prefix: string = 'GameMaster') {
  return new Logger(ctx, prefix)
}
