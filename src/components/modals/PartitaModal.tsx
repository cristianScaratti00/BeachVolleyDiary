import type { CSSProperties, ChangeEvent } from 'react'
import { Sheet, Title, Label, inputStyle, selectStyle, Actions } from './Sheet'
import type { AnyForm, SetField, SetsApi, Option, Phase } from '../../lib/models'

const setInput: CSSProperties = { flex: 1, minWidth: 0, border: '1px solid rgba(27,42,74,.16)', borderRadius: 10, padding: 11, font: "600 16px 'Space Grotesk'", textAlign: 'center', background: '#fff' }
const noteStyle: CSSProperties = { ...inputStyle, font: "600 14px 'Nunito Sans'", minHeight: 60, resize: 'vertical' }

interface PartitaModalProps {
  form: AnyForm
  editId: string | null
  setField: SetField
  tournOptions: Option[]
  sets: SetsApi
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export default function PartitaModal({ form, editId, setField, tournOptions, sets, onClose, onSave, onDelete }: PartitaModalProps) {
  const { rows, canAdd, addSet, updateSet, removeSet } = sets
  return (
    <Sheet onClose={onClose}>
      <Title>{editId ? 'Modifica partita' : 'Nuova partita'}</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Torneo</Label>
          <select value={form.tournamentId || ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('tournamentId', e.target.value)} style={selectStyle}>
            {tournOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        <div>
          <Label>Fase</Label>
          <select value={form.phase || 'Girone'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('phase', e.target.value as Phase)} style={selectStyle}>
            <option>Girone</option><option>Ottavi</option><option>Quarti</option><option>Semifinale</option><option>Finale</option>
          </select>
          <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', marginTop: 6 }}>Il compagno è quello del torneo.</div>
        </div>

        <div>
          <Label>Avversari (coppia)</Label>
          <input value={form.opponents || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('opponents', e.target.value)} placeholder="es. Bianchi / Verdi" style={inputStyle} />
        </div>

        <div>
          <Label mb={8}>Punteggio per set</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((st, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="lbl" style={{ width: 42 }}>Set {i + 1}</div>
                <input type="number" value={st.us} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSet(i, 'us', e.target.value)} placeholder="21" style={setInput} />
                <div className="num" style={{ fontSize: 15, color: 'rgba(27,42,74,.3)' }}>–</div>
                <input type="number" value={st.them} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSet(i, 'them', e.target.value)} placeholder="18" style={setInput} />
                {rows.length > 1 && <div onClick={() => removeSet(i)} style={{ font: "700 18px 'Nunito Sans'", color: 'rgba(27,42,74,.3)', cursor: 'pointer', padding: '0 4px' }}>×</div>}
              </div>
            ))}
          </div>
          {canAdd && <div className="chip" onClick={addSet} style={{ font: "700 13px 'Nunito Sans'", color: '#FF6B35', cursor: 'pointer', marginTop: 10 }}>＋ Aggiungi set</div>}
        </div>

        <div>
          <Label>Note</Label>
          <textarea value={form.note || ''} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('note', e.target.value)} placeholder="Com'è andata?" style={noteStyle} />
        </div>
      </div>

      <Actions onDelete={editId ? onDelete : null} onCancel={onClose} onSave={onSave} />
    </Sheet>
  )
}
