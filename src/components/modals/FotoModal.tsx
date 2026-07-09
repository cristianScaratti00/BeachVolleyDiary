import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Sheet, Label, inputStyle, selectStyle, Actions } from './Sheet'
import type { AnyForm, SetField, Option } from '../../lib/models'

interface FotoModalProps {
  form: AnyForm
  setField: SetField
  tournOptions: Option[]
  onClose: () => void
  onSave: (file: File | null) => void
  // Quando valorizzato, la foto è legata a questo torneo e il campo è di sola lettura
  // (caso "aggiungi foto dal dettaglio torneo").
  lockTournamentName?: string
}

const MAX_MB = 5

export default function FotoModal({ form, setField, tournOptions, onClose, onSave, lockTournamentName }: FotoModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [err, setErr] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Revoca l'object URL dell'anteprima quando cambia o allo smontaggio.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('Seleziona un file immagine.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`Immagine troppo grande (max ${MAX_MB} MB).`); return }
    setErr('')
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
    setFile(f)
  }

  const save = () => {
    if (!file) { setErr('Seleziona una foto dal dispositivo.'); return }
    onSave(file)
  }

  return (
    <Sheet maxWidth={460} scroll={false} onClose={onClose}>
      <div className="num" style={{ fontSize: 21, fontWeight: 500, marginBottom: 4 }}>Aggiungi foto</div>
      <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginBottom: 16 }}>Carica un'immagine dal dispositivo e collegala al torneo.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />

        {/* dropzone / anteprima */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{ position: 'relative', borderRadius: 14, border: `2px dashed ${preview ? 'transparent' : 'rgba(27,42,74,.22)'}`, background: preview ? '#000' : '#fff', minHeight: 168, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {preview ? (
            <>
              <img src={preview} alt="Anteprima" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', bottom: 10, right: 10, font: "700 11px 'Nunito Sans'", background: 'rgba(0,0,0,.55)', color: '#fff', padding: '6px 11px', borderRadius: 9 }}>Cambia foto</div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF1EA', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "300 28px 'Space Grotesk'", margin: '0 auto 10px' }}>＋</div>
              <div style={{ font: "700 13.5px 'Nunito Sans'", color: '#1B2A4A' }}>Scegli una foto</div>
              <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.45)', marginTop: 3 }}>JPG, PNG o WEBP · max {MAX_MB} MB</div>
            </div>
          )}
        </div>

        <div>
          <Label>Didascalia <span style={{ font: "600 11px 'Nunito Sans'", color: 'rgba(27,42,74,.4)' }}>(facoltativa)</span></Label>
          <input value={form.caption || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('caption', e.target.value)} placeholder="es. Esultanza dopo la finale" style={inputStyle} />
        </div>

        <div>
          <Label>Torneo</Label>
          {lockTournamentName ? (
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'rgba(27,42,74,.6)', background: '#F2F0EC' }}>{lockTournamentName}</div>
          ) : (
            <select value={form.tournamentId || ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tournamentId', e.target.value)} style={selectStyle}>
              {tournOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>

        {err && <div style={{ font: "700 12px 'Nunito Sans'", color: '#FF477E' }}>{err}</div>}
      </div>

      <Actions onCancel={onClose} onSave={save} saveLabel="Carica" />
    </Sheet>
  )
}
