/**
 * add-tool.ts
 *
 * Used by the GitHub Actions workflow (add-project.yml) to add a new tool
 * from an approved Issue into the appropriate tools.json and categories/index.json.
 *
 * --github-url also accepts a HuggingFace model, dataset or collection URL
 * for projects that are published only on the HuggingFace Hub.
 *
 * Usage:
 *   GITHUB_TOKEN=... tsx scripts/add-tool.ts \
 *     --github-url https://github.com/owner/repo \
 *     --module-id model-algorithm \
 *     --category-id llm \
 *     [--description "Custom description"] \
 *     [--region KR]
 */

import { Octokit } from '@octokit/rest'
import * as fs from 'fs'
import * as path from 'path'
import { parseHuggingFaceUrl, fetchHuggingFace } from './huggingface'

interface Tool {
  id: string
  name: string
  description: string
  categoryId: string
  moduleId: string
  license: string
  githubUrl?: string
  huggingfaceUrl?: string
  koreanSupport: boolean
  region?: 'KR'
  tags: string[]
  meta: {
    stars: number
    forks?: number
    likes?: number
    downloads?: number
    lastUpdated: string
    lastCommit: string
    fetchedAt: string
  }
}

interface ToolsFile {
  tools: Tool[]
}

interface CategoriesFile {
  categories: Array<{ id: string; tools: string[]; [key: string]: unknown }>
}

interface Args {
  githubUrl: string
  moduleId: string
  categoryId: string
  description?: string
  region?: 'KR'
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  const githubUrl = get('--github-url')
  const moduleId = get('--module-id')
  const categoryId = get('--category-id')

  if (!githubUrl || !moduleId || !categoryId) {
    console.error('Usage: tsx scripts/add-tool.ts --github-url <url> --module-id <id> --category-id <id> [--description <text>] [--region KR]')
    process.exit(1)
  }

  const region = get('--region')
  if (region && region !== 'KR') {
    console.error(`Unsupported region: ${region} (only KR)`)
    process.exit(1)
  }

  return { githubUrl, moduleId, categoryId, description: get('--description'), region: region ? 'KR' : undefined }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function buildHuggingFaceTool(url: string, args: Args): Promise<Tool | null> {
  const ref = parseHuggingFaceUrl(url)
  if (!ref) return null

  // Model and dataset cards have no short description field, so the issue must provide one.
  if (!args.description && ref.kind !== 'collections') {
    console.error('A description is required for HuggingFace models and datasets (설명 (선택) 항목을 채워 주세요)')
    process.exit(1)
  }

  console.log(`Fetching HuggingFace ${ref.kind}: ${ref.owner}/${ref.name}...`)
  const info = await fetchHuggingFace(ref)
  const now = new Date().toISOString()

  return {
    // Keep the kind in the id so a model and a dataset with the same name do not collide
    id: slugify(`hf-${ref.kind === 'models' ? '' : `${ref.kind.slice(0, -1)}-`}${ref.owner}-${ref.name}`),
    name: info.name,
    description: args.description ?? info.description,
    categoryId: args.categoryId,
    moduleId: args.moduleId,
    license: info.license,
    huggingfaceUrl: ref.url,
    koreanSupport: false,
    ...(args.region ? { region: args.region } : {}),
    tags: info.tags,
    meta: {
      stars: 0,
      likes: info.likes,
      downloads: info.downloads,
      lastUpdated: info.lastModified,
      lastCommit: info.lastModified,
      fetchedAt: now,
    },
  }
}

async function buildGitHubTool(url: string, args: Args): Promise<Tool> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required')
    process.exit(1)
  }

  const { moduleId, categoryId, description } = args

  // Parse GitHub URL
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    console.error('Invalid GitHub or HuggingFace URL:', url)
    process.exit(1)
  }

  const [, owner, repoSlug] = match
  const repoName = repoSlug.replace(/\.git$/, '')

  const octokit = new Octokit({ auth: token })

  // Fetch repo info
  console.log(`Fetching GitHub repo: ${owner}/${repoName}...`)
  const { data: repo } = await octokit.repos.get({ owner, repo: repoName })

  const now = new Date().toISOString()

  return {
    id: slugify(`${owner}-${repoName}`),
    name: repo.name,
    description: description ?? repo.description ?? '',
    categoryId,
    moduleId,
    license: repo.license?.spdx_id ?? 'Unknown',
    githubUrl: repo.html_url,
    koreanSupport: false,
    ...(args.region ? { region: args.region } : {}),
    tags: repo.topics ?? [],
    meta: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at ?? now,
      lastCommit: repo.pushed_at ?? now,
      fetchedAt: now,
    },
  }
}

async function main() {
  const args = parseArgs()
  const { moduleId, categoryId } = args

  const newTool = (await buildHuggingFaceTool(args.githubUrl, args)) ?? (await buildGitHubTool(args.githubUrl, args))
  const toolId = newTool.id
  const sourceUrl = newTool.githubUrl ?? newTool.huggingfaceUrl

  // Check for duplicates in target tools.json
  const toolsPath = path.join(process.cwd(), 'data/tools', moduleId, 'tools.json')
  if (!fs.existsSync(toolsPath)) {
    console.error(`tools.json not found for module: ${moduleId}`)
    process.exit(1)
  }

  const toolsData: ToolsFile = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'))

  const duplicate = toolsData.tools.find(
    (t) => (t.githubUrl ?? t.huggingfaceUrl) === sourceUrl || t.id === toolId,
  )
  if (duplicate) {
    console.error(`Tool already exists: ${duplicate.name} (${duplicate.id})`)
    process.exit(1)
  }

  // Add tool to tools.json
  toolsData.tools.push(newTool)
  fs.writeFileSync(toolsPath, JSON.stringify(toolsData, null, 2) + '\n')
  console.log(`✓ Added to data/tools/${moduleId}/tools.json`)

  // Add tool id to categories/index.json
  const categoriesPath = path.join(process.cwd(), 'data/categories/index.json')
  const categoriesData: CategoriesFile = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))

  const category = categoriesData.categories.find((c) => c.id === categoryId)
  if (!category) {
    console.error(`Category not found: ${categoryId}`)
    process.exit(1)
  }

  if (!category.tools.includes(toolId)) {
    category.tools.push(toolId)
    fs.writeFileSync(categoriesPath, JSON.stringify(categoriesData, null, 2) + '\n')
    console.log(`✓ Added to data/categories/index.json (category: ${categoryId})`)
  }

  console.log(`\nSuccess! Added: ${newTool.name} (${toolId})`)
  if (newTool.huggingfaceUrl) console.log(`  Likes: ${(newTool.meta.likes ?? 0).toLocaleString()}`)
  else console.log(`  Stars: ${newTool.meta.stars.toLocaleString()}`)
  console.log(`  License: ${newTool.license}`)
  if (newTool.region) console.log(`  Region: ${newTool.region}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
