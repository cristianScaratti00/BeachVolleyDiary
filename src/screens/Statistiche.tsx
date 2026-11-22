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
import { NavBar, Page, SegmentedControl } from '../components/ui/index'
import { GENERE_MINUSCOLO, TUTTI } from '../lib/genere'
import type { FiltroGenere } from '../lib/genere'
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
  ConfrontoGeneriCard,
  CategorieCard,
  RiordinaCard,
} from '../components/dashboard'
import { CampionatoCard } from './CampionatoCard'
import './Statistiche.css'

function etichettaPeriodo(fYear: string, compagno: string | null, genere: FiltroGenere = TUTTI): string {
  const periodo = !fYear || fYear === 'Sempre' ? 'Sempre' : `Stagione ${fYear}`
  const conChi = compagno ? `${periodo} con ${compagno}` : periodo
  return genere === TUTTI ? conChi : `${conChi} · ${GENERE_MINUSCOLO[genere]}`
}

const sale = (i: number) => ({ '--rise-i': i }) as CSSProperties
const partite = (n: number) => (n === 0 ? 'Nessuna partita' : n === 1 ? '1 partita' : `${n} partite`)

export default function Statistiche({ s, filtri, back, wrapped, campionato, altriGeneri = [], categorie = [], riordino, onRiordina, onRimandaRiordino }: StatisticheProps) {
  const { fPartner, fYear, setFPartner, setFYear, partnerOptions, yearOptions, canFilter, fGender, setFGender, genderOptions } = filtri
  const compagno = fPartner !== 'all' ? partnerOptions.find((p) => p.id === fPartner)?.name ?? null : null
  const periodo = etichettaPeriodo(fYear, compagno, fGender)
  // L'invito a separare maschile e misto la prima volta; poi la riga piccola in fondo.
  const invito = !!riordino && riordino.senza > 0 && riordino.primaVolta && !riordino.rimandato
  const rigaRiordino = !!riordino && riordino.senza > 0 && !invito

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
  }, [fPartner, fYear, fGender]) // eslint-disable-line react-hooks/exhaustive-deps

  // «Sempre» per prima, poi le stagioni dalla più recente (yearOptions la
  // mette in fondo).
  const stagioni = ['Sempre', ...yearOptions.filter((y) => y !== 'Sempre')]
  // I blocchi salgono in ordine; con i filtri e Wrapped le card partono dopo.
  let i = 1 + (canFilter ? 1 : 0) + (wrapped.visibile ? 1 : 0) + (invito ? 1 : 0)

  return (
    <Page>
      {/* Il periodo si legge già sui filtri: il sottotitolo dice quante
          partite ci stanno dentro. */}
      <NavBar title="Statistiche" subtitle={`${partite(s.played)} · ${periodo}`} back={back}>
        {/* Il genere prima di tutto: maschile e misto non si sommano. Solo
            con almeno due generi giocati. */}
        {genderOptions.length >= 2 && (
          <SegmentedControl
            className="stat-generi rise"
            label="Genere"
            value={fGender}
            onChange={(v) => setFGender(v as FiltroGenere)}
            options={[...genderOptions.map((g) => ({ value: g, label: g })), { value: TUTTI, label: 'Tutti' }]}
          />
        )}
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

      {invito && onRiordina && (
        <RiordinaCard senza={riordino!.senza} primaVolta onRiordina={onRiordina} onRimanda={onRimandaRiordino} className="stat-invito rise" style={sale(canFilter ? 2 : 1)} />
      )}
      {wrapped.visibile && <WrappedRow titolo={wrapped.titolo} className="stat-wrapped rise" style={sale((canFilter ? 2 : 1) + (invito ? 1 : 0))} />}

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
        {fGender !== TUTTI && altriGeneri.length > 0 && (
          <ConfrontoGeneriCard attivo={fGender} s={s} altri={altriGeneri} onApri={setFGender} rise={i++} />
        )}
        <TrendCard s={s} rise={i++} />
        <WinLossCard s={s} rise={i++} />
        <PointsCard s={s} rise={i++} />
        <PhaseCard s={s} rise={i++} />
        <PlacementCard s={s} rise={i++} />
        {categorie.length > 1 && <CategorieCard righe={categorie} genere={fGender} rise={i++} />}
        <PartnerCard s={s} rise={i++} />
      </div>

      {rigaRiordino && onRiordina && <RiordinaCard senza={riordino!.senza} primaVolta={false} onRiordina={onRiordina} className="stat-riordina rise" style={sale(i++)} />}

      {/* Le tappe del Campionato per Società hanno i loro numeri: qui si dice
          che non entrano, e si porta là. */}
      {campionato && <CampionatoCard c={campionato} dove="statistiche" className="stat-campionato rise" style={sale(i++)} />}
    </Page>
  )
}
