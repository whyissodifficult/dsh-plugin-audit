# DSH 插件审计

> 13,136 个 DSH 插件，没有人回答「这个能不能装」。

只读静态分析：拉 npm 包 → 解包 → 读文本。**绝不解包后执行插件代码。**

```bash
node audit/audit.mjs dsh-swarm-console --out out
node audit/audit.mjs --from targets.json --out out
```

输出 `out/audit.json` 与 `out/audit.md`（含等级、分数、逐条发现）。

第一轮 16 个样本的结论见 [REPORT.md](REPORT.md)：**静态分级区分度不足**（13 A / 3 B，均分 89.9），
但筛出了三类真问题（安装期执行代码、非插件包冒充插件、13 个包里零测试文件）。

## 规则（15 条）

高危：`lifecycle-scripts`、`bundle-patch-file`、`git-deps`、`destructive-ops`（按职责上下文降级）
中危：`dsh-manifest`、`no-cleanup`、`no-license`
低危：`touches-dsh-home`、`spawns-process`、`network-egress`、`no-tests-in-package`、`no-engines`、`no-dsh-range`、`huge-files`、`weak-readme`

封顶：命中高危 → 最高 C；命中 ≥2 中危 → 最高 B。

## 它做不到什么

- 不懂"意图"：备份插件删文件是职责，恶意插件删文件是事故，静态分析分不出
- 看不到仓库：测试、CI、issue 历史都不在包里
- 不执行：发现的是"代码里有这个行为"，不是"运行时真会这么做"

所以**这是提问清单，不是判决书**。
