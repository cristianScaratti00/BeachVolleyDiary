// ============================================================================
// Il contachilometri del tabellone (MOTION.md §10.3), senza React: la classe
// che possiede il DOM delle colonne di cifre. La usano `Tabellone.tsx` (che
// possiede solo il contenitore) e la landing `/presentazione`, che non ha un
// framework. Le classi (`ui-odo*`) sono quelle di Tabellone.css.
//
// Ogni cifra è una colonna ritagliata in verticale che contiene una striscia
// [vuoto, 0–9, 0–9]; il valore è la posizione della striscia. Cambiare valore =
// spostare la striscia con una transizione su `transform`: solo compositor.
// Chi chiama decide se animare (`set(text, anima)`): fuori vista, con
// reduced-motion o col comando «Ferma le animazioni» passa `false`.
// ============================================================================

type Tempo = 'molla' | 'racconto'

/** «+14» → { pre: '+', num: '14', suf: '' }; null se non c'è un numero intero. */
export function parse(t: string): { pre: string; num: string; suf: string } | null {
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

export class Odometro {
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
