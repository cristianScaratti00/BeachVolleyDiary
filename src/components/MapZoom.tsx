// ============================================================================
// I pulsanti +/− sopra le mappe (ART_DIRECTION §10.3): vetro sottile, sola
// icona, 44px. Prendono il posto del controllo di Leaflet, che misura 26px e
// parla inglese. I due pulsanti stanno in UNA capsula di vetro: due superfici
// sfocate sopra la mappa, con NavBar e TabBar, sforerebbero il budget di 3
// (UX §10). Nessuna conoscenza di Leaflet qui: la mappa passa le azioni e i
// limiti, il componente li disegna.
// ============================================================================
import { IconButton } from './ui/Button'
import './MapZoom.css'

export function MapZoom({ onIn, onOut, canIn = true, canOut = true }: {
  onIn: () => void
  onOut: () => void
  /** Falso al massimo ingrandimento: il pulsante resta, ma non fa niente. */
  canIn?: boolean
  /** Falso al minimo. */
  canOut?: boolean
}) {
  return (
    <div className="mapzoom" data-material="glass-thin" role="group" aria-label="Zoom della mappa">
      <IconButton
        icon="plus"
        label="Ingrandisci"
        iconSize={20}
        aria-disabled={canIn ? undefined : true}
        onClick={canIn ? onIn : undefined}
      />
      <span className="mapzoom-sep" aria-hidden="true" />
      <IconButton
        icon="minus"
        label="Riduci"
        iconSize={20}
        aria-disabled={canOut ? undefined : true}
        onClick={canOut ? onOut : undefined}
      />
    </div>
  )
}
