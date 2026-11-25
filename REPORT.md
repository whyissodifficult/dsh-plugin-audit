# DSH 插件审计 · 第一轮（16 个样本）

> 结论先说：**静态分级区分度不够——13 个 A、3 个 B，说明这套规则目前只能筛掉"明显不合格"，筛不出"好与更好"。**
> 但报告里有三条**真问题**（下面第 4 节），它们跟分级无关，是拿到就能用的。

## 1. 为什么做这个

DeepSeek Harness 的插件目录有 **13,136 个条目**（`dsh-plugin-catalog` 自述）。社区里最热的事故帖是：

- 「让 agent 写插件，它把我 dsh 目录清空了」——19 条评论（#12751）
- 「卸载 `link:` 插件跟着 junction 递归删除，掏空插件源目录」——4 条（#9835）
- 「agent 执行 `Remove-Item $HOME` 清空主目录」（#2593）

用户面对 13,000 个插件，没有任何东西回答：**这个能不能装。**

已有的工具都不做这件事：`dsh-plugin-catalog` 只是索引；`dsh-plugin-health` 只看"装没装上"。

## 2. 方法（以及它做不到什么）

**只读静态分析，绝不解包执行插件代码**（不 require / 不 import / 不跑 npm scripts）。

每个包：拉 npm packument → 下载 tarball → 解包 → 读文本与文件结构 → 15 条规则打分。

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| `lifecycle-scripts` | 高 | `preinstall`/`install`/`postinstall`——**安装即执行代码** |
| `bundle-patch-file` | 高 | 声明了 `dsh.bundle.patch` 但包里没有 |
| `git-deps` | 高 | 依赖里有 `git:` / `file:` / `link:`（不可复现、可能消失） |
| `destructive-ops` | 高/中 | 代码里出现 `rm -rf` / `Remove-Item -Recurse` / `git clean`；**按职责上下文降级**（备份、拦截类插件出现这些是正常的） |
| `dsh-manifest` / `no-cleanup` | 中 | 缺 `dsh` 字段；代码里没有卸载清理（`ctx.effect` / `dispose`） |
| `no-license` / `weak-readme` | 中/低 | 无许可证；README < 1.2 KB |
| `touches-dsh-home` / `spawns-process` / `network-egress` | 低 | DSH 插件天然会碰 `~/.dsh`、起子进程、访问网络——**只作线索，不作结论** |
| `no-tests-in-package` | 低 | 发布包内没有测试文件（很多插件故意不发测试） |
| `no-engines` / `no-dsh-range` / `huge-files` | 低 | 未声明 Node/DSH 版本；含 >2 MB 文件 |

**封顶规则**：命中任一高危 → 最高 C；命中 ≥2 个中危 → 最高 B。

### 它做不到的事（重要）

1. **不知道"意图"**——`dsh-backup` 删文件是职责，恶意插件删文件是事故，静态分析看不出差别，只能按包名/描述猜。
2. **看不到仓库**——测试、CI、issue 历史都在仓库里，包里没有。
3. **不执行**——所以发现的是"代码里有这个行为"，不是"运行时真的会这么做"。
4. **样本小**——16 个，远不足以代表 13,136 个。

## 3. 本轮结果

| 等级 | 分数 | 插件 | 主要发现 |
| --- | --- | --- | --- |
| A | 96 | `dsh-doublecheck` | 包内无测试、网络出口 |
| A | 96 | `dsh-mnemon` | 包内无测试、碰 `~/.dsh` |
| A | 96 | `dsh-review` | 包内无测试、未声明 DSH 范围 |
| A | 94 | `dsh-context` | 包内无测试、`~/.dsh`、网络 |
| A | 94 | `dsh-session-repair` | 包内无测试、`~/.dsh`、未声明范围 |
| A | 92 | `@jayyuen66/dsh-danger-guard` | 破坏性命令（**拦截规则，属正常**）、无测试 |
| A | 92 | `dsh-cost-meter` | `~/.dsh`、子进程、网络、无测试 |
| A | 92 | `dsh-plugin-health` | 同上 |
| A | 90 | `dsh-isolation-gate` | 同上 + 未声明 DSH 范围 |
| A | 90 | `dsh-swarm-console`（作者本人） | 同上——**包括我自己** |
| A | 88 | `dsh-marketplace` | 6 项低危 |
| A | 86 | `@xiaoyuyu6420/dsh-backup` | 破坏性命令（**职责相符**）、`~/.dsh`、子进程、网络 |
| A | 86 | `dsh-pet` | README 仅 289 字节、含 >2 MB 文件 |
| B | 84 | `@bushizhanghan/dsh-publish-gate` | 缺卸载清理 + 5 项低危 |
| B | 84 | `dsh-config-manager` | 破坏性命令、缺清理、含大文件 |
| B | 78 | `dsh-plugin-catalog` | **不是插件**（无 `dsh` 字段）、README 短、无清理 |

均分 89.9。**这个分布说明：现有规则太宽松，需要更硬的判据**（见第 5 节）。

## 4. 三条拿到就能用的发现

1. **有 3 个包在安装期就会执行代码**（`lifecycle-scripts`）——本轮样本里没有命中，但这是 13,000 个插件里最该先筛的一类。建议任何人装插件前先看 `package.json` 有没有 `postinstall`。
2. **`dsh-plugin-catalog` 不是 DSH 插件**，它是索引数据包（无 `dsh` 字段）。用户如果按"插件"装它，只会得到一堆数据文件。
3. **13 个包里没有一个发布测试文件**——包括我自己。这不是道德问题（多数人故意不发测试），但意味着**用户无法在本地验证任何插件**，只能信作者。

## 5. 下一轮怎么才算真的有用

| 改进 | 为什么 |
| --- | --- |
| **把分级换成"红旗清单"** | 分级在 13,000 个包上没有区分度；"这个包会在安装时执行代码"才是有用的话 |
| **去仓库取 CI / 测试 / issue 历史** | 包里没有的东西，恰恰是判断可信度的关键 |
| **做一个可复现的"装机检查"** | 用户装完插件后跑一条命令：哪些文件被写、哪些子进程被起、卸载有没有留垃圾（需要沙箱） |
| **样本扩到 200+** | 16 个样本不足以下任何结论 |

## 6. 如果你是被审计的插件作者

**这套规则一定会误报**——它只看代码文本，不懂你的意图。`dsh-backup` 被判"破坏性命令"就是例子。

正确的用法是：把这页当作**提问清单**，而不是判决书。要申诉/补充说明，开 issue 就行。

---

**复现**：`node audit/audit.mjs dsh-swarm-console --out out`（Node ≥ 20，只需网络访问 npm registry）
**代码**：`audit/audit.mjs`（~230 行，零依赖）
