// ============================================================================
// Router senza dipendenze: History API + `popstate` (UX.md §4). Due store
// esterni nello stesso modulo, perché condividono la stessa history:
//
//   - la NAVIGAZIONE: rotta corrente, come ci si è arrivati (push, replace,
//     indietro), lo `state` della voce (scroll e focus da ripristinare, titolo
//     della schermata precedente, la riga da segnare con la traccia);
//   - la PILA DEGLI OVERLAY: ogni sheet, menu, dialogo o visore aggiunge una
//     voce di history "leggera" (stesso URL, `state.overlay = chiave`), così il
//     tasto indietro del telefono lo chiude invece di cambiare pagina (§4.3).
//
// Regole che non si vedono dal codice:
// - l'hash non si tocca: supabase-js ci legge i token di conferma e OAuth;
// - nessuna animazione di rotta e nessun `startTransition` (MOTION.md §17 F3):
//   la rotta nuova si disegna nello stesso task del tocco;
// - un refresh con un overlay aperto non lo riapre (la voce viene ripulita).
// ============================================================================
import { createElement, forwardRef, useSyncExternalStore } from 'react'
import type { AnchorHTMLAttributes, MouseEvent as ReactMouseEvent } from 'react'
import { isRedirect, parseLocation, routeHref } from './routes'
import type { Route } from './routes'
import { discardSpec, overlayReducer } from './overlays'
import type { Overlay, OverlayAction, OverlayEntry } from './overlays'

export interface HistoryState {
  bvd: 1
  /** Profondità nella history dell'app: con 0 l'indietro esce dall'app. */
  idx: number
  /** Titolo della schermata da cui si è arrivati: l'etichetta di ‹ Indietro. */
  prevTitle?: string
  /** Scroll della voce, salvato quando la si lascia. */
  scroll?: number
  /** `href` del link che ha aperto la voce successiva: il focus ci torna. */
  focusHref?: string
  /** Chiave dell'overlay aperto su questa voce. */
  overlay?: string
  /** Id dell'entità da segnare con la traccia all'arrivo (MOTION.md §10). */
  traccia?: string
}

export type NavKind = 'init' | 'push' | 'replace' | 'pop'

export interface NavState {
  route: Route
  kind: NavKind
  /** Cresce a ogni navigazione: è la dipendenza degli effetti di focus e scroll. */
  seq: number
  /** Il cambio non sposta il focus (segmented, `?q=`: MOTION.md M4). */
  keepFocus: boolean
  state: HistoryState
}

export interface NavigateOptions {
  replace?: boolean
  keepFocus?: boolean
  /** Lo scroll non torna in cima (cambio di vista dentro la stessa schermata). */
  keepScroll?: boolean
  traccia?: string
  /** `href` dell'elemento che naviga: salvato nella voce che si lascia. */
  focusHref?: string
}

const BASE: HistoryState = { bvd: 1, idx: 0 }

let nav: NavState | null = null
let stack: OverlayEntry[] = []
const navSubs = new Set<() => void>()
const stackSubs = new Set<() => void>()
/** Un `history.back()`/`go(-n)` partito da noi: il suo `popstate` non è un gesto. */
let expecting: { then?: () => void } | null = null
let keepScrollNext = false
let keyN = 0
let booted = false

// Il primo tocco di un'apertura veniva da un dito? (MOTION.md §3.5)
let lastPointer = 'keyboard'
let pointerWatch = false

function readState(): HistoryState {
  const s = window.history.state as Partial<HistoryState> | null
  return s && s.bvd === 1 ? (s as HistoryState) : BASE
}

function readRoute(): Route {
  return parseLocation(window.location.pathname, window.location.search)
}

function urlNow(): string {
  return window.location.pathname + window.location.search
}

function boot(): NavState {
  if (booted && nav) return nav
  booted = true
  try {
    window.history.scrollRestoration = 'manual'
  } catch {
    /* alcuni browser incorporati non lo permettono */
  }
  let st = readState()
  // Refresh con un overlay aperto: non si riapre da solo (UX §4.3.4).
  if (st.overlay) {
    const { overlay: _overlay, ...rest } = st
    st = rest as HistoryState
  }
  let route = readRoute()
  if (isRedirect(window.location.pathname)) {
    window.history.replaceState(st, '', routeHref(route) + window.location.hash)
    route = readRoute()
  } else {
    window.history.replaceState(st, '')
  }
  nav = { route, kind: 'init', seq: 0, keepFocus: false, state: st }
  lastUrl = urlNow()
  window.addEventListener('popstate', onPop)
  if (!pointerWatch) {
    pointerWatch = true
    window.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse' }, true)
    window.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) lastPointer = 'keyboard' }, true)
  }
  return nav
}

let lastUrl = ''

function setNav(route: Route, kind: NavKind, state: HistoryState, keepFocus = false) {
  const prev = nav ?? boot()
  nav = { route, kind, seq: prev.seq + 1, keepFocus, state }
  lastUrl = urlNow()
  navSubs.forEach((f) => f())
}

function dispatch(a: OverlayAction) {
  stack = overlayReducer(stack, a)
  stackSubs.forEach((f) => f())
}

function onPop() {
  const st = readState()
  const urlChanged = urlNow() !== lastUrl
  if (expecting) {
    const e = expecting
    expecting = null
    if (urlChanged) setNav(readRoute(), 'pop', st)
    else if (nav) nav = { ...nav, state: st }
    e.then?.()
    return
  }
  // Indietro (o avanti) dell'utente. Gli overlay sopra la voce raggiunta si
  // chiudono, con la stessa uscita di ✕/Annulla (MOTION.md §3.8).
  if (stack.length) {
    const keep = st.overlay ? stack.findIndex((e) => e.key === st.overlay) + 1 : 0
    if (keep < stack.length) {
      const top = stack[stack.length - 1]
      if (!urlChanged && (top.dirty || top.busy)) {
        // Il `popstate` non si annulla: si rimette la voce e si chiede (UX §4.3.3).
        window.history.pushState({ ...st, overlay: top.key, idx: st.idx + 1 }, '')
        if (top.dirty && top.overlay.kind !== 'conferma') {
          openOverlay({ kind: 'conferma', spec: discardSpec(() => closeOverlays(2, { force: true })) })
        }
        return
      }
      dispatch({ type: 'truncate', length: keep })
    }
  } else if (st.overlay) {
    // Avanti verso una voce di un overlay già chiuso: resta una copia della
    // pagina, senza chiave.
    const { overlay: _overlay, ...rest } = st
    window.history.replaceState(rest, '')
  }
  if (urlChanged) setNav(readRoute(), 'pop', readState())
}

// ------------------------------------------------------------- scroll
/** Chi scorre: `<main>` su desktop (lo dichiara con `data-scroller`), la pagina sotto i 900. */
export function scroller(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('[data-scroller]') ??
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement
  )
}

export function currentScroll(): number {
  return scroller().scrollTop
}

/** Oltre tre schermate dalla cima, prima un salto secco e poi lo scorrimento (MOTION.md §9.3). */
export const SALTO_SCROLL = 3

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Torna in cima. Morbido solo per i gesti (ritocco della tab, lente della
 * NavBar): da lontano lo smooth di Chrome dura 1,5s, quindi prima si salta a
 * una schermata dalla cima. Con reduced-motion è sempre istantaneo.
 */
export function scrollToTop(smooth = false): void {
  const el = scroller()
  if (!smooth || reducedMotion()) {
    el.scrollTo({ top: 0, behavior: 'auto' })
    return
  }
  const vh = window.innerHeight
  if (el.scrollTop > SALTO_SCROLL * vh) el.scrollTo({ top: vh, behavior: 'auto' })
  el.scrollTo({ top: 0, behavior: 'smooth' })
}

function pageTitle(): string {
  return document.title.split(' · ')[0] || ''
}

// ------------------------------------------------------------- navigazione
export function navigate(to: Route, opts: NavigateOptions = {}): void {
  boot()
  const href = routeHref(to)
  const cur = readState()

  // Navigare con un overlay aperto (successo che porta altrove, voce del menu
  // che è una rotta): la voce dell'overlay DIVENTA la destinazione (UX §4.2).
  // Così l'indietro dal torneo appena creato torna alla pagina di partenza e
  // non riapre lo sheet. Con `replace` invece si torna alla pagina e la si
  // sostituisce (eliminazione riuscita: il dettaglio non deve più esistere).
  if (stack.length && cur.overlay) {
    const n = stack.length
    dispatch({ type: 'clear' })
    if (opts.replace) {
      expecting = { then: () => navigate(to, opts) }
      window.history.go(-n)
    } else if (n > 1) {
      expecting = { then: () => landOnOverlayEntry(to, opts) }
      window.history.go(-(n - 1))
    } else {
      landOnOverlayEntry(to, opts)
    }
    return
  }
  if (stack.length) dispatch({ type: 'clear' })

  if (!opts.replace) {
    window.history.replaceState({ ...cur, scroll: currentScroll(), focusHref: opts.focusHref ?? cur.focusHref }, '')
  }
  const st: HistoryState = {
    bvd: 1,
    idx: opts.replace ? cur.idx : cur.idx + 1,
    prevTitle: opts.replace ? cur.prevTitle : pageTitle(),
    traccia: opts.traccia,
  }
  if (opts.replace) window.history.replaceState(st, '', href)
  else window.history.pushState(st, '', href)
  keepScrollNext = !!opts.keepScroll
  setNav(to, opts.replace ? 'replace' : 'push', st, !!opts.keepFocus)
}

function landOnOverlayEntry(to: Route, opts: NavigateOptions) {
  const cur = readState()
  const st: HistoryState = { bvd: 1, idx: cur.idx, prevTitle: pageTitle(), traccia: opts.traccia }
  window.history.replaceState(st, '', routeHref(to))
  keepScrollNext = !!opts.keepScroll
  setNav(to, 'push', st, !!opts.keepFocus)
}

/** Lo consuma la shell: questa navigazione non riporta lo scroll in cima. */
export function takeKeepScroll(): boolean {
  const v = keepScrollNext
  keepScrollNext = false
  return v
}

/**
 * ‹ Indietro della NavBar: se la voce precedente è dell'app torna lì (e
 * l'etichetta è il suo titolo), altrimenti va al genitore in `replace`.
 */
export function goBack(fallback: Route | null): void {
  const st = readState()
  if (st.idx > 0) window.history.back()
  else if (fallback) navigate(fallback, { replace: true })
}

/** L'etichetta di ‹ Indietro: la schermata precedente, se è nostra. */
export function backLabel(fallbackTitle: string): string {
  const st = nav?.state ?? readState()
  return st.idx > 0 && st.prevTitle ? st.prevTitle : fallbackTitle
}

function subscribeNav(f: () => void) {
  boot()
  navSubs.add(f)
  return () => {
    navSubs.delete(f)
  }
}

export function useNav(): NavState {
  return useSyncExternalStore(subscribeNav, () => nav ?? boot(), () => nav ?? boot())
}

export function useRoute(): Route {
  return useNav().route
}

// ------------------------------------------------------------- <Link>
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: Route
  replace?: boolean
  keepFocus?: boolean
  keepScroll?: boolean
  traccia?: string
}

/**
 * Un `<a href>` vero: si apre in un'altra scheda, si copia, lo legge uno
 * screen reader come link. Intercetta solo il clic sinistro senza modificatori.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, keepFocus, keepScroll, traccia, onClick, target, ...rest },
  ref,
) {
  const href = routeHref(to)
  return createElement('a', {
    ...rest,
    ref,
    href,
    target,
    onClick: (e: ReactMouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
      if (target && target !== '_self') return
      e.preventDefault()
      navigate(to, { replace, keepFocus, keepScroll, traccia, focusHref: href })
    },
  })
})

// ------------------------------------------------------------- overlay
function subscribeStack(f: () => void) {
  boot()
  stackSubs.add(f)
  return () => {
    stackSubs.delete(f)
  }
}

const EMPTY: OverlayEntry[] = []
export function useOverlays(): OverlayEntry[] {
  return useSyncExternalStore(subscribeStack, () => stack, () => EMPTY)
}

export function overlayStack(): OverlayEntry[] {
  return stack
}

export interface OpenOverlayOptions {
  /** Il menu ＋ che diventa uno sheet: la sua voce di history viene sostituita. */
  replaceTop?: boolean
  /** Elemento a cui ancorare un popover. */
  anchor?: HTMLElement | null
}

/** Apre un overlay con la sua voce di history leggera. Restituisce la chiave. */
export function openOverlay(o: Overlay, opts: OpenOverlayOptions = {}): string {
  boot()
  const key = `o${++keyN}`
  const st = readState()
  const prevTop = stack[stack.length - 1]
  const active = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null
  const entry: OverlayEntry = {
    key,
    overlay: o,
    dirty: false,
    busy: false,
    // Il menu sostituito non c'è più: il focus torna a chi aveva aperto lui.
    opener: opts.replaceTop && prevTop ? prevTop.opener : active,
    byTouch: lastPointer === 'touch' || lastPointer === 'pen',
    anchor: opts.anchor ?? null,
  }
  if (opts.replaceTop && prevTop && st.overlay === prevTop.key) {
    window.history.replaceState({ ...st, overlay: key }, '')
    dispatch({ type: 'replaceTop', entry })
  } else {
    window.history.pushState({ ...st, overlay: key, idx: st.idx + 1 }, '')
    dispatch({ type: 'push', entry })
  }
  return key
}

/**
 * Chiude l'overlay in cima, con la guardia: con un modulo sporco chiede
 * «Scartare le modifiche?», durante un salvataggio non fa niente.
 */
export function closeOverlay(opts: { force?: boolean } = {}): void {
  const top = stack[stack.length - 1]
  if (!top) return
  if (!opts.force) {
    if (top.busy) return
    if (top.dirty) {
      openOverlay({ kind: 'conferma', spec: discardSpec(() => closeOverlays(2, { force: true })) })
      return
    }
  }
  closeOverlays(1, { force: true })
}

/** Chiude gli ultimi `n` overlay insieme (le uscite partono nello stesso istante). */
export function closeOverlays(n: number, opts: { force?: boolean; then?: () => void } = {}): void {
  const k = Math.min(n, stack.length)
  if (!k) {
    opts.then?.()
    return
  }
  const top = stack[stack.length - 1]
  const st = readState()
  dispatch({ type: 'pop', n: k })
  if (st.overlay === top.key) {
    expecting = { then: opts.then }
    window.history.go(-k)
  } else {
    opts.then?.()
  }
}

/** Chiude tutto e poi, a history sistemata, esegue `then` (di solito un `navigate`). */
export function closeAllOverlays(then?: () => void): void {
  closeOverlays(stack.length, { force: true, then })
}

export function setOverlayFlags(key: string, flags: { dirty?: boolean; busy?: boolean }): void {
  const e = stack.find((x) => x.key === key)
  if (!e) return
  if ((flags.dirty ?? e.dirty) === e.dirty && (flags.busy ?? e.busy) === e.busy) return
  dispatch({ type: 'flags', key, ...flags })
}

/** Solo per i test: rilegge `location` come al primo avvio. */
export function __resetRouterForTests(): void {
  if (booted) window.removeEventListener('popstate', onPop)
  booted = false
  nav = null
  stack = []
  expecting = null
  keepScrollNext = false
  boot()
  navSubs.forEach((f) => f())
  stackSubs.forEach((f) => f())
}
