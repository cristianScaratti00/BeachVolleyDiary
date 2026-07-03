import type { ChangeEvent } from 'react'
import { Sheet, Title, Label, inputStyle, selectStyle, Actions } from './Sheet'
import { CATEGORIES, PLACEMENTS } from '../../lib/db.enums'
import type { AnyForm, SetField, Option, Category, Placement } from '../../lib/models'

interface QuickTorneoModalProps {
  form: AnyForm
  setField: SetField
  partnerOptions: Option[]
  onClose: () => void
  onSave: () => void
}

// Creazione rapida: solo i campi essenziali (nome, compagno, data, categoria,
// piazzamento). Formato 2vs2 e superficie "Sabbia outdoor" sono i default più
// comuni, quindi fissi e non richiesti — si cambiano poi da "Modifica".
export default function QuickTorneoModal({ form, setField, partnerOptions, onClose, onSave }: QuickTorneoModalProps) {
  const isNewPartner = form.partnerId === 'new'
  return (
    <Sheet onClose={onClose} maxWidth={460}>
      <Title>Torneo rapido</Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label>Nome torneo</Label>
          <input value={form.name || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)} placeholder="es. Summer Cup Rimini" style={inputStyle} />
        </div>

        <div>
          <Label>Con chi lo hai fatto</Label>
          <select value={form.partnerId || ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('partnerId', e.target.value)} style={selectStyle}>
            {partnerOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="new">＋ Nuovo compagno</option>
          </select>
        </div>
        {isNewPartner && (
          <div>
            <Label>Nome nuovo compagno</Label>
            <input value={form.newPartnerName || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('newPartnerName', e.target.value)} placeholder="es. Giulia" style={inputStyle} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Data</Label>
            <input type="date" value={form.date || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setField('date', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Categoria</Label>
            <select value={form.category || 'Amatoriale'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('category', e.target.value as Category)} style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label>Piazzamento</Label>
          <select value={form.placement || 'In corso'} onChange={(e: ChangeEvent<HTMLSelectElement>) => setField('placement', e.target.value as Placement)} style={selectStyle}>
            {PLACEMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ font: "600 12px 'Nunito Sans'", color: 'rgba(27,42,74,.5)', background: '#F2F0EC', borderRadius: 9, padding: '9px 12px' }}>
          Formato <b>2vs2</b> · <b>Sabbia outdoor</b> (predefiniti). Puoi cambiarli dopo da “Modifica”.
        </div>
      </div>

      <Actions onCancel={onClose} onSave={onSave} saveLabel="Crea torneo" />
    </Sheet>
  )
}
