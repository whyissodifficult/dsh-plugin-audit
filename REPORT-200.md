# DSH 插件审计 · 第 2 轮（199 个社区插件）

> 生成时间：2026-11-25T12:05:50.602Z
> 方法：只读静态分析 + 公开仓库信号。**不解包执行任何插件代码。**

## 一、样本与总体

- 样本：npm 上按下载量排序的 **199 个社区插件**（已排除官方 `@deepseek-ai/*` 核心包）
- 等级分布：`{"A":169,"C":13,"B":17}`
- 命中高危规则的包：**13 个（7%）**
- 发布包内没有测试文件的：**192 个（96%）**

## 二、红旗分布（按命中包数排序）

| 规则 | 级别 | 命中包数 | 占比 |
| --- | --- | --- | --- |
| `no-tests-in-package` | low | 192 | 96% |
| `network-egress` | low | 149 | 75% |
| `touches-dsh-home` | low | 128 | 64% |
| `spawns-process` | low | 110 | 55% |
| `no-dsh-range` | low | 98 | 49% |
| `no-engines` | low | 58 | 29% |
| `no-cleanup` | mid | 36 | 18% |
| `huge-files` | low | 32 | 16% |
| `dsh-manifest` | mid | 19 | 10% |
| `destructive-ops` | high | 12 | 6% |
| `weak-readme` | low | 8 | 4% |
| `lifecycle-scripts` | high | 2 | 1% |
| `git-deps` | high | 1 | 1% |

## 三、仓库维度（181 个能定位到 GitHub 仓库）

| 信号 | 结果 |
| --- | --- |
| 有 CI 工作流 | 10% |
| 仓库里有测试目录 | 8% |
| 仓库已归档 | 0 个 |

> 注意：这两项与"发布包里有没有测试"是两件事——很多插件仓库有测试但打包时不带。

## 四、命中高危的包（建议逐个核对）

- `@ace-zone/dsh-market@0.1.67`（C/69）：`destructive-ops`
- `@dsh-electron/dsh-plugin-multi-root-workspace@0.1.24`（C/69）：`destructive-ops`
- `@fractalsynapse/dsh-chapters@0.2.50`（C/69）：`destructive-ops`
- `@noob-stupid/dsh-plugin-console@0.5.115`（C/69）：`destructive-ops`
- `@twinsearth/w2m-dsh-plugin@3.7.3`（C/69）：`destructive-ops`
- `@weaxs/dsh-stock-analysis@0.2.16`（C/69）：`lifecycle-scripts`
- `dsh-plugin-chuhai@0.3.5`（C/69）：`destructive-ops`
- `dsh-plugin-enhance@0.1.21`（C/69）：`git-deps`
- `dsh-plugin-rea@2.0.18`（C/69）：`destructive-ops`
- `dsh-plugin-tool-management@0.23.0`（C/69）：`destructive-ops`
- `dsh-plugin-weixin@1.5.14`（C/69）：`destructive-ops`
- `dsh-plugin-wsl-env@0.29.1`（C/69）：`destructive-ops`
- `dsh-stock-analysis@0.2.16`（C/69）：`lifecycle-scripts`

## 五、规则与封顶

高危：`lifecycle-scripts`、`bundle-patch-file`、`git-deps`、`destructive-ops`（按职责上下文降级）
中危：`dsh-manifest`、`no-cleanup`、`no-license`
低危：`touches-dsh-home`、`spawns-process`、`network-egress`、`no-tests-in-package`、`no-engines`、`no-dsh-range`、`huge-files`、`weak-readme`

封顶：命中高危 → 最高 C；命中 ≥2 中危 → 最高 B。

## 六、这套东西做不到什么（请当提问清单，不要当判决书）

1. **不懂意图**：备份/清理类插件删文件是职责，恶意插件删文件是事故，静态分析分不出。
2. **静态 ≠ 运行时**：发现的是"代码里有这个行为"，不是"运行时真的会这么做"。
3. **仓库信号只覆盖能解析到 GitHub 的包**（181/199）。
4. **分级区分度仍有限**：见等级分布——如果绝大多数都是 A/B，说明规则适合"筛红旗"，不适合"排名次"。

## 七、给插件作者的三条自查

1. 有没有 `preinstall`/`install`/`postinstall`？装了就跑代码，是最该避免的。
2. 有没有 `ctx.effect` / disposer？没有的话卸载会留垃圾。
3. README 里有没有写"我会写 `~/.dsh/xxx`"？用户有权知道。

---

复现：`node audit/audit.mjs --from targets-200.json --out out200`
