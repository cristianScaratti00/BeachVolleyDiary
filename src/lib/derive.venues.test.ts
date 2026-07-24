// ============================================================================
// Il luogo come entità: etichette, chiave di raggruppamento, coordinate e
// storia ("quante volte ho giocato qui"). Funzioni pure — nessuna rete, nessun
// orologio, nessun componente da montare.
//
// Il caso che conta davvero è la STORIA MISTA: tornei con `venueId` accanto a
// tornei che hanno solo `city` (creati da un altro client o prima della
// migrazione). Devono finire nello stesso posto, non in due.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  venueOf,
  venueLabel,
  venueDisplay,
  venuePlace,
  venueKeyOf,
  venueOptions,
  venueHistory,
  venueHistoryLabel,
  parseLatLng,
  formatLatLng,
  mapUrl,
  deriveWrapped,
  deriveTorneoDetail,
  deriveDiary,
  makeWrappedRange,
} from './derive'
import { makeData, makeTournament, makeVenue, makeMatch, winSets } from '../test/factories'

const FULL_YEAR = makeWrappedRange('2026-01-01', '2026-12-31')

const statOf = (slide: { stats: { value: string; label: string }[] }, label: string) =>
  slide.stats.find((s) => s.label.startsWith(label))?.value

describe('venueLabel', () => {
  it('unisce nome e città: "Bagno 26 · Riccione"', () => {
    expect(venueLabel(makeVenue({ name: 'Bagno 26', city: 'Riccione' }))).toBe('Bagno 26 · Riccione')
  })

  it('non ripete la città quando coincide col nome (luoghi nati dal backfill)', () => {
    expect(venueLabel(makeVenue({ name: 'Riccione', city: 'riccione ' }))).toBe('Riccione')
  })

  it('regge un luogo senza città o senza nome', () => {
    expect(venueLabel(makeVenue({ name: 'Bagno 26', city: '' }))).toBe('Bagno 26')
    expect(venueLabel(makeVenue({ name: '', city: 'Riccione' }))).toBe('Riccione')
  })
})

describe('venueOf / venueDisplay / venuePlace', () => {
  const venue = makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })

  it('collega il torneo al suo luogo', () => {
    const data = makeData({ venues: [venue], tournaments: [makeTournament({ id: 't1', venueId: 'v1' })] })
    expect(venueOf(data, data.tournaments[0])?.name).toBe('Bagno 26')
  })

  it('nelle righe meta mostra il nome del luogo, non la città', () => {
    const data = makeData({ venues: [venue], tournaments: [makeTournament({ id: 't1', venueId: 'v1', city: 'Rimini' })] })
    expect(venueDisplay(data, data.tournaments[0])).toBe('Bagno 26')
  })

  it('in prosa ("a …") usa invece la città del luogo', () => {
    const data = makeData({ venues: [venue], tournaments: [makeTournament({ id: 't1', venueId: 'v1' })] })
    expect(venuePlace(data, data.tournaments[0])).toBe('Riccione')
  })

  it('senza luogo collegato ricade sullo snapshot testuale `city`', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', city: 'Jesolo' })] })
    expect(venueOf(data, data.tournaments[0])).toBeNull()
    expect(venueDisplay(data, data.tournaments[0])).toBe('Jesolo')
    expect(venuePlace(data, data.tournaments[0])).toBe('Jesolo')
  })

  it('un venueId che punta a un luogo non caricato non rompe niente', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', venueId: 'sparito', city: 'Jesolo' })] })
    expect(venueOf(data, data.tournaments[0])).toBeNull()
    expect(venueDisplay(data, data.tournaments[0])).toBe('Jesolo')
  })
})

describe('venueKeyOf', () => {
  it('il luogo collegato vince sulla città scritta a mano', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', city: 'Riccione' })],
      tournaments: [
        makeTournament({ id: 't1', venueId: 'v1', city: 'Riccione' }),
        makeTournament({ id: 't2', venueId: 'v1', city: 'RICCIONE (RN)' }),
      ],
    })
    const [a, b] = data.tournaments
    expect(venueKeyOf(data, a)).toBe(venueKeyOf(data, b))
  })

  it('senza luogo normalizza la città come fa il DB (city_key)', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', city: '  Rimini ' }), makeTournament({ id: 't2', city: 'RIMINI' })],
    })
    const [a, b] = data.tournaments
    expect(venueKeyOf(data, a)).toBe(venueKeyOf(data, b))
  })

  it('storia mista: un torneo senza luogo si aggancia all\'unico luogo della sua città', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })],
      tournaments: [
        makeTournament({ id: 't1', venueId: 'v1', city: 'Riccione' }),
        makeTournament({ id: 't2', venueId: null, city: 'riccione' }), // creato da mobile
      ],
    })
    const [a, b] = data.tournaments
    expect(venueKeyOf(data, b)).toBe(venueKeyOf(data, a))
  })

  it('con più luoghi nella stessa città non indovina: resta la chiave-città', () => {
    const data = makeData({
      venues: [
        makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' }),
        makeVenue({ id: 'v2', name: 'Bagno 40', city: 'Riccione' }),
      ],
      tournaments: [
        makeTournament({ id: 't1', venueId: 'v1', city: 'Riccione' }),
        makeTournament({ id: 't2', venueId: null, city: 'Riccione' }),
      ],
    })
    const [a, b] = data.tournaments
    expect(venueKeyOf(data, b)).not.toBe(venueKeyOf(data, a))
  })

  it('senza luogo né città la chiave è vuota (da scartare, non da raggruppare)', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', city: '  ' })] })
    expect(venueKeyOf(data, data.tournaments[0])).toBe('')
  })
})

describe('venueOptions', () => {
  it('espone le etichette complete in ordine alfabetico', () => {
    const data = makeData({
      venues: [
        makeVenue({ id: 'v1', name: 'Zanzibar', city: 'Cervia' }),
        makeVenue({ id: 'v2', name: 'Bagno 26', city: 'Riccione' }),
      ],
    })
    expect(venueOptions(data)).toEqual([
      { id: 'v2', name: 'Bagno 26 · Riccione' },
      { id: 'v1', name: 'Zanzibar · Cervia' },
    ])
  })
})

describe('parseLatLng', () => {
  it('legge "lat, lng" con la virgola', () => {
    expect(parseLatLng('44.00194, 12.65611')).toEqual({ lat: 44.00194, lng: 12.65611 })
  })

  it('accetta spazio, punto e virgola, parentesi e spazi di troppo', () => {
    expect(parseLatLng('44.00194 12.65611')).toEqual({ lat: 44.00194, lng: 12.65611 })
    expect(parseLatLng('44.00194;12.65611')).toEqual({ lat: 44.00194, lng: 12.65611 })
    expect(parseLatLng('  (44.00194,  12.65611) ')).toEqual({ lat: 44.00194, lng: 12.65611 })
  })

  it('regge le coordinate negative', () => {
    expect(parseLatLng('-33.86785, 151.20732')).toEqual({ lat: -33.86785, lng: 151.20732 })
  })

  it('rifiuta le coordinate fuori dai limiti geografici', () => {
    expect(parseLatLng('91, 12')).toBeNull()
    expect(parseLatLng('44, 181')).toBeNull()
  })

  it('rifiuta testo, numeri singoli e liste di tre', () => {
    expect(parseLatLng('Riccione')).toBeNull()
    expect(parseLatLng('44.00194')).toBeNull()
    expect(parseLatLng('44, 12, 9')).toBeNull()
    expect(parseLatLng('')).toBeNull()
  })
})

describe('formatLatLng / mapUrl', () => {
  it('arrotonda a cinque decimali, nel formato che il campo rilegge', () => {
    const s = formatLatLng(44.0019412, 12.6561178)
    expect(s).toBe('44.00194, 12.65612')
    expect(parseLatLng(s)).toEqual({ lat: 44.00194, lng: 12.65612 })
  })

  it('costruisce il link OpenStreetMap e resta null senza coordinate', () => {
    expect(mapUrl(44.00194, 12.65611)).toContain('mlat=44.00194&mlon=12.65611')
    expect(mapUrl(null, null)).toBeNull()
    expect(mapUrl(44.00194, null)).toBeNull()
  })
})

describe('venueHistory', () => {
  const data = makeData({
    venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })],
    tournaments: [
      makeTournament({ id: 't1', venueId: 'v1', date: '2026-03-01', placement: 'Gironi' }),
      makeTournament({ id: 't2', venueId: 'v1', date: '2026-05-01', placement: '2°' }),
      makeTournament({ id: 't3', venueId: 'v1', date: '2026-07-01', placement: '1° 🏆' }),
      makeTournament({ id: 't4', venueId: null, city: 'Jesolo', date: '2026-07-05' }),
    ],
  })
  const key = venueKeyOf(data, data.tournaments[0])

  it('conta i tornei e i podi del luogo', () => {
    const h = venueHistory(data, key)
    expect(h.played).toBe(3)
    expect(h.podi).toBe(2)
  })

  it('numera il torneo richiesto in ordine di data', () => {
    expect(venueHistory(data, key, 't1').ordinal).toBe(1)
    expect(venueHistory(data, key, 't3').ordinal).toBe(3)
  })

  it('un torneo di un altro luogo non entra nel conteggio', () => {
    expect(venueHistory(data, key, 't4').ordinal).toBe(0)
  })

  it('con chiave vuota non conta nulla', () => {
    expect(venueHistory(data, '')).toEqual({ played: 0, podi: 0, ordinal: 0 })
  })
})

describe('venueHistoryLabel', () => {
  it('unisce ordinale e podi, al singolare e al plurale', () => {
    expect(venueHistoryLabel({ played: 3, podi: 2, ordinal: 3 })).toBe('3° torneo qui · 2 podi')
    expect(venueHistoryLabel({ played: 2, podi: 1, ordinal: 2 })).toBe('2° torneo qui · 1 podio')
  })

  it('senza podi resta solo il conteggio', () => {
    expect(venueHistoryLabel({ played: 1, podi: 0, ordinal: 1 })).toBe('1° torneo qui')
  })

  it('senza un torneo di riferimento non c\'è niente da dire', () => {
    expect(venueHistoryLabel({ played: 4, podi: 1, ordinal: 0 })).toBeNull()
  })
})

describe('deriveTorneoDetail — luogo', () => {
  it('espone nome, città, coordinate, link mappa e storia del luogo', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: 44.00194, lng: 12.65611 })],
      tournaments: [
        makeTournament({ id: 't1', venueId: 'v1', date: '2026-03-01', placement: '1° 🏆' }),
        makeTournament({ id: 't2', venueId: 'v1', date: '2026-06-01', placement: 'Gironi' }),
      ],
    })
    const t = deriveTorneoDetail(data, 't2')
    expect(t?.venueName).toBe('Bagno 26')
    expect(t?.venueCity).toBe('Riccione')
    expect(t?.venueLat).toBe(44.00194)
    expect(t?.venueMapUrl).toContain('openstreetmap.org')
    expect(t?.venueHistory).toBe('2° torneo qui · 1 podio')
    expect(t?.meta).toContain('Bagno 26')
  })

  it('senza coordinate non c\'è link mappa, ma il luogo resta leggibile', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })],
      tournaments: [makeTournament({ id: 't1', venueId: 'v1' })],
    })
    const t = deriveTorneoDetail(data, 't1')
    expect(t?.venueMapUrl).toBeNull()
    expect(t?.venueName).toBe('Bagno 26')
    expect(t?.venueHistory).toBe('1° torneo qui')
  })

  it('torneo senza luogo: nessun separatore vuoto nella riga meta', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't1', city: '', partnerId: null })] })
    const t = deriveTorneoDetail(data, 't1')
    expect(t?.venueName).toBe('')
    expect(t?.meta).not.toContain('·  ·')
  })
})

describe('deriveDiary — luogo in prosa', () => {
  it('racconta la città del luogo, non il nome del bagno', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })],
      tournaments: [makeTournament({ id: 't1', venueId: 'v1', city: 'Rimini', placement: '2°' })],
    })
    expect(deriveDiary(data)[0].desc).toContain('a Riccione')
  })
})

describe('deriveWrapped — "Città diverse" conta i luoghi', () => {
  const threeMatches = (tid: string) => [
    makeMatch({ id: tid + 'm1', tournamentId: tid, sets: winSets() }),
    makeMatch({ id: tid + 'm2', tournamentId: tid, sets: winSets() }),
    makeMatch({ id: tid + 'm3', tournamentId: tid, sets: winSets() }),
  ]

  it('due grafie della stessa città valgono un posto solo', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', city: 'Rimini', date: '2026-03-01' }),
        makeTournament({ id: 't2', city: 'rimini ', date: '2026-05-01' }),
      ],
      matches: [...threeMatches('t1'), ...threeMatches('t2')],
    })
    const volume = deriveWrapped(data, FULL_YEAR).slides.find((s) => s.kind === 'volume')!
    expect(statOf(volume, 'Citt')).toBe('1')
  })

  it('due luoghi diversi nella stessa città restano due posti', () => {
    const data = makeData({
      venues: [
        makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' }),
        makeVenue({ id: 'v2', name: 'Bagno 40', city: 'Riccione' }),
      ],
      tournaments: [
        makeTournament({ id: 't1', venueId: 'v1', city: 'Riccione', date: '2026-03-01' }),
        makeTournament({ id: 't2', venueId: 'v2', city: 'Riccione', date: '2026-05-01' }),
      ],
      matches: [...threeMatches('t1'), ...threeMatches('t2')],
    })
    const volume = deriveWrapped(data, FULL_YEAR).slides.find((s) => s.kind === 'volume')!
    expect(statOf(volume, 'Citt')).toBe('2')
  })

  it('un torneo senza luogo né città non conta come posto', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', city: 'Rimini', date: '2026-03-01' }),
        makeTournament({ id: 't2', city: '', date: '2026-05-01' }),
      ],
      matches: [...threeMatches('t1'), ...threeMatches('t2')],
    })
    const volume = deriveWrapped(data, FULL_YEAR).slides.find((s) => s.kind === 'volume')!
    expect(statOf(volume, 'Citt')).toBe('1')
  })

  it('il miglior risultato mostra il nome del luogo', () => {
    const data = makeData({
      venues: [makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })],
      tournaments: [makeTournament({ id: 't1', venueId: 'v1', city: 'Riccione', date: '2026-03-10', placement: '1° 🏆' })],
      matches: threeMatches('t1'),
    })
    const podium = deriveWrapped(data, FULL_YEAR).slides.find((s) => s.kind === 'podium')!
    expect(podium.caption).toBe('Bagno 26 · 10 marzo 2026')
  })
})
