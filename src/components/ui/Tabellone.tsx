// ============================================================================
// Il tabellone (MOTION.md §10.3): sostituisce `NumeroCheSale`.
//
// Ogni cifra è una colonna ritagliata in verticale che contiene una striscia
// [vuoto, 0–9, 0–9]; il valore è la posizione della striscia. Cambiare valore =
// spostare la striscia con una transizione su `transform`: solo compositor. Il
// vecchio contatore riscriveva il testo a ogni fotogramma per 800ms (E3).
//
// - ±1 è «un punto segnato» e scatta in MOLLA; salti più grandi in RACCONTO.
// - Il secondo giro della striscia serve a passare da 9 a 0 AVANTI, come un
//   contachilometri. Valori che crescono rotolano in su, quelli che calano giù.
// - Le stringhe formattate («67%», «+14») scattano anche loro: i caratteri non
//   numerici stanno fermi prima e dopo le colonne.
// - Una salita da zero per sessione e per schermata (chiave `rise` in
//   sessionStorage, M1); dopo, la schermata si apre con i numeri fermi, così
//   quando un numero si muove vuol dire che è cambiato.
// - Fuori vista o con reduced-motion il valore arriva fermo.
// - Accessibilità: le strisce sono `aria-hidden`; accanto c'è il valore finale
//   in testo nascosto, già aggiornato a t0. Nessun annuncio dal vivo.
//
// Il DOM delle colonne lo gestisce la classe qui sotto, non React: è una
// coreografia imperativa (misure, transizioni spente e riaccese) che React
// ridisegnerebbe nel momento sbagliato. React possiede solo il contenitore.
// ============================================================================
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { Odometro, parse } from './Odometro'
import './Tabellone.css'

function inVista(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight
}

function giaSalito(key: string): boolean {
  try {
    return window.sessionStorage.getItem(`bvd_salito:${key}`) === '1'
  } catch {
    return true
  }
}
function segnaSalito(key: string) {
  try {
    window.sessionStorage.setItem(`bvd_salito:${key}`, '1')
  } catch {
    /* sessione privata: si sale e basta */
  }
}

export type TabelloneSize = 'hero' | 'xl' | 'l' | 'm' | 's'

export function Tabellone({ value, size = 'l', rise, delay = 0, className }: {
  value: string | number
  size?: TabelloneSize
  /** Chiave della schermata per la salita da zero una volta per sessione. */
  rise?: string
  /** Ritardo causale in ms (il «Punto segnato» parte quando lo sheet ha liberato la vista). */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const odo = useRef<Odometro | null>(null)
  const ridotto = useReducedMotion()
  const text = String(value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new Odometro(el)
    odo.current = o
    if (rise && parse(text) && !ridotto && !giaSalito(rise)) {
      // Prima volta in questa sessione: si parte da zero e si sale.
      o.set(text.replace(/\d+/, '0'), false)
      o.annuncia(text) // il valore vero per gli screen reader c'è già a t0
      // La chiave si segna quando la salita parte davvero (in StrictMode il
      // primo montaggio viene smontato prima del fotogramma).
      const raf = window.requestAnimationFrame(() => {
        segnaSalito(rise)
        o.set(text, inVista(el))
      })
      return () => {
        window.cancelAnimationFrame(raf)
        o.dispose()
      }
    }
    o.set(text, false)
    return () => o.dispose()
    // Il montaggio decide la salita una volta sola: i cambi passano dall'effetto sotto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const o = odo.current
    const el = ref.current
    if (!o || !el || o.text === text) return
    const anima = !ridotto && inVista(el)
    if (!delay || !anima) {
      o.set(text, anima)
      return
    }
    const t = window.setTimeout(() => o.set(text, inVista(el)), delay)
    return () => window.clearTimeout(t)
  }, [text, ridotto, delay])

  return <span ref={ref} className={className ? `ui-tabellone ${className}` : 'ui-tabellone'} data-size={size} />
}
