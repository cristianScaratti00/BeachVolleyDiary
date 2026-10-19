// ============================================================================
// Pallo guida (UX §L6.10, §L7.2, FL7; MOTION §L5.2–§L5.3 e §L10).
//
// Un <button> vero nell'angolo che apre «Dove vuoi andare?», dice una
// battuta per sezione (una volta per sessione, solo a scroll fermo) e
// reagisce: al tocco, ai cinque tocchi, al tocco lungo, allo scroll veloce,
// e dopo 10 secondi di quiete si addormenta. Esce di scena dove la sezione
// ha un Pallo suo: «un Pallo alla volta».
//
// Il momento firmato è il passaggio di consegne (§L10): quando la testa del
// Pallo dell'hero arriva a 24px dalla cima, salta giù e atterra sopra il ＋.
// FLIP con SALTO sul pulsante, l'arco su `.guida-figura` (annidato).
// ============================================================================
import { DATI } from './generati/dati'
import { Pallo } from './pallo'
import type { PalloUmore } from './pallo'
import { PRESSIONE_LUNGA_MS, REAZIONE_MS, TOCCHI_DI_FILA, TOCCHI_GAP_MS } from '../../src/components/Pallo.vita'
import {
  alCambioDelMovimento,
  arbitro,
  movimentoFermo,
  programmatico,
  quandoSalta,
  quandoScorre,
  quandoVeloce,
  quieto,
  segna,
  visto,
} from './movimento'
import { alCambioSezione, sezioneCorrente, sezioniPronte } from './sezioni'
import { curva, ms } from './tempi'
import type { Sezione } from './sezioni'

/** La testa del Pallo dell'hero a 24px dalla cima: salta. Sotto i 96px di nuovo: la guida esce. */
export const SALTO_PX = 24
export const RITORNO_PX = 96
/** Quanto resta una battuta (= `--dur-bolla`, = TOAST_MS dell'app). */
export const BOLLA_MS = 4000
/** Inattività prima di `dorme`. */
export const SONNO_MS = 10000
/** Lo scroll veloce sorprende Pallo al più una volta ogni tanto. */
export const SORPRESO_OGNI_MS = 8000

/** Dove la guida esce di scena: queste sezioni hanno un Pallo loro (UX §L3.2). */
const FUORI = new Set<Sezione | null>(['registra', 'live', 'wrapped', 'comincia', null])
const UMORE: Partial<Record<Sezione, PalloUmore>> = { inizio: 'occhiolino', diario: 'occhiolino', numeri: 'cool', mappa: 'pensa', dati: 'sbircia' }
/** I capitoli di #diario: umore e battuta per capitolo (UX §L12.4). Il primo l'ha già detta l'atterraggio (ML3). */
const CAPITOLI: { umore: PalloUmore; battuta: string | null }[] = [
  { umore: 'occhiolino', battuta: null },
  { umore: 'pensa', battuta: 'Il luogo lo scegli una volta: poi lo ritrovi a ogni torneo.' },
  { umore: 'contento', battuta: DATI.guida.storia },
  { umore: 'cuori', battuta: DATI.guida.compagno },
]
const BATTUTA: Partial<Record<Sezione, string>> = {
  numeri: DATI.guida.numeri,
  mappa: DATI.guida.mappa,
  dati: 'I tuoi tornei li vedi tu. E chi ci ha giocato con te, se lo colleghi.',
}
const ATTERRAGGIO = 'Quando vuoi, il ＋ arancio apre il diario.'
/** Il salto (MOTION §L10.3): SALTO tocca il segno la prima volta al 42% della durata. */
const CONTATTO = 0.42
/** Il picco dell'arco, al 20% della corsa: 20 / 42 della durata dell'arco. */
const PICCO = 0.2 / CONTATTO
/** L'arco: alto il 12% del dislivello, al più 48px. */
const ARCO_QUOTA = 0.12
const ARCO_MAX_PX = 48
/** La rete dell'uscita del menu: oltre SVELTO, se `transitionend` non arriva (MOTION §L5.3). */
const RETE_MS = 80


let capitoloCorrente = 0
const alCapitolo = new Set<(k: number) => void>()
/** scene.ts avvisa quando cambia il capitolo di #diario sulla sua linea. */
export function cambiaCapitolo(k: number) {
  if (k === capitoloCorrente) return
  capitoloCorrente = k
  for (const fn of alCapitolo) fn(k)
}

/** Il foglio d'installazione è aperto: la guida esce, senza nuvoletta (install.ts). */
let foglioAperto = false
const alFoglio = new Set<() => void>()
export function foglioCambiato(aperto: boolean) {
  foglioAperto = aperto
  for (const fn of alFoglio) fn()
}
/** L'app installata: la guida, se è in scena, fa festa (UX §L12.4). */
let installata: () => void = () => undefined
export const appInstallata = () => installata()

export function avviaGuida() {
  const guida = document.querySelector<HTMLButtonElement>('.guida')
  const figura = guida?.querySelector<HTMLElement>('.guida-figura')
  const svgGuida = figura?.querySelector<SVGSVGElement>('svg.pallo')
  const bolla = document.getElementById('guida-bolla')
  const menu = document.getElementById('guida-menu')
  const eroe = document.getElementById('inizio')
  const eroePallo = eroe?.querySelector<HTMLElement>('.eroe-pallo')
  const svgEroe = eroePallo?.querySelector<SVGSVGElement>('svg.pallo')
  if (!guida || !figura || !svgGuida || !bolla || !menu || !eroe || !eroePallo || !svgEroe) return
  if (typeof IntersectionObserver === 'undefined') return
  monta({ guida, figura, svgGuida, bolla, menu, eroePallo, svgEroe })
}

interface Pezzi {
  guida: HTMLButtonElement
  figura: HTMLElement
  svgGuida: SVGSVGElement
  bolla: HTMLElement
  menu: HTMLElement
  eroePallo: HTMLElement
  svgEroe: SVGSVGElement
}

function monta({ guida, figura, svgGuida, bolla, menu, eroePallo, svgEroe }: Pezzi) {
  const pallo = new Pallo(svgGuida, { vivo: true, segui: true })
  guida.hidden = false
  guida.inert = true
  menu.inert = true

  const st = {
    salto: false,
    ritorno: false,
    notizie: false,
    posto: 'eroe' as 'eroe' | 'guida',
    dentro: false,
    volo: null as Animation | null,
    arco: null as Animation | null,
    dorme: false,
    primo: true,
  }

  // --------------------------------------------------------- Le soglie
  const decidi = arbitro(decisione)
  alCambioSezione(() => decidi())
  // Le sentinelle sopra la testa del Pallo dell'hero. La radice è tutto ciò
  // che sta SOPRA il viewport: «interseca» = ha passato il bordo alto. Così
  // conta anche un salto istantaneo che le porta molto più su (§L9.1).
  const sentinelle = new IntersectionObserver(
    (voci) => {
      for (const v of voci) {
        if ((v.target as HTMLElement).dataset.linea === 'salto') st.salto = v.isIntersecting
        else st.ritorno = v.isIntersecting
      }
      st.notizie = true
      decidi()
    },
    { rootMargin: '99999px 0px -100% 0px' },
  )
  eroePallo.querySelectorAll('.eroe-sentinella').forEach((n) => sentinelle.observe(n))
  // Mai senza uno scroll dell'utente: su uno schermo basso la testa può
  // stare sopra i 24px già all'avvio, e lì Pallo aspetta (§L10.2).
  let scorso = false
  quandoScorre(() => {
    scorso = true
    decidi()
  })
  alCambioDelMovimento((fermo) => {
    if (fermo) finisciVolo()
    decidi()
  })
  window.addEventListener('resize', finisciVolo)
  alFoglio.add(() => decidi())
  alCapitolo.add(() => decidi())
  quandoSalta(() => chiudiMenu(false))

  function vuole(): boolean {
    return !foglioAperto && !FUORI.has(sezioneCorrente())
  }
  function umoreDiSezione(): PalloUmore {
    const s = sezioneCorrente()
    if (s === 'diario') return CAPITOLI[capitoloCorrente]?.umore ?? 'occhiolino'
    return (s && UMORE[s]) || 'contento'
  }

  function decisione() {
    if (!st.notizie || !sezioniPronte()) return
    const s = sezioneCorrente()
    if (st.posto === 'eroe') {
      if (!st.salto) {
        st.primo = false
        return
      }
      // All'avvio sotto l'hero (deep link, ricarica): la guida c'è già
      // nell'angolo, in ENTRATA. Il salto non c'è stato e non si segna
      // (MOTION §L4.2): tornando su e riscendendo, Pallo salta.
      const deepLink = st.primo && s !== 'inizio'
      st.primo = false
      if (!deepLink && !scorso) return
      st.posto = 'guida'
      eroePallo.setAttribute('data-partito', '')
      const volare = vuole() || s === 'inizio'
      if (!deepLink && volare && !visto('salto') && !programmatico() && !movimentoFermo()) return passaggio()
      if (vuole() || s === 'inizio') {
        entra()
        pallo.setUmore(s === 'inizio' ? 'occhiolino' : umoreDiSezione())
        di('diario-1', ATTERRAGGIO, null)
        battutaDiSezione()
      }
      return
    }
    // La testa è tornata sotto i 96px: la guida esce, il Pallo dell'hero torna.
    if (!st.ritorno) return torna()
    if (st.volo) return // la presenza si decide all'atterraggio (§L10.4)
    if (vuole() || s === 'inizio') {
      entra()
      if (!st.dorme) pallo.setUmore(s === 'inizio' ? pallo.umore : umoreDiSezione())
      battutaDiSezione()
    } else esci()
  }

  // ----------------------------------------------------- Dentro e fuori
  function entra() {
    if (st.dentro) return
    st.dentro = true
    guida.inert = false
    guida.dataset.stato = 'dentro'
  }
  let aspettaBlur = false
  function esci() {
    if (!st.dentro) return
    // Non esce col focus addosso né col menu aperto (UX §L6.10): aspetta.
    if (guida.contains(document.activeElement) || menu.contains(document.activeElement) || menuAperto()) {
      if (!aspettaBlur) {
        aspettaBlur = true
        const via = () => {
          aspettaBlur = false
          decidi()
        }
        guida.addEventListener('focusout', via, { once: true })
        menu.addEventListener('focusout', via, { once: true })
      }
      return
    }
    st.dentro = false
    nascondiBolla(false)
    guida.inert = true
    delete guida.dataset.stato
  }
  function torna() {
    st.posto = 'eroe'
    if (st.volo) {
      // Interrotto a metà volo: si ferma dov'è ed esce DA LÌ (§L10.4).
      st.volo.commitStyles()
      st.volo.cancel()
      st.volo = null
      st.arco?.cancel()
      st.arco = null
      void getComputedStyle(guida).transform
      guida.style.transition = ''
      guida.style.transform = ''
      guida.style.transformOrigin = ''
    }
    esci()
    eroePallo.removeAttribute('data-partito')
  }

  // -------------------------------------------- Il passaggio di consegne
  function passaggio() {
    segna('salto')
    const a = svgEroe.getBoundingClientRect() // first: misurato UNA volta, a t0
    // Una transizione CSS sul transform coprirebbe la Web Animation.
    guida.style.transition = 'none'
    st.dentro = true
    guida.inert = false
    guida.dataset.stato = 'dentro'
    pallo.setUmore('saluta')
    const btn = guida.getBoundingClientRect()
    const b = svgGuida.getBoundingClientRect() // last: la guida a riposo
    if (!b.width || typeof guida.animate !== 'function') {
      guida.style.transition = ''
      return atterra()
    }
    const s0 = a.width / b.width
    guida.style.transformOrigin = `${b.left - btn.left}px ${b.top - btn.top}px`
    const d = ms('--dur-salto')
    st.volo = guida.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${s0})` }, { transform: 'none' }], {
      duration: d,
      easing: curva('--ease-salto'),
    })
    // L'arco: la figura sale e ricade entro il primo contatto di SALTO col
    // segno (42% della durata); picco al 20%.
    const h = Math.min(ARCO_MAX_PX, Math.abs(a.top - b.top) * ARCO_QUOTA)
    st.arco = figura.animate(
      [
        { transform: 'none', easing: curva('--ease-arco-su') },
        { transform: `translateY(${-h}px)`, offset: PICCO, easing: curva('--ease-arco-giu') },
        { transform: 'none' },
      ],
      { duration: d * CONTATTO },
    )
    const tocca = window.setTimeout(() => {
      pallo.setUmore('occhiolino')
      pallo.boing()
    }, d * CONTATTO)
    st.volo.finished.then(
      () => {
        guida.style.transition = ''
        guida.style.transformOrigin = ''
        st.volo = null
        st.arco = null
        atterra()
      },
      () => window.clearTimeout(tocca),
    )
  }
  function atterra() {
    pallo.setUmore('occhiolino')
    // Non parla prima di essere arrivato (ritardo causale, §L10.3).
    di('diario-1', ATTERRAGGIO, null)
    decidi()
  }
  /** Il fermo a metà o un ridimensionamento: allo stato finale, mai all'inizio (RL6). */
  function finisciVolo() {
    st.arco?.finish()
    st.volo?.finish()
  }

  // ------------------------------------------------------- La nuvoletta
  let pendente: { chiave: string; testo: string; sezione: Sezione | null } | null = null
  let fineBolla = 0
  let bollaDi: Sezione | null = null
  let attesa = 0
  function battutaDiSezione() {
    const s = sezioneCorrente()
    if (s === 'diario') {
      const c = CAPITOLI[capitoloCorrente]
      if (c?.battuta) di(`diario-${capitoloCorrente + 1}`, c.battuta, s)
      return
    }
    const t = s ? BATTUTA[s] : undefined
    if (s && t) di(s, t, s)
  }
  function di(chiave: string, testo: string, sezione: Sezione | null) {
    if (visto('bolla:' + chiave)) return
    pendente = { chiave, testo, sezione }
    window.clearInterval(attesa)
    attesa = window.setInterval(() => {
      if (!pendente) return window.clearInterval(attesa)
      // Una battuta di un'altra sezione non si dice più, e non si segna.
      if (pendente.sezione && pendente.sezione !== sezioneCorrente()) {
        pendente = null
        return window.clearInterval(attesa)
      }
      // Solo a scroll fermo (ML4), in scena, a terra, col menu chiuso.
      if (!st.dentro || st.volo || menuAperto() || !quieto() || st.dorme) return
      window.clearInterval(attesa)
      mostraBolla(pendente)
      pendente = null
    }, 50)
  }
  function mostraBolla(b: { chiave: string; testo: string; sezione: Sezione | null }) {
    segna('bolla:' + b.chiave)
    bollaDi = b.sezione
    // La descrizione del pulsante cambia nel fotogramma in cui compare.
    bolla.textContent = b.testo
    void bolla.offsetWidth
    bolla.setAttribute('data-visibile', '')
    window.clearTimeout(fineBolla)
    fineBolla = window.setTimeout(() => nascondiBolla(true), BOLLA_MS)
  }
  function nascondiBolla(svuota: boolean) {
    window.clearTimeout(fineBolla)
    bolla.removeAttribute('data-visibile')
    if (svuota) window.setTimeout(() => {
      if (!bolla.hasAttribute('data-visibile')) bolla.textContent = ''
    }, ms('--dur-svelto'))
  }
  alCambioSezione((s) => {
    if (bolla.hasAttribute('data-visibile') && bollaDi && bollaDi !== s) nascondiBolla(true)
  })
  alCapitolo.add(() => {
    if (bolla.hasAttribute('data-visibile') && bollaDi === 'diario') nascondiBolla(true)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bolla.hasAttribute('data-visibile')) nascondiBolla(true)
  })

  // ---------------------------------------------------- Il menu (§L5.3)
  const voci = () => [...menu.querySelectorAll<HTMLElement>('a[href], button:not([hidden])')].filter((x) => !x.hasAttribute('hidden'))
  const menuAperto = () => menu.hasAttribute('data-aperto')
  let fineMenu = 0
  function apriMenu() {
    window.clearTimeout(fineMenu)
    nascondiBolla(true)
    menu.hidden = false
    menu.inert = false
    menu.dataset.material = 'glass-thick'
    // La voce della sezione corrente.
    const s = sezioneCorrente()
    for (const a of menu.querySelectorAll<HTMLAnchorElement>('.guida-menu-voci a')) {
      if (s && a.getAttribute('href') === '#' + (s === 'mappa' ? 'numeri' : s)) a.setAttribute('aria-current', 'true')
      else a.removeAttribute('aria-current')
    }
    void menu.offsetWidth // la transizione parte dallo stato chiuso
    menu.setAttribute('data-aperto', '')
    guida.setAttribute('aria-expanded', 'true')
    voci()[0]?.focus() // a t0 (MOTION §3.5)
  }
  function chiudiMenu(focusAPallo: boolean) {
    if (!menuAperto()) return
    menu.removeAttribute('data-aperto')
    guida.setAttribute('aria-expanded', 'false')
    menu.inert = true
    menu.dataset.material = 'frost' // chi esce smette di sfocare (§3.4)
    if (focusAPallo) guida.focus()
    window.clearTimeout(fineMenu)
    fineMenu = window.setTimeout(() => {
      if (menuAperto()) return
      menu.hidden = true
      menu.dataset.material = 'glass-thick'
    }, ms('--dur-svelto') + RETE_MS)
    decidi()
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuAperto()) {
      e.preventDefault()
      chiudiMenu(true)
    }
  })
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node
    if (menuAperto() && !menu.contains(t) && !guida.contains(t)) chiudiMenu(false)
  })
  menu.addEventListener('focusout', (e) => {
    const verso = e.relatedTarget as Node | null
    if (verso && !menu.contains(verso) && verso !== guida) chiudiMenu(false)
  })
  guida.addEventListener('focusout', (e) => {
    const verso = e.relatedTarget as Node | null
    if (menuAperto() && verso && !menu.contains(verso) && verso !== guida) chiudiMenu(false)
  })
  // ↑ ↓ fra le voci, come scorciatoia: il Tab basta.
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const v = voci()
    const i = v.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    v[(i + (e.key === 'ArrowDown' ? 1 : -1) + v.length) % v.length]?.focus()
  })
  // «Installa l'app»: il menu passa a `frost` a t0 ed esce mentre il foglio sale.
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-installa]')) chiudiMenu(false)
  })

  // ----------------------------------------------- Tocchi e sorprese (FL7)
  let tocchi = 0
  let ultimoTocco = 0
  let pressione = 0
  let premuto = false
  let ignoraFino = 0
  guida.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return
    premuto = true
    window.clearTimeout(pressione)
    pressione = window.setTimeout(() => {
      // Il tocco lungo: la sorpresa e basta, niente menu.
      ignoraFino = Date.now() + 500
      tocchi = 0
      pallo.sorpresa()
      chiudiMenu(false)
    }, PRESSIONE_LUNGA_MS)
  })
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    guida.addEventListener(ev, () => {
      premuto = false
      window.clearTimeout(pressione)
    })
  }
  // Il tocco lungo non apre il menu contestuale (Android).
  guida.addEventListener('contextmenu', (e) => {
    if (premuto) e.preventDefault()
  })
  guida.addEventListener('click', () => {
    if (Date.now() < ignoraFino) return
    const ora = performance.now()
    const diFila = ora - ultimoTocco < TOCCHI_GAP_MS
    tocchi = diFila ? tocchi + 1 : 1
    ultimoTocco = ora
    if (tocchi >= TOCCHI_DI_FILA) {
      tocchi = 0
      pallo.sorpresa()
      chiudiMenu(false)
      return
    }
    pallo.reagisci()
    // I tocchi di fila non richiudono il menu: Pallo reagisce a ognuno.
    if (!menuAperto()) apriMenu()
    else if (!diFila) chiudiMenu(false)
  })

  // Lo scroll veloce dell'utente: «sorpreso», al più ogni 8s.
  let ultimoSorpreso = -Infinity
  quandoVeloce(() => {
    const ora = performance.now()
    if (!st.dentro || st.volo || ora - ultimoSorpreso < SORPRESO_OGNI_MS) return
    ultimoSorpreso = ora
    pallo.reagisci('sorpreso', REAZIONE_MS)
  })

  // Il sonno: 10s senza scroll, tocchi, puntatore né tasti. Mai col menu
  // aperto né con una battuta in vista. Il primo gesto lo sveglia, sorpreso,
  // senza battuta.
  let sonno = 0
  const sveglia = () => {
    window.clearTimeout(sonno)
    if (st.dorme) {
      st.dorme = false
      pallo.setUmore(umoreDiSezione())
      pallo.reagisci('sorpreso', REAZIONE_MS)
    }
    sonno = window.setTimeout(() => {
      if (!st.dentro || st.volo || menuAperto() || bolla.hasAttribute('data-visibile') || pendente) return sveglia()
      st.dorme = true
      pallo.setUmore('dorme')
    }, SONNO_MS)
  }
  for (const ev of ['scroll', 'pointerdown', 'pointermove', 'keydown'] as const) window.addEventListener(ev, sveglia, { passive: true })
  sveglia()

  installata = () => {
    if (!st.dentro) return
    pallo.setUmore('festa')
    di('installata', 'Fatto: mi trovi tra le tue app.', null)
  }
}
