// ============================================================================
// "Chi c'è oggi" (UX §5 F6, §6.7; MOTION.md §5 F6; il redesign, versione D).
// Presentazionale: il proprio check-in, la stanza già ordinata e le callback
// arrivano dalla shell (useCheckIn via App). Qui vivono solo il modulo, il
// filtro della stanza e gli stati dei pulsanti.
//
// - Reciprocità (Q3): la stanza si vede solo dopo il check-in.
// - Il modulo che diventa la card «Sei a X oggi» (e ritorno) segue lo schema
//   della pila (MOTION.md §4.3): chi esce va fuori dal flusso a t0 e svanisce,
//   chi entra compare al suo posto, la stanza sotto scivola (FLIP). Nessuna
//   altezza animata.
// - «Termina check-in» chiede conferma (UX §7.7): la conferma la apre la shell.
//   Il redesign scrive «Esci», ma «Esci» nell'app è solo il logout (C19): il
//   pulsante dice «Termina», e il suo nome è «Termina check-in».
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { AnimatePresence } from 'motion/react'
import type { ChiCeOggiProps } from '../app/contracts'
import type { CheckIn, CheckInInput, PresentUser } from '../lib/models'
import { ENTRATA, MOLLA, SVELTO } from '../components/Motion'
import { CityInput } from '../components/modals/Sheet'
import {
  Avatar,
  Badge,
  Bone,
  Button,
  Card,
  FilterChips,
  Icon,
  NavBar,
  Note,
  Page,
  Section,
  Skeleton,
  Switch,
  TextField,
} from '../components/ui/index'
import './ChiCeOggi.css'

const NOTA_MAX = 80

export default function ChiCeOggi({
  own,
  room,
  loading,
  cityPrefill,
  back,
  onCheckIn,
  onTerminaCheckIn,
  onRefresh,
  onAddPartner,
  aggiornatoAlle,
}: ChiCeOggiProps) {
  return (
    <Page width="reading" className="oggi-page">
      <NavBar title="Chi c'è oggi" subtitle="Chi è in spiaggia oggi e cerca compagno" back={back} />
      {/* Il modulo e la card si scambiano sul posto: chi esce va fuori dal
          flusso (popLayout), la stanza sotto scivola con un FLIP. La salita
          sta sul contenitore, mai sugli elementi che Motion sposta. */}
      <div className="oggi-slot rise">
        <AnimatePresence mode="popLayout" initial={false}>
          {own ? (
            <m.div
              key="qui"
              className="oggi-swap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: ENTRATA }}
              exit={{ opacity: 0, transition: SVELTO }}
            >
              <CheckedInCard own={own} onTermina={onTerminaCheckIn} />
            </m.div>
          ) : (
            <m.div
              key="modulo"
              className="oggi-swap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: ENTRATA }}
              exit={{ opacity: 0, transition: SVELTO }}
            >
              <CheckInForm cityPrefill={cityPrefill} onCheckIn={onCheckIn} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <m.div layout="position" transition={MOLLA} className="oggi-room-wrap">
        <RoomSection
          own={own}
          room={room}
          loading={loading}
          onRefresh={onRefresh}
          onAddPartner={onAddPartner}
          aggiornatoAlle={aggiornatoAlle}
        />
      </m.div>
    </Page>
  )
}

// ---------------------------------------------------------------- modulo
function CheckInForm({ cityPrefill, onCheckIn }: { cityPrefill: string; onCheckIn: (input: CheckInInput) => Promise<boolean> }) {
  const id = useId()
  const cityRef = useRef<HTMLInputElement | null>(null)
  const [city, setCity] = useState(cityPrefill)
  const [looking, setLooking] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState(false)

  // Il prefill può arrivare dopo il primo disegno (dati in caricamento): lo si
  // adotta solo finché il campo è vuoto, senza sovrascrivere ciò che si scrive.
  useEffect(() => {
    if (cityPrefill) setCity((c) => c || cityPrefill)
  }, [cityPrefill])

  const vuota = city.trim().length === 0
  const submit = async () => {
    if (busy || vuota) return
    setBusy(true)
    // Al successo la shell passa `own` e il modulo diventa la card «Sei a X oggi».
    await onCheckIn({ city: city.trim(), lookingForPartner: looking, note: note.trim() })
    setBusy(false)
  }

  return (
    <Card as="section" className="oggi-form" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="oggi-form-title">Fai check-in</h2>
      <p className="oggi-card-text">Segnala che sei in spiaggia oggi e scopri chi altro c'è.</p>
      <form
        className="oggi-fields"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="oggi-dove">
          <div className="ui-field" data-invalid={errore && vuota ? '' : undefined}>
            <label htmlFor={`${id}-city`} className="ui-field-label">Città</label>
            <span
              ref={(el) => {
                cityRef.current = el?.querySelector('input') ?? null
              }}
              className="oggi-city"
            >
              <CityInput
                id={`${id}-city`}
                value={city}
                onChange={(v) => {
                  setCity(v)
                  if (v.trim()) setErrore(false)
                }}
                describedBy={errore && vuota ? `${id}-city-e` : undefined}
              />
            </span>
            {errore && vuota && (
              <p id={`${id}-city-e`} className="ui-field-error" role="alert">
                <Icon name="alert" size={16} />
                <span>Scrivi la città in cui sei.</span>
              </p>
            )}
          </div>

          {/* Il giorno non si sceglie: il check-in vale per oggi. */}
          <div className="ui-field">
            <span className="ui-field-label">Giorno</span>
            <p className="oggi-giorno">
              <span className="oggi-giorno-dot" aria-hidden="true" />
              Oggi
            </p>
          </div>
        </div>

        <Switch className="oggi-cerco" label="Cerco compagno" hint="Fatti trovare da chi cerca un partner." checked={looking} onChange={setLooking} />

        <TextField
          label={
            <>
              Nota <span className="oggi-facoltativa">(facoltativa)</span>
            </>
          }
          value={note}
          onChange={setNote}
          maxLength={NOTA_MAX}
          placeholder={'Es. "Cerco per King of the Beach, 2vs2"'}
          // Il contatore compare quando si scrive: a campo vuoto non dice niente.
          hint={note ? `${note.length}/${NOTA_MAX}` : undefined}
          autoComplete="off"
        />

        <Button
          type="submit"
          variant="filled"
          size="lg"
          block
          disabled={vuota}
          busy={busy}
          busyLabel="Check-in…"
          onDisabledClick={() => {
            // Un pulsante che non risponde sembra rotto: porta al campo che manca.
            setErrore(true)
            cityRef.current?.focus()
          }}
        >
          Sono in spiaggia
        </Button>
      </form>
    </Card>
  )
}

// ---------------------------------------------------------------- sei qui
function CheckedInCard({ own, onTermina }: { own: CheckIn; onTermina: () => void }) {
  const id = useId()
  const stato = own.lookingForPartner ? 'Visibile come “cerca compagno”' : 'Visibile, senza cercare compagno'
  return (
    <Card as="section" className="oggi-qui" aria-labelledby={`${id}-t`}>
      <div className="oggi-qui-text">
        <h2 id={`${id}-t`} className="oggi-qui-title">
          <span className="oggi-qui-dot" aria-hidden="true" />
          Sei a {own.city} oggi
        </h2>
        <p className="oggi-card-text">
          {stato}
          {own.note ? ` · ${own.note}` : ''}
        </p>
      </div>
      <Button variant="glass" size="sm" aria-label="Termina check-in" onClick={onTermina}>
        Termina
      </Button>
    </Card>
  )
}

// ---------------------------------------------------------------- stanza
const TUTTI = 'all'
const CERCANO = 'looking'

function RoomSection({ own, room, loading, onRefresh, onAddPartner, aggiornatoAlle }: {
  own: CheckIn | null
  room: PresentUser[]
  loading: boolean
  onRefresh: () => void
  onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
  aggiornatoAlle?: string | null
}) {
  const [filtro, setFiltro] = useState<string>(TUTTI)

  // Reciprocità (Q3): la stanza si vede solo se sei in check-in. Qui sotto il
  // modulo resta una riga sola, che dice perché.
  if (!own) {
    return (
      <p className="oggi-bloccata rise">
        <Icon name="lock" size={16} />
        <span>Fai check-in per vedere chi c'è oggi e metterti in contatto.</span>
      </p>
    )
  }

  const cercano = room.some((u) => u.lookingForPartner)
  // Le chip ci sono solo se separano davvero qualcosa.
  const conChip = room.length > 1 && cercano && !room.every((u) => u.lookingForPartner)
  const attivo = conChip ? filtro : TUTTI
  const visibili = attivo === CERCANO ? room.filter((u) => u.lookingForPartner) : room

  return (
    <Section
      title="In spiaggia oggi"
      id="oggi-stanza"
      className="oggi-stanza rise"
      count={room.length > 0 ? <Badge>{room.length === 1 ? '1 persona' : `${room.length} persone`}</Badge> : undefined}
      action={
        <Button variant="glass" size="sm" onClick={onRefresh}>
          Aggiorna
        </Button>
      }
    >
      {aggiornatoAlle && <Note className="oggi-aggiornato">Aggiornato alle {aggiornatoAlle}</Note>}
      {conChip && (
        <div className="oggi-chips">
          <FilterChips
            label="Filtra chi c'è oggi"
            value={attivo}
            onChange={setFiltro}
            options={[
              { value: TUTTI, label: 'Tutti' },
              { value: CERCANO, label: 'Cerca compagno' },
            ]}
          />
        </div>
      )}

      {loading ? (
        <>
          <p role="status" className="oggi-stato">Aggiornamento…</p>
          <Skeleton className="oggi-skeleton">
            {[0, 1].map((i) => (
              <div key={i} className="oggi-skel-row">
                <Bone className="oggi-skel-avatar" />
                <span className="oggi-skel-lines">
                  <Bone className="oggi-skel-name" />
                  <Bone className="oggi-skel-meta" />
                </span>
              </div>
            ))}
          </Skeleton>
        </>
      ) : room.length === 0 ? (
        <Card as="div" className="oggi-vuota">
          <p>Ancora nessun altro qui.</p>
          <p className="oggi-vuota-sub">Chi fa check-in in città compare qui: aggiorna tra un po'.</p>
        </Card>
      ) : visibili.length === 0 ? (
        <Card as="div" className="oggi-vuota">
          <p>Nessuno sta cercando un compagno al momento.</p>
        </Card>
      ) : (
        <ul className="oggi-persone">
          {visibili.map((u) => (
            <PresentRow key={u.id} u={u} onAddPartner={onAddPartner} />
          ))}
        </ul>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------- persona
function PresentRow({ u, onAddPartner }: { u: PresentUser; onAddPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }> }) {
  const [stato, setStato] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')

  const aggiungi = async () => {
    if (stato !== 'idle') return
    setErr('')
    setStato('busy')
    const r = await onAddPartner(u)
    if (r.ok) setStato('done')
    else {
      setStato('idle')
      setErr(r.error || 'Operazione non riuscita.')
    }
  }

  const fatto = stato === 'done'
  return (
    <li className="oggi-persona">
      <div className="oggi-persona-row">
        <Avatar name={u.name} src={u.avatarUrl} size={44} />
        <div className="oggi-persona-who">
          <div className="oggi-persona-head">
            <h3 className="oggi-persona-name">{u.name}</h3>
            {u.lookingForPartner && <Badge tone="accent">Cerca compagno</Badge>}
          </div>
          <p className="oggi-persona-note">{u.note ? `“${u.note}”` : 'In spiaggia oggi'}</p>
        </div>
        {/* Pulsante ed esito si scambiano SUL POSTO, nella stessa cella:
            dissolvenza incrociata, niente salto (MOTION.md §5 F6). */}
        <div className="oggi-add" data-done={fatto ? '' : undefined}>
          <span className="oggi-add-btn" {...(fatto ? { inert: '' } : {})}>
            <Button
              variant="glass"
              size="sm"
              aria-label={`Aggiungi ${u.name} ai compagni`}
              busy={stato === 'busy'}
              busyLabel="Aggiungo…"
              onClick={() => void aggiungi()}
            >
              Aggiungi
            </Button>
          </span>
          <span className="oggi-add-done" role="status">
            {fatto && (
              <>
                <Icon name="check-circle" size={16} className="oggi-add-ok" />
                Aggiunto<span className="sr-only"> ai compagni</span>
              </>
            )}
          </span>
        </div>
      </div>
      {err && (
        <p role="alert" className="ui-field-error oggi-persona-err">
          <Icon name="alert" size={16} />
          <span>{err}</span>
        </p>
      )}
    </li>
  )
}
