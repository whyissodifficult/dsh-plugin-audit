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
| **第 2 轮（197 个）** | **[REPORT-200.md](REPORT-200.md)** | **红旗清单版**：2 个装了即执行代码、12 个含破坏性命令；97% 发布包不带测试；能定位仓库的 84% 有 CI |

第 2 轮的关键数字（**已更正一次**，见下）：

```
样本 197（npm 按下载量排序，已排除官方核心包）
安装期执行代码（postinstall）   2 个
代码里含破坏性命令             12 个
发布包内无测试                191 个（97%）
能定位到 GitHub 仓库          178 个
  其中有 CI                   149 个（84%）
  其中仓库有测试目录           120 个（67%）
代码里出现的外部域名 ≥1 个     121 个
含 git/file 依赖               1 个
```

> **一次自我更正**：初版报告写「只有 10% 有 CI / 8% 有测试」，那是因为抓取仓库信息的后台进程
> 没继承 `GITHUB_TOKEN`，被限流后 161 个请求失败，而我把"失败"算成了"没有 CI"。
> 带令牌重跑后真实数字是 **84% / 67%**——结论从「生态几乎没有工程纪律」反转为
> 「能定位到仓库的插件大多有 CI 和测试，问题在打包时不带测试」。

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
