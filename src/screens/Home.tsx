// ============================================================================
// Home `/` (UX §6.1): dice cosa serve ADESSO, non è più una dashboard di otto
// grafici. L'ordine è il contenuto prima del contorno:
//   1. NavBar «Ciao, {nome}» con la data di oggi e il marchio piccolo (Q22)
//   2. banner alpha (compatto, si chiude)
//   3. *Adesso*: oggi giochi o il prossimo torneo · l'ultimo risultato o
//      «Com'è andata a «X»?» · chi c'è oggi — ogni card solo se ha qualcosa
//      da dire, al massimo tre
//   4. Beach Wrapped, quando è stagione
//   5. *Numeri chiave* con l'etichetta della stagione (portano a Statistiche)
//   6. *Approfondisci*: Statistiche, Beach Wrapped
// Primo avvio: lo «0» da tabellone, il CTA e il link all'assistente. Tornei
// senza partite: al posto dei numeri una nota con «Aggiungi partita» (una fila
// di zeri non è un'informazione, UX F1).
// ============================================================================
import { useId } from 'react'
import type { CSSProperties } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import type { HomeProps } from '../app/contracts'
import { Link } from '../app/router'
import { dataRelativa, oggiEsteso } from '../app/selectors'
import type { AdessoData, AdessoTorneo } from '../app/selectors'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardAbove,
  CardLink,
  EmptyState,
  Icon,
  ListGroup,
  ListRow,
  NavBar,
  Page,
  PlacementBadge,
  Section,
  nomeVisibile,
  placementText,
} from '../components/ui/index'
import { BrandMark } from '../components/Logo'
import BannerAlpha from '../components/BannerAlpha'
import { KeyNumbers } from '../components/dashboard'
import { PALETTES } from '../components/wrapped/palette'
import { MOLLA, SVELTO } from '../components/Motion'
import './Home.css'

/** «oggi», «tra 3 giorni»… e per gli screen reader la data intera. */
function Quando({ iso, today }: { iso: string; today: string }) {
  const rel = dataRelativa(iso, today)
  return (
    <>
      <span aria-hidden="true">{rel}</span>
      <span className="sr-only">{oggiEsteso(iso)}</span>
    </>
  )
}

function Meta({ id, t, today }: { id: string; t: AdessoTorneo; today: string }) {
  return (
    <p id={id} className="home-meta">
      <Quando iso={t.date} today={today} />
      {t.place && <> · {t.place}</>}
    </p>
  )
}

/** Il piazzamento come badge: «1°» con il trofeo, il podio in accento. */
function Piazzamento({ label, podio }: { label: string; podio: boolean }) {
  if (placementText(label) !== label) return <PlacementBadge label={label} />
  return <Badge tone={podio ? 'accent' : 'neutral'}>{label}</Badge>
}

function Adesso({ adesso, today, checkIn, onAggiungiPartita, onAggiornaPiazzamento, onStoria }: {
  adesso: AdessoData
  today: string
  checkIn: HomeProps['checkIn']
  onAggiungiPartita: (id: string) => void
  onAggiornaPiazzamento: (id: string) => void
  onStoria: (id: string) => void
}) {
  const id = useId()
  const { oggi, prossimo, ultimo, daChiudere } = adesso
  const vuota = !oggi && !prossimo && !ultimo && !daChiudere && !checkIn
  if (vuota) return null
  return (
    <Section title="Adesso" id={`${id}-h`}>
      <ul className="home-adesso">
        {oggi && (
          <li>
            <Card>
              <p className="home-eyebrow">Oggi giochi</p>
              <CardLink to={{ name: 'torneo', id: oggi.id }} describedBy={`${id}-oggi`}>{oggi.name}</CardLink>
              <Meta id={`${id}-oggi`} t={oggi} today={today} />
              <CardAbove className="home-actions">
                <Button icon="plus" onClick={() => onAggiungiPartita(oggi.id)}>
                  Aggiungi partita
                </Button>
              </CardAbove>
            </Card>
          </li>
        )}
        {!oggi && prossimo && (
          <li>
            <Card>
              <p className="home-eyebrow">Prossimo torneo</p>
              <CardLink to={{ name: 'torneo', id: prossimo.id }} describedBy={`${id}-pross`}>{prossimo.name}</CardLink>
              <Meta id={`${id}-pross`} t={prossimo} today={today} />
              {prossimo.shared && (
                <div className="home-badges">
                  <Badge tone="select">Condiviso</Badge>
                </div>
              )}
            </Card>
          </li>
        )}
        {daChiudere ? (
          <li>
            <Card>
              <p className="home-eyebrow">Da completare</p>
              <h3 className="ui-card-title">
                Com'è andata a «
                <Link to={{ name: 'torneo', id: daChiudere.id }} className="ui-card-link" aria-describedby={`${id}-chiudi`}>
                  {nomeVisibile(daChiudere.name)}
                </Link>
                »?
              </h3>
              <Meta id={`${id}-chiudi`} t={daChiudere} today={today} />
              <CardAbove className="home-actions">
                <Button variant="tinted" onClick={() => onAggiornaPiazzamento(daChiudere.id)}>
                  Aggiorna il piazzamento
                </Button>
              </CardAbove>
            </Card>
          </li>
        ) : (
          ultimo && (
            <li>
              <Card>
                <p className="home-eyebrow">Ultimo risultato</p>
                <CardLink to={{ name: 'torneo', id: ultimo.id }} describedBy={`${id}-ult`}>{ultimo.name}</CardLink>
                <Meta id={`${id}-ult`} t={ultimo} today={today} />
                <div className="home-badges">
                  <Piazzamento label={ultimo.placement} podio={ultimo.podio} />
                  {ultimo.shared && <Badge tone="select">Condiviso</Badge>}
                </div>
                <CardAbove className="home-actions">
                  <Button variant="tinted" size="sm" icon="share" onClick={() => onStoria(ultimo.id)}>
                    Storia Instagram
                  </Button>
                </CardAbove>
              </Card>
            </li>
          )
        )}
        {checkIn && (
          <li>
            <CheckInCard own={checkIn.own} metaId={`${id}-oggi-ci`} />
          </li>
        )}
      </ul>
    </Section>
  )
}

/** «Sei in spiaggia oggi?» / «Sei a {città} oggi»: solo il proprio stato, nessuna richiesta in più. */
function CheckInCard({ own, metaId }: { own: { city: string } | null; metaId: string }) {
  if (own) {
    return (
      <Card>
        <p className="home-eyebrow">Chi c'è oggi</p>
        <CardLink to={{ name: 'oggi' }} describedBy={metaId}>Sei a {own.city} oggi</CardLink>
        <p id={metaId} className="home-meta">Guarda chi c'è in spiaggia</p>
      </Card>
    )
  }
  return (
    <Card>
      <p className="home-eyebrow">Chi c'è oggi</p>
      <h3 className="ui-card-title">Sei in spiaggia oggi?</h3>
      <p className="home-meta">Fai check-in per vedere chi gioca dove sei tu.</p>
      <div className="home-actions">
        <ButtonLink to={{ name: 'oggi' }} variant="tinted" icon="pin">
          Fai check-in
        </ButtonLink>
      </div>
    </Card>
  )
}

/** La card di Beach Wrapped: navy piatto, l'anteprima del PNG (ART_DIRECTION §8). */
function WrappedCard({ titolo, winPct }: { titolo: string; winPct: number | null }) {
  const p = PALETTES.navy
  const vars = { '--png-bg': p.bg, '--png-fg': p.fg, '--png-muted': p.muted, '--png-accent': p.accent, '--png-disc': p.disc } as CSSProperties
  return (
    <Card tone="navy" className="home-wrapped" style={vars}>
      <span className="home-wrapped-disc" aria-hidden="true" />
      <p className="home-wrapped-eyebrow">La tua stagione</p>
      <CardLink to={{ name: 'wrapped' }} level={2} className="home-wrapped-title">
        {titolo}
      </CardLink>
      <p className="home-wrapped-text">Rivivi la stagione in card da sfogliare e condividere.</p>
      {winPct != null && (
        <p className="home-wrapped-n">
          {winPct}%<span className="home-wrapped-n-l"> delle partite vinte</span>
        </p>
      )}
    </Card>
  )
}

export default function Home({
  nome,
  today,
  adesso,
  numeri,
  hasTornei,
  stagione,
  wrapped,
  banner,
  checkIn,
  onNuovoTorneo,
  onAggiungiPartita,
  onAggiornaPiazzamento,
  onStoria,
}: HomeProps) {
  const id = useId()

  // Chiudendo il banner il suo × sparisce: il focus va all'h1 (UX §8.3.3).
  const chiudiBanner = () => {
    banner.onChiudi()
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.ui-largetitle-h1')?.focus({ preventScroll: true }))
  }

  // Dove va la prima partita: il torneo di oggi, quello da chiudere, l'ultimo
  // proprio (le stesse priorità di UX §5 F3).
  const destinazione = adesso.oggi ?? adesso.daChiudere ?? (adesso.ultimo && !adesso.ultimo.shared ? adesso.ultimo : null)

  return (
    <Page>
      <NavBar
        title={nome ? `Ciao, ${nome}` : 'Ciao'}
        subtitle={oggiEsteso(today)}
        leading={<span className="home-brand"><BrandMark size={28} /></span>}
      />

      {/* Il banner esce fuori dal flusso a t0; quello che sta sotto sale con
          la molla (MOTION.md §4.3), un contenitore solo. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {banner.visibile && (
          <m.div key="banner" exit={{ opacity: 0, transition: SVELTO }}>
            <BannerAlpha onChiudi={chiudiBanner} />
          </m.div>
        )}
      </AnimatePresence>

      <m.div layout="position" layoutDependency={banner.visibile} transition={{ layout: MOLLA }}>
        {!hasTornei ? (
          <>
            <EmptyState
              variant="primo"
              zero="Tornei"
              title="Il tuo diario è vuoto"
              text="Registra il primo torneo: bastano il nome e la data, il resto lo aggiungi dopo."
              action={<Button onClick={onNuovoTorneo}>Crea il primo torneo</Button>}
              secondary={
                <>
                  Preferisci farti guidare?{' '}
                  <Link to={{ name: 'crea' }} className="home-link">Usa l'assistente</Link>
                </>
              }
            />
            {checkIn && (
              <div className="home-solo">
                <CheckInCard own={checkIn.own} metaId={`${id}-ci`} />
              </div>
            )}
          </>
        ) : (
          <>
            <Adesso
              adesso={adesso}
              today={today}
              checkIn={checkIn}
              onAggiungiPartita={onAggiungiPartita}
              onAggiornaPiazzamento={onAggiornaPiazzamento}
              onStoria={onStoria}
            />

            {wrapped.visibile && (
              <section className="home-section" aria-label="Beach Wrapped">
                <WrappedCard titolo={wrapped.titolo} winPct={numeri ? numeri.winPct : null} />
              </section>
            )}

            {numeri ? (
              <>
                <Section title="Numeri chiave" count={<Badge>{stagione}</Badge>} id={`${id}-num`}>
                  <Card as="div" className="home-numeri">
                    <KeyNumbers s={numeri} rise="home" />
                    <p className="home-numeri-foot">
                      <Link to={{ name: 'statistiche' }} className="ui-card-link">
                        Tutte le statistiche
                      </Link>
                      <Icon name="chevron-right" size={20} />
                    </p>
                  </Card>
                </Section>

                <div className="home-section">
                  <ListGroup title="Approfondisci" id={`${id}-appr`}>
                    <ListRow to={{ name: 'statistiche' }} icon="chart" title="Tutte le statistiche" subtitle={stagione} />
                    {wrapped.visibile && <ListRow to={{ name: 'wrapped' }} icon="sun" title="Beach Wrapped" subtitle="Il recap della stagione" />}
                  </ListGroup>
                </div>
              </>
            ) : (
              <Section title="Numeri chiave" id={`${id}-num`}>
                <Card as="div" className="home-nonumeri">
                  <p className="home-nonumeri-text">Aggiungi la prima partita per vedere i tuoi numeri.</p>
                  {destinazione && (
                    <Button variant="tinted" icon="plus" onClick={() => onAggiungiPartita(destinazione.id)}>
                      Aggiungi partita
                    </Button>
                  )}
                </Card>
              </Section>
            )}
          </>
        )}
      </m.div>
    </Page>
  )
}
