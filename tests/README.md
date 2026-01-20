# GameMaster 数据库测试

本目录包含 GameMaster 插件数据库模型的完整测试套件。

## 测试文件

### 1. `database.test.ts`
单元测试，覆盖所有数据库模型的基本功能：

- **Conversation Model**
  - 类型定义验证
  - 数据库 CRUD 操作
  - 状态管理
  - 频道管理

- **ConversationMember Model**
  - 类型定义验证
  - 成员管理操作
  - 权限系统验证

- **ConversationMessage Model**
  - 类型定义验证
  - 消息记录操作
  - 统计功能测试

- **User Extension**
  - 用户字段扩展验证
  - 会话列表管理

- **Cross-Table Operations**
  - 跨表关系验证
  - 级联操作测试

- **Data Validation**
  - 数据类型验证
  - 枚举值验证

- **Edge Cases**
  - 边界情况处理
  - 特殊字符处理
  - 大数据量处理

### 2. `integration.test.ts`
集成测试，模拟真实使用场景：

- **Complete Workflow**
  - 完整的会话生命周期
  - 多平台会话管理
  - 多会话参与

- **Permission System**
  - 基于角色的权限控制
  - 权限验证逻辑

- **Message Management**
  - 不同消息类型处理
  - 消息分页功能

- **Data Consistency**
  - 引用完整性验证
  - 级联操作测试

- **Performance Tests**
  - 批量插入性能
  - 并发操作测试

## 安装依赖

```bash
npm install --save-dev mocha chai @types/mocha @types/chai
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
# 单元测试
npx mocha tests/database.test.ts

# 集成测试
npx mocha tests/integration.test.ts
```

### 运行特定测试套件
```bash
# 只测试 Conversation 模型
npx mocha tests/database.test.ts --grep "Conversation Model"

# 只测试权限系统
npx mocha tests/integration.test.ts --grep "Permission System"
```

### 查看测试覆盖率
```bash
npm run test:coverage
```

## 测试覆盖率目标

- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 80%
- **行覆盖率**: ≥ 80%

## 测试编写规范

### 1. 测试命名
```typescript
it('should [expected behavior]', async () => {
  // 测试代码
})
```

### 2. 测试结构
```typescript
describe('Feature Name', () => {
  before(async () => {
    // 测试前准备
  })

  after(async () => {
    // 测试后清理
  })

  it('should do something', async () => {
    // Arrange（准备）
    const input = {}

    // Act（执行）
    const result = await functionUnderTest(input)

    // Assert（断言）
    expect(result).to.equal(expected)
  })
})
```

### 3. 断言建议
- 使用明确的断言方法
- 一个测试只验证一个行为
- 提供有意义的错误信息

```typescript
// 好的断言
expect(conversation.status).to.equal(ConversationStatus.ACTIVE)
expect(members).to.have.lengthOf(3)

// 提供错误信息
expect(result, 'Should create conversation successfully').to.exist
```

## 持续集成

测试将在以下情况下自动运行：
- 每次提交代码
- 创建 Pull Request
- 合并到主分支

## 调试测试

### 在 VS Code 中调试
1. 安装 "Mocha Test Explorer" 扩展
2. 打开测试文件
3. 点击测试旁边的调试按钮

### 使用 Node.js 调试器
```bash
node --inspect-brk node_modules/.bin/mocha tests/database.test.ts
```

## 常见问题

### Q: 测试运行失败怎么办？
A:
1. 检查是否安装了所有依赖
2. 确保数据库连接正常
3. 查看错误日志获取详细信息

### Q: 如何添加新的测试？
A:
1. 在对应的测试文件中添加测试用例
2. 遵循测试命名规范
3. 确保测试独立运行
4. 提交前运行完整测试套件

### Q: 测试太慢怎么办？
A:
1. 使用 `--grep` 参数只运行相关测试
2. 考虑使用测试并行化
3. 优化数据库查询操作

## 贡献指南

添加新功能时，请同时添加对应的测试：

1. 为新功能编写单元测试
2. 添加集成测试验证功能
3. 确保所有测试通过
4. 更新测试文档

## 相关文档

- [Koishi 数据库文档](https://koishi.chat/zh-CN/guide/database/model.html)
- [Mocha 文档](https://mochajs.org/)
- [Chai 断言库](https://www.chaijs.com/)
- [数据库设计文档](../docs/database.md)
