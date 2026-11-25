#!/usr/bin/env node
/**
 * 生成报告：红旗清单优先，**不打 A/B/C 等级**（分级在这个样本上区分度不足，已弃用）。
 * 只读本地结果，不联网。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const auditFile = process.argv[2] ?? 'out200/audit.json'
const enrichFile = process.argv[3] ?? 'out200/enriched.json'
const outFile = process.argv[4] ?? 'REPORT-200.md'

const rows = JSON.parse(readFileSync(auditFile, 'utf8')).filter((r) => !r.error)
const enrich = existsSync(enrichFile) ? JSON.parse(readFileSync(enrichFile, 'utf8')) : {}

const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`)
const flagging = (id) => rows.filter((r) => r.findings.some((f) => f.id === id))
const noteOf = (r, id) => r.findings.find((f) => f.id === id)?.note ?? ''

const withRepoAll = Object.values(enrich).filter((v) => v && v.repo)
const withRepoOk = Object.values(enrich).filter((v) => v && v.repo && !v.error)
const ciOk = withRepoOk.filter((v) => v.hasCI).length
const testOk = withRepoOk.filter((v) => v.hasTests).length

const highFlags = ['lifecycle-scripts', 'destructive-ops', 'git-deps', 'bundle-patch-file']

const section = (id, title, limit = 12) => {
  const hits = flagging(id)
  if (hits.length === 0) return `### ${title}\n\n_本轮无命中。_\n`
  const lines = hits.slice(0, limit).map((r) => {
    const note = noteOf(r, id)
    return `- \`${r.name}@${r.version}\`${note ? ` — ${note}` : ''}`
  })
  const more = hits.length > limit ? `\n- ……另有 ${hits.length - limit} 个` : ''
  return `### ${title}（${hits.length} 个）\n\n${lines.join('\n')}${more}\n`
}

const md = `# DSH 插件审计 · 第 2 轮（${rows.length} 个社区插件）

> 方法：只读静态分析（不解包执行任何插件代码）+ 公开仓库信号。
> **这一版不再打 A/B/C 等级**——分级在这个样本上区分度不足（上一版 169 A / 17 B / 13 C），
> 那是在制造虚假的精确感。现在只列**红旗**，每条都带具体证据。

## 一句话结论

在 ${rows.length} 个按下载量排序的社区插件里，**${flagging('lifecycle-scripts').length} 个在安装时就执行代码**，
**${flagging('destructive-ops').length} 个代码里含破坏性命令**，**${rows.length - flagging('no-tests-in-package').length} 个发布包内带测试**；
能定位到 GitHub 的 ${withRepoOk.length} 个里，**${pct(ciOk, withRepoOk.length || 1)} 有 CI**、**${pct(testOk, withRepoOk.length || 1)} 仓库里有测试目录**。

## 红旗清单

${section('lifecycle-scripts', '🔴 安装期执行代码（preinstall / install / postinstall）')}
${section('destructive-ops', '🔴 代码里有破坏性命令（rm -rf / Remove-Item -Recurse / git clean）')}
${section('git-deps', '🔴 依赖里有 git: / file: / link:（不可复现，可能随时失效）')}
${section('bundle-patch-file', '🔴 声明了 dsh.bundle.patch 但包里没有')}
${section('no-cleanup', '🟡 代码里没有卸载清理（ctx.effect / dispose）', 15)}
${section('dsh-manifest', '🟡 package.json 没有 dsh 字段（可能不是 DSH 插件）', 20)}

## 数量统计

| 项 | 结果 |
| --- | --- |
| 样本 | ${rows.length}（npm 按下载量排序，已排除官方 \`@deepseek-ai/*\`） |
| 发布包内**无测试文件** | ${flagging('no-tests-in-package').length}（${pct(flagging('no-tests-in-package').length, rows.length)}） |
| 代码有网络出口 | ${flagging('network-egress').length}（${pct(flagging('network-egress').length, rows.length)}） |
| 会碰 \`~/.dsh\` | ${flagging('touches-dsh-home').length}（${pct(flagging('touches-dsh-home').length, rows.length)}） |
| 会起子进程 | ${flagging('spawns-process').length}（${pct(flagging('spawns-process').length, rows.length)}） |
| 未声明 DSH 版本范围 | ${flagging('no-dsh-range').length}（${pct(flagging('no-dsh-range').length, rows.length)}） |
| 仓库有 CI | ${ciOk}/${withRepoOk.length}（${pct(ciOk, withRepoOk.length || 1)}） |
| 仓库有测试目录 | ${testOk}/${withRepoOk.length}（${pct(testOk, withRepoOk.length || 1)}） |

> 仓库信号只统计**成功取到**的仓库（${withRepoOk.length}/${withRepoAll.length}）。
> 上一版把"取失败"当成"没有 CI"，得出"只有 10% 有 CI"的错误结论——已更正。

## 具体碰了什么（证据样例）

${rows.filter((r) => r.evidence && (r.evidence.domains?.length || r.evidence.paths?.length)).slice(0, 20).map((r) => {
  const d = r.evidence.domains?.slice(0, 3).join(', ') || '—'
  const p = r.evidence.paths?.slice(0, 3).join(', ') || '—'
  return `- \`${r.name}\`：域名 ${d} ｜ 路径 ${p}`
}).join('\n')}

## 这套东西做不到什么（请当提问清单，不要当判决书）

1. **不懂意图**：备份/清理类插件删文件是职责，恶意插件删文件是事故，静态分析分不出。
2. **静态 ≠ 运行时**：发现的是"代码里有这个行为"，不是"运行时真的会这么做"。
3. **路径/域名是字符串匹配**：拼接出来的、运行时才决定的都抓不到。
4. **样本是"下载量前 ${rows.length} 名"**，不代表全部 13,000+。

## 给插件作者的三条自查

1. 有没有 \`preinstall\`/\`install\`/\`postinstall\`？装了就跑代码，是最该避免的。
2. 有没有 \`ctx.effect\` / disposer？没有的话卸载会留垃圾。
3. README 里有没有写"我会写 \`~/.dsh/xxx\`、会请求 xxx.com"？用户有权知道。

---

复现：\`node audit/collect.mjs 200 targets-200.json && node audit/audit.mjs --from targets-200.json --out out200 && node audit/enrich.mjs out200/audit.json out200/enriched.json && node audit/report.mjs\`
`
writeFileSync(outFile, md, 'utf8')
console.log(`已写 ${outFile}`)
console.log(`样本 ${rows.length} | 安装期执行代码 ${flagging('lifecycle-scripts').length} | 破坏性命令 ${flagging('destructive-ops').length} | 仓库成功 ${withRepoOk.length} | CI ${ciOk} | 测试 ${testOk}`)
