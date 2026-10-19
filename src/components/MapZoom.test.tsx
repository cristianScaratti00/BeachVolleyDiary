// ============================================================================
// I pulsanti +/− sopra le mappe (ART_DIRECTION §10.3): nomi in italiano,
// bersaglio da IconButton, al limite dello zoom restano ma non agiscono.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapZoom } from './MapZoom'
import { expectNoA11yViolations } from '../test/axe'

describe('MapZoom', () => {
  it('un gruppo con «Ingrandisci» e «Riduci» che chiamano le azioni', async () => {
    const user = userEvent.setup()
    const onIn = vi.fn()
    const onOut = vi.fn()
    render(<MapZoom onIn={onIn} onOut={onOut} />)
    // Il vetro è uno strato liquido dentro il gruppo (LiquidGlass), decorativo.
    const gruppo = screen.getByRole('group', { name: 'Zoom della mappa' })
    expect(gruppo.querySelector(':scope > .ui-liquid')).toHaveAttribute('aria-hidden', 'true')
    await user.click(screen.getByRole('button', { name: 'Ingrandisci' }))
    await user.click(screen.getByRole('button', { name: 'Riduci' }))
    expect(onIn).toHaveBeenCalledTimes(1)
    expect(onOut).toHaveBeenCalledTimes(1)
  })

  it('al limite il pulsante resta raggiungibile ma non agisce', async () => {
    const user = userEvent.setup()
    const onIn = vi.fn()
    render(<MapZoom onIn={onIn} onOut={vi.fn()} canIn={false} />)
    const piu = screen.getByRole('button', { name: 'Ingrandisci' })
    expect(piu).toHaveAttribute('aria-disabled', 'true')
    await user.click(piu)
    expect(onIn).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Riduci' })).not.toHaveAttribute('aria-disabled')
  })

  it('nessuna violazione axe', async () => {
    const { container } = render(<MapZoom onIn={vi.fn()} onOut={vi.fn()} canOut={false} />)
    await expectNoA11yViolations(container)
  })
})
