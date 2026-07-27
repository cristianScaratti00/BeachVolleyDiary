// ============================================================================
// "La mappa delle conquiste": una mappa interattiva con un pin per ogni città
// in cui hai giocato, colorato dal miglior piazzamento ottenuto lì.
//
// Presentazionale: riceve un `MappaData` già completo (coordinate comprese) e
// lo dispone. Nessun calcolo di geometria qui dentro — la stessa divisione di
// `TrendCard`, che riceve `trendPts`/`trendLine` già pronti.
//
// La mappa vera vive in `ConquisteMap`, caricato in `lazy()`: Leaflet e il
// plugin cluster stanno in un chunk a parte, che scarica solo chi apre questa
// vista. Qui resta tutto ciò che funziona SENZA quel chunk — statistiche,
// legenda, filtro ed elenco città — ed è anche il motivo per cui la schermata
// resta testabile: jsdom non fa layout, quindi la mappa non si disegna nei
// test, ma l'elenco sotto sì, e porta gli stessi fatti in testo.
// ============================================================================
import { lazy, Suspense, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import type { MappaData, MappaPin, MappaCitta, MappaTier, MappaTorneoRow } from '../lib/derive.mappa'
import { SectionTitle, FilterChips, Badge, StatGrid, StatTile, EmptyCard, InlineLink, INK, MUTED, LINE } from '../components/ui'
import { ENTRATA } from '../components/Motion'

const ConquisteMap = lazy(() => import('../components/ConquisteMap'))

// Contorno navy dei glifi di legenda: gli stessi colori con cui `ConquisteMap`
// disegna i pin, così la legenda insegna davvero a leggere la mappa.
const CONTORNO = INK
// Altezza del riquadro mappa. Fissa e non in `aspect-ratio`: il segnaposto del
// caricamento deve occupare esattamente lo spazio della mappa, o al suo arrivo
// la pagina sobbalza sotto le dita.
const MAPPA_H = 380

const TUTTE = 'tutte'

interface MappaProps {
  m: MappaData
  onOpenTorneo: (id: string) => void
  onNewTorneo: () => void
}

export default function Mappa({ m, onOpenTorneo, onNewTorneo }: MappaProps) {
  // Città selezionata: la stessa per il pin e per la riga di lista. Un solo
  // stato, due superfici — cliccare l'uno evidenzia l'altra.
  const [sel, setSel] = useState<string | null>(null)
  const [tier, setTier] = useState<string>(TUTTE)
  const righe = useRef<Record<string, HTMLButtonElement | null>>({})

  if (!m.citta && !m.sconosciute.length && !m.fuoriItalia.length && !m.senzaCitta) {
    return (
      <div style={{ marginTop: 22 }}>
        <EmptyCard>
          {/* Con dei tornei ancora da giocare la mappa è vuota per un motivo
              preciso, e dirlo è diverso dal chiedere di aggiungere una città che
              c'è già: qui il bucket `nonGiocati` è l'unica cosa da raccontare,
              altrimenti sparirebbe insieme al resto della pagina. */}
          {m.nonGiocati > 0 ? (
            <>
              {m.nonGiocati === 1 ? 'Il tuo unico torneo è' : 'I tuoi tornei sono'} ancora in
              corso o in programma: la mappa racconta solo quello che hai già giocato.
              Segna il piazzamento e la città comparirà qui.
            </>
          ) : (
            <>
              Nessuna città sulla mappa: aggiungi un torneo con la sua città e comincia a
              riempire il passaporto. <InlineLink onClick={onNewTorneo}>Crea un torneo →</InlineLink>
            </>
          )}
        </EmptyCard>
      </div>
    )
  }

  // Le chip ci sono solo se separano qualcosa — la regola di `deriveTorneiSections`.
  const tierPresenti = m.legenda.filter((l) => l.count > 0)
  const opzioni = tierPresenti.length > 1 ? tierPresenti : []
  const attivo = opzioni.some((o) => o.tier === tier) ? tier : TUTTE
  // La lista va dal risultato migliore al peggiore; l'SVG disegna nell'ordine
  // opposto, così i pin oro finiscono sopra ai vicini. Stesso array, due letture.
  const inLista = [...m.pins].reverse().filter((p) => attivo === TUTTE || p.tier === attivo)

  const seleziona = (key: string) => {
    const next = sel === key ? null : key
    setSel(next)
    // jsdom non implementa `scrollIntoView`: la chiamata secca lancerebbe nei
    // test. L'opzionale non è pigrizia, è la guardia.
    if (next) righe.current[next]?.scrollIntoView?.({ block: 'nearest' })
  }

  return (
    <div>
      <StatGrid min={120} mt={20}>
        <StatTile value={m.citta} label={m.citta === 1 ? 'città' : 'città'} valueSize={26} />
        <StatTile value={m.cittaVinte} label="conquistate" color="#FF6B35" valueSize={26} />
        <StatTile value={m.cittaConPodio} label="con podio" valueSize={26} />
        <StatTile value={m.tornei} label="tornei" valueSize={26} />
      </StatGrid>

      {m.migliore && (
        <div style={{ font: "600 13px 'Nunito Sans'", color: MUTED, marginTop: 12 }}>
          Il tuo posto migliore è <b style={{ color: INK }}>{m.migliore.city}</b> — {m.migliore.best}
          {m.migliore.count > 1 ? ` in ${m.migliore.count} tornei` : ''}.
        </div>
      )}

      <div className="card" style={{ padding: 16, marginTop: 18 }}>
        {/* Il segnaposto ha l'altezza esatta della mappa: quando il chunk di
            Leaflet arriva, non si sposta niente sotto le dita. */}
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              style={{ height: MAPPA_H, borderRadius: 14, background: '#F2F0EC', border: '1px solid rgba(27,42,74,.1)' }}
            />
          }
        >
          <ConquisteMap
            pins={m.pins}
            selected={sel}
            onSelect={seleziona}
            srSummary={m.srSummary}
            height={MAPPA_H}
          />
        </Suspense>

        <Legenda rows={m.legenda} />

        {m.pins.some((p) => !p.preciso) && (
          <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginTop: 10, lineHeight: 1.4 }}>
            Alcuni pin cadono sul centro della città: sono i tornei senza un luogo
            geolocalizzato. Aggiungi le coordinate al luogo e il pin si sposta sul
            campo dove hai giocato davvero.
          </div>
        )}
      </div>

      {opzioni.length > 0 && (
        <FilterChips
          label="Filtra le città per risultato"
          value={attivo}
          onChange={setTier}
          options={[
            { value: TUTTE, label: 'Tutte' },
            ...opzioni.map((o) => ({ value: o.tier, label: `${o.label} · ${o.count}` })),
          ]}
        />
      )}

      <SectionTitle size={17}>
        {inLista.length === 1 ? '1 città' : `${inLista.length} città`}
      </SectionTitle>

      {inLista.length === 0 ? (
        <EmptyCard>Nessuna città con questo risultato.</EmptyCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inLista.map((p) => (
            <CittaRow
              key={p.key}
              p={p}
              open={sel === p.key}
              onToggle={() => seleziona(p.key)}
              onOpenTorneo={onOpenTorneo}
              rowRef={(el) => {
                righe.current[p.key] = el
              }}
            />
          ))}
        </div>
      )}

      {m.fuoriItalia.length > 0 && (
        <FuoriMappa
          title="Fuori dall'Italia"
          nota="Il riquadro resta l'Italia: una trasferta all'estero non deve rimpicciolire il resto della mappa."
          citta={m.fuoriItalia}
          onOpenTorneo={onOpenTorneo}
        />
      )}

      {m.sconosciute.length > 0 && (
        <FuoriMappa
          title="Non ancora sulla mappa"
          nota="Queste città non sono nell'elenco di località conosciute. Un refuso? Correggilo dal torneo. Altrimenti verrà aggiunta."
          citta={m.sconosciute}
          onOpenTorneo={onOpenTorneo}
        />
      )}

      {(m.senzaCitta > 0 || m.nonGiocati > 0) && (
        <div style={{ font: "600 12.5px 'Nunito Sans'", color: MUTED, marginTop: 20, lineHeight: 1.5 }}>
          {m.senzaCitta > 0 && (
            <div>
              {m.senzaCitta === 1 ? '1 torneo non ha' : `${m.senzaCitta} tornei non hanno`} una città:
              i tornei creati in modalità rapida partono senza. Aggiungendola compaiono qui.
            </div>
          )}
          {m.nonGiocati > 0 && (
            <div style={{ marginTop: 4 }}>
              {m.nonGiocati === 1 ? '1 torneo è' : `${m.nonGiocati} tornei sono`} ancora in corso o in
              programma: la mappa racconta solo quello che hai già giocato.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- legenda
// In DOM reale, mai solo dentro l'SVG: è il testo a dire cosa vuol dire ogni
// forma. Le tre righe ci sono sempre, anche a zero — il vocabolario della mappa
// si impara prima di avere una vittoria, non dopo.
function Legenda({ rows }: { rows: MappaData['legenda'] }) {
  return (
    <ul
      style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px 18px', listStyle: 'none',
        margin: '14px 0 0', padding: '12px 0 0', borderTop: `1px solid ${LINE}`,
      }}
    >
      {rows.map((r) => (
        <li key={r.tier} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: "700 12px 'Nunito Sans'", color: MUTED }}>
          <GlifoTier tier={r.tier} />
          <span style={{ color: INK }}>{r.label}</span>
          <span>· {r.count}</span>
        </li>
      ))}
    </ul>
  )
}

// Lo stesso disegno del pin, in miniatura: forma e contorno identici, così la
// legenda insegna davvero a leggere la mappa.
function GlifoTier({ tier }: { tier: MappaTier }) {
  const fill = tier === 'vinto' ? '#FF6B35' : tier === 'podio' ? '#F7A883' : '#fff'
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <circle cx={8} cy={8} r={6} fill={fill} stroke={CONTORNO} strokeWidth={1.4} />
      {tier === 'vinto' && <circle cx={8} cy={8} r={2} fill="#fff" />}
    </svg>
  )
}

// ---------------------------------------------------------------- riga città
// Un `button` vero, non una card con `role="button"`: qui il pattern nativo
// basta e porta gratis Invio/Spazio e lo stato annunciato da `aria-expanded`.
function CittaRow({ p, open, onToggle, onOpenTorneo, rowRef }: {
  p: MappaPin
  open: boolean
  onToggle: () => void
  onOpenTorneo: (id: string) => void
  rowRef: (el: HTMLButtonElement | null) => void
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        ref={rowRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '15px 18px', display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
        }}
      >
        <GlifoTier tier={p.tier} />
        <span style={{ flex: 1, minWidth: 150 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.2px' }}>{p.city}</span>
            {p.shared && <Badge tone="dark" size="sm">Condiviso</Badge>}
          </span>
          <span style={{ display: 'block', font: "600 12px 'Nunito Sans'", color: MUTED, marginTop: 2 }}>
            {p.label}
          </span>
        </span>
        {/* Il risultato in chiaro, accanto al pallino: il colore non è mai
            l'unico canale (WCAG 1.4.1). */}
        <span style={{ flex: 'none', font: "700 12px 'Nunito Sans'", padding: '5px 11px', borderRadius: 8, background: p.tier === 'giocato' ? '#F2F0EC' : '#FFF1EA', color: p.tier === 'giocato' ? 'rgba(27,42,74,.5)' : '#C4501E' }}>
          {p.best}
        </span>
      </button>

      {/* L'elenco scorre fuori invece di apparire di scatto: `height: auto` è
          animabile da Motion (misura il contenuto), non dal CSS. `overflow:
          hidden` serve a tagliare i tornei mentre l'altezza cresce, altrimenti
          traboccherebbero sulla riga successiva per tutta l'animazione. */}
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="tornei"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ENTRATA}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 16px', borderTop: `1px solid ${LINE}` }}>
              <div style={{ font: "700 11px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', letterSpacing: '1px', textTransform: 'uppercase', margin: '13px 0 9px' }}>
                {p.count === 1 ? '1 torneo qui' : `${p.count} tornei qui`}
                {p.played > 0 && ` · ${p.record} · ${p.winPct}% vittorie`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.tornei.map((t) => (
                  <TorneoRow key={t.id} t={t} onOpen={() => onOpenTorneo(t.id)} />
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TorneoRow({ t, onOpen }: { t: MappaTorneoRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Apri il torneo ${t.name}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: '#FAF8F5', border: `1px solid ${LINE}`, borderRadius: 10,
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}
    >
      <span style={{ flex: 1, minWidth: 130 }}>
        <span style={{ display: 'block', font: "700 13px 'Nunito Sans'", color: INK }}>{t.name}</span>
        <span style={{ display: 'block', font: "600 11.5px 'Nunito Sans'", color: MUTED, marginTop: 1 }}>{t.dateLabel}</span>
      </span>
      {t.shared && <Badge tone="dark" size="sm">Condiviso</Badge>}
      <span style={{ flex: 'none', font: "700 11.5px 'Nunito Sans'", padding: '4px 9px', borderRadius: 7, background: t.badgeBg, color: t.badgeColor }}>
        {t.badge}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------- fuori mappa
// Le città che non diventano un pin non spariscono: mostrarle è ciò che rende
// scopribile un buco del gazetteer o un refuso, invece di lasciarlo invisibile.
function FuoriMappa({ title, nota, citta, onOpenTorneo }: {
  title: string
  nota: string
  citta: MappaCitta[]
  onOpenTorneo: (id: string) => void
}) {
  return (
    <>
      <SectionTitle size={16}>{title}</SectionTitle>
      <div style={{ font: "600 12px 'Nunito Sans'", color: MUTED, marginTop: -6, marginBottom: 10, lineHeight: 1.45 }}>{nota}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {citta.map((c) => (
          <div key={c.key} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 500 }}>{c.city}</span>
              <span style={{ font: "600 12px 'Nunito Sans'", color: MUTED }}>
                {c.count === 1 ? '1 torneo' : `${c.count} tornei`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
              {c.tornei.map((t) => (
                <TorneoRow key={t.id} t={t} onOpen={() => onOpenTorneo(t.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
