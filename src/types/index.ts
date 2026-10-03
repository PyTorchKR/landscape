export interface ToolMeta {
  stars: number
  forks?: number
  // HuggingFace-hosted entries (models, datasets, collections)
  likes?: number
  downloads?: number
  lastUpdated: string
  lastCommit?: string
  fetchedAt: string
}

export interface Tool {
  id: string
  name: string
  description: string
  categoryId: string
  moduleId: string
  license: string
  licenseUrl?: string
  githubUrl?: string
  huggingfaceUrl?: string
  docsUrl?: string
  websiteUrl?: string
  koreanSupport: boolean
  // 'KR' marks projects released by Korean companies or institutions
  region?: 'KR'
  tags: string[]
  meta: ToolMeta
}

export type Scope = 'all' | 'global' | 'kr'

export interface Module {
  id: string
  name: string
  description: string
  icon: string
  order: number
  color: string
  categories: string[]
}

export interface Category {
  id: string
  moduleId: string
  name: string
  description: string
  order: number
  tools: string[]
}

export interface CategoryWithTools extends Category {
  toolItems: Tool[]
}

export interface ModuleWithCategories extends Module {
  categoryItems: CategoryWithTools[]
  toolCount: number
}
