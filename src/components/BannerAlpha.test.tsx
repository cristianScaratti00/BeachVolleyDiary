// ============================================================================
// Banner alpha. Poco codice, ma due cose che non devono rompersi: che l'avviso
// dica davvero che l'app può avere bug, e che la CTA porti da qualche parte —
// un avviso senza via d'uscita è solo una scusa preventiva.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BannerAlpha from './BannerAlpha'
import { expectNoA11yViolations } from '../test/axe'

describe('BannerAlpha', () => {
  it('dichiara la versione alpha e il rischio di malfunzionamenti', () => {
    render(<BannerAlpha onSegnala={vi.fn()} />)
    expect(screen.getByText(/versione alpha/i)).toBeInTheDocument()
    expect(screen.getByText(/qualcosa può non funzionare/i)).toBeInTheDocument()
  })

  it('la CTA apre la segnalazione', async () => {
    const user = userEvent.setup()
    const onSegnala = vi.fn()
    render(<BannerAlpha onSegnala={onSegnala} />)
    await user.click(screen.getByRole('button', { name: /Segnala un problema/i }))
    expect(onSegnala).toHaveBeenCalledOnce()
  })

  it('non ha violazioni di accessibilità', async () => {
    const { container } = render(<BannerAlpha onSegnala={vi.fn()} />)
    await expectNoA11yViolations(container)
  })
})
