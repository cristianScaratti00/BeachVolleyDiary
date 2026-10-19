// ============================================================================
// La barra (UX §L4.1, §L7.1, ART §L9.2, MOTION §L5.1): la lente sulla tab
// della sezione corrente, l'inchiostro delle tab a due livelli, il materiale
// della capsula scelto dal fondo che le passa sotto, e il `theme-color` del
// browser che continua il fondo dell'hero (UX LC13). Tutto a soglia.
// ============================================================================
import { movimentoFermo } from './movimento'
import { ms, token } from './tempi'
import { alCambioSezione } from './sezioni'
import type { Sezione } from './sezioni'

/** Sezione → tab (UX §L3.2): «Cosa registriamo?» è del Diario, la mappa dei Numeri. */
const TAB: Partial<Record<Sezione, number>> = { diario: 0, registra: 0, live: 1, numeri: 2, mappa: 2, wrapped: 3 }


export function avviaNav() {
  const capsula = document.querySelector<HTMLElement>('.capsula')
  const lente = document.querySelector<HTMLElement>('.lente')
  const tabs = [...document.querySelectorAll<HTMLAnchorElement>('.tab')]
  if (!capsula || !lente || !tabs.length) return

  // ----------------------------------------------- La lente (ML12, A5)
  let fineSalta = 0
  alCambioSezione((s) => {
    const i = s ? TAB[s] : undefined
    tabs.forEach((t, k) => (k === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')))
    if (i === undefined) {
      lente.setAttribute('data-nascosta', '')
      return
    }
    if (lente.hasAttribute('data-nascosta')) {
      // Torna una sezione con tab: la lente si mette sulla tab nuova senza
      // transizione (è invisibile), POI compare. Non scivola da una tab
      // vecchia, che dopo una sezione senza tab non vuol dire niente.
      lente.setAttribute('data-salta', '')
      lente.style.setProperty('--i', String(i))
      void lente.offsetWidth
      lente.removeAttribute('data-nascosta')
      window.clearTimeout(fineSalta)
      fineSalta = window.setTimeout(() => lente.removeAttribute('data-salta'), ms('--dur-entrata'))
      return
    }
    lente.style.setProperty('--i', String(i))
  })

  // ---------------------------------- Il materiale: il fondo sotto la capsula
  // Una fascia di 1px sulla linea mediana della capsula (§L9.1), misurata una
  // volta e a ogni ridimensionamento: mai durante lo scroll.
  let inchiostro = 0
  const cambiaFondo = (fondo: string) => {
    if (capsula.dataset.sopra === fondo) return
    capsula.dataset.sopra = fondo
    window.clearTimeout(inchiostro)
    // L'inchiostro delle tab spente cambia DI COLPO a metà dello scambio dei
    // vetri (ML13); col fermo lo scambio è istantaneo, e l'inchiostro anche.
    const dopo = movimentoFermo() ? 0 : ms('--dur-svelto') / 2
    inchiostro = window.setTimeout(() => {
      capsula.dataset.inchiostro = fondo
    }, dopo)
  }
  const fondi = [...document.querySelectorAll<HTMLElement>('main > section[data-fondo], footer[data-fondo]')]
  let io: IntersectionObserver | null = null
  const osserva = () => {
    io?.disconnect()
    const r = capsula.getBoundingClientRect()
    const mezzo = Math.round(r.top + r.height / 2)
    const sotto = Math.max(0, window.innerHeight - mezzo - 1)
    io = new IntersectionObserver(
      (voci) => {
        for (const v of voci) if (v.isIntersecting) cambiaFondo((v.target as HTMLElement).dataset.fondo ?? 'chiaro')
      },
      { rootMargin: `-${Math.max(0, mezzo)}px 0px -${sotto}px 0px` },
    )
    for (const f of fondi) io.observe(f)
  }
  if (typeof IntersectionObserver !== 'undefined') {
    osserva()
    let attesa = 0
    window.addEventListener('resize', () => {
      window.clearTimeout(attesa)
      attesa = window.setTimeout(osserva, 120)
    })
  }

  // ----------------------------------------------------- theme-color
  // Il tramonto finché l'hero copre la cima dello schermo, poi la carta.
  // Un solo <meta>, aggiornato a soglia; i valori sono i token.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const eroe = document.getElementById('inizio')
  if (meta && eroe && typeof IntersectionObserver !== 'undefined') {
    const tramonto = token('--field-dusk')
    const carta = token('--field-paper')
    new IntersectionObserver(
      ([v]) => {
        const colore = v.isIntersecting ? tramonto : carta
        if (colore) meta.content = colore
      },
      { rootMargin: '0px 0px -99% 0px' },
    ).observe(eroe)
  }
}
