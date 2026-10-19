// ============================================================================
// La riga di Beach Wrapped (il redesign, Home e Statistiche): il telefono nel
// riquadro, «Beach Wrapped · La tua stagione in storie» e «Apri», l'unico
// arancio della riga. Compare solo quando il recap è pronto (stagione e
// partite a sufficienza): lo decide chi la usa.
// ============================================================================
import type { CSSProperties } from 'react'
import { Card } from '../ui/Card'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import './dashboard.css'

export function WrappedRow({ titolo, className, style }: {
  /** «Beach Wrapped», «Beach Wrapped 2026» con una stagione scelta. */
  titolo: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <Card as="div" className={className ? `dash-wrapped ${className}` : 'dash-wrapped'} style={style}>
      <span className="dash-wrapped-icon" aria-hidden="true">
        <Icon name="phone" size={20} />
      </span>
      <span className="dash-wrapped-text">
        <span className="dash-wrapped-title">{titolo}</span>
        <span className="dash-wrapped-sub">La tua stagione in storie</span>
      </span>
      {/* «Apri» da solo non dice cosa: il nome intero lo porta l'aria-label,
          che comincia con la parola che si vede (WCAG 2.5.3). */}
      <ButtonLink to={{ name: 'wrapped' }} size="sm" className="dash-wrapped-apri" aria-label={`Apri ${titolo}`}>
        Apri
      </ButtonLink>
    </Card>
  )
}
