import { useSyncExternalStore } from 'react'

// Desktop breakpoint used by the design (>= 900px shows the sidebar).
const query = '(min-width: 900px)'

function subscribe(cb: () => void): () => void {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true, // SSR fallback -> wide
  )
}
