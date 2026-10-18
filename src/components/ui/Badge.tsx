// ============================================================================
// Badge (ART_DIRECTION §8, D9): capsula alta 20, 12px a peso 600, minuscolo.
// Nessun default: il vecchio `Badge` scriveva «Premium» a 8px se non gli si
// passava niente, e la Home lo mostrava a tutti su una funzione gratuita (C11).
// ============================================================================
import type { ReactNode } from 'react'
import { dataTone } from '../../lib/theme'
import { Icon } from './Icon'
import './Badge.css'

export type BadgeTone = 'neutral' | 'accent' | 'select' | 'success' | 'danger'

export function Badge({ tone = 'neutral', children, className }: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={className ? `ui-badge ${className}` : 'ui-badge'} data-tone={tone}>
      {children}
    </span>
  )
}

const TROFEO = /\s*🏆\s*/u

/**
 * Il piazzamento come badge. `'1° 🏆'` è un VALORE del DB (C15): non si tocca
 * il dato, si cambia solo come lo si mostra — «1°» con il trofeo SVG, e per gli
 * screen reader «Primo posto». Il tono arriva dai letterali della lib
 * (`badgeBg`), letti come segnale con `dataTone`.
 */
export function PlacementBadge({ label, libBg }: { label: string; libBg?: string }) {
  const primo = TROFEO.test(label)
  const visibile = placementText(label)
  const tone: BadgeTone = libBg && dataTone(libBg) === 'win' ? 'accent' : 'neutral'
  if (!primo) return <Badge tone={tone}>{visibile}</Badge>
  return (
    <Badge tone={tone === 'neutral' ? 'accent' : tone}>
      <Icon name="trophy" size={12} />
      <span aria-hidden="true">{visibile}</span>
      <span className="sr-only">{visibile.replace('1°', 'Primo posto')}</span>
    </Badge>
  )
}

/** «1° 🏆» → «1°»: per i testi che non sono un badge (sottotitoli, meta). */
export function placementText(label: string): string {
  // «1° 🏆 · Gold» → «1° · Gold»: il trofeo esce, gli spazi intorno no.
  return label.replace(TROFEO, ' ').replace(/\s+/g, ' ').trim()
}
