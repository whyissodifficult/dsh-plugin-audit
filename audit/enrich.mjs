#!/usr/bin/env node
/**
 * 仓库维度补充：从 npm 包的 repository 字段去 GitHub 取"可信度信号"。
 * 只读公开 API，用 GITHUB_TOKEN（若有）避免限流。
 *
 * 输出 out/enriched.json：{ name: { repo, stars, openIssues, hasCI, hasTests, lastPush, license } }
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
const inFile = process.argv[2] ?? 'out/audit.json'
const outFile = process.argv[3] ?? 'out/enriched.json'

const results = JSON.parse(readFileSync(inFile, 'utf8'))

function parseRepo(pkg) {
  // npm 包里其实没有 repository 字段时我们兜底用 GitHub 搜索；这里优先用 packument 里带的
  const r = pkg.repository
  if (!r) return null
  const url = typeof r === 'string' ? r : r.url
  if (!url) return null
  const m = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(url)
  return m ? `${m[1]}/${m[2]}` : null
}

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'user-agent': 'dsh-plugin-audit',
      accept: 'application/vnd.github+json',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const out = {}
for (const r of results) {
  if (r.error) continue
  let record = null
  try {
    const packumentUrl = `https://registry.npmjs.org/${encodeURIComponent(r.name).replace('%40', '@')}`
    const meta = await (await fetch(packumentUrl, { signal: AbortSignal.timeout(20_000) })).json()
    const latest = meta['dist-tags']?.latest
    const pkg = meta.versions?.[latest] ?? {}
    const repo = parseRepo(pkg)
    if (repo) {
      try {
        const info = await api(`/repos/${repo}`)
        let hasCI = false
        let hasTests = false
        try {
          const root = await api(`/repos/${repo}/contents/`)
          if (Array.isArray(root)) {
            const names = root.map((x) => x.name)
            hasTests = names.some((n) => ['test', 'tests', '__tests__', 'spec', 'tests-e2e'].includes(n))
            hasCI = names.includes('.github')
            if (hasCI) {
              try {
                const wf = await api(`/repos/${repo}/contents/.github/workflows`)
                hasCI = Array.isArray(wf) && wf.length > 0
              } catch { hasCI = false }
            }
          }
        } catch { /* 空仓库或无权限 */ }
        record = {
          repo,
          stars: info.stargazers_count ?? 0,
          openIssues: info.open_issues_count ?? 0,
          lastPush: info.pushed_at ?? null,
          archived: info.archived === true,
          license: info.license?.spdx_id ?? null,
          hasCI,
          hasTests,
        }
      } catch {
        record = { repo, error: 'repo-fetch-failed' }
      }
    }
  } catch {
    record = { error: 'npm-meta-failed' }
  }
  out[r.name] = record ?? { repo: null }
  console.log(`${r.name} → ${record ? JSON.stringify(record).slice(0, 100) : 'no repo'}`)
  await new Promise((res) => setTimeout(res, 120))
}

writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8')
const withRepo = Object.values(out).filter((v) => v && v.repo).length
const withCI = Object.values(out).filter((v) => v && v.hasCI).length
const withTests = Object.values(out).filter((v) => v && v.hasTests).length
console.log(`\n完成 ${Object.keys(out).length} 个：有仓库 ${withRepo}，有 CI ${withCI}，有测试目录 ${withTests}`)
