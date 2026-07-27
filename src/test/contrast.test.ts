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
// Mappa delle conquiste — perché il contorno dei pin non è una rifinitura.
//
// Su una card il pallino da 8px sta accanto a un'etichetta testuale: è
// decorativo, e WCAG 1.4.11 non si applica. Sulla mappa lo stesso colore è
// l'UNICO portatore di "qui sono uscito ai gironi" — quindi 1.4.11 si applica
// davvero, e nessuno dei tre riempimenti lo supera. Il segnale portante è il
// CONTORNO navy, che invece lo supera abbondantemente.
//
// I tre rapporti bocciati sono fissati a numero apposta: se qualcuno "pulisce"
// il contorno dei pin come rumore visivo, resta questo file a dire che quel
// contorno era l'unica cosa conforme.
// ============================================================================
const TERRA = '#F2F0EC' // fondo della terraferma disegnata (src/screens/Mappa.tsx)

describe('contrasto — pin della mappa', () => {
  it('il contorno navy dei pin supera la soglia per gli elementi non testuali', () => {
    // 12.49:1 — è questo a rendere visibile ogni pin, indipendentemente dal
    // riempimento. È un REQUISITO di Mappa.tsx, non una scelta estetica.
    expect(contrast(INK, TERRA)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('nessuno dei tre riempimenti basterebbe da solo', () => {
    expect(contrast('#FF6B35', TERRA)).toBe(2.49) // vinto
    expect(contrast('#F7A883', TERRA)).toBe(1.7) // podio
    expect(contrast('rgba(27,42,74,.25)', TERRA)).toBe(1.63) // giocato
    // Tutti e tre sotto 3:1. Il colore resta un canale ridondante: forma
    // (pieno-con-punto / pieno / vuoto) e testo portano la stessa informazione.
    ;[2.49, 1.7, 1.63].forEach((r) => expect(r).toBeLessThan(AA_NON_TEXT))
  })

  it('la terraferma si distingue dal fondo bianco della card solo di poco', () => {
    // 1.14:1 — la sagoma è decorativa: nessun fatto dipende dal vederla, e
    // infatti il riassunto testuale dell'SVG e la lista non la citano mai.
    expect(contrast(TERRA, WHITE)).toBe(1.14)
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
