// ============================================================================
// Campionato per Società `/campionato` (proposta A, 21/11/2026): la stanza a
// parte delle tappe del CIPS, con i numeri suoi. Niente di quello che si vede
// qui entra in Statistiche, Beach Wrapped o nei numeri dei compagni, e lo si
// dice in fondo.
//
// - In cima la società della stagione con «Cambia», e il selettore delle
//   stagioni quando ce n'è più d'una.
// - La card dei numeri: i punti di coppia (il numero grande, la somma dei
//   punti FIPAV), i punti portati alla società, tappe, miglior posto, partite.
// - «Verso la Finale»: quanti tornei della categoria più giocata. La soglia
//   per giocarla si mostra solo se il regolamento della stagione la scrive.
// - Le tappe dalla più recente (medaglia col posto, punti a destra) e i
//   compagni con cui le hai giocate.
// ============================================================================
import type { CSSProperties } from 'react'
import { useId } from 'react'
import { Link } from '../app/router'
import type { CampionatoProps } from '../app/contracts'
import { Pallo } from '../components/Pallo'
import { Medal } from '../components/ui/Medal'
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  NavBar,
  Page,
  SegmentedControl,
  StatGrid,
  StatTile,
  nomeVisibile,
} from '../components/ui/index'
import { GENERE } from '../lib/campionato'
import type { CampionatoRiga } from '../lib/campionato'
import './Campionato.css'

const rise = (i: number) => ({ '--rise-i': Math.min(i, 6) }) as CSSProperties
const tappe = (n: number) => (n === 1 ? '1 tappa' : `${n} tappe`)

export default function Campionato({ vista, back, onStagione, onNuovaTappa, onModificaIscrizione, onRiprova, traccia }: CampionatoProps) {
  if (!vista) {
    return (
      <Page>
        <NavBar title="Campionato per Società" back={back} backIcon />
        <ErrorState
          title="Non riesco a caricare il Campionato"
          text="Il resto del diario funziona. Riprova tra poco."
          onRetry={onRiprova}
          autoRetryOnline
          level={2}
        />
      </Page>
    )
  }

  const { scelta, numeri, finale } = vista
  if (!scelta) {
    return (
      <Page>
        <NavBar title="Campionato per Società" back={back} backIcon />
        <EmptyState
          variant="primo"
          zero="Tappe"
          pallo="saluta"
          title="Nessuna tappa ancora."
          text="Qui tieni il Campionato Italiano per Società: piazzamenti, punti FIPAV e punti portati alla società. Restano fuori dalle tue statistiche."
          action={<Button onClick={onNuovaTappa}>Registra una tappa</Button>}
        />
      </Page>
    )
  }

  let i = 1
  return (
    <Page className="camp-page">
      <NavBar
        title="Campionato per Società"
        back={back}
        backIcon
        kicker={`Stagione ${scelta.season} · ${GENERE[scelta.gender]}`}
        subtitle={tappe(numeri.tappe)}
        actions={<IconButton icon="plus" iconSize={20} label="Nuova tappa" onClick={onNuovaTappa} />}
      />

      <div className="camp-club rise" style={rise(i++)}>
        <span className="camp-club-icon" aria-hidden="true">
          <Icon name="shield" size={24} />
        </span>
        <span className="camp-club-text">
          <span className="camp-club-name">{nomeVisibile(scelta.club)}</span>
          <span className="camp-club-sub">La tua società in questa stagione</span>
        </span>
        <Button variant="plain" size="sm" aria-label={`Cambia la società (${scelta.club})`} onClick={() => onModificaIscrizione(scelta.id)}>
          Cambia
        </Button>
      </div>

      {vista.stagioni.length > 1 && (
        <SegmentedControl
          className="camp-stagioni rise"
          label="Stagione"
          value={scelta.id}
          onChange={onStagione}
          options={vista.stagioni.map((s) => ({ value: s.id, label: s.label }))}
        />
      )}

      <section className="camp-hero rise" style={rise(i++)} aria-label="I numeri della stagione">
        <div className="camp-hero-top">
          <div className="camp-hero-main">
            <span className="camp-hero-label">Punti di coppia</span>
            <span className="camp-hero-n">{numeri.puntiCoppia}</span>
          </div>
          <div className="camp-hero-side">
            <span className="camp-hero-soc">{numeri.puntiSocieta}</span>
            <span className="camp-hero-label">portati alla società</span>
          </div>
        </div>
        <StatGrid cols={3} className="camp-hero-grid">
          <StatTile value={numeri.tappe} label={numeri.tappe === 1 ? 'tappa' : 'tappe'} rise={`campionato:${scelta.id}`} />
          <StatTile value={numeri.migliore ?? '—'} label="miglior posto" />
          <StatTile value={numeri.partite ? numeri.record : '—'} label="partite" />
        </StatGrid>
      </section>

      {finale && (
        <section className="camp-finale rise" style={rise(i++)} aria-labelledby="camp-finale-t">
          <Pallo umore={finale.soglia != null && finale.fatti >= finale.soglia ? 'esulta' : 'pensa'} size={64} className="camp-finale-pallo" />
          <div className="camp-finale-text">
            <h2 id="camp-finale-t" className="camp-finale-eyebrow">Verso la Finale · {finale.dove}</h2>
            <p className="camp-finale-main">{finale.testo}.</p>
            {finale.soglia != null ? (
              <>
                <div className="camp-finale-bar" role="img" aria-label={`${Math.min(finale.fatti, finale.soglia)} su ${finale.soglia}`}>
                  {Array.from({ length: finale.soglia }, (_, k) => (
                    <span key={k} data-on={k < finale.fatti ? '' : undefined} />
                  ))}
                </div>
                <p className="camp-finale-sub">
                  {finale.fatti >= finale.soglia
                    ? `Ne servivano ${finale.soglia}: per i tornei ci sei.`
                    : `Ne servono ${finale.soglia} per giocarla.`}
                </p>
              </>
            ) : (
              <p className="camp-finale-sub">Il regolamento di questa stagione non dice ancora quanti tornei servono per giocarla.</p>
            )}
          </div>
        </section>
      )}

      <section className="camp-sez rise" style={rise(i++)} aria-labelledby="camp-tappe-t">
        <h2 id="camp-tappe-t" className="camp-sez-title">Tappe</h2>
        {vista.tappe.length ? (
          <ul className="camp-rows">
            {vista.tappe.map((r) => (
              <RigaTappa key={r.id} r={r} traccia={traccia === r.id} />
            ))}
          </ul>
        ) : (
          <div className="camp-vuoto">
            <p>Nessuna tappa in questa stagione.</p>
            <Button variant="glass" size="sm" onClick={onNuovaTappa}>Registra una tappa</Button>
          </div>
        )}
      </section>

      {vista.compagni.length > 0 && (
        <section className="camp-sez rise" style={rise(i++)} aria-labelledby="camp-con-t">
          <h2 id="camp-con-t" className="camp-sez-title">Con chi</h2>
          <ul className="camp-rows">
            {vista.compagni.map((c) => (
              <li key={c.id} className="camp-row" data-static="">
                <span className="camp-avatar" aria-hidden="true">{c.nome.charAt(0).toUpperCase()}</span>
                <span className="camp-row-text">
                  <span className="camp-row-name">{nomeVisibile(c.nome)}</span>
                  <span className="camp-row-meta">
                    {[tappe(c.tappe), c.record !== '0–0' && c.record, c.punti > 0 && `${c.punti} punti`].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="camp-nota rise" style={rise(i++)}>
        <Icon name="info" size={16} />
        <span>Le tappe hanno i loro numeri: non entrano in Statistiche, Beach Wrapped e nei numeri dei compagni.</span>
      </p>
    </Page>
  )
}

function RigaTappa({ r, traccia }: { r: CampionatoRiga; traccia: boolean }) {
  const meta = useId()
  return (
    <li className="camp-row">
      {traccia && <span className="traccia" aria-hidden="true" />}
      <Medal placement={r.medaglia} size="md" />
      <span className="camp-row-text">
        <Link to={{ name: 'tappa', id: r.id }} className="camp-row-link camp-row-name" aria-describedby={meta}>
          {nomeVisibile(r.nome)}
        </Link>
        <span id={meta} className="camp-row-meta">{r.meta}</span>
      </span>
      {r.punti != null && (
        <span className="camp-row-punti">
          <span className="camp-row-n">+{r.punti}</span>
          <span className="camp-row-l">punti</span>
        </span>
      )}
      <Icon name="chevron-right" size={16} className="camp-row-chev" />
    </li>
  )
}
