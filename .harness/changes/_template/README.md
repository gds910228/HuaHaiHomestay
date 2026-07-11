# 变更管理模板

> 这是**模板目录**,不要直接在这里填内容。
> 接新需求时,把整个 `_template/` 复制为 `.harness/changes/{feat|fix}-{名称}-{YYYYMMDD}/`,再在各文件里填实际内容。

## 用法(Application Owner Agent 阶段1 执行)

```bash
# 复制模板为具体变更目录(示例)
cp -r .harness/changes/_template .harness/changes/feat-xxx-20260711
```

## 目录结构与对应阶段

```
{type}-{名称}-{YYYYMMDD}/
├── summary.md                          # 全流程追溯唯一真源,每阶段完成立即更新
├── request_analysis/
│   ├── spec.md                         # 阶段1 需求分析(brainstorming 产出)
│   ├── tasks.md                        # 阶段1/3 任务拆解(writing-plans 产出)
│   └── review/
│       └── spec_review_v1.md           # 阶段2 需求评审(最多3轮,v1/v2/v3 递增)
├── coding/
│   ├── coding_report_v1.md             # 阶段3 编码报告(executing-plans 产出)
│   └── review/
│       └── code_review_v1.md           # 阶段4 编码评审(最多2轮,v1/v2 递增)
├── unit_test/
│   ├── test_report.md                  # 阶段5 单元测试报告
│   └── review/
│       └── test_review_v1.md           # 阶段6 测试评审(最多2轮)
├── ci_result/
│   └── verify_report.md                # 阶段8 验证报告(evidence before assertions)
└── deployment/
    └── deploy_report.md                # 阶段9 部署验证(含 HITL-3 部署参数)
```

## 规则

- 评审文件版本递增(v1, v2, v3...),**旧版本永不删除**
- `summary.md` 在每个阶段完成后**立即更新**(执行状态/评审轮次/测试数/部署结果)
- 阶段10 完成后,summary.md 收尾,变更目录作为完整追溯记录保留
- 本次变更新踩的坑,Patch 进 Rules/Skills,并在 summary.md 的「Patch 记录」登记
