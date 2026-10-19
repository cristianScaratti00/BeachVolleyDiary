// ============================================================================
// Il filtro di vetro del redesign («Compagni ⌄» in Home, «Sempre ⌄» in
// Statistiche): un pulsante di vetro che È un `<select>` vero. Il select,
// trasparente, copre tutto il pulsante: tastiera, screen reader e il menu del
// sistema (la ruota su iOS, la lista su Android) arrivano gratis e giusti,
// cosa che un menu disegnato a mano dovrebbe rifare da capo. Quello che si
// vede è la scelta, o il nome del filtro a riposo; il nome accessibile è
// l'etichetta del filtro, il valore lo annuncia il select stesso.
// ============================================================================
import { Icon } from '../ui/Icon'
import './dashboard.css'

export interface FiltroOpzione {
  value: string
  label: string
}

export function FiltroSelect({ label, value, onChange, options, mostra, className }: {
  /** Il nome del controllo («Compagni», «Stagione»): contiene ciò che si legge a riposo. */
  label: string
  value: string
  onChange: (value: string) => void
  options: FiltroOpzione[]
  /** Il testo sul pulsante: la scelta, o il nome del filtro quando vale «tutti». */
  mostra: string
  className?: string
}) {
  return (
    <span className={className ? `dash-select press ${className}` : 'dash-select press'} data-material="glass-regular">
      <span className="dash-select-text" aria-hidden="true">{mostra}</span>
      <Icon name="chevron-down" size={12} className="dash-select-chev" />
      <select className="dash-select-native" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}
