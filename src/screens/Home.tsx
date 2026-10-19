// ============================================================================
// Home `/` (il redesign, schermata 06): come stai andando, detto in una frase,
// e cosa fare adesso, detto da Pallo. Dall'alto:
//   1. la data e il titolo-frase (dai dati, `fraseHome`); a destra l'avatar,
//      che porta al Profilo (il Profilo non è più una tab);
//   2. il periodo (Sempre · le ultime stagioni) e «Compagni ⌄»: gli stessi
//      filtri di Statistiche, Mappa e Wrapped (C10);
//   3. Pallo con la nuvoletta: un consiglio vero alla volta, un tocco passa al
//      successivo. Le azioni di oggi stanno qui: «Aggiungi partita» per il
//      torneo di oggi, «Com'è andata a «X»?», la Storia dell'ultimo torneo.
//      La faccia di Pallo segue il consiglio (`umoreDelConsiglio`);
//   4. «Partite vinte»: il win rate grande, lo scarto, la barra vinte/perse.
//      Tutta la card porta a Statistiche;
//   5. Beach Wrapped, quando è pronto;
//   6. tornei vinti (porta a Tornei) e serie record;
//   7. gli ultimi tornei, con la medaglia.
// Diario vuoto: solo Pallo che invita a creare il primo torneo. Tornei senza
// partite: niente numeri (una fila di zeri non informa, UX F1), è Pallo a dire
// di aggiungere la prima partita.
//
// I blocchi salgono uno dopo l'altro (`.rise`, 50ms fra l'uno e l'altro);
// `.rise` sta sui contenitori e `.press` su ciò che si preme dentro di loro,
// mai sullo stesso elemento: il `transform` d'arrivo della salita resta
// applicato e coprirebbe quello della pressione.
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import * as m from 'motion/react-m'
import type { HomeProps } from '../app/contracts'
import { Link } from '../app/router'
import { iniziali, oggiEsteso, stagioniHome } from '../app/selectors'
import type { AzioneConsiglio, Consiglio, UltimoTorneo } from '../app/selectors'
import type { DashboardStats } from '../lib/derive'
import { placementRank } from '../lib/stats'
import { Button, ButtonLink, Card, Icon, Page, SegmentedControl, Tabellone, nomeVisibile } from '../components/ui/index'
import { Medal } from '../components/ui/Medal'
import { Pallo, usePalloTocco } from '../components/Pallo'
import type { PalloHandle, PalloUmore } from '../components/Pallo'
import { FiltroSelect, WrappedRow } from '../components/dashboard'
import { ENTRATA } from '../components/Motion'
import './Home.css'

/** Il posto nella salita sfalsata. */
const sale = (i: number) => ({ '--rise-i': i }) as CSSProperties

const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`

function Intestazione({ today, frase, nome, avatar }: { today: string; frase: string; nome: string; avatar: string | null }) {
  const giorno = oggiEsteso(today)
  return (
    <header className="home-head rise" style={sale(0)}>
      <div className="home-head-text">
        <p className="home-data">{giorno.charAt(0).toUpperCase() + giorno.slice(1)}</p>
        <h1 className="home-frase" tabIndex={-1}>{frase}</h1>
      </div>
      <Link to={{ name: 'profilo' }} className="home-avatar press" aria-label="Profilo">
        {avatar ? <img src={avatar} alt="" /> : <span aria-hidden="true">{iniziali(nome)}</span>}
      </Link>
    </header>
  )
}

/** Il periodo e il compagno. Cambiarli annuncia UNA volta che i numeri sono cambiati. */
function Filtri({ filtri }: { filtri: HomeProps['filtri'] }) {
  const { fYear, setFYear, yearOptions, fPartner, setFPartner, partnerOptions } = filtri
  const stagioni = stagioniHome(yearOptions, fYear)
  const compagno = fPartner !== 'all' ? partnerOptions.find((p) => p.id === fPartner)?.name : undefined

  // La live region c'è da subito (vuota): al montaggio non si annuncia niente.
  const [annuncio, setAnnuncio] = useState('')
  const primo = useRef(true)
  useEffect(() => {
    if (primo.current) {
      primo.current = false
      return
    }
    const periodo = fYear === 'Sempre' ? 'Sempre' : `Stagione ${fYear}`
    setAnnuncio(`Numeri aggiornati: ${compagno ? `${periodo} con ${compagno}` : periodo}`)
  }, [fYear, fPartner]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="home-filtri rise" style={sale(1)}>
      {stagioni.length > 1 && (
        <SegmentedControl
          label="Periodo"
          className="home-periodo"
          options={stagioni.map((y) => ({ value: y, label: y }))}
          value={fYear}
          onChange={setFYear}
        />
      )}
      {partnerOptions.length > 0 && (
        <FiltroSelect
          label="Compagni"
          className="home-compagni"
          value={fPartner}
          onChange={setFPartner}
          options={[{ value: 'all', label: 'Tutti i compagni' }, ...partnerOptions.map((p) => ({ value: p.id, label: p.name }))]}
          mostra={compagno ?? 'Compagni'}
        />
      )}
      <p className="sr-only" role="status">{annuncio}</p>
    </div>
  )
}

interface AzioniConsiglio {
  onNuovoTorneo: () => void
  onAggiungiPartita: (id: string) => void
  onAggiornaPiazzamento: (id: string) => void
  onStoria: (id: string) => void
}

/** L'azione della nuvoletta: piena se è la cosa da fare, tinta se è un invito. */
function Azione({ a, on }: { a: AzioneConsiglio; on: AzioniConsiglio }) {
  switch (a.tipo) {
    case 'partita':
      return <Button size="sm" icon="plus" onClick={() => on.onAggiungiPartita(a.torneoId)}>{a.label}</Button>
    case 'nuovoTorneo':
      return <Button size="sm" icon="plus" onClick={on.onNuovoTorneo}>{a.label}</Button>
    case 'piazzamento':
      return <Button size="sm" variant="tinted" onClick={() => on.onAggiornaPiazzamento(a.torneoId)}>{a.label}</Button>
    case 'storia':
      return <Button size="sm" variant="tinted" icon="instagram" onClick={() => on.onStoria(a.torneoId)}>{a.label}</Button>
    case 'link':
      return <ButtonLink to={a.to} size="sm" variant="tinted">{a.label}</ButtonLink>
  }
}

/**
 * L'umore di Pallo segue il consiglio che sta dando: gli occhiali per la serie
 * in corso, gli occhi a cuore per il record e per il posto magico, la festa
 * per un 1° posto recente, la lacrimuccia se l'ultimo torneo è finito fuori
 * dal podio (l'ultima partita è quella persa che ti ha eliminato), l'occhiolino
 * per Wrapped, la mano sul mento per «Com'è andata?». Il resto: saluta.
 */
function umoreDelConsiglio(c: Consiglio, ultimi: UltimoTorneo[]): PalloUmore {
  const [tipo, resto = ''] = c.id.split(':')
  switch (tipo) {
    case 'serie':
      return 'cool'
    case 'record':
    case 'posto':
      return 'cuori'
    case 'wrapped':
      return 'occhiolino'
    case 'chiudi':
      return 'pensa'
    case 'storia': {
      const t = ultimi.find((u) => u.id === resto)
      if (!t) return 'saluta'
      const r = placementRank(t.placement)
      if (r === 1) return 'festa'
      if (r <= 3) return 'contento'
      return t.record && t.record.lost > 0 ? 'triste' : 'saluta'
    }
    default:
      return 'saluta'
  }
}

/**
 * Pallo e la sua nuvoletta. Con più di un consiglio Pallo è un pulsante: ogni
 * tocco passa al successivo, e la nuvoletta (una live region) lo dice; intanto
 * Pallo fa un salto con una faccia allegra a caso, e cinque tocchi di fila (o
 * uno lungo) sono la sua sorpresa. Con un consiglio solo è un disegno e basta:
 * un pulsante che non cambia niente sarebbe una promessa vuota. Gli occhi
 * seguono il dito in tutti e due i casi.
 */
function PalloConsiglia({ consigli, ultimi, on, dopo }: { consigli: Consiglio[]; ultimi: UltimoTorneo[]; on: AzioniConsiglio; dopo?: ReactNode }) {
  const [i, setI] = useState(0)
  // Il primo consiglio arriva con la salita della riga; i successivi con la
  // loro comparsa (ENTRATA), solo dopo un tocco.
  const toccato = useRef(false)
  const pallo = useRef<PalloHandle>(null)
  const gesti = usePalloTocco(pallo, () => {
    toccato.current = true
    setI((x) => x + 1)
  })
  const n = consigli.length
  if (n === 0) return null
  const c = consigli[i % n]
  const disegno = <Pallo ref={pallo} umore={umoreDelConsiglio(c, ultimi)} size={96} ombra segui />
  return (
    <div className="home-pallo rise" style={sale(2)}>
      {n > 1 ? (
        <button type="button" className="home-pallo-btn press pallo-toccabile" aria-label="Pallo: un altro consiglio" {...gesti}>
          {disegno}
        </button>
      ) : (
        <span className="home-pallo-btn">{disegno}</span>
      )}
      <div className="home-nuvola">
        <p className="home-nuvola-chi">Pallo</p>
        <div aria-live="polite">
          <m.div
            key={`${i % n}:${c.id}`}
            className="home-nuvola-corpo"
            initial={toccato.current ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={ENTRATA}
          >
            <p className="home-nuvola-testo">{c.testo}</p>
            {c.azione && (
              <div className="home-nuvola-azioni">
                <Azione a={c.azione} on={on} />
              </div>
            )}
            {dopo}
          </m.div>
        </div>
      </div>
    </div>
  )
}

/**
 * «Partite vinte»: il numero grande col «%» arancio, lo scarto, la barra che
 * cresce (vinte d'inchiostro, perse sul filo forte). Tutta la card porta a
 * Statistiche: il chevron accanto all'etichetta è il link, esteso alla card.
 */
function Rendimento({ s }: { s: DashboardStats }) {
  const id = useId()
  return (
    <Card as="section" className="home-rend" aria-labelledby={`${id}-t`}>
      <div className="home-rend-top">
        <div className="home-rend-main">
          <div className="home-label-row">
            <h2 className="home-label" id={`${id}-t`}>Partite vinte</h2>
            <Link to={{ name: 'statistiche' }} className="ui-card-link home-chev-link" aria-label="Tutte le statistiche">
              <Icon name="chevron-right" size={12} />
            </Link>
          </div>
          <p className="home-pct">
            <Tabellone value={s.winPct} size="hero" rise="home" />
            <span className="home-pct-s">%</span>
          </p>
        </div>
        <p className="home-scarto">
          <span className="home-scarto-n"><Tabellone value={s.diffStr} size="l" rise="home" /></span>
          <span className="home-scarto-l">punti di scarto</span>
        </p>
      </div>
      <div className="home-barra" aria-hidden="true">
        {s.won > 0 && <span className="home-barra-v" style={{ flexGrow: s.won }} />}
        {s.lost > 0 && <span className="home-barra-p" style={{ flexGrow: s.lost }} />}
      </div>
      <p className="home-rend-piede">
        <span><strong>{s.won}</strong> {s.won === 1 ? 'vinta' : 'vinte'}</span>
        <span>{plurale(s.lost, 'persa', 'perse')} · {plurale(s.played, 'giocata', 'giocate')}</span>
      </p>
    </Card>
  )
}

/** Il periodo scelto non ha partite (altri sì): la card resta, con una frase. */
function RendimentoVuoto() {
  const id = useId()
  return (
    <Card as="section" className="home-rend" aria-labelledby={`${id}-t`}>
      <h2 className="home-label" id={`${id}-t`}>Partite vinte</h2>
      <p className="home-vuoto">Nessuna partita in questo periodo.</p>
    </Card>
  )
}

function Coppia({ s }: { s: DashboardStats }) {
  const id = useId()
  return (
    <div className="home-coppia rise" style={sale(5)}>
      <Card as="div" className="home-mini">
        <span className="home-label-row home-mini-head">
          <Link to={{ name: 'tornei', vista: 'lista' }} className="ui-card-link home-label" aria-describedby={`${id}-tv`}>
            Tornei vinti
          </Link>
          <Icon name="chevron-right" size={16} className="home-chev" />
        </span>
        <span id={`${id}-tv`} className="home-mini-body">
          <span className="home-mini-n">
            <Tabellone value={s.tWon} size="l" rise="home" />
            <span className="home-mini-di">
              {' '}
              <span aria-hidden="true">/</span>
              <span className="sr-only">su</span> {s.tPlayed}
            </span>
          </span>
          <span className="home-mini-sub">{plurale(s.podi, 'podio', 'podi')}</span>
        </span>
      </Card>
      <Card as="div" className="home-mini">
        <span className="home-label">Serie record</span>
        <span className="home-mini-n"><Tabellone value={s.streak} size="l" rise="home" /></span>
        <span className="home-mini-sub">{s.streak === 1 ? 'vittoria di fila' : 'vittorie di fila'}</span>
      </Card>
    </div>
  )
}

function UltimiTornei({ ultimi, rise }: { ultimi: UltimoTorneo[]; rise: number }) {
  const id = useId()
  return (
    <Card as="section" className="home-ultimi rise" style={sale(rise)} aria-labelledby={`${id}-t`}>
      <div className="home-ultimi-head">
        <h2 className="home-h2" id={`${id}-t`}>Ultimi tornei</h2>
        <Link to={{ name: 'tornei', vista: 'lista' }} className="home-tutti" aria-label="Tutti i tornei">
          Tutti
        </Link>
      </div>
      <ul className="home-ultimi-list">
        {ultimi.map((t) => (
          <li key={t.id}>
            <Link to={{ name: 'torneo', id: t.id }} className="home-ultimo">
              <Medal placement={t.placement} size="md" />
              <span className="home-ultimo-text">
                <span className="home-ultimo-nome">{nomeVisibile(t.name)}</span>
                <span className="home-ultimo-meta">{t.meta}</span>
              </span>
              {t.record && (
                <span className="home-ultimo-rec">
                  <span aria-hidden="true">{t.record.won}–{t.record.lost}</span>
                  <span className="sr-only">
                    , {plurale(t.record.won, 'vinta', 'vinte')} e {plurale(t.record.lost, 'persa', 'perse')}
                  </span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Home({
  nome,
  avatar,
  today,
  frase,
  consigli,
  numeri,
  haPartite,
  hasTornei,
  ultimi,
  filtri,
  wrapped,
  onNuovoTorneo,
  onAggiungiPartita,
  onAggiornaPiazzamento,
  onStoria,
}: HomeProps) {
  const on = { onNuovoTorneo, onAggiungiPartita, onAggiornaPiazzamento, onStoria }
  const intestazione = <Intestazione today={today} frase={frase} nome={nome} avatar={avatar} />

  // Diario vuoto: Pallo invita a creare il primo torneo, e c'è l'assistente
  // per chi preferisce farsi guidare.
  if (!hasTornei) {
    return (
      <Page className="home">
        {intestazione}
        <div className="home-corpo">
          <PalloConsiglia
            consigli={consigli}
            ultimi={ultimi}
            on={on}
            dopo={
              <p className="home-nuvola-nota">
                Preferisci farti guidare?{' '}
                <Link to={{ name: 'crea' }} className="home-link">
                  Usa l'assistente
                </Link>
              </p>
            }
          />
        </div>
      </Page>
    )
  }

  return (
    <Page className="home">
      {intestazione}
      {/* Senza partite i filtri non muoverebbero niente di visibile. */}
      {filtri.canFilter && haPartite && <Filtri filtri={filtri} />}

      <div className="home-corpo">
        {/* Sotto i 1280 le colonne non esistono (`display: contents`): un
            flusso solo, nell'ordine del design. Da lì due colonne: Pallo e i
            numeri a sinistra, Wrapped, le due card e gli ultimi tornei a
            destra (le altezze si equivalgono). */}
        <div className="home-col">
          <PalloConsiglia consigli={consigli} ultimi={ultimi} on={on} />
          {haPartite && (
            <div className="home-rend-wrap rise" style={sale(3)}>
              {numeri ? <Rendimento s={numeri} /> : <RendimentoVuoto />}
            </div>
          )}
        </div>
        <div className="home-col">
          {wrapped.visibile && <WrappedRow titolo={wrapped.titolo} className="rise" style={sale(4)} />}
          {numeri && <Coppia s={numeri} />}
          {ultimi.length > 0 && <UltimiTornei ultimi={ultimi} rise={6} />}
        </div>
      </div>
    </Page>
  )
}
