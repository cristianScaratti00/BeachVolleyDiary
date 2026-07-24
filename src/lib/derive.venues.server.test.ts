// ============================================================================
// Il contratto fra le RPC (`tornei_list` / `torneo_detail`) e il client, dal
// lato del luogo. La migration `20260725120000_venues.sql` aggiunge la chiave
// `venue` accanto a `city`, che resta: questi test fissano le TRE forme di
// payload che i mapper devono reggere contemporaneamente.
//
//   1. `venue` valorizzato        → torneo creato dopo i luoghi
//   2. `venue: null`              → torneo senza luogo (vale lo snapshot city)
//   3. chiave `venue` ASSENTE     → RPC non ancora aggiornata sul progetto
//
// La terza è quella che protegge davvero: `SvVenue` è opzionale proprio perché
// il client viene deployato senza sapere se la migration è già stata applicata.
// Se questi test passano, un deploy in anticipo degrada sulla città invece di
// mostrare righe vuote.
//
// Funzioni pure: nessuna rete, nessun mock di Supabase (come da convenzione).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { deriveTorneiListServer, deriveTorneoDetailServer } from './derive'
import type { SvTorneoCard, SvTorneiList, SvTorneoDetail } from './serverviews'
import { makeData, makeTournament, makeVenue } from '../test/factories'

// Card grezza come la emette `tornei_list`. Il default è la forma 3 (nessuna
// chiave `venue`): i test che vogliono un luogo lo passano esplicitamente.
function svCard(over: Partial<SvTorneoCard> = {}): SvTorneoCard {
  return {
    id: 'sv1', name: 'Summer Cup', category: 'Open', city: 'Riccione',
    date: '2026-06-15', format: '2vs2', placement: 'Gironi', rank: 8, partner: null,
    match_count: 3, won: 2, lost: 1, win_pct: 67,
    ...over,
  }
}

function svList(tornei: SvTorneoCard[]): SvTorneiList {
  return { tornei, t_played: tornei.length, podi: 0, best_rank: 8 }
}

function svDetail(over: Partial<SvTorneoDetail> = {}): SvTorneoDetail {
  return {
    id: 'sv1', name: 'Summer Cup', category: 'Open', city: 'Riccione',
    date: '2026-06-15', surface: 'Sabbia outdoor', placement: 'Gironi', rank: 8, partner: null,
    played: 3, won: 2, lost: 1, win_pct: 67,
    sets_won: 4, sets_lost: 2, point_diff: 12,
    matches: [], photos: [],
    ...over,
  }
}

describe('deriveTorneiListServer — il luogo nella riga meta', () => {
  it('mostra il nome del luogo quando la RPC lo manda', () => {
    const [card] = deriveTorneiListServer(svList([
      svCard({ venue: { id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: null, lng: null } }),
    ])).tornei
    expect(card.meta).toContain('Bagno 26')
  })

  it('ricade sulla città quando il torneo non ha luogo (venue: null)', () => {
    const [card] = deriveTorneiListServer(svList([svCard({ venue: null })])).tornei
    expect(card.meta).toContain('Riccione')
    expect(card.meta).not.toContain('null')
  })

  it('ricade sulla città anche se la RPC non conosce ancora `venue`', () => {
    // Forma 3: payload di una `tornei_list` antecedente alla migration.
    const [card] = deriveTorneiListServer(svList([svCard()])).tornei
    expect(card.meta).toContain('Riccione')
  })

  it('non lascia un separatore vuoto quando non c\'è né luogo né città', () => {
    const [card] = deriveTorneiListServer(svList([svCard({ city: '', venue: null })])).tornei
    expect(card.meta).not.toContain('·  ·')
    expect(card.meta).toBe('15 Giu · 2vs2')
  })

  it('il nome del luogo vince sulla città anche quando differiscono', () => {
    // È il caso di un torneo il cui snapshot `city` è rimasto indietro rispetto
    // al luogo rinominato: comanda il dato vivo, non lo snapshot.
    const [card] = deriveTorneiListServer(svList([
      svCard({ city: 'vecchia grafia', venue: { id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: null, lng: null } }),
    ])).tornei
    expect(card.meta).toContain('Bagno 26')
    expect(card.meta).not.toContain('vecchia grafia')
  })
})

describe('deriveTorneoDetailServer — luogo, mappa e storia', () => {
  it('prende nome, città e coordinate dal payload `venue`', () => {
    const d = deriveTorneoDetailServer(
      svDetail({ venue: { id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: 44.00194, lng: 12.65611 } }),
      makeData(),
    )
    expect(d.venueName).toBe('Bagno 26')
    expect(d.venueCity).toBe('Riccione')
    expect(d.venueLat).toBe(44.00194)
    expect(d.venueLng).toBe(12.65611)
    expect(d.venueMapUrl).toContain('44.00194')
  })

  it('senza coordinate non produce un link alla mappa', () => {
    const d = deriveTorneoDetailServer(
      svDetail({ venue: { id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: null, lng: null } }),
      makeData(),
    )
    expect(d.venueLat).toBeNull()
    expect(d.venueMapUrl).toBeNull()
  })

  it('senza luogo ricade sulla città, e la città fa anche da "dove"', () => {
    const d = deriveTorneoDetailServer(svDetail({ venue: null }), makeData())
    expect(d.venueName).toBe('Riccione')
    expect(d.venueCity).toBe('Riccione')
    expect(d.venueMapUrl).toBeNull()
  })

  it('regge una RPC che non manda ancora `venue`', () => {
    const d = deriveTorneoDetailServer(svDetail(), makeData())
    expect(d.venueName).toBe('Riccione')
    expect(d.venueMapUrl).toBeNull()
  })

  it('la storia "quante volte ho giocato qui" arriva dai dati client, non dalla RPC', () => {
    // La RPC aggrega un torneo alla volta e non sa nulla degli altri: il conteggio
    // deve venire da DiaryData, dove i tornei dello stesso luogo si vedono tutti.
    const venue = makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })
    const data = makeData({
      venues: [venue],
      tournaments: [
        makeTournament({ id: 'sv1', date: '2026-06-15', venueId: 'v1', placement: 'Gironi' }),
        makeTournament({ id: 'old', date: '2025-06-15', venueId: 'v1', placement: '1° 🏆' }),
      ],
    })
    const d = deriveTorneoDetailServer(
      svDetail({ venue: { id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: null, lng: null } }),
      data,
    )
    expect(d.venueHistory).toBe('2° torneo qui · 1 podio')
  })

  it('nessuna storia se il torneo non è (ancora) nei dati client', () => {
    const d = deriveTorneoDetailServer(svDetail({ venue: null }), makeData())
    expect(d.venueHistory).toBeNull()
  })
})
