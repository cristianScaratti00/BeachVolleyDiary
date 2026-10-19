// ============================================================================
// La landing /presentazione VIVA in jsdom: l'HTML finito di `componiLanding`,
// poi i moduli veri (`presentazione/js/main.ts`), da capo a ogni montaggio.
//
// La pagina vive di soglie (IntersectionObserver) e di scroll, che jsdom non
// ha: qui c'è un'impaginazione finta ma coerente (sezioni impilate, alte
// quanto basta, con dentro i bersagli degli effetti al loro posto) e un
// IntersectionObserver che la misura con la regola vera (rootMargin, soglie,
// la prima notizia all'osservazione). `scorri` muove la pagina come un dito,
// a passi, con l'evento `scroll`; i salti dei moduli passano da
// `scrollIntoView`, che qui sposta la stessa pagina.
//
// Il tempo è finto e deterministico (timer, rAF, performance, Date): ogni
// attesa è `passa(ms)`, mai un'attesa vera. `Math.random` è fisso, così gli
// umori «a caso» di Pallo sono sempre quelli.
//
// Fuori dalla portata di jsdom: il CSS (posizioni, visibilità, anelli), il
// vetro, `inert` nel giro del Tab. Li misura docs/qa/landing.mjs nel browser.
// ============================================================================
import { vi } from 'vitest'
import { configure, getConfig } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import fonte from '../../presentazione/index.html?raw'
import fermoJs from '../../public/presentazione/fermo.js?raw'
import { componiLanding } from '../../presentazione/build/componi'
import { expectNoA11yViolations } from './axe'

const HTML = componiLanding(fonte)

export interface OpzioniLanding {
  /** innerWidth × innerHeight: di serie l'iPhone di riferimento, 390 × 844. */
  larghezza?: number
  altezza?: number
  /** `prefers-reduced-motion: reduce`. */
  ridotto?: boolean
  /** Puntatore fine e hover (il computer); di serie il dito. */
  mouse?: boolean
  /** Già installata: aperta dall'icona (`display-mode: standalone`). */
  standalone?: boolean
  /** Lo user agent; di serie Safari 26 su iPhone. */
  ua?: string
  platform?: string
  maxTouchPoints?: number
  /** Deep link: la pagina si apre su questa sezione (`#live`). */
  hash?: string
  /** localStorage e sessionStorage che lanciano (navigazione privata, cookie bloccati). */
  memoriaRotta?: boolean
  /** Ciò che resta da una visita passata: `bvd_landing_fermo` e la sessione. */
  locale?: Record<string, string>
  sessione?: Record<string, string>
  /** CSS.supports per le timeline native (Wrapped bloccato). */
  timeline?: boolean
  /** Prima dei moduli, a pagina già scritta: per rompere qualcosa di proposito. */
  prima?: () => void
}

export const UA = {
  safari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safari18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
} as const

// ---------------------------------------------------------------- media
interface Media {
  w: number
  h: number
  ridotto: boolean
  mouse: boolean
  standalone: boolean
}
type Ascolto = (e: MediaQueryListEvent) => void

function corrisponde(m: Media, q: string): boolean {
  let ok = true
  for (const [, tipo, asse, px] of q.matchAll(/\((min|max)-(width|height):\s*(\d+(?:\.\d+)?)px\)/g)) {
    const v = asse === 'width' ? m.w : m.h
    ok &&= tipo === 'min' ? v >= Number(px) : v <= Number(px)
  }
  if (/prefers-reduced-motion/.test(q)) ok &&= /no-preference/.test(q) ? !m.ridotto : m.ridotto
  if (/hover:\s*hover/.test(q)) ok &&= m.mouse
  if (/pointer:\s*fine/.test(q)) ok &&= m.mouse
  if (/pointer:\s*coarse/.test(q)) ok &&= !m.mouse
  if (/display-mode:\s*standalone/.test(q)) ok &&= m.standalone
  if (/prefers-reduced-transparency|prefers-contrast|forced-colors/.test(q)) ok = false
  return ok
}

// ------------------------------------------------------------ impaginazione
// Le sezioni una sotto l'altra, in px di documento. Dentro, i bersagli che gli
// effetti osservano stanno dove li mette il CSS vero (a grandi linee): il
// resto prende il riquadro dell'antenato più vicino che ne ha uno.
const ALTEZZE: Record<string, number> = {
  inizio: 844, diario: 3000, registra: 1400, live: 1300, numeri: 1100, mappa: 1100, wrapped: 2400, dati: 1300, comincia: 844,
}
interface Riquadro {
  top: number
  height: number
  /** Fisso nel viewport (barra): non scorre. */
  fisso?: boolean
}

function impagina(w: number, h: number): Map<Element, Riquadro> {
  const r = new Map<Element, Riquadro>()
  let y = 0
  for (const s of document.querySelectorAll<HTMLElement>('main > section')) {
    const alta = ALTEZZE[s.id] ?? 1000
    r.set(s, { top: y, height: alta })
    const dentro = (sel: string, dy: number, alto: number) => s.querySelectorAll(sel).forEach((el) => r.set(el, { top: y + dy, height: alto }))
    switch (s.id) {
      case 'inizio':
        // La testa del Pallo dell'hero a 324px: le sentinelle 24 e 96px sopra.
        dentro('.eroe-sentinella[data-linea="salto"]', 300, 1)
        dentro('.eroe-sentinella[data-linea="ritorno"]', 228, 1)
        break
      case 'diario':
        s.querySelectorAll<HTMLElement>('.capitolo').forEach((c) => r.set(c, { top: y + 200 + Number(c.dataset.k) * 700, height: 700 }))
        break
      case 'registra':
        dentro('.registra', 250, 900)
        dentro('.registra-piu', 260, 56)
        break
      case 'live':
        dentro('.demo', 300, 560)
        break
      case 'numeri':
        dentro('.poster', 200, 400)
        break
      case 'mappa':
        dentro('.mappa', 250, 450)
        break
      case 'wrapped':
        dentro('.storia', 1800, 500)
        break
    }
    y += alta
  }
  const piede = document.querySelector('footer')
  if (piede) r.set(piede, { top: y, height: 400 })
  // La capsula: in basso sotto i 900px, in alto da lì (barra.css).
  const capsula = document.querySelector('.capsula')
  if (capsula) r.set(capsula, w >= 900 ? { top: 12, height: 64, fisso: true } : { top: h - 80, height: 64, fisso: true })
  return r
}

// ------------------------------------------------- IntersectionObserver
function margini(rootMargin: string, h: number): [number, number] {
  const p = rootMargin.trim().split(/\s+/)
  const v = (s: string | undefined) => (!s ? 0 : s.endsWith('%') ? (parseFloat(s) / 100) * h : parseFloat(s))
  const top = v(p[0])
  const bottom = v(p[2] ?? p[0])
  return [-top, h + bottom]
}

// ------------------------------------------------------------ montaggio
export async function montaLanding(o: OpzioniLanding = {}) {
  const media: Media = { w: o.larghezza ?? 390, h: o.altezza ?? 844, ridotto: !!o.ridotto, mouse: !!o.mouse, standalone: !!o.standalone }
  const disfa: (() => void)[] = []
  let y = 0

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
  vi.setSystemTime(new Date('2026-10-17T10:00:00'))
  vi.spyOn(Math, 'random').mockReturnValue(0)

  // Le finestre e il telefono.
  const proprieta = (obj: object, k: string, get: () => unknown) => {
    const prima = Object.getOwnPropertyDescriptor(obj, k)
    Object.defineProperty(obj, k, { configurable: true, get })
    disfa.push(() => (prima ? Object.defineProperty(obj, k, prima) : delete (obj as Record<string, unknown>)[k]))
  }
  proprieta(window, 'innerWidth', () => media.w)
  proprieta(window, 'innerHeight', () => media.h)
  proprieta(window, 'scrollY', () => y)
  proprieta(window, 'pageYOffset', () => y)
  proprieta(navigator, 'userAgent', () => o.ua ?? UA.safari26)
  proprieta(navigator, 'platform', () => o.platform ?? 'iPhone')
  proprieta(navigator, 'maxTouchPoints', () => o.maxTouchPoints ?? (o.mouse ? 0 : 5))
  const vibra = vi.fn(() => true)
  proprieta(navigator, 'vibrate', () => vibra)
  const registra = vi.fn(() => Promise.resolve({}))
  proprieta(navigator, 'serviceWorker', () => ({ register: registra }))

  const ascolti = new Map<string, Set<Ascolto>>()
  const primaMM = window.matchMedia
  window.matchMedia = (q: string) => {
    const set = ascolti.get(q) ?? new Set<Ascolto>()
    ascolti.set(q, set)
    return {
      media: q,
      get matches() {
        return corrisponde(media, q)
      },
      onchange: null,
      addEventListener: (_: string, cb: Ascolto) => set.add(cb),
      removeEventListener: (_: string, cb: Ascolto) => set.delete(cb),
      addListener: (cb: Ascolto) => set.add(cb),
      removeListener: (cb: Ascolto) => set.delete(cb),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }
  disfa.push(() => (window.matchMedia = primaMM))

  // jsdom ha `CSS` senza `supports`: le timeline native ci sono solo se chieste.
  const primaSupports = Object.getOwnPropertyDescriptor(CSS, 'supports')
  Object.defineProperty(CSS, 'supports', { configurable: true, writable: true, value: (q: string) => !!o.timeline && /animation-timeline/.test(q) })
  disfa.push(() => (primaSupports ? Object.defineProperty(CSS, 'supports', primaSupports) : delete (CSS as { supports?: unknown }).supports))
  // jsdom non ha PointerEvent: senza, `pointerType` non c'è e il finale non
  // distingue il mouse dal dito.
  if (typeof window.PointerEvent === 'undefined') {
    class FintoPointerEvent extends MouseEvent {
      pointerId: number
      pointerType: string
      isPrimary: boolean
      constructor(t: string, init: PointerEventInit = {}) {
        super(t, init)
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? 'mouse'
        this.isPrimary = init.isPrimary ?? true
      }
    }
    window.PointerEvent = FintoPointerEvent as unknown as typeof PointerEvent
    disfa.push(() => delete (window as { PointerEvent?: unknown }).PointerEvent)
  }

  // `inert` come nel browser: riflesso sull'attributo, così `[inert]` si vede
  // (jsdom non lo implementa: assegnarlo crea solo una proprietà qualunque).
  const primaInert = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert')
  Object.defineProperty(HTMLElement.prototype, 'inert', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('inert')
    },
    set(this: HTMLElement, v: boolean) {
      this.toggleAttribute('inert', !!v)
    },
  })
  disfa.push(() => (primaInert ? Object.defineProperty(HTMLElement.prototype, 'inert', primaInert) : delete (HTMLElement.prototype as { inert?: boolean }).inert))

  // La memoria del dispositivo.
  localStorage.clear()
  sessionStorage.clear()
  for (const [k, v] of Object.entries(o.locale ?? {})) localStorage.setItem(k, v)
  for (const [k, v] of Object.entries(o.sessione ?? {})) sessionStorage.setItem(k, v)
  if (o.memoriaRotta) {
    const rotta = () => {
      throw new DOMException('Accesso negato', 'SecurityError')
    }
    proprieta(window, 'localStorage', rotta)
    proprieta(window, 'sessionStorage', rotta)
  }

  // Chi ascolta su window e document: via allo smontaggio, così i moduli di
  // un montaggio non sentono i clic del successivo.
  const ascoltatori: [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][] = []
  for (const bersaglio of [window, document] as EventTarget[]) {
    const vero = bersaglio.addEventListener
    bersaglio.addEventListener = function (t: string, fn: EventListenerOrEventListenerObject | null, op?: boolean | AddEventListenerOptions) {
      if (fn) ascoltatori.push([bersaglio, t, fn, op])
      return vero.call(this, t, fn, op)
    }
    disfa.push(() => (bersaglio.addEventListener = vero))
  }

  // La pagina.
  const doc = new DOMParser().parseFromString(HTML, 'text/html')
  for (const a of [...document.documentElement.attributes]) document.documentElement.removeAttribute(a.name)
  for (const a of doc.documentElement.attributes) document.documentElement.setAttribute(a.name, a.value)
  document.head.innerHTML = doc.head.innerHTML
  document.body.innerHTML = doc.body.innerHTML
  history.replaceState(null, '', '/presentazione/' + (o.hash ?? ''))
  let pagina = impagina(media.w, media.h)

  const riquadro = (el: Element): Riquadro | null => {
    for (let a: Element | null = el; a; a = a.parentElement) {
      const r = pagina.get(a)
      if (r) return r
    }
    return null
  }
  const rett = (r: Riquadro | null) => {
    const top = r ? (r.fisso ? r.top : r.top - y) : 0
    const height = r?.height ?? 0
    const width = r ? media.w : 0
    return { x: 0, y: top, top, left: 0, width, height, right: width, bottom: top + height, toJSON: () => ({}) } as DOMRect
  }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rett(riquadro(this))
  })

  // ------------------------------------------- IntersectionObserver finto
  const osservatori = new Set<FintoIO>()
  class FintoIO {
    readonly root = null
    readonly rootMargin: string
    readonly thresholds: number[]
    private bersagli = new Map<Element, { i: number; dentro: boolean }>()
    private nuovi = new Set<Element>()
    constructor(
      private readonly cb: IntersectionObserverCallback,
      op: IntersectionObserverInit = {},
    ) {
      this.rootMargin = op.rootMargin ?? '0px'
      const t = op.threshold ?? 0
      this.thresholds = (Array.isArray(t) ? [...t] : [t]).sort((a, b) => a - b)
      osservatori.add(this)
    }
    observe(el: Element) {
      if (this.bersagli.has(el)) return
      this.bersagli.set(el, { i: -1, dentro: false })
      this.nuovi.add(el)
      // La prima notizia arriva dopo, come nel browser (al prossimo fotogramma).
      window.setTimeout(() => this.misura(), 0)
    }
    unobserve(el: Element) {
      this.bersagli.delete(el)
    }
    disconnect() {
      this.bersagli.clear()
      osservatori.delete(this)
    }
    takeRecords() {
      return []
    }
    misura() {
      if (!osservatori.has(this)) return
      const [alto, basso] = margini(this.rootMargin, media.h)
      const voci: IntersectionObserverEntry[] = []
      for (const [el, prima] of this.bersagli) {
        const r = rett(riquadro(el))
        const sopra = Math.max(r.top, alto)
        const sotto = Math.min(r.bottom, basso)
        const dentro = r.height > 0 && r.top < basso && r.bottom > alto
        const ratio = !dentro ? 0 : r.height ? Math.max(0, sotto - sopra) / r.height : 1
        let i = this.thresholds.findIndex((t) => t > ratio)
        if (i < 0) i = this.thresholds.length
        if (!this.nuovi.has(el) && i === prima.i && dentro === prima.dentro) continue
        this.nuovi.delete(el)
        this.bersagli.set(el, { i, dentro })
        voci.push({ target: el, isIntersecting: dentro, intersectionRatio: ratio, boundingClientRect: r, intersectionRect: r, rootBounds: null, time: performance.now() } as IntersectionObserverEntry)
      }
      if (voci.length) this.cb(voci, this as unknown as IntersectionObserver)
    }
  }
  const primaIO = window.IntersectionObserver
  window.IntersectionObserver = FintoIO as unknown as typeof IntersectionObserver
  disfa.push(() => (window.IntersectionObserver = primaIO))
  const primaRO = window.ResizeObserver
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  disfa.push(() => (window.ResizeObserver = primaRO))
  const misuraTutti = () => [...osservatori].forEach((io) => io.misura())

  // ------------------------------------------------------------- scroll
  const scrollEvento = () => {
    const e = new Event('scroll')
    // jsdom data gli eventi con Date.now(): il browser con performance.now(),
    // ed è con quello che movimento.ts calcola la velocità.
    Object.defineProperty(e, 'timeStamp', { value: performance.now() })
    window.dispatchEvent(e)
    document.dispatchEvent(new Event('scroll'))
  }
  const vaiA = (nuova: number) => {
    const max = Math.max(0, [...pagina.values()].reduce((m, r) => (r.fisso ? m : Math.max(m, r.top + r.height)), 0) - media.h)
    y = Math.round(Math.min(max, Math.max(0, nuova)))
  }
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
    const r = riquadro(this)
    if (!r || r.fisso) return
    vaiA(r.top)
    // L'evento e le notizie degli observer arrivano dopo, come nel browser:
    // chi salta mette il fuoco al titolo PRIMA che gli observer lo sappiano.
    window.setTimeout(() => {
      scrollEvento()
      misuraTutti()
    }, 0)
  })
  const primaScrollBy = window.scrollBy
  const primaScrollTo = window.scrollTo
  window.scrollBy = ((a: ScrollToOptions | number, b?: number) => {
    vaiA(y + (typeof a === 'number' ? (b ?? 0) : (a.top ?? 0)))
    misuraTutti()
    scrollEvento()
  }) as typeof window.scrollBy
  window.scrollTo = ((a: ScrollToOptions | number, b?: number) => {
    vaiA(typeof a === 'number' ? (b ?? 0) : (a.top ?? y))
    misuraTutti()
    scrollEvento()
  }) as typeof window.scrollTo
  disfa.push(() => {
    window.scrollBy = primaScrollBy
    window.scrollTo = primaScrollTo
  })
  // Il registro della chat scorre dentro di sé: in jsdom basta che non lanci.
  const primaElScroll = Element.prototype.scrollTo
  Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo
  disfa.push(() => (Element.prototype.scrollTo = primaElScroll))

  if (o.hash) vaiA(pagina.get(document.getElementById(o.hash.slice(1)) as Element)?.top ?? 0)

  // fermo.js: il file classico del <head>, eseguito così com'è.
  new Function(fermoJs)()

  o.prima?.()
  // I moduli, da capo.
  vi.resetModules()
  await import('../../presentazione/js/main')

  const passa = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms)
  }
  // Le prime notizie degli observer e il primo fotogramma.
  await passa(20)

  // Il wrapper di Testing Library per React aspetta un setTimeout(0) e fa
  // avanzare solo i timer finti di Jest: con quelli di Vitest resterebbe
  // fermo. Qui non c'è React da avvolgere in act().
  const { asyncWrapper, eventWrapper } = getConfig()
  configure({ asyncWrapper: (cb) => cb(), eventWrapper: (cb) => cb() })
  disfa.push(() => configure({ asyncWrapper, eventWrapper }))
  // Senza pause fra un tasto e l'altro: il tempo lo fa scorrere il test (`passa`).
  const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 })
  let smontata = false

  return {
    user,
    passa,
    vibra,
    registra,
    get y() {
      return y
    },
    /** La cima di una sezione, in px di documento. */
    cima(id: string) {
      return pagina.get(document.getElementById(id) as Element)?.top ?? 0
    },
    /**
     * Scorre come un dito fino a `meta` (una sezione o una y), a passi di
     * `ogni` ms: l'evento `scroll` a ogni passo, e gli observer che misurano.
     * Poi la pagina sta ferma `poi` ms (la battuta aspetta lo scroll fermo).
     */
    async scorri(meta: string | number, { passi = 8, ogni = 50, frazione = 0, poi = 300 } = {}) {
      const da = y
      const a = typeof meta === 'number' ? meta : this.cima(meta) + (ALTEZZE[meta] ?? 0) * frazione
      for (let i = 1; i <= passi; i++) {
        await passa(ogni)
        vaiA(da + ((a - da) * i) / passi)
        scrollEvento()
        misuraTutti()
      }
      await passa(poi)
    },
    /** Cambia la finestra (rotazione, ridimensionamento): `resize` e `change`. */
    async finestra(cambi: Partial<Media>) {
      Object.assign(media, cambi)
      pagina = impagina(media.w, media.h)
      window.dispatchEvent(new Event('resize'))
      for (const [q, set] of ascolti) set.forEach((cb) => cb({ matches: corrisponde(media, q), media: q } as MediaQueryListEvent))
      misuraTutti()
      await passa(200)
    },
    /**
     * axe sulla pagina com'è adesso. axe si dà i suoi tempi con setTimeout:
     * col tempo finto va fatto scorrere, a passi di 1ms, finché ha finito.
     */
    async axe(el: HTMLElement = document.body) {
      let fatto = false
      const esito = expectNoA11yViolations(el).finally(() => (fatto = true))
      for (let i = 0; i < 5000 && !fatto; i++) await vi.advanceTimersByTimeAsync(1)
      await esito
    },
    /** Un evento della finestra (`beforeinstallprompt`, `appinstalled`). */
    emetti(e: Event) {
      window.dispatchEvent(e)
    },
    smonta() {
      if (smontata) return
      smontata = true
      vi.clearAllTimers()
      for (const io of [...osservatori]) io.disconnect()
      for (const [b, t, fn, op] of ascoltatori) b.removeEventListener(t, fn, op)
      for (const f of disfa.reverse()) f()
      vi.useRealTimers()
      vi.restoreAllMocks()
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        /* già ripristinati */
      }
      document.body.innerHTML = ''
      document.head.innerHTML = ''
      for (const a of [...document.documentElement.attributes]) document.documentElement.removeAttribute(a.name)
    },
  }
}

export type Landing = Awaited<ReturnType<typeof montaLanding>>

/** L'n-esimo dalla fine (`Array.prototype.at` è ES2022, i test sono ES2020). */
export const ultimo = <T,>(a: readonly T[], n = 1): T | undefined => a[a.length - n]

/** Il prompt nativo di Chromium, finto: `prompt()` e la scelta dell'utente. */
export function promptNativo(scelta: 'accepted' | 'dismissed' | 'errore' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  const prompt = vi.fn(() => (scelta === 'errore' ? Promise.reject(new Error('gesto perso')) : Promise.resolve()))
  e.prompt = prompt
  e.userChoice = Promise.resolve({ outcome: scelta === 'errore' ? 'dismissed' : scelta })
  return { evento: e, prompt }
}
