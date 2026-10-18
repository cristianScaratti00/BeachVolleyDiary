// ============================================================================
// Profilo (UX §5 F9, §6.8): liste raggruppate stile iOS. Presentazionale: la
// foto, il nome e la password passano dalle callback (useActions), che parlano
// con Supabase; qui restano il modulo, l'anteprima della foto e gli esiti.
//
// Le righe distruttive (togliere le condivisioni, uscire) sono testo --danger
// e aprono SEMPRE un ConfirmDialog (lo fa la shell). «Esci» vuol dire solo
// logout (UX C19).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { ProfiloProps } from '../app/contracts'
import { NavBar, Page, ListGroup, ListItem, ListRow, Avatar, Badge, Button, Icon, TextField } from '../components/ui/index'
import './Profilo.css'

type Esito = { ok: boolean; text: string } | null

const NOME_MAX = 40

const ETICHETTA_CONSENSO = {
  accettato: 'Accettati',
  rifiutato: 'Rifiutati',
  nessuno: 'Da scegliere',
} as const

function anteprima(file: File): string | null {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null
}
function rilascia(url: string | null) {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

export default function Profilo({
  session,
  condivisioni,
  consenso,
  segnalazioniNuove,
  onSalvaNome,
  onCaricaAvatar,
  onPassword,
  onTogliCondivisioni,
  onCookie,
  onEsci,
}: ProfiloProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(session.name)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameMsg, setNameMsg] = useState<Esito>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)

  // L'anteprima locale vive finché serve: si rilascia quando cambia o si esce.
  useEffect(() => () => rilascia(preview), [preview])

  const nameDirty = name.trim() !== session.name.trim()
  const admin = session.role === 'admin'

  const scegliFoto = () => {
    if (avatarBusy) return
    fileRef.current?.click()
  }

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // si può riscegliere lo stesso file
    if (!file || avatarBusy) return
    setAvatarErr(null)
    // Anteprima subito, al 60% con lo spinner (MOTION.md §4.3): il salvataggio
    // aspetta il server, la risposta no.
    setPreview(anteprima(file))
    setAvatarBusy(true)
    const r = await onCaricaAvatar(file)
    setAvatarBusy(false)
    setPreview(null)
    if (!r.ok) setAvatarErr(r.error ?? 'Impossibile aggiornare la foto. Riprova tra poco.')
  }

  const salvaNome = async () => {
    if (nameBusy || !nameDirty) return
    setNameBusy(true)
    setNameMsg(null)
    const res = await onSalvaNome(name)
    setNameBusy(false)
    // Nome rifiutato: si torna a quello in sessione (comportamento di prima).
    if (!res.ok) setName(session.name)
    setNameMsg({ ok: res.ok, text: res.ok ? res.notice ?? 'Nome aggiornato.' : res.error ?? 'Operazione non riuscita.' })
  }

  const consensoLabel = ETICHETTA_CONSENSO[consenso ?? 'nessuno']
  const nuove = segnalazioniNuove ?? 0

  return (
    <Page width="reading">
      <NavBar title="Profilo" />

      <section className="profilo-head" aria-label="Il tuo account">
        <button
          type="button"
          className="profilo-avatar"
          aria-label="Cambia foto profilo"
          aria-busy={avatarBusy || undefined}
          aria-disabled={avatarBusy || undefined}
          onClick={scegliFoto}
        >
          <Avatar name={session.name} src={preview ?? session.avatarUrl} size={64} busy={avatarBusy} />
          <span className="profilo-avatar-badge" aria-hidden="true">
            <Icon name="camera" size={16} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} data-testid="profilo-file" />
        <div className="profilo-who">
          <p className="profilo-name">
            <span>{session.name}</span>
            {admin && <Badge tone="select">Admin</Badge>}
          </p>
          <p className="profilo-email">{session.email}</p>
        </div>
      </section>
      {avatarErr && (
        <p className="profilo-avatar-err" role="alert">
          <Icon name="alert" size={16} />
          <span>{avatarErr}</span>
        </p>
      )}

      <div className="profilo-groups">
        <ListGroup title="Account" id="profilo-account">
          <ListItem className="profilo-name-item">
            <TextField
              label="Nome"
              value={name}
              onChange={(v) => {
                setName(v)
                setNameMsg(null)
              }}
              maxLength={NOME_MAX}
              autoComplete="nickname"
              readOnly={nameBusy}
              hint="Con questo nome ti trovano gli altri giocatori quando ti collegano come compagno."
            />
            {/* Lo spazio del pulsante è riservato: comparendo non sposta il campo. */}
            <div className="profilo-name-save" data-visible={nameDirty || nameBusy ? '' : undefined}>
              {(nameDirty || nameBusy) && (
                <Button variant="tinted" size="sm" busy={nameBusy} busyLabel="Salvataggio…" onClick={() => void salvaNome()}>
                  Salva nome
                </Button>
              )}
            </div>
            {nameMsg && (
              <p className="profilo-esito" data-ok={nameMsg.ok ? '' : undefined} role={nameMsg.ok ? 'status' : 'alert'}>
                <Icon name={nameMsg.ok ? 'check-circle' : 'alert'} size={16} />
                <span>{nameMsg.text}</span>
              </p>
            )}
          </ListItem>
          <ListRow title="Email" value={session.email} />
          {session.hasPassword ? (
            <ListRow
              icon="lock"
              title="Password"
              value={<Icon name="chevron-right" size={20} className="ui-row-chev" />}
              onClick={onPassword}
            />
          ) : (
            <ListRow
              icon="lock"
              title="Password"
              subtitle="Hai effettuato l'accesso con Google o Apple: la password si gestisce dal tuo account, non da qui."
            />
          )}
        </ListGroup>

        <ListGroup
          title="Condivisioni"
          id="profilo-condivisioni"
          footer={
            condivisioni === 0
              ? 'Nessuno ti ha collegato come suo compagno. Quando succede, i tornei che avete giocato insieme compaiono nel tuo diario in sola lettura.'
              : `${condivisioni === 1 ? 'Un altro giocatore ti ha collegato come suo compagno' : `${condivisioni} giocatori ti hanno collegato come loro compagno`}: i loro tornei compaiono nel tuo diario e contano nelle tue statistiche. Togliendo la condivisione spariscono; i tuoi tornei non vengono toccati.`
          }
        >
          <ListRow icon="people" title="Condivisioni ricevute" value={String(condivisioni)} />
          {condivisioni > 0 && <ListRow title="Togli tutte le condivisioni" tone="danger" onClick={onTogliCondivisioni} />}
        </ListGroup>

        {/* Ritirare il consenso deve essere facile quanto darlo: da qui si
            torna alla domanda iniziale. */}
        <ListGroup
          title="Privacy"
          id="profilo-privacy"
          footer="Quello che serve a tenerti collegato resta sempre attivo, ed è escluso da questa scelta."
        >
          <ListRow
            icon="shield"
            title="Cookie e statistiche"
            value={
              <span className="profilo-value">
                {consensoLabel}
                <Icon name="chevron-right" size={20} className="ui-row-chev" />
              </span>
            }
            onClick={onCookie}
          />
        </ListGroup>

        <ListGroup title="Supporto" id="profilo-supporto">
          <ListRow icon="flag" title="Segnala un problema" to={{ name: 'segnala' }} />
          {segnalazioniNuove !== null && (
            <ListRow
              icon="inbox"
              title="Segnalazioni ricevute"
              value={nuove > 0 ? `${nuove} ${nuove === 1 ? 'nuova' : 'nuove'}` : undefined}
              to={{ name: 'segnalazioni' }}
            />
          )}
        </ListGroup>

        <ListGroup id="profilo-esci">
          <ListRow title="Esci" tone="danger" onClick={onEsci} />
        </ListGroup>
      </div>

      <p className="profilo-foot">Beach Diary · versione alpha</p>
    </Page>
  )
}
