# 编码报告 · {变更名称} · v1

> 阶段3 产出。用 executing-plans skill 分批执行 tasks.md。记录每个改动。

## 改动文件清单

| 文件 | 改动类型 | 改动内容摘要 |
|---|---|---|
| | 新增/修改/删除 | |

## Task 执行记录

| Task | 状态 | 说明 |
|---|---|---|
| Task 1 | ✅ | |
| Task 2 | ✅ | |

## 关键实现说明

(涉及核心逻辑的改动说明,如云函数新增 event.type、集合新字段兼容处理等)

## 编码规范自检(阶段4 评审重点)

- [ ] 价格字段兼容 fixedPrice 和 price{low,high}
- [ ] 定位用 fuzzyLocation
- [ ] 新集合 ensureCollection
- [ ] 密码/KEY 走 env var,无硬编码
- [ ] 富文本 cloud:// 续签 refreshContentImages
- [ ] 定时触发器落 config.json
- [ ] 审核文案合规
- [ ] 云函数返回 { success, data?/errMsg? }
- [ ] 复用已有 helper(ensureCollection/checkAdminPassword/refreshContentImages),不重写

## 遗留

(编码中发现但未在本次范围内处理的,记录待后续)
