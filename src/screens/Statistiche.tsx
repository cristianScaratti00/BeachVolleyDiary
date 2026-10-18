// ============================================================================
// Statistiche `/statistiche` (UX §5 F8, §6.2, Q18): i grafici che prima
// affollavano la Home, con i filtri Compagno e Stagione in vista.
//
// - I filtri pilotano tutto ciò che si vede qui (e la Mappa, e Wrapped: la
//   stagione è condivisa, C10). Cambiarli annuncia UNA volta, in modo polite,
//   «Statistiche aggiornate: {periodo}»; al montaggio non si annuncia niente.
// - Il calcolo client compare subito; quando arriva la RPC i numeri non
//   saltano (sono uguali per costruzione), e se cambiano per un filtro
//   scorrono dal vecchio al nuovo (il tabellone).
// - 0 partite nel periodo: ogni card dice la sua frase vuota, niente zeri.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { StatisticheProps } from '../app/contracts'
import { NavBar, Page, Select, List, ListRow } from '../components/ui/index'
import { ChartCard, EmptyNote, KeyNumbers, PartnerCard, PhaseCard, PlacementCard, PointsCard, TrendCard, WinLossCard } from '../components/dashboard'
import './Statistiche.css'

function etichettaPeriodo(fYear: string, compagno: string | null): string {
  const periodo = !fYear || fYear === 'Sempre' ? 'Sempre' : `Stagione ${fYear}`
  return compagno ? `${periodo} con ${compagno}` : periodo
}

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

  return (
    <Page>
      <NavBar title="Statistiche" subtitle={periodo} back={back} />

      {canFilter && (
        <div className="stat-filtri" role="group" aria-label="Filtri delle statistiche">
          <Select
            label="Compagno"
            value={fPartner}
            onChange={setFPartner}
            options={[{ value: 'all', label: 'Tutti i compagni' }, ...partnerOptions.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Select label="Stagione" value={fYear} onChange={setFYear} options={yearOptions.map((y) => ({ value: y, label: y }))} />
        </div>
      )}
      <p className="sr-only" role="status">{annuncio}</p>

      {wrapped.visibile && (
        <List className="stat-wrapped" label="Beach Wrapped">
          <ListRow to={{ name: 'wrapped' }} icon="sun" title={wrapped.titolo} subtitle="Il recap della stagione, da sfogliare e condividere" />
        </List>
      )}

      <div className="stat-grid">
        {s.played > 0 ? (
          <div className="stat-key">
            <KeyNumbers s={s} rise="statistiche" />
          </div>
        ) : (
          <ChartCard title="Numeri chiave" wide>
            <EmptyNote>Nessuna partita in questo periodo.</EmptyNote>
          </ChartCard>
        )}
        <TrendCard s={s} />
        <WinLossCard s={s} />
        <PointsCard s={s} />
        <PhaseCard s={s} />
        <PlacementCard s={s} />
        <PartnerCard s={s} />
      </div>
    </Page>
  )
}
