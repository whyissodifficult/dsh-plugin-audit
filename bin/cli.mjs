#!/usr/bin/env node
/**
 * dsh-plugin-audit CLI
 *
 *   npx dsh-plugin-audit <包名...>            审计一个或多个 DSH 插件
 *   npx dsh-plugin-audit --from list.json     从 JSON 名单批量审计
 *   npx dsh-plugin-audit <包名> --json        输出 JSON（便于脚本消费）
 *   npx dsh-plugin-audit <包名> --ci          有红旗则退出码 1（可接进 CI）
 *
 * 铁律：只读静态分析。**绝不解包执行插件代码**（不 require、不 import、不跑 npm scripts）。
 */
import { auditOne } from '../audit/audit.mjs'
import { readFileSync } from 'node:fs'

const argv = process.argv.slice(2)
let names = []
let json = false
let ci = false
let quiet = false
let fromFile = null

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--json') { json = true; continue }
  if (a === '--ci') { ci = true; continue }
  if (a === '--quiet' || a === '-q') { quiet = true; continue }
  if (a === '--from') { fromFile = argv[++i] ?? null; continue }
  if (a === '--help' || a === '-h') {
    console.log(`用法：
  dsh-plugin-audit <包名...>          审计 DSH 插件
  dsh-plugin-audit --from list.json   批量（JSON 数组，元素为包名或 {name}）
  dsh-plugin-audit <包名> --json      JSON 输出
  dsh-plugin-audit <包名> --ci        有红旗时退出码 1
选项：--quiet 只输出结论`)
    process.exit(0)
  }
  if (a === '--version' || a === '-v') {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    console.log(pkg.version)
    process.exit(0)
  }
  if (a.startsWith('--')) continue
  names.push(a)
}

if (fromFile) {
  const raw = JSON.parse(readFileSync(fromFile, 'utf8'))
  names = names.concat(raw.map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean))
}

if (names.length === 0) {
  console.error('缺少包名。用 --help 看用法。')
  process.exit(2)
}

const results = []
for (const name of names) {
  try {
    const r = await auditOne(name)
    results.push(r)
    if (!json && !quiet) renderOne(r)
  } catch (error) {
    results.push({ name, error: String(error?.message ?? error) })
    if (!json) console.error(`✗ ${name}：${error?.message ?? error}`)
  }
}

if (json) {
  console.log(JSON.stringify(results, null, 2))
} else if (!quiet) {
  const flagged = results.filter((r) => r.findings?.some((x) => x.level === 'high')).length
  console.log(`\n共 ${results.length} 个包；命中高危 ${flagged} 个。`)
  console.log('提醒：这是**提问清单**，不是判决书——静态分析不懂意图，误报请核对代码。')
}

const hasRed = results.some((r) => r.findings?.some((f) => f.level === 'high'))
if (ci && hasRed) process.exit(1)

function renderOne(r) {
  const highs = r.findings.filter((f) => f.level === 'high')
  const mids = r.findings.filter((f) => f.level === 'mid')
  const mark = highs.length ? '🔴' : mids.length ? '🟡' : '🟢'
  console.log(`\n${mark} ${r.name}@${r.version}`)
  console.log(`   ${r.fileCount} 个文件 · ${(r.tarballBytes / 1024).toFixed(0)} KB · ${r.deps} 个依赖 · ${r.license ?? '无 license'}`)
  if (r.findings.length === 0) {
    console.log('   未发现红旗')
  } else {
    for (const f of r.findings) {
      const icon = f.level === 'high' ? '🔴' : f.level === 'mid' ? '🟡' : '⚪'
      console.log(`   ${icon} ${f.id}${f.note ? ` — ${f.note}` : ''}`)
    }
  }
  const ev = r.evidence ?? {}
  if (ev.domains?.length) console.log(`   外部域名：${ev.domains.slice(0, 5).join(', ')}`)
  if (ev.paths?.length) console.log(`   触及路径：${ev.paths.slice(0, 5).join(', ')}`)
}
