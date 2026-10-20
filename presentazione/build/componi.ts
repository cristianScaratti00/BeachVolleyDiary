// ============================================================================
// La landing al momento della build: `presentazione/index.html` è un modello,
// e qui gli si mettono dentro i disegni e i numeri che vengono dall'app.
// Lo chiama il plugin `landing` di vite.config.ts (`transformIndexHtml`, in
// sviluppo e in build), e lo può chiamare un test che vuole l'HTML finito.
//
// Perché in build e non dal modulo (ART §L13 A12, MOTION §L4.1): il primo
// fotogramma è la scena al tramonto col Pallo dell'hero, e i testi coi numeri
// veri devono esserci anche senza JavaScript (UX §L6.0). Niente si copia a
// mano: i disegni sono gli snapshot di `Pallo.tsx` e di `Login.scena.tsx`, le
// icone i tracciati di `Icon.paths.ts`, i numeri le funzioni dell'app
// (`generati/*`, scritti dai test).
//
// Il linguaggio del modello, tutto e solo questo:
//   {{percorso.nel.diario}}       un valore di DATI (testo, con l'escape HTML)
//   <!--@scena-->                 i tre piani della scena (cielo, sole, terra)
//   <!--@pallo umore [testa] [mani-bianche] [classe=x]-->   un Pallo decorativo
//   <!--@marchio-->               il pallone del marchio (BrandMark), nudo
//   <!--@mappa-->                 la costa con i pin e le etichette
//   <!--@mappa-citta-->           l'elenco delle città con l'esito in testo
//   <!--@barra-vp-->              la barra vinte/perse di #numeri
//   <!--@slide-->                 le slide di Beach Wrapped
//   <!--@trascrizione-->          la chat già scritta (versione senza JS)
//   <!--@riepilogo-->             le righe della card di riepilogo della chat
//   <!--@scheletro nome-->        le forme vere di una schermata (skeleton)
//   <!--@icone-->                 lo sprite delle icone usate in pagina (`#i-nome`)
// Una direttiva o una chiave sconosciuta ferma la build: meglio che un buco
// nella pagina.
// ============================================================================
import { DATI } from '../js/generati/dati'
import { SCENA, SCENA_ID } from '../js/generati/scena'
import { svgPallo } from '../js/pallo.disegno'
import type { UmorePallo } from '../js/pallo.disegno'
import { PATHS } from '../../src/components/ui/Icon.paths'

type IconName = keyof typeof PATHS

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Le icone che crea il modulo (non stanno nell'HTML): lo sprite le deve avere. */
const ICONE_DEL_MODULO: IconName[] = ['minus'] // il «−1» della demo live (live.ts)

// ---------------------------------------------------------------- valori
function valore(percorso: string): string {
  let v: unknown = DATI
  for (const k of percorso.split('.')) {
    if (v === null || typeof v !== 'object' || !(k in (v as object))) throw new Error(`landing: chiave sconosciuta {{${percorso}}}`)
    v = (v as Record<string, unknown>)[k]
  }
  if (typeof v !== 'string' && typeof v !== 'number') throw new Error(`landing: {{${percorso}}} non è un testo`)
  return esc(String(v))
}

// ----------------------------------------------------------------- scena
// Tre <svg> con lo stesso viewBox e lo stesso preserveAspectRatio, impilati:
// si muovono i contenitori HTML (compositor), mai un <g> dentro un solo SVG
// (MOTION.md §L12). `accesso-scena-svg` porta lo zoom lento del Benvenuto.
function scena(id: string): string {
  const piano = (nome: 'cielo' | 'sole' | 'terra') =>
    `<div class="eroe-piano" data-piano="${nome}"><svg class="accesso-scena-svg" viewBox="${SCENA.viewBox}" preserveAspectRatio="${SCENA.preserveAspectRatio}" focusable="false">${SCENA[nome].split(SCENA_ID).join(id)}</svg></div>`
  return piano('cielo') + piano('sole') + piano('terra')
}

// --------------------------------------------------------------- marchio
// `BrandMark` di Logo.tsx, nudo: il pallone bianco con la fascia arancio e il
// filo bianco. I colori li dà il CSS (classi), la geometria è del disegno.
function marchio(id: string): string {
  return (
    `<svg class="marchio" viewBox="-32 -32 64 64" aria-hidden="true" focusable="false">` +
    `<defs><clipPath id="marchio-${id}"><circle r="30"/></clipPath></defs>` +
    `<circle class="marchio-palla" r="30"/>` +
    `<path class="marchio-fascia" d="M-34 -14 C-12 -30 16 -30 34 -12" clip-path="url(#marchio-${id})" stroke-width="10"/>` +
    `<circle class="marchio-filo" r="30" stroke-width="3"/>` +
    `</svg>`
  )
}

// ----------------------------------------------------------------- mappa
// La costa (terra a sinistra, mare sotto: il fondo del riquadro) e un pin per
// città, coi colori della Mappa vera (ART §L4.6). Il pin è un <g> posato con
// `transform`, e dentro un <g> che cade (MOTION §L5.11, CADUTA): due
// trasformazioni su due nodi, perché sullo stesso nodo il CSS coprirebbe
// l'attributo. `--i` è l'ordine da nord a sud, per lo sfalsamento.
function mappa(): string {
  const m = DATI.mappa
  const pin = m.pin
    .map((p, i) => {
      const fx = Math.round(p.x * 10) / 10
      const fy = Math.round(p.y * 10) / 10
      // L'etichetta sta a sinistra del pin, sulla terra.
      return (
        `<g class="mappa-pin" data-esito="${p.esito}" transform="translate(${fx} ${fy})" style="--i: ${i}">` +
        `<g class="mappa-pin-cade"><circle class="mappa-pin-alone" r="${p.r}"/><circle class="mappa-pin-tondo" r="${p.r}"/></g>` +
        `<text class="mappa-etichetta" x="${-(p.r + 6)}" y="4" text-anchor="end">${esc(p.citta)}</text>` +
        `</g>`
      )
    })
    .join('')
  return (
    `<svg class="mappa-svg" viewBox="0 0 ${m.w} ${m.h}" role="img" aria-labelledby="mappa-didascalia" focusable="false">` +
    `<path class="mappa-terra" d="${m.costa}"/>${pin}</svg>`
  )
}

function mappaCitta(): string {
  return DATI.mappa.pin
    .map((p) => `<li><span class="mappa-citta-nome">${esc(p.citta)}</span><span class="mappa-citta-esito">${esc(p.esito)} · ${esc(p.piazzamento)}</span></li>`)
    .join('')
}

// ------------------------------------------------------- barra vinte/perse
// Larga quanto il binario; la parte vinta è una barra spostata in
// `translateX` dentro il binario (MOTION §L5.10: niente scaleX). `--v` è la
// quota delle vinte: l'unico numero che il CSS non può leggere dal testo.
function barraVp(): string {
  const n = DATI.numeri
  const v = n.giocate ? Math.round((n.vinte / n.giocate) * 1000) / 10 : 0
  // Sul binario, non sulla barra: armata, la barra mette il suo `--v: 0`.
  return `<span class="barra-vp" aria-hidden="true" style="--v: ${v}"><span class="barra-vp-v"></span></span>`
}

// ----------------------------------------------------------------- slide
// Le tre slide dell'app, nell'ordine e coi colori della tela dei PNG:
// arancio → inchiostro → sabbia (palette.ts). Sulla slide arancio le mani di
// Pallo sono bianche, come nel PNG.
const PALETTE = ['arancio', 'inchiostro', 'sabbia'] as const
function slide(nuovoId: () => string): string {
  return DATI.wrapped.slide
    .map((s, i) => {
      const palette = PALETTE[i % PALETTE.length]
      const lungo = s.titolo.length > 4 ? ' data-lungo=""' : ''
      return (
        `<li class="slide" data-palette="${palette}">` +
        `<span class="slide-pallo">${svgPallo(s.umore as UmorePallo, nuovoId(), { maniBianche: palette === 'arancio' })}</span>` +
        `<span class="slide-occhiello">${esc(s.occhiello)}</span>` +
        `<span class="slide-titolo"${lungo}>${esc(s.titolo)}</span>` +
        `<span class="slide-sotto">${esc(s.sotto)}</span>` +
        `<span class="slide-didascalia">${esc(s.didascalia)}</span>` +
        `</li>`
      )
    })
    .join('')
}

// ------------------------------------------------------------------ chat
function trascrizione(): string {
  return DATI.chat.trascrizione.righe.map((r) => `<li class="msg" data-chi="${r.chi}">${esc(r.testo)}</li>`).join('')
}
function riepilogo(): string {
  return DATI.chat.trascrizione.riepilogo.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')
}

// ------------------------------------------------------------- skeleton
// Le forme vere delle quattro schermate (MOTION §L6), nelle coordinate della
// schermata (390 × 844): titolo, card, capsula della TabBar. Si colorano col
// CSS (`--fill` sul `--bg`).
type Forma = [x: number, y: number, w: number, h: number, r: number]
const TABBAR: Forma[] = [[14, 764, 286, 64, 32], [312, 764, 64, 64, 32]]
const SCHELETRI: Record<string, Forma[]> = {
  home: [[20, 30, 108, 14, 7], [20, 50, 186, 56, 10], [16, 126, 248, 38, 19], [272, 126, 102, 38, 19], [16, 198, 358, 146, 22], [16, 360, 358, 170, 22], [16, 546, 358, 66, 22], [16, 632, 172, 104, 22], [202, 632, 172, 104, 22], ...TABBAR],
  mappa: [[20, 50, 120, 30, 10], [16, 98, 358, 38, 19], [16, 152, 358, 320, 22], [16, 488, 358, 56, 16], [16, 552, 358, 56, 16], ...TABBAR],
  diario: [[20, 50, 110, 30, 10], [16, 98, 358, 44, 14], [20, 162, 130, 16, 8], [16, 190, 358, 124, 22], [16, 330, 358, 124, 22], ...TABBAR],
  compagni: [[20, 40, 186, 40, 10], [20, 86, 140, 14, 7], [16, 110, 358, 148, 22], [16, 276, 358, 148, 22], [16, 440, 358, 86, 22], ...TABBAR],
}
function scheletro(nome: string): string {
  const forme = SCHELETRI[nome]
  if (!forme) throw new Error(`landing: scheletro sconosciuto «${nome}»`)
  const rect = forme.map(([x, y, w, h, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`).join('')
  return `<svg class="scheletro-forme" viewBox="0 0 390 844" preserveAspectRatio="none" aria-hidden="true" focusable="false">${rect}</svg>`
}

// ----------------------------------------------------------------- icone
// Uno sprite col tracciato di ogni icona usata (`<use href="#i-nome">`): le
// stesse di `Icon.paths.ts`, e la stessa classe `ui-icon` di Icon.css.
function sprite(html: string): string {
  const usate = new Set<IconName>(ICONE_DEL_MODULO)
  for (const m of html.matchAll(/href="#i-([a-z-]+)"/g)) {
    const nome = m[1] as IconName
    if (!(nome in PATHS)) throw new Error(`landing: icona sconosciuta «${nome}»`)
    usate.add(nome)
  }
  const simboli = [...usate].sort().map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24"><path d="${PATHS[n]}"/></symbol>`).join('')
  return `<svg class="sprite" aria-hidden="true" focusable="false">${simboli}</svg>`
}

// ------------------------------------------------------------ il modello
export function componiLanding(html: string): string {
  let n = 0
  const nuovoId = () => `l${++n}`
  // Nome e argomenti sono parole separate da un trattino («barra-vp»,
  // «mani-bianche»): così il «--» che chiude il commento non ci finisce dentro.
  let out = html.replace(/<!--@([a-z]+(?:-[a-z]+)*)((?:\s+[^\s>-]+(?:-[^\s>-]+)*)*)\s*-->/g, (_, nome: string, resto: string) => {
    const arg = resto.trim().split(/\s+/).filter(Boolean)
    switch (nome) {
      case 'scena':
        return scena(nuovoId())
      case 'pallo': {
        const [umore, ...opz] = arg
        if (!umore) throw new Error('landing: <!--@pallo--> senza umore')
        const classe = opz.find((o) => o.startsWith('classe='))?.slice(7)
        return svgPallo(umore as UmorePallo, nuovoId(), { testa: opz.includes('testa'), maniBianche: opz.includes('mani-bianche'), classe })
      }
      case 'marchio':
        return marchio(nuovoId())
      case 'mappa':
        return mappa()
      case 'mappa-citta':
        return mappaCitta()
      case 'barra-vp':
        return barraVp()
      case 'slide':
        return slide(nuovoId)
      case 'trascrizione':
        return trascrizione()
      case 'riepilogo':
        return riepilogo()
      case 'scheletro':
        return scheletro(arg[0] ?? '')
      case 'icone':
        return '<!--@icone-->' // dopo: lo sprite conta le icone dell'HTML finito
      default:
        throw new Error(`landing: direttiva sconosciuta <!--@${nome}-->`)
    }
  })
  out = out.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, p: string) => valore(p))
  out = out.replace('<!--@icone-->', sprite(out))
  return out
}
