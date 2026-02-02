/**
 * CoC7 疯狂表数据
 *
 * @description
 * 克苏鲁的呼唤 7版规则系统的疯狂发作症状表。
 * 包括即时症状表（临时性疯狂）和总结症状表（不定性疯狂）。
 *
 * 触发条件：
 * - 临时性疯狂：单次理智损失 ≥ 5 点
 * - 不定性疯狂：一天内损失总理智 ≥ 当前理智值的 1/5
 *
 * @module rule/coc7/data/madness-tables
 */

/**
 * 即时症状表（临时性疯狂）
 *
 * @description
 * 当调查员单次损失 5 点或更多理智时触发。
 * 症状持续 1D10 轮（游戏内回合）。
 *
 * 骰掷范围：1-100
 */
export const IMMEDIATE_MADNESS_TABLE = [
  {
    range: [1, 4],
    effect: '失忆',
    description: '角色忘记当前发生的事情和周围环境',
    duration: '1D10轮',
    behavior: '角色茫然站立，无法行动，对刺激无反应'
  },
  {
    range: [5, 10],
    effect: '暴力',
    description: '角色对最近的生物发动攻击',
    duration: '1D10轮',
    behavior: '使用武器或徒手攻击最近的活物，包括盟友'
  },
  {
    range: [11, 15],
    effect: '恐惧',
    description: '角色极度恐惧，试图逃离恐怖源',
    duration: '1D10轮',
    behavior: '尽可能快地远离恐怖源，如果受阻则会蜷缩发抖'
  },
  {
    range: [16, 20],
    effect: '偏执',
    description: '角色认为所有人都背叛了自己',
    duration: '1D10轮',
    behavior: '不信任任何人，拒绝帮助，可能攻击盟友'
  },
  {
    range: [21, 25],
    effect: '幻觉',
    description: '角色看到不存在的东西',
    duration: '1D10轮',
    behavior: '看到恐怖的幻象，对幻象做出反应'
  },
  {
    range: [26, 30],
    effect: '昏厥',
    description: '角色失去意识',
    duration: '1D10轮',
    behavior: '倒地不起，无法被唤醒（除非受到伤害）'
  },
  {
    range: [31, 35],
    effect: '狂笑',
    description: '角色无法控制地大笑',
    duration: '1D10轮',
    behavior: '持续大笑，无法说话或进行复杂行动'
  },
  {
    range: [36, 40],
    effect: '躲藏',
    description: '角色试图躲避一切',
    duration: '1D10轮',
    behavior: '寻找最近的藏身处，拒绝出来'
  },
  {
    range: [41, 45],
    effect: '胡言乱语',
    description: '角色无法正常说话',
    duration: '1D10轮',
    behavior: '只能说无意义的词语，无法沟通'
  },
  {
    range: [46, 50],
    effect: '僵直',
    description: '角色无法移动',
    duration: '1D10轮',
    behavior: '身体僵直，可以感知周围但无法行动'
  },
  {
    range: [51, 60],
    effect: '哭泣',
    description: '角色无法控制地哭泣',
    duration: '1D10轮',
    behavior: '持续哭泣，无法进行需要专注的行动'
  },
  {
    range: [61, 70],
    effect: '破坏',
    description: '角色破坏周围的东西',
    duration: '1D10轮',
    behavior: '攻击无生命的物体，破坏装备或环境'
  },
  {
    range: [71, 80],
    effect: '自我伤害',
    description: '角色试图伤害自己',
    duration: '1D10轮',
    behavior: '对自己造成伤害，但不致命'
  },
  {
    range: [81, 90],
    effect: '退缩',
    description: '角色退缩到婴儿状态',
    duration: '1D10轮',
    behavior: '蜷缩、颤抖、寻求安慰'
  },
  {
    range: [91, 100],
    effect: '尖叫',
    description: '角色无法控制地尖叫',
    duration: '1D10轮',
    behavior: '持续尖叫，无法隐藏位置'
  }
]

/**
 * 总结症状表（不定性疯狂）
 *
 * @description
 * 当调查员一天内损失大量理智时触发。
 * 症状持续 1D10 小时。
 *
 * 骰掷范围：1-100
 */
export const SUMMARY_MADNESS_TABLE = [
  {
    range: [1, 10],
    effect: '恐惧症',
    description: '获得特定的恐惧症',
    duration: '1D10小时',
    subtable: '恐惧症表',
    behavior: '避免恐惧源，接近时获得惩罚骰'
  },
  {
    range: [11, 20],
    effect: '躁狂症',
    description: '获得特定的躁狂症',
    duration: '1D10小时',
    subtable: '躁狂症表',
    behavior: '强迫性行为，难以控制'
  },
  {
    range: [21, 30],
    effect: '失忆',
    description: '忘记最近的恐怖经历',
    duration: '永久',
    behavior: '不记得导致疯狂的具体事件'
  },
  {
    range: [31, 40],
    effect: '偏执',
    description: '怀疑所有人都在害自己',
    duration: '1D10小时',
    behavior: '不信任他人，可能误解善意行为'
  },
  {
    range: [41, 50],
    effect: '抑郁',
    description: '陷入深度抑郁',
    duration: '1D10小时',
    behavior: '对所有检定获得惩罚骰，失去动力'
  },
  {
    range: [51, 60],
    effect: '幻觉',
    description: '持续出现幻觉',
    duration: '1D10小时',
    behavior: '看到、听到或闻到不存在的东西'
  },
  {
    range: [61, 70],
    effect: '强迫症',
    description: '发展出强迫行为',
    duration: '永久',
    behavior: '必须重复特定行为才能冷静'
  },
  {
    range: [71, 80],
    effect: '狂躁',
    description: '异常活跃和自信',
    duration: '1D10小时',
    behavior: '冲动行为，忽视危险'
  },
  {
    range: [81, 90],
    effect: '分离',
    description: '感觉与现实分离',
    duration: '1D10小时',
    behavior: '像观察者一样看自己，难以投入行动'
  },
  {
    range: [91, 100],
    effect: '多重症状',
    description: '同时获得多个症状',
    duration: '1D10小时',
    behavior: '掷骰两次，应用两种症状'
  }
]

/**
 * 恐惧症表
 *
 * @description
 * 当总结症状表指示"恐惧症"时使用。
 * 调查员会对特定事物或场景产生强烈恐惧。
 */
export const PHOBIA_TABLE = [
  { roll: [1, 5], phobia: '黑暗', description: '害怕黑暗或黑暗的地方' },
  { roll: [6, 10], phobia: '封闭空间', description: '害怕狭小或封闭的空间' },
  { roll: [11, 15], phobia: '高处', description: '害怕高处' },
  { roll: [16, 20], phobia: '水', description: '害怕深水或溺水' },
  { roll: [21, 25], phobia: '火焰', description: '害怕火' },
  { roll: [26, 30], phobia: '动物', description: '害怕特定类型的动物' },
  { roll: [31, 35], phobia: '昆虫', description: '害怕昆虫或蜘蛛' },
  { roll: [36, 40], phobia: '鲜血', description: '害怕见血' },
  { roll: [41, 45], phobia: '疾病', description: '害怕生病或感染' },
  { roll: [46, 50], phobia: '死亡', description: '害怕死亡或尸体' },
  { roll: [51, 55], phobia: '孤独', description: '害怕独自一人' },
  { roll: [56, 60], phobia: '人群', description: '害怕人群或公共场所' },
  { roll: [61, 65], phobia: '噪音', description: '害怕大声响' },
  { roll: [66, 70], phobia: '宗教符号', description: '害怕宗教符号或仪式' },
  { roll: [71, 75], phobia: '镜子', description: '害怕镜子或倒影' },
  { roll: [76, 80], phobia: '老人', description: '害怕老年人' },
  { roll: [81, 85], phobia: '儿童', description: '害怕儿童' },
  { roll: [86, 90], phobia: '食物', description: '害怕特定食物' },
  { roll: [91, 95], phobia: '天气', description: '害怕暴风雨等恶劣天气' },
  { roll: [96, 100], phobia: '神话生物', description: '害怕特定的神话生物' }
]

/**
 * 躁狂症表
 *
 * @description
 * 当总结症状表指示"躁狂症"时使用。
 * 调查员会表现出强迫性的行为模式。
 */
export const MANIA_TABLE = [
  { roll: [1, 5], mania: '清洁', description: '强迫性地清洁自己和周围' },
  { roll: [6, 10], mania: '检查', description: '反复检查门窗、锁等' },
  { roll: [11, 15], mania: '计数', description: '强迫性地数数或计算' },
  { roll: [16, 20], mania: '收集', description: '收集无用物品' },
  { roll: [21, 25], mania: '说话', description: '不停地说话，难以停止' },
  { roll: [26, 30], mania: '写作', description: '不停地书写或记录' },
  { roll: [31, 35], mania: '仪式', description: '执行特定的迷信仪式' },
  { roll: [36, 40], mania: '帮助', description: '强迫性地帮助他人' },
  { roll: [41, 45], mania: '工作', description: '不停地工作或学习' },
  { roll: [46, 50], mania: '破坏', description: '无法控制地破坏东西' },
  { roll: [51, 55], mania: '偷窃', description: '强迫性地偷窃小物品' },
  { roll: [56, 60], mania: '撒谎', description: '即使没必要也撒谎' },
  { roll: [61, 65], mania: '自残', description: '伤害自己以缓解焦虑' },
  { roll: [66, 70], mania: '暴露', description: '做出暴露或不当行为' },
  { roll: [71, 75], mania: '逃避', description: '逃避责任和现实' },
  { roll: [76, 80], mania: '控制', description: '试图控制他人和环境' },
  { roll: [81, 85], mania: '依赖', description: '过度依赖他人' },
  { roll: [86, 90], mania: '表演', description: '戏剧化地表达情感' },
  { roll: [91, 95], mania: '赌博', description: '无法抗拒地参与冒险' },
  { roll: [96, 100], mania: '宗教', description: '沉迷于宗教或神秘主义' }
]

/**
 * 从即时症状表中掷骰
 *
 * @param roll - 可选的指定掷骰值（1-100），未提供则随机掷骰
 * @returns 即时症状结果
 */
export function rollImmediateMadness(roll?: number): typeof IMMEDIATE_MADNESS_TABLE[0] {
  const rollValue = roll ?? Math.floor(Math.random() * 100) + 1
  return IMMEDIATE_MADNESS_TABLE.find(
    symptom => rollValue >= symptom.range[0] && rollValue <= symptom.range[1]
  ) || IMMEDIATE_MADNESS_TABLE[0]
}

/**
 * 从总结症状表中掷骰
 *
 * @param roll - 可选的指定掷骰值（1-100），未提供则随机掷骰
 * @returns 总结症状结果
 */
export function rollSummaryMadness(roll?: number): typeof SUMMARY_MADNESS_TABLE[0] {
  const rollValue = roll ?? Math.floor(Math.random() * 100) + 1
  return SUMMARY_MADNESS_TABLE.find(
    symptom => rollValue >= symptom.range[0] && rollValue <= symptom.range[1]
  ) || SUMMARY_MADNESS_TABLE[0]
}

/**
 * 从恐惧症表中掷骰
 *
 * @param roll - 可选的指定掷骰值（1-100），未提供则随机掷骰
 * @returns 恐惧症结果
 */
export function rollPhobia(roll?: number): typeof PHOBIA_TABLE[0] {
  const rollValue = roll ?? Math.floor(Math.random() * 100) + 1
  return PHOBIA_TABLE.find(
    phobia => rollValue >= phobia.roll[0] && rollValue <= phobia.roll[1]
  ) || PHOBIA_TABLE[0]
}

/**
 * 从躁狂症表中掷骰
 *
 * @param roll - 可选的指定掷骰值（1-100），未提供则随机掷骰
 * @returns 躁狂症结果
 */
export function rollMania(roll?: number): typeof MANIA_TABLE[0] {
  const rollValue = roll ?? Math.floor(Math.random() * 100) + 1
  return MANIA_TABLE.find(
    mania => rollValue >= mania.roll[0] && rollValue <= mania.roll[1]
  ) || MANIA_TABLE[0]
}
