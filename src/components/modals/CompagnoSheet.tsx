// ============================================================================
// «Nuovo compagno» (UX §5 F7). Un campo solo, il nome: è l'unico dato che
// serve per assegnargli tornei e partite. Il colore non si mostra più in UI.
// Nel linguaggio dei moduli (design 15): la barra «Annulla · titolo · Salva».
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react'
import type { CompagnoSheetProps } from '../../app/contracts'
import { Avatar, Button, TextField } from '../ui/index'
import { Sheet, SheetBar } from './Sheet'
import './CompagnoSheet.css'

export default function CompagnoSheet({ onClose, top, byTouch, opener, setDirty, setBusy, onSave }: CompagnoSheetProps) {
  const formId = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [busy, setOccupato] = useState(false)
  const [errore, setErrore] = useState(false)
  const vuoto = name.trim() === ''

  useEffect(() => {
    setDirty(!vuoto)
  }, [vuoto, setDirty])

  const salva = async () => {
    if (busy) return
    if (vuoto) {
      setErrore(true)
      campo.current?.focus()
      return
    }
    setOccupato(true)
    setBusy(true)
    const ok = await onSave(name.trim())
    setOccupato(false)
    setBusy(false)
    // Se è andata la shell chiude lo sheet; se no restano i dati (e il Toast).
    if (!ok) campo.current?.focus()
  }

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={!vuoto}
      busy={busy}
      scroll={false}
      header={
        <SheetBar
          title="Nuovo compagno"
          onCancel={onClose}
          cancelBusy={busy}
          action={
            <Button
              type="submit"
              form={formId}
              variant="filled"
              disabled={vuoto}
              onDisabledClick={() => void salva()}
              busy={busy}
              busyLabel="Salvataggio…"
            >
              Salva
            </Button>
          }
        />
      }
    >
      <form
        id={formId}
        className="compagno-sheet-form"
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        <div className="compagno-sheet-row">
          <Avatar name={name || '?'} size={48} />
          <TextField
            ref={campo}
            className="compagno-sheet-field"
            label="Nome"
            value={name}
            onChange={(v) => {
              setName(v)
              if (v.trim()) setErrore(false)
            }}
            placeholder="es. Giulia"
            autoComplete="off"
            maxLength={40}
            readOnly={busy}
            enterKeyHint="done"
            error={errore && vuoto ? 'Scrivi il nome del compagno.' : undefined}
          />
        </div>
        <p className="compagno-sheet-nota">Aggiungi una persona con cui giochi: potrai assegnarle i tornei e le partite.</p>
      </form>
    </Sheet>
  )
}
