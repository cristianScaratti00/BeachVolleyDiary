// ============================================================================
// "Chi c'è oggi?" — schermata presentazionale (props + callbacks, niente rete).
// Fai check-in per città+giorno e, in reciprocità (Q3), vedi chi altro è in
// spiaggia oggi e ti colleghi come compagno sul posto (Q2).
//
// Tutta la logica dati sta a monte: il proprio check-in, la stanza già ordinata
// e i callback arrivano da `useCheckIn` via App. Qui vivono solo: form di
// check-in, stato di check-in, lista stanza, filtro di presentazione e stati
// (idle/busy/done/error) dei pulsanti.
// ============================================================================
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { CheckIn, CheckInInput, PresentUser } from '../lib/models'
import {
  PageHeader,
  SectionTitle,
  FilterChips,
  Badge,
  Avatar,
  EmptyCard,
  INK,
  ORANGE,
  MUTED,
} from '../components/ui'

const GREEN = '#2FBF71' // stesso "collegato" del dettaglio compagno
const DANGER = '#FF477E'

// Stile campo di form, coerente con il picker di CompagnoDetail.
const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(27,42,74,.16)',
  borderRadius: 10,
  padding: '11px 13px',
  font: "600 14px 'Nunito Sans'",
  background: '#fff',
  color: INK,
}
const labelStyle: CSSProperties = {
  display: 'block',
  font: "700 12px 'Nunito Sans'",
  color: MUTED,
  marginBottom: 7,
}

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  border: 'none',
  borderRadius: 11,
  padding: '12px 18px',
  font: "700 14px 'Nunito Sans'",
  cursor: 'pointer',
}
const primaryBtn: CSSProperties = { ...btnBase, background: ORANGE, color: '#fff' }
const darkBtn: CSSProperties = { ...btnBase, background: INK, color: '#fff' }
const dangerBtn: CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: DANGER,
  border: '1px solid rgba(255,71,126,.4)',
  padding: '10px 16px',
  font: "700 13px 'Nunito Sans'",
}

interface ChiCeOggiProps {
  own: CheckIn | null // il proprio check-in di oggi (null = non in spiaggia)
  room: PresentUser[] // gli altri presenti oggi, già ordinati a monte
  loading: boolean // fetch della stanza in corso
  cityPrefill: string // città suggerita (torneo più recente)
  onCheckIn: (input: CheckInInput) => Promise<boolean>
  onCheckOut: () => Promise<boolean>
  onRefresh: () => void
  onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
}

export default function ChiCeOggi({ own, room, loading, cityPrefill, onCheckIn, onCheckOut, onRefresh, onAddPartner }: ChiCeOggiProps) {
  return (
    <div style={{ animation: 'pop .32s ease both' }}>
      <PageHeader title="Chi c'è oggi" subtitle="Chi è in spiaggia oggi e cerca compagno" />

      {own ? (
        <CheckedInCard own={own} onCheckOut={onCheckOut} />
      ) : (
        <CheckInForm cityPrefill={cityPrefill} onCheckIn={onCheckIn} />
      )}

      <RoomSection own={own} room={room} loading={loading} onRefresh={onRefresh} onAddPartner={onAddPartner} />
    </div>
  )
}

// ---------------------------------------------------------------- CheckInForm
function CheckInForm({ cityPrefill, onCheckIn }: { cityPrefill: string; onCheckIn: (input: CheckInInput) => Promise<boolean> }) {
  const [city, setCity] = useState(cityPrefill)
  const [looking, setLooking] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  // Il prefill può arrivare dopo il primo render (dati in caricamento): lo
  // adottiamo solo finché il campo è vuoto, senza mai sovrascrivere ciò che si
  // sta digitando.
  useEffect(() => {
    if (cityPrefill) setCity((c) => c || cityPrefill)
  }, [cityPrefill])

  const canSubmit = city.trim().length > 0 && !busy
  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    // Al successo il parent passa `own` e questa card diventa lo stato "sei qui".
    await onCheckIn({ city: city.trim(), lookingForPartner: looking, note: note.trim() })
    setBusy(false)
  }

  return (
    <div className="card" style={{ marginTop: 22, padding: 20 }}>
      <h2 className="num" style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Fai check-in</h2>
      <p style={{ font: "600 13px 'Nunito Sans'", color: MUTED, margin: '5px 0 0' }}>Segnala che sei in spiaggia oggi e scopri chi altro c'è.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
        <div>
          <label htmlFor="oggi-city" style={labelStyle}>Città</label>
          <input id="oggi-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Es. Rimini" autoComplete="off" style={fieldStyle} />
        </div>

        <div>
          <span id="oggi-date-label" style={labelStyle}>Giorno</span>
          <div aria-labelledby="oggi-date-label" style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8, color: MUTED, background: '#FBFAF8' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ORANGE, flex: 'none' }} /> Oggi
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "700 14px 'Nunito Sans'" }}>Cerco compagno</div>
            <div style={{ font: "600 12px 'Nunito Sans'", color: MUTED, marginTop: 2 }}>Fatti trovare da chi cerca un partner.</div>
          </div>
          <Switch checked={looking} onChange={setLooking} label="Cerco compagno" />
        </div>

        <div>
          <label htmlFor="oggi-note" style={labelStyle}>Nota <span style={{ fontWeight: 600 }}>(facoltativa)</span></label>
          <input id="oggi-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder={'Es. "Cerco per King of the Beach, 2vs2"'} style={fieldStyle} />
        </div>
      </div>

      <button
        type="button"
        className="chip"
        onClick={submit}
        disabled={!canSubmit}
        style={{ ...primaryBtn, marginTop: 18, width: '100%', opacity: canSubmit ? undefined : 0.5, cursor: canSubmit ? 'pointer' : 'default' }}
      >
        {busy ? 'Check-in…' : 'Fai check-in'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- CheckedInCard
function CheckedInCard({ own, onCheckOut }: { own: CheckIn; onCheckOut: () => Promise<boolean> }) {
  const [leaving, setLeaving] = useState(false)
  const leave = async () => {
    if (leaving) return
    setLeaving(true)
    await onCheckOut()
    setLeaving(false)
  }
  return (
    <div className="card" style={{ marginTop: 22, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ font: "700 15px 'Nunito Sans'", display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: GREEN, flex: 'none' }} /> Sei a {own.city} oggi
          </div>
          <div style={{ font: "600 13px 'Nunito Sans'", color: MUTED, marginTop: 5 }}>
            {own.lookingForPartner ? 'Stai cercando un compagno.' : 'Non stai cercando un compagno.'}
            {own.note ? ` · ${own.note}` : ''}
          </div>
        </div>
        <button type="button" className="chip" onClick={leave} disabled={leaving} style={{ ...dangerBtn, flex: 'none', opacity: leaving ? 0.6 : undefined, cursor: leaving ? 'default' : 'pointer' }}>
          {leaving ? 'Uscita…' : 'Esci'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- RoomSection
const ROOM_ALL = 'all'
const ROOM_LOOKING = 'looking'

function RoomSection({ own, room, loading, onRefresh, onAddPartner }: {
  own: CheckIn | null
  room: PresentUser[]
  loading: boolean
  onRefresh: () => void
  onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
}) {
  const [filter, setFilter] = useState<string>(ROOM_ALL)

  // Reciprocità (Q3): la stanza si vede solo se sei in check-in.
  if (!own) {
    return (
      <>
        <SectionTitle>In spiaggia oggi</SectionTitle>
        <EmptyCard>Fai check-in per vedere chi c'è oggi e metterti in contatto.</EmptyCard>
      </>
    )
  }

  const visible = filter === ROOM_LOOKING ? room.filter((u) => u.lookingForPartner) : room
  const hasLooking = room.some((u) => u.lookingForPartner)
  // Le chip servono solo se filtrano davvero qualcosa (mix di stati, ≥2 persone).
  const showChips = room.length > 1 && hasLooking && !room.every((u) => u.lookingForPartner)
  const topGap = showChips ? 14 : 0

  return (
    <>
      <SectionTitle action={<GhostButton onClick={onRefresh}>↻ Aggiorna</GhostButton>}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          In spiaggia oggi
          {room.length > 0 && <RoomCount n={room.length} />}
        </span>
      </SectionTitle>

      {showChips && (
        <FilterChips
          label="Filtra chi c'è oggi"
          value={filter}
          onChange={setFilter}
          mt={0}
          options={[
            { value: ROOM_ALL, label: 'Tutti' },
            { value: ROOM_LOOKING, label: 'Cerca compagno' },
          ]}
        />
      )}

      {loading ? (
        <div role="status" style={{ font: "600 13px 'Nunito Sans'", color: MUTED, padding: '18px 2px', marginTop: topGap }}>Aggiornamento…</div>
      ) : visible.length === 0 ? (
        <div style={{ marginTop: topGap }}>
          <EmptyCard>
            {room.length === 0 ? (
              <>Ancora nessun altro qui. <GhostButton onClick={onRefresh}>Aggiorna →</GhostButton></>
            ) : (
              'Nessuno sta cercando un compagno al momento.'
            )}
          </EmptyCard>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,260px),1fr))', gap: 14, marginTop: topGap }}>
          {visible.map((u) => (
            <PresentCard key={u.id} u={u} onAddPartner={onAddPartner} />
          ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- PresentCard
function PresentCard({ u, onAddPartner }: { u: PresentUser; onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')

  const add = async () => {
    if (state !== 'idle') return
    setErr('')
    setState('busy')
    const r = await onAddPartner(u)
    if (r.ok) setState('done')
    else {
      setState('idle')
      setErr(r.error || 'Operazione non riuscita.')
    }
  }

  const initial = (u.name.trim()[0] || '?').toUpperCase()
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <Avatar initial={initial} uri={u.avatarUrl} size={46} font={19} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ font: "700 15px 'Nunito Sans'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
          <div style={{ marginTop: 5 }}>
            {u.lookingForPartner ? (
              <Badge tone="premium" size="md">Cerca compagno</Badge>
            ) : (
              <span style={{ font: "600 12px 'Nunito Sans'", color: MUTED }}>In spiaggia</span>
            )}
          </div>
        </div>
      </div>

      {u.note && <div style={{ font: "600 13px 'Nunito Sans'", color: 'rgba(27,42,74,.7)', lineHeight: 1.4 }}>{u.note}</div>}

      {state === 'done' ? (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 7, font: "700 13px 'Nunito Sans'", color: INK }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, flex: 'none' }} /> Aggiunto ai compagni
        </div>
      ) : (
        <button
          type="button"
          className="chip"
          onClick={add}
          disabled={state === 'busy'}
          style={{ ...darkBtn, width: '100%', padding: '11px 16px', font: "700 13px 'Nunito Sans'", opacity: state === 'busy' ? 0.6 : undefined, cursor: state === 'busy' ? 'default' : 'pointer' }}
        >
          {state === 'busy' ? 'Aggiungo…' : '＋ Aggiungi come compagno'}
        </button>
      )}

      {err && <div role="alert" style={{ font: "700 12px 'Nunito Sans'", color: DANGER }}>{err}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- primitives
// Contatore accanto al titolo (stesso linguaggio del contatore sezioni Tornei),
// in tinta "live" arancione per la stanza di oggi.
function RoomCount({ n }: { n: number }) {
  return (
    <span style={{ flex: 'none', font: "700 12px 'Nunito Sans'", padding: '4px 10px', borderRadius: 8, background: '#FFF1EA', color: '#C4501E' }}>
      {n === 1 ? '1 persona' : `${n} persone`}
    </span>
  )
}

// Toggle accessibile "Cerco compagno": <button role="switch"> raggiungibile da
// tastiera (Invio/Spazio nativi) e annunciato come premuto/non premuto.
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="chip"
      style={{ position: 'relative', width: 46, height: 27, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', flex: 'none', background: checked ? INK : '#E4E1DB', transition: 'background .2s ease' }}
    >
      <span style={{ position: 'absolute', top: 3, left: checked ? 22 : 3, width: 21, height: 21, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(27,42,74,.3)', transition: 'left .2s ease' }} />
    </button>
  )
}

// Link-azione arancione, ma <button> vero (raggiungibile da tastiera) per le
// azioni di refresh.
function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="chip" onClick={onClick} style={{ border: 'none', background: 'transparent', color: ORANGE, cursor: 'pointer', font: "700 13px 'Nunito Sans'", padding: 0 }}>
      {children}
    </button>
  )
}
