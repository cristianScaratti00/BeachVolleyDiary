// ============================================================================
// Il set di icone dell'app (ART_DIRECTION.md §10.1): estensione di quello che
// era NavIcons.tsx. ViewBox 24, area viva 20, tratto che si ispessisce quando
// l'icona rimpicciolisce (--icon-stroke-*), sempre `currentColor`.
//
// Sostituisce le emoji usate come icone (＋ 📷 🔗 ✨ ⚡ 🏐 📍 🔒 ↻). Le emoji
// restano CONTENUTO (l'emoji del torneo, le slide Wrapped), mai interfaccia.
//
// Un'icona è sempre `aria-hidden`: il nome lo porta il controllo che la
// contiene (etichetta visibile o `aria-label`).
// ============================================================================
import { FILLS, PATHS } from './Icon.paths'
import type { IconName } from './Icon.paths'
import './Icon.css'

export type { IconName } from './Icon.paths'
export type IconSize = 12 | 16 | 20 | 24

export function Icon({ name, size = 20, filled = false, className }: {
  name: IconName
  size?: IconSize
  /** Variante piena (solo le icone delle tab ce l'hanno). */
  filled?: boolean
  className?: string
}) {
  const fill = filled ? FILLS[name] : undefined
  return (
    <svg
      className={className ? `ui-icon ${className}` : 'ui-icon'}
      data-size={size}
      data-filled={fill ? '' : undefined}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={fill ?? PATHS[name]} />
    </svg>
  )
}
