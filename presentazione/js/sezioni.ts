// ============================================================================
// La sezione corrente: quella che contiene la linea orizzontale al 40%
// dell'altezza del viewport (UX §L4.1, MOTION §L2.2 `LINEA_SEZIONE`). Un
// IntersectionObserver su una fascia sottile, mai il layout letto a ogni
// fotogramma. Le notizie si raccolgono e si decide in un fotogramma
// (l'arbitro, §L9.1): uno scroll che attraversa una sezione in 100ms non fa
// lampeggiare niente. La usano la barra (la lente) e la guida.
// ============================================================================
import { arbitro } from './movimento'

export const LINEA_SEZIONE = 0.4

/** Le sezioni della pagina, in ordine (UX §L3.1: gli id sono contratto). */
export const SEZIONI = ['inizio', 'diario', 'registra', 'live', 'numeri', 'mappa', 'wrapped', 'dati', 'comincia'] as const
export type Sezione = (typeof SEZIONI)[number]

let corrente: Sezione | null = null
let pronte = false
const ascoltatori = new Set<(s: Sezione | null) => void>()

export const sezioneCorrente = () => corrente
/** L'observer ha già detto dove siamo (all'avvio può essere nessuna sezione). */
export const sezioniPronte = () => pronte
/** Si iscrive al cambio di sezione (anche `null`: la linea è nel footer). */
export function alCambioSezione(fn: (s: Sezione | null) => void): () => void {
  ascoltatori.add(fn)
  return () => ascoltatori.delete(fn)
}

export function avviaSezioni() {
  if (typeof IntersectionObserver === 'undefined') return
  const dentro = new Set<Sezione>()
  const decidi = arbitro(() => {
    // Una sola sezione alla volta contiene la linea; se due si toccano sul
    // filo, vince la più in basso nell'ordine della pagina.
    const nuova = [...SEZIONI].reverse().find((s) => dentro.has(s)) ?? null
    // La prima decisione si annuncia comunque, anche se è «nessuna».
    if (nuova === corrente && pronte) return
    pronte = true
    corrente = nuova
    for (const fn of ascoltatori) {
      try {
        fn(nuova)
      } catch (e) {
        console.error(e)
      }
    }
  })
  const sopra = LINEA_SEZIONE * 100
  const io = new IntersectionObserver(
    (voci) => {
      for (const v of voci) {
        const id = v.target.id as Sezione
        if (v.isIntersecting) dentro.add(id)
        else dentro.delete(id)
      }
      decidi()
    },
    { rootMargin: `-${sopra}% 0px -${100 - sopra - 1}% 0px` },
  )
  for (const id of SEZIONI) {
    const el = document.getElementById(id)
    if (el) io.observe(el)
  }
}
