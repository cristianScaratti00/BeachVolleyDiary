// ============================================================================
// Segnalazioni — validazione e mappatura.
//
// Le due parti che possono sbagliare in silenzio: un form che lascia partire
// una segnalazione vuota (e il DB la rifiuta con un errore Postgres illeggibile),
// e una riga della RPC con un valore fuori dai CHECK che manda in tilt la
// bacheca. La rete non si testa qui: `inviaSegnalazione`/`elencoSegnalazioni`
// sono involucri attorno a supabase-js.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  AREE,
  DESCRIZIONE_MAX,
  STATI,
  TITOLO_MAX,
  coloreStato,
  etichettaArea,
  etichettaStato,
  mapSegnalazione,
  validaSegnalazione,
} from './segnalazioni'
import type { NuovaSegnalazione } from './segnalazioni'

function bozza(over: Partial<NuovaSegnalazione> = {}): NuovaSegnalazione {
  return {
    titolo: 'Il torneo salvato non compare',
    descrizione: 'Ho salvato un torneo dal form completo e non lo vedo nella lista.',
    area: 'tornei',
    ...over,
  }
}

describe('validaSegnalazione — cosa può partire', () => {
  it('una segnalazione completa passa', () => {
    expect(validaSegnalazione(bozza())).toBeNull()
  })

  it('senza titolo non parte', () => {
    expect(validaSegnalazione(bozza({ titolo: '' }))).toMatch(/titolo/i)
  })

  it('uno spazio non è un titolo', () => {
    // Il CHECK del DB usa btrim: la validazione lato client deve dire la stessa
    // cosa, o l'errore arriva da Postgres in inglese.
    expect(validaSegnalazione(bozza({ titolo: '     ' }))).toMatch(/titolo/i)
  })

  it('una descrizione troppo corta non parte', () => {
    expect(validaSegnalazione(bozza({ descrizione: 'non va' }))).toMatch(/descrivi/i)
  })

  it('un titolo oltre il limite del DB viene fermato prima della rete', () => {
    expect(validaSegnalazione(bozza({ titolo: 'a'.repeat(TITOLO_MAX + 1) }))).toMatch(/troppo lungo/i)
  })

  it('una descrizione oltre il limite del DB viene fermata prima della rete', () => {
    expect(validaSegnalazione(bozza({ descrizione: 'a'.repeat(DESCRIZIONE_MAX + 1) }))).toMatch(/troppo lunga/i)
  })
})

describe('mapSegnalazione — riga della RPC → bacheca', () => {
  const riga = {
    id: 'r1',
    created_at: '2026-08-01T10:30:00.000Z',
    title: 'Crash aprendo la mappa',
    description: 'Tocco "Mappa" e la schermata resta bianca.',
    area: 'tornei',
    status: 'in_corso',
    user_agent: 'Mozilla/5.0 (iPhone)',
    reporter_name: 'Marta',
    reporter_email: 'marta@example.com',
  }

  it('traduce i campi snake_case nel modello della bacheca', () => {
    expect(mapSegnalazione(riga)).toEqual({
      id: 'r1',
      quando: '2026-08-01T10:30:00.000Z',
      titolo: 'Crash aprendo la mappa',
      descrizione: 'Tocco "Mappa" e la schermata resta bianca.',
      area: 'tornei',
      stato: 'in_corso',
      browser: 'Mozilla/5.0 (iPhone)',
      autore: 'Marta',
      email: 'marta@example.com',
    })
  })

  it('un valore fuori dai CHECK non fa saltare la bacheca', () => {
    // Non dovrebbe succedere (il DB non lo permette), ma una riga scritta da un
    // client futuro con un'area in più deve comparire lo stesso, non sparire.
    const strana = mapSegnalazione({ ...riga, area: 'stanza-segreta', status: 'archiviato' })
    expect(strana.area).toBe('altro')
    expect(strana.stato).toBe('nuovo')
  })
})

describe('etichette — ogni valore del DB ha una parola in italiano', () => {
  it('tutte le aree hanno un’etichetta propria', () => {
    for (const a of AREE) expect(etichettaArea(a.value)).toBe(a.label)
  })

  it('tutti gli stati hanno etichetta e colore propri', () => {
    for (const s of STATI) {
      expect(etichettaStato(s.value)).toBe(s.label)
      expect(coloreStato(s.value)).toBe(s.color)
    }
  })

  it('un valore sconosciuto non lascia la card senza etichetta', () => {
    expect(etichettaArea('boh')).toBe('Altro / non so dire')
    expect(etichettaStato('boh')).toBe('Nuova')
  })
})
