import { useSyncExternalStore } from 'react'
import { BP } from '../lib/theme'

// Le soglie di UX §9.1 (`BP` in theme.ts). Il 900 è quello di sempre: Sidebar
// da lì in su, TabBar sotto.
const WIDE = `(min-width: ${BP.lg}px)`
const SHEET_CENTERED = `(min-width: ${BP.md}px)`

// jsdom (e qualche browser incorporato) non ha `matchMedia`: lì si risponde
// con il caso mobile, senza esplodere.
function mql(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null
}

export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = mql(query)
      m?.addEventListener('change', cb)
      return () => m?.removeEventListener('change', cb)
    },
    () => mql(query)?.matches ?? fallback,
    () => fallback,
  )
}

/** ≥ 900px: Sidebar, niente TabBar. */
export function useIsWide(): boolean {
  return useMediaQuery(WIDE)
}

/** ≥ 600px: gli sheet diventano un form sheet centrato, senza trascinamento. */
export function useSheetCentered(): boolean {
  return useMediaQuery(SHEET_CENTERED)
}
