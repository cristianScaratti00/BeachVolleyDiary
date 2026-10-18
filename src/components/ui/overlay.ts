// ============================================================================
// Il comportamento comune agli overlay (UX §7.5, §7.7, §8.3; MOTION.md §3.5):
// trappola del focus, Esc, focus iniziale A t0 e ritorno del focus a chi ha
// aperto, all'istante zero dell'uscita (non a fine animazione).
// ============================================================================
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (n) => !n.closest('[inert]') && !n.closest('[aria-hidden="true"]') && n.tabIndex >= 0,
  )
}

/** Il primo campo di un modulo, se c'è. */
export function firstField(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    'input:not([disabled]):not([readonly]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]):not([readonly])',
  )
}

/** Tab e Maiusc+Tab ciclano dentro `ref`. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const root = ref.current
    if (!root || !enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const f = focusables(root)
      if (!f.length) {
        e.preventDefault()
        return
      }
      const first = f[0]
      const last = f[f.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [ref, enabled])
}

/** Esc chiude l'overlay in cima. Un Esc già consumato (la ricerca che si svuota) no. */
export function useEscape(handler: () => void, enabled = true) {
  const h = useRef(handler)
  h.current = handler
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      h.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled])
}

/** Il focus va dove deve all'istante zero dell'apertura, senza far scorrere. */
export function useInitialFocus(ref: RefObject<HTMLElement | null>, pick: (root: HTMLElement) => HTMLElement | null) {
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const target = pick(root) ?? root
    target.focus({ preventScroll: true })
    // Solo all'apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * All'inizio dell'uscita il focus torna a chi aveva aperto. Se quell'elemento
 * non esiste più (un'eliminazione), va all'h1 della schermata (UX §8.3.3).
 */
export function restoreFocus(opener: HTMLElement | null | undefined) {
  const target =
    opener && opener.isConnected && !opener.closest('[inert]')
      ? opener
      : document.querySelector<HTMLElement>('main h1')
  target?.focus({ preventScroll: true })
}

export function useReturnFocus(present: boolean, opener: HTMLElement | null | undefined) {
  const fatto = useRef(false)
  useEffect(() => {
    if (present || fatto.current) return
    fatto.current = true
    restoreFocus(opener)
  }, [present, opener])
}

let locks = 0
let saved: { el: HTMLElement; overflow: string }[] = []
/**
 * Blocca lo scroll della pagina sotto finché c'è almeno un overlay. Su desktop
 * chi scorre è `<main data-scroller>`: si blocca anche lui.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (locks++ === 0) {
      const els = [document.documentElement, document.querySelector<HTMLElement>('[data-scroller]')].filter(
        (x): x is HTMLElement => !!x,
      )
      saved = els.map((el) => ({ el, overflow: el.style.overflow }))
      els.forEach((el) => {
        el.style.overflow = 'hidden'
      })
    }
    return () => {
      if (--locks === 0) {
        saved.forEach(({ el, overflow }) => {
          el.style.overflow = overflow
        })
        saved = []
      }
    }
  }, [active])
}
