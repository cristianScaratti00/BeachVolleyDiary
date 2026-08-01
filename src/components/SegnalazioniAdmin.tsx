// ============================================================================
// Bacheca delle segnalazioni — visibile solo agli admin, dentro il Profilo.
//
// Il cancello vero è nel DB: `bug_reports_list` è gated su `is_admin()` e a
// chiunque altro restituisce zero righe. Il `session.role === 'admin'` che
// decide se montare questo componente è solo la parte di UI: non nasconde dati
// che un non-admin potrebbe comunque leggere.
//
// Componente autonomo (fa da sé la sua rete, come l'upload avatar in Profilo):
// non c'è motivo di far scendere queste righe da App, che non le usa.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  STATI,
  aggiornaStato,
  coloreStato,
  elencoSegnalazioni,
  etichettaArea,
  etichettaStato,
} from '../lib/segnalazioni'
import type { Segnalazione, StatoSegnalazione } from '../lib/segnalazioni'
import { MONTHS_SHORT } from '../lib/theme'
import { EmptyCard, FilterChips, MUTED, INK } from './ui'

const TUTTE = 'tutte'

const metaStyle: CSSProperties = { font: "600 12px 'Nunito Sans'", color: MUTED, marginTop: 4 }

// "1 Ago · 10:30" nell'ora locale di chi guarda. Riusa i mesi del design system
// invece di introdurre un secondo vocabolario di date.
function quando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${ora}`
}

export default function SegnalazioniAdmin() {
  const [righe, setRighe] = useState<Segnalazione[] | null>(null)
  const [errore, setErrore] = useState(false)
  const [filtro, setFiltro] = useState<string>(TUTTE)

  const carica = useCallback(async () => {
    setErrore(false)
    const r = await elencoSegnalazioni()
    if (r === null) {
      setErrore(true)
      setRighe([])
      return
    }
    setRighe(r)
  }, [])

  useEffect(() => {
    void carica()
  }, [carica])

  // Cambio stato ottimistico: la riga si sposta subito nel filtro giusto e, se
  // la scrittura fallisce, si rilegge tutto invece di lasciare a schermo uno
  // stato che il DB non ha.
  const cambiaStato = async (id: string, stato: StatoSegnalazione) => {
    setRighe((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, stato } : s)) : prev))
    const ok = await aggiornaStato(id, stato)
    if (!ok) void carica()
  }

  const conteggi = righe ?? []
  const opzioni = [
    { value: TUTTE, label: `Tutte (${conteggi.length})` },
    ...STATI.map((s) => ({
      value: s.value,
      label: `${s.label} (${conteggi.filter((r) => r.stato === s.value).length})`,
    })),
  ]
  const visibili = filtro === TUTTE ? conteggi : conteggi.filter((r) => r.stato === filtro)

  return (
    <>
      <div className="lbl" style={{ marginTop: 26, marginBottom: 12 }}>
        Segnalazioni ricevute
      </div>

      {righe === null ? (
        <EmptyCard>Carico le segnalazioni…</EmptyCard>
      ) : errore ? (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: "600 13px 'Nunito Sans'", color: MUTED, lineHeight: 1.5 }}>
            Non è stato possibile leggere le segnalazioni.
          </div>
          <button
            type="button"
            className="chip"
            onClick={() => void carica()}
            style={{
              marginTop: 16, padding: '11px 18px', borderRadius: 11,
              border: '1px solid rgba(27,42,74,.2)', background: 'transparent',
              color: INK, font: "700 13.5px 'Nunito Sans'", cursor: 'pointer',
            }}
          >
            Riprova
          </button>
        </div>
      ) : conteggi.length === 0 ? (
        <EmptyCard>Nessuna segnalazione, per ora. Buon segno.</EmptyCard>
      ) : (
        <>
          <FilterChips
            options={opzioni}
            value={filtro}
            onChange={setFiltro}
            label="Filtra segnalazioni per stato"
            mt={0}
          />

          {visibili.length === 0 ? (
            <div style={{ marginTop: 14 }}>
              <EmptyCard>Nessuna segnalazione in questo stato.</EmptyCard>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {visibili.map((s) => (
                <RigaSegnalazione key={s.id} s={s} onCambiaStato={cambiaStato} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function RigaSegnalazione({
  s,
  onCambiaStato,
}: {
  s: Segnalazione
  onCambiaStato: (id: string, stato: StatoSegnalazione) => void
}) {
  const colore = coloreStato(s.stato)
  return (
    <article className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ font: "700 14.5px 'Nunito Sans'", margin: 0, lineHeight: 1.35 }}>{s.titolo}</h3>
          <div style={metaStyle}>
            {etichettaArea(s.area)} · {quando(s.quando)} · {s.autore}
            {s.email ? ` · ${s.email}` : ''}
          </div>
        </div>
        <span
          style={{
            flex: 'none', letterSpacing: '.4px', textTransform: 'uppercase',
            font: "800 8.5px 'Nunito Sans'", padding: '3px 8px', borderRadius: 5,
            background: colore, color: '#fff',
          }}
        >
          {etichettaStato(s.stato)}
        </span>
      </div>

      <p
        style={{
          font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.72)', lineHeight: 1.5,
          margin: '12px 0 0', whiteSpace: 'pre-wrap',
        }}
      >
        {s.descrizione}
      </p>

      {s.browser && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ font: "700 12px 'Nunito Sans'", color: MUTED, cursor: 'pointer' }}>
            Dettagli tecnici
          </summary>
          <div style={{ font: "600 11.5px 'Nunito Sans'", color: MUTED, marginTop: 6, wordBreak: 'break-word' }}>
            {s.browser}
          </div>
        </details>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <label htmlFor={`stato-${s.id}`} style={{ font: "700 12px 'Nunito Sans'", color: MUTED }}>
          Stato
        </label>
        <select
          id={`stato-${s.id}`}
          value={s.stato}
          onChange={(e) => onCambiaStato(s.id, e.target.value as StatoSegnalazione)}
          style={{
            border: '1px solid rgba(27,42,74,.16)', background: '#fff', borderRadius: 10,
            padding: '8px 11px', font: "700 12.5px 'Nunito Sans'", color: INK, cursor: 'pointer',
          }}
        >
          {STATI.map((x) => (
            <option key={x.value} value={x.value}>{x.label}</option>
          ))}
        </select>
      </div>
    </article>
  )
}
