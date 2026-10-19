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
import './Tabellone.css'

type Tempo = 'molla' | 'racconto'

const parse = (t: string) => {
  const m = /^(\D*)(\d+)(\D*)$/.exec(t)
  return m ? { pre: m[1], num: m[2], suf: m[3] } : null
}
// Indice nella striscia [vuoto, 0–9, 0–9].
const IDX = (ch: string, giro2 = false) => (ch === ' ' ? 0 : 1 + Number(ch) + (giro2 ? 10 : 0))
const CIFRE = '0123456789'

function durata(el: HTMLElement, tempo: Tempo): number {
  const v = getComputedStyle(el).getPropertyValue(`--dur-${tempo}`).trim()
  const n = parseFloat(v)
  return Number.isFinite(n) ? (v.endsWith('s') && !v.endsWith('ms') ? n * 1000 : n) : tempo === 'molla' ? 320 : 800
}

class Odometro {
  private el: HTMLElement
  private sr: HTMLElement
  private cols: HTMLElement
  private pre: HTMLElement
  private suf: HTMLElement
  private timer = 0
  text: string | null = null

  constructor(el: HTMLElement) {
    this.el = el
    el.replaceChildren()
    this.sr = document.createElement('span')
    this.sr.className = 'sr-only'
    const odo = document.createElement('span')
    odo.className = 'ui-odo'
    odo.setAttribute('aria-hidden', 'true')
    this.pre = document.createElement('span')
    this.pre.className = 'ui-odo-t'
    this.cols = document.createElement('span')
    this.cols.className = 'ui-odo-cols'
    this.suf = document.createElement('span')
    this.suf.className = 'ui-odo-t'
    odo.append(this.pre, this.cols, this.suf)
    el.append(this.sr, odo)
  }

  private colonna(ch: string): HTMLElement {
    const d = document.createElement('span')
    d.className = 'ui-odo-d'
    const strip = document.createElement('span')
    strip.className = 'ui-odo-strip'
    strip.append(document.createElement('span'))
    // Le cifre sono contenuto generato (`::before { content: attr(data-d) }`),
    // non testo: il numero letto, copiato e cercato è uno solo, quello nel
    // testo nascosto. Altrimenti "4" comparirebbe tre volte nel DOM.
    for (const c of CIFRE + CIFRE) {
      const s = document.createElement('span')
      s.dataset.d = c
      strip.append(s)
    }
    strip.style.setProperty('--k', String(IDX(ch)))
    d.append(strip)
    return d
  }

  /** Il valore disegnato fermo, senza animazione. */
  fermo(text: string) {
    window.clearTimeout(this.timer)
    const p = parse(text)
    this.pre.dataset.t = p ? p.pre : ''
    this.suf.dataset.t = p ? p.suf : ''
    if (p) this.cols.replaceChildren(...p.num.split('').map((c) => this.colonna(c)))
    else {
      const raw = document.createElement('span')
      raw.dataset.t = text
      this.cols.replaceChildren(raw)
    }
  }

  set(text: string, anima: boolean) {
    const prima = this.text
    this.text = text
    this.sr.textContent = text
    const a = prima != null ? parse(prima) : null
    const b = parse(text)
    if (!anima || !a || !b || a.pre !== b.pre || a.suf !== b.suf) return this.fermo(text)
    if (a.num === b.num) return
    this.fermo(prima as string) // un giro precedente a metà: si parte dal suo arrivo
    const su = Number(b.num) > Number(a.num)
    const salto = Math.abs(Number(b.num) - Number(a.num))
    const tempo: Tempo = salto <= 1 ? 'molla' : 'racconto'
    const n = Math.max(a.num.length, b.num.length)
    const da = a.num.padStart(n, ' ')
    const db = b.num.padStart(n, ' ')
    const guadagno = n - a.num.length
    const perdita = n - b.num.length
    for (let i = 0; i < guadagno; i++) this.cols.prepend(this.colonna(' '))
    const cols = Array.from(this.cols.children) as HTMLElement[]
    const w = cols[cols.length - 1].getBoundingClientRect().width
    // Le cifre che restano si spostano di lato quando il numero guadagna o
    // perde una colonna: FLIP orizzontale, anche lui solo transform.
    const stabili = cols.filter((_, i) => da[i] !== ' ' && db[i] !== ' ')
    const uscenti = cols.filter((_, i) => da[i] !== ' ' && db[i] === ' ')
    uscenti.forEach((c, j) => {
      c.style.position = 'absolute'
      c.style.left = `${j * w}px`
      c.style.top = '0'
    })
    const dx = perdita ? perdita * w : -guadagno * w
    cols.forEach((c, i) => {
      let from = IDX(da[i])
      let to = IDX(db[i])
      if (su && da[i] !== ' ' && db[i] !== ' ' && to < from) to += 10
      if (!su && da[i] !== ' ' && db[i] !== ' ' && to > from) from += 10
      const s = c.firstElementChild as HTMLElement
      s.style.transition = 'none'
      s.style.setProperty('--k', String(from))
      s.dataset.to = String(to)
    })
    if (dx) for (const c of stabili) { c.style.transition = 'none'; c.style.transform = `translateX(${dx}px)` }
    void this.cols.offsetWidth
    const tr = `transform var(--dur-${tempo}) var(--ease-${tempo})`
    cols.forEach((c) => {
      const s = c.firstElementChild as HTMLElement
      s.style.transition = tr
      s.style.setProperty('--k', s.dataset.to ?? '0')
    })
    if (dx) for (const c of stabili) { c.style.transition = tr; c.style.transform = 'none' }
    for (const c of uscenti) { c.style.transition = 'opacity var(--dur-svelto) var(--ease-standard)'; c.style.opacity = '0' }
    // A fine corsa si ricostruisce il numero "pulito": stessa immagine,
    // indici del primo giro, colonne uscenti tolte.
    this.timer = window.setTimeout(() => this.fermo(text), durata(this.el, tempo) + 60)
  }

  /** Solo il testo per gli screen reader. */
  annuncia(text: string) {
    this.sr.textContent = text
  }

  dispose() {
    window.clearTimeout(this.timer)
  }
}

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
