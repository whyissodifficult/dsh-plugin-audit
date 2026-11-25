#!/usr/bin/env node
/**
 * 细分领域深度扫描：对一组插件做「能用性」评估，而不只是静态红旗。
 *
 * 对每个包：npm 元数据（版本数/最后发布/下载）+ 包内文件 + README 摘要 +
 *           auditOne 的红旗 + 推断的"完成度信号"（有 CLI？有 icon/locale？有 docs？有测试？）
 *
 * 只读：不执行任何插件代码。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { auditOne } from '../audit/audit.mjs'

const inFile = process.argv[2]
const outFile = process.argv[3] ?? 'research/niche.json'
const groups = JSON.parse(readFileSync(inFile, 'utf8'))

async function packument(name) {
  const url = 'https://registry.npmjs.org/' + name.replace('/', '%2F')
  const res = await fetch(url, { headers: { 'user-agent': 'dsh-niche-scan' }, signal: AbortSignal.timeout(25_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function downloadsPoint(name) {
  return fetch(`https://api.npmjs.org/downloads/point/last-week/${name.replace('/', '%2F')}`,
    { signal: AbortSignal.timeout(20_000) })
    .then((r) => (r.ok ? r.json() : { downloads: null }))
    .then((d) => d.downloads)
    .catch(() => null)
}

async function inspect(name) {
  const out = { name }
  try {
    const p = await packument(name)
    const latest = p['dist-tags']?.latest
    const meta = p.versions?.[latest] ?? {}
    out.version = latest
    out.published = p.time?.[latest] ?? null
    out.created = p.time?.created ?? null
    out.versionCount = Object.keys(p.versions ?? {}).length
    out.description = (meta.description ?? '').slice(0, 300)
    out.weekly = await downloadsPoint(name)
    out.hasBin = Boolean(meta.bin)
    out.dsh = meta.dsh ? Object.keys(meta.dsh) : null
    out.deps = Object.keys(meta.dependencies ?? {}).length
  } catch (error) {
    out.error = String(error?.message ?? error)
    return out
  }
  try {
    const a = await auditOne(name)
    out.flags = a.findings.map((f) => `${f.level}:${f.id}`)
    out.fileCount = a.fileCount
    out.tarballKB = Math.round(a.tarballBytes / 1024)
    out.domains = a.evidence?.domains ?? []
    out.paths = a.evidence?.paths ?? []
  } catch (error) {
    out.auditError = String(error?.message ?? error)
  }
  return out
}

mkdirSync('research', { recursive: true })
const result = {}
for (const [group, names] of Object.entries(groups)) {
  result[group] = []
  for (const n of names) {
    const r = await inspect(n)
    result[group].push(r)
    console.log(`${group} | ${n} … ${r.error ? 'ERR ' + r.error : `v${r.version} · 周下载 ${r.weekly} · 版本 ${r.versionCount}`}`)
    await new Promise((s) => setTimeout(s, 120))
  }
}
writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8')
console.log(`\n已写 ${outFile}`)
