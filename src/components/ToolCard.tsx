import type { Tool } from '../types'
import { isKorean, isHuggingFace, popularity, primaryUrl } from '../utils/toolInfo'

type SizeTier = 'lg' | 'md' | 'sm'

function getStarTier(stars?: number): SizeTier {
  if (!stars) return 'sm'
  if (stars >= 50000) return 'lg'
  if (stars >= 10000) return 'md'
  return 'sm'
}

function formatStars(stars: number): string {
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`
  return stars.toString()
}

const tierStyles: Record<SizeTier, { card: string; avatar: string; name: string }> = {
  lg: {
    card: 'w-28 h-14 border-2 border-blue-400 shadow-md hover:shadow-lg',
    avatar: 'w-8 h-8 text-sm bg-blue-500',
    name: 'text-xs font-bold',
  },
  md: {
    card: 'w-24 h-12 border border-gray-300 dark:border-gray-600 shadow hover:shadow-md',
    avatar: 'w-7 h-7 text-xs bg-purple-500',
    name: 'text-xs font-medium',
  },
  sm: {
    card: 'w-20 h-11 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow',
    avatar: 'w-6 h-6 text-xs bg-gray-400',
    name: 'text-xs',
  },
}

interface ToolCardProps {
  tool: Tool
  markKr: boolean
  highlightKr: boolean
}

export default function ToolCard({ tool, markKr, highlightKr }: ToolCardProps) {
  const tier = getStarTier(tool.meta?.stars)
  const styles = tierStyles[tier]
  const firstLetter = tool.name.charAt(0).toUpperCase()
  const url = primaryUrl(tool)
  const hf = isHuggingFace(tool)
  const kr = isKorean(tool)
  const score = popularity(tool)
  const scoreIcon = hf ? '🤗' : '⭐'

  function handleClick() {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="relative group" style={{ opacity: highlightKr && !kr ? 0.25 : 1 }}>
      {markKr && kr && (
        <span className="absolute -top-1 -left-1 z-[1] px-1 rounded-sm text-[9px] font-bold leading-tight bg-yellow-400 text-gray-900 pointer-events-none">
          KR
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={!url}
        title={`${tool.name}\n${tool.description}\n${scoreIcon} ${score ? score.toLocaleString() : 'N/A'} • ${tool.license}`}
        className={`
          ${styles.card}
          ${markKr && kr ? '!border-2 !border-yellow-400' : ''}
          flex items-center gap-1.5 p-1.5 rounded-md
          bg-white dark:bg-gray-800 cursor-pointer transition-all duration-150
          hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {/* Avatar */}
        <span
          className={`
            ${styles.avatar}
            flex-shrink-0 rounded-full flex items-center justify-center
            text-white font-semibold
          `}
        >
          {firstLetter}
        </span>

        {/* Info */}
        <span className="flex flex-col min-w-0 text-left">
          <span className={`${styles.name} truncate leading-tight text-gray-800 dark:text-gray-200`}>
            {tool.name}
          </span>
          {score ? (
            <span className="text-gray-400 leading-tight" style={{ fontSize: '0.6rem' }}>
              {scoreIcon} {formatStars(score)}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  )
}
