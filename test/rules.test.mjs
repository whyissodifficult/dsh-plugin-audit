import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runRules, scoreOf, gradeOf, extractEvidence } from '../audit/audit.mjs'

const pkg = (over = {}) => ({
  name: 'demo-plugin',
  version: '1.0.0',
  license: 'MIT',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
  ...over,
})

const files = (list) => list.map((rel) => ({ rel, size: 1000 }))
const code = (list) => list.map(([rel, text]) => ({ rel, text }))

test('安装期脚本 → 高危', () => {
  const rules = runRules(pkg({ scripts: { postinstall: 'node x.js' } }), files([]), code([]), code([]), { paths: [], domains: [] })
  const hit = rules.find((r) => r.id === 'lifecycle-scripts')
  assert.equal(hit.hit, true)
  assert.equal(hit.level, 'high')
})

test('声明了 bundle.patch 但包里没有 → 高危', () => {
  const rules = runRules(pkg(), files([{ rel: 'index.js', size: 10 }]), code([]), code([]), { paths: [], domains: [] })
  assert.equal(rules.find((r) => r.id === 'bundle-patch-file').hit, true)
})

test('备份类插件出现破坏性命令 → 降为中危（职责相符）', () => {
  const backupPkg = pkg({ name: 'dsh-backup', description: 'backup and restore' })
  const rules = runRules(backupPkg, files([]), code([]), code([['lib/x.js', 'rm -rf /tmp/foo']]), { paths: [], domains: [] })
  const hit = rules.find((r) => r.id === 'destructive-ops')
  assert.equal(hit.hit, true)
  assert.equal(hit.level, 'mid', '备份插件删文件是职责，不该按高危算')
})

test('普通插件出现破坏性命令 → 高危', () => {
  const rules = runRules(pkg({ name: 'dsh-wallpaper' }), files([]), code([]), code([['lib/x.js', 'rm -rf /']]), { paths: [], domains: [] })
  assert.equal(rules.find((r) => r.id === 'destructive-ops').level, 'high')
})

test('文档里提到 rm -rf 不算（只看代码）', () => {
  const texts = code([['README.md', 'rm -rf / 是危险命令'], ['lib/x.js', 'console.log(1)']])
  const codeTexts = texts.filter((t) => /\.(js|mjs|cjs|ts)$/.test(t.rel))
  const rules = runRules(pkg(), files([]), texts, codeTexts, { paths: [], domains: [] })
  assert.equal(rules.find((r) => r.id === 'destructive-ops').hit, false)
})

test('封顶：命中高危最高 C', () => {
  const rules = [{ id: 'lifecycle-scripts', level: 'high', hit: true }]
  assert.ok(scoreOf(rules) <= 69)
  assert.equal(gradeOf(scoreOf(rules)), 'C')
})

test('封顶：命中 2 个中危最高 B', () => {
  const rules = [
    { id: 'a', level: 'mid', hit: true },
    { id: 'b', level: 'mid', hit: true },
  ]
  assert.equal(gradeOf(scoreOf(rules)), 'B')
})

test('证据提取：抓 .dsh 路径与外部域名，排除 bin 目录与常见站点', () => {
  const ev = extractEvidence(code([['lib/x.js', `
    const p = '~/.dsh/swarm-console/state.json'
    const bin = '/usr/bin/sh'
    fetch('https://api.example.com/v1')
    fetch('https://github.com/foo')
  `]]))
  assert.ok(ev.paths.some((x) => x.includes('.dsh')), '应抓到 .dsh 路径：' + ev.paths)
  assert.ok(!ev.paths.some((x) => x.includes('/usr/bin')), '不应抓 bin 目录：' + ev.paths)
  assert.ok(ev.domains.includes('api.example.com'), '应抓到外部域名：' + ev.domains)
  assert.ok(!ev.domains.includes('github.com'), '应排除常见站点：' + ev.domains)
})
