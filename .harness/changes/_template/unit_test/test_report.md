# 单元测试报告 · {变更名称}

> 阶段5 产出。用 test-driven-development skill。utils/ 纯函数必写测(放 tests/),云函数写调用脚本。

## 测试清单

| 测试文件 | 覆盖目标 | 用例数 | 通过 | 失败 |
|---|---|---|---|---|
| | | | | |

## 测试执行

- 命令:(如 `node tests/xxx.test.js`)
- 输出摘要:
```
(贴关键输出)
```

## 覆盖说明

- 新增/改动的纯函数:是否都有测
- 关键路径:是否覆盖
- 云函数:调用脚本验证了哪些 event.type,返回是否 success:true

## 反模式自查(对照 test-driven-development/testing-anti-patterns.md)

- [ ] 无定时器睡眠(setTimeout sleep)
- [ ] 无随机测试数据
- [ ] 断言有意义(非 always-true)
- [ ] 无测试间隐式依赖
