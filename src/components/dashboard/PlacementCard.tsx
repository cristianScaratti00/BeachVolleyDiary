// ============================================================================
// Piazzamenti: quante volte ogni risultato, una barra per riga. Il colore
// della barra arriva dalla lib (`placementDist[].color`, letterali della
// palette di prima) e si legge come SEGNALE con `dataTone`: 1° = --data-win,
// podio = --data-podium, il resto = --data-rest (ART_DIRECTION §4.5).
// «1° 🏆» è un valore del DB: si mostra «1°» e si legge «Primo posto» (C15).
// ============================================================================
import type { DashboardStats } from '../../lib/derive'
import { dataTone } from '../../lib/theme'
import { Bar } from '../ui/Stat'
import { placementText } from '../ui/Badge'
import { ChartCard, EmptyNote } from './Chart'

const tono = (c: string) => {
  const t = dataTone(c)
  return t === 'win' ? 'win' : t === 'podium' ? 'podium' : 'rest'
}

function Etichetta({ label }: { label: string }) {
  const testo = placementText(label)
  if (testo === label) return <>{testo}</>
  return (
    <>
      <span aria-hidden="true">{testo}</span>
      <span className="sr-only">{testo.replace('1°', 'Primo posto')}</span>
    </>
  )
}

export function PlacementCard({ s }: { s: DashboardStats }) {
  return (
    <ChartCard title="Piazzamenti">
      {s.placementDist.length ? (
        <ul className="dash-placements">
          {s.placementDist.map((pl) => (
            <li key={pl.label} className="dash-placement">
              <span className="dash-row-label"><Etichetta label={pl.label} /></span>
              <Bar pct={Number.parseInt(pl.barW, 10) || 0} tone={tono(pl.color)} />
              <span className="dash-row-n">
                {pl.count}
                <span className="sr-only">{pl.count === 1 ? ' torneo' : ' tornei'}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Nessun torneo in questo periodo.</EmptyNote>
      )}
    </ChartCard>
  )
}
