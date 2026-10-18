// ============================================================================
// Banner alpha (UX §14.1, Q5). Poco codice, ma tre cose che non devono
// rompersi: che l'avviso dica davvero che l'app può avere bug, che porti da
// qualche parte (un avviso senza via d'uscita è solo una scusa preventiva), e
// che si possa chiudere con un pulsante vero.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BannerAlpha from './BannerAlpha'
import { __resetRouterForTests } from '../app/router'
import { expectNoA11yViolations } from '../test/axe'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  __resetRouterForTests()
})

describe('BannerAlpha', () => {
  it('dichiara la versione alpha e il rischio di malfunzionamenti', () => {
    render(<BannerAlpha onChiudi={vi.fn()} />)
    expect(screen.getByText(/versione alpha/i)).toBeInTheDocument()
    expect(screen.getByText(/qualcosa può non funzionare/i)).toBeInTheDocument()
  })

  it('«Segnala un problema» è un link vero verso /profilo/segnala', async () => {
    const user = userEvent.setup()
    render(<BannerAlpha onChiudi={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'Segnala un problema' })
    expect(link).toHaveAttribute('href', '/profilo/segnala')
    await user.click(link)
    expect(window.location.pathname).toBe('/profilo/segnala')
  })

  it('si chiude con un button vero, anche da tastiera', async () => {
    const user = userEvent.setup()
    const onChiudi = vi.fn()
    render(<BannerAlpha onChiudi={onChiudi} />)
    const chiudi = screen.getByRole('button', { name: 'Chiudi avviso alpha' })
    chiudi.focus()
    await user.keyboard('{Enter}')
    expect(onChiudi).toHaveBeenCalledOnce()
  })

  it('non ha violazioni di accessibilità', async () => {
    const { container } = render(<BannerAlpha onChiudi={vi.fn()} />)
    await expectNoA11yViolations(container)
  })
})
