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

## 两轮结果

| 轮次 | 样本 | 结论 |
| --- | --- | --- |
| 第 1 轮（16 个） | [REPORT-round1.md](REPORT-round1.md) | 分级区分度不足（13 A / 3 B，均分 89.9）；但筛出三类真问题 |
| **第 2 轮（199 个）** | **[REPORT-200.md](REPORT-200.md)** | **96% 发布包不带测试；只有 10% 有 CI；13 个命中高危（7%）；2 个装了即执行代码** |

第 2 轮的关键数字：

```
样本 199（npm 按下载量排序，已排除官方核心包）
发布包内无测试        192 个（96%）
仓库有 CI              18 个（10%）
仓库有测试目录         14 个（8%）
命中高危规则           13 个（7%）
含 lifecycle 脚本       2 个（装了就执行代码）
含 git/file 依赖        1 个
```

复现：`node audit/collect.mjs 200 targets-200.json && node audit/audit.mjs --from targets-200.json --out out200 && node audit/enrich.mjs out200/audit.json out200/enriched.json && node audit/report.mjs`

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
