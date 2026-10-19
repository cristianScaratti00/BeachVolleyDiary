// ============================================================================
// La rotta `/wrapped` (UX §6.5): quando il recap non c'è non si mostra una
// pagina vuota ma lo stato «in arrivo», con il motivo e un [Ho capito] vero.
// Beach Wrapped c'è solo a ottobre: fuori mese il motivo è «stagione».
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Wrapped from './Wrapped'
import { expectNoA11yViolations } from '../test/axe'

vi.mock('html-to-image', () => ({ toPng: vi.fn(), toBlob: vi.fn() }))

function renderNonDisponibile(motivo: 'stagione' | 'dati') {
  const onClose = vi.fn()
  const view = render(<Wrapped wrapped={null} motivo={motivo} onClose={onClose} onNotice={vi.fn()} />)
  return { ...view, onClose }
}

describe('Wrapped — non disponibile', () => {
  it('fuori da ottobre dice quando arriva (solo a ottobre)', () => {
    renderNonDisponibile('stagione')
    expect(screen.getByRole('dialog', { name: 'Beach Wrapped' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Beach Wrapped in arrivo' })).toBeInTheDocument()
    expect(screen.getByText('Beach Wrapped arriva a ottobre: torna a trovarci allora.')).toBeInTheDocument()
  })

  it('Pallo accompagna il messaggio: saluta fuori mese, sbircia se mancano le partite (decorativo)', () => {
    const { container, unmount } = renderNonDisponibile('stagione')
    expect(container.ownerDocument.querySelector('.pallo')).toHaveAttribute('data-umore', 'saluta')
    expect(container.ownerDocument.querySelector('.pallo')).toHaveAttribute('aria-hidden', 'true')
    unmount()
    renderNonDisponibile('dati')
    expect(document.querySelector('.pallo')).toHaveAttribute('data-umore', 'sbircia')
  })

  it('con pochi dati dice che servono partite', () => {
    renderNonDisponibile('dati')
    expect(screen.getByText(/Servono almeno qualche partita in questo periodo/)).toBeInTheDocument()
  })

  it('«Ho capito» è un pulsante vero che chiude', async () => {
    const user = userEvent.setup()
    const { onClose } = renderNonDisponibile('stagione')
    await user.click(screen.getByRole('button', { name: 'Ho capito' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('anche il ✕ chiude, e il focus parte da lì', async () => {
    const user = userEvent.setup()
    const { onClose } = renderNonDisponibile('dati')
    const x = screen.getByRole('button', { name: 'Chiudi' })
    expect(x).toHaveFocus()
    await user.click(x)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('nessuna slide sfogliabile', () => {
    renderNonDisponibile('dati')
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('nessuna violazione axe', async () => {
    const { container } = renderNonDisponibile('stagione')
    await expectNoA11yViolations(container)
  })
})
