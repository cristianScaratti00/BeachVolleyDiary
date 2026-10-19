// ============================================================================
// La tela dei PNG (ART_DIRECTION §4.7, UX §11.3): ogni testo ≥ 4.5:1 su ogni
// palette, anche sopra il disco del sole; solo colori opachi.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { contrast, AA_TEXT, AA_NON_TEXT } from '../../test/wcag'
import { PALETTES, WRAPPED_PALETTES, STORY_PALETTES } from './palette'

const OPACO = /^#[0-9A-F]{6}$/i

describe('palette dei PNG', () => {
  it.each(Object.values(PALETTES))('$key: solo colori letterali e opachi', (p) => {
    for (const c of [p.bg, p.fg, p.accent, p.muted, p.line, p.disc]) expect(c).toMatch(OPACO)
  })

  it.each(Object.values(PALETTES))('$key: ogni testo regge AA sul fondo e sul disco', (p) => {
    for (const fondo of [p.bg, p.disc]) {
      for (const testo of [p.fg, p.muted]) {
        expect(contrast(testo, fondo), `${testo} su ${fondo}`).toBeGreaterThanOrEqual(AA_TEXT)
      }
      // `accent` sulla tela colora SOLO numeri enormi (eroe 320px, celle
      // 112px: ART_DIRECTION §10.4), cioè testo grande: la soglia è 3:1. Sul
      // fondo regge comunque 4.5; sul disco navy si ferma a 4.43 (§4.7).
      expect(contrast(p.accent, fondo), `${p.accent} su ${fondo}`).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('i numeri citati in ART_DIRECTION §4.7', () => {
    expect(contrast(PALETTES.navy.fg, PALETTES.navy.bg)).toBe(14.71)
    expect(contrast(PALETTES.navy.accent, PALETTES.navy.bg)).toBe(5.5)
    expect(contrast(PALETTES.sand.fg, PALETTES.sand.bg)).toBe(12.64)
    expect(contrast(PALETTES.orange.fg, PALETTES.orange.bg)).toBe(5.5)
    expect(contrast(PALETTES.navy.accent, PALETTES.navy.disc)).toBe(4.43)
  })

  it('il bianco sull\'arancio di prima NON reggeva: è il motivo della palette monocroma', () => {
    expect(contrast('#FFFFFF', '#FF6B35')).toBeLessThan(AA_TEXT)
  })

  it('rotazione delle slide navy → orange → sand; la Storia parte da navy', () => {
    expect(WRAPPED_PALETTES.map((p) => p.key)).toEqual(['navy', 'orange', 'sand'])
    expect(STORY_PALETTES.map((p) => p.key)).toEqual(['navy', 'sand', 'orange'])
  })
})
