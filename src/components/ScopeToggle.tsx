import { useState } from 'react'
import type { Scope } from '../types'
import type { Translations } from '../i18n/translations'

const ICONS: Record<Scope, string> = { all: '🌐', kr: '🇰🇷' }

interface ScopeToggleProps {
  scope: Scope
  onChange: (s: Scope) => void
  t: Translations
}

// Shows the current scope; on hover or focus it previews the scope a click switches to.
export default function ScopeToggle({ scope, onChange, t }: ScopeToggleProps) {
  const [previewing, setPreviewing] = useState(false)
  const next: Scope = scope === 'all' ? 'kr' : 'all'
  const label = next === 'kr' ? t.showKr : t.showAll

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
      title={label}
      aria-label={label}
      aria-pressed={scope === 'kr'}
      className="text-base leading-none transition-transform hover:scale-110"
    >
      {ICONS[previewing ? next : scope]}
    </button>
  )
}
