import type { ChangeEvent } from 'react'
import { Sheet, Label, inputStyle, selectStyle, Actions } from './Sheet'
import { SWATCH_COLORS } from '../../lib/theme'
import type { AnyForm, SetField, Option } from '../../lib/models'

interface FotoModalProps {
  form: AnyForm
  setField: SetField
  tournOptions: Option[]
  onClose: () => void
  onSave: () => void
}

export default function FotoModal({ form, setField, tournOptions, onClose, onSave }: FotoModalProps) {
  return (
    <Sheet maxWidth={460} scroll={false} onClose={onClose}>
      <div className="num" style={{ fontSize: 21, fontWeight: 500, marginBottom: 4 }}>Aggiungi foto</div>
      <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginBottom: 16 }}>Segnaposto colorato — collega un ricordo a un torneo.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Didascalia</Label>
          <input value={form.caption || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('caption', e.target.value)} placeholder="es. Esultanza dopo la finale" style={inputStyle} />
        </div>
        <div>
          <Label>Torneo</Label>
          <select value={form.tournamentId || ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tournamentId', e.target.value)} style={selectStyle}>
            {tournOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label mb={8}>Colore</Label>
          <div style={{ display: 'flex', gap: 10 }}>
            {SWATCH_COLORS.map((col) => (
              <div key={col} onClick={() => setField('color', col)} style={{ width: 42, height: 42, borderRadius: 11, background: col, cursor: 'pointer', border: `3px solid ${form.color === col ? '#1B2A4A' : 'transparent'}` }} />
            ))}
          </div>
        </div>
      </div>

      <Actions onCancel={onClose} onSave={onSave} />
    </Sheet>
  )
}
