import { useState, useMemo } from 'react'
import { Treemap, ResponsiveContainer } from 'recharts'
import {
  moduleColors,
  getAgeBrightness,
  darkenColor,
} from '../utils/treemapColors'
import { formatRelativeTime, type Locale } from '../utils/relativeTime'
import type { Translations } from '../i18n/translations'
import type { Tool, Module, Category, Scope } from '../types'
import { isKorean, isHuggingFace, popularity, primaryUrl } from '../utils/toolInfo'

const KR_COLOR = '#FACC15'

// ── Custom treemap cell renderer ────────────────────────────────────────────

interface ContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  depth?: number
  name?: string
  moduleId?: string
  toolId?: string
  lastUpdated?: string
  url?: string
  isHf?: boolean
  description?: string
  kr?: boolean
  markKr?: boolean
  onHover?: (info: TooltipInfo, clientX: number, clientY: number) => void
  onLeave?: () => void
  onClick?: (url: string) => void
}

function TreemapContent(props: ContentProps) {
  const {
    x = 0, y = 0, width = 0, height = 0,
    depth, name, moduleId, lastUpdated, url, isHf, description, kr, markKr,
    onHover, onLeave, onClick,
  } = props

  if (width < 2 || height < 2) return null

  const baseColor = moduleId ? (moduleColors[moduleId] ?? '#666') : '#333'
  const brightness = getAgeBrightness(lastUpdated)
  const cellColor = darkenColor(baseColor, brightness)

  if (depth === 1) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height}
          fill={baseColor} stroke="#fff" strokeWidth={2} opacity={0.95} />
        {width > 60 && height > 20 && (
          <foreignObject x={x + 4} y={y + 2} width={width - 8} height={20}>
            <div style={{
              color: 'white', fontSize: 12, fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}
            </div>
          </foreignObject>
        )}
      </g>
    )
  }

  if (depth === 2) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height}
          fill={baseColor} stroke="#fff" strokeWidth={1} opacity={0.8} />
        {width > 50 && height > 16 && (
          <foreignObject x={x + 2} y={y + 1} width={width - 4} height={14}>
            <div style={{
              color: 'white', fontSize: 10,
              textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}
            </div>
          </foreignObject>
        )}
      </g>
    )
  }

  if (depth === 3) {
    const area = width * height
    const fontSize = Math.min(18, Math.max(8, Math.floor(Math.sqrt(area) / 7)))
    const showName = width > 20 && height > 10
    const showKr = markKr && kr
    const showBadge = showKr && width >= 28 && height >= 30

    return (
      <g
        style={{ cursor: url ? 'pointer' : 'default' }}
        onClick={() => url && onClick && onClick(url)}
        onMouseMove={(e) => {
          onHover?.({ name: name ?? '', lastUpdated, url, isHf, description, kr }, e.clientX, e.clientY)
        }}
        onMouseLeave={onLeave}
      >
        <rect x={x} y={y} width={width} height={height}
          fill={cellColor} stroke="rgba(255,255,255,0.4)" strokeWidth={0.5} />
        {showName && (
          <foreignObject x={x} y={y} width={width} height={height}>
            <div style={{
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', width: '100%', height: '100%',
              textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              overflow: 'hidden', padding: '2px', boxSizing: 'border-box',
            } as React.CSSProperties}>
              <span style={{ fontSize, fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.1 }}>
                {name}
              </span>
            </div>
          </foreignObject>
        )}
        {/* Korean project marker: inset border, plus a badge when the cell has room */}
        {showKr && (
          <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)}
            fill="none" stroke={KR_COLOR} strokeWidth={2} pointerEvents="none" />
        )}
        {showBadge && (
          <g pointerEvents="none">
            <rect x={x + 2} y={y + 2} width={18} height={11} rx={2} fill={KR_COLOR} />
            <text x={x + 11} y={y + 10.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#111827">KR</text>
          </g>
        )}
      </g>
    )
  }

  return null
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TooltipInfo {
  name: string
  lastUpdated?: string
  url?: string
  isHf?: boolean
  description?: string
  kr?: boolean
}

interface TooltipState extends TooltipInfo {
  x: number
  y: number
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  modules: Module[]
  categories: Category[]
  tools: Tool[]
  searchQuery: string
  selectedModules: Set<string>
  scope: Scope
  locale: Locale
  t: Translations
}

// Korean projects are small next to global ones (median well under 1k stars),
// so the Korea view sizes cells on a log scale to keep every project readable.
const cellSize = (tool: Tool, scope: Scope): number =>
  scope === 'kr' ? 1 + Math.log10(1 + popularity(tool)) : Math.max(popularity(tool), 100)

export default function TreemapView({ modules, categories, tools, searchQuery, selectedModules, scope, locale, t }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const filteredModules = useMemo(
    () => modules.filter(m => selectedModules.has(m.id)),
    [modules, selectedModules],
  )

  const treemapData = useMemo(() => {
    const q = searchQuery.toLowerCase()

    return filteredModules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(module => {
        const moduleCategories = categories
          .filter(c => c.moduleId === module.id)
          .sort((a, b) => a.order - b.order)

        const categoryChildren = moduleCategories
          .map(category => {
            const categoryTools: Tool[] = tools
              .filter(t => t.categoryId === category.id)
              .filter(t =>
                !q ||
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tags.some(tag => tag.toLowerCase().includes(q)),
              )

            if (categoryTools.length === 0) return null

            return {
              name: category.name,
              moduleId: module.id,
              children: categoryTools.map(tool => ({
                name: tool.name,
                size: cellSize(tool, scope),
                moduleId: module.id,
                toolId: tool.id,
                lastUpdated: tool.meta?.lastCommit ?? tool.meta?.lastUpdated,
                url: primaryUrl(tool),
                isHf: isHuggingFace(tool),
                description: tool.description,
                kr: isKorean(tool),
                markKr: scope === 'all',
              })),
            }
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)

        if (categoryChildren.length === 0) return null

        return {
          name: t.moduleName(module.id),
          moduleId: module.id,
          children: categoryChildren,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  }, [filteredModules, categories, tools, searchQuery, scope])

  if (treemapData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">{t.noResults}</p>
          <p className="text-sm mt-1">{t.noResultsHint}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      {/* Treemap */}
      <div
        className="w-full"
        style={{ height: 'calc(100vh - 150px)', minHeight: 400, background: '#1a1a2e' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={
              <TreemapContent
                onHover={(info, x, y) => setTooltip({ ...info, x, y })}
                onLeave={() => setTooltip(null)}
                onClick={(url) => window.open(url, '_blank')}
              />
            }
            animationDuration={300}
          />
        </ResponsiveContainer>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 w-72"
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <p className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
            {tooltip.kr && (
              <span className="px-1 rounded-sm text-[10px] font-bold" style={{ background: KR_COLOR, color: '#111827' }}>KR</span>
            )}
            {tooltip.name}
          </p>
          {tooltip.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{tooltip.description}</p>
          )}
          {tooltip.lastUpdated && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t.lastCommit}: {formatRelativeTime(tooltip.lastUpdated, locale)}
            </p>
          )}
          {tooltip.url && (
            <p className="text-xs text-blue-400 mt-1">{tooltip.isHf ? t.clickHuggingFace : t.clickGithub}</p>
          )}
        </div>
      )}
    </div>
  )
}
