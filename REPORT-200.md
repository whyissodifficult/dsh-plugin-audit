# DSH 插件审计 · 第 2 轮（197 个社区插件）

> 方法：只读静态分析（不解包执行任何插件代码）+ 公开仓库信号。
> **这一版不再打 A/B/C 等级**——分级在这个样本上区分度不足（上一版 169 A / 17 B / 13 C），
> 那是在制造虚假的精确感。现在只列**红旗**，每条都带具体证据。

## 一句话结论

在 197 个按下载量排序的社区插件里，**2 个在安装时就执行代码**，
**12 个代码里含破坏性命令**，**6 个发布包内带测试**；
能定位到 GitHub 的 178 个里，**84% 有 CI**、**67% 仓库里有测试目录**。

## 红旗清单

### 🔴 安装期执行代码（preinstall / install / postinstall）（2 个）

- `@weaxs/dsh-stock-analysis@0.2.16` — 含 postinstall：安装即执行代码
- `dsh-stock-analysis@0.2.16` — 含 postinstall：安装即执行代码

### 🔴 代码里有破坏性命令（rm -rf / Remove-Item -Recurse / git clean）（12 个）

- `@ace-zone/dsh-market@0.1.67` — 在 src/host.js 里出现破坏性命令（与其职责不符，需重点核查）
- `@dsh-electron/dsh-plugin-multi-root-workspace@0.1.24` — 在 lib/command-Df5ZG7In.js 里出现破坏性命令（与其职责不符，需重点核查）
- `@fractalsynapse/dsh-chapters@0.2.50` — 在 lib/gitops.js 里出现破坏性命令（与其职责不符，需重点核查）
- `@noob-stupid/dsh-plugin-console@0.5.115` — 在 lib/server/domain/ai-run.js 里出现破坏性命令（与其职责不符，需重点核查）
- `@twinsearth/w2m-dsh-plugin@3.7.3` — 在 deploy/server/deploy-w2m.sh 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-config-manager@0.12.0` — 在 lib/core/reinstall.js 里出现破坏性命令（与其职责相符：备份/清理类）
- `dsh-plugin-chuhai@0.3.5` — 在 books/ai-global-media/expert/skills/remote-dispatch/scripts/setup-gateway.sh 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-plugin-rea@2.0.18` — 在 scripts/verify-branch.ps1 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-plugin-tool-management@0.23.0` — 在 lib/evolution/gates.js 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-plugin-weixin@1.5.14` — 在 src/asr-remote.js 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-plugin-wsl-env@0.29.1` — 在 agent/wsl-agent.sh 里出现破坏性命令（与其职责不符，需重点核查）
- `dsh-server-deploy@1.2.5` — 在 engine.cjs 里出现破坏性命令（与其职责相符：备份/清理类）

### 🔴 依赖里有 git: / file: / link:（不可复现，可能随时失效）（1 个）

- `dsh-plugin-enhance@0.1.21` — 含非常规依赖：dsh-plugin-enhance-workspace-archive

### 🔴 声明了 dsh.bundle.patch 但包里没有

_本轮无命中。_

### 🟡 代码里没有卸载清理（ctx.effect / dispose）（35 个）

- `@1outres/dsh-plugin-claude-subscription@0.15.0` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@agentic-kit/dsh@0.9.50` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@alexsun-top/dsh-chat-room@0.1.4` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@anysearch/anysearch-dsh@0.1.8` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@dsh-agentic-roleplay/state@0.14.0` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@dsh-enhanced/hello@0.1.84` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@dsh-plugin/dsh-ui-components@0.0.1` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@holo-max/dsh-market-index@1.3.0` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@huaqiu/dsh-plugin-log@0.7.18` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@kangyishuai/dsh-plugin-index@0.0.45030568318` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@morehao/trendradar-contract@0.8.1` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `@tt-a1i/archify-dsh@1.2.0` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `awesome-dsh-plugin-feed@0.20261125.6` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `ds-harness-remote@0.6.8` — 代码里没有找到卸载清理（ctx.effect/dispose）
- `dsh-capdiff@0.2.5` — 代码里没有找到卸载清理（ctx.effect/dispose）
- ……另有 20 个

### 🟡 package.json 没有 dsh 字段（可能不是 DSH 插件）（19 个）

- `@agentic-kit/dsh@0.9.50` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@dsh-plugin/dsh-ui-components@0.0.1` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@holo-max/dsh-market-index@1.3.0` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@huaqiu/dsh-plugin-log@0.7.18` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@hyzyn/dsh-kit@0.8.1` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@kangyishuai/dsh-plugin-index@0.0.45030568318` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@klarkxy/dsh-plugin-kit@0.8.5` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@morehao/trendradar-contract@0.8.1` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@stardustlc/dsh-updates@0.2.10` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `@weibaohui/dsh-plugin-kit@0.5.1` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `awesome-dsh-plugin-feed@0.20261125.6` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-capdiff@0.2.5` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-fix@0.2.0` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-mobile-plugin-catalog@2026.1125.94` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-plugin-catalog@2026.1125.27413` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-plugin-core@0.46.11` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-plugin-shop-catalog@2026.1125.0` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-plugin-update@0.18.39` — package.json 无 dsh 字段（可能不是 DSH 插件）
- `dsh-plugin-updates@2026.1125.27413` — package.json 无 dsh 字段（可能不是 DSH 插件）


## 数量统计

| 项 | 结果 |
| --- | --- |
| 样本 | 197（npm 按下载量排序，已排除官方 `@deepseek-ai/*`） |
| 发布包内**无测试文件** | 191（97%） |
| 代码有网络出口 | 147（75%） |
| 会碰 `~/.dsh` | 127（64%） |
| 会起子进程 | 109（55%） |
| 未声明 DSH 版本范围 | 98（50%） |
| 仓库有 CI | 149/178（84%） |
| 仓库有测试目录 | 120/178（67%） |

> 仓库信号只统计**成功取到**的仓库（178/181）。
> 上一版把"取失败"当成"没有 CI"，得出"只有 10% 有 CI"的错误结论——已更正。

## 具体碰了什么（证据样例）

- `@1outres/dsh-plugin-background`：域名 — ｜ 路径 /home/you/wallpaper.jpg
- `@1outres/dsh-plugin-claude-subscription`：域名 api.anthropic.com ｜ 路径 —
- `@1outres/dsh-plugin-scratchpad`：域名 — ｜ 路径 ~/.dsh/scratchpad
- `@ace-zone/dsh-market`：域名 www.dsh-plugin.shop, codeload.github.com ｜ 路径 /opt/homebrew/bin/pnpm, /usr/local/bin/pnpm, /usr/bin/pnpm
- `@aiwayds/dsh-llm-proxy`：域名 api.deepseek.org, api.example.com ｜ 路径 /opt/homebrew/bin/dsh
- `@aiwayds/dsh-subagent-registry`：域名 opencode.ai, api.typesafe.ai, openrouter.ai ｜ 路径 ~/.dsh/agents, ~/.dsh/agents/<name>.md, ~/.dsh/model-profiles.json
- `@anysearch/anysearch-dsh`：域名 api.anysearch.com ｜ 路径 —
- `@aryacode/dsh-plugin-arya-computer-use`：域名 cdn.jsdelivr.net, www.wikipedia.org ｜ 路径 C:\\ProgramData
- `@boyingliu01/dsh-plugin-xp-gate`：域名 — ｜ 路径 ~/.dsh/.credentials.yaml
- `@dsh-electron/dsh-plugin-multi-root-workspace`：域名 — ｜ 路径 /usr/lib/libSystem.B.dylib, /usr/lib/libsandbox.dylib, C:\\x
- `@dsh-enhanced/assistant-deepseek-budget`：域名 api.deepseek.com, api-docs.deepseek.com ｜ 路径 —
- `@dsh-enhanced/owner-console`：域名 open.feishu.cn ｜ 路径 /opt/homebrew/bin, /usr/local/bin, /usr/bin/security
- `@dsh-plugin/dsh-shell-select`：域名 — ｜ 路径 D:\Git/bin/bash.exe, D:\Git\cmd, C:\path\
- `@fractalsynapse/dsh-chapters`：域名 — ｜ 路径 /home/adrian/Projects/saip, /home/u/p/src/sync.ts
- `@goodandready/dsh-key-limits`：域名 open.er-api.com, api.siliconflow.cn, api.groq.com ｜ 路径 ~/.dsh/storages/dsh-key-limits/
- `@huanlin/dsh-plugin-better-locale`：域名 gateway.example ｜ 路径 —
- `@huaqiu/dsh-tool-pcb-viewer`：域名 dsh.internal ｜ 路径 —
- `@hyzyn/dsh-kit`：域名 qntm.org ｜ 路径 ~/.dsh/env.yml, /etc/hosts, ~/.dsh/**
- `@klarkxy/dsh-plugin-kit`：域名 dsh.internal ｜ 路径 —
- `@kutebai/dsh-keelwatch`：域名 — ｜ 路径 ~/.dsh/profiles/web/cordis.patch.yml

## 这套东西做不到什么（请当提问清单，不要当判决书）

1. **不懂意图**：备份/清理类插件删文件是职责，恶意插件删文件是事故，静态分析分不出。
2. **静态 ≠ 运行时**：发现的是"代码里有这个行为"，不是"运行时真的会这么做"。
3. **路径/域名是字符串匹配**：拼接出来的、运行时才决定的都抓不到。
4. **样本是"下载量前 197 名"**，不代表全部 13,000+。

## 给插件作者的三条自查

1. 有没有 `preinstall`/`install`/`postinstall`？装了就跑代码，是最该避免的。
2. 有没有 `ctx.effect` / disposer？没有的话卸载会留垃圾。
3. README 里有没有写"我会写 `~/.dsh/xxx`、会请求 xxx.com"？用户有权知道。

---

复现：`node audit/collect.mjs 200 targets-200.json && node audit/audit.mjs --from targets-200.json --out out200 && node audit/enrich.mjs out200/audit.json out200/enriched.json && node audit/report.mjs`
