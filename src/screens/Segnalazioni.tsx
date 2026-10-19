// ============================================================================
// Segnalazioni ricevute (UX §5 F10, §6.8): la bacheca degli admin, rotta
// `/profilo/segnalazioni`. Prima viveva in fondo al Profilo e faceva da sé la
// sua rete; ora le funzioni arrivano come props (`carica`, `aggiorna`) e la
// schermata resta presentazionale.
//
// Il cancello vero è nel DB: `bug_reports_list` è gated su `is_admin()` e a
// chiunque altro restituisce zero righe. Il controllo del ruolo che decide se
// montarla (App) è solo interfaccia.
//
// Cambio di stato OTTIMISTICO (MOTION.md §7, §8.3): la riga cambia subito e,
// se il filtro la esclude, esce dalla lista mentre quelle sotto salgono. Se la
// scrittura fallisce torna com'era con la stessa molla, porta la traccia e si
// rilegge tutto: a schermo non resta uno stato che il DB non ha.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import { STATI, etichettaArea, etichettaStato } from '../lib/segnalazioni'
import type { Segnalazione, StatoSegnalazione } from '../lib/segnalazioni'
import { MONTHS_SHORT } from '../lib/theme'
import type { SegnalazioniProps } from '../app/contracts'
import { FLIP_MAX, MOLLA, SVELTO } from '../components/Motion'
import {
  NavBar,
  Page,
  Badge,
  Bone,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  Select,
  Skeleton,
  toast,
} from '../components/ui/index'
import type { BadgeTone } from '../components/ui/index'
import './Segnalazioni.css'

const TUTTE = 'tutte'
/** Quanto resta la traccia sulla riga smentita: SVELTO + RACCONTO, più un margine. */
const TRACCIA_MS = 1200

const TONO: Record<StatoSegnalazione, BadgeTone> = {
  nuovo: 'accent',
  in_corso: 'select',
  risolto: 'success',
  chiuso: 'neutral',
}

// "1 Ago · 10:30" nell'ora locale di chi guarda, con i mesi del design system.
function quando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${ora}`
}

export default function Segnalazioni({ back, carica, aggiorna }: SegnalazioniProps) {
  const [righe, setRighe] = useState<Segnalazione[] | null>(null)
  const [errore, setErrore] = useState(false)
  const [filtro, setFiltro] = useState<string>(TUTTE)
  const [traccia, setTraccia] = useState<string | null>(null)

  // `null` (o un'eccezione) = errore di rete; `[]` è una bacheca vuota, valida.
  // Durante un nuovo tentativo l'errore resta a schermo finché non c'è l'esito.
  const leggi = useCallback(async () => {
    let r: Segnalazione[] | null
    try {
      r = await carica()
    } catch {
      r = null
    }
    if (r === null) {
      setErrore(true)
      setRighe((prev) => prev ?? [])
      return
    }
    setErrore(false)
    setRighe(r)
  }, [carica])

  useEffect(() => {
    void leggi()
  }, [leggi])

  useEffect(() => {
    if (!traccia) return
    const t = window.setTimeout(() => setTraccia(null), TRACCIA_MS)
    return () => window.clearTimeout(t)
  }, [traccia])

  const cambiaStato = async (id: string, stato: StatoSegnalazione) => {
    const prima = righe?.find((s) => s.id === id)?.stato
    setRighe((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, stato } : s)) : prev))
    const ok = await aggiorna(id, stato)
    if (ok) return
    // Smentita: torna com'era, si vede dove (la traccia) e si rilegge.
    if (prima) setRighe((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, stato: prima } : s)) : prev))
    setTraccia(id)
    toast.error('Non è stato possibile cambiare lo stato. Riprova tra poco.')
    void leggi()
  }

  const tutte = righe ?? []
  const opzioni = [
    { value: TUTTE, label: `Tutte (${tutte.length})` },
    ...STATI.map((s) => ({ value: s.value, label: `${s.label} (${tutte.filter((r) => r.stato === s.value).length})` })),
  ]
  const visibili = filtro === TUTTE ? tutte : tutte.filter((r) => r.stato === filtro)

  return (
    <Page width="reading">
      <NavBar title="Segnalazioni" subtitle="Quello che gli utenti dell'alpha hanno segnalato." back={back} />

      <div className="segnalazioni-body">
        {righe === null ? (
          <Skeleton label="Carico le segnalazioni…" className="segnalazioni-skel">
            {[0, 1, 2].map((i) => (
              <div key={i} className="segnalazioni-skel-row">
                <Bone className="segnalazioni-skel-title" />
                <Bone className="segnalazioni-skel-meta" />
              </div>
            ))}
          </Skeleton>
        ) : errore ? (
          <ErrorState
            level={2}
            title="Non è stato possibile leggere le segnalazioni."
            text="Controlla la connessione e riprova."
            onRetry={leggi}
          />
        ) : tutte.length === 0 ? (
          <EmptyState icon="inbox" title="Nessuna segnalazione, per ora. Buon segno." />
        ) : (
          <>
            <FilterChips options={opzioni} value={filtro} onChange={setFiltro} label="Filtra segnalazioni per stato" />
            {visibili.length === 0 ? (
              <EmptyState icon="inbox" title="Nessuna segnalazione in questo stato." level={3} />
            ) : (
              <ul className="segnalazioni-list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visibili.map((s) => (
                    <m.li
                      key={s.id}
                      layout={visibili.length <= FLIP_MAX ? 'position' : false}
                      transition={{ layout: MOLLA }}
                      exit={{ opacity: 0, transition: SVELTO }}
                      className="segnalazioni-li"
                    >
                      <RigaSegnalazione s={s} traccia={traccia === s.id} onCambiaStato={cambiaStato} />
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </>
        )}
      </div>
    </Page>
  )
}

function RigaSegnalazione({ s, traccia, onCambiaStato }: {
  s: Segnalazione
  traccia: boolean
  onCambiaStato: (id: string, stato: StatoSegnalazione) => void
}) {
  return (
    <Card traccia={traccia} className="segnalazioni-card">
      <div className="segnalazioni-card-head">
        <div className="segnalazioni-card-who">
          <h3 className="segnalazioni-card-title">{s.titolo}</h3>
          <p className="segnalazioni-card-meta">
            {etichettaArea(s.area)} · {quando(s.quando)} · {s.autore}
            {s.email ? ` · ${s.email}` : ''}
          </p>
        </div>
        <Badge tone={TONO[s.stato]}>{etichettaStato(s.stato)}</Badge>
      </div>

      <p className="segnalazioni-card-text">{s.descrizione}</p>

      {s.browser && (
        <details className="segnalazioni-card-tech">
          <summary>Dettagli tecnici</summary>
          <p>{s.browser}</p>
        </details>
      )}

      <div className="segnalazioni-card-stato">
        <Select
          label="Stato"
          value={s.stato}
          onChange={(v) => onCambiaStato(s.id, v as StatoSegnalazione)}
          options={STATI.map((x) => ({ value: x.value, label: x.label }))}
        />
      </div>
    </Card>
  )
}
