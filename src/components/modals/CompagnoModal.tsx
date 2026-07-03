import type { ChangeEvent } from 'react'
import { Sheet, Title, Label, inputStyle, Actions } from './Sheet'
import type { AnyForm, SetField } from '../../lib/models'

interface CompagnoModalProps {
  form: AnyForm
  setField: SetField
  onClose: () => void
  onSave: () => void
}

export default function CompagnoModal({ form, setField, onClose, onSave }: CompagnoModalProps) {
  const initial = (form.name || '').trim()[0]?.toUpperCase() || '?'
  return (
    <Sheet maxWidth={460} scroll={false} onClose={onClose}>
      <Title>Nuovo compagno</Title>
      <div style={{ font: "600 12.5px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', margin: '-12px 0 16px' }}>Aggiungi un socio con cui giochi — potrai poi assegnargli le partite.</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "600 24px 'Space Grotesk'", color: '#fff', flex: 'none' }}>{initial}</div>
        <div style={{ flex: 1 }}>
          <Label>Nome</Label>
          <input value={form.name || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)} placeholder="es. Giulia" style={inputStyle} />
        </div>
      </div>

      <Actions onCancel={onClose} onSave={onSave} />
    </Sheet>
  )
}
