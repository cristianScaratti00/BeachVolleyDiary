import type { CSSProperties, ChangeEvent } from 'react'
import { Sheet, Title, Label, inputStyle, selectStyle, Actions } from './Sheet'
import { SWATCH_COLORS } from '../../lib/theme'
import type { AnyForm, SetField, Option, Category, Format, Surface, Placement } from '../../lib/models'

const fieldWrap: CSSProperties = { flex: 1, minWidth: 130 }
const nameStyle: CSSProperties = { ...inputStyle, font: "700 15px 'Nunito Sans'" }

interface TorneoModalProps {
  form: AnyForm
  editId: string | null
  setField: SetField
  partnerOptions: Option[]
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export default function TorneoModal({ form, editId, setField, partnerOptions, onClose, onSave, onDelete }: TorneoModalProps) {
  return (
    <Sheet onClose={onClose}>
      <Title>{editId ? 'Modifica torneo' : 'Nuovo torneo'}</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Nome torneo</Label>
          <input value={form.name || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)} placeholder="es. Summer Cup Rimini" style={nameStyle} />
        </div>

        <div>
          <Label>Con chi lo hai fatto</Label>
          <select value={form.partnerId || ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('partnerId', e.target.value)} style={selectStyle}>
            <option value="">— Nessuno —</option>
            {partnerOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="new">＋ Nuovo compagno</option>
          </select>
          {form.partnerId === 'new' && (
            <input value={form.newPartnerName || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('newPartnerName', e.target.value)} placeholder="Nome nuovo compagno" style={{ ...inputStyle, marginTop: 8 }} />
          )}
          {editId && (
            <div style={{ font: "600 11.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginTop: 6 }}>
              Cambiandolo, il compagno viene aggiornato su tutte le partite del torneo.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={fieldWrap}>
            <Label>Data</Label>
            <input type="date" value={form.date || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('date', e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <Label>Città</Label>
            <input value={form.city || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('city', e.target.value)} placeholder="es. Rimini" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={fieldWrap}>
            <Label>Categoria</Label>
            <select value={form.category || 'Amatoriale'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('category', e.target.value as Category)} style={selectStyle}>
              <option>Amatoriale</option><option>Open</option><option>Serie</option><option>Pro</option><option>King</option><option>Queen</option>
            </select>
          </div>
          <div style={fieldWrap}>
            <Label>Formato</Label>
            <select value={form.format || '2vs2'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('format', e.target.value as Format)} style={selectStyle}>
              <option>2vs2</option><option>3vs3</option><option>4vs4</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={fieldWrap}>
            <Label>Superficie</Label>
            <select value={form.surface || 'Sabbia outdoor'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('surface', e.target.value as Surface)} style={selectStyle}>
              <option>Sabbia outdoor</option><option>Indoor</option><option>Erba</option>
            </select>
          </div>
          <div style={fieldWrap}>
            <Label>Piazzamento</Label>
            <select value={form.placement || 'Gironi'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('placement', e.target.value as Placement)} style={selectStyle}>
              <option>1° 🏆</option><option>2°</option><option>3°</option><option>Semifinale</option><option>Quarti</option><option>Ottavi</option><option>Gironi</option><option>In corso</option>
            </select>
          </div>
        </div>

        <div>
          <Label mb={8}>Etichetta colore</Label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SWATCH_COLORS.map((col) => (
              <div key={col} onClick={() => setField('color', col)} style={{ width: 38, height: 38, borderRadius: '50%', background: col, cursor: 'pointer', border: `3px solid ${form.color === col ? '#1B2A4A' : 'transparent'}` }} />
            ))}
          </div>
        </div>
      </div>

      <Actions onDelete={editId ? onDelete : null} onCancel={onClose} onSave={onSave} />
    </Sheet>
  )
}
