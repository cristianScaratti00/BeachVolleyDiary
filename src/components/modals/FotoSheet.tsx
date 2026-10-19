// ============================================================================
// «Aggiungi foto» (UX §5 F5, MOTION.md §5 F5 e §7). Sostituisce FotoModal.
//
// - La dropzone è un `<button>` vero che apre il selettore di file: era un
//   `div`, e da tastiera non si raggiungeva.
// - Scelto il file c'è SUBITO l'anteprima locale (object URL), al 60% mentre
//   carica con «Carico…»; durante il caricamento lo sheet non si chiude.
// - Errori in linea, `role="alert"`: formato non immagine, oltre 5 MB.
// - La barra dei moduli in cima (design 15): «Annulla · Aggiungi foto ·
//   Aggiungi», con il nome del torneo sotto il titolo.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { FotoSheetProps } from '../../app/contracts'
import { SWATCH_COLORS } from '../../lib/theme'
import { Sheet, SheetBar } from './Sheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TextField } from '../ui/Field'
import './FotoSheet.css'

const MAX_MB = 5

export default function FotoSheet({ tournamentId, tournamentName, onSave, onClose, top, byTouch, opener, setDirty, setBusy }: FotoSheetProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [caption, setCaption] = useState('')
  const [err, setErr] = useState('')
  const [busy, setLocalBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLButtonElement>(null)

  // L'object URL dell'anteprima si revoca quando cambia e allo smontaggio.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    setDirty(!!file || caption.trim() !== '')
  }, [file, caption, setDirty])

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // si può riscegliere lo stesso file
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErr('Questo file non è un\'immagine: scegli una foto JPG, PNG o WEBP.')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`La foto supera i ${MAX_MB} MB: scegline una più leggera.`)
      return
    }
    setErr('')
    setPreview(URL.createObjectURL(f))
    setFile(f)
  }

  const save = async () => {
    if (busy) return
    if (!file) {
      setErr('Scegli una foto dal dispositivo.')
      dropRef.current?.focus()
      return
    }
    setLocalBusy(true)
    setBusy(true)
    try {
      await onSave({ caption: caption.trim(), tournamentId, color: SWATCH_COLORS[0] }, file)
    } finally {
      setLocalBusy(false)
      setBusy(false)
    }
  }

  return (
    <Sheet
      onClose={onClose}
      top={top}
      byTouch={byTouch}
      opener={opener}
      dirty={!!file || caption.trim() !== ''}
      busy={busy}
      header={
        <SheetBar
          title="Aggiungi foto"
          sub={tournamentName || undefined}
          onCancel={onClose}
          cancelBusy={busy}
          action={
            <Button
              variant="filled"
              busy={busy}
              busyLabel="Carico…"
              disabled={!file}
              onDisabledClick={() => {
                setErr('Scegli una foto dal dispositivo.')
                dropRef.current?.focus()
              }}
              onClick={() => void save()}
            >
              Aggiungi
            </Button>
          }
        />
      }
    >
      <div className="ui-sheet-stack">
        <button
          ref={dropRef}
          type="button"
          className="foto-sheet-drop"
          data-has-preview={preview ? '' : undefined}
          data-busy={busy ? '' : undefined}
          aria-describedby="foto-sheet-formati"
          onClick={() => {
            if (!busy) inputRef.current?.click()
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="" className="foto-sheet-preview" />
              <span className="foto-sheet-change">{busy ? 'Carico…' : 'Cambia foto'}</span>
            </>
          ) : (
            <span className="foto-sheet-empty">
              <Icon name="camera" size={24} />
              <span className="foto-sheet-cta">Scegli una foto</span>
            </span>
          )}
        </button>
        <p id="foto-sheet-formati" className="foto-sheet-hint">JPG, PNG o WEBP · massimo {MAX_MB} MB</p>
        {err && (
          <p className="ui-field-error" role="alert">
            <Icon name="alert" size={16} />
            <span>{err}</span>
          </p>
        )}
        <TextField
          label="Didascalia (facoltativa)"
          value={caption}
          onChange={setCaption}
          placeholder="es. Esultanza dopo la finale"
          readOnly={busy}
          maxLength={120}
        />
        {/* Il selettore di file vero è nascosto: lo apre la dropzone. Sta in
            fondo perché il focus iniziale dello sheet va al primo campo. */}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      </div>
    </Sheet>
  )
}
