// ============================================================================
// Statistiche `/statistiche` (UX §5 F8, §6.2, Q18), nel linguaggio del
// redesign: la pillola di vetro «‹ Home», il titolo grande, i due filtri di
// vetro («Sempre ⌄», «Compagni ⌄») e le card bianche col filo che salgono una
// dopo l'altra. Ci si arriva dalla card «Partite vinte» della Home.
//
// - I filtri sono `<select>` veri vestiti da pulsanti di vetro: qui ci sono
//   TUTTE le stagioni (la Home ne mostra solo le ultime). Pilotano tutto ciò
//   che si vede qui, e la Home, la Mappa e Wrapped: la stagione è condivisa
//   (C10). Cambiarli annuncia UNA volta, in modo polite, «Statistiche
//   aggiornate: {periodo}»; al montaggio non si annuncia niente.
// - Il calcolo client compare subito; quando arriva la RPC i numeri non
//   saltano (sono uguali per costruzione), e se cambiano per un filtro
//   scorrono dal vecchio al nuovo (il tabellone).
// - 0 partite nel periodo: ogni card dice la sua frase vuota, niente zeri.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { StatisticheProps } from '../app/contracts'
import { NavBar, Page } from '../components/ui/index'
import {
  ChartCard,
  EmptyNote,
  FiltroSelect,
  KeyNumbers,
  PartnerCard,
  PhaseCard,
  PlacementCard,
  PointsCard,
  TrendCard,
  WinLossCard,
  WrappedRow,
} from '../components/dashboard'
import './Statistiche.css'

function etichettaPeriodo(fYear: string, compagno: string | null): string {
  const periodo = !fYear || fYear === 'Sempre' ? 'Sempre' : `Stagione ${fYear}`
  return compagno ? `${periodo} con ${compagno}` : periodo
}

const sale = (i: number) => ({ '--rise-i': i }) as CSSProperties
const partite = (n: number) => (n === 0 ? 'Nessuna partita' : n === 1 ? '1 partita' : `${n} partite`)

export default function Statistiche({ s, filtri, back, wrapped }: StatisticheProps) {
  const { fPartner, fYear, setFPartner, setFYear, partnerOptions, yearOptions, canFilter } = filtri
  const compagno = fPartner !== 'all' ? partnerOptions.find((p) => p.id === fPartner)?.name ?? null : null
  const periodo = etichettaPeriodo(fYear, compagno)

  // L'annuncio parte solo dopo un cambio dei filtri: la live region c'è da
  // subito (vuota), così il primo annuncio non si perde.
  const [annuncio, setAnnuncio] = useState('')
  const primo = useRef(true)
  useEffect(() => {
    if (primo.current) {
      primo.current = false
      return
    }
    setAnnuncio(`Statistiche aggiornate: ${periodo}`)
  }, [fPartner, fYear]) // eslint-disable-line react-hooks/exhaustive-deps

  // «Sempre» per prima, poi le stagioni dalla più recente (yearOptions la
  // mette in fondo).
  const stagioni = ['Sempre', ...yearOptions.filter((y) => y !== 'Sempre')]
  // I blocchi salgono in ordine; con i filtri e Wrapped le card partono dopo.
  let i = 1 + (canFilter ? 1 : 0) + (wrapped.visibile ? 1 : 0)

  return (
    <Page>
      {/* Il periodo si legge già sui filtri: il sottotitolo dice quante
          partite ci stanno dentro. */}
      <NavBar title="Statistiche" subtitle={`${partite(s.played)} · ${periodo}`} back={back}>
        {canFilter && (
          <div className="stat-filtri rise" style={sale(1)} role="group" aria-label="Filtri delle statistiche">
            <FiltroSelect
              label="Stagione"
              value={fYear}
              onChange={setFYear}
              options={stagioni.map((y) => ({ value: y, label: y }))}
              mostra={fYear}
            />
            {partnerOptions.length > 0 && (
              <FiltroSelect
                label="Compagni"
                className="stat-compagni"
                value={fPartner}
                onChange={setFPartner}
                options={[{ value: 'all', label: 'Tutti i compagni' }, ...partnerOptions.map((p) => ({ value: p.id, label: p.name }))]}
                mostra={compagno ?? 'Compagni'}
              />
            )}
          </div>
        )}
      </NavBar>
      <p className="sr-only" role="status">{annuncio}</p>

      {wrapped.visibile && <WrappedRow titolo={wrapped.titolo} className="stat-wrapped rise" style={sale(canFilter ? 2 : 1)} />}

      <div className="stat-grid">
        {s.played > 0 ? (
          <div className="stat-key rise" style={sale(i++)}>
            <KeyNumbers s={s} rise="statistiche" />
          </div>
        ) : (
          <ChartCard title="Numeri chiave" wide rise={i++}>
            <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
          </ChartCard>
        )}
        <TrendCard s={s} rise={i++} />
        <WinLossCard s={s} rise={i++} />
        <PointsCard s={s} rise={i++} />
        <PhaseCard s={s} rise={i++} />
        <PlacementCard s={s} rise={i++} />
        <PartnerCard s={s} rise={i++} />
      </div>
    </Page>
  )
}
