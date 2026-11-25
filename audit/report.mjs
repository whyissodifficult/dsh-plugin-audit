#!/usr/bin/env node
/**
 * 生成 200 样本的审计报告：把 audit.json + enriched.json 汇总成 REPORT-200.md。
 * 只做统计与排版，不联网。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const auditFile = process.argv[2] ?? 'out200/audit.json'
const enrichFile = process.argv[3] ?? 'out200/enriched.json'
const outFile = process.argv[4] ?? 'REPORT-200.md'

const rows = JSON.parse(readFileSync(auditFile, 'utf8')).filter((r) => !r.error)
const enrich = existsSync(enrichFile) ? JSON.parse(readFileSync(enrichFile, 'utf8')) : {}

const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`)
const countBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m }, {})
const flagCount = countBy(rows.flatMap((r) => r.findings.map((f) => f.id)), (x) => x)
const flagsSorted = Object.entries(flagCount).sort((a, b) => b[1] - a[1])
const grades = countBy(rows, (r) => r.grade)

const withRepo = Object.values(enrich).filter((v) => v && v.repo)
const ciPct = pct(withRepo.filter((v) => v.hasCI).length, withRepo.length || 1)
const testPct = pct(withRepo.filter((v) => v.hasTests).length, withRepo.length || 1)
const archived = withRepo.filter((v) => v.archived).length

const risky = rows.filter((r) => r.findings.some((f) => f.level === 'high'))
const noTests = rows.filter((r) => r.findings.some((f) => f.id === 'no-tests-in-package')).length

const md = `# DSH 插件审计 · 第 2 轮（${rows.length} 个社区插件）

> 生成时间：${new Date().toISOString()}
> 方法：只读静态分析 + 公开仓库信号。**不解包执行任何插件代码。**

## 一、样本与总体

- 样本：npm 上按下载量排序的 **${rows.length} 个社区插件**（已排除官方 \`@deepseek-ai/*\` 核心包）
- 等级分布：\`${JSON.stringify(grades)}\`
- 命中高危规则的包：**${risky.length} 个（${pct(risky.length, rows.length)}）**
- 发布包内没有测试文件的：**${noTests} 个（${pct(noTests, rows.length)}）**

## 二、红旗分布（按命中包数排序）

| 规则 | 级别 | 命中包数 | 占比 |
| --- | --- | --- | --- |
${flagsSorted.map(([id, n]) => {
  const level = rows.flatMap((r) => r.findings).find((f) => f.id === id)?.level ?? '-'
  return `| \`${id}\` | ${level} | ${n} | ${pct(n, rows.length)} |`
}).join('\n')}

## 三、仓库维度（${withRepo.length} 个能定位到 GitHub 仓库）

| 信号 | 结果 |
| --- | --- |
| 有 CI 工作流 | ${ciPct} |
| 仓库里有测试目录 | ${testPct} |
| 仓库已归档 | ${archived} 个 |

> 注意：这两项与"发布包里有没有测试"是两件事——很多插件仓库有测试但打包时不带。

## 四、命中高危的包（建议逐个核对）

${risky.length === 0 ? '_本轮无_：' : risky.slice(0, 40).map((r) => {
  const hs = r.findings.filter((f) => f.level === 'high').map((f) => `\`${f.id}\``).join('、')
  return `- \`${r.name}@${r.version}\`（${r.grade}/${r.score}）：${hs}`
}).join('\n')}

## 五、规则与封顶

高危：\`lifecycle-scripts\`、\`bundle-patch-file\`、\`git-deps\`、\`destructive-ops\`（按职责上下文降级）
中危：\`dsh-manifest\`、\`no-cleanup\`、\`no-license\`
低危：\`touches-dsh-home\`、\`spawns-process\`、\`network-egress\`、\`no-tests-in-package\`、\`no-engines\`、\`no-dsh-range\`、\`huge-files\`、\`weak-readme\`

封顶：命中高危 → 最高 C；命中 ≥2 中危 → 最高 B。

## 六、这套东西做不到什么（请当提问清单，不要当判决书）

1. **不懂意图**：备份/清理类插件删文件是职责，恶意插件删文件是事故，静态分析分不出。
2. **静态 ≠ 运行时**：发现的是"代码里有这个行为"，不是"运行时真的会这么做"。
3. **仓库信号只覆盖能解析到 GitHub 的包**（${withRepo.length}/${rows.length}）。
4. **分级区分度仍有限**：见等级分布——如果绝大多数都是 A/B，说明规则适合"筛红旗"，不适合"排名次"。

## 七、给插件作者的三条自查

1. 有没有 \`preinstall\`/\`install\`/\`postinstall\`？装了就跑代码，是最该避免的。
2. 有没有 \`ctx.effect\` / disposer？没有的话卸载会留垃圾。
3. README 里有没有写"我会写 \`~/.dsh/xxx\`"？用户有权知道。

---

复现：\`node audit/audit.mjs --from targets-200.json --out out200\`
`

writeFileSync(outFile, md, 'utf8')
console.log(`已写 ${outFile}`)
console.log(`样本 ${rows.length} | 等级 ${JSON.stringify(grades)} | 高危 ${risky.length} | 有仓库 ${withRepo.length} | CI ${ciPct} | 测试目录 ${testPct}`)
