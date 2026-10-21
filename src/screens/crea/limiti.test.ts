// ============================================================================
// I limiti delle risposte scritte nell'assistente (crea/limiti.ts): puri, con
// le parole di Solby. La lunghezza si conta in caratteri (un'emoji è uno),
// come `char_length` nel DB.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { RISPOSTA_MAX, maxDelPasso, validaRisposta } from './limiti'

const motivo = (r: ReturnType<typeof validaRisposta>) => (r.ok ? null : r.motivo)

describe('validaRisposta', () => {
  it('toglie gli spazi in testa e in coda e compatta quelli di mezzo', () => {
    expect(validaRisposta('name', '  Rimini   Open  ')).toEqual({ ok: true, valore: 'Rimini Open' })
  })

  it('vuoto: «Scrivimi almeno un nome»; per gli avversari invece vale (diventano «Avversari»)', () => {
    expect(motivo(validaRisposta('name', '   '))).toBe('Scrivimi almeno un nome.')
    expect(validaRisposta('matchOpponents', '  ')).toEqual({ ok: true, valore: '' })
  })

  it('il massimo è del campo: 60 il torneo, 40 il compagno, 50 il luogo (che vale anche da città)', () => {
    expect(validaRisposta('name', 'ab'.repeat(30)).ok).toBe(true)
    expect(motivo(validaRisposta('name', 'ab'.repeat(30) + 'c'))).toBe('Mi serve un nome più corto: massimo 60 caratteri. Riprova?')
    expect(validaRisposta('partnerName', 'ab'.repeat(20)).ok).toBe(true)
    expect(motivo(validaRisposta('partnerName', 'ab'.repeat(20) + 'c'))).toBe('Mi serve un nome più corto: massimo 40 caratteri. Riprova?')
    expect(motivo(validaRisposta('resultsPartnerName', 'ab'.repeat(21)))).toMatch(/massimo 40/)
    expect(validaRisposta('venueName', 'ab'.repeat(25)).ok).toBe(true)
    expect(motivo(validaRisposta('venueName', 'ab'.repeat(25) + 'c'))).toMatch(/massimo 50/)
    expect(motivo(validaRisposta('matchOpponents', 'ab'.repeat(31)))).toBe('Mi servono nomi più corti: massimo 60 caratteri. Riprova?')
  })

  it('troppo corto: una lettera sola non è un nome', () => {
    expect(motivo(validaRisposta('name', 'A'))).toBe('Mi serve un nome un po’ più lungo: almeno 2 caratteri. Riprova?')
    expect(validaRisposta('name', 'Al').ok).toBe(true)
  })

  it('servono lettere: non solo cifre, segni o emoji; con le lettere le emoji vanno bene', () => {
    const lettere = 'Nel nome mi serve almeno una lettera, non solo numeri, simboli o emoji. Riprova?'
    expect(motivo(validaRisposta('name', '🏐🏐🏐'))).toBe(lettere)
    expect(motivo(validaRisposta('name', '2026'))).toBe(lettere)
    expect(motivo(validaRisposta('name', '!!?'))).toBe(lettere)
    expect(validaRisposta('name', 'Cup 2026 🏐')).toEqual({ ok: true, valore: 'Cup 2026 🏐' })
    expect(validaRisposta('partnerName', 'Zoë')).toEqual({ ok: true, valore: 'Zoë' })
  })

  it('un’emoji conta un carattere, come nel DB', () => {
    // 3 emoji + 37 lettere = 40: entra nel compagno (in UTF-16 sarebbero 43).
    expect(validaRisposta('partnerName', '🏐'.repeat(3) + 'Ab'.repeat(18) + 'A').ok).toBe(true)
    expect(validaRisposta('partnerName', '🏐'.repeat(3) + 'Ab'.repeat(19)).ok).toBe(false)
  })

  it('niente a capo e niente link', () => {
    expect(motivo(validaRisposta('name', 'Rimini\nOpen'))).toBe('Scrivimelo su una riga sola, senza andare a capo. Riprova?')
    expect(motivo(validaRisposta('name', 'https://torneo.it'))).toMatch(/^Niente link: mi basta il nome/)
    expect(motivo(validaRisposta('name', 'Iscriviti su www.torneo.it'))).toMatch(/^Niente link/)
    expect(motivo(validaRisposta('matchOpponents', 'http://x.it'))).toMatch(/^Niente link: mi bastano i nomi/)
  })

  it('lo stesso carattere più di 6 volte di fila sembra un tasto rimasto premuto', () => {
    expect(motivo(validaRisposta('name', 'aaaaaaa'))).toBe('Sembra un tasto rimasto premuto. Riscrivimelo?')
    expect(motivo(validaRisposta('name', 'Coppa!!!!!!!'))).toBe('Sembra un tasto rimasto premuto. Riscrivimelo?')
    expect(validaRisposta('name', 'aaaaaa').ok).toBe(true)
  })

  it('sui passi senza testo libero la risposta passa com’è', () => {
    expect(validaRisposta('category', '  amatoriale ')).toEqual({ ok: true, valore: 'amatoriale' })
  })
})

describe('maxDelPasso', () => {
  it('il massimo del campo del dock, passo per passo', () => {
    expect(maxDelPasso('name')).toBe(60)
    expect(maxDelPasso('partner')).toBe(40)
    expect(maxDelPasso('resultsPartnerName')).toBe(40)
    expect(maxDelPasso('venue')).toBe(50)
    expect(maxDelPasso('venueName')).toBe(50)
    expect(maxDelPasso('matchOpponents')).toBe(60)
    expect(maxDelPasso('category')).toBe(RISPOSTA_MAX)
  })
})
