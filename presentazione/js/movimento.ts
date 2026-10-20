// ============================================================================
// Il movimento della landing: la sola fonte del «fermo», la memoria di
// sessione, gli effetti «una volta», l'arbitro delle soglie, lo scroll e i
// salti (MOTION.md, Parte L: §L2.2, §L3, §L9). Il riferimento eseguibile è
// docs/motion/_landing.js: stessi nomi, stesse regole.
//
// Due interruttori, una funzione, un evento (RL6): `prefers-reduced-motion`
// OPPURE `<html data-movimento="fermo">`. Nessun modulo legge la media query
// da sé: chiede `movimentoFermo()` e si iscrive con `alCambioDelMovimento`.
// ============================================================================

const root = document.documentElement
const CHIAVE_FERMO = 'bvd_landing_fermo'
const CHIAVE_VISTI = 'bvd_landing_visti'

/** Dopo un salto da tab o menu, lo scroll non conta come «veloce» né sveglia la battuta. */
export const PROGRAMMATICO_MS = 300
/** Uno scroll più veloce di così, per almeno VELOCE_MS, sorprende Pallo. */
export const VELOCE_PX_S = 3000
export const VELOCE_MS = 150
/** La battuta aspetta che lo scroll sia fermo da tanto. */
export const QUIETE_MS = 250

// ------------------------------------------------------------ memoria
function leggi(store: 'localStorage' | 'sessionStorage', k: string): string | null {
  try {
    return window[store].getItem(k)
  } catch {
    return null
  }
}
function scrivi(store: 'localStorage' | 'sessionStorage', k: string, v: string | null) {
  try {
    if (v == null) window[store].removeItem(k)
    else window[store].setItem(k, v)
  } catch {
    /* in memoria: ogni visita è la prima, il fermo vale fino alla ricarica */
  }
}

// -------------------------------------------------------------- il fermo
const ridotto = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** Il movimento è fermo: preferenza di sistema, o «Ferma le animazioni». */
export function movimentoFermo(): boolean {
  return (ridotto?.matches ?? false) || root.dataset.movimento === 'fermo'
}
/** Il sistema ha già ridotto il movimento: il comando della pagina non serve. */
export function ridottoDalSistema(): boolean {
  return ridotto?.matches ?? false
}

const ascoltatori = new Set<(fermo: boolean) => void>()
let ultimo = movimentoFermo()
function avvisa() {
  const ora = movimentoFermo()
  sincronizzaComandi()
  if (ora === ultimo) return
  ultimo = ora
  for (const fn of ascoltatori) {
    try {
      fn(ora)
    } catch (e) {
      console.error(e)
    }
  }
}
ridotto?.addEventListener?.('change', avvisa)

/** Si iscrive ai cambi del fermo (media query o comando). Restituisce la disiscrizione. */
export function alCambioDelMovimento(fn: (fermo: boolean) => void): () => void {
  ascoltatori.add(fn)
  return () => ascoltatori.delete(fn)
}
/** La stessa iscrizione, nella forma che vogliono i moduli dell'app (Pallo.vita, palleggio). */
export const alCambio = (fn: () => void) => alCambioDelMovimento(() => fn())

/** Le tre istanze del comando cambiano insieme; lo stato vive sull'<html> e nel dispositivo. */
export function impostaFermo(on: boolean) {
  if (on) root.dataset.movimento = 'fermo'
  else delete root.dataset.movimento
  scrivi('localStorage', CHIAVE_FERMO, on ? '1' : null)
  avvisa()
}

function sincronizzaComandi() {
  const premuto = root.dataset.movimento === 'fermo'
  const sistema = ridottoDalSistema() && !premuto
  for (const b of document.querySelectorAll<HTMLElement>('[data-comando="fermo"]')) {
    b.setAttribute('aria-pressed', String(premuto))
    if (sistema) b.setAttribute('aria-disabled', 'true')
    else b.removeAttribute('aria-disabled')
  }
}

/** Accende il comando «Ferma le animazioni» (hero, menu della guida, footer). */
export function avviaMovimento() {
  // `fermo.js`, classico e bloccante nel <head>, ha già messo l'attributo se
  // serviva (ML15): qui si allineano i comandi e si ascoltano i tocchi.
  if (leggi('localStorage', CHIAVE_FERMO) === '1') root.dataset.movimento = 'fermo'
  ultimo = movimentoFermo()
  sincronizzaComandi()
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest?.('[data-comando="fermo"]')
    if (!b || b.getAttribute('aria-disabled') === 'true') return
    impostaFermo(root.dataset.movimento !== 'fermo')
  })
}

// ------------------------------------------------------------- sessione
let visti = new Set<string>()
try {
  visti = new Set(JSON.parse(leggi('sessionStorage', CHIAVE_VISTI) || '[]') as string[])
} catch {
  /* prima visita */
}
/** Un effetto «una volta» o una battuta già visti in questa sessione. */
export const visto = (k: string) => visti.has(k)
export function segna(k: string) {
  visti.add(k)
  scrivi('sessionStorage', CHIAVE_VISTI, JSON.stringify([...visti]))
}

// -------------------------------------------- effetti «una volta» (RL3)
export interface Effetto {
  /** La chiave in `bvd_landing_visti`. */
  chiave: string
  /** Quanto dev'essere in vista perché scatti (SOGLIA_EFFETTO). */
  soglia?: number
  /** Arma: porta l'elemento allo stato di partenza, dove nessuno guarda. */
  prepara?: () => void
  /** Scatta: dallo stato di partenza a quello finale, animando. */
  scatta: () => void
  /** Lo stato finale senza animazione (focus dentro, fermo, già visto). */
  finale?: () => void
  /** Dove ascoltare il fuoco che porta allo stato finale (RL4), se non è `el`. */
  fuoco?: Element
}

/**
 * All'avvio l'elemento è nello stato FINALE (è l'HTML). Se la prima notizia
 * dell'observer dice «fuori vista» e non è già stato visto, si ARMA (il
 * cambio avviene dove nessuno guarda); poi scatta alla soglia, da qualunque
 * lato. Un focus dentro un effetto armato lo porta subito allo stato finale
 * (RL4). «Chi arma, arma per ultimo» (§L8): `prepara` si chiama solo con
 * l'observer già in piedi, così un errore prima lascia lo stato finale.
 */
export function arma(el: Element, e: Effetto) {
  const chiudi = () => e.finale?.()
  if (typeof IntersectionObserver === 'undefined' || movimentoFermo() || visto(e.chiave)) return chiudi()
  const soglia = e.soglia ?? 0.5
  let armato = false
  let primo = true
  const fuoco = e.fuoco ?? el
  const fine = (anima: boolean) => {
    io.disconnect()
    fuoco.removeEventListener('focusin', alFocus)
    segna(e.chiave)
    el.removeAttribute('data-armato')
    if (anima && !movimentoFermo()) e.scatta()
    else chiudi()
  }
  const alFocus = () => {
    if (armato) fine(false)
  }
  const io = new IntersectionObserver(
    (voci) => {
      const v = voci[voci.length - 1]
      if (primo) {
        primo = false
        if (v.isIntersecting) return fine(false)
        armato = true
        el.setAttribute('data-armato', '')
        fuoco.addEventListener('focusin', alFocus)
        e.prepara?.()
        return
      }
      if (armato && v.intersectionRatio >= soglia) fine(true)
    },
    { threshold: [0, soglia] },
  )
  // Il fermo acceso mentre è armato: l'effetto resta armato e, quando scatta,
  // arriva fermo (MOTION §L3.3): lo decide `fine`, che rilegge il fermo.
  io.observe(el)
}

// ------------------------------------------------------------- arbitro
/**
 * Le notizie degli observer arrivano in callback separate: si raccolgono e
 * si decide UNA volta, nel fotogramma dopo, con lo stato di tutte (§L9.1).
 */
export function arbitro(decidi: () => void): () => void {
  let raf = 0
  return () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      decidi()
    })
  }
}

// --------------------------------------------------------------- scroll
// L'unico listener di scroll: passivo, legge `scrollY` e il `timeStamp`
// dell'evento. Niente `getBoundingClientRect` durante lo scroll (RL2).
export const scroll = { ultimo: -Infinity, y: 0, t: 0, veloceDa: 0, programmatico: -Infinity, utente: false }
const allaVelocita = new Set<() => void>()
const alloScroll = new Set<() => void>()
/** Uno scroll veloce dell'utente (non programmatico). */
export const quandoVeloce = (fn: () => void) => allaVelocita.add(fn)
/** Il primo scroll dell'utente, e ogni scroll dopo (per la quiete). */
export const quandoScorre = (fn: () => void) => alloScroll.add(fn)
/** Lo scroll è fermo da `ms`. */
export const quieto = (ms = QUIETE_MS) => performance.now() - scroll.ultimo >= ms
/** C'è appena stato un salto da tab o da menu. */
export const programmatico = () => performance.now() - scroll.programmatico < PROGRAMMATICO_MS

export function avviaScroll() {
  scroll.y = window.scrollY
  scroll.t = performance.now()
  window.addEventListener(
    'scroll',
    (e) => {
      const t = e.timeStamp || performance.now()
      const dy = Math.abs(window.scrollY - scroll.y)
      const dt = Math.max(1, t - scroll.t)
      const velocita = (dy / dt) * 1000
      scroll.y = window.scrollY
      scroll.t = t
      if (t - scroll.programmatico < PROGRAMMATICO_MS) {
        scroll.veloceDa = 0
        return
      }
      scroll.ultimo = t
      scroll.utente = true
      for (const fn of alloScroll) fn()
      if (velocita > VELOCE_PX_S) {
        if (!scroll.veloceDa) scroll.veloceDa = t
        else if (t - scroll.veloceDa >= VELOCE_MS) {
          scroll.veloceDa = 0
          for (const fn of allaVelocita) fn()
        }
      } else scroll.veloceDa = 0
    },
    { passive: true },
  )
}

// ---------------------------------------------------------------- salti
const alSalto = new Set<(id: string) => void>()
/** Avvisa chi deve sapere di un salto (la guida chiude il menu, la battuta d'arrivo). */
export const quandoSalta = (fn: (id: string) => void) => alSalto.add(fn)

/**
 * Salto ISTANTANEO a una sezione (MOTION §L9.2, ML7: mai smooth), focus al
 * titolo a t0 con `preventScroll`, history sostituita: i salti fra sezioni
 * non riempiono l'«indietro» del telefono (UX §L4.2).
 */
export function salta(id: string) {
  const s = document.getElementById(id)
  if (!s) return
  scroll.programmatico = performance.now()
  s.scrollIntoView({ block: 'start', behavior: 'auto' })
  const h = s.querySelector<HTMLElement>('h1, h2')
  h?.focus({ preventScroll: true })
  try {
    history.replaceState(history.state, '', '#' + id)
  } catch {
    /* history bloccata (file://, sandbox): il salto c'è lo stesso */
  }
  for (const fn of alSalto) fn(id)
}

/** Ogni link interno alla pagina salta istantaneo, col focus al titolo. */
export function avviaSalti() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
    if (!a) return
    const id = decodeURIComponent((a.getAttribute('href') ?? '').slice(1))
    if (!id || !document.getElementById(id)) return
    // Il link «Salta al contenuto» resta nativo: porta a <main>, non a una sezione.
    if (a.classList.contains('skip-link')) return
    e.preventDefault()
    salta(id)
  })
}
