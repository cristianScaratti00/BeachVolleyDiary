// ============================================================================
// «Cambia password» (UX §5 F9, §6.8): uno sheet corto, con la barra dei
// moduli «Annulla · titolo · Salva» (design 15). La regola (almeno 6
// caratteri, le due uguali) la applica `updatePassword` in lib/auth: qui il
// modulo, lo stato occupato e l'esito in linea. Se va a buon fine la shell
// chiude lo sheet e dice «Password aggiornata».
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { PasswordSheetProps } from '../../app/contracts'
import { Sheet, SheetBar } from './Sheet'
import { Button, Icon, TextField } from '../ui/index'
import './PasswordSheet.css'

export default function PasswordSheet({ onClose, top, byTouch, opener, setDirty, setBusy, onSave }: PasswordSheetProps) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setOccupato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const pwRef = useRef<HTMLInputElement>(null)
  const pw2Ref = useRef<HTMLInputElement>(null)

  const dirty = pw !== '' || pw2 !== ''
  useEffect(() => setDirty(dirty), [dirty, setDirty])
  useEffect(() => setBusy(busy), [busy, setBusy])

  const completo = pw !== '' && pw2 !== ''

  const salva = async (e?: FormEvent) => {
    e?.preventDefault()
    if (busy) return
    if (!completo) {
      ;(pw ? pw2Ref : pwRef).current?.focus()
      return
    }
    setErrore(null)
    setOccupato(true)
    const res = await onSave(pw, pw2)
    setOccupato(false)
    if (!res.ok) setErrore(res.error ?? 'Operazione non riuscita.')
  }

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={dirty}
      busy={busy}
      header={
        <SheetBar
          title="Cambia password"
          onCancel={onClose}
          cancelBusy={busy}
          action={
            <Button
              variant="filled"
              disabled={!completo}
              onDisabledClick={() => void salva()}
              busy={busy}
              busyLabel="Salvataggio…"
              onClick={() => void salva()}
            >
              Salva
            </Button>
          }
        />
      }
    >
      <form className="password-form" onSubmit={(e) => void salva(e)} noValidate>
        <p className="password-nota">Non serve quella vecchia: basta essere entrati.</p>
        <TextField
          ref={pwRef}
          label="Nuova password"
          type="password"
          autoComplete="new-password"
          placeholder="Almeno 6 caratteri"
          value={pw}
          onChange={(v) => {
            setPw(v)
            setErrore(null)
          }}
          readOnly={busy}
        />
        <TextField
          ref={pw2Ref}
          label="Conferma"
          type="password"
          autoComplete="new-password"
          placeholder="Ripeti la nuova password"
          value={pw2}
          onChange={(v) => {
            setPw2(v)
            setErrore(null)
          }}
          readOnly={busy}
        />
        {errore && (
          <p className="ui-field-error" role="alert">
            <Icon name="alert" size={16} />
            <span>{errore}</span>
          </p>
        )}
      </form>
    </Sheet>
  )
}
