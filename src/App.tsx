import { useState, useMemo } from 'react'
import FilterBar from './components/FilterBar'
import LandscapeGrid from './components/LandscapeGrid'
import TreemapView from './components/TreemapView'
import HeaderActions from './components/HeaderActions'
import LegendPopup from './components/LegendPopup'
import { getModules, getCategories, getTools } from './services/dataService'
import { useI18n } from './i18n/useI18n'
import { useTheme, ThemeSetting } from './theme/useTheme'

const modules = getModules()
const categories = getCategories()
const tools = getTools()

const allModuleIds = new Set(modules.map(m => m.id))

export default function App() {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(allModuleIds)
  const [view, setView] = useState<'grid' | 'treemap'>('treemap')
  const [legendAnchor, setLegendAnchor] = useState<DOMRect | null>(null)

  const { locale, setLocale, t } = useI18n()
  const { setting: themeSetting, resolved: resolvedTheme, setSetting: setThemeSetting } = useTheme()

  const handleModuleToggle = (moduleId: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        if (next.size <= 1) return prev
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const visibleCount = useMemo(() => {
    return tools.filter(tool => {
      const cat = categories.find(c => c.id === tool.categoryId)
      if (!cat) return false
      return selectedModules.has(cat.moduleId)
    }).length
  }, [selectedModules])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              🗺️ Opensource AI Landscape
            </h1>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t.subtitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/PyTorchKR/landscape/issues/new?template=add-project.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-gray-900 dark:bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
            >
              {t.submitProject}
            </a>
            <HeaderActions
              locale={locale}
              onLocaleChange={setLocale}
              onToggleLegend={(rect) => setLegendAnchor(prev => prev ? null : rect)}
              t={t}
            />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <FilterBar
        modules={modules}
        selectedModules={selectedModules}
        onModuleToggle={handleModuleToggle}
        visibleCount={visibleCount}
        view={view}
        onViewChange={setView}
        t={t}
      />

      {/* Main content */}
      <main className={`flex-1 w-full ${view === 'grid' ? 'max-w-screen-xl mx-auto px-4 py-4' : 'px-2 py-2'}`}>
        {view === 'grid' ? (
          <LandscapeGrid
            modules={modules}
            categories={categories}
            tools={tools}
            searchQuery=""
            selectedModules={selectedModules}
            t={t}
            resolvedTheme={resolvedTheme}
          />
        ) : (
          <TreemapView
            modules={modules}
            categories={categories}
            tools={tools}
            searchQuery=""
            selectedModules={selectedModules}
            locale={locale}
            t={t}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span>{t.footerOrg}</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
              {(['system', 'light', 'dark'] as ThemeSetting[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setThemeSetting(theme)}
                  className={`px-2 py-0.5 text-[10px] transition-colors ${
                    themeSetting === theme
                      ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
            <a href="https://pytorch.kr" target="_blank" rel="noopener noreferrer" title="pytorch.kr" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </a>
            <a href="https://github.com/PyTorchKR/landscape" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Legend popup */}
      {legendAnchor && (
        <LegendPopup
          modules={modules}
          t={t}
          view={view}
          anchorRect={legendAnchor}
          onClose={() => setLegendAnchor(null)}
        />
      )}
    </div>
  )
}
