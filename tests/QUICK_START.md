# GameMaster 测试快速参考

## 快速开始

### 1. 安装测试依赖
```bash
cd /Users/wuyufeng/Projects/koishi-app/external/gamemaster
npm install
```

### 2. 运行所有测试
```bash
npm test
```

### 3. 运行特定测试
```bash
# 只运行示例测试
npx mocha tests/examples.test.ts

# 只运行单元测试
npx mocha tests/database.test.ts

# 只运行集成测试
npx mocha tests/integration.test.ts
```

### 4. 运行特定测试用例
```bash
# 只测试会话相关功能
npx mocha --grep "Conversation"

# 只测试权限系统
npx mocha --grep "Permission"

# 只测试消息管理
npx mocha --grep "Message"
```

## 测试文件结构

```
tests/
├── README.md              # 详细测试文档
├── QUICK_START.md         # 快速参考（本文件）
├── database.test.ts       # 单元测试（20k+ 行）
├── integration.test.ts    # 集成测试（14k+ 行）
└── examples.test.ts       # 测试示例（6k+ 行）
```

## 主要测试内容

### 数据库模型测试 (database.test.ts)

✅ **Conversation Model**
- 类型定义验证
- CRUD 操作测试
- 状态管理（ACTIVE, PAUSED, ENDED）
- 频道管理（添加、删除、更新）

✅ **ConversationMember Model**
- 类型定义验证
- 成员管理（添加、删除、查询）
- 权限系统（CREATOR, ADMIN, MEMBER）

✅ **ConversationMessage Model**
- 类型定义验证
- 消息记录（TEXT, IMAGE, AUDIO, VIDEO）
- 统计功能（按类型、平台、用户）

✅ **User Extension**
- 用户字段扩展
- 会话列表管理

✅ **Cross-Table Operations**
- 表关系验证
- 级联操作测试

### 集成测试 (integration.test.ts)

✅ **Complete Workflow**
- 完整会话生命周期
- 多平台会话管理
- 多会话参与场景

✅ **Permission System**
- 角色权限控制
- 权限验证逻辑

✅ **Message Management**
- 不同消息类型处理
- 消息分页功能

✅ **Data Consistency**
- 引用完整性
- 数据一致性验证

✅ **Performance Tests**
- 批量操作性能
- 并发操作测试

### 测试示例 (examples.test.ts)

📝 **示例场景**
- 会话创建示例
- 权限验证示例
- 消息类型示例
- 跨平台功能示例
- 数据验证示例
- 边界情况示例
- 数据转换示例

## 测试覆盖率

当前测试覆盖：

- ✅ 所有数据库模型类型定义
- ✅ 所有枚举类型（ConversationStatus, MemberRole, MessageType）
- ✅ 所有数据库操作（CRUD）
- ✅ 权限系统逻辑
- ✅ 跨表关系
- ✅ 边界情况处理

## 常用命令

### 运行测试
```bash
npm test                    # 运行所有测试
npm run test:watch          # 监视模式
npm run test:coverage       # 生成覆盖率报告
```

### Mocha 选项
```bash
--grep <pattern>            # 只运行匹配的测试
--watch                     # 监视文件变化
--timeout <ms>              # 设置超时时间
--reporter <name>           # 指定报告格式
```

### 示例命令
```bash
# 运行会话相关测试，使用 spec 报告器
npx mocha --grep "Conversation" --reporter spec

# 运行测试并监视文件变化
npx mocha --watch

# 运行测试并设置更长的超时时间
npx mocha --timeout 10000
```

## 断言库使用

### 基础断言
```typescript
expect(value).to.equal(expected)
expect(value).to.be.true
expect(value).to.be.false
expect(value).to.exist
expect(value).to.be.null
expect(value).to.be.undefined
```

### 数字断言
```typescript
expect(value).to.be.greaterThan(10)
expect(value).to.be.lessThan(100)
expect(value).to.be.within(1, 10)
expect(value).to.be.approximately(3.14, 0.01)
```

### 字符串断言
```typescript
expect(str).to.equal('hello')
expect(str).to.have.lengthOf(5)
expect(str).to.include('world')
expect(str).to.match(/^hello/)
```

### 数组断言
```typescript
expect(arr).to.have.lengthOf(3)
expect(arr).to.include(2)
expect(arr).to.have.members([1, 2, 3])
expect(arr).to.be.empty
```

### 对象断言
```typescript
expect(obj).to.have.property('name')
expect(obj).to.have.property('age', 25)
expect(obj).to.deep.equal({ name: 'test' })
```

## 调试技巧

### 1. 使用 console.log
```typescript
it('should debug', () => {
  const result = someFunction()
  console.log('Result:', result)
  expect(result).to.exist
})
```

### 2. 使用 only 运行单个测试
```typescript
it.only('should run only this test', () => {
  // 这个测试会单独运行
})
```

### 3. 使用 skip 跳过测试
```typescript
it.skip('should skip this test', () => {
  // 这个测试会被跳过
})
```

## 常见问题

### Q: 测试运行很慢？
A: 使用 `--grep` 只运行需要的测试

### Q: 某个测试一直失败？
A: 使用 `it.only()` 单独运行该测试进行调试

### Q: 如何查看详细的错误信息？
A: 使用 `--reporter spec` 获取更详细的输出

## 相关资源

- [完整测试文档](./README.md)
- [数据库设计文档](../docs/database.md)
- [Mocha 官方文档](https://mochajs.org/)
- [Chai 断言库](https://www.chaijs.com/)

## 贡献

添加新测试时，请：

1. ✅ 在对应的测试文件中添加测试用例
2. ✅ 遵循现有的测试命名规范
3. ✅ 确保测试独立运行
4. ✅ 添加必要的注释和文档
5. ✅ 运行完整测试套件确保通过
