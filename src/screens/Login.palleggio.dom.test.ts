// ============================================================================
// Il pilota DOM del palleggio (lo usano il Login e la landing): si sospende
// fuori vista e a scheda nascosta, e obbedisce al predicato `fermo` che gli
// si passa (sulla landing anche «Ferma le animazioni»).
// ============================================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { Scena } from './Login.scena'
import { FERMO, TEMPO_MS } from './Login.palleggio'
import { avviaPalleggio } from './Login.palleggio.dom'

const fotogrammi = new Map<number, FrameRequestCallback>()
let prossimo = 1
let notizia: ((voci: { isIntersecting: boolean }[]) => void) | null = null

function finti() {
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    const id = prossimo++
    fotogrammi.set(id, fn)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => fotogrammi.delete(id))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(fn: (voci: { isIntersecting: boolean }[]) => void) {
        notizia = fn
      }
      observe() {}
      disconnect() {}
    },
  )
}
function gira(ora: number) {
  const giro = [...fotogrammi.values()]
  fotogrammi.clear()
  giro.forEach((fn) => fn(ora))
}
function scena(): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = renderToStaticMarkup(createElement(Scena, { inquadratura: 'benvenuto' }))
  document.body.append(d)
  return d
}
const pallone = (r: Element) => r.querySelector('[data-pallone]')?.getAttribute('transform')
const fermo = `translate(${FERMO.pallone.x.toFixed(1)} ${FERMO.pallone.y.toFixed(1)}) rotate(${FERMO.pallone.giro.toFixed(1)})`

afterEach(() => {
  fotogrammi.clear()
  notizia = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('avviaPalleggio', () => {
  it('parte solo in vista, e fuori vista si sospende', () => {
    finti()
    const r = scena()
    const stop = avviaPalleggio(r, { fermo: () => false })
    expect(fotogrammi.size).toBe(0)
    notizia?.([{ isIntersecting: true }])
    expect(fotogrammi.size).toBe(1)
    gira(0)
    gira(TEMPO_MS * 0.6)
    expect(pallone(r)).not.toBe(fermo)
    notizia?.([{ isIntersecting: false }])
    expect(fotogrammi.size).toBe(0)
    stop()
  })

  it('a scheda nascosta si sospende, e riparte quando torna visibile', () => {
    finti()
    const r = scena()
    const stop = avviaPalleggio(r, { fermo: () => false })
    notizia?.([{ isIntersecting: true }])
    const stato = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(fotogrammi.size).toBe(0)
    stato.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(fotogrammi.size).toBe(1)
    stop()
    expect(fotogrammi.size).toBe(0)
  })

  it('obbedisce al predicato `fermo` iniettato: fermo = il fotogramma di riposo', () => {
    finti()
    const r = scena()
    let f = false
    const ascolta = new Set<() => void>()
    const stop = avviaPalleggio(r, { fermo: () => f, alCambio: (fn) => (ascolta.add(fn), () => ascolta.delete(fn)) })
    notizia?.([{ isIntersecting: true }])
    gira(0)
    gira(TEMPO_MS * 0.6)
    expect(pallone(r)).not.toBe(fermo)
    f = true
    ascolta.forEach((fn) => fn())
    expect(fotogrammi.size).toBe(0)
    expect(pallone(r)).toBe(fermo)
    stop()
    expect(ascolta.size).toBe(0)
  })
})
