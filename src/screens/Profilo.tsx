// ============================================================================
// Profilo (UX §5 F9, §6.8), il redesign: non è più una tab. Ci si arriva
// dall'avatar in Home o dalla Sidebar, e si chiude col × di vetro in alto
// (la barra mostra il titolo compatto «Profilo»).
//
// In testa, centrati, l'avatar — che è il pulsante «Cambia foto profilo» col
// badge della fotocamera — e il nome, che è l'h1 della schermata. Sotto, i
// gruppi di righe: Account, Condivisione e privacy, Versione alpha; in fondo
// «Esci», largo, di vetro, in rosso.
//
// Presentazionale: la foto, il nome, la password e il consenso passano dalle
// callback, che parlano con Supabase e con lib/consenso; qui restano il
// modulo, l'anteprima della foto e gli esiti. «Togli tutte le condivisioni» ed
// «Esci» aprono SEMPRE un ConfirmDialog (lo fa la shell); «Esci» vuol dire
// solo logout (UX C19).
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import type { ProfiloProps } from '../app/contracts'
import { NavBar, Page, ListGroup, ListItem, ListRow, Avatar, Badge, Button, Grow, Icon, Switch, TextField } from '../components/ui/index'
import { LIMITI } from '../lib/lunghezze'
import './Profilo.css'

type Esito = { ok: boolean; text: string } | null

const NOME_MAX = LIMITI.nome.max

function anteprima(file: File): string | null {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null
}
function rilascia(url: string | null) {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

/** La SALITA del redesign: i blocchi compaiono uno dopo l'altro. */
const sale = (i: number) => ({ className: 'rise', style: { '--rise-i': i } as CSSProperties })

/** Il chevron delle righe-pulsante: dice «si apre», come quello dei link. */
function Chevron({ className }: { className?: string }) {
  return <Icon name="chevron-right" size={20} className={className ? `ui-row-chev ${className}` : 'ui-row-chev'} />
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
  onConsenso,
  onEsci,
  onClose,
}: ProfiloProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const rigaNome = useRef<HTMLButtonElement>(null)
  const campoNome = useRef<HTMLInputElement>(null)
  const editorId = useId()
  const [nomeAperto, setNomeAperto] = useState(false)
  const [name, setName] = useState(session.name)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameMsg, setNameMsg] = useState<Esito>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)

  // L'anteprima locale vive finché serve: si rilascia quando cambia o si esce.
  useEffect(() => () => rilascia(preview), [preview])

  // Il nome in sessione cambia (salvato qui, o da un altro dispositivo): il
  // campo lo segue finché non lo si sta modificando.
  useEffect(() => {
    if (!nomeAperto) setName(session.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.name])

  // All'apertura il fuoco va nel campo: la riga si è aperta per scrivere.
  useEffect(() => {
    if (nomeAperto) campoNome.current?.focus({ preventScroll: true })
  }, [nomeAperto])

  const nameDirty = name.trim() !== session.name.trim()
  const admin = session.role === 'admin'
  const nuove = segnalazioniNuove ?? 0

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

  const chiudiNome = () => {
    setNomeAperto(false)
    rigaNome.current?.focus()
  }

  const apriNome = () => {
    if (nameBusy) return
    if (nomeAperto) {
      setName(session.name)
      setNomeAperto(false)
      return
    }
    setNameMsg(null)
    setName(session.name)
    setNomeAperto(true)
  }

  const annullaNome = () => {
    if (nameBusy) return
    setName(session.name)
    setNameMsg(null)
    chiudiNome()
  }

  const salvaNome = async (e?: FormEvent) => {
    e?.preventDefault()
    if (nameBusy) return
    if (!nameDirty) {
      chiudiNome()
      return
    }
    setNameBusy(true)
    setNameMsg(null)
    const res = await onSalvaNome(name)
    setNameBusy(false)
    if (!res.ok) {
      // Nome rifiutato: si torna a quello in sessione e lo si dice, a riga aperta.
      setName(session.name)
      setNameMsg({ ok: false, text: res.error ?? 'Operazione non riuscita.' })
      return
    }
    setNameMsg({ ok: true, text: res.notice ?? 'Nome aggiornato.' })
    chiudiNome()
  }

  return (
    <Page width="reading" className="profilo">
      <NavBar title="Profilo" hideLargeTitle close={{ label: 'Chiudi', onClick: onClose }} />

      <div className="profilo-body">
        <header className="profilo-head rise">
          <button
            type="button"
            className="profilo-avatar press"
            aria-label="Cambia foto profilo"
            aria-busy={avatarBusy || undefined}
            aria-disabled={avatarBusy || undefined}
            onClick={scegliFoto}
          >
            <Avatar name={session.name} src={preview ?? session.avatarUrl} size={92} busy={avatarBusy} />
            <span className="profilo-avatar-badge" aria-hidden="true">
              <Icon name="camera" size={16} />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} data-testid="profilo-file" />
          <h1 className="profilo-name" tabIndex={-1}>{session.name}</h1>
          {admin && <Badge>Admin</Badge>}
          {avatarErr && (
            <p className="profilo-avatar-err" role="alert">
              <Icon name="alert" size={16} />
              <span>{avatarErr}</span>
            </p>
          )}
        </header>

        <div {...sale(1)}>
          <ListGroup title="Account" id="profilo-account">
            {/* Il nome si modifica nella riga stessa: il tocco la apre (una
                disclosure, `aria-expanded`), sotto compaiono il campo e i
                pulsanti. Niente sheet per un campo solo. */}
            <ListItem className="profilo-nome">
              <button
                ref={rigaNome}
                type="button"
                className="ui-row"
                aria-expanded={nomeAperto}
                aria-controls={editorId}
                onClick={apriNome}
              >
                <span className="ui-row-text">
                  <span className="ui-row-title">Nome visualizzato</span>
                </span>
                <span className="ui-row-value">{session.name}</span>
                <Chevron className="profilo-nome-chev" />
              </button>
              <Grow id={editorId} open={nomeAperto} exception="nome-profilo">
                <form className="profilo-nome-editor" onSubmit={(e) => void salvaNome(e)} noValidate>
                  <TextField
                    ref={campoNome}
                    label="Nome visualizzato"
                    labelHidden
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
                  <div className="profilo-nome-azioni">
                    <Button variant="quiet" size="sm" onClick={annullaNome}>
                      Annulla
                    </Button>
                    <Button type="submit" size="sm" busy={nameBusy} busyLabel="Salvataggio…">
                      Salva nome
                    </Button>
                  </div>
                </form>
              </Grow>
              {nameMsg && (
                <p className="profilo-esito" data-ok={nameMsg.ok ? '' : undefined} role={nameMsg.ok ? 'status' : 'alert'}>
                  <Icon name={nameMsg.ok ? 'check-circle' : 'alert'} size={16} />
                  <span>{nameMsg.text}</span>
                </p>
              )}
            </ListItem>
            <ListRow title="Email" value={session.email} />
            {session.hasPassword ? (
              <ListRow title="Cambia password" value={<Chevron />} onClick={onPassword} />
            ) : (
              <ListRow
                title="Password"
                subtitle="Hai effettuato l'accesso con Google o Apple: la password si gestisce dal tuo account, non da qui."
              />
            )}
          </ListGroup>
        </div>

        <div {...sale(2)}>
          <ListGroup
            title="Condivisione e privacy"
            id="profilo-privacy"
            // Il consenso dato qui è lo stesso del dialogo dei cookie: si dice
            // cosa copre. Le condivisioni le spiega il ConfirmDialog di «Togli».
            footer="Misure anonime di come si usa l'app, registrazioni delle sessioni comprese. Il necessario per tenerti collegato resta sempre attivo."
          >
            <ListRow title="Condivisioni ricevute" value={String(condivisioni)} />
            {condivisioni > 0 && <ListRow title="Togli tutte le condivisioni" tone="danger" onClick={onTogliCondivisioni} />}
            {/* Ritirare il consenso è facile quanto darlo: un interruttore. */}
            <ListItem className="profilo-switch">
              <Switch
                label="Statistiche d'uso anonime"
                checked={consenso === 'accettato'}
                onChange={(on) => onConsenso(on ? 'accettato' : 'rifiutato')}
              />
            </ListItem>
          </ListGroup>
        </div>

        <div {...sale(3)}>
          <ListGroup title="Versione alpha" id="profilo-alpha">
            <ListRow title="Segnala un problema" to={{ name: 'segnala' }} />
            {segnalazioniNuove !== null && (
              <ListRow
                title="Segnalazioni ricevute"
                value={nuove > 0 ? `${nuove} ${nuove === 1 ? 'nuova' : 'nuove'}` : undefined}
                to={{ name: 'segnalazioni' }}
              />
            )}
          </ListGroup>
        </div>

        <div {...sale(4)}>
          <Button variant="glass" tone="danger" block className="profilo-esci" onClick={onEsci}>
            Esci
          </Button>
        </div>
      </div>
    </Page>
  )
}
