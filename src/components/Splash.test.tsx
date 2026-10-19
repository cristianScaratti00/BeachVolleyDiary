// ============================================================================
// Lo splash che non finisce (UX F0): dopo 10s dall'apertura della PAGINA lo
// dice, nella stessa regione live, e offre [Riprova]. Il tempo è quello di
// `performance.now()`: il passaggio da Root ad App non lo fa ripartire.
// ============================================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import Splash, { SPLASH_LENTO_MS } from './Splash'

afterEach(() => {
  vi.useRealTimers()
})

describe('Splash', () => {
  it('annuncia il caricamento, e solo dopo 10s l\'attesa lunga con Riprova', () => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockReturnValue(0)
    render(<Splash />)
    const stato = screen.getByRole('status')
    expect(stato).toHaveTextContent('Caricamento…')
    expect(stato).not.toHaveTextContent('Ci sta mettendo più del solito.')
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(SPLASH_LENTO_MS - 1))
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(stato).toHaveTextContent('Ci sta mettendo più del solito.')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
    // Una regione live sola.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('rimontato a pagina già aperta da più di 10s, lo dice subito (il conto è della pagina)', () => {
    vi.spyOn(performance, 'now').mockReturnValue(SPLASH_LENTO_MS + 500)
    render(<Splash />)
    expect(screen.getByRole('status')).toHaveTextContent('Ci sta mettendo più del solito.')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('a metà attesa, rimontato, aspetta solo quello che manca', () => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockReturnValue(6000)
    render(<Splash />)
    act(() => vi.advanceTimersByTime(SPLASH_LENTO_MS - 6000 - 1))
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })
})
