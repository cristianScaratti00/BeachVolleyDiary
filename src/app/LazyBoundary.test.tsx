// ============================================================================
// Un'area lazy che non arriva (UX §6.0): l'app non cade, l'area dice «Questa
// parte non si è caricata.» e [Riprova] rifà davvero l'import — React.lazy
// ricorda la promessa rifiutata, per questo c'è `lazyRetry`.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyBoundary, lazyRetry } from './LazyBoundary'

function Area() {
  return <p>Il diario è arrivato</p>
}

describe('LazyBoundary + lazyRetry', () => {
  it('il chunk che fallisce mostra l\'errore locale; Riprova lo ricarica e l\'area compare', async () => {
    const user = userEvent.setup()
    // console.error: React e il boundary lo usano per dire che l'area non è arrivata.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let tentativi = 0
    const Pigro = lazyRetry<object>(() => {
      tentativi += 1
      return tentativi === 1 ? Promise.reject<{ default: typeof Area }>(new Error('chunk')) : Promise.resolve({ default: Area })
    })
    render(
      <main>
        <h1>Tornei</h1>
        <LazyBoundary onReset={Pigro.reset}>
          <Suspense fallback={<p>Carico…</p>}>
            <Pigro />
          </Suspense>
        </LazyBoundary>
      </main>,
    )
    expect(await screen.findByRole('heading', { name: 'Questa parte non si è caricata.' })).toBeInTheDocument()
    // Il resto della pagina c'è ancora.
    expect(screen.getByRole('heading', { level: 1, name: 'Tornei' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Il diario è arrivato')).toBeInTheDocument()
    expect(tentativi).toBe(2)
  })
})
