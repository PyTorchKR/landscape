import type { Tool, Scope } from '../types'

export const isKorean = (tool: Tool): boolean => tool.region === 'KR'

export const inScope = (tool: Tool, scope: Scope): boolean =>
  scope === 'all' || isKorean(tool)

// GitHub repo first; HuggingFace page for model/dataset-only entries
export const primaryUrl = (tool: Tool): string | undefined =>
  tool.githubUrl ?? tool.huggingfaceUrl

export const isHuggingFace = (tool: Tool): boolean => !tool.githubUrl && !!tool.huggingfaceUrl

// GitHub stars, or HuggingFace likes for HuggingFace-only entries
export const popularity = (tool: Tool): number =>
  isHuggingFace(tool) ? tool.meta?.likes ?? 0 : tool.meta?.stars ?? 0
