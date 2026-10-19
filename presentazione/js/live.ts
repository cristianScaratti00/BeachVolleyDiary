// ============================================================================
// «Partita live: provala qui» (UX §L6.4, §L7.6, FL3; MOTION §L5.9).
//
// Le regole sono quelle VERE dell'app (`PartitaLive.regole.ts`: obiettivo,
// set finito, cambio campo, set da vincere, la battuta di Pallo), sempre nel
// formato del beach: 3 set, a 21, il terzo a 15. Il numero fa il «pop»
// dell'app, non il contachilometri (UX LC3). La demo non chiude un set non
// finito, non ha timeout, non salva e non sopravvive al refresh: il testo
// accanto dice che l'app sì.
//
// Annunci: uno status scritto SOLO dai punti dell'utente («14 a 12. Cambio
// campo!»). L'autoplay, se parte, non annuncia niente.
// ============================================================================
import { FORMATO_BEACH, battuta, obiettivo, partitaChiusa, setFinito, titoloSet, vinti } from '../../src/screens/PartitaLive.regole'
import type { PartitaInCorso, Squadra } from '../../src/screens/PartitaLive.regole'
import { Pallo } from './pallo'
import { alCambioDelMovimento, movimentoFermo, segna, visto } from './movimento'
import { ms } from './tempi'

/** L'autoplay (MOTION §L2.2): partenza 3–2, poi «Noi» a +600, «Loro» a +1600, «Tocca tu» a +2600. */
export const AUTOPLAY = { partenza: { noi: 3, loro: 2 }, punti: ['noi', 'loro'] as Squadra[], primo: 600, passo: 1000, fine: 2600 }
/** L'autoplay parte con la demo visibile almeno così. */
export const SOGLIA_LIVE = 0.6
/** Quanto si vede il pannello «premuto» prima del punto che l'autoplay segna. */
const PREMUTO_MS = 120

const NOMI: Record<Squadra, string> = { noi: 'Noi', loro: 'Loro' }
const TASTI: Record<Squadra, string> = { noi: 'ArrowDown', loro: 'ArrowUp' }

function partenza(noi = 0, loro = 0): PartitaInCorso {
  return {
    v: 1, modo: 'amici', id: 'landing', torneoId: '', fase: 'Girone', compagno: '', avversari: '',
    formato: FORMATO_BEACH, chiusi: [], noi, loro, ultimo: null, colpo: 0, finita: false, aMano: false, note: '',
  }
}

export function avviaLive() {
  const sezione = document.getElementById('live')
  const demo = sezione?.querySelector<HTMLElement>('.demo')
  const campo = demo?.querySelector<HTMLElement>('.demo-campo')
  const titolo = demo?.querySelector<HTMLElement>('.demo-set')
  const pillole = demo?.querySelector<HTMLElement>('.demo-pillole')
  const stato = demo?.querySelector<HTMLElement>('.demo-stato')
  const chiudi = demo?.querySelector<HTMLButtonElement>('.chiudi-set')
  const ricomincia = demo?.querySelector<HTMLButtonElement>('.ricomincia')
  const riepilogo = demo?.querySelector<HTMLElement>('.demo-riepilogo')
  const svg = demo?.querySelector<SVGSVGElement>('.demo-pallo svg.pallo')
  const bolla = demo?.querySelector<HTMLElement>('.live-bolla') ?? null
  if (!sezione || !demo || !campo || !titolo || !pillole || !stato || !chiudi || !ricomincia || !riepilogo || !svg || !bolla) return
  monta({ sezione, demo, campo, titolo, pillole, stato, chiudi, ricomincia, riepilogo, svg, bolla })
}

interface Pezzi {
  sezione: HTMLElement
  demo: HTMLElement
  campo: HTMLElement
  titolo: HTMLElement
  pillole: HTMLElement
  stato: HTMLElement
  chiudi: HTMLButtonElement
  ricomincia: HTMLButtonElement
  riepilogo: HTMLElement
  svg: SVGSVGElement
  bolla: HTMLElement
}

function monta({ sezione, demo, campo, titolo, pillole, stato, chiudi, ricomincia, riepilogo, svg, bolla: primaBolla }: Pezzi) {
  let bolla: HTMLElement = primaBolla

  // ------------------------------------------------ Il tabellone si accende
  // Da immagine fatta di testo a controlli: i pannelli diventano il «+1», e
  // nell'angolo arriva il «−1».
  campo.removeAttribute('role')
  campo.removeAttribute('aria-label')
  const pan = {} as Record<Squadra, HTMLButtonElement>
  const meno = {} as Record<Squadra, HTMLButtonElement>
  const num = {} as Record<Squadra, HTMLElement>
  for (const chi of ['loro', 'noi'] as Squadra[]) {
    const vecchio = campo.querySelector<HTMLElement>(`.pannello[data-chi="${chi}"]`)
    if (!vecchio) return
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'pannello'
    b.dataset.chi = chi
    b.setAttribute('aria-keyshortcuts', TASTI[chi])
    b.append(...vecchio.childNodes)
    vecchio.replaceWith(b)
    pan[chi] = b
    num[chi] = b.querySelector<HTMLElement>('.live-num') as HTMLElement
    const m = document.createElement('button')
    m.type = 'button'
    m.className = 'meno'
    m.dataset.material = 'frost'
    m.dataset.chi = chi
    m.setAttribute('aria-label', `Togli un punto a ${chi}`)
    m.setAttribute('aria-keyshortcuts', `Shift+${TASTI[chi]}`)
    m.innerHTML = '<svg class="ui-icon" aria-hidden="true"><use href="#i-minus"></use></svg>'
    b.after(m)
    meno[chi] = m
  }
  const pallo = new Pallo(svg, { vivo: true })
  chiudi.hidden = false
  ricomincia.hidden = false

  // --------------------------------------------------------- Lo stato
  let p = partenza(AUTOPLAY.partenza.noi, AUTOPLAY.partenza.loro)

  function dici(testo: string) {
    // La nuvoletta si rimonta (chiave = testo) e fa `live-bolla`.
    const nuova = bolla.cloneNode(false) as HTMLElement
    nuova.textContent = testo
    nuova.setAttribute('data-anima', '')
    bolla.replaceWith(nuova)
    bolla = nuova
  }
  function disegna(anima: boolean) {
    const t = obiettivo(p.chiusi.length, p.formato)
    const finito = setFinito(p.noi, p.loro, t)
    for (const chi of ['loro', 'noi'] as Squadra[]) {
      num[chi].textContent = String(p[chi])
      // Il pop: a/b alternati, così ogni punto lo riavvia anche sullo stesso numero.
      if (anima && p.ultimo === chi && p.colpo > 0) num[chi].dataset.pop = p.colpo % 2 ? 'a' : 'b'
      else delete num[chi].dataset.pop
      pan[chi].setAttribute('aria-label', `Punto per ${NOMI[chi].toLowerCase()}, ora ${p[chi]}`)
      pan[chi].setAttribute('aria-disabled', String(finito))
      meno[chi].setAttribute('aria-disabled', String(p[chi] === 0))
    }
    titolo.textContent = titoloSet(p.chiusi.length, p.formato)
    const b = battuta(p)
    if (bolla.textContent !== b.testo) dici(b.testo)
    pallo.setUmore(b.umore)
    if (finito && !p.finita) chiudi.setAttribute('data-pronto', '')
    else chiudi.removeAttribute('data-pronto')
  }

  function punto(chi: Squadra, d: 1 | -1, utente: boolean) {
    if (p.finita) return
    const t = obiettivo(p.chiusi.length, p.formato)
    // Set finito: niente punto, la battuta del set rientra («prima chiudi il set»).
    if (d > 0 && setFinito(p.noi, p.loro, t)) {
      dici(bolla.textContent ?? '')
      return
    }
    if (d < 0 && p[chi] === 0) return
    p = { ...p, [chi]: p[chi] + d, ultimo: d > 0 ? chi : 'tolto', colpo: p.colpo + 1 }
    disegna(true)
    if (!utente) return
    const b = battuta(p)
    stato.textContent = `${p.noi} a ${p.loro}.${b.notizia ? ' ' + b.testo : ''}`
    // Una vibrazione leggera, solo sui tocchi dell'utente e mai col fermo.
    if (!movimentoFermo()) {
      try {
        navigator.vibrate?.(12)
      } catch {
        /* l'iPhone non vibra: il punto si vede e si sente lo stesso */
      }
    }
  }

  for (const chi of ['loro', 'noi'] as Squadra[]) {
    pan[chi].addEventListener('click', () => punto(chi, 1, true))
    meno[chi].addEventListener('click', () => punto(chi, -1, true))
  }
  // Le scorciatoie valgono SOLO col fuoco dentro la demo (UX §L7.6).
  demo.addEventListener('keydown', (e) => {
    const chi: Squadra | undefined = e.key === 'ArrowUp' ? 'loro' : e.key === 'ArrowDown' ? 'noi' : undefined
    if (!chi || e.altKey || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    punto(chi, e.shiftKey ? -1 : 1, true)
  })

  chiudi.addEventListener('click', () => {
    const t = obiettivo(p.chiusi.length, p.formato)
    if (p.finita || !setFinito(p.noi, p.loro, t)) return
    const chiusi = [...p.chiusi, { us: p.noi, them: p.loro }]
    const pill = document.createElement('span')
    pill.className = 'demo-pillola'
    pill.textContent = `Set ${p.chiusi.length + 1} ${p.noi}–${p.loro}`
    pillole.append(pill)
    if (partitaChiusa(chiusi, p.formato)) return fine({ ...p, chiusi })
    p = { ...p, chiusi, noi: 0, loro: 0, ultimo: null, colpo: 0 }
    disegna(false)
    titolo.focus() // a t0: il set nuovo
  })

  function fine(chiusa: PartitaInCorso) {
    p = { ...chiusa, finita: true }
    const v = vinti(p.chiusi)
    const nostra = v.noi > v.loro
    disegna(false)
    const h = riepilogo.querySelector<HTMLElement>('.demo-riepilogo-titolo')
    const set = riepilogo.querySelector<HTMLElement>('.demo-riepilogo-set')
    if (h) h.textContent = `Partita ${nostra ? 'vostra' : 'loro'}, ${v.noi}–${v.loro}`
    if (set) set.textContent = p.chiusi.map((s, i) => `Set ${i + 1} ${s.us}–${s.them}`).join(' · ')
    riepilogo.removeAttribute('data-esce')
    riepilogo.hidden = false
    pallo.setUmore(nostra ? 'festa' : 'triste')
    // Prima il fuoco al riepilogo, POI i pannelli diventano inerti (UX §L8.2).
    h?.focus()
    for (const b of campo.querySelectorAll<HTMLElement>('.demo-box')) b.inert = true
  }

  ricomincia.addEventListener('click', () => {
    if (!riepilogo.hidden) {
      riepilogo.setAttribute('data-esce', '')
      window.setTimeout(() => {
        riepilogo.hidden = true
        riepilogo.removeAttribute('data-esce')
      }, ms('--dur-svelto'))
    }
    for (const b of campo.querySelectorAll<HTMLElement>('.demo-box')) b.inert = false
    pillole.replaceChildren()
    p = partenza()
    disegna(false)
    stato.textContent = ''
  })

  disegna(false)
  sezione.setAttribute('data-viva', '')

  // ------------------------------------------------- L'autoplay (§L5.9)
  // Una volta per visita, con la demo visibile al 60%, il movimento
  // permesso e il fuoco fuori. Il pannello che «si preme da solo» è la causa
  // visibile del punto. Si ferma al primo tocco, tasto o fuoco dentro, e il
  // punteggio resta quello che è.
  const timer: number[] = []
  let spento = visto('autoplay')
  const spegni = () => {
    spento = true
    timer.forEach((t) => window.clearTimeout(t))
    timer.length = 0
    for (const chi of ['loro', 'noi'] as Squadra[]) pan[chi].removeAttribute('data-premuto')
  }
  for (const ev of ['pointerdown', 'keydown', 'focusin'] as const) demo.addEventListener(ev, spegni)
  alCambioDelMovimento((fermo) => {
    if (fermo && timer.length) spegni()
  })
  if (spento || typeof IntersectionObserver === 'undefined') return
  const io = new IntersectionObserver(
    ([v]) => {
      if (spento) return io.disconnect()
      if (timer.length) {
        if (v.intersectionRatio < SOGLIA_LIVE) spegni() // uscita a metà: consumato
        return
      }
      if (v.intersectionRatio < SOGLIA_LIVE || movimentoFermo() || demo.contains(document.activeElement)) return
      segna('autoplay')
      const preme = (chi: Squadra) => {
        pan[chi].setAttribute('data-premuto', '')
        timer.push(
          window.setTimeout(() => {
            pan[chi].removeAttribute('data-premuto')
            punto(chi, 1, false)
          }, PREMUTO_MS),
        )
      }
      AUTOPLAY.punti.forEach((chi, i) => timer.push(window.setTimeout(() => preme(chi), AUTOPLAY.primo + i * AUTOPLAY.passo)))
      timer.push(
        window.setTimeout(() => {
          dici('Tocca tu: chi fa punto?')
          pallo.setUmore('occhiolino')
          timer.length = 0
          spento = true
          io.disconnect()
        }, AUTOPLAY.fine),
      )
    },
    { threshold: [0, SOGLIA_LIVE] },
  )
  io.observe(demo)
}
