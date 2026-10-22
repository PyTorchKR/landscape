import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync, execFileSync } from 'node:child_process'

const script = resolve('scripts/update-stars.ts')
const oldMeta = { stars: 1, lastUpdated: '2025-01-01T00:00:00Z', fetchedAt: '2025-01-02T00:00:00Z' }
const tool = (id: string, url: string) => ({
  id, name: id, license: 'Unknown', description: 'Old description',
  ...(url.includes('huggingface.co') ? { huggingfaceUrl: url } : { githubUrl: url }),
  meta: { ...oldMeta },
})

function fixture(tools: ReturnType<typeof tool>[]) {
  const root = mkdtempSync(join(tmpdir(), 'landscape-refresh-test-'))
  const file = join(root, 'data/tools/example/tools.json')
  mkdirSync(join(root, 'data/tools/example'), { recursive: true })
  writeFileSync(file, JSON.stringify({ tools }))
  const mock = join(root, 'mock.mjs')
  writeFileSync(mock, `
    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      const knownStatus = Number(process.env.TEST_KNOWN_STATUS ?? 404);
      if ((url.includes('/wrtnlabs/') || url.includes('/furiosa-ai/furiosa-rngd-validator')) && knownStatus !== 200) return Response.json({message: 'Not Found'}, {status: knownStatus});
      if (url.includes('/missing')) return Response.json({message: 'Not Found'}, {status: 404});
      if (url.includes('api.github.com')) return Response.json({
        stargazers_count: 42, forks_count: 7, subscribers_count: 3, open_issues_count: 2,
        language: 'TypeScript', archived: false, disabled: false, default_branch: 'main',
        created_at: '2024-01-01T00:00:00Z', updated_at: '2026-10-15T00:00:00Z',
        pushed_at: '2026-10-14T00:00:00Z', html_url: 'https://github.com/example/canonical',
        description: 'Current description', license: {spdx_id: 'MIT'}
      });
      if (url.includes('/collections/')) return Response.json({title: 'Collection',
        lastUpdated: '2026-10-12T00:00:00Z', items: [{type: 'model', id: 'example/model',
        likes: 4, downloads: 10, lastModified: '2026-10-13T00:00:00Z'}]});
      return Response.json({likes: 4, downloads: 10, cardData: {license: 'apache-2.0'},
        ...(url.includes('/undated') ? {} : {lastModified: '2026-10-13T00:00:00Z'})});
    };
  `)
  return {
    root, file,
    run: (token = 'test-token', extraEnv: Record<string, string> = {}) => spawnSync(process.execPath,
      ['--import', import.meta.resolve('tsx'), '--import', pathToFileURL(mock).href, script],
      { cwd: root, env: { ...process.env, GITHUB_TOKEN: token, GITHUB_STEP_SUMMARY: join(root, 'summary.txt'), ...extraEnv }, encoding: 'utf8' }),
    read: () => JSON.parse(readFileSync(file, 'utf8')).tools,
    clean: () => rmSync(root, { recursive: true, force: true }),
  }
}

test('CLI refreshes GitHub and all supported HF types and clears old errors', () => {
  const fx = fixture([
    tool('gh', 'https://github.com/example/repo'),
    tool('subdirectory', 'https://github.com/example/repo/tree/main/package'),
    tool('model', 'https://huggingface.co/example/model'),
    tool('dataset', 'https://huggingface.co/datasets/example/data'),
    tool('collection', 'https://huggingface.co/collections/example/group'),
  ])
  try {
    const initial = fx.read(); initial[0].meta.fetchError = 'Previous failure'
    writeFileSync(fx.file, JSON.stringify({ tools: initial }))
    const result = fx.run(); assert.equal(result.status, 0, result.stderr)
    const [gh, subdirectory, ...hf] = fx.read()
    assert.equal(gh.meta.stars, 42); assert.equal(gh.meta.forks, 7)
    assert.equal(gh.meta.watchers, 3); assert.equal(gh.meta.openIssues, 2)
    assert.equal(gh.meta.language, 'TypeScript'); assert.equal(gh.meta.archived, false)
    assert.equal(gh.githubUrl, 'https://github.com/example/canonical')
    assert.equal(subdirectory.githubUrl, 'https://github.com/example/canonical/tree/main/package')
    assert.equal(subdirectory.meta.stars, 42)
    assert.equal(gh.license, 'MIT'); assert.equal(gh.meta.lastCommit, '2026-10-14T00:00:00Z')
    assert.equal(gh.meta.fetchError, undefined)
    for (const t of [gh, ...hf]) {
      assert.notEqual(t.meta.fetchedAt, oldMeta.fetchedAt)
      assert.ok(t.meta.lastFetchAttempt)
    }
    for (const t of hf) {
      assert.equal(t.meta.likes, 4); assert.equal(t.meta.downloads, 10)
      assert.equal(t.meta.lastCommit, '2026-10-13T00:00:00Z')
      assert.equal(t.license, 'apache-2.0')
    }
    assert.match(result.stdout, /Updated: 5, Unavailable: 0, Failed: 0/)
  } finally { fx.clean() }
})

test('CLI records failures, preserves old values, and continues through later modules', () => {
  const fx = fixture([
    tool('not-found', 'https://github.com/example/missing'),
    tool('unsupported', 'https://huggingface.co/spaces/example/app'),
    tool('undated', 'https://huggingface.co/example/undated'),
  ])
  try {
    const later = join(fx.root, 'data/tools/later'); mkdirSync(later)
    writeFileSync(join(later, 'tools.json'), JSON.stringify({ tools: [tool('good', 'https://github.com/example/good')] }))
    const result = fx.run(); assert.equal(result.status, 1)
    for (const t of fx.read()) {
      assert.equal(t.meta.fetchedAt, oldMeta.fetchedAt)
      assert.equal(t.meta.stars, 1); assert.equal(t.meta.lastCommit, undefined)
      assert.ok(t.meta.fetchError); assert.ok(t.meta.lastFetchAttempt)
    }
    assert.match(fx.read()[0].meta.fetchError, /HTTP 404/)
    const good = JSON.parse(readFileSync(join(later, 'tools.json'), 'utf8')).tools[0]
    assert.equal(good.meta.stars, 42)
    assert.match(result.stdout, /Updated: 1, Unavailable: 0, Failed: 3/)
    assert.match(readFileSync(join(fx.root, 'summary.txt'), 'utf8'), /not-found/)
  } finally { fx.clean() }
})

test('known 404 sources produce warnings and preserve prior data', () => {
  const fx = fixture([
    tool('wrtnlabs-autobe', 'https://github.com/wrtnlabs/autobe'),
    tool('wrtnlabs-agentica', 'https://github.com/wrtnlabs/agentica'),
    tool('furiosa-ai-furiosa-rngd-validator', 'https://github.com/furiosa-ai/furiosa-rngd-validator'),
    tool('good', 'https://github.com/example/good'),
  ])
  try {
    const result = fx.run(); assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Updated: 1, Unavailable: 3, Failed: 0/)
    assert.equal((result.stderr.match(/::warning::/g) ?? []).length, 3)
    const [autobe, agentica, validator, good] = fx.read()
    for (const t of [autobe, agentica, validator]) {
      assert.equal(t.meta.stars, oldMeta.stars)
      assert.equal(t.meta.fetchedAt, oldMeta.fetchedAt)
      assert.match(t.meta.fetchError, /HTTP 404/)
      assert.ok(t.meta.lastFetchAttempt)
    }
    assert.equal(good.meta.stars, 42)
    const summary = readFileSync(join(fx.root, 'summary.txt'), 'utf8')
    assert.match(summary, /Unavailable sources \(previous values retained\)/)
    assert.match(summary, /wrtnlabs-autobe/); assert.match(summary, /wrtnlabs-agentica/)
    assert.match(summary, /furiosa-ai-furiosa-rngd-validator/)
  } finally { fx.clean() }
})

test('known 404 warnings do not hide unexpected failures', () => {
  const fx = fixture([
    tool('furiosa-ai-furiosa-rngd-validator', 'https://github.com/furiosa-ai/furiosa-rngd-validator'),
    tool('unexpected', 'https://github.com/example/missing'),
    tool('good', 'https://github.com/example/good'),
  ])
  try {
    const result = fx.run(); assert.equal(result.status, 1)
    assert.match(result.stdout, /Updated: 1, Unavailable: 1, Failed: 1/)
    const [known, unexpected, good] = fx.read()
    for (const t of [known, unexpected]) {
      assert.equal(t.meta.fetchedAt, oldMeta.fetchedAt)
      assert.match(t.meta.fetchError, /HTTP 404/)
    }
    assert.equal(good.meta.stars, 42)
    assert.match(result.stderr, /::warning::furiosa-ai-furiosa-rngd-validator/)
    assert.match(readFileSync(join(fx.root, 'summary.txt'), 'utf8'), /Failures\n\nunexpected:/)
  } finally { fx.clean() }
})

test('a recovered source refreshes its data and clears its warning', () => {
  const fx = fixture([tool('wrtnlabs-autobe', 'https://github.com/wrtnlabs/autobe')])
  try {
    assert.equal(fx.run().status, 0)
    assert.match(fx.read()[0].meta.fetchError, /HTTP 404/)
    const result = fx.run('test-token', { TEST_KNOWN_STATUS: '200' })
    assert.equal(result.status, 0, result.stderr)
    const refreshed = fx.read()[0]
    assert.equal(refreshed.meta.fetchError, undefined)
    assert.notEqual(refreshed.meta.fetchedAt, oldMeta.fetchedAt)
    assert.equal(refreshed.meta.stars, 42)
    assert.match(result.stdout, /Updated: 1, Unavailable: 0, Failed: 0/)
    assert.doesNotMatch(result.stderr, /::warning::/)
  } finally { fx.clean() }
})

test('known sources still fail for authentication, rate limits, and server errors', () => {
  const fx = fixture([tool('wrtnlabs-autobe', 'https://github.com/wrtnlabs/autobe')])
  try {
    for (const status of [401, 403, 429, 500]) {
      const result = fx.run('test-token', { TEST_KNOWN_STATUS: String(status) })
      assert.equal(result.status, 1, result.stderr)
      assert.match(result.stdout, /Unavailable: 0, Failed: 1/)
      assert.doesNotMatch(result.stderr, /::warning::/)
      assert.equal(fx.read()[0].meta.fetchedAt, oldMeta.fetchedAt)
    }
  } finally { fx.clean() }
})

test('CLI returns failure for missing credentials and unreadable input', () => {
  const fx = fixture([])
  try {
    assert.equal(fx.run('').status, 1)
    writeFileSync(fx.file, '{broken json')
    assert.equal(fx.run().status, 1)
  } finally { fx.clean() }
})

test('workflow detects and stages nested tool updates with the action shell expansion', () => {
  const root = mkdtempSync(join(tmpdir(), 'landscape-commit-test-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const paths = ['data/categories/index.json', 'data/modules/index.json', 'data/tools/example/tools.json']
  try {
    for (const p of paths) {
      mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), '{}\n')
    }
    git('init', '-q'); git('add', 'data')
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline')
    writeFileSync(join(root, paths[2]), '{"updated":true}\n')
    const status = (pattern: string) => execFileSync('bash', ['-c',
      'read -r -a INPUT_FILE_PATTERN_EXPANDED <<< "$1"; git status -s -- ${INPUT_FILE_PATTERN_EXPANDED:+${INPUT_FILE_PATTERN_EXPANDED[@]}}',
      'bash', pattern], { cwd: root, encoding: 'utf8' }).trim()
    assert.equal(status('data/**/*.json'), '')
    const yaml = readFileSync('.github/workflows/daily-update.yml', 'utf8')
    const pattern = yaml.match(/file_pattern: '([^']+)'/)![1]
    assert.match(status(pattern), /data\/tools\/example\/tools.json/)
    git('add', '--', pattern)
    assert.equal(git('diff', '--cached', '--name-only'), paths[2])
    assert.match(yaml, /continue-on-error: true/)
    assert.match(yaml, /check-refresh:/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
