// ============================================================================
// Le regole di Partita live, senza schermata (UX.md §L14.2): le stesse che
// usano l'app (PartitaLive.tsx) e la demo della landing (presentazione/js/
// live.ts). La schermata le prova giocando in PartitaLive.test.tsx; qui ogni
// caso di confine e ogni battuta di Pallo, uno per uno.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { FORMATO_BEACH, battuta, cambioOgni, daVincere, obiettivo, partitaChiusa, setFinito, titoloSet, vinti } from './PartitaLive.regole'
import type { Formato, PartitaInCorso } from './PartitaLive.regole'

function partita(p: Partial<PartitaInCorso> = {}): PartitaInCorso {
  return {
    v: 1, modo: 'amici', id: 'x', torneoId: '', fase: 'Girone', compagno: '', avversari: '',
    formato: FORMATO_BEACH, chiusi: [], noi: 0, loro: 0, ultimo: null, colpo: 0, finita: false, aMano: false, note: '',
    ...p,
  }
}
const UNICO: Formato = { set: 1, punti: 15 }

describe('il set (UX §L12.6)', () => {
  it('a 21, il terzo a 15; il set unico al suo punteggio', () => {
    expect([0, 1, 2].map((i) => obiettivo(i))).toEqual([21, 21, 15])
    expect(obiettivo(0, UNICO)).toBe(15)
    expect(obiettivo(0, { set: 1, punti: 21 })).toBe(21)
  })

  it('si vince con due punti di scarto, anche ai vantaggi', () => {
    expect(setFinito(21, 19, 21)).toBe(true)
    expect(setFinito(21, 20, 21)).toBe(false)
    expect(setFinito(22, 20, 21)).toBe(true)
    expect(setFinito(29, 28, 21)).toBe(false)
    expect(setFinito(13, 15, 15)).toBe(true)
    expect(setFinito(20, 0, 21)).toBe(false)
  })

  it('cambio campo ogni 7 punti nei set a 21, ogni 5 in quelli a 15', () => {
    expect(cambioOgni(21)).toBe(7)
    expect(cambioOgni(15)).toBe(5)
  })

  it('2 set su 3, o quello unico; la partita si chiude coi set vinti o giocati', () => {
    expect(daVincere(FORMATO_BEACH)).toBe(2)
    expect(daVincere(UNICO)).toBe(1)
    expect(vinti([{ us: 21, them: 18 }, { us: 15, them: 21 }])).toEqual({ noi: 1, loro: 1 })
    expect(partitaChiusa([{ us: 21, them: 18 }], FORMATO_BEACH)).toBe(false)
    expect(partitaChiusa([{ us: 21, them: 18 }, { us: 21, them: 10 }], FORMATO_BEACH)).toBe(true)
    expect(partitaChiusa([{ us: 21, them: 18 }, { us: 10, them: 21 }, { us: 15, them: 13 }], FORMATO_BEACH)).toBe(true)
    expect(partitaChiusa([{ us: 15, them: 10 }], UNICO)).toBe(true)
  })

  it('«Set 2 di 3», o «Set unico»', () => {
    expect(titoloSet(1, FORMATO_BEACH)).toBe('Set 2 di 3')
    expect(titoloSet(0, UNICO)).toBe('Set unico')
  })
})

describe('le battute di Pallo (`battuta`)', () => {
  it.each([
    ['si comincia', partita(), 'Si comincia! Tocca chi fa punto.', 'saluta', false],
    ['un punto nostro', partita({ noi: 1, ultimo: 'noi' }), 'Bel punto! Avanti così.', 'esulta', false],
    ['un punto loro', partita({ loro: 1, ultimo: 'loro' }), 'Testa alta, il prossimo è nostro.', 'preoccupato', false],
    ['un punto tolto', partita({ noi: 2, ultimo: 'tolto' }), 'Punto tolto: si riparte da qui.', 'contento', false],
    ['cambio campo a 7', partita({ noi: 4, loro: 3, ultimo: 'loro' }), 'Cambio campo!', 'preoccupato', true],
    ['cambio campo a 14', partita({ noi: 8, loro: 6, ultimo: 'noi' }), 'Cambio campo!', 'esulta', true],
    ['non col punto tolto', partita({ noi: 4, loro: 3, ultimo: 'tolto' }), 'Punto tolto: si riparte da qui.', 'contento', false],
    ['cambio a 5 nel set a 15', partita({ chiusi: [{ us: 21, them: 0 }, { us: 0, them: 21 }], noi: 3, loro: 2, ultimo: 'noi' }), 'Cambio campo!', 'esulta', true],
    ['set point nostro', partita({ noi: 20, loro: 18, ultimo: 'noi' }), 'Set point per voi!', 'esulta', true],
    ['set point loro', partita({ noi: 12, loro: 20, ultimo: 'loro' }), 'Set point loro: concentrati.', 'preoccupato', true],
    ['match point nostro', partita({ chiusi: [{ us: 21, them: 10 }], noi: 20, loro: 3, ultimo: 'noi' }), 'Match point per voi!', 'sorpreso', true],
    ['match point loro', partita({ chiusi: [{ us: 10, them: 21 }], noi: 3, loro: 20, ultimo: 'loro' }), 'Match point loro: concentrati.', 'sorpreso', true],
    ['ai vantaggi', partita({ noi: 20, loro: 20, ultimo: 'loro' }), 'Ai vantaggi: servono due punti di fila.', 'preoccupato', true],
    ['set vostro', partita({ noi: 21, loro: 19, ultimo: 'noi' }), 'Set vostro! Chiudetelo.', 'festa', true],
    ['set loro', partita({ noi: 19, loro: 21, ultimo: 'loro' }), 'Set loro: chiudi e si riparte.', 'triste', true],
    ['il set dopo', partita({ chiusi: [{ us: 21, them: 19 }] }), 'Set 2: si riparte da zero.', 'saluta', false],
  ] as const)('%s', (_, p, testo, umore, notizia) => {
    expect(battuta(p)).toEqual({ testo, umore, notizia })
  })
})
