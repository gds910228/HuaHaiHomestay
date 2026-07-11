# 代码评审报告 · {变更名称} · v1

> 阶段4 产出。用 requesting-code-review skill,按严重度报告问题。
> 评审最多 2 轮,有 blocker 回阶段3 修复。旧版本永不删除,递增 v1/v2。

## 评审结论

- [ ] APPROVED -- 无 blocker,可进入阶段5
- [ ] CHANGES_REQUESTED -- 有 blocker/major,回阶段3(轮次 __/2)
- [ ] ESCALATE -- 超过2轮,升级人工

## 硬性约束检查(逐条对照编码规范)

| 约束 | 通过 | 说明 |
|---|---|---|
| §1 价格兼容 | ⬜ | |
| §2 时间用 serverDate | ⬜ | |
| §3 模糊定位 | ⬜ | |
| §4 ensureCollection | ⬜ | |
| §5 密码/KEY env var | ⬜ | |
| §6 cloud:// 续签 | ⬜ | |
| §7 云存储清理模式 | ⬜ | |
| §8 triggers 落 config | ⬜ | |
| §9 审核文案合规 | ⬜ | |

## 问题清单

| # | 严重度 | 文件:行 | 问题描述 | 建议 | 状态 |
|---|---|---|---|---|---|
| 1 | blocker | | | | |
| 2 | major | | | | |
| 3 | minor | | | | |

严重度定义:blocker(必须修,否则不通过)/ major(建议修)/ minor(可选)

## HITL-2 决议

评审报告交用户,确认无 blocker 后继续阶段5:
(记录用户确认)
