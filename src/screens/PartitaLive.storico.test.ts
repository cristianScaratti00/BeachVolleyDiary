// ============================================================================
// Lo storico delle partite tra amici: quello che deve reggere anche quando la
// memoria del telefono fa i capricci (voci rotte, localStorage che esplode),
// il tetto delle 20, i doppioni impossibili e la chiave per account.
// ============================================================================
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CHIAVE_STORICO,
  MAX_STORICO,
  conPartita,
  esitoAmici,
  leggiStorico,
  nomeLoro,
  nomeNoi,
  quandoDetto,
  registraPartita,
  svuotaStorico,
  togliPartita,
} from './PartitaLive.storico'
import type { PartitaAmici } from './PartitaLive.storico'

const partita = (id: string, quando: string, over: Partial<PartitaAmici> = {}): PartitaAmici => ({
  id,
  quando,
  compagno: '',
  avversari: '',
  set: [{ us: 21, them: 18 }],
  ...over,
})

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('storico tra amici — puri', () => {
  it('conPartita mette la nuova in cima, sostituisce la stessa id e si ferma a 20', () => {
    let lista: PartitaAmici[] = []
    for (let i = 0; i < 25; i++) lista = conPartita(lista, partita(`p${i}`, new Date(Date.UTC(2026, 9, 1, 10, i)).toISOString()))
    expect(lista).toHaveLength(MAX_STORICO)
    expect(lista[0].id).toBe('p24')
    expect(lista[lista.length - 1].id).toBe('p5')
    // Riaperta e richiusa: stessa id, nessun doppione, risultato nuovo.
    const rifatta = conPartita(lista, partita('p10', new Date(Date.UTC(2026, 9, 2)).toISOString(), { set: [{ us: 15, them: 21 }] }))
    expect(rifatta.filter((p) => p.id === 'p10')).toHaveLength(1)
    expect(rifatta[0]).toMatchObject({ id: 'p10', set: [{ us: 15, them: 21 }] })
  })

  it('esitoAmici conta i set vinti; a parità è pari', () => {
    expect(esitoAmici([{ us: 21, them: 19 }, { us: 18, them: 21 }, { us: 15, them: 12 }])).toBe('vinta')
    expect(esitoAmici([{ us: 10, them: 15 }])).toBe('persa')
    expect(esitoAmici([{ us: 21, them: 19 }, { us: 18, them: 21 }])).toBe('pari')
    expect(esitoAmici([{ us: 14, them: 14 }])).toBe('pari')
  })

  it('i nomi vuoti diventano «Noi» e «Loro»', () => {
    expect(nomeNoi('')).toBe('Noi')
    expect(nomeNoi('  Luca ')).toBe('Tu e Luca')
    expect(nomeLoro('  ')).toBe('Loro')
    expect(nomeLoro('Marco / Gio')).toBe('Marco / Gio')
  })

  it('quandoDetto: oggi, ieri, qualche giorno fa, poi la data breve, sempre con l’ora', () => {
    const ora = new Date(2026, 9, 18, 21, 0)
    expect(quandoDetto(new Date(2026, 9, 18, 18, 40).toISOString(), ora)).toBe('Oggi, 18:40')
    expect(quandoDetto(new Date(2026, 9, 17, 9, 5).toISOString(), ora)).toBe('Ieri, 09:05')
    expect(quandoDetto(new Date(2026, 9, 15, 19, 30).toISOString(), ora)).toBe('3 giorni fa, 19:30')
    expect(quandoDetto(new Date(2026, 9, 3, 18, 0).toISOString(), ora)).toBe('Sab 3 ott, 18:00')
    expect(quandoDetto('non è una data', ora)).toBe('')
  })
})

describe('storico tra amici — memoria', () => {
  it('registra, rilegge dalla più recente, toglie e svuota', () => {
    registraPartita(partita('a', '2026-10-10T18:00:00.000Z'))
    registraPartita(partita('b', '2026-10-12T18:00:00.000Z'))
    expect(leggiStorico().map((p) => p.id)).toEqual(['b', 'a'])
    expect(togliPartita('b').map((p) => p.id)).toEqual(['a'])
    expect(leggiStorico().map((p) => p.id)).toEqual(['a'])
    svuotaStorico()
    expect(leggiStorico()).toEqual([])
    expect(localStorage.getItem(CHIAVE_STORICO)).toBeNull()
  })

  it('ogni account ha il suo storico', () => {
    registraPartita(partita('mia', '2026-10-10T18:00:00.000Z'), 'u1')
    expect(leggiStorico('u1').map((p) => p.id)).toEqual(['mia'])
    expect(leggiStorico('u2')).toEqual([])
    expect(localStorage.getItem(`${CHIAVE_STORICO}:u1`)).not.toBeNull()
  })

  it('una memoria rotta non fa danni: si scarta la voce storta, non tutto', () => {
    localStorage.setItem(CHIAVE_STORICO, '{rotta')
    expect(leggiStorico()).toEqual([])
    localStorage.setItem(
      CHIAVE_STORICO,
      JSON.stringify([
        partita('buona', '2026-10-10T18:00:00.000Z', { compagno: 'Luca' }),
        { id: 'senza-set', quando: '2026-10-11T18:00:00.000Z', set: [] },
        { id: 'set-storti', quando: '2026-10-11T18:00:00.000Z', set: [{ us: -1, them: 'x' }] },
        { id: 'data-storta', quando: 'ieri', set: [{ us: 21, them: 10 }] },
        null,
      ]),
    )
    expect(leggiStorico()).toEqual([partita('buona', '2026-10-10T18:00:00.000Z', { compagno: 'Luca' })])
  })

  it('se localStorage esplode lo storico è vuoto e la scrittura non lancia', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(leggiStorico()).toEqual([])
    expect(() => registraPartita(partita('a', '2026-10-10T18:00:00.000Z'))).not.toThrow()
  })
})
