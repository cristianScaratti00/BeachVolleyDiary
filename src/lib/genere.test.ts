// ============================================================================
// Il genere dei tornei (lib/genere.ts): quali generi giochi, il filtro in
// vigore, i dati ristretti, la proposta (mai dal nome del compagno), i gruppi
// del riordino e le categorie.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  filtroGenere,
  genereProposto,
  genereRecente,
  generiGiocati,
  gruppiRiordino,
  perCategoria,
  perGenere,
  senzaGenere,
} from './genere'
import { lossSets, makeData, makeMatch, makePartner, makePhoto, makeTournament, winSets } from '../test/factories'

const luca = makePartner({ id: 'luca', name: 'Luca' })
const giulia = makePartner({ id: 'giulia', name: 'Giulia' })
const sara = makePartner({ id: 'sara', name: 'Sara' })
const OGGI = '2026-07-22'

function diario() {
  return makeData({
    partners: [luca, giulia, sara],
    tournaments: [
      makeTournament({ id: 'm1', date: '2026-07-10', partnerId: 'luca', gender: 'Maschile', category: 'Open', placement: '1° 🏆' }),
      makeTournament({ id: 'm2', date: '2026-06-10', partnerId: 'luca', gender: 'Maschile', category: 'Amatoriale', placement: 'Quarti' }),
      makeTournament({ id: 'x1', date: '2026-07-15', partnerId: 'giulia', gender: 'Misto', category: 'Amatoriale', placement: '2°' }),
      makeTournament({ id: 'n1', date: '2026-05-02', partnerId: 'sara', gender: null }),
      makeTournament({ id: 'f1', date: '2026-08-30', partnerId: 'luca', gender: 'Maschile' }),
      makeTournament({ id: 'sh', date: '2026-07-01', gender: 'Femminile', shared: true }),
    ],
    matches: [
      makeMatch({ id: 'a', tournamentId: 'm1', partnerId: 'luca', sets: winSets() }),
      makeMatch({ id: 'b', tournamentId: 'm1', partnerId: 'luca', sets: winSets() }),
      makeMatch({ id: 'c', tournamentId: 'm2', partnerId: 'luca', sets: lossSets() }),
      makeMatch({ id: 'd', tournamentId: 'x1', partnerId: 'giulia', sets: lossSets() }),
      makeMatch({ id: 'e', tournamentId: 'n1', partnerId: 'sara', sets: winSets() }),
    ],
    photos: [makePhoto({ id: 'p1', tournamentId: 'm1' }), makePhoto({ id: 'p2', tournamentId: 'x1' })],
  })
}

describe('quali generi, quale filtro', () => {
  it('i generi dei propri tornei, in ordine fisso (i condivisi non contano)', () => {
    expect(generiGiocati(diario())).toEqual(['Maschile', 'Misto'])
  })
  it('il genere più recente fino a oggi (i tornei futuri no)', () => {
    expect(genereRecente(diario(), OGGI)).toBe('Misto')
    expect(genereRecente(diario(), '2026-07-12')).toBe('Maschile')
  })
  it('il filtro: la scelta se è valida, altrimenti il più recente; «Tutti» resta «Tutti»', () => {
    const d = diario()
    expect(filtroGenere(d, null, OGGI)).toBe('Misto')
    expect(filtroGenere(d, 'Maschile', OGGI)).toBe('Maschile')
    expect(filtroGenere(d, 'Tutti', OGGI)).toBe('Tutti')
    expect(filtroGenere(d, 'Femminile', OGGI)).toBe('Misto')
  })
  it('con un genere solo (o nessuno) il filtro è sempre «Tutti»', () => {
    const uno = makeData({ tournaments: [makeTournament({ gender: 'Maschile' }), makeTournament({ gender: null })] })
    expect(filtroGenere(uno, 'Maschile', OGGI)).toBe('Tutti')
    expect(filtroGenere(makeData({ tournaments: [makeTournament()] }), null, OGGI)).toBe('Tutti')
  })
  it('i dati di un genere: tornei, partite e foto; «Tutti» non tocca niente', () => {
    const d = diario()
    const m = perGenere(d, 'Maschile')
    expect(m.tournaments.map((t) => t.id)).toEqual(['m1', 'm2', 'f1'])
    expect(m.matches.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(m.photos.map((p) => p.id)).toEqual(['p1'])
    expect(perGenere(d, 'Tutti')).toBe(d)
  })
})

describe('la proposta', () => {
  it('King → maschile, Queen → femminile, anche senza compagno', () => {
    expect(genereProposto(diario(), { category: 'King' })).toEqual({ genere: 'Maschile', motivo: 'È un King.' })
    expect(genereProposto(diario(), { category: 'Queen' })?.genere).toBe('Femminile')
  })
  it('dal compagno: il genere dei tornei già segnati con lui', () => {
    expect(genereProposto(diario(), { partnerId: 'giulia' })).toEqual({ genere: 'Misto', motivo: 'Come i tuoi tornei con Giulia.' })
    expect(genereProposto(diario(), { partnerId: 'luca' })?.genere).toBe('Maschile')
  })
  it('un compagno senza tornei segnati (o con generi diversi) non dà proposta se giochi più generi', () => {
    expect(genereProposto(diario(), { partnerId: 'sara' })).toBeNull()
    const misto = makeData({
      partners: [luca],
      tournaments: [makeTournament({ partnerId: 'luca', gender: 'Maschile' }), makeTournament({ partnerId: 'luca', gender: 'Misto' })],
    })
    expect(genereProposto(misto, { partnerId: 'luca' })).toBeNull()
  })
  it('chi gioca un genere solo se lo vede proposto per tutti', () => {
    const solo = makeData({ partners: [sara], tournaments: [makeTournament({ gender: 'Femminile' })] })
    expect(genereProposto(solo, { partnerId: 'sara' })).toEqual({ genere: 'Femminile', motivo: 'Giochi solo tornei di genere femminile.' })
  })
  it('«nuovo compagno» e nessun dato: nessuna proposta', () => {
    expect(genereProposto(makeData({ tournaments: [] }), { partnerId: 'new' })).toBeNull()
  })
})

describe('il riordino', () => {
  const vecchi = makeData({
    partners: [luca, giulia],
    tournaments: [
      makeTournament({ id: 'l1', name: 'Rimini Open', date: '2026-07-20', partnerId: 'luca' }),
      makeTournament({ id: 'l2', date: '2025-06-01', partnerId: 'luca' }),
      makeTournament({ id: 'l3', date: '2024-06-01', partnerId: 'luca' }),
      makeTournament({ id: 'g1', date: '2026-05-01', partnerId: 'giulia', gender: 'Misto' }),
      makeTournament({ id: 'g2', date: '2026-04-01', partnerId: 'giulia' }),
      makeTournament({ id: 'k1', date: '2026-07-12', category: 'King' }),
      makeTournament({ id: 'sh', shared: true }),
    ],
  })
  it('i tornei senza genere, per compagno, dal gruppo più grande; i King senza compagno hanno la loro proposta', () => {
    const g = gruppiRiordino(vecchi)
    expect(g.map((x) => [x.titolo, x.tornei.map((t) => t.id), x.proposta?.genere ?? null])).toEqual([
      ['Con Luca', ['l1', 'l2', 'l3'], null],
      ['Con Giulia', ['g2'], 'Misto'],
      ['Senza compagno', ['k1'], 'Maschile'],
    ])
    expect(g[0].sub).toBe('3 tornei · 2024–2026')
    expect(g[0].tornei[0]).toMatchObject({ nome: 'Rimini Open', meta: '20 lug 2026 · Open' })
  })
  it('quanti tornei propri senza genere', () => {
    expect(senzaGenere(vecchi)).toBe(5)
  })
})

describe('per categoria', () => {
  it('vittorie, tornei e podi per categoria nei dati del genere, dalla più giocata', () => {
    const m = perGenere(diario(), 'Maschile')
    expect(perCategoria(m, 'all', 'Sempre')).toEqual([
      { categoria: 'Open', winPct: 100, partite: 2, tornei: 2, podi: 1 },
      { categoria: 'Amatoriale', winPct: 0, partite: 1, tornei: 1, podi: 0 },
    ])
  })
  it('gli stessi filtri di stagione e compagno delle statistiche', () => {
    const m = perGenere(diario(), 'Maschile')
    expect(perCategoria(m, 'all', '2025')).toEqual([])
    expect(perCategoria(m, 'giulia', 'Sempre')).toEqual([])
  })
})
