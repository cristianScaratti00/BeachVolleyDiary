// ============================================================================
// L'ingresso al Campionato per Società da Tornei e da Statistiche: una card
// sola, link vero a `/campionato`. In Statistiche dice anche che quei numeri
// NON stanno lì (scelta dell'utente: le tappe sono separate dalle statistiche).
// ============================================================================
import type { CSSProperties } from 'react'
import { useId } from 'react'
import { Link } from '../app/router'
import { Icon } from '../components/ui/Icon'
import type { CampionatoIngresso } from '../lib/campionato'
import './CampionatoCard.css'

const tappe = (n: number) => (n === 1 ? '1 tappa' : `${n} tappe`)

export function CampionatoCard({ c, dove, className, style }: {
  c: CampionatoIngresso
  /** `tornei`: punti a destra. `statistiche`: la frase su cosa resta fuori. */
  dove: 'tornei' | 'statistiche'
  className?: string
  style?: CSSProperties
}) {
  const meta = useId()
  const testo =
    dove === 'tornei'
      ? `${c.stagione} · ${c.club} · ${c.tappe ? tappe(c.tappe) : 'nessuna tappa'}`
      : c.tappe === 1
        ? `La tappa del ${c.stagione} ha i suoi numeri e non entra qui.`
        : `Le ${c.tappe ? `${c.tappe} ` : ''}tappe del ${c.stagione} hanno i loro numeri e non entrano qui.`
  return (
    <div className={className ? `camp-card ${className}` : 'camp-card'} style={style}>
      <span className="camp-card-icon" aria-hidden="true">
        <Icon name="shield" size={24} />
      </span>
      <span className="camp-card-text">
        <Link to={{ name: 'campionato' }} className="camp-card-link" aria-describedby={meta}>
          Campionato per Società
        </Link>
        <span id={meta} className="camp-card-meta">{testo}</span>
      </span>
      {dove === 'tornei' && c.punti > 0 && (
        <span className="camp-card-punti">
          <span className="camp-card-n">{c.punti}</span>
          <span className="camp-card-l">punti</span>
        </span>
      )}
      <Icon name="chevron-right" size={16} className="camp-card-chev" />
    </div>
  )
}
