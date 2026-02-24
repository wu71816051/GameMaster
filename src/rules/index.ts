/**
 * 规则解析器模块
 * @description
 * 导出所有规则解析器相关功能
 *
 * @module rules
 */

export * from './base'

// 导入并注册所有解析器
import './default/parser'
import './coc7/character-card-parser'
