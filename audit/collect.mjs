#!/usr/bin/env node
/**
 * 收集待审计的 DSH 插件名单（按 npm 搜索 + 下载量粗排）。
 * 只读：不安装、不下载 tarball（下载在 audit.mjs 里做）。
 */
import { writeFileSync } from 'node:fs'

const TARGET = Number(process.argv[2] ?? 200)
const OUT = process.argv[3] ?? 'targets-200.json'

const queries = [
  'dsh plugin', 'deepseek harness plugin', 'dsh 插件', 'dsh-plugin',
  'deepseek-harness', 'dsh bundle', 'keys:dsh', 'keywords:dsh-plugin',
]

const seen = new Map()

async function search(text, from = 0, size = 250) {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(text)}&size=${size}&from=${from}`
  const res = await fetch(url, { headers: { 'user-agent': 'dsh-plugin-audit' }, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

for (const q of queries) {
  for (let from = 0; from < 1000; from += 250) {
    let data
    try { data = await search(q, from) } catch { break }
    const objects = data.objects ?? []
    if (objects.length === 0) break
    for (const o of objects) {
      const p = o.package ?? {}
      const name = p.name
      if (!name) continue
      const desc = `${p.description ?? ''} ${(p.keywords ?? []).join(' ')}`.toLowerCase()
      // 只留看起来是 DSH 插件生态的
      const looksDsh = name.startsWith('dsh') || name.includes('dsh-') || name.startsWith('@deepseek-ai/')
        || /deepseek harness|dsh plugin|dsh 插件/.test(desc)
      if (!looksDsh) continue
      if (seen.has(name)) continue
      seen.set(name, {
        name,
        version: p.version ?? null,
        published: p.date ?? null,
        weekly: o.downloads?.weekly ?? 0,
        description: (p.description ?? '').slice(0, 120),
      })
    }
    if (objects.length < 250) break
  }
}

// 官方核心包（@deepseek-ai/*）不是"第三方插件"，单独统计，不混进社区审计
const EXCLUDE_OFFICIAL = !process.argv.includes('--include-official')
const all = [...seen.values()]
  .filter((p) => (EXCLUDE_OFFICIAL ? !p.name.startsWith('@deepseek-ai/') : true))
  .sort((a, b) => b.weekly - a.weekly)
const picked = all.slice(0, TARGET)
writeFileSync(OUT, JSON.stringify(picked, null, 2), 'utf8')
console.log(`候选 ${all.length} 个，取前 ${picked.length} 写入 ${OUT}`)
console.log('前 10:', picked.slice(0, 10).map((p) => `${p.name}(${p.weekly}/周)`).join(', '))
