// ============================================================================
// Il router e la pila degli overlay sulla history vera di jsdom (UX §4.2,
// §4.3, §14.2): push e replace, indietro con il genitore come ripiego,
// l'indietro che chiude lo sheet invece di cambiare pagina, il modulo sporco
// che chiede prima di perdere i dati, il refresh che non riapre.
// ============================================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  __resetRouterForTests,
  closeOverlay,
  goBack,
  Link,
  navigate,
  openOverlay,
  overlayStack,
  setOverlayFlags,
  useRoute,
} from './router'

function avvia(path = '/') {
  window.history.replaceState(null, '', path)
  __resetRouterForTests()
}

function Dove() {
  const r = useRoute()
  return <p data-testid="rotta">{JSON.stringify(r)}</p>
}

const tornata = () => new Promise<void>((r) => window.addEventListener('popstate', () => r(), { once: true }))

beforeEach(() => avvia('/'))

describe('router — navigazione', () => {
  it('push e indietro tornano alla rotta di prima', async () => {
    render(<Dove />)
    act(() => navigate({ name: 'tornei', vista: 'lista' }))
    expect(window.location.pathname).toBe('/tornei')
    expect(screen.getByTestId('rotta')).toHaveTextContent('"tornei"')
    const pop = tornata()
    act(() => goBack({ name: 'home' }))
    await act(() => pop)
    expect(window.location.pathname).toBe('/')
    expect(screen.getByTestId('rotta')).toHaveTextContent('"home"')
  })

  it('senza storia (deep link) ‹ Indietro va al genitore in replace', () => {
    avvia('/tornei/0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b')
    const lunghezza = window.history.length
    act(() => goBack({ name: 'tornei', vista: 'mappa' }))
    expect(window.location.pathname).toBe('/tornei/mappa')
    expect(window.history.length).toBe(lunghezza)
  })

  it('/tornei/timeline (la vecchia Timeline) viene sostituito da /diario all\'avvio', () => {
    avvia('/tornei/timeline')
    render(<Dove />)
    expect(window.location.pathname).toBe('/diario')
    expect(screen.getByTestId('rotta')).toHaveTextContent('"diario"')
  })

  it('<Link> è un <a href> vero che naviga senza ricaricare', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Link to={{ name: 'compagni' }}>Compagni</Link>
        <Dove />
      </>,
    )
    const a = screen.getByRole('link', { name: 'Compagni' })
    expect(a).toHaveAttribute('href', '/compagni')
    await user.click(a)
    expect(window.location.pathname).toBe('/compagni')
    expect(screen.getByTestId('rotta')).toHaveTextContent('"compagni"')
  })
})

describe('router — overlay nella history', () => {
  it('l\'indietro chiude lo sheet in cima e non cambia pagina', async () => {
    act(() => navigate({ name: 'tornei', vista: 'lista' }))
    act(() => {
      openOverlay({ kind: 'torneo', mode: 'nuovo' })
    })
    expect(overlayStack()).toHaveLength(1)
    const pop = tornata()
    window.history.back()
    await act(() => pop)
    expect(overlayStack()).toHaveLength(0)
    expect(window.location.pathname).toBe('/tornei')
  })

  it('con il modulo sporco l\'indietro non chiude: rimette la voce e chiede', async () => {
    let key = ''
    act(() => {
      key = openOverlay({ kind: 'torneo', mode: 'nuovo' })
    })
    act(() => setOverlayFlags(key, { dirty: true }))
    const pop = tornata()
    window.history.back()
    await act(() => pop)
    const stack = overlayStack()
    expect(stack).toHaveLength(2)
    expect(stack[0].key).toBe(key)
    expect(stack[1].overlay.kind).toBe('conferma')
  })

  it('chiudere dall\'interfaccia con il modulo sporco chiede «Scartare le modifiche?»', () => {
    let key = ''
    act(() => {
      key = openOverlay({ kind: 'compagno' })
    })
    act(() => setOverlayFlags(key, { dirty: true }))
    act(() => closeOverlay())
    const top = overlayStack()[1]
    expect(top.overlay.kind).toBe('conferma')
    expect(top.overlay.kind === 'conferma' && top.overlay.spec.title).toBe('Scartare le modifiche?')
  })

  it('il menu ＋ che diventa uno sheet sostituisce la propria voce', () => {
    const prima = window.history.length
    act(() => {
      openOverlay({ kind: 'azioni' })
    })
    act(() => {
      openOverlay({ kind: 'torneo', mode: 'nuovo' }, { replaceTop: true })
    })
    expect(window.history.length).toBe(prima + 1)
    expect(overlayStack().map((e) => e.overlay.kind)).toEqual(['torneo'])
  })

  it('un refresh con un overlay aperto non lo riapre', () => {
    window.history.replaceState({ bvd: 1, idx: 2, overlay: 'o9' }, '', '/tornei')
    __resetRouterForTests()
    expect(overlayStack()).toHaveLength(0)
    expect((window.history.state as { overlay?: string }).overlay).toBeUndefined()
  })

  it('il successo che porta altrove trasforma la voce dello sheet nella destinazione', async () => {
    act(() => navigate({ name: 'tornei', vista: 'lista' }))
    const prima = window.history.length
    act(() => {
      openOverlay({ kind: 'torneo', mode: 'nuovo' })
    })
    act(() => navigate({ name: 'torneo', id: '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b' }))
    expect(overlayStack()).toHaveLength(0)
    expect(window.location.pathname).toBe('/tornei/0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b')
    expect(window.history.length).toBe(prima + 1)
    const pop = tornata()
    window.history.back()
    await act(() => pop)
    await waitFor(() => expect(window.location.pathname).toBe('/tornei'))
  })
})
