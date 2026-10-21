// ============================================================================
// Le lunghezze dei testi scritti a mano (lunghezze.ts) e il loro backstop nel
// DB: i CHECK della migration devono dire gli stessi massimi, o un modulo
// lascerebbe scrivere quello che il DB poi rifiuta (o viceversa).
// ============================================================================
import { describe, it, expect } from 'vitest'
import sql from '../../supabase/migrations/20261021120000_text_length_checks.sql?raw'
import { LIMITI, compatta, verificaTesto } from './lunghezze'

describe('verificaTesto', () => {
  it('compatta gli spazi e conta i caratteri, non le unità UTF-16', () => {
    expect(compatta('  a \t b  ')).toBe('a b')
    expect(verificaTesto('🏐🏐ab', { min: 2, max: 4 })).toEqual({ ok: true, valore: '🏐🏐ab' })
    expect(verificaTesto('🏐🏐abc', { min: 2, max: 4 })).toEqual({ ok: false, motivo: 'lungo' })
  })

  it('l’ordine dei motivi: vuoto, a capo, link, lungo, corto, lettere, ripetuto', () => {
    const l = { min: 2, max: 10 }
    expect(verificaTesto(' ', l)).toEqual({ ok: false, motivo: 'vuoto' })
    expect(verificaTesto('a\nb', l)).toEqual({ ok: false, motivo: 'aCapo' })
    expect(verificaTesto('www.lunghissimo.it', l)).toEqual({ ok: false, motivo: 'link' })
    expect(verificaTesto('abcdefghijk', l)).toEqual({ ok: false, motivo: 'lungo' })
    expect(verificaTesto('a', l)).toEqual({ ok: false, motivo: 'corto' })
    expect(verificaTesto('12', l)).toEqual({ ok: false, motivo: 'lettere' })
    expect(verificaTesto('zzzzzzz', l)).toEqual({ ok: false, motivo: 'ripetuto' })
  })
})

describe('i CHECK del DB dicono gli stessi massimi', () => {
  const nelDb = (tabella: string, colonna: string) => {
    const m = sql.match(new RegExp(`alter table public\\.${tabella} add constraint ${tabella}_${colonna}_length check \\(char_length\\(${colonna}\\) <= (\\d+)\\)`))
    return m ? Number(m[1]) : null
  }

  it.each([
    ['tournaments', 'name', LIMITI.torneo.max],
    ['tournaments', 'city', LIMITI.citta.max],
    ['partners', 'name', LIMITI.compagno.max],
    ['venues', 'name', LIMITI.luogo.max],
    ['venues', 'city', LIMITI.citta.max],
  ])('%s.%s ≤ %i', (tabella, colonna, max) => {
    expect(nelDb(tabella, colonna)).toBe(max)
  })
})
