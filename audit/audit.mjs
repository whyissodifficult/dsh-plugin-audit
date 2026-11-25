#!/usr/bin/env node
/**
 * DSH 插件审计（静态）
 *
 * 目标：在 13,000+ 个插件里，给出一个**只看不跑**的质量分级。
 * 铁律：**绝不解包后执行任何插件代码**（不 require、不 import、不跑 npm scripts）。
 * 只做三件事：拉 npm 包 → 解包 → 读文本/看文件结构。
 *
 * 用法：
 *   node audit/audit.mjs <npm包名> [更多包名...]
 *   node audit/audit.mjs --from targets.json --out out/
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const REGISTRY = 'https://registry.npmjs.org'

// ── 工具 ───────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'dsh-plugin-audit' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (error) {
      if (i === tries - 1) throw error
      await sleep(400 * (i + 1))
    }
  }
}

async function fetchBuffer(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'dsh-plugin-audit' },
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      if (i === tries - 1) throw error
      await sleep(400 * (i + 1))
    }
  }
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    let st
    try { st = statSync(abs) } catch { continue }
    if (st.isDirectory()) walk(abs, base, out)
    else out.push({ rel: abs.slice(base.length + 1).replaceAll('\\', '/'), size: st.size, abs })
  }
  return out
}

function readText(abs, limit = 400_000) {
  try {
    const buf = readFileSync(abs)
    if (buf.length > limit) return buf.subarray(0, limit).toString('utf8')
    return buf.toString('utf8')
  } catch {
    return ''
  }
}

const TEXT_EXT = /\.(js|mjs|cjs|ts|json|yml|yaml|md|txt|sh|ps1)$/i
// 行为类规则只看代码：文档里提到 rm -rf / .dsh 不算问题
const CODE_EXT = /\.(js|mjs|cjs|ts|sh|ps1)$/i
const isCode = (rel) => CODE_EXT.test(rel) && !/\.d\.ts$/i.test(rel) && !/^package\.json$/i.test(rel)

// ── 规则 ───────────────────────────────────────────────────────────────

/**
 * 每条规则返回 { id, level: 'high'|'mid'|'low', hit: boolean, note?: string }
 * level 表示“命中时的问题严重度”，用于扣分与展示。
 */
function runRules(pkg, files, texts, codeTexts) {
  const rules = []
  const add = (id, level, hit, note = '') => rules.push({ id, level, hit, note })

  const scripts = pkg.scripts ?? {}
  const lifecycle = ['preinstall', 'install', 'postinstall']
  const hitLifecycle = lifecycle.filter((k) => scripts[k])
  add('lifecycle-scripts', 'high', hitLifecycle.length > 0,
    hitLifecycle.length ? `含 ${hitLifecycle.join('/')}：安装即执行代码` : '')

  // 是否声明 dsh bundle
  const hasDsh = pkg.dsh !== undefined
  add('dsh-manifest', 'mid', !hasDsh, hasDsh ? '' : 'package.json 无 dsh 字段（可能不是 DSH 插件）')

  // bundle patch 文件是否存在
  const patchPath = pkg.dsh?.bundle?.patch
  const patchExists = typeof patchPath === 'string' && files.some((f) => f.rel === patchPath.replace(/^\.\//, ''))
  add('bundle-patch-file', 'high', typeof patchPath === 'string' && !patchExists,
    typeof patchPath === 'string' && !patchExists ? `声明了 ${patchPath} 但包里没有` : '')

  // 是否有测试
  const hasTestFiles = files.some((f) => /(^|\/)(test|tests|__tests__)\//.test(f.rel))
  add('no-tests-in-package', 'low', !hasTestFiles,
    hasTestFiles ? '' : (typeof scripts.test === 'string' ? '有 test 脚本但发布包不含测试文件' : '发布包内没有测试文件'))

  // README 是否足够（陌生人能否看懂）
  const readme = files.find((f) => /^readme\.md$/i.test(f.rel))
  const readmeLen = readme ? readme.size : 0
  add('weak-readme', 'low', readmeLen < 1200, readmeLen ? `README ${readmeLen} 字节` : '无 README')

  // license
  add('no-license', 'mid', !pkg.license && !files.some((f) => /^licen[cs]e/i.test(f.rel)), '未声明 license')

  // 敏感路径：读写 ~/.dsh 之类
  const sensitive = codeTexts.find((t) => /\.dsh\b|\.dsh\/|\.dsh\\\\/.test(t.text))
  add('touches-dsh-home', 'low', Boolean(sensitive), sensitive ? `在 ${sensitive.rel} 里出现 .dsh 路径` : '')

  // 破坏性命令
  const destructive = codeTexts.find((t) => /\brm\s+-rf\b|Remove-Item\s+.*-Recurse|\bgit\s+clean\s+-[a-z]*[dfx]|rimraf/.test(t.text))
  const intent = `${pkg.name ?? ''} ${pkg.description ?? ''}`.toLowerCase()
  // 可能是「职责」也可能是「拦截规则」：两者都不该按高危扣分，但要在报告里点出来核对
  const destructiveByDesign = /backup|restore|rewind|clean|uninstall|purge|trash|session-repair|repair|reset|guard|block|detect|scan|lint|audit|protect|danger|危险|拦截/.test(intent)
  add('destructive-ops', destructiveByDesign ? 'mid' : 'high', Boolean(destructive),
    destructive
      ? `在 ${destructive.rel} 里出现破坏性命令${destructiveByDesign ? '（与其职责相符：备份/清理类）' : '（与其职责不符，需重点核查）'}`
      : '')

  // 子进程
  const spawner = codeTexts.find((t) => /child_process|\bspawn(Sync)?\(|execFile\(|\bexecSync\(/.test(t.text))
  add('spawns-process', 'low', Boolean(spawner), spawner ? `在 ${spawner.rel} 里调用子进程` : '')

  // 网络出口
  const net = codeTexts.find((t) => /\bfetch\(|https?:\/\/[a-z0-9.-]+\.(com|cn|io|net)/i.test(t.text))
  add('network-egress', 'low', Boolean(net), net ? `在 ${net.rel} 里出现网络调用/硬编码域名` : '')

  // 依赖面
  const deps = Object.keys(pkg.dependencies ?? {})
  const gitDeps = deps.filter((d) => /^(git|github|file:|link:)/.test(String(pkg.dependencies[d])))
  add('git-deps', 'high', gitDeps.length > 0, gitDeps.length ? `含非常规依赖：${gitDeps.join(', ')}` : '')
  add('heavy-deps', 'low', deps.length > 25, deps.length ? `${deps.length} 个直接依赖` : '')

  // node/dsh 版本约束
  add('no-engines', 'low', !pkg.engines?.node, '未声明 engines.node')
  add('no-dsh-range', 'low', !(pkg.engines?.dsh || pkg.peerDependencies?.['@deepseek-ai/dsh']), '未声明 DSH 版本范围')

  // 卸载清理：有没有注册 disposer（ctx.effect 返回清理函数 / dispose 字样）
  const hasCleanup = codeTexts.some((t) => /ctx\.effect\(|dispose|onDispose|addDisposable/.test(t.text))
  add('no-cleanup', 'mid', !hasCleanup, hasCleanup ? '' : '代码里没有找到卸载清理（ctx.effect/dispose）')

  // 体积
  const big = files.filter((f) => f.size > 2_000_000)
  add('huge-files', 'low', big.length > 0, big.length ? `${big.length} 个 >2MB 的文件（${big[0].rel}…）` : '')

  return rules
}

function scoreOf(rules) {
  const weight = { high: 15, mid: 6, low: 2 }
  let score = 100
  for (const r of rules) if (r.hit) score -= weight[r.level]
  score = Math.max(0, Math.min(100, score))

  // 硬性封顶：有些问题不是“扣几分”，而是“别装”
  const highs = rules.filter((r) => r.hit && r.level === 'high').length
  const mids = rules.filter((r) => r.hit && r.level === 'mid').length
  if (highs > 0) score = Math.min(score, 69)        // 最高 C
  else if (mids >= 2) score = Math.min(score, 84)   // 最高 B
  return score
}

function gradeOf(score) {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

// ── 单个包审计 ─────────────────────────────────────────────────────────

async function auditOne(name) {
  const packument = await fetchJson(`${REGISTRY}/${encodeURIComponent(name).replace('%40', '@')}`)
  const latest = packument['dist-tags']?.latest
  if (!latest) throw new Error('没有 latest 版本')
  const version = packument.versions[latest]
  const tarball = version.dist.tarball

  const tmp = mkdtempSync(join(tmpdir(), 'dsh-audit-'))
  try {
    const tgz = join(tmp, 'pkg.tgz')
    writeFileSync(tgz, await fetchBuffer(tarball))
    const dir = join(tmp, 'x')
    mkdirSync(dir)
    execFileSync('tar', ['-xzf', tgz, '-C', dir], { stdio: 'ignore' })

    const pkgRoot = join(dir, 'package')
    const pkg = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
    const files = walk(pkgRoot)
    const texts = files
      .filter((f) => TEXT_EXT.test(f.rel) && f.size < 400_000)
      .slice(0, 400)
      .map((f) => ({ rel: f.rel, text: readText(f.abs) }))

    const codeTexts = texts.filter((t) => isCode(t.rel))
    const rules = runRules(pkg, files, texts, codeTexts)
    const score = scoreOf(rules)
    return {
      name, version: latest,
      grade: gradeOf(score), score,
      tarballBytes: statSync(tgz).size,
      fileCount: files.length,
      deps: Object.keys(pkg.dependencies ?? {}).length,
      license: pkg.license ?? null,
      published: packument.time?.[latest] ?? null,
      weeklyDownloads: null,
      findings: rules.filter((r) => r.hit),
      passed: rules.filter((r) => !r.hit).map((r) => r.id),
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// ── 入口 ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
let names = []
let outDir = 'out'
let fromFile = null
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--out') { outDir = argv[++i] ?? 'out'; continue }
  if (a === '--from') { fromFile = argv[++i] ?? null; continue }
  if (a.startsWith('--')) continue
  names.push(a)
}
if (fromFile) names = names.concat(JSON.parse(readFileSync(fromFile, 'utf8')))

if (names.length === 0) {
  console.error('用法: node audit/audit.mjs <包名...> [--out out/]')
  process.exit(2)
}

mkdirSync(outDir, { recursive: true })
mkdirSync(join(outDir, 'cache'), { recursive: true })
const results = []
for (const name of names) {
  const cacheFile = join(outDir, 'cache', name.replace(/[\\/@]/g, '_') + '.json')
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'))
    results.push(cached)
    console.log(`${name} … 缓存 ${cached.grade ?? 'ERR'}`)
    continue
  }
  process.stdout.write(`审计 ${name} … `)
  try {
    const r = await auditOne(name)
    writeFileSync(cacheFile, JSON.stringify(r, null, 2), 'utf8')
    results.push(r)
    console.log(`${r.grade} (${r.score})  ${r.findings.length} 项发现`)
  } catch (error) {
    results.push({ name, error: String(error?.message ?? error) })
    console.log(`失败：${error?.message ?? error}`)
  }
  await sleep(150)
}

writeFileSync(join(outDir, 'audit.json'), JSON.stringify(results, null, 2), 'utf8')

const rows = results.map((r) => {
  if (r.error) return `| \`${r.name}\` | — | — | 审计失败：${r.error} |`
  const top = r.findings.slice(0, 3).map((f) => f.id).join(', ') || '无'
  return `| \`${r.name}\`@${r.version} | **${r.grade}** | ${r.score} | ${top} |`
})
const md = [
  '# DSH 插件审计（静态）',
  '',
  `生成时间：${new Date().toISOString()}`,
  '',
  '| 插件 | 等级 | 分数 | 主要发现 |',
  '| --- | --- | --- | --- |',
  ...rows,
  '',
  '> 只读静态分析：不执行插件代码。发现项为**线索**，不是漏洞结论。',
].join('\n')
writeFileSync(join(outDir, 'audit.md'), md, 'utf8')

// 同时写一份 gzip 便于归档
writeFileSync(join(outDir, 'audit.json.gz'), gzipSync(Buffer.from(JSON.stringify(results, null, 2))))

console.log(`\n完成 ${results.length} 个，结果在 ${outDir}/audit.{json,md}`)
