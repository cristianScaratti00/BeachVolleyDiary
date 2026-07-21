import { useSyncExternalStore } from 'react'

// Network Information API: non fa parte dei tipi DOM standard e manca su alcuni
// browser (Safari, Firefox), quindi la leggiamo in modo difensivo. Dove non c'è,
// restiamo comunque sensibili allo stato online/offline.
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  readonly downlink?: number // banda stimata in Mbps
  readonly rtt?: number // latenza stimata in ms
  readonly saveData?: boolean // "risparmio dati" attivo
}

function getConnection(): NetworkInformation | undefined {
  const nav = navigator as unknown as {
    connection?: NetworkInformation
    mozConnection?: NetworkInformation
    webkitConnection?: NetworkInformation
  }
  return nav.connection || nav.mozConnection || nav.webkitConnection
}

// Connessione "non ottimale": offline, tecnologia 3g o inferiore, risparmio dati
// attivo, banda troppo bassa o latenza troppo alta.
function computeSlow(): boolean {
  if (navigator.onLine === false) return true
  const c = getConnection()
  if (!c) return false
  if (c.saveData) return true
  if (c.effectiveType && ['slow-2g', '2g', '3g'].includes(c.effectiveType)) return true
  if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1.5) return true
  if (typeof c.rtt === 'number' && c.rtt > 400) return true
  return false
}

function subscribe(cb: () => void): () => void {
  const c = getConnection()
  if (c) c.addEventListener('change', cb)
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    if (c) c.removeEventListener('change', cb)
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

// true quando la connessione internet non è ottimale.
export function useSlowConnection(): boolean {
  return useSyncExternalStore(subscribe, computeSlow, () => false)
}
