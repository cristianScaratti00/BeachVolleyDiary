// ============================================================================
// «Collega a un utente» (UX §6.6): sotto le tre lettere non si interroga, poi
// «Cerco…», «Nessun utente trovato.», i risultati come pulsanti, l'errore in
// linea (role=alert) con i risultati ancora lì per riprovare.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CollegaSheet from './CollegaSheet'
import type { AppUser } from '../../lib/models'
import { expectNoA11yViolations } from '../../test/axe'

const MARTA: AppUser = { id: 'u1', name: 'Marta', email: 'marta@example.com' }

type Props = Parameters<typeof CollegaSheet>[0]

function renderSheet(over: Partial<Props> = {}) {
  const fns = {
    onClose: vi.fn(),
    setDirty: vi.fn(),
    setBusy: vi.fn(),
    onSearch: vi.fn().mockResolvedValue([MARTA]),
    onLink: vi.fn().mockResolvedValue({ ok: true }),
  }
  const view = render(
    <CollegaSheet
      top
      byTouch={false}
      opener={null}
      partnerName="Giulia"
      onClose={fns.onClose}
      setDirty={fns.setDirty}
      setBusy={fns.setBusy}
      onSearch={fns.onSearch}
      onLink={fns.onLink}
      {...over}
    />,
  )
  return { ...view, ...fns }
}

describe('CollegaSheet', () => {
  it('è un dialogo col nome del compagno, e il focus va al campo di ricerca', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Collega «Giulia» a un utente' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Cerca un utente' })).toHaveFocus()
  })

  it('sotto le tre lettere non interroga e spiega perché', async () => {
    const user = userEvent.setup()
    const { onSearch } = renderSheet()
    await user.type(screen.getByRole('searchbox', { name: 'Cerca un utente' }), 'ma')
    expect(screen.getByRole('status')).toHaveTextContent('Scrivi almeno 3 lettere del nome.')
    await new Promise((r) => setTimeout(r, 350))
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('cerca, poi mostra i risultati come pulsanti; il clic collega quell\'utente', async () => {
    const user = userEvent.setup()
    const { onSearch, onLink, setBusy } = renderSheet()
    await user.type(screen.getByRole('searchbox', { name: 'Cerca un utente' }), 'mar')
    expect(screen.getByRole('status')).toHaveTextContent('Cerco…')
    const riga = await screen.findByRole('button', { name: /Marta.*marta@example\.com.*Collega/ })
    expect(onSearch).toHaveBeenCalledWith('mar')
    await user.click(riga)
    expect(onLink).toHaveBeenCalledExactlyOnceWith('u1')
    expect(setBusy).toHaveBeenCalledWith(true)
    await waitFor(() => expect(setBusy).toHaveBeenLastCalledWith(false))
  })

  it('nessun risultato: lo dice', async () => {
    const user = userEvent.setup()
    renderSheet({ onSearch: vi.fn().mockResolvedValue([]) })
    await user.type(screen.getByRole('searchbox', { name: 'Cerca un utente' }), 'zzz')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nessun utente trovato.'))
  })

  it('collegamento fallito: errore in linea, i risultati restano per riprovare', async () => {
    const user = userEvent.setup()
    renderSheet({ onLink: vi.fn().mockResolvedValue({ ok: false }) })
    await user.type(screen.getByRole('searchbox', { name: 'Cerca un utente' }), 'mar')
    await user.click(await screen.findByRole('button', { name: /Marta/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Collegamento non riuscito.')
    expect(screen.getByRole('button', { name: /Marta/ })).toBeInTheDocument()
  })

  it('nessuna violazione axe con i risultati', async () => {
    const user = userEvent.setup()
    const { container } = renderSheet()
    await user.type(screen.getByRole('searchbox', { name: 'Cerca un utente' }), 'mar')
    await screen.findByRole('button', { name: /Marta/ })
    await expectNoA11yViolations(container)
  })
})
