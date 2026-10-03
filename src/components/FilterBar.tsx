import type { Module, Scope } from '../types'
import type { Translations } from '../i18n/translations'
import { moduleColors } from '../utils/treemapColors'

interface FilterBarProps {
  modules: Module[]
  selectedModules: Set<string>
  onModuleToggle: (moduleId: string) => void
  visibleCount: number
  view: 'grid' | 'treemap'
  onViewChange: (v: 'grid' | 'treemap') => void
  scope: Scope
  scopeCounts: Record<Scope, number>
  onScopeChange: (s: Scope) => void
  highlightKr: boolean
  onHighlightKrChange: (v: boolean) => void
  t: Translations
}

const SCOPES: Scope[] = ['all', 'global', 'kr']

export default function FilterBar({
  modules,
  selectedModules,
  onModuleToggle,
  visibleCount,
  view,
  onViewChange,
  scope,
  scopeCounts,
  onScopeChange,
  highlightKr,
  onHighlightKrChange,
  t,
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
        {/* Scope tabs: all / global / Korea */}
        <div className="flex border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden flex-shrink-0" role="tablist">
          {SCOPES.map((s, i) => (
            <button
              key={s}
              role="tab"
              aria-selected={scope === s}
              onClick={() => onScopeChange(s)}
              className={`px-2.5 py-1 text-xs transition-colors ${i > 0 ? 'border-l border-gray-200 dark:border-gray-600' : ''} ${
                scope === s
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 font-semibold'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t.scopes[s]} <span className="opacity-60">{scopeCounts[s]}</span>
            </button>
          ))}
        </div>

        {/* Korea highlight — only meaningful when global and Korean projects are mixed */}
        {scope === 'all' && (
          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none flex-shrink-0">
            <input
              type="checkbox"
              checked={highlightKr}
              onChange={(e) => onHighlightKrChange(e.target.checked)}
              className="accent-yellow-500"
            />
            <span className="px-1 rounded-sm text-[10px] font-bold bg-yellow-400 text-gray-900">KR</span>
            {t.highlightKr}
          </label>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
            <button
              onClick={() => onViewChange('grid')}
              className={`px-2.5 py-1 text-xs transition-colors ${
                view === 'grid'
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t.grid}
            </button>
            <button
              onClick={() => onViewChange('treemap')}
              className={`px-2.5 py-1 text-xs transition-colors border-l border-gray-200 dark:border-gray-600 ${
                view === 'treemap'
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                  : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {t.treemap}
            </button>
          </div>
        </div>

        {/* Module filters */}
        <div className="flex flex-wrap gap-1.5">
          {modules.map((m) => {
            const color = moduleColors[m.id] ?? '#666'
            const isSelected = selectedModules.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => onModuleToggle(m.id)}
                style={isSelected
                  ? { backgroundColor: color, borderColor: color, color: 'white' }
                  : { borderColor: color, color, opacity: 0.45 }
                }
                className={`
                  px-3 py-1 text-xs rounded-full border transition-all
                  ${isSelected ? '' : 'bg-white dark:bg-gray-700 hover:opacity-70'}
                `}
              >
                {t.moduleName(m.id)}
              </button>
            )
          })}
        </div>

        {/* Project count — end */}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">
          {t.projectCount(visibleCount)}
        </span>
      </div>
    </div>
  )
}
