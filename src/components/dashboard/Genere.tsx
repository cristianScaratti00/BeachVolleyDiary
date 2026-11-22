// ============================================================================
// Le statistiche per genere (proposta A + B, 22/11/2026): il confronto con
// gli altri generi, le categorie dentro il genere scelto, e l'invito a
// riordinare i tornei che non dicono ancora se erano maschili, femminili o
// misti. Il selettore (SegmentedControl) sta nella NavBar di Statistiche.
// ============================================================================
import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { DashboardStats } from '../../lib/derive'
import { GENERE_MINUSCOLO, TUTTI } from '../../lib/genere'
import type { FiltroGenere, Gender, RigaCategoria } from '../../lib/genere'
import type { NumeriGenere } from '../../app/useScreenData'
import { Pallo } from '../Pallo'
import { Button } from '../ui/Button'
import { placementText } from '../ui/Badge'
import { Card } from '../ui/Card'
import { MeterRow } from '../ui/Stat'
import { ChartCard, EmptyNote } from './Chart'

const partite = (n: number) => (n === 1 ? '1 partita' : `${n} partite`)
const tornei = (n: number) => (n === 1 ? '1 torneo' : `${n} tornei`)
const podi = (n: number) => (n === 1 ? '1 podio' : `${n} podi`)

/** «Nel misto» / «Negli altri generi»: il genere scelto contro gli altri, con gli stessi filtri. */
export function ConfrontoGeneriCard({ attivo, s, altri, onApri, rise }: {
  attivo: Gender
  s: DashboardStats
  altri: NumeriGenere[]
  /** Passa a un altro genere (il selettore in cima cambia con lui). */
  onApri: (g: Gender) => void
  rise?: number
}) {
  if (!altri.length) return null
  const colonne: NumeriGenere[] = [
    { genere: attivo, winPct: s.winPct, won: s.won, lost: s.lost, played: s.played, setPct: s.setPct, tPlayed: s.tPlayed, bestPlacement: s.bestPlacement },
    ...altri,
  ]
  const titolo = altri.length === 1 ? `Nel ${GENERE_MINUSCOLO[altri[0].genere]}` : 'Negli altri generi'
  const righe: { label: string; valore: (n: NumeriGenere) => string }[] = [
    { label: 'Partite vinte', valore: (n) => (n.played ? `${n.winPct}%` : '—') },
    { label: 'Record', valore: (n) => `${n.won}–${n.lost}` },
    { label: 'Set vinti', valore: (n) => (n.played ? `${n.setPct}%` : '—') },
    { label: 'Tornei', valore: (n) => String(n.tPlayed) },
    // Il valore del DB («1° 🏆») si legge come nel resto dell'interfaccia: «1°».
    { label: 'Miglior posto', valore: (n) => (n.bestPlacement && n.bestPlacement !== '—' ? placementText(n.bestPlacement) : '—') },
  ]
  return (
    <ChartCard
      title={titolo}
      wide
      rise={rise}
      extra={
        altri.length === 1 ? (
          <button type="button" className="dash-link dash-link-button" onClick={() => onApri(altri[0].genere)}>
            Apri il {GENERE_MINUSCOLO[altri[0].genere]}
          </button>
        ) : undefined
      }
      summary={altri
        .map((a) => `Nel ${GENERE_MINUSCOLO[a.genere]} ${a.played ? `${a.winPct}% di partite vinte` : 'nessuna partita'}, contro il ${s.played ? `${s.winPct}%` : '—'} nel ${GENERE_MINUSCOLO[attivo]}.`)
        .join(' ')}
    >
      <table className="dash-confronto">
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Numero</span></th>
            {colonne.map((c) => (
              <th key={c.genere} scope="col" data-attivo={c.genere === attivo ? '' : undefined}>{c.genere}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {colonne.map((c) => (
                <td key={c.genere} data-attivo={c.genere === attivo ? '' : undefined}>{r.valore(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  )
}

/** Le categorie (Amatoriale, Open, Serie…): dove vinci di più, nel genere scelto. */
export function CategorieCard({ righe, genere, rise }: { righe: RigaCategoria[]; genere: FiltroGenere; rise?: number }) {
  return (
    <ChartCard title="Per categoria" wide rise={rise}>
      {righe.length ? (
        <>
          {genere !== TUTTI && <p className="dash-sub">Dove vinci di più, nel {GENERE_MINUSCOLO[genere]}.</p>}
          <div className="dash-partners">
            {righe.map((r) => (
              <MeterRow key={r.categoria} label={r.categoria} pct={r.winPct} sub={[partite(r.partite), tornei(r.tornei), r.podi ? podi(r.podi) : null].filter(Boolean).join(' · ')} />
            ))}
          </div>
        </>
      ) : (
        <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
      )}
    </ChartCard>
  )
}

/**
 * I tornei senza genere. La prima volta (nessun torneo ancora segnato) è
 * l'invito di Solby a separare maschile e misto, che si può rimandare; poi
 * una riga piccola finché ne resta qualcuno.
 */
export function RiordinaCard({ senza, primaVolta, onRiordina, onRimanda, className, style }: {
  senza: number
  primaVolta: boolean
  onRiordina: () => void
  /** Solo per l'invito: «Più tardi» lo nasconde. */
  onRimanda?: () => void
  className?: string
  style?: CSSProperties
}) {
  const id = useId()
  if (!senza) return null
  if (primaVolta) {
    return (
      <Card as="section" className={['dash-invito', className].filter(Boolean).join(' ')} style={style} aria-labelledby={`${id}-t`}>
        <div className="dash-invito-top">
          <Pallo umore="pensa" size={56} className="dash-invito-pallo" />
          <div className="dash-invito-text">
            <h2 className="dash-title" id={`${id}-t`}>Separa maschile e misto</h2>
            <p>{tornei(senza)} non {senza === 1 ? 'dice' : 'dicono'} com'erano. Li raggruppo per compagno: con pochi tocchi li sistemi tutti.</p>
          </div>
        </div>
        <div className="dash-invito-azioni">
          <Button onClick={onRiordina}>Riordina i tornei</Button>
          {onRimanda && (
            <Button variant="plain" onClick={onRimanda}>
              Più tardi
            </Button>
          )}
        </div>
      </Card>
    )
  }
  return (
    <Card as="section" className={['dash-riordina', className].filter(Boolean).join(' ')} style={style} aria-labelledby={`${id}-t`}>
      <span className="dash-riordina-text">
        <span className="dash-riordina-t" id={`${id}-t`}>{senza === 1 ? '1 torneo senza genere' : `${senza} tornei senza genere`}</span>
        <span className="dash-riordina-sub">Contano solo in «Tutti».</span>
      </span>
      <Button variant="plain" size="sm" onClick={onRiordina} aria-describedby={`${id}-t`}>
        Sistema
      </Button>
    </Card>
  )
}
