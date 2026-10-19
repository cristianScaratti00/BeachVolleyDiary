// ============================================================================
// La tela dei PNG (ART_DIRECTION §4.7, UX §11.3): i tre fondi pieni del
// redesign, ogni testo ≥ 4.5:1 sul suo fondo, solo colori opachi.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { contrast, AA_TEXT, AA_NON_TEXT } from '../../test/wcag'
import { LIT } from '../../lib/theme'
import { PALETTES, WRAPPED_PALETTES, STORY_PALETTES, wrappedPalette } from './palette'

const OPACO = /^#[0-9A-F]{6}$/i
const TUTTE = Object.values(PALETTES)

describe('palette dei PNG', () => {
  it.each(TUTTE)('$key: solo colori letterali e opachi', (p) => {
    for (const c of [p.bg, p.fg, p.accent, p.muted, p.line, p.mani]) expect(c).toMatch(OPACO)
  })

  it('i fondi sono quelli dell\'app: arancio, inchiostro, sabbia', () => {
    expect(PALETTES.orange).toMatchObject({ bg: LIT.accent, fg: LIT.ink })
    expect(PALETTES.ink).toMatchObject({ bg: LIT.ink, fg: LIT.inkInverse })
    expect(PALETTES.sand).toMatchObject({ bg: LIT.bg, fg: LIT.ink })
  })

  it.each(TUTTE)('$key: ogni testo regge AA sul fondo', (p) => {
    for (const testo of [p.fg, p.muted]) {
      expect(contrast(testo, p.bg), `${testo} su ${p.bg}`).toBeGreaterThanOrEqual(AA_TEXT)
    }
    // L'accento colora numeri enormi (testo grande), ma regge comunque 4.5.
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('i numeri: l\'inchiostro sull\'arancio, il secondario all\'85% (all\'80% non reggeva)', () => {
    expect(contrast(PALETTES.orange.fg, PALETTES.orange.bg)).toBe(5.97)
    expect(contrast(PALETTES.orange.muted, PALETTES.orange.bg)).toBe(4.83)
    expect(contrast(PALETTES.ink.fg, PALETTES.ink.bg)).toBe(17.01)
    expect(contrast(PALETTES.sand.accent, PALETTES.sand.bg)).toBe(4.79)
  })

  it('il bianco sull\'arancio NON regge: è il motivo dell\'inchiostro', () => {
    expect(contrast('#FFFFFF', LIT.accent)).toBeLessThan(AA_TEXT)
  })

  it('le mani di Pallo non spariscono nel fondo: bianche sull\'arancio', () => {
    for (const p of TUTTE) expect(p.mani).not.toBe(p.bg)
    expect(PALETTES.orange.mani).toBe(LIT.inkInverse)
    expect(contrast(PALETTES.ink.mani, PALETTES.ink.bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('rotazione delle slide arancio → inchiostro → sabbia, come nel design; la Storia parte dall\'inchiostro', () => {
    expect(WRAPPED_PALETTES.map((p) => p.key)).toEqual(['orange', 'ink', 'sand'])
    expect([0, 1, 2, 3, 4].map((i) => wrappedPalette(i).key)).toEqual(['orange', 'ink', 'sand', 'orange', 'ink'])
    expect(STORY_PALETTES.map((p) => p.key)).toEqual(['ink', 'sand', 'orange'])
  })
})
