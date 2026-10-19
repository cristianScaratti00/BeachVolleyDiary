// ============================================================================
// Ciò che lo scroll racconta (MOTION §L5.5–§L5.7, §L5.11–§L5.13, §L6):
// l'hero col palleggio, il telefono di #diario che cambia schermata a
// soglia, le immagini col loro skeleton, Wrapped bloccato, la Storia a
// ventaglio, i pin della mappa, il pallone dell'avanzamento, il Pallo del
// finale. Lo scroll legato è CSS (timeline native): qui solo soglie, misure
// prese una volta, e gli stati.
// ============================================================================
import { avviaPalleggio } from '../../src/screens/Login.palleggio.dom'
import { cambiaCapitolo } from './guida'
import { Pallo } from './pallo'
import { alCambio, alCambioDelMovimento, arma, movimentoFermo } from './movimento'
import { LINEA_SEZIONE } from './sezioni'
import { ms } from './tempi'

/** La linea del capitolo di #diario: al 72% sotto i 900px (la cornice è in alto), al 50% da lì (ART A8). */
const linea = () => (window.innerWidth >= 900 ? 0.5 : 0.72)
/** Dopo un ridimensionamento, le fasce degli observer si rimisurano una volta sola, a gesto finito. */
const RIMISURA_MS = 120

// ------------------------------------------------------------ fuori vista
/** RL5: le animazioni infinite di una sezione si fermano dove sono quando esce. */
export function avviaFuoriVista() {
  if (typeof IntersectionObserver === 'undefined') return
  const io = new IntersectionObserver((voci) => {
    for (const v of voci) {
      if (v.isIntersecting) v.target.removeAttribute('data-fuori')
      else v.target.setAttribute('data-fuori', '')
    }
  })
  for (const s of document.querySelectorAll('main > section.campo')) io.observe(s)
}

// ------------------------------------------------------------------ hero
export function avviaEroe() {
  const eroe = document.getElementById('inizio')
  const scena = eroe?.querySelector<HTMLElement>('.eroe-scena')
  const svg = eroe?.querySelector<SVGSVGElement>('.eroe-pallo svg.pallo')
  if (!eroe || !scena) return
  // Il palleggio: sospeso fuori vista e a scheda nascosta, fermo al
  // fotogramma `FERMO` col movimento fermo (lo fa `avviaPalleggio`).
  avviaPalleggio(scena, { fermo: movimentoFermo, alCambio })
  if (svg) new Pallo(svg, { segui: true, vivo: true })
  // Il modulo è pronto: la scena riparte dal fotogramma 0 delle sue
  // animazioni, che erano in pausa lì (ML14).
  eroe.setAttribute('data-viva', '')
}

// ------------------------------------------------------- avanzamento (LM10)
/** `--giri` = corsa ÷ (π × diametro): il pallone rotola senza strisciare. */
export function avviaAvanzamento() {
  const av = document.querySelector<HTMLElement>('.avanza')
  const palla = av?.querySelector<HTMLElement>('.avanza-palla')
  if (!av || !palla || typeof ResizeObserver === 'undefined') return
  new ResizeObserver(() => {
    const d = palla.offsetWidth
    if (!d || !av.clientWidth) return
    av.style.setProperty('--giri', ((av.clientWidth - d) / (Math.PI * d)).toFixed(3))
  }).observe(av)
}

// -------------------------------------------------------- immagini (§L6)
/**
 * Lo skeleton con la forma vera: nasce quando la cornice è in vista e
 * l'immagine non c'è ancora (`data-attesa`); l'immagine arrivata compare in
 * SVELTO, o subito se è arrivata prima dei 150ms; un errore lascia le forme
 * ferme, senza icona rotta.
 */
function attesaImmagini(radice: ParentNode) {
  const pagine = [...radice.querySelectorAll<HTMLElement>('.pagina')]
  const pronta = (p: HTMLElement, subito: boolean) => {
    if (subito) p.setAttribute('data-subito', '')
    p.setAttribute('data-pronta', '')
    window.setTimeout(() => p.removeAttribute('data-attesa'), ms('--dur-svelto'))
  }
  const io =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((voci) => {
          for (const v of voci) {
            if (!v.isIntersecting) continue
            io?.unobserve(v.target)
            const p = v.target as HTMLElement
            const img = p.querySelector('img')
            if (!img || p.hasAttribute('data-pronta') || p.hasAttribute('data-errore')) continue
            const t0 = performance.now()
            p.setAttribute('data-attesa', '')
            img.addEventListener('load', () => pronta(p, performance.now() - t0 < ms('--delay-skeleton')), { once: true })
          }
        })
  for (const p of pagine) {
    const img = p.querySelector('img')
    if (!img) continue
    if (img.complete && img.naturalWidth) {
      pronta(p, true)
      continue
    }
    img.addEventListener('error', () => {
      p.removeAttribute('data-attesa')
      p.setAttribute('data-errore', '')
    }, { once: true })
    img.addEventListener('load', () => {
      if (!p.hasAttribute('data-attesa')) pronta(p, true)
    }, { once: true })
    io?.observe(p)
  }
}

// ------------------------------------------------------ #diario (LM3)
export function avviaDiario() {
  const sezione = document.getElementById('diario')
  if (!sezione) return
  const pagine = [...sezione.querySelectorAll<HTMLElement>('.telefono .pagina')]
  attesaImmagini(sezione)
  let attiva = -1
  let fine = 0
  const mostra = (k: number) => {
    cambiaCapitolo(k)
    if (k === attiva || !pagine[k]) return
    for (const p of pagine) p.removeAttribute('data-prima')
    const prima = attiva
    if (prima >= 0) {
      pagine[prima].setAttribute('data-prima', '')
      pagine[prima].removeAttribute('data-attiva')
    }
    pagine[k].setAttribute('data-attiva', '')
    attiva = k
    // Quando la nuova è piena, quella sotto scende a 0 senza transizione:
    // quattro capitoli in 300ms non lasciano code di dissolvenze.
    window.clearTimeout(fine)
    fine = window.setTimeout(() => {
      if (attiva === k && prima >= 0) pagine[prima].removeAttribute('data-prima')
    }, ms('--dur-entrata'))
  }
  mostra(0)
  if (typeof IntersectionObserver !== 'undefined') {
    let io: IntersectionObserver | null = null
    const osserva = () => {
      io?.disconnect()
      const l = linea() * 100
      io = new IntersectionObserver(
        (voci) => {
          for (const v of voci) if (v.isIntersecting) mostra(Number((v.target as HTMLElement).dataset.k))
        },
        { rootMargin: `-${l - 0.5}% 0px -${100 - l - 0.5}% 0px` },
      )
      for (const c of sezione.querySelectorAll('.capitolo')) io.observe(c)
    }
    osserva()
    let attesa = 0
    window.addEventListener('resize', () => {
      window.clearTimeout(attesa)
      attesa = window.setTimeout(osserva, RIMISURA_MS)
    })
  }
  sezione.setAttribute('data-viva', '')
}

// ------------------------------------------------------ #wrapped (LM8, LM9)
export function avviaWrapped() {
  const sezione = document.getElementById('wrapped')
  if (!sezione) return
  const slides = sezione.querySelector<HTMLElement>('.slides')
  const storia = sezione.querySelector<HTMLElement>('.storia')
  // Bloccata, la fila non si scorre a mano: niente fermata di Tab su una
  // regione che non scorre (UX §L8.1: la regione solo nella riga manuale).
  const nativo =
    typeof CSS !== 'undefined' && CSS.supports?.('(animation-timeline: view()) and (animation-range: contain 0%)')
  const alta = window.matchMedia?.('(min-height: 600px)')
  const aggiorna = () => {
    const bloccata = !!nativo && !!alta?.matches && !movimentoFermo()
    if (!slides) return
    if (bloccata) slides.removeAttribute('tabindex')
    else slides.setAttribute('tabindex', '0')
  }
  alta?.addEventListener?.('change', aggiorna)
  alCambioDelMovimento(aggiorna)
  sezione.setAttribute('data-viva', '')
  aggiorna()

  if (storia) {
    // Viva: impilata e poi a ventaglio. Entra nel layout vivo senza
    // transizione (`data-subito`), così all'avvio non si apre da sola.
    storia.setAttribute('data-subito', '')
    storia.setAttribute('data-viva', '')
    void storia.offsetWidth
    requestAnimationFrame(() => storia.removeAttribute('data-subito'))
    arma(storia, {
      chiave: 'storia',
      soglia: 0.5,
      prepara: () => {
        storia.setAttribute('data-subito', '')
        void storia.offsetWidth
        storia.removeAttribute('data-subito')
      },
      // Togliere `data-armato` basta: il CSS apre il ventaglio in MOLLA.
      scatta: () => undefined,
      finale: () => {
        storia.setAttribute('data-subito', '')
        requestAnimationFrame(() => storia.removeAttribute('data-subito'))
      },
    })
  }
}

// ---------------------------------------------------------- #mappa (LM5)
export function avviaMappa() {
  const sezione = document.getElementById('mappa')
  const mappa = sezione?.querySelector<HTMLElement>('.mappa')
  if (!sezione || !mappa) return
  sezione.setAttribute('data-viva', '')
  arma(mappa, {
    chiave: 'mappa',
    soglia: 0.5,
    scatta: () => mappa.setAttribute('data-cade', ''),
  })
}

// ------------------------------------------------------- finale (§L5.13)
export function avviaFinale() {
  const sezione = document.getElementById('comincia')
  const svg = sezione?.querySelector<SVGSVGElement>('.finale-pallo svg.pallo')
  const cta = sezione?.querySelector<HTMLElement>('.finale-crea')
  if (!sezione || !svg) return
  const pallo = new Pallo(svg, { vivo: true })
  if (cta) {
    // Col puntatore sul CTA o col fuoco da tastiera: `festa`, nello stesso
    // fotogramma. Col tocco no: il CTA porta via subito (UX §L6.9).
    const hover = window.matchMedia?.('(hover: hover)')
    cta.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && hover?.matches) pallo.setUmore('festa')
    })
    cta.addEventListener('pointerleave', () => {
      if (!cta.matches(':focus-visible')) pallo.setUmore('cuori')
    })
    cta.addEventListener('focus', () => {
      if (cta.matches(':focus-visible')) pallo.setUmore('festa')
    })
    cta.addEventListener('blur', () => pallo.setUmore('cuori'))
  }
  sezione.setAttribute('data-viva', '')
}

// -------------------------------------------- riaggancio dello scroll (§L3.3)
/**
 * «Ferma le animazioni» cambia il layout sotto chi legge (telefono sticky,
 * Wrapped bloccato, Storia). Prima del cambio: la sezione sotto la linea del
 * 40% e la distanza del suo titolo dalla cima; dopo, `scrollBy` istantaneo
 * della differenza. Chi aveva davanti #wrapped lo ritrova lì.
 */
export function avviaRiaggancio() {
  let ancora: { h: HTMLElement; top: number } | null = null
  document.addEventListener(
    'click',
    (e) => {
      const b = (e.target as Element | null)?.closest?.('[data-comando="fermo"]')
      if (!b || b.getAttribute('aria-disabled') === 'true') return
      const y = window.innerHeight * LINEA_SEZIONE
      const s = [...document.querySelectorAll<HTMLElement>('main > section')].find((x) => {
        const r = x.getBoundingClientRect()
        return r.top <= y && r.bottom > y
      })
      const h = s?.querySelector<HTMLElement>('h1, h2')
      ancora = h ? { h, top: h.getBoundingClientRect().top } : null
    },
    true,
  )
  alCambioDelMovimento(() => {
    const a = ancora
    ancora = null
    if (!a) return
    requestAnimationFrame(() => {
      const delta = a.h.getBoundingClientRect().top - a.top
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' as ScrollBehavior })
    })
  })
}
