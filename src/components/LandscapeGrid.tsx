import { useMemo } from 'react'
import ModuleSection from './ModuleSection'
import type { Tool, Module, Category, ModuleWithCategories } from '../types'
import type { Translations } from '../i18n/translations'
import type { ResolvedTheme } from '../theme/useTheme'
import { popularity } from '../utils/toolInfo'

interface LandscapeGridProps {
  modules: Module[]
  categories: Category[]
  tools: Tool[]
  searchQuery: string
  selectedModules: Set<string>
  markKr: boolean
  highlightKr: boolean
  t: Translations
  resolvedTheme: ResolvedTheme
}

export default function LandscapeGrid({
  modules,
  categories,
  tools,
  searchQuery,
  selectedModules,
  markKr,
  highlightKr,
  t,
  resolvedTheme,
}: LandscapeGridProps) {
  const landscapeData = useMemo<ModuleWithCategories[]>(() => {
    const query = searchQuery.toLowerCase()

    return modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((module) => {
        const categoryItems = categories
          .filter((c) => c.moduleId === module.id)
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((category) => {
            const toolItems = tools
              .filter((t) => t.categoryId === category.id)
              .filter(
                (t) =>
                  !query ||
                  t.name.toLowerCase().includes(query) ||
                  t.description.toLowerCase().includes(query) ||
                  t.tags.some((tag) => tag.toLowerCase().includes(query)),
              )
              .slice()
              .sort((a, b) => popularity(b) - popularity(a))

            return { ...category, toolItems }
          })
          .filter((c) => c.toolItems.length > 0)

        const toolCount = categoryItems.reduce((sum, c) => sum + c.toolItems.length, 0)
        return { ...module, categoryItems, toolCount }
      })
      .filter((m) => m.categoryItems.length > 0)
  }, [modules, categories, tools, searchQuery, selectedModules])

  if (landscapeData.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-lg font-medium">{t.noResults}</p>
        <p className="text-sm mt-1">{t.noResultsHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {landscapeData.map((module) => (
        <ModuleSection
          key={module.id}
          module={module}
          dimmed={!selectedModules.has(module.id)}
          markKr={markKr}
          highlightKr={highlightKr}
          t={t}
          resolvedTheme={resolvedTheme}
        />
      ))}
    </div>
  )
}
