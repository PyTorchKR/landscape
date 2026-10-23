import { Octokit } from '@octokit/rest'
import * as fs from 'fs'
import * as path from 'path'
import { parseHuggingFaceUrl, fetchHuggingFace } from './huggingface'

const TOOLS_DIR = path.join(process.cwd(), 'data/tools')

// These public URLs returned 404 on 2026-10-22. Other failures remain fatal.
const KNOWN_UNAVAILABLE_URLS = new Set([
  'https://github.com/wrtnlabs/autobe',
  'https://github.com/wrtnlabs/agentica',
  'https://github.com/furiosa-ai/furiosa-rngd-validator',
])

interface ToolMeta {
  stars: number
  forks?: number
  likes?: number
  downloads?: number
  lastUpdated: string
  lastCommit?: string
  fetchedAt: string
  lastFetchAttempt?: string
  fetchError?: string
  watchers?: number
  openIssues?: number
  language?: string | null
  archived?: boolean
  disabled?: boolean
  defaultBranch?: string
  createdAt?: string
}

interface Tool {
  id: string
  name: string
  githubUrl?: string
  huggingfaceUrl?: string
  meta: ToolMeta
  [key: string]: unknown
}

interface ToolsFile {
  tools: Tool[]
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required')
  }

  const octokit = new Octokit({ auth: token })
  const moduleDirs = fs.readdirSync(TOOLS_DIR).filter((dir) =>
    fs.statSync(path.join(TOOLS_DIR, dir)).isDirectory(),
  )
  let totalUpdated = 0
  const failures: string[] = []
  const unavailable: string[] = []
  const urlChanges: string[] = []

  for (const moduleDir of moduleDirs) {
    const toolsPath = path.join(TOOLS_DIR, moduleDir, 'tools.json')
    if (!fs.existsSync(toolsPath)) continue

    const data: ToolsFile = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'))

    for (const tool of data.tools) {
      const attemptedAt = new Date().toISOString()
      try {
        const hfRef = !tool.githubUrl && tool.huggingfaceUrl ? parseHuggingFaceUrl(tool.huggingfaceUrl) : null
        if (hfRef) {
          const info = await fetchHuggingFace(hfRef)
          tool.meta = {
            ...tool.meta,
            likes: info.likes,
            downloads: info.downloads,
            lastUpdated: info.lastModified,
            lastCommit: info.lastModified,
            fetchedAt: new Date().toISOString(),
            lastFetchAttempt: attemptedAt,
            fetchError: undefined,
          }
          if (info.license !== 'Unknown') tool.license = info.license
          console.log(`✓ ${tool.name}: ${info.likes.toLocaleString()} likes`)
        } else {
          const match = tool.githubUrl?.match(/^https:\/\/github\.com\/([^/]+)\/([^/?#]+)(?:[/?#]|$)/)
          if (!match) throw new Error('Missing or unsupported project URL')

          const [, owner, repo] = match
          const repoName = repo.replace(/\.git$/, '')
          const { data: repoData } = await octokit.repos.get({ owner, repo: repoName })
          const previousUrl = tool.githubUrl!
          tool.meta = {
            ...tool.meta,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            watchers: repoData.subscribers_count,
            openIssues: repoData.open_issues_count,
            language: repoData.language,
            archived: repoData.archived,
            disabled: repoData.disabled,
            defaultBranch: repoData.default_branch,
            createdAt: repoData.created_at,
            lastUpdated: repoData.updated_at ?? tool.meta.lastUpdated,
            lastCommit: repoData.pushed_at ?? tool.meta.lastCommit,
            fetchedAt: new Date().toISOString(),
            lastFetchAttempt: attemptedAt,
            fetchError: undefined,
          }
          tool.githubUrl = previousUrl.replace(/^https:\/\/github\.com\/[^/]+\/[^/?#]+/, repoData.html_url)
          if (previousUrl !== tool.githubUrl) {
            const change = `${tool.id}: ${previousUrl} -> ${tool.githubUrl}`
            urlChanges.push(change)
            console.log(change)
          }
          if (repoData.license?.spdx_id && repoData.license.spdx_id !== 'NOASSERTION') {
            tool.license = repoData.license.spdx_id
          }
          if (repoData.description) tool.description = repoData.description
          console.log(`✓ ${tool.name}: ${repoData.stargazers_count.toLocaleString()} stars`)
        }
        totalUpdated++
      } catch (error) {
        const message = (error as Error).message
        const status = (error as { status?: number }).status
        tool.meta.lastFetchAttempt = attemptedAt
        tool.meta.fetchError = status ? `HTTP ${status}: ${message}` : message
        const detail = `${tool.id}: ${tool.meta.fetchError}`
        if (status === 404 && tool.githubUrl && KNOWN_UNAVAILABLE_URLS.has(tool.githubUrl)) {
          unavailable.push(detail)
          const warning = `${detail}. Previous values retained.`
            .replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
          console.warn(`::warning::${warning}`)
        } else {
          failures.push(detail)
          console.error(`✗ ${tool.name}: ${tool.meta.fetchError}`)
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    fs.writeFileSync(toolsPath, JSON.stringify(data, null, 2) + '\n')
  }

  const summary = `Updated: ${totalUpdated}, Unavailable: ${unavailable.length}, Failed: ${failures.length}, URLs updated: ${urlChanges.length}`
  console.log(`\nDone! ${summary}`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    const details = [summary,
      ...(urlChanges.length ? ['Repository URL changes', ...urlChanges] : []),
      ...(unavailable.length ? ['Unavailable sources (previous values retained)', ...unavailable] : []),
      ...(failures.length ? ['Failures', ...failures] : []),
    ]
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, details.join('\n\n') + '\n')
  }
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
