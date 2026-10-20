// ============================================================================
// Il pilota del palleggio, senza React: a ogni fotogramma calcola lo scambio
// (Login.palleggio.ts, puro) e lo scrive negli attributi dei tratti dei due
// giocatori, del pallone e della sua ombra. Lo usa la scena dell'accesso
// (Login.scena.tsx, da un `useEffect`).
//
// Il loop gira solo quando si vede: la scena in vista (IntersectionObserver,
// dove c'è), la scheda visibile, il movimento permesso. Fermo, o fuori vista,
// resta il fotogramma `FERMO`, che è anche il primo disegno: ripartendo, i
// giocatori non saltano.
// ============================================================================
import { FERMO, avanza, fotogramma } from './Login.palleggio'
import type { Fotogramma, Posa, Scambio } from './Login.palleggio'

type Tratto = Exclude<keyof Posa, 'testa' | 'pallone'>

export interface OpzioniPalleggio {
  /** Il movimento è fermo? Di serie `prefers-reduced-motion`. */
  fermo?: () => boolean
  /** Avvisa quando `fermo` può essere cambiato. Di serie, la media query. */
  alCambio?: (fn: () => void) => () => void
}

/**
 * Accende il palleggio dentro `radice` (l'<svg> della scena, o il contenitore
 * dei suoi piani). Restituisce la funzione che lo spegne.
 */
export function avviaPalleggio(radice: Element, o: OpzioniPalleggio = {}): () => void {
  if (typeof requestAnimationFrame !== 'function') return () => undefined
  const ridotto = !o.fermo && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const fermo = o.fermo ?? (() => ridotto?.matches ?? false)
  const alCambio =
    o.alCambio ??
    ((fn: () => void) => {
      ridotto?.addEventListener?.('change', fn)
      return () => ridotto?.removeEventListener?.('change', fn)
    })
  const giocatori = ([0, 1] as const).map((lato) =>
    Array.from(radice.querySelectorAll<SVGElement>(`[data-giocatore="${lato}"] [data-parte]`)),
  )
  const pallone = radice.querySelector<SVGGElement>('[data-pallone]')
  const ombra = radice.querySelector<SVGGElement>('[data-ombra]')
  const ombraEllisse = ombra?.querySelector('ellipse')

  const disegna = (f: Fotogramma) => {
    giocatori.forEach((tratti, lato) => {
      const p = f.giocatori[lato]
      for (const t of tratti) {
        const parte = t.dataset.parte
        if (parte === 'testa') {
          t.setAttribute('cx', p.testa[0].toFixed(1))
          t.setAttribute('cy', p.testa[1].toFixed(1))
        } else if (parte) t.setAttribute('d', p[parte as Tratto])
      }
    })
    const b = f.pallone
    pallone?.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.giro.toFixed(1)})`)
    ombra?.setAttribute('transform', `translate(${f.ombra.x.toFixed(1)} 344) scale(${f.ombra.scala.toFixed(2)} 1)`)
    ombraEllisse?.setAttribute('opacity', f.ombra.opacita.toFixed(2))
  }

  let raf = 0
  let scambio: Scambio | null = null
  // Senza IntersectionObserver (jsdom, browser vecchi) la scena conta come in vista.
  let inVista = typeof IntersectionObserver === 'undefined'
  const giro = (ora: number) => {
    raf = requestAnimationFrame(giro)
    scambio = avanza(scambio, ora)
    disegna(fotogramma(scambio, ora))
  }
  const aggiorna = () => {
    if (fermo()) {
      // Fermo: il fotogramma di riposo, e lo scambio riparte da capo.
      cancelAnimationFrame(raf)
      raf = 0
      scambio = null
      disegna(FERMO)
    } else if (!inVista || document.visibilityState === 'hidden') {
      // Fuori vista o scheda nascosta: sospeso dov'è. Dopo una lunga pausa
      // `avanza` ricomincia da capo invece di recuperare i voli persi.
      cancelAnimationFrame(raf)
      raf = 0
    } else if (!raf) raf = requestAnimationFrame(giro)
  }

  const io =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((voci) => {
          inVista = voci[voci.length - 1]?.isIntersecting ?? false
          aggiorna()
        })
  io?.observe(radice)
  document.addEventListener('visibilitychange', aggiorna)
  const smetti = alCambio(aggiorna)
  aggiorna()
  return () => {
    cancelAnimationFrame(raf)
    raf = 0
    io?.disconnect()
    document.removeEventListener('visibilitychange', aggiorna)
    smetti()
  }
}
