// ============================================================================
// Pallo sulla landing, senza React: lo stesso disegno (lo snapshot di
// `Pallo.tsx`, `generati/pallo.ts`), la stessa vita (`Pallo.vita.ts`: sguardo,
// ammiccare, gesti) e la stessa API di `PalloHandle`: `reagisci`, `tocca`,
// `sorpresa`, più `setUmore`.
//
// Un umore alla volta nel DOM: cambiare umore sostituisce l'interno
// dell'<svg> nello stesso fotogramma (Pallo non si «trasforma», cambia
// faccia; MOTION §L5.2 e §L12). La vita gira solo in vista, a scheda
// visibile e col movimento permesso: il fermo della pagina le arriva
// iniettato (`movimentoFermo`), non dalla sola media query.
// ============================================================================
import {
  ALLEGRI,
  OCCHIALI_MS,
  PALLEGGIO_MS,
  REAZIONE_MS,
  TOCCHI_DI_FILA,
  TOCCHI_GAP_MS,
  avviaVita,
} from '../../src/components/Pallo.vita'
import type { PalloSorpresa, PalloUmore } from '../../src/components/Pallo.vita'
import { corpoDi, disegnoDi, svgPallo } from './pallo.disegno'
import type { OpzioniDisegno } from './pallo.disegno'
import { alCambio, movimentoFermo } from './movimento'

export type { PalloUmore, PalloSorpresa }

/** Quanto dura il «boing» del tocco in Pallo.css. */
export const BOING_MS = 620

let conta = 0
const nuovoId = () => `p${++conta}`

/** Un Pallo nuovo, come elemento (per le parti della pagina che il modulo crea). */
export function creaPallo(umore: PalloUmore, o: OpzioniDisegno & { classe?: string } = {}): SVGSVGElement {
  const t = document.createElement('template')
  t.innerHTML = svgPallo(umore, nuovoId(), o)
  return t.content.firstElementChild as SVGSVGElement
}

export interface OpzioniPallo extends OpzioniDisegno {
  /** Gli occhi seguono il dito e il puntatore. */
  segui?: boolean
  /** Ammicca e fa piccoli gesti a caso (di serie). */
  vivo?: boolean
}

export class Pallo {
  readonly svg: SVGSVGElement
  private base: PalloUmore
  private reazione: PalloUmore | null = null
  private sorprende: PalloSorpresa | null = null
  private readonly o: OpzioniPallo
  private readonly id = nuovoId()
  private fine = 0
  private fineBoing = 0
  private n = 0
  private tocchi = 0
  private ultimo = 0
  private turno = 0
  private spegniVita: () => void = () => undefined

  constructor(svg: SVGSVGElement, o: OpzioniPallo = {}) {
    this.svg = svg
    this.o = o
    this.base = (svg.dataset.umore as PalloUmore | undefined) ?? 'saluta'
    const { segui = false, vivo = true } = o
    if (segui || vivo) {
      this.spegniVita = avviaVita(svg, {
        segui,
        vivo,
        umore: () => this.visibile,
        box: () => this.box(),
        fermo: movimentoFermo,
        alCambio,
      })
    }
  }

  /** L'umore che si vede: la sorpresa, poi la reazione, poi il suo. */
  get visibile(): PalloUmore {
    if (this.sorprende === 'occhiali') return 'cool'
    if (this.sorprende === 'palleggio') return 'esulta'
    return this.reazione ?? this.base
  }
  get umore(): PalloUmore {
    return this.base
  }

  /** Il suo umore; si vede subito se non sta reagendo. */
  setUmore(u: PalloUmore) {
    this.base = u
    this.ridisegna()
  }

  /**
   * Una reazione breve: il «boing» e, per `ms`, `umore` (di serie uno a caso
   * fra gli allegri, mai quello che ha già). Poi torna il suo.
   */
  reagisci(u?: PalloUmore, ms = REAZIONE_MS) {
    window.clearTimeout(this.fine)
    const scelte = ALLEGRI.filter((x) => x !== this.visibile)
    this.sorprende = null
    this.svg.removeAttribute('data-sorpresa')
    this.reazione = u ?? scelte[Math.floor(Math.random() * scelte.length)]
    this.ridisegna()
    this.boing()
    this.fine = window.setTimeout(() => {
      this.reazione = null
      this.ridisegna()
    }, ms)
  }

  /** Un tocco: reagisce; il quinto di fila (a meno di 0,7s) è la sorpresa. */
  tocca(): 'reazione' | 'sorpresa' {
    const ora = Date.now()
    this.tocchi = ora - this.ultimo < TOCCHI_GAP_MS ? this.tocchi + 1 : 1
    this.ultimo = ora
    if (this.tocchi >= TOCCHI_DI_FILA) {
      this.tocchi = 0
      this.sorpresa()
      return 'sorpresa'
    }
    this.reagisci()
    return 'reazione'
  }

  /** La sorpresa: senza tipo, a turno il palleggio e gli occhiali. */
  sorpresa(tipo?: PalloSorpresa) {
    window.clearTimeout(this.fine)
    const scelta = tipo ?? (this.turno++ % 2 === 0 ? 'palleggio' : 'occhiali')
    this.reazione = null
    this.sorprende = scelta
    this.ridisegna()
    this.svg.setAttribute('data-sorpresa', scelta)
    this.fine = window.setTimeout(() => {
      this.sorprende = null
      this.svg.removeAttribute('data-sorpresa')
      this.ridisegna()
    }, scelta === 'palleggio' ? PALLEGGIO_MS : OCCHIALI_MS)
  }

  /** Il solo «boing» del tocco, senza cambiare umore (l'atterraggio del salto). */
  boing() {
    window.clearTimeout(this.fineBoing)
    this.svg.setAttribute('data-tocco', String(++this.n % 2))
    this.fineBoing = window.setTimeout(() => this.svg.removeAttribute('data-tocco'), BOING_MS)
  }

  /** Spegne la vita e i timer (non toglie il disegno). */
  distruggi() {
    window.clearTimeout(this.fine)
    window.clearTimeout(this.fineBoing)
    this.spegniVita()
  }

  private box(): readonly [number, number, number, number] {
    const [x, y, w, h] = disegnoDi(this.visibile, this.o).viewBox.split(/\s+/).map(Number)
    return [x, y, w, h] as const
  }

  private ridisegna() {
    const u = this.visibile
    if (this.svg.getAttribute('data-umore') === u) return
    const d = disegnoDi(u, this.o)
    this.svg.setAttribute('data-umore', u)
    this.svg.setAttribute('viewBox', d.viewBox)
    this.svg.setAttribute('width', String(d.w))
    this.svg.setAttribute('height', String(d.h))
    if (d.testa) this.svg.setAttribute('data-testa', '')
    else this.svg.removeAttribute('data-testa')
    this.svg.innerHTML = corpoDi(u, this.id, this.o)
  }
}
