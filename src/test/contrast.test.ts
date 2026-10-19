// ============================================================================
// Contrasto WCAG dei punti dell'interfaccia che non sono semplici coppie di
// token: chip e contatori come li disegnano le primitive, il banner alpha, i
// pin della mappa sulle tile vere, la riga "torneo qui" del luogo.
//
// axe non può misurarlo: jsdom non fa layout e non implementa canvas, quindi la
// regola color-contrast restituisce sempre "incomplete". I colori però sono
// costanti note, quindi il rapporto si calcola direttamente — deterministico e
// senza browser.
//
// Le coppie di token in quanto tali (ogni inchiostro su ogni fondo, il vetro
// nel caso peggiore) le verifica src/styles/tokens.test.ts leggendo il CSS.
// Qui restano i REQUISITI: i pin, la riga del luogo, il banner. Non sono scelte
// di stile e non si "uniformano" al resto.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { contrast, AA_TEXT, AA_NON_TEXT } from './wcag'
import { LIT } from '../lib/theme'

const WHITE = '#FFFFFF'
const INK = LIT.ink
const PAGE = LIT.bg

describe('contrasto — filtro a chip (FilterChips)', () => {
  it('il testo della chip non attiva supera AA sulla carta', () => {
    expect(contrast(LIT.ink, LIT.surface)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('il testo della chip attiva supera AA sulla pillola d\'inchiostro', () => {
    expect(contrast(LIT.onSelect, LIT.select)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('lo stato selezionato si distingue dal fondo pagina senza affidarsi al bordo', () => {
    // L'inchiostro pieno è ciò che rende leggibile "quale filtro è attivo"
    // anche a chi non distingue un bordo dall'altro.
    expect(contrast(LIT.select, PAGE)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('l\'anello di focus si stacca dal fondo pagina', () => {
    // `outline-offset: 2px` disegna l'anello FUORI dalla chip: il fondo di
    // riferimento è la pagina, non il riempimento della chip attiva.
    expect(contrast(INK, PAGE)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('contrasto — contatori di sezione e badge', () => {
  it('il contatore neutro supera AA (era 3.34 con MUTED su #F2F0EC, difetto #3)', () => {
    // Il secondario sulla guida --fill (segmented inattivo).
    expect(contrast(LIT.ink2, LIT.fill)).toBe(4.56)
  })

  it('il contatore accent supera AA (era 4.21 con #C4501E su #FFF1EA)', () => {
    // Badge accento e "Prossimi tornei": --accent-text su --accent-wash.
    expect(contrast(LIT.accentText, LIT.accentWash)).toBe(4.66)
  })

  it('le vecchie coppie restano sotto AA: sono il motivo del cambio', () => {
    expect(contrast('rgba(27,42,74,.55)', '#F2F0EC')).toBe(3.34)
    expect(contrast('#C4501E', '#FFF1EA')).toBe(4.21)
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
//   fondo               bianco   inchiostro
//   acqua OSM            1.60    10.61
//   bosco fitto          9.84     1.73
//
// Esattamente invertiti. Da qui il doppio bordo — alone bianco fuori, contorno
// d'inchiostro dentro: qualunque sia la tile, uno dei due la stacca. È la
// soluzione cartografica standard, e qui è un REQUISITO: togliere uno dei due bordi come
// "rumore visivo" fa sparire i pin su metà della penisola, in silenzio.
// I pin NON passano dai token (ART_DIRECTION §4.5): restano i letterali di
// `dotForRank`, ed è su quelli che si misura.
// ============================================================================
const VINTO = '#FF6B35'
const PODIO = '#F7A883'
const GIOCATO = 'rgba(27,42,74,.25)'
// Due tile agli antipodi per luminosità: coprono il caso chiaro e quello scuro.
const TILE_MARE = '#AAD3DF' // acqua, la tinta standard di OSM
const TILE_BOSCO_FITTO = '#2E4A2E' // il verde più carico che capita sotto un pin

describe('contrasto — pin della mappa', () => {
  it('su ogni tile almeno uno dei due bordi supera la soglia', () => {
    // L'invariante che tiene in piedi la mappa. Non "il bianco basta" né
    // "l'inchiostro basta": basta la COPPIA, ed è per questo che ci sono entrambi.
    for (const tile of [TILE_MARE, TILE_BOSCO_FITTO]) {
      const meglio = Math.max(contrast(WHITE, tile), contrast(INK, tile))
      expect(meglio, tile).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  it('preso da solo, ciascun bordo fallisce su metà dei fondi', () => {
    // Fissati a numero: sono la prova che la ridondanza non è decorativa.
    expect(contrast(WHITE, TILE_MARE)).toBe(1.6) // il bianco sparisce sull'acqua…
    expect(contrast(INK, TILE_MARE)).toBe(10.61) // …e lì lavora l'inchiostro
    expect(contrast(INK, TILE_BOSCO_FITTO)).toBe(1.73) // l'inchiostro sparisce nel bosco…
    expect(contrast(WHITE, TILE_BOSCO_FITTO)).toBe(9.84) // …e lì lavora il bianco
  })

  it('il contorno d\'inchiostro si stacca sempre dal proprio alone', () => {
    // 17.01:1 — i due bordi non si confondono mai fra loro, qualunque cosa ci
    // sia sotto: è ciò che rende leggibile il pin come forma unica.
    expect(contrast(INK, WHITE)).toBe(17.01)
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
    // Riga in footnote (13px): testo normale per WCAG (grande = 18.66px
    // bold), quindi serve 4.5:1 pieno. Per questo è inchiostro e non arancio.
    expect(contrast(INK, PAGE)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('l\'arancione scuro dei badge di prima NON sarebbe bastato qui', () => {
    // 4.39:1 sul vecchio fondo sabbia: sotto AA. Fissato a numero perché la
    // tentazione di riusarlo torni a farsi notare invece che passare liscia.
    expect(contrast('#C4501E', '#FAF8F5')).toBe(4.39)
  })
})
