// ============================================================================
// Contrasto WCAG dei colori introdotti dal filtro a chip e dai contatori di
// sezione.
//
// axe non può misurarlo: jsdom non fa layout e non implementa canvas, quindi la
// regola color-contrast restituisce sempre "incomplete". I colori però sono
// costanti note, quindi il rapporto si calcola direttamente — deterministico e
// senza browser.
//
// Cosa presidia questo file: che i token NUOVI non stiano peggio di quelli di
// casa che riusano. Il debito di contrasto del design system (testo secondario
// al 55% di opacità) è preesistente e documentato in
// docs/QA-tornei-formati.md — qui è fissato a numero, così se qualcuno
// schiarisce ancora quei colori il test se ne accorge.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { INK, MUTED } from '../components/ui'

const AA_TEXT = 4.5 // WCAG 1.4.3, testo normale
const AA_NON_TEXT = 3 // WCAG 1.4.11, bordi/indicatori/stati

const PAGE = '#FAF8F5' // body, src/index.css
const WHITE = '#ffffff'
const NEUTRAL_BG = '#F2F0EC' // fondo del contatore neutro e di Badge tone="neutral"
const ACCENT_BG = '#FFF1EA' // fondo del contatore "Prossimi tornei" e del badge podio
const ACCENT_FG = '#C4501E'
const FOCUS_RING = '#1B2A4A' // .chip:focus-visible, src/index.css

type RGB = [number, number, number]

// Accetta '#RRGGBB' e 'rgba(r,g,b,a)' — MUTED è esportato in quella forma.
function parse(color: string): { rgb: RGB; alpha: number } {
  const rgba = color.match(/rgba?\(([^)]+)\)/)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim())
    return { rgb: [+r, +g, +b], alpha: +a }
  }
  return { rgb: [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as RGB, alpha: 1 }
}

// Un colore semitrasparente non ha un contrasto proprio: va composto sul fondo
// su cui viene realmente disegnato.
function flatten(color: string, background: string): RGB {
  const fg = parse(color)
  const bg = parse(background)
  return fg.rgb.map((c, i) => fg.alpha * c + (1 - fg.alpha) * bg.rgb[i]) as RGB
}

function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(color: string, background: string): number {
  const [hi, lo] = [luminance(flatten(color, background)), luminance(flatten(background, background))].sort((a, b) => b - a)
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

describe('contrasto — filtro a chip', () => {
  it('il testo della chip non attiva supera AA', () => {
    expect(contrast(INK, WHITE)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('il testo della chip attiva supera AA', () => {
    expect(contrast(WHITE, INK)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('lo stato selezionato si distingue dallo sfondo pagina senza affidarsi al bordo', () => {
    // Il navy pieno è ciò che rende leggibile "quale filtro è attivo" anche a
    // chi non distingue un bordo dall'altro.
    expect(contrast(INK, PAGE)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('il contorno di focus si stacca dallo sfondo pagina', () => {
    // `outline-offset: 2px` disegna il contorno FUORI dalla chip: il fondo di
    // riferimento è la pagina, non il riempimento navy della chip attiva.
    expect(contrast(FOCUS_RING, PAGE)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('contrasto — contatori di sezione', () => {
  it('il contatore neutro riusa esattamente la coppia di Badge tone="neutral"', () => {
    // Nessun token nuovo: il contatore non aggiunge debito, lo eredita.
    // 3.34:1 è sotto AA — difetto sistemico del design system, non di questa
    // schermata (vedi docs/QA-tornei-formati.md, difetto #3).
    expect(contrast(MUTED, NEUTRAL_BG)).toBe(3.34)
  })

  it('il contatore accent riusa esattamente la coppia del badge da podio', () => {
    // 4.21:1, appena sotto AA. Stessa coppia già usata su ogni card.
    expect(contrast(ACCENT_FG, ACCENT_BG)).toBe(4.21)
  })
})

// ============================================================================
// Mappa delle conquiste — perché il pin ha DUE bordi e non uno.
//
// Su una card il pallino da 8px sta accanto a un'etichetta testuale: è
// decorativo, e WCAG 1.4.11 non si applica. Sulla mappa lo stesso colore è
// l'UNICO portatore di "qui sono uscito ai gironi", quindi 1.4.11 si applica
// davvero — e nessuno dei tre riempimenti lo supera da solo.
//
// Con le tile OpenStreetMap il problema cambia natura rispetto al vecchio
// disegno SVG: lì sotto i pin c'era un beige costante e bastava misurare contro
// quello. Qui sotto può esserci mare, bosco, sabbia o asfalto, e **nessun
// colore singolo supera 3:1 contro tutti**. I numeri lo dicono chiaro:
//
//   fondo               bianco   navy
//   acqua OSM            1.60    8.87
//   bosco fitto          9.84    1.45
//
// Esattamente invertiti. Da qui il doppio bordo — alone bianco fuori, contorno
// navy dentro: qualunque sia la tile, uno dei due la stacca. È la soluzione
// cartografica standard, e qui è un REQUISITO: togliere uno dei due bordi come
// "rumore visivo" fa sparire i pin su metà della penisola, in silenzio.
// ============================================================================
const VINTO = '#FF6B35'
const PODIO = '#F7A883'
const GIOCATO = 'rgba(27,42,74,.25)'
// Due tile agli antipodi per luminosità: coprono il caso chiaro e quello scuro.
const TILE_MARE = '#AAD3DF' // acqua, la tinta standard di OSM
const TILE_BOSCO_FITTO = '#2E4A2E' // il verde più carico che capita sotto un pin

describe('contrasto — pin della mappa', () => {
  it('su ogni tile almeno uno dei due bordi supera la soglia', () => {
    // L'invariante che tiene in piedi la mappa. Non "il bianco basta" né "il
    // navy basta": basta la COPPIA, ed è per questo che ci sono entrambi.
    for (const tile of [TILE_MARE, TILE_BOSCO_FITTO]) {
      const meglio = Math.max(contrast(WHITE, tile), contrast(INK, tile))
      expect(meglio, tile).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  it('preso da solo, ciascun bordo fallisce su metà dei fondi', () => {
    // Fissati a numero: sono la prova che la ridondanza non è decorativa.
    expect(contrast(WHITE, TILE_MARE)).toBe(1.6) // il bianco sparisce sull'acqua…
    expect(contrast(INK, TILE_MARE)).toBe(8.87) // …e lì lavora il navy
    expect(contrast(INK, TILE_BOSCO_FITTO)).toBe(1.45) // il navy sparisce nel bosco…
    expect(contrast(WHITE, TILE_BOSCO_FITTO)).toBe(9.84) // …e lì lavora il bianco
  })

  it('il contorno navy si stacca sempre dal proprio alone', () => {
    // 14.22:1 — i due bordi non si confondono mai fra loro, qualunque cosa ci
    // sia sotto: è ciò che rende leggibile il pin come forma unica.
    expect(contrast(INK, WHITE)).toBe(14.22)
  })

  it('nessuno dei tre riempimenti basterebbe da solo sulle tile', () => {
    // Sul mare il pin "vinto" arancione sta a 1.77:1: senza bordi sarebbe
    // invisibile su mezza riviera, che è esattamente dove si gioca.
    expect(contrast(VINTO, TILE_MARE)).toBe(1.77)
    expect(contrast(PODIO, TILE_MARE)).toBe(1.2)
    expect(contrast(GIOCATO, TILE_MARE)).toBe(1.56)
    // Tutti sotto 3:1. Il colore resta un canale ridondante: forma
    // (pieno-con-punto / pieno / vuoto) e testo portano la stessa informazione.
    ;[1.77, 1.2, 1.56].forEach((r) => expect(r).toBeLessThan(AA_NON_TEXT))
  })
})

describe('contrasto — riga "torneo qui" del luogo', () => {
  it('il testo della storia del luogo supera AA su fondo pagina', () => {
    // Riga da 12.5px: testo normale per WCAG (grande = 18.66px bold), quindi
    // serve 4.5:1 pieno. Per questo è navy e non arancione scuro.
    expect(contrast(INK, PAGE)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('l\'arancione scuro dei badge NON basterebbe qui', () => {
    // 4.39:1 su fondo pagina: sotto AA. Fissato a numero perché la tentazione
    // di riusarlo (sta bene) torni a farsi notare invece che passare liscia.
    expect(contrast(ACCENT_FG, PAGE)).toBe(4.39)
  })
})
