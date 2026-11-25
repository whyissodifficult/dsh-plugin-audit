# dsh-plugin-audit

> 13,136 个 DSH 插件，先回答一个问题：**这个能不能装。**

只读静态审计：拉 npm 包 → 解包 → 读文本。**绝不解包后执行插件代码**（不 `require`、不 `import`、不跑 npm scripts）。

## 用法

```bash
# 审计一个插件
npx dsh-plugin-audit dsh-swarm-console

# 审计多个
npx dsh-plugin-audit dsh-backup dsh-pet

# 有红旗就退出码 1（可接进 CI）
npx dsh-plugin-audit <包名> --ci

# JSON 输出（脚本消费）
npx dsh-plugin-audit <包名> --json

# 批量
npx dsh-plugin-audit --from list.json
```

输出示例：

```
🔴 dsh-stock-analysis@0.2.16
   41 个文件 · 320 KB · 6 个依赖 · MIT
   🔴 lifecycle-scripts — 含 postinstall：安装即执行代码
   外部域名：api.example.com
```

## 它查什么

| 级别 | 规则 | 含义 |
| --- | --- | --- |
| 🔴 高 | `lifecycle-scripts` | `preinstall`/`install`/`postinstall`——**安装那一刻就执行代码** |
| 🔴 高 | `bundle-patch-file` | 声明了 `dsh.bundle.patch` 但包里没有（装了也起不来） |
| 🔴 高 | `git-deps` | 依赖里有 `git:`/`file:`/`link:`（不可复现，可能随时失效） |
| 🔴 高 | `destructive-ops` | 代码里有 `rm -rf`/`Remove-Item -Recurse`/`git clean`（**按职责降级**：备份/清理、拦截类插件属正常） |
| 🟡 中 | `dsh-manifest` / `no-cleanup` / `no-license` | 缺 `dsh` 字段 / 没有卸载清理 / 没写许可证 |
| ⚪ 低 | `touches-dsh-home` / `spawns-process` / `network-egress` / `no-tests-in-package` / `no-engines` / `no-dsh-range` / `huge-files` / `weak-readme` | DSH 插件天然会碰这些，**只作线索** |

## 已跑过的结果

| 轮次 | 样本 | 报告 |
| --- | --- | --- |
| 第 1 轮 | 16 个 | [REPORT-round1.md](REPORT-round1.md) |
| 第 2 轮 | 197 个社区插件 | **[REPORT-200.md](REPORT-200.md)** |

第 2 轮的关键数字（**含一次自我更正**）：

```
安装期执行代码（postinstall）   2 个
代码里含破坏性命令             12 个（每条都定位到文件）
发布包内无测试                191 个（97%）
能定位到 GitHub 仓库          178 个
  其中有 CI                   149 个（84%）
  其中仓库有测试目录           120 个（67%）
代码里出现外部域名 ≥1 个       121 个
```

> 初版报告曾写「只有 10% 有 CI」——那是抓取仓库信息的进程被 GitHub 匿名限流、
> 而我把"请求失败"当成了"没有 CI"。带令牌重跑后更正为 84%。**失败 ≠ 否**，这是那次教训。

## 它做不到什么（请当提问清单，不要当判决书）

1. **不懂意图**：备份插件删文件是职责，恶意插件删文件是事故，静态分析分不出。
2. **静态 ≠ 运行时**：发现的是"代码里有这个行为"，不是"运行时真会这么做"。
3. **字符串拼出来的路径/域名抓不到**。
4. **不是漏洞扫描器**：没有 CVE 匹配、不做依赖树审计。

被误报请开 issue——**规则会因你的反馈改变，改动会记进报告。**

## 开发

```bash
npm test                                   # 8 条规则单测
node audit/collect.mjs 200 targets-200.json  # 采集样本
node audit/audit.mjs --from targets-200.json --out out200
node audit/enrich.mjs out200/audit.json out200/enriched.json  # 需要 GITHUB_TOKEN
node audit/report.mjs out200/audit.json out200/enriched.json REPORT-200.md
```

MIT
