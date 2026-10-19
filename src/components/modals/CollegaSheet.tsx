// ============================================================================
// «Collega «X» a un utente» (UX §5 F7, §6.6). La ricerca sta sul server e non
// restituisce più l'elenco completo (sarebbe dare l'anagrafica dell'app a
// chiunque): sotto le tre lettere non si interroga nemmeno, come fa la RPC.
// L'esito positivo lo dice la shell (Toast «Collegato»); l'errore resta qui,
// in linea (`role="alert"`), con i risultati ancora lì per riprovare.
// Non è un modulo: titolo grande in cima e «Annulla» di vetro in fondo.
// ============================================================================
import { useEffect, useState } from 'react'
import type { CollegaSheetProps } from '../../app/contracts'
import type { AppUser } from '../../lib/models'
import { Avatar, Button, Icon, List, ListRow, TextField } from '../ui/index'
import { Sheet, SheetActions, SheetTitle } from './Sheet'
import './CollegaSheet.css'

/** La stessa soglia di `search_users` lato server. */
const MIN_RICERCA = 3
/** Si interroga quando si smette di scrivere, non a ogni tasto. */
const ATTESA_MS = 300

// Una ricerca non è un modulo da perdere: lo sheet non si segna mai «sporco»,
// e chiuderlo non chiede conferma.
export default function CollegaSheet({ onClose, top, byTouch, opener, setBusy, partnerName, onSearch, onLink }: CollegaSheetProps) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const testo = q.trim()
  const corto = testo.length < MIN_RICERCA

  useEffect(() => {
    if (corto) {
      setUsers(null)
      return
    }
    let vivo = true
    setUsers(null)
    const t = window.setTimeout(async () => {
      const trovati = await onSearch(testo)
      if (vivo) setUsers(trovati)
    }, ATTESA_MS)
    return () => {
      vivo = false
      window.clearTimeout(t)
    }
  }, [testo, corto, onSearch])

  const collega = async (u: AppUser) => {
    if (busyId) return
    setErr('')
    setBusyId(u.id)
    setBusy(true)
    const r = await onLink(u.id)
    setBusyId(null)
    setBusy(false)
    if (!r.ok) setErr(r.error || 'Collegamento non riuscito.')
  }

  const stato = corto
    ? `Scrivi almeno ${MIN_RICERCA} lettere del nome. Se conosci la sua email, incollala per intero.`
    : users === null
      ? 'Cerco…'
      : users.length === 0
        ? 'Nessun utente trovato.'
        : users.length === 1
          ? '1 utente trovato.'
          : `${users.length} utenti trovati.`

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      busy={!!busyId}
      footer={
        <SheetActions>
          <Button variant="glass" block onClick={onClose}>Annulla</Button>
        </SheetActions>
      }
    >
      <SheetTitle sub="I tornei giocati insieme verranno condivisi con il suo account.">
        Collega «{partnerName}» a un utente
      </SheetTitle>
      <TextField
        type="search"
        label="Cerca un utente"
        value={q}
        onChange={setQ}
        placeholder="Nome, o email esatta…"
        autoComplete="off"
        enterKeyHint="search"
      />
      <p className="collega-stato" role="status">{stato}</p>
      {users && users.length > 0 && (
        <List className="collega-risultati" label="Utenti trovati">
          {users.map((u) => (
            <ListRow
              key={u.id}
              leading={<Avatar name={u.name} size={32} />}
              title={u.name}
              subtitle={u.email}
              value={busyId === u.id ? 'Collego…' : 'Collega'}
              busy={busyId === u.id}
              disabled={!!busyId && busyId !== u.id}
              onClick={() => void collega(u)}
            />
          ))}
        </List>
      )}
      {err && (
        <p className="ui-field-error collega-errore" role="alert">
          <Icon name="alert" size={16} />
          <span>{err}</span>
        </p>
      )}
    </Sheet>
  )
}
