import type { Module } from '../types'
import type { Translations } from '../i18n/translations'
import { moduleColors } from '../utils/treemapColors'

interface FilterBarProps {
  modules: Module[]
  selectedModules: Set<string>
  onModuleToggle: (moduleId: string) => void
  visibleCount: number
  view: 'grid' | 'treemap'
  onViewChange: (v: 'grid' | 'treemap') => void
  t: Translations
}

export default function FilterBar({
  modules,
  selectedModules,
  onModuleToggle,
  visibleCount,
  view,
  onViewChange,
  t,
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
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
