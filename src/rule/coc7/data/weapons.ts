/**
 * CoC7 武器数据表
 *
 * @description
 * 基于 CoC7 规则书表 XVII 的武器数据。
 * 包含近战武器和射击武器的完整数据。
 *
 * @module rule/coc7/data/weapons
 */

import { Weapon } from '../combat/combat-types'

/**
 * CoC7 标准武器表
 */
export const WEAPON_TABLE: Record<string, Weapon> = {
  // ========================================
  // 近战武器
  // ========================================

  // 徒手
  fist: {
    name: '徒手',
    type: 'melee',
    skill: 'fighting',
    damage: '1D3',
    description: '空手攻击',
  },

  brawling: {
    name: '斗殴',
    type: 'melee',
    skill: 'brawling',
    damage: '1D3',
    description: '徒手格斗',
  },

  // 刀类武器
  knife: {
    name: '匕首',
    type: 'melee',
    skill: 'fighting',
    damage: '1D4',
    special: ['贯穿'],
    description: '小型刀具，可投掷',
  },

  switchblade: {
    name: '弹簧刀',
    type: 'melee',
    skill: 'fighting',
    damage: '1D4',
    special: ['贯穿'],
    description: '折叠式刀具',
  },

  // 剑类武器
  saber: {
    name: '军刀',
    type: 'melee',
    skill: 'sword',
    damage: '1D6+DB',
    description: '骑兵剑',
  },

  rapier: {
    name: '刺剑',
    type: 'melee',
    skill: 'sword',
    damage: '1D6',
    special: ['贯穿'],
    description: '细长剑，擅长穿刺',
  },

  katana: {
    name: '武士刀',
    type: 'melee',
    skill: 'sword',
    damage: '1D10+DB',
    description: '日本刀，极度锋利',
  },

  // 棍棒类武器
  club: {
    name: '棍棒',
    type: 'melee',
    skill: 'club',
    damage: '1D6+DB',
    description: '简单的钝器',
  },

  baseball_bat: {
    name: '棒球棒',
    type: 'melee',
    skill: 'club',
    damage: '1D6+DB',
    description: '运动器材，可作为武器',
  },

  wrench: {
    name: '扳手',
    type: 'melee',
    skill: 'club',
    damage: '1D6+DB',
    description: '工具，可用作钝器',
  },

  // 斧类武器
  hatchet: {
    name: '手斧',
    type: 'melee',
    skill: 'axe',
    damage: '1D6+DB',
    description: '小型斧头，可投掷',
  },

  fire_axe: {
    name: '消防斧',
    type: 'melee',
    skill: 'axe',
    damage: '1D8+DB',
    description: '大型斧头',
  },

  // 其他近战武器
  shovel: {
    name: '铁铲',
    type: 'melee',
    skill: 'club',
    damage: '1D6+DB',
    description: '园艺工具',
  },

  poker: {
    name: '拨火棍',
    type: 'melee',
    skill: 'club',
    damage: '1D4+DB',
    description: '炉灶工具',
  },

  spear: {
    name: '长矛',
    type: 'melee',
    skill: 'spear',
    damage: '1D6+DB',
    special: ['贯穿'],
    description: '长柄武器',
  },

  // ========================================
  // 射击武器 - 手枪
  // ========================================

  revolver_38: {
    name: '.38左轮手枪',
    type: 'ranged',
    skill: 'handgun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 6,
    description: '常见警用手枪',
  },

  revolver_45: {
    name: '.45左轮手枪',
    type: 'ranged',
    skill: 'handgun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 6,
    description: '大口径左轮手枪',
  },

  pistol_9mm: {
    name: '9mm手枪',
    type: 'ranged',
    skill: 'handgun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 15,
    description: '半自动手枪',
  },

  pistol_45: {
    name: '.45手枪',
    type: 'ranged',
    skill: 'handgun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 7,
    description: '大口径半自动手枪',
  },

  // ========================================
  // 射击武器 - 步枪/霰弹枪
  // ========================================

  shotgun: {
    name: '霰弹枪',
    type: 'ranged',
    skill: 'shotgun',
    damage: '1D10+4',
    range: '10/20/40',
    bullets: 2,
    description: '12号口径霰弹枪',
  },

  pump_shotgun: {
    name: '泵动式霰弹枪',
    type: 'ranged',
    skill: 'shotgun',
    damage: '1D10+4',
    range: '10/20/40',
    bullets: 6,
    description: '可连续射击的霰弹枪',
  },

  rifle_308: {
    name: '.308步枪',
    type: 'ranged',
    skill: 'rifle',
    damage: '2D6+2',
    range: '50/100/200',
    bullets: 5,
    description: '猎用步枪',
  },

  rifle_303: {
    name: '.303步枪',
    type: 'ranged',
    skill: 'rifle',
    damage: '2D6+2',
    range: '50/100/200',
    bullets: 10,
    description: '军用步枪',
  },

  assault_rifle: {
    name: '突击步枪',
    type: 'ranged',
    skill: 'rifle',
    damage: '2D6+2',
    range: '50/100/200',
    bullets: 30,
    description: '军用自动步枪',
  },

  // ========================================
  // 射击武器 - 冲锋枪
  // ========================================

  smg_45: {
    name: '.45冲锋枪',
    type: 'ranged',
    skill: 'submachine_gun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 30,
    description: '汤姆逊冲锋枪',
  },

  smg_9mm: {
    name: '9mm冲锋枪',
    type: 'ranged',
    skill: 'submachine_gun',
    damage: '1D10',
    range: '15/30/60',
    bullets: 32,
    description: '现代冲锋枪',
  },

  // ========================================
  // 射击武器 - 其他
  // ========================================

  machine_gun: {
    name: '机枪',
    type: 'ranged',
    skill: 'machine_gun',
    damage: '2D6+2',
    range: '50/100/200',
    bullets: 250,
    description: '重型机枪',
  },

  flamethrower: {
    name: '喷火器',
    type: 'ranged',
    skill: 'heavy_weapons',
    damage: '3D6',
    range: '10/20/30',
    bullets: 10,
    description: '喷射燃烧液体',
  },
}

/**
 * 根据武器名称获取武器数据
 *
 * @param weaponName - 武器名称（支持中英文）
 * @returns 武器数据，如果不存在则返回 undefined
 */
export function getWeapon(weaponName: string): Weapon | undefined {
  // 直接匹配
  if (WEAPON_TABLE[weaponName]) {
    return WEAPON_TABLE[weaponName]
  }

  // 模糊匹配（查找包含 weaponName 的武器）
  const matchedKey = Object.keys(WEAPON_TABLE).find(key => {
    const weapon = WEAPON_TABLE[key]
    return (
      weapon.name.includes(weaponName) ||
      weapon.name.toLowerCase().includes(weaponName.toLowerCase())
    )
  })

  return matchedKey ? WEAPON_TABLE[matchedKey] : undefined
}

/**
 * 获取所有近战武器列表
 */
export function getMeleeWeapons(): Weapon[] {
  return Object.values(WEAPON_TABLE).filter(w => w.type === 'melee')
}

/**
 * 获取所有射击武器列表
 */
export function getRangedWeapons(): Weapon[] {
  return Object.values(WEAPON_TABLE).filter(w => w.type === 'ranged')
}

/**
 * 根据技能获取武器列表
 *
 * @param skill - 技能名称
 * @returns 使用该技能的武器列表
 */
export function getWeaponsBySkill(skill: string): Weapon[] {
  return Object.values(WEAPON_TABLE).filter(w => w.skill === skill)
}
