// ============================================================================
// La scala dei piazzamenti. `placementRank` decide "qual è il risultato
// migliore" in mezza app (header Tornei, dashboard, Beach Wrapped) e il suo
// numero viaggia anche sul filo: le RPC restituiscono `rank`/`best_rank` e il
// client li rimappa in etichetta. Qui si verifica l'ordine, non i valori:
// contano solo il verso e le soglie usate altrove (1 vittoria, <= 3 podio,
// <= 8 risultato reale, 9 nessun risultato).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { placementRank } from './stats'
import { PLACEMENTS } from './db.enums'

describe('placementRank', () => {
  it('ordina i piazzamenti come PLACEMENTS, dal migliore al peggiore', () => {
    // Data-driven sull'array: un piazzamento aggiunto in futuro e non gestito
    // cade nel fallback 9 e fa fallire subito questo test, invece di degradare
    // in silenzio a "peggio dei gironi".
    const ranks = PLACEMENTS.map(placementRank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(new Set(ranks).size).toBe(PLACEMENTS.length)
  })

  it('una semifinale vale più di quarti e gironi, non meno', () => {
    // La regressione storica: 'Semifinale' non era gestito e finiva a 9,
    // cioè classificato peggio di un'uscita ai gironi (8).
    expect(placementRank('Semifinale')).toBeLessThan(placementRank('Quarti'))
    expect(placementRank('Semifinale')).toBeLessThan(placementRank('Gironi'))
    expect(placementRank('Semifinale')).toBeGreaterThan(placementRank('3°'))
  })

  it('il podio sta sotto la soglia <= 3 usata dal resto dell\'app', () => {
    expect(placementRank('1° 🏆')).toBe(1)
    expect(placementRank('2°')).toBeLessThanOrEqual(3)
    expect(placementRank('3°')).toBeLessThanOrEqual(3)
    expect(placementRank('Semifinale')).toBeGreaterThan(3)
  })

  it('i piazzamenti reali restano sotto la soglia <= 8 (slide "miglior risultato")', () => {
    const reali = PLACEMENTS.filter((l) => l !== 'In corso')
    reali.forEach((l) => expect(placementRank(l)).toBeLessThanOrEqual(8))
  })

  it('"In corso", stringa vuota e valori sconosciuti sono "nessun risultato"', () => {
    expect(placementRank('In corso')).toBe(9)
    expect(placementRank('')).toBe(9)
    expect(placementRank('Ripescaggio')).toBe(9)
  })

  it('riconosce i piazzamenti a podio anche con suffissi (es. "1° 🏆")', () => {
    // Il match è per prefisso: l'emoji sul primo posto non deve declassarlo.
    expect(placementRank('1°')).toBe(placementRank('1° 🏆'))
    expect(placementRank('2° posto')).toBe(placementRank('2°'))
  })
})
