// ============================================================================
// Dettaglio torneo `/tornei/:id` (UX §5 F5, §6.4; il redesign, versione D).
//
// - In cima i pulsanti di vetro liquido della NavBar: «‹» a sinistra, la
//   capsula con la Storia Instagram e la matita a destra. Il menu «⋯» non c'è
//   più: «Elimina torneo» sta nello sheet di modifica (TorneoSheet).
// - Il titolo ha la medaglia del piazzamento a sinistra, la riga piccola
//   «categoria · formato · superficie» sopra e la data lunga sotto.
// - Le 6 statistiche sono un tabellone (MOTION.md §10): salgono da zero una
//   volta per sessione; quando segni una partita scattano solo le celle
//   cambiate, dopo SVELTO (quando lo sheet ha liberato la vista).
// - La card del luogo apre e chiude la mappa (Leaflet, in lazy: si scarica
//   solo quando la si apre).
// - In fondo, al posto della TabBar che qui non c'è, la barra di vetro con
//   «Storia» e [＋ Aggiungi partita], l'azione principale (Q8). Sul torneo
//   condiviso resta solo la Storia (Q4).
// - `t === null` è "non trovato" (eliminato o non più condiviso): mai la lista
//   al suo posto (C9).
// ============================================================================
import type { CSSProperties } from 'react'
import { Suspense, useId, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import type { TorneoDetailProps, TorneoScheda } from '../app/contracts'
import type { TorneoDetailData } from '../lib/derive'
import { MONTHS_FULL } from '../lib/theme'
import { LazyBoundary, lazyRetry } from '../app/LazyBoundary'
import { ENTRATA, SVELTO } from '../components/Motion'
import { LiquidGlass } from '../components/ui/LiquidGlass'
import { Medal } from '../components/ui/Medal'
import {
  Badge,
  Bone,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  IconButton,
  List,
  MatchRow,
  NavBar,
  Page,
  Section,
  Skeleton,
  StatGrid,
  StatTile,
  placementText,
} from '../components/ui/index'
import './TorneoDetail.css'

// Leaflet e il suo CSS: chunk a parte, scaricato solo quando si apre la mappa
// di un torneo che ha davvero delle coordinate. «Riprova» se il chunk non arriva.
const VenueMap = lazyRetry(() => import('../components/VenueMap'))

/** Il «Punto segnato» parte quando lo sheet è uscito (MOTION.md §10.2). */
const RITARDO_TABELLONE = SVELTO.duration * 1000

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** «2025-06-28» → «Sabato 28 giugno 2025». Vuota se la data non si legge. */
export function dataLunga(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number)
  if (!y || !mo || !d || !MONTHS_FULL[mo - 1]) return ''
  const s = `${GIORNI[new Date(y, mo - 1, d).getDay()]} ${d} ${MONTHS_FULL[mo - 1]} ${y}`
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «3-1» → «3–1»: il trattino del tabellone, come nella Storia. */
const trattino = (s: string) => s.replace(/(\d)-(\d)/, '$1–$2')

/**
 * Le righe del titolo. La derivata fonde data, luogo, superficie e compagno
 * in `meta`; il redesign le divide: sopra «categoria · formato · superficie»,
 * sotto «data lunga · con X». Il luogo ha la sua card. Senza `scheda` resta
 * `meta` com'è.
 */
function intestazione(t: TorneoDetailData, scheda?: TorneoScheda | null) {
  if (!scheda) return { kicker: t.category, sottotitolo: t.meta }
  const con = t.meta.split(' · ').find((s) => s.startsWith('con '))
  return {
    kicker: [t.category, scheda.format, scheda.surface].filter(Boolean).join(' · '),
    sottotitolo: [dataLunga(scheda.date), con].filter(Boolean).join(' · ') || t.meta,
  }
}

/** «1° torneo qui» è la prima volta: il redesign lo dice a parole. */
const storiaDelLuogo = (label: string | null) => label?.replace(/^1° torneo qui/, 'La prima volta che giochi qui') ?? null

/** Il tabellone del piazzamento («1° · Gold» → «Tabellone Gold»). */
function tabellone(badge: string): string | null {
  const b = placementText(badge).split(' · ').slice(1).join(' · ')
  if (!b) return null
  return b === 'Girone unico' ? b : `Tabellone ${b}`
}

export default function TorneoDetail(props: TorneoDetailProps) {
  const { t, scheda, back, traccia, onAddPartita, onOpenMatch, onAddFoto, onOpenFoto, onDeleteFoto, onStoria, onModifica } = props
  const idMappa = useId()
  const [mappa, setMappa] = useState(false)

  if (!t) {
    return (
      <Page width="reading" className="torneo-page">
        <NavBar title="Torneo non trovato" back={back} backIcon />
        <div className="torneo-missing rise">
          <p className="torneo-missing-text">Potrebbe essere stato eliminato, o non è più condiviso con te.</p>
          <ButtonLink to={{ name: 'tornei', vista: 'lista' }} variant="glass">Vai ai tornei</ButtonLink>
        </div>
      </Page>
    )
  }

  const proprio = !t.shared
  // L'indice del lightbox conta solo le foto che si possono aprire.
  const apribili = t.photos.filter((p) => p.url)
  const delay = traccia ? RITARDO_TABELLONE : 0
  const { kicker, sottotitolo } = intestazione(t, scheda)
  const fascia = tabellone(t.badge)
  const conMappa = t.venueLat != null && t.venueLng != null
  const storia = storiaDelLuogo(t.venueHistory)
  const luogoSub = [t.venueCity && t.venueCity !== t.venueName ? t.venueCity : null, storia].filter(Boolean).join(' · ')

  const luogo = (
    <>
      <span className="torneo-luogo-thumb" aria-hidden="true">
        <Icon name="pin" size={24} />
      </span>
      <span className="torneo-luogo-text">
        <span className="torneo-luogo-name">{t.venueName}</span>
        {luogoSub && <span className="torneo-luogo-sub">{luogoSub}</span>}
      </span>
    </>
  )

  return (
    // La NavBar è sticky: deve essere figlia diretta della pagina, quindi la
    // traccia dell'intestazione modificata passa da una classe della pagina.
    // Per la stessa ragione la barra fissa in fondo è figlia della pagina, e
    // la `.rise` sta sui blocchi, mai sulla pagina.
    <Page width="reading" className={traccia === t.id ? 'torneo-page torneo-traccia' : 'torneo-page'}>
      <NavBar
        title={t.name}
        back={back}
        backIcon
        eyebrow={<Medal placement={t.badge} size="lg" />}
        kicker={kicker}
        subtitle={sottotitolo}
        actions={
          <>
            <IconButton icon="share-up" iconSize={20} label="Condividi come storia Instagram" onClick={onStoria} />
            {proprio && <IconButton icon="pencil" iconSize={20} label="Modifica torneo" onClick={onModifica} />}
          </>
        }
      />

      {(fascia || t.shared) && (
        <p className="torneo-tags rise">
          {fascia && <Badge>{fascia}</Badge>}
          {t.shared && <Badge>Condiviso con te · sola lettura</Badge>}
        </p>
      )}

      {!t.noMatches && (
        <StatGrid cols={6} className="torneo-stats rise" label="Statistiche del torneo">
          <StatTile value={trattino(t.record)} label="record" tone="win" rise={`torneo:${t.id}`} delay={delay} />
          <StatTile value={`${t.winPct}%`} label="vittorie" rise={`torneo:${t.id}`} delay={delay} />
          <StatTile value={t.diffStr} label="differenziale" rise={`torneo:${t.id}`} delay={delay} />
          <StatTile value={t.played} label="partite" rise={`torneo:${t.id}`} delay={delay} />
          <StatTile value={trattino(t.setStr)} label="set" rise={`torneo:${t.id}`} delay={delay} />
          <StatTile value={`${t.setPct}%`} label="set vinti" rise={`torneo:${t.id}`} delay={delay} />
        </StatGrid>
      )}

      {t.venueName && (
        <div className="torneo-luogo-wrap rise">
          {conMappa ? (
            <button
              type="button"
              className="torneo-luogo press"
              aria-expanded={mappa}
              aria-controls={mappa ? idMappa : undefined}
              onClick={() => setMappa((v) => !v)}
            >
              {luogo}
              <span className="torneo-luogo-azione">{mappa ? 'Chiudi' : 'Mappa'}</span>
            </button>
          ) : (
            <div className="torneo-luogo" data-static="">
              {luogo}
            </div>
          )}
          <AnimatePresence initial={false}>
            {conMappa && mappa && (
              <m.div
                key="mappa"
                id={idMappa}
                className="torneo-mappa"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: ENTRATA }}
                exit={{ opacity: 0, transition: SVELTO }}
              >
                {/* Il segnaposto ha l'altezza della mappa: quando Leaflet
                    arriva non si sposta niente sotto le dita. */}
                <LazyBoundary onReset={VenueMap.reset} minHeight="venue">
                  <Suspense
                    fallback={
                      <Skeleton className="torneo-map-skel" label="Carico la mappa…">
                        <Bone className="torneo-map-bone" />
                      </Skeleton>
                    }
                  >
                    <VenueMap lat={t.venueLat!} lng={t.venueLng!} label={t.venueName || t.venueCity} />
                  </Suspense>
                </LazyBoundary>
                {t.venueMapUrl && (
                  <a className="ui-button torneo-mappa-link" data-variant="plain" data-size="sm" href={t.venueMapUrl} target="_blank" rel="noreferrer">
                    <span className="ui-button-label">Apri la mappa</span>
                    <Icon name="external" size={16} />
                  </a>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Section id="torneo-partite" title="Partite" className="torneo-sez torneo-sez-partite rise">
        {t.noMatches ? (
          <Card as="div" className="torneo-vuoto">
            <EmptyState
              icon="ball"
              level={3}
              title="Nessuna partita ancora."
              text={proprio ? 'Segna il primo risultato: le statistiche del torneo partono da lì.' : 'Chi ha creato il torneo non ha ancora aggiunto partite.'}
            />
          </Card>
        ) : (
          <List className="torneo-partite" label="Partite del torneo">
            {t.matches.map((mt) => (
              <MatchRow
                key={mt.id}
                esitoShort={mt.esitoShort}
                esitoColor={mt.esitoColor}
                title={`${mt.phase} · vs ${mt.opponents}`}
                detail={`con ${mt.partnerName}`}
                sets={mt.setChips}
                note={mt.hasNote ? mt.note : undefined}
                onClick={proprio ? () => onOpenMatch(mt.id) : undefined}
                readOnly={!proprio}
                traccia={traccia === mt.id}
              />
            ))}
          </List>
        )}
      </Section>

      <Section id="torneo-foto" title="Foto" className="torneo-sez torneo-sez-foto rise">
        {(proprio || t.hasPhotos) && (
          <ul className="torneo-foto-grid">
            {proprio && (
              <li className="torneo-foto-cell">
                <Button variant="glass" icon="plus" className="torneo-foto-add" aria-label="Aggiungi foto" onClick={onAddFoto}>
                  Aggiungi
                </Button>
              </li>
            )}
            {t.photos.map((ph, n) => {
              const k = apribili.findIndex((p) => p.id === ph.id)
              const nome = ph.caption ? `Foto: ${ph.caption}` : `Foto ${n + 1}`
              return (
                <li key={ph.id || n} className="torneo-foto-cell" style={{ '--c': ph.color } as CSSProperties}>
                  {traccia === ph.id && <span className="traccia" aria-hidden="true" />}
                  {ph.url ? (
                    <button type="button" className="torneo-foto" aria-label={nome} onClick={() => onOpenFoto(k)}>
                      <img src={ph.url} alt="" loading="lazy" />
                    </button>
                  ) : (
                    <div className="torneo-foto" data-legacy="" role="img" aria-label="Foto non disponibile">
                      <Icon name="camera" size={24} />
                    </div>
                  )}
                  {proprio && (
                    <button
                      type="button"
                      className="torneo-foto-del"
                      aria-label={ph.caption ? `Elimina foto: ${ph.caption}` : `Elimina foto ${n + 1}`}
                      onClick={() => onDeleteFoto(ph.id)}
                    >
                      <span className="torneo-foto-del-dot">
                        <Icon name="trash" size={16} />
                      </span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {/* Sul proprio la tessera «Aggiungi» dice già tutto. */}
        {!proprio && !t.hasPhotos && <p className="torneo-foto-vuoto">Nessuna foto per questo torneo.</p>}
      </Section>

      {/* La barra di vetro in fondo: galleggia sopra il contenuto come la
          TabBar, che su questa rotta non c'è (routeHasTabBar). */}
      <div className="torneo-azioni" data-solo={proprio ? undefined : ''}>
        <button type="button" className="torneo-storia press" aria-label="Storia Instagram" onClick={onStoria}>
          <LiquidGlass layer />
          <Icon name="instagram" size={20} />
          <span>Storia</span>
        </button>
        {proprio && (
          <Button size="lg" icon="plus" className="torneo-aggiungi" onClick={onAddPartita}>
            Aggiungi partita
          </Button>
        )}
      </div>
    </Page>
  )
}
