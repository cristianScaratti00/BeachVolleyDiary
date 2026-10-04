// ============================================================================
// Il tabellone (Gold/Silver/Bronze) accanto al piazzamento. È un dato solo
// descrittivo: si legge nel badge, nella story e nella ricerca, ma non entra
// nelle statistiche (podi, miglior piazzamento) e la RPC non lo restituisce —
// sul percorso server arriva dai dati client, come le foto.
//
// Funzioni pure: nessuna rete, nessun mock di Supabase (come da convenzione).
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  deriveTorneiList,
  deriveTorneiListServer,
  deriveTorneoDetail,
  deriveTorneoDetailServer,
  deriveStory,
  deriveDiary,
  deriveDiarySearch,
} from './derive'
import type { SvTorneoCard, SvTorneoDetail } from './serverviews'
import { makeData, makeTournament } from '../test/factories'

const svCard = (over: Partial<SvTorneoCard> = {}): SvTorneoCard => ({
  id: 'sv1', name: 'Summer Cup', category: 'Open', city: 'Riccione',
  date: '2026-06-15', format: '2vs2', placement: '2°', rank: 2, partner: null,
  match_count: 0, won: 0, lost: 0, win_pct: 0,
  ...over,
})

const svDetail = (over: Partial<SvTorneoDetail> = {}): SvTorneoDetail => ({
  id: 'sv1', name: 'Summer Cup', category: 'Open', city: 'Riccione',
  date: '2026-06-15', surface: 'Sabbia outdoor', placement: '2°', rank: 2, partner: null,
  played: 0, won: 0, lost: 0, win_pct: 0,
  sets_won: 0, sets_lost: 0, point_diff: 0,
  matches: [], photos: [],
  ...over,
})

describe('tabellone — badge sul percorso client', () => {
  it('la card della lista mostra piazzamento e tabellone', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: '2°', bracket: 'Silver' })] })
    const [card] = deriveTorneiList(data, 'Sempre').tornei
    expect(card.badge).toBe('2° · Silver')
  })

  it('un torneo senza tabellone ha il badge di sempre', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: '2°', bracket: null })] })
    expect(deriveTorneiList(data, 'Sempre').tornei[0].badge).toBe('2°')
  })

  it('il tabellone non cambia podi né miglior piazzamento', () => {
    // Un 1° nel Bronze resta un 1° per le statistiche: il tabellone è
    // descrittivo, la scala dei piazzamenti non lo conosce.
    const con = makeData({ tournaments: [makeTournament({ placement: '1° 🏆', bracket: 'Bronze' })] })
    const senza = makeData({ tournaments: [makeTournament({ placement: '1° 🏆', bracket: null })] })
    const a = deriveTorneiList(con, 'Sempre')
    const b = deriveTorneiList(senza, 'Sempre')
    expect(a.podi).toBe(b.podi)
    expect(a.bestPlacement).toBe(b.bestPlacement)
    expect(a.tornei[0].badgeBg).toBe(b.tornei[0].badgeBg)
  })

  it('il dettaglio torneo mostra il tabellone nel badge', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: 'Quarti', bracket: 'Gold' })] })
    expect(deriveTorneoDetail(data, 't1')?.badge).toBe('Quarti · Gold')
  })

  it('la voce di diario mostra il tabellone nel badge', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: '3°', bracket: 'Gold' })] })
    expect(deriveDiary(data)[0].badge).toBe('3° · Gold')
  })
})

describe('tabellone — percorso server (dati client)', () => {
  it('la lista prende il tabellone dal torneo con lo stesso id', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 'sv1', bracket: 'Gold' })] })
    const list = deriveTorneiListServer({ tornei: [svCard()], t_played: 1, podi: 1, best_rank: 2 }, data)
    expect(list.tornei[0].badge).toBe('2° · Gold')
  })

  it('senza il torneo nei dati client il badge resta il piazzamento della RPC', () => {
    const list = deriveTorneiListServer({ tornei: [svCard()], t_played: 1, podi: 1, best_rank: 2 }, makeData())
    expect(list.tornei[0].badge).toBe('2°')
  })

  it('il dettaglio prende il tabellone dai dati client', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 'sv1', bracket: 'Bronze' })] })
    expect(deriveTorneoDetailServer(svDetail(), data).badge).toBe('2° · Bronze')
  })
})

describe('tabellone — story e ricerca', () => {
  it('la story accoda il tabellone all\'etichetta del risultato', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: '1° 🏆', bracket: 'Silver' })] })
    expect(deriveStory(data, 't1')?.resultLabel).toBe('CAMPIONI · SILVER')
  })

  it('la story senza tabellone non cambia', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', placement: '1° 🏆', bracket: null })] })
    expect(deriveStory(data, 't1')?.resultLabel).toBe('CAMPIONI')
  })

  it('la ricerca del diario trova i tornei per tabellone', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'oro', bracket: 'Gold' }),
        makeTournament({ id: 'argento', bracket: 'Silver' }),
      ],
    })
    const found = deriveDiarySearch(deriveDiary(data), 'silver').results.map((r) => r.entry.id)
    expect(found).toEqual(['argento'])
  })
})
