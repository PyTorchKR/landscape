import assert from 'node:assert/strict'
import { test } from 'node:test'
import applicationTools from '../data/tools/application-service/tools.json'
import computingTools from '../data/tools/infra-computing/tools.json'
import type { Tool } from '../src/types'
import { primaryLink } from '../src/utils/toolInfo'

test('the affected projects link to official documentation while GitHub returns 404', () => {
  const entries = [...applicationTools.tools, ...computingTools.tools] as Tool[]
  const cases = [
    ['agent-framework', 'https://learn.microsoft.com/en-us/agent-framework/overview/'],
    ['onnx-runtime', 'https://onnxruntime.ai/docs/'],
  ]

  for (const [id, docsUrl] of cases) {
    const tool = entries.find((entry) => entry.id === id)
    assert.ok(tool, id)
    assert.equal(tool.docsUrl, docsUrl)
    assert.deepEqual(
      primaryLink({ ...tool, meta: { ...tool.meta, fetchError: 'HTTP 404: Not Found' } }),
      { url: docsUrl, label: 'clickDocs' },
    )
    assert.deepEqual(
      primaryLink({ ...tool, meta: { ...tool.meta, fetchError: undefined } }),
      { url: tool.githubUrl, label: 'clickGithub' },
    )
  }
})

test('link selection keeps the source for GitHub errors without independent docs', () => {
  const repo = 'https://github.com/example/project'
  const tool: Tool = {
    id: 'project', name: 'Project', description: '', categoryId: 'example',
    moduleId: 'example', license: 'MIT', koreanSupport: false, tags: [],
    githubUrl: repo, meta: { stars: 1, lastUpdated: '', fetchedAt: '', fetchError: 'HTTP 404: Not Found' },
  }
  const source = { url: repo, label: 'clickGithub' }
  assert.deepEqual(primaryLink(tool), source)
  assert.deepEqual(primaryLink({ ...tool, docsUrl: repo + '/tree/main/docs' }), source)
  assert.deepEqual(primaryLink({
    ...tool, docsUrl: 'https://example.com/docs', meta: { ...tool.meta, fetchError: 'HTTP 503: Unavailable' },
  }), source)

  const model = 'https://huggingface.co/example/model'
  assert.deepEqual(primaryLink({ ...tool, githubUrl: undefined, huggingfaceUrl: model }), {
    url: model, label: 'clickHuggingFace',
  })
})
