#!/usr/bin/env node
/** 从 out200/cache/*.json 汇总成 audit.json（并行分片跑完后用，避免互相覆盖）。 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const cacheDir = process.argv[2] ?? 'out200/cache'
const outFile = process.argv[3] ?? 'out200/audit.json'

const rows = []
for (const f of readdirSync(cacheDir)) {
  if (!f.endsWith('.json')) continue
  try {
    rows.push(JSON.parse(readFileSync(join(cacheDir, f), 'utf8')))
  } catch {
    /* 跳过坏文件 */
  }
}
rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
writeFileSync(outFile, JSON.stringify(rows, null, 2), 'utf8')
const ok = rows.filter((r) => !r.error)
console.log(`汇总 ${rows.length} 条（成功 ${ok.length}）→ ${outFile}`)
