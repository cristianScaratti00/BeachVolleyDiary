// ============================================================================
// La scena dell'accesso: decorativa, e col palleggio che si muove solo se
// chi guarda non ha chiesto meno movimento. requestAnimationFrame e
// matchMedia sono finti: i fotogrammi li fa partire il test.
// ============================================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { Scena } from './Login.scena'
import { FERMO, TEMPO_MS } from './Login.palleggio'

let riduci = false
const ascoltatori = new Set<() => void>()
const fotogrammi = new Map<number, FrameRequestCallback>()
let prossimo = 1

function finti() {
  // `matches` è vivo, come quello vero: la preferenza può cambiare dopo.
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q.includes('prefers-reduced-motion') && riduci
    },
    media: q,
    addEventListener: (_: string, fn: () => void) => ascoltatori.add(fn),
    removeEventListener: (_: string, fn: () => void) => ascoltatori.delete(fn),
  }))
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    const id = prossimo++
    fotogrammi.set(id, fn)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => fotogrammi.delete(id))
}

/** Fa girare i fotogrammi in attesa, all'istante `ora`. */
function fotogramma(ora: number) {
  const giro = [...fotogrammi.values()]
  fotogrammi.clear()
  act(() => giro.forEach((fn) => fn(ora)))
}

const pallone = (c: HTMLElement) => c.querySelector('[data-pallone]')?.getAttribute('transform')
const fermo = `translate(${FERMO.pallone.x.toFixed(1)} ${FERMO.pallone.y.toFixed(1)}) rotate(${FERMO.pallone.giro.toFixed(1)})`

afterEach(() => {
  riduci = false
  ascoltatori.clear()
  fotogrammi.clear()
  vi.unstubAllGlobals()
})

describe('la scena dell\'accesso', () => {
  it('è decorativa: nascosta ai lettori di schermo, senza nulla da raggiungere col tab', () => {
    finti()
    const { container } = render(<Scena inquadratura="benvenuto" />)
    const scena = container.querySelector('.accesso-scena')
    expect(scena).toHaveAttribute('aria-hidden', 'true')
    expect(scena).toHaveAttribute('data-inquadratura', 'benvenuto')
    expect(scena?.querySelector('svg')).toHaveAttribute('focusable', 'false')
    expect(container.querySelectorAll('[data-giocatore]')).toHaveLength(2)
  })

  it('il palleggio si muove a ogni fotogramma, e allo smontaggio si ferma', () => {
    finti()
    const { container, unmount } = render(<Scena inquadratura="accedi" />)
    expect(pallone(container)).toBe(fermo)
    fotogramma(1000)
    expect(pallone(container)).toBe(fermo) // riparte dal fotogramma fermo, senza salti
    const testa = container.querySelector('[data-giocatore="0"] [data-parte="testa"]')?.getAttribute('cy')
    fotogramma(1000 + TEMPO_MS * 0.6)
    expect(pallone(container)).not.toBe(fermo)
    expect(container.querySelector('[data-giocatore="0"] [data-parte="testa"]')?.getAttribute('cy')).not.toBe(testa)
    expect(fotogrammi.size).toBe(1)
    unmount()
    expect(fotogrammi.size).toBe(0)
  })

  it('con reduced-motion resta il fotogramma fermo; se la preferenza arriva dopo, torna lì', () => {
    riduci = true
    finti()
    const { container } = render(<Scena inquadratura="registrati" />)
    expect(fotogrammi.size).toBe(0)
    expect(pallone(container)).toBe(fermo)

    riduci = false
    act(() => ascoltatori.forEach((fn) => fn()))
    fotogramma(0)
    fotogramma(TEMPO_MS * 0.6)
    expect(pallone(container)).not.toBe(fermo)

    riduci = true
    act(() => ascoltatori.forEach((fn) => fn()))
    expect(fotogrammi.size).toBe(0)
    expect(pallone(container)).toBe(fermo)
  })
})
