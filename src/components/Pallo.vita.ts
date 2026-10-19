// ============================================================================
// La vita di Pallo, senza React: lo sguardo che segue il dito e il puntatore,
// l'ammiccare e i gesti «idle». È codice DOM puro (attributi e transform
// scritti sull'<svg>, mai uno stato), così lo usano sia `Pallo.tsx` (da un
// `useEffect`) sia la landing `/presentazione`, che non ha React.
//
// Qui stanno anche i nomi degli umori e i tempi dei gesti di Pallo: la
// landing li legge da questo file, che non tira dentro il framework.
//
// La vita gira solo quando serve: Pallo in vista (IntersectionObserver), la
// pagina visibile e il movimento permesso. Il «movimento permesso» è un
// predicato iniettabile (`fermo`): nell'app è `prefers-reduced-motion`, nella
// landing anche il comando «Ferma le animazioni» (MOTION.md §L3.1).
// ============================================================================

export type PalloUmore =
  /** In piedi che saluta con la mano destra: Home, primo avvio. */
  | 'saluta'
  /** Braccia in alto, occhi felici, bocca aperta, saltella: punto fatto, Wrapped. */
  | 'esulta'
  /** Braccia in alto, occhi felici, sorriso: «grazie», segnalazione inviata. */
  | 'contento'
  /** Sopracciglia giù, bocca storta, tentenna: punto subito. */
  | 'preoccupato'
  /** Spunta dal bordo di uno sheet con le mani appoggiate. */
  | 'sbircia'
  /** Solo la testa, ferma: l'avatar dell'assistente. */
  | 'testa'
  /** Salta fra coriandoli e stelline agitando le braccia: un 1° posto, una vittoria. */
  | 'festa'
  /** Occhi giù, una lacrimuccia, si affloscia: una sconfitta. */
  | 'triste'
  /** Occhi in alto, mano sul mento, tre puntini: l'assistente che «scrive». */
  | 'pensa'
  /** Occhi chiusi, «z z z» che salgono, respiro lento: niente da fare, per ora. */
  | 'dorme'
  /** Occhi grandi, bocca a O, sobbalza: 404, match point. */
  | 'sorpreso'
  /** Strizza l'occhio con la mano alzata: un invito complice. */
  | 'occhiolino'
  /** Occhiali da sole, una mano sul fianco e l'altra alzata: siamo in spiaggia, una serie di vittorie. */
  | 'cool'
  /** Occhi a cuore che battono, guance rosse, braccia in alto: un record personale. */
  | 'cuori'

/** L'easter egg: un palleggio (vola, fa un giro e ricade) o gli occhiali da sole. */
export type PalloSorpresa = 'palleggio' | 'occhiali'

/** Quanto dura la reazione a un tocco. */
export const REAZIONE_MS = 1000
/** I tempi delle sorprese: gli stessi delle animazioni in Pallo.css. */
export const PALLEGGIO_MS = 1500
export const OCCHIALI_MS = 2800
export const TOCCHI_DI_FILA = 5
export const TOCCHI_GAP_MS = 700
export const PRESSIONE_LUNGA_MS = 600
/** Il gesto più lungo (gli sguardi, 1,8s): poi l'attributo si toglie. */
export const GESTO_MS = 1900

/** Tutti gli umori, nell'ordine in cui sono nati: la tavola e i test li passano tutti. */
export const PALLO_UMORI: readonly PalloUmore[] = [
  'saluta', 'esulta', 'contento', 'preoccupato', 'sbircia', 'testa',
  'festa', 'triste', 'pensa', 'dorme', 'sorpreso', 'occhiolino', 'cool', 'cuori',
]

/** Le allegre: una a caso a ogni tocco. Gli occhiali (`cool`) restano la sorpresa. */
export const ALLEGRI: readonly PalloUmore[] = ['esulta', 'contento', 'occhiolino', 'cuori', 'festa']
/** In piedi: l'ombra c'è di serie (`esulta` e `preoccupato` no, come prima). */
export const CON_OMBRA: ReadonlySet<PalloUmore> = new Set<PalloUmore>(['saluta', 'contento', 'festa', 'triste', 'pensa', 'dorme', 'sorpreso', 'occhiolino', 'cool', 'cuori'])
/** Chi ha gli occhi aperti ammicca (non chi li ha chiusi, felici, a cuore o dietro gli occhiali). */
export const AMMICCA: ReadonlySet<PalloUmore> = new Set<PalloUmore>(['saluta', 'sbircia', 'testa', 'preoccupato', 'sorpreso', 'pensa', 'triste', 'occhiolino'])

export type Gesto = 'guarda-sx' | 'guarda-dx' | 'guarda-su' | 'inclina-sx' | 'inclina-dx' | 'saltello'
/** I gesti «idle» di ogni umore. Chi ha già un'animazione piena (festa, esulta, dorme) non ne ha. */
export const GESTI: Partial<Record<PalloUmore, readonly Gesto[]>> = {
  saluta: ['guarda-sx', 'guarda-dx', 'guarda-su', 'inclina-sx', 'inclina-dx', 'saltello'],
  contento: ['inclina-sx', 'inclina-dx', 'saltello'],
  preoccupato: ['guarda-sx', 'guarda-dx'],
  sbircia: ['guarda-sx', 'guarda-dx', 'guarda-su'],
  testa: ['guarda-sx', 'guarda-dx', 'guarda-su', 'inclina-sx', 'inclina-dx'],
  sorpreso: ['guarda-sx', 'guarda-dx'],
  occhiolino: ['inclina-sx', 'saltello'],
  cool: ['saltello', 'inclina-sx', 'inclina-dx'],
  cuori: ['inclina-sx', 'inclina-dx', 'saltello'],
}

/** Fin dove si spostano gli occhi (unità del disegno): la faccia ne fa il 45%, le pupille il resto. */
const SGUARDO_X = 4.5
const SGUARDO_Y = 3.5

const f = (n: number) => Math.round(n * 100) / 100

export interface OpzioniVita {
  /** Gli occhi seguono il dito e il puntatore. */
  segui: boolean
  /** Ammicca e fa piccoli gesti a caso. */
  vivo: boolean
  /** L'umore che si vede adesso: si legge a ogni giro, cambiarlo non riaccende niente. */
  umore: () => PalloUmore
  /** L'inquadratura del disegno (viewBox): il corpo intero o la sola testa. */
  box: () => readonly [number, number, number, number]
  /** Il movimento è fermo? Di serie `prefers-reduced-motion`. */
  fermo?: () => boolean
  /** Avvisa quando `fermo` può essere cambiato. Di serie, la media query. */
  alCambio?: (fn: () => void) => () => void
}

/** La media query del movimento ridotto, se il browser (o jsdom) ce l'ha. */
function mediaRidotto(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
}

/**
 * Accende lo sguardo che segue e la vita (ammiccare, gesti) su un `<svg
 * class="pallo">`: attributi e transform scritti sul DOM. Gira solo con Pallo
 * in vista, la pagina visibile e il movimento permesso; si spegne e si
 * riaccende da sé. Restituisce la funzione che spegne tutto.
 */
export function avviaVita(svg: SVGSVGElement, o: OpzioniVita): () => void {
  const { segui, vivo, umore, box } = o
  if (!segui && !vivo) return () => undefined
  if (typeof IntersectionObserver === 'undefined') return () => undefined
  const ridotto = o.fermo ? null : mediaRidotto()
  const fermo = o.fermo ?? (() => ridotto?.matches ?? false)
  const alCambio =
    o.alCambio ??
    ((fn: () => void) => {
      ridotto?.addEventListener?.('change', fn)
      return () => ridotto?.removeEventListener?.('change', fn)
    })
  const timers = new Set<number>()
  const dopo = (ms: number, fn: () => void) => {
    const t = window.setTimeout(() => {
      timers.delete(t)
      fn()
    }, ms)
    timers.add(t)
  }
  const caso = (a: number, b: number) => a + Math.random() * (b - a)
  let inVista = false
  let acceso = false
  let raf = 0
  let riposo = 0
  let px = 0
  let py = 0
  let ditoA = -Infinity
  let ultimoGesto: Gesto | null = null

  // ---- lo sguardo
  const posa = (x: number, y: number) => {
    const t = (k: number) => (x || y ? `translate(${f(x * k)}px, ${f(y * k)}px)` : '')
    const volto = svg.querySelector<SVGGElement>('.pallo-volto')
    const occhi = svg.querySelector<SVGGElement>('.pallo-sguardo')
    if (volto) volto.style.transform = t(0.45)
    if (occhi) occhi.style.transform = t(0.55)
  }
  const guarda = () => {
    raf = 0
    const r = svg.getBoundingClientRect()
    const [bx, by, bw, bh] = box()
    // Il centro della faccia, (60, 60) nel disegno, sullo schermo.
    const dx = px - (r.left + ((60 - bx) / bw) * r.width)
    const dy = py - (r.top + ((60 - by) / bh) * r.height)
    const d = Math.hypot(dx, dy)
    if (d < 1) return posa(0, 0)
    // Girato del tutto già a una volta e mezzo la sua larghezza: chi è
    // vicino lo guarda dritto, chi è lontano lo guarda di lato.
    const k = Math.min(1, d / Math.max(1, r.width * 1.5))
    posa((dx / d) * k * SGUARDO_X, (dy / d) * k * SGUARDO_Y)
  }
  const muovi = (e: PointerEvent) => {
    px = e.clientX
    py = e.clientY
    ditoA = performance.now()
    window.clearTimeout(riposo)
    if (!raf) raf = requestAnimationFrame(guarda)
  }
  // Il dito si stacca: dopo un attimo torna a guardare davanti.
  const lascia = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    window.clearTimeout(riposo)
    riposo = window.setTimeout(() => posa(0, 0), 1200)
  }
  // Il mouse esce dalla finestra.
  const esce = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !e.relatedTarget) posa(0, 0)
  }

  // ---- la vita
  const batti = () => {
    svg.setAttribute('data-batti', '')
    dopo(180, () => svg.removeAttribute('data-batti'))
  }
  const ammicca = () =>
    dopo(caso(2200, 5600), () => {
      if (AMMICCA.has(umore()) && !svg.hasAttribute('data-sorpresa')) {
        batti()
        // Ogni tanto due volte di fila, come fa chiunque.
        if (Math.random() < 0.25) dopo(300, batti)
      }
      ammicca()
    })
  const gesticola = () =>
    dopo(caso(3500, 8000), () => {
      const occupato = svg.hasAttribute('data-tocco') || svg.hasAttribute('data-sorpresa') || svg.hasAttribute('data-gesto')
      // Gli occhi li sta guidando il dito: niente sguardi per conto loro.
      const dito = performance.now() - ditoA < 4000
      let gesti = (GESTI[umore()] ?? []).filter((g) => !(dito && g.startsWith('guarda')))
      if (gesti.length > 1) gesti = gesti.filter((g) => g !== ultimoGesto)
      if (!occupato && gesti.length) {
        ultimoGesto = gesti[Math.floor(Math.random() * gesti.length)]
        svg.setAttribute('data-gesto', ultimoGesto)
        dopo(GESTO_MS, () => svg.removeAttribute('data-gesto'))
      }
      gesticola()
    })

  const accendi = () => {
    if (vivo) {
      ammicca()
      gesticola()
    }
    if (segui) {
      window.addEventListener('pointermove', muovi, { passive: true })
      window.addEventListener('pointerdown', muovi, { passive: true })
      window.addEventListener('pointerup', lascia, { passive: true })
      window.addEventListener('pointercancel', lascia, { passive: true })
      document.addEventListener('pointerout', esce, { passive: true })
    }
  }
  const spegni = () => {
    timers.forEach((t) => window.clearTimeout(t))
    timers.clear()
    window.clearTimeout(riposo)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    window.removeEventListener('pointermove', muovi)
    window.removeEventListener('pointerdown', muovi)
    window.removeEventListener('pointerup', lascia)
    window.removeEventListener('pointercancel', lascia)
    document.removeEventListener('pointerout', esce)
    svg.removeAttribute('data-batti')
    svg.removeAttribute('data-gesto')
    posa(0, 0)
  }
  const aggiorna = () => {
    const deve = inVista && document.visibilityState !== 'hidden' && !fermo()
    if (deve === acceso) return
    acceso = deve
    if (deve) accendi()
    else spegni()
  }

  const io = new IntersectionObserver((voci) => {
    inVista = voci[voci.length - 1]?.isIntersecting ?? false
    aggiorna()
  })
  io.observe(svg)
  document.addEventListener('visibilitychange', aggiorna)
  const smetti = alCambio(aggiorna)
  return () => {
    io.disconnect()
    document.removeEventListener('visibilitychange', aggiorna)
    smetti()
    if (acceso) {
      acceso = false
      spegni()
    }
  }
}
