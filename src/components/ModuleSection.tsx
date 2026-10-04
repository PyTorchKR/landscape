import ToolCard from './ToolCard'
import type { ModuleWithCategories } from '../types'
import type { Translations } from '../i18n/translations'
import type { ResolvedTheme } from '../theme/useTheme'
import { moduleColors } from '../utils/treemapColors'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function deriveColors(base: string) {
  const { r, g, b } = hexToRgb(base)
  return {
    header: base,
    border: base,
    bg: `rgba(${r}, ${g}, ${b}, 0.08)`,
    bgDark: `rgba(${r}, ${g}, ${b}, 0.15)`,
  }
}

interface ModuleSectionProps {
  module: ModuleWithCategories
  dimmed: boolean
  t: Translations
  resolvedTheme: ResolvedTheme
}

export default function ModuleSection({ module, dimmed, t, resolvedTheme }: ModuleSectionProps) {
  const baseColor = moduleColors[module.id] ?? '#9E9E9E'
  const colors = deriveColors(baseColor)
  const colCount = Math.min(module.categoryItems.length, 4)

  return (
    <div
      className="rounded-lg overflow-hidden border-2 transition-all duration-300"
      style={{
        borderColor: colors.border,
        opacity: dimmed ? 0.35 : 1,
        filter: dimmed ? 'saturate(0.3)' : 'none',
        transform: dimmed ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {/* Module header */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: colors.header }}
      >
        <span className="text-white font-semibold text-sm">{t.moduleName(module.id)}</span>
        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          {t.items(module.toolCount)}
        </span>
      </div>

      {/* Categories grid */}
      <div
        className="p-3 grid gap-3"
        style={{
          backgroundColor: resolvedTheme === 'dark' ? colors.bgDark : colors.bg,
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        }}
      >
        {module.categoryItems.map((category) => (
          <div key={category.id}>
            <p
              className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 pb-1 border-b"
              style={{ borderColor: colors.border }}
            >
              {t.categoryName(category.id, category.name)}
              <span className="font-normal ml-1">({category.toolItems.length})</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {category.toolItems.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
