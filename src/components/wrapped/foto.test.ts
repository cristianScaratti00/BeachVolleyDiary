// ============================================================================
// Le misure delle foto sulle tele: intere, con la loro proporzione, mai
// ritagliate. `adatta` le fa stare in un riquadro; `disponi` le mette in righe
// giustificate (le polaroid della Storia) scegliendo come andare a capo.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { adatta, aspetto, disponi } from './foto'

const VERTICALE = { w: 900, h: 1200 }
const ORIZZONTALE = { w: 1200, h: 900 }
const ALTA = { w: 720, h: 1280 }

const BOX = { w: 960, h: 680, gapX: 24, gapY: 40, padX: 26, padTop: 26, padBottom: 98 }

describe('adatta', () => {
  it('tiene la proporzione e tocca il lato che limita', () => {
    expect(adatta(ORIZZONTALE, 904, 640)).toEqual({ w: 853, h: 640 })
    expect(adatta(VERTICALE, 904, 640)).toEqual({ w: 480, h: 640 })
    expect(adatta({ w: 1600, h: 800 }, 904, 640)).toEqual({ w: 904, h: 452 })
  })
})

describe('disponi', () => {
  it('ogni foto resta nella sua proporzione (a meno dell\'arrotondamento al pixel)', () => {
    const foto = [ALTA, ORIZZONTALE, VERTICALE]
    for (const p of disponi(foto, BOX).flat()) {
      expect(Math.abs(p.w / p.h - aspetto(foto[p.i]))).toBeLessThan(0.01)
    }
  })

  it('nella stessa riga le foto hanno la stessa altezza, e la riga sta nella larghezza', () => {
    const righe = disponi([ALTA, ORIZZONTALE, VERTICALE], BOX)
    for (const r of righe) {
      expect(new Set(r.map((p) => p.h)).size).toBe(1)
      const larga = r.reduce((s, p) => s + p.w + 2 * BOX.padX, 0) + (r.length - 1) * BOX.gapX
      expect(larga).toBeLessThanOrEqual(BOX.w + r.length)
    }
  })

  it('tre verticali stanno affiancate; tre panoramiche vanno su due righe, la prima (la copertina) grande', () => {
    expect(disponi([VERTICALE, VERTICALE, VERTICALE], BOX).map((r) => r.map((p) => p.i))).toEqual([[0, 1, 2]])
    const PANORAMICA = { w: 1600, h: 800 }
    const righe = disponi([PANORAMICA, PANORAMICA, PANORAMICA], BOX)
    expect(righe.map((r) => r.map((p) => p.i))).toEqual([[0], [1, 2]])
    expect(righe[0][0].w).toBeGreaterThan(righe[1][0].w)
  })

  it('il tutto sta nell\'altezza del riquadro', () => {
    for (const foto of [[ALTA], [VERTICALE, ALTA], [ORIZZONTALE, ORIZZONTALE, ORIZZONTALE]]) {
      const righe = disponi(foto, BOX)
      const alta = righe.reduce((s, r) => s + r[0].h + BOX.padTop + BOX.padBottom, 0) + (righe.length - 1) * BOX.gapY
      expect(alta).toBeLessThanOrEqual(BOX.h + righe.length)
    }
  })

  it('senza foto, niente righe', () => {
    expect(disponi([], BOX)).toEqual([])
  })
})
