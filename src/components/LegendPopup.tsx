import { useEffect, useRef, useState, useCallback } from 'react'
import type { Module, Scope } from '../types'
import { moduleColors, darkenColor, AGE_LEVELS } from '../utils/treemapColors'
import type { Translations } from '../i18n/translations'

interface Props {
  modules: Module[]
  t: Translations
  view: 'grid' | 'treemap'
  scope: Scope
  anchorRect?: DOMRect | null
  onClose: () => void
}

export default function LegendPopup({ modules, t, view, scope, anchorRect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Set initial position below the anchor button
  useEffect(() => {
    if (anchorRect) {
      setPos({ x: anchorRect.right - 400, y: anchorRect.bottom + 6 })
    } else {
      setPos({ x: window.innerWidth - 420, y: 48 })
    }
  }, [anchorRect])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return
    dragging.current = true
    const rect = ref.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    e.preventDefault()
  }, [])

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!dragging.current) return
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }
    function handleUp() {
      dragging.current = false
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [])

  if (!pos) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl p-4 w-auto max-w-lg"
      style={{ left: Math.max(0, pos.x), top: Math.max(0, pos.y) }}
    >
      {/* Draggable header */}
      <div
        className="flex items-center justify-between mb-3 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t.legend}</p>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Color by commit age — treemap only */}
      {view === 'treemap' && (
        <div
          className="grid gap-px text-xs"
          style={{ gridTemplateColumns: `72px repeat(${modules.length}, 1fr)` }}
        >
          {/* Header row */}
          <span className="flex items-center text-gray-400 dark:text-gray-500 text-[0.65rem]">
            {t.lastCommit}
          </span>
          {modules.map(m => (
            <span
              key={m.id}
              className="text-center text-gray-500 dark:text-gray-400 text-[0.65rem] leading-tight px-0.5 break-keep"
            >
              {t.moduleName(m.id)}
            </span>
          ))}

          {/* Age rows */}
          {AGE_LEVELS.map(({ brightness }, i) => (
            <>
              <span
                key={`lbl-${i}`}
                className="flex items-center text-gray-400 dark:text-gray-500 text-[0.65rem]"
              >
                {t.ageLevels[i]}
              </span>
              {modules.map(m => (
                <div
                  key={`${m.id}-${i}`}
                  className="h-4 rounded-sm"
                  style={{ background: darkenColor(moduleColors[m.id] ?? '#666', brightness) }}
                />
              ))}
            </>
          ))}
        </div>
      )}

      {/* Log-scale sizing note — Korea tab treemap only */}
      {scope === 'kr' && view === 'treemap' && (
        <p className="mt-3 text-[0.65rem] text-gray-400 dark:text-gray-500">{t.krSizeNote}</p>
      )}

      {/* Star tier legend — grid only */}
      {view === 'grid' && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t.starTierTitle}</p>
          <div className="flex items-center gap-3 text-[0.65rem]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-500 dark:text-gray-400">{t.starTiers[0]}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-500 dark:text-gray-400">{t.starTiers[1]}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">{t.starTiers[2]}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
