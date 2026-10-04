// ============================================================================
// Il campo "Tabellone" del form torneo: facoltativo, con "Nessuno" come valore
// vuoto, e scrive nel form la chiave `bracket` che `useDiary` porta a DB.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TorneoModal from './TorneoModal'
import { BRACKETS } from '../../lib/db.enums'
import type { AnyForm } from '../../lib/models'

function renderModal(form: AnyForm = {}) {
  const setField = vi.fn()
  render(
    <TorneoModal
      form={form} editId={null} setField={setField}
      partnerOptions={[]} canAddPartner venues={[]}
      onMergeVenues={async () => true}
      onClose={() => {}} onSave={() => {}} onDelete={() => {}}
    />,
  )
  return { setField, select: screen.getByLabelText('Tabellone') as HTMLSelectElement }
}

describe('TorneoModal — tabellone', () => {
  it('propone Nessuno più ogni tabellone di BRACKETS, con Nessuno di default', () => {
    const { select } = renderModal({ bracket: '' })
    expect([...select.options].map((o) => o.text)).toEqual(['— Nessuno —', ...BRACKETS])
    expect(select.value).toBe('')
  })

  it('in modifica mostra il tabellone salvato', () => {
    const { select } = renderModal({ bracket: 'Silver' })
    expect(select.value).toBe('Silver')
  })

  it('scegliere un tabellone lo scrive nel form', () => {
    const { select, setField } = renderModal({ bracket: '' })
    fireEvent.change(select, { target: { value: 'Gold' } })
    expect(setField).toHaveBeenCalledWith('bracket', 'Gold')
  })

  it('tornare a Nessuno lo svuota', () => {
    const { select, setField } = renderModal({ bracket: 'Bronze' })
    fireEvent.change(select, { target: { value: '' } })
    expect(setField).toHaveBeenCalledWith('bracket', '')
  })
})
