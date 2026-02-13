# Dice Service - 骰子服务

## 概述

骰子服务实现骰子投掷的核心逻辑，支持普通投掷和暴骰（exploding dice），以及各种修饰符（keep/drop highest/lowest）。

## 依赖关系

### 内部依赖
- **Koishi Context**: Koishi 框架上下文对象
- **Utils**:
  - `dice-types`: 骰子类型定义

### 外部依赖
- Koishi 框架

## 核心概念

### 骰点方法
- **normal**: 普通投掷，每个骰子只投一次
- **exploding**: 暴骰，当骰子投出最大值时，重新投掷并累加结果

### 修饰符
- **keepHighest**: 保留最高的 N 个骰子
- **keepLowest**: 保留最低的 N 个骰子
- **dropHighest**: 舍弃最高的 N 个骰子
- **dropLowest**: 舍弃最低的 N 个骰子

## 对外提供的服务

### roll
执行骰点操作。

**工作流程**:
1. 投掷所有骰子（支持暴骰）
2. 应用修饰符过滤骰子
3. 计算最终结果（过滤后的骰子总和 + 修正值）

**参数**:
- `command: ParsedDiceCommand` - 解析后的骰子命令

**返回值**: `DiceRollResult`

```typescript
interface DiceRollResult {
  method: 'normal' | 'exploding'  // 骰点方法
  rawRolls: DieRollResult[]        // 原始投掷结果
  filteredRolls: number[]           // 应用修饰符后的骰子值
  modifier: number                 // 修正值
  final: number                    // 最终结果
  hasExplosion: boolean            // 是否发生了暴骰
}
```

## 数据结构

### ParsedDiceCommand
```typescript
interface ParsedDiceCommand {
  dice: { count: number; faces: number }[]  // 骰子列表
  modifier: number                         // 修正值
  method: 'normal' | 'exploding'           // 骰点方法
  modifiers: DiceModifier[]                 // 修饰符列表
}
```

### DieRollResult
```typescript
interface DieRollResult {
  faces: number              // 骰子面数
  value: number              // 投掷结果
  isExploding: boolean      // 是否为暴骰
  extraRolls?: DieRollResult[]  // 暴骰的额外投掷（递归）
}
```

### DiceModifier
```typescript
interface DiceModifier {
  type: 'keepHighest' | 'keepLowest' | 'dropHighest' | 'dropLowest'
  value: number  // 数量
}
```

## 使用示例

```typescript
import { createDiceService } from './services/dice.service'

const diceService = createDiceService(ctx)

// 普通投掷：2d6+3
const result1 = diceService.roll({
  dice: [{ count: 2, faces: 6 }],
  modifier: 3,
  method: 'normal',
  modifiers: []
})

// 暴骰：2d10! （最大值时重投）
const result2 = diceService.roll({
  dice: [{ count: 2, faces: 10 }],
  modifier: 0,
  method: 'exploding',
  modifiers: []
})

// 带修饰符：4d6k3 （4个6面骰，保留最高的3个）
const result3 = diceService.roll({
  dice: [{ count: 4, faces: 6 }],
  modifier: 0,
  method: 'normal',
  modifiers: [{ type: 'keepHighest', value: 3 }]
})

console.log(`最终结果: ${result3.final}`)
console.log(`原始投掷: ${result3.rawRolls}`)
console.log(`过滤后: ${result3.filteredRolls}`)
```

## 暴骰机制

当使用 `exploding` 方法时：
1. 投掷骰子
2. 如果结果为最大值（如 d6 投出 6），则该骰子标记为暴骰
3. 对暴骰的骰子进行额外投掷
4. 重复步骤 2-3，直到没有新的暴骰
5. 将所有投掷结果累加

## 修饰符应用顺序

修饰符按顺序应用，后续修饰符作用于前一个修饰符的结果：

```typescript
// 示例：4d6kh3dl1
// 1. 投掷 4 个 d6: [3, 5, 2, 6]
// 2. kh3 (keepHighest 3): [5, 2, 6]
// 3. dl1 (dropLowest 1): [5, 6]
// 4. 最终结果: 11
```

## 工厂函数

```typescript
export function createDiceService(ctx: Context): DiceService
```

## 私有方法

- `rollDie(die, method)`: 投掷单个骰子（支持暴骰）
- `rollSingleDie(faces, method)`: 投掷单个骰子（递归处理暴骰）
- `applyModifiers(rolls, modifiers)`: 应用修饰符到骰子结果
- `extractAllValues(rolls)`: 提取所有骰子的值（包括暴骰的递归结果）
- `applySingleModifier(values, modifier)`: 应用单个修饰符
- `random(min, max)`: 生成指定范围的随机整数

## 实现类

```typescript
class DiceServiceImpl implements DiceService {
  constructor(private ctx: Context) {}
  // ...
}
```

## 注意事项

1. **随机数生成**: 使用 `Math.random()` 生成随机数
2. **递归暴骰**: 暴骰使用递归实现，理论上可能无限重投（实际概率极低）
3. **修饰符顺序**: 修饰符按定义顺序应用，需要注意顺序对结果的影响
4. **类型安全**: 服务实现了 `DiceService` 接口，便于测试和替换实现
