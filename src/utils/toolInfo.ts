import type { Tool, Scope } from '../types'

export const isKorean = (tool: Tool): boolean => tool.region === 'KR'

export const inScope = (tool: Tool, scope: Scope): boolean =>
  scope === 'all' || isKorean(tool)

export interface ToolLink {
  url: string
  label: 'clickGithub' | 'clickHuggingFace' | 'clickDocs'
}

export const primaryLink = (tool: Tool): ToolLink | undefined => {
  if (tool.githubUrl) {
    if (
      tool.meta?.fetchError?.startsWith('HTTP 404:') &&
      tool.docsUrl &&
      !/^https?:\/\/github\.com(?:\/|$)/i.test(tool.docsUrl)
    ) {
      return { url: tool.docsUrl, label: 'clickDocs' }
    }
    return { url: tool.githubUrl, label: 'clickGithub' }
  }
  if (tool.huggingfaceUrl) {
    return { url: tool.huggingfaceUrl, label: 'clickHuggingFace' }
  }
}

export const isHuggingFace = (tool: Tool): boolean => !tool.githubUrl && !!tool.huggingfaceUrl

// GitHub stars, or HuggingFace likes for HuggingFace-only entries
export const popularity = (tool: Tool): number =>
  isHuggingFace(tool) ? tool.meta?.likes ?? 0 : tool.meta?.stars ?? 0
