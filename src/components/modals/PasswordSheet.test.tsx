// ============================================================================
// «Cambia password»: dialogo con titolo, due campi con etichetta, stato
// occupato sul pulsante ed errore in linea. La regola sta in lib/auth.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordSheet from './PasswordSheet'
import type { PasswordSheetProps } from '../../app/contracts'
import { expectNoA11yViolations } from '../../test/axe'

function renderSheet(over: Partial<PasswordSheetProps> = {}) {
  const props: PasswordSheetProps = {
    onClose: vi.fn(),
    top: true,
    byTouch: false,
    opener: null,
    setDirty: vi.fn(),
    setBusy: vi.fn(),
    onSave: vi.fn().mockResolvedValue({ ok: true }),
    ...over,
  }
  return { ...render(<PasswordSheet {...props} />), props }
}

describe('PasswordSheet', () => {
  it('è un dialogo col suo titolo; il focus va al primo campo', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Cambia password' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nuova password')).toHaveFocus()
  })

  it('il modulo sporco lo dice alla shell', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByLabelText('Nuova password'), 'a')
    expect(props.setDirty).toHaveBeenLastCalledWith(true)
  })

  it('salvando: occupato; un errore resta in linea e i campi restano', async () => {
    const user = userEvent.setup()
    let fine: (v: { ok: boolean; error?: string }) => void = () => {}
    const onSave = vi.fn(() => new Promise<{ ok: boolean; error?: string }>((r) => { fine = r }))
    const { props } = renderSheet({ onSave })
    await user.type(screen.getByLabelText('Nuova password'), 'segreta')
    await user.type(screen.getByLabelText('Conferma'), 'segretx')
    await user.click(screen.getByRole('button', { name: 'Aggiorna password' }))
    expect(onSave).toHaveBeenCalledWith('segreta', 'segretx')
    expect(screen.getByRole('button', { name: 'Salvataggio…' })).toHaveAttribute('aria-busy', 'true')
    expect(props.setBusy).toHaveBeenLastCalledWith(true)
    await act(async () => fine({ ok: false, error: 'Le due password non coincidono.' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le due password non coincidono.')
    expect(screen.getByLabelText('Conferma')).toHaveValue('segretx')
  })

  it('a campi vuoti il pulsante è disattivo e porta al campo che manca', async () => {
    const user = userEvent.setup()
    const { props } = renderSheet()
    await user.type(screen.getByLabelText('Nuova password'), 'segreta')
    const b = screen.getByRole('button', { name: 'Aggiorna password' })
    expect(b).toHaveAttribute('aria-disabled', 'true')
    await user.click(b)
    expect(props.onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Conferma')).toHaveFocus()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderSheet()
    await expectNoA11yViolations(container)
  })
})
