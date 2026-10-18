// ============================================================================
// Dettaglio torneo `/tornei/:id` (UX §5 F5, §6.4).
//
// - NavBar con ‹ Indietro e «⋯» (Modifica · Storia Instagram · Elimina torneo;
//   sul condiviso solo la Storia): il menu lo costruisce la shell.
// - [＋ Aggiungi partita] è l'azione principale della schermata (Q8), pieno, e
//   c'è solo sui tornei propri.
// - Le 6 statistiche sono un tabellone (MOTION.md §10): salgono da zero una
//   volta per sessione; quando segni una partita scattano solo le celle
//   cambiate, dopo SVELTO (quando lo sheet ha liberato la vista).
// - `t === null` è "non trovato" (eliminato o non più condiviso): mai la lista
//   al suo posto (C9).
// ============================================================================
import type { CSSProperties } from 'react'
import { Suspense } from 'react'
import type { TorneoDetailProps } from '../app/contracts'
import { LazyBoundary, lazyRetry } from '../app/LazyBoundary'
import { SVELTO } from '../components/Motion'
import {
  Badge,
  Bone,
  Button,
  ButtonLink,
  EmptyState,
  Icon,
  IconButton,
  List,
  MatchRow,
  NavBar,
  Page,
  PlacementBadge,
  Section,
  Skeleton,
  StatGrid,
  StatTile,
} from '../components/ui/index'
import './TorneoDetail.css'

// Leaflet e il suo CSS: chunk a parte, scaricato solo dai tornei che hanno
// davvero delle coordinate. «Riprova» se il chunk non arriva.
const VenueMap = lazyRetry(() => import('../components/VenueMap'))

/** Il «Punto segnato» parte quando lo sheet è uscito (MOTION.md §10.2). */
const RITARDO_TABELLONE = SVELTO.duration * 1000

export default function TorneoDetail(props: TorneoDetailProps) {
  const { t, back, traccia, onAddPartita, onOpenMatch, onAddFoto, onOpenFoto, onDeleteFoto, onMenu } = props

  if (!t) {
    return (
      <Page className="torneo-page">
        <NavBar title="Torneo non trovato" back={back} />
        <div className="torneo-missing">
          <p className="torneo-missing-text">Potrebbe essere stato eliminato, o non è più condiviso con te.</p>
          <ButtonLink to={{ name: 'tornei', vista: 'lista' }} variant="tinted">Vai ai tornei</ButtonLink>
        </div>
      </Page>
    )
  }

  const proprio = !t.shared
  // L'indice del lightbox conta solo le foto che si possono aprire.
  const apribili = t.photos.filter((p) => p.url)
  const delay = traccia ? RITARDO_TABELLONE : 0

  return (
    // La NavBar è sticky: deve essere figlia diretta della pagina, quindi la
    // traccia dell'intestazione modificata passa da una classe della pagina.
    <Page className={traccia === t.id ? 'torneo-page torneo-traccia' : 'torneo-page'}>
        <NavBar
          title={t.name}
          back={back}
          subtitle={t.meta}
          eyebrow={
            <>
              <span className="torneo-eyebrow">
                <span className="torneo-dot" aria-hidden="true" style={{ background: t.dot }} />
                {t.category}
              </span>
              <PlacementBadge label={t.badge} libBg={t.badgeBg} />
              {t.shared && <Badge tone="neutral">Condiviso con te · sola lettura</Badge>}
            </>
          }
          actions={
            <IconButton
              icon="ellipsis"
              label="Altre azioni"
              aria-haspopup="menu"
              onClick={(e) => onMenu(e.currentTarget)}
            />
          }
        />

        {t.venueHistory && (
          <p className="torneo-venue">
            <Icon name="pin" size={16} />
            <span>{t.venueHistory}</span>
          </p>
        )}

        {proprio && (
          <div className="torneo-cta">
            <Button variant="filled" icon="plus" onClick={onAddPartita}>Aggiungi partita</Button>
          </div>
        )}

        {t.noMatches ? (
          <EmptyState
            className="torneo-empty"
            icon="ball"
            title="Nessuna partita ancora."
            text={proprio ? 'Segna il primo risultato: le statistiche del torneo partono da lì.' : 'Chi ha creato il torneo non ha ancora aggiunto partite.'}
            action={proprio ? <Button variant="tinted" icon="plus" onClick={onAddPartita}>Aggiungi partita</Button> : undefined}
          />
        ) : (
          <StatGrid cols={6} className="torneo-stats" label="Statistiche del torneo">
            <StatTile value={t.record} label="Record" tone="win" rise={`torneo:${t.id}`} delay={delay} />
            <StatTile value={`${t.winPct}%`} label="Vittorie" rise={`torneo:${t.id}`} delay={delay} />
            <StatTile value={t.played} label="Partite" rise={`torneo:${t.id}`} delay={delay} />
            <StatTile value={t.setStr} label="Set" rise={`torneo:${t.id}`} delay={delay} />
            <StatTile value={`${t.setPct}%`} label="Set vinti" rise={`torneo:${t.id}`} delay={delay} />
            <StatTile value={t.diffStr} label="Differenziale" rise={`torneo:${t.id}`} delay={delay} />
          </StatGrid>
        )}

      {t.venueLat != null && t.venueLng != null && (
        <Section
          id="torneo-luogo"
          title={t.venueName || 'Luogo'}
          action={
            t.venueMapUrl ? (
              <a className="ui-button" data-variant="plain" data-size="sm" href={t.venueMapUrl} target="_blank" rel="noreferrer">
                <span className="ui-button-label">Apri la mappa</span>
                <Icon name="external" size={16} />
              </a>
            ) : undefined
          }
        >
          {/* Il segnaposto ha l'altezza della mappa: quando Leaflet arriva non
              si sposta niente sotto le dita. */}
          <LazyBoundary onReset={VenueMap.reset} minHeight="venue">
            <Suspense
              fallback={
                <Skeleton className="torneo-map-skel" label="Carico la mappa…">
                  <Bone className="torneo-map-bone" />
                </Skeleton>
              }
            >
              <VenueMap lat={t.venueLat} lng={t.venueLng} label={t.venueName || t.venueCity} />
            </Suspense>
          </LazyBoundary>
        </Section>
      )}

      {!t.noMatches && (
        <Section id="torneo-partite" title="Partite">
          <List className="torneo-partite" label="Partite del torneo">
            {t.matches.map((m) => (
              <MatchRow
                key={m.id}
                esitoShort={m.esitoShort}
                esitoColor={m.esitoColor}
                title={`${m.phase} · vs ${m.opponents}`}
                detail={`con ${m.partnerName}`}
                sets={m.setChips}
                note={m.hasNote ? m.note : undefined}
                onClick={proprio ? () => onOpenMatch(m.id) : undefined}
                readOnly={!proprio}
                traccia={traccia === m.id}
              />
            ))}
          </List>
        </Section>
      )}

      <Section
        id="torneo-foto"
        title="Foto"
        action={
          proprio && t.hasPhotos ? (
            <Button variant="tinted" size="sm" icon="plus" onClick={onAddFoto}>Aggiungi foto</Button>
          ) : undefined
        }
      >
        {t.hasPhotos ? (
          <ul className="torneo-foto-grid">
            {t.photos.map((ph, i) => {
              const n = apribili.findIndex((p) => p.id === ph.id)
              const nome = ph.caption ? `Foto: ${ph.caption}` : `Foto ${i + 1}`
              return (
                <li key={ph.id || i} className="torneo-foto-cell" style={{ '--c': ph.color } as CSSProperties}>
                  {traccia === ph.id && <span className="traccia" aria-hidden="true" />}
                  {ph.url ? (
                    <button type="button" className="torneo-foto" aria-label={nome} onClick={() => onOpenFoto(n)}>
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
                      aria-label={ph.caption ? `Elimina foto: ${ph.caption}` : `Elimina foto ${i + 1}`}
                      onClick={() => onDeleteFoto(ph.id)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            className="torneo-empty"
            icon="camera"
            level={3}
            title="Nessuna foto per questo torneo."
            action={proprio ? <Button variant="tinted" icon="plus" onClick={onAddFoto}>Aggiungi foto</Button> : undefined}
          />
        )}
      </Section>
    </Page>
  )
}
