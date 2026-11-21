// ============================================================================
// «La tua società» (Campionato per Società): il nome della società e la
// classifica di un'iscrizione. Si apre da «Cambia» nella pagina del
// Campionato; la prima iscrizione invece nasce con la prima tappa della
// stagione (TappaSheet), senza un passo in più.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetBar, SheetChips } from './Sheet'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { GENERE } from '../../lib/campionato'
import type { Genere } from '../../lib/campionato'
import { LIMITI } from '../../lib/lunghezze'
import type { IscrizioneSheetProps } from '../../app/contracts'

const CLUB_MANCANTE = 'Scrivi la tua società.'

export default function IscrizioneSheet({ iscrizione, onSave, onClose, top, byTouch, opener, setDirty, setBusy }: IscrizioneSheetProps) {
  const [club, setClub] = useState(iscrizione.club)
  const [gender, setGender] = useState<Genere>(iscrizione.gender)
  const [errore, setErrore] = useState('')
  const [occupato, setOccupato] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const sporco = club !== iscrizione.club || gender !== iscrizione.gender
  useEffect(() => {
    setDirty(sporco)
  }, [sporco, setDirty])

  const corto = [...club.trim()].length < LIMITI.societa.min
  const manca = () => {
    setErrore(CLUB_MANCANTE)
    campo.current?.focus()
  }

  const salva = async () => {
    if (occupato) return
    if (corto) {
      manca()
      return
    }
    setOccupato(true)
    setBusy(true)
    try {
      await onSave({ club: club.trim(), gender })
    } finally {
      setOccupato(false)
      setBusy(false)
    }
  }

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={sporco}
      busy={occupato}
      header={
        <SheetBar
          title="La tua società"
          sub={`Stagione ${iscrizione.season}`}
          onCancel={onClose}
          cancelBusy={occupato}
          action={
            <Button variant="filled" disabled={corto} onDisabledClick={manca} busy={occupato} busyLabel="Salvataggio…" onClick={() => void salva()}>
              Salva
            </Button>
          }
        />
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void salva()
        }}
      >
        <fieldset className="ui-sheet-stack" disabled={occupato} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
          <TextField
            ref={campo}
            label="Società"
            value={club}
            onChange={(v) => {
              setClub(v)
              if (errore) setErrore('')
            }}
            autoComplete="off"
            maxLength={LIMITI.societa.max}
            required
            aria-required="true"
            error={errore || undefined}
            hint="Vale per tutte le tappe di questa stagione."
          />
          <SheetChips
            label="Classifica"
            options={(['F', 'M'] as Genere[]).map((g) => ({ value: g, label: GENERE[g] }))}
            value={gender}
            onChange={(v) => v && setGender(v as Genere)}
          />
        </fieldset>
      </form>
    </Sheet>
  )
}
