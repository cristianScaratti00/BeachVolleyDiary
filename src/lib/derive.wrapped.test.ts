// ============================================================================
// Beach Wrapped — matematica del recap di stagione. `deriveWrapped` è puro e
// client-side: compone i selettori esistenti (computeStats/streakOf/
// placementRank) su un intervallo di date e restituisce un mazzo di slide
// tipizzate. Qui si verificano la soglia dati, quali slide compaiono e con quali
// valori, il filtro per intervallo/compagno e gli helper di range.
//
// Tutte funzioni pure con `today` iniettabile (TODAY): nessun orologio, nessun
// React, i test non scadono con il tempo.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  deriveWrapped,
  makeWrappedRange,
  wrappedRangeLabel,
  wrappedRangeForYear,
  WRAPPED_MIN_MATCHES,
} from './derive'
import type { WrappedData, WrappedSlideKind } from './derive'
import type { DiaryData, SetScore } from './models'
import {
  makeData,
  makeTournament,
  makeMatch,
  makePartner,
  makePhoto,
  winSets,
  lossSets,
  TODAY,
} from '../test/factories'

// Intervallo di riferimento: l'anno solare 2026 (etichetta "Stagione 2026").
const FULL_YEAR = makeWrappedRange('2026-01-01', '2026-12-31')

const kinds = (w: WrappedData): WrappedSlideKind[] => w.slides.map((s) => s.kind)
const slideOf = (w: WrappedData, kind: WrappedSlideKind) => {
  const s = w.slides.find((x) => x.kind === kind)
  if (!s) throw new Error(`slide "${kind}" assente: ${kinds(w).join(', ')}`)
  return s
}

// Una stagione minima: un solo torneo (t1, in FULL_YEAR) e le partite indicate.
function seasonWith(setsList: SetScore[][]): DiaryData {
  return makeData({
    tournaments: [makeTournament({ id: 't1', date: '2026-06-15' })],
    matches: setsList.map((sets, i) => makeMatch({ id: `m${i}`, tournamentId: 't1', sets })),
  })
}

// Una stagione ricca: due tornei, due compagni, un rivale ricorrente — abbastanza
// da attivare ogni slide condizionale del mazzo.
function seasonRich(): DiaryData {
  return makeData({
    partners: [makePartner({ id: 'p1', name: 'Marco' }), makePartner({ id: 'p2', name: 'Luca' })],
    tournaments: [
      makeTournament({ id: 't1', name: 'Rimini Cup', city: 'Rimini', date: '2026-03-10', placement: '1° 🏆', emoji: '🏆', partnerId: 'p1' }),
      makeTournament({ id: 't2', name: 'Riccione Open', city: 'Riccione', date: '2026-05-20', placement: 'Quarti', partnerId: 'p2' }),
    ],
    matches: [
      // t1 (mar): due vittorie con p1 contro lo stesso rivale
      makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', opponents: 'Rossi/Neri', sets: winSets() }),
      makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', opponents: 'Rossi/Neri', sets: winSets() }),
      // t2 (mag): con p2, una vinta e una persa contro lo stesso rivale
      makeMatch({ id: 'm3', tournamentId: 't2', partnerId: 'p2', opponents: 'Verdi/Blu', sets: winSets() }),
      makeMatch({ id: 'm4', tournamentId: 't2', partnerId: 'p2', opponents: 'Verdi/Blu', sets: lossSets() }),
    ],
  })
}

describe('wrappedRangeLabel', () => {
  it('un anno solare intero diventa "Stagione YYYY"', () => {
    expect(wrappedRangeLabel('2026-01-01', '2026-12-31')).toBe('Stagione 2026')
  })

  it('un intervallo parziale mostra le due date compatte', () => {
    expect(wrappedRangeLabel('2026-03-10', '2026-07-05')).toBe('10 mar 2026 – 5 lug 2026')
  })

  it('stesso capodanno ma non tutto l’anno resta un intervallo esplicito', () => {
    expect(wrappedRangeLabel('2026-01-01', '2026-06-30')).toBe('1 gen 2026 – 30 giu 2026')
  })
})

describe('makeWrappedRange', () => {
  it('riordina gli estremi invertiti', () => {
    const r = makeWrappedRange('2026-07-05', '2026-03-10')
    expect(r.from).toBe('2026-03-10')
    expect(r.to).toBe('2026-07-05')
  })

  it('calcola l’etichetta sull’intervallo già normalizzato', () => {
    expect(makeWrappedRange('2026-12-31', '2026-01-01').label).toBe('Stagione 2026')
  })
})

describe('wrappedRangeForYear', () => {
  it('un anno specifico copre l’anno solare', () => {
    expect(wrappedRangeForYear(makeData(), '2026', TODAY)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
      label: 'Stagione 2026',
    })
  })

  it('"Sempre" va dal primo torneo a oggi', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', date: '2024-05-01' }),
        makeTournament({ id: 't2', date: '2026-06-01' }),
      ],
    })
    expect(wrappedRangeForYear(data, 'Sempre', TODAY)).toEqual({
      from: '2024-05-01',
      to: TODAY,
      label: 'Sempre',
    })
  })

  it('"Sempre" senza tornei ricade sull’anno corrente', () => {
    const r = wrappedRangeForYear(makeData(), 'Sempre', TODAY)
    expect(r.from).toBe('2026-01-01')
    expect(r.to).toBe(TODAY)
  })
})

describe('deriveWrapped — soglia dati', () => {
  it('senza partite è sotto soglia e mostra solo intro e outro', () => {
    const w = deriveWrapped(makeData(), FULL_YEAR)
    expect(w.hasEnoughData).toBe(false)
    expect(w.played).toBe(0)
    expect(kinds(w)).toEqual(['intro', 'outro'])
  })

  it('con meno di WRAPPED_MIN_MATCHES partite resta sotto soglia', () => {
    const w = deriveWrapped(seasonWith([winSets(), winSets()]), FULL_YEAR)
    expect(w.played).toBe(2)
    expect(w.hasEnoughData).toBe(false)
  })

  it('raggiunta la soglia il recap è valido', () => {
    const w = deriveWrapped(seasonWith([winSets(), winSets(), lossSets()]), FULL_YEAR)
    expect(w.played).toBe(WRAPPED_MIN_MATCHES)
    expect(w.hasEnoughData).toBe(true)
  })
})

describe('deriveWrapped — intro', () => {
  it('riassume partite e tornei del periodo, marchio come sottotitolo', () => {
    const intro = slideOf(deriveWrapped(seasonRich(), FULL_YEAR), 'intro')
    expect(intro.headline).toBe('Stagione 2026')
    expect(intro.title).toBe('Beach Volley Diary')
    expect(intro.caption).toBe('4 partite · 2 tornei')
  })

  it('con un compagno filtrato lo nomina nel sottotitolo', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' })],
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01', partnerId: 'p1' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', partnerId: 'p1', sets: lossSets() }),
      ],
    })
    const intro = slideOf(deriveWrapped(data, FULL_YEAR, 'p1'), 'intro')
    expect(intro.title).toBe('in coppia con Marco')
  })

  it('usa come copertina la prima foto (con URL) di un torneo nel periodo', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', sets: winSets() }),
      ],
      photos: [
        makePhoto({ id: 'f1', tournamentId: 't1', url: null }), // vecchio segnaposto: ignorato
        makePhoto({ id: 'f2', tournamentId: 't1', url: 'https://cdn.example/cover.jpg' }),
      ],
    })
    const intro = slideOf(deriveWrapped(data, FULL_YEAR), 'intro')
    expect(intro.photoUrl).toBe('https://cdn.example/cover.jpg')
  })
})

describe('deriveWrapped — vittorie', () => {
  it('conta vittorie, win rate e record', () => {
    // 3 vinte su 4
    const wins = slideOf(deriveWrapped(seasonWith([winSets(), winSets(), winSets(), lossSets()]), FULL_YEAR), 'wins')
    expect(wins.headline).toBe('3')
    expect(wins.title).toBe('partite vinte')
    expect(wins.caption).toBe('su 4 giocate')
    expect(wins.stats).toEqual([
      { value: '75%', label: 'Win rate' },
      { value: '3–1', label: 'Record' },
    ])
  })
})

describe('deriveWrapped — punti', () => {
  it('somma punti fatti/subiti, differenziale e media', () => {
    // 2 vittorie 21-15 (pf 42, pa 30) + 1 sconfitta 15-21 (pf 30, pa 42)
    const pts = slideOf(deriveWrapped(seasonWith([winSets(21, 15), winSets(21, 15), lossSets(15, 21)]), FULL_YEAR), 'points')
    expect(pts.headline).toBe('114') // 42+42+30
    expect(pts.caption).toBe('differenziale +12') // 114 - 102
    expect(pts.stats).toEqual([
      { value: '102', label: 'Subiti' },
      { value: '+12', label: 'Diff.' },
      { value: '38', label: 'Media a partita' }, // round(114/3)
    ])
  })
})

describe('deriveWrapped — striscia', () => {
  const streakSeason = (results: SetScore[][]): DiaryData =>
    makeData({
      tournaments: results.map((_, i) => makeTournament({ id: `t${i}`, date: `2026-0${i + 1}-01` })),
      matches: results.map((sets, i) => makeMatch({ id: `m${i}`, tournamentId: `t${i}`, sets })),
    })

  it('compare con almeno 2 vittorie di fila e ne mostra la lunghezza', () => {
    // vinta, vinta, persa (date crescenti) → striscia 2
    const streak = slideOf(deriveWrapped(streakSeason([winSets(), winSets(), lossSets()]), FULL_YEAR), 'streak')
    expect(streak.headline).toBe('2')
  })

  it('non compare se non ci sono 2 vittorie consecutive', () => {
    // vinta, persa, vinta → striscia massima 1
    expect(kinds(deriveWrapped(streakSeason([winSets(), lossSets(), winSets()]), FULL_YEAR))).not.toContain('streak')
  })
})

describe('deriveWrapped — miglior compagno', () => {
  it('sceglie il win% più alto (min 2 partite) e ne mostra i numeri', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' }), makePartner({ id: 'p2', name: 'Luca' })],
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: winSets() }), // p1: 2/2 = 100%
        makeMatch({ id: 'm3', tournamentId: 't1', partnerId: 'p2', sets: winSets() }),
        makeMatch({ id: 'm4', tournamentId: 't1', partnerId: 'p2', sets: lossSets() }), // p2: 1/2 = 50%
      ],
    })
    const partner = slideOf(deriveWrapped(data, FULL_YEAR), 'partner')
    expect(partner.headline).toBe('Marco')
    expect(partner.title).toBe('100% insieme')
    expect(partner.caption).toBe('2 vinte su 2 partite')
  })

  it('a parità di win% vince chi ha giocato di più', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' }), makePartner({ id: 'p2', name: 'Luca' })],
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: winSets() }), // p1: 2/2 = 100%
        makeMatch({ id: 'm3', tournamentId: 't1', partnerId: 'p2', sets: winSets() }),
        makeMatch({ id: 'm4', tournamentId: 't1', partnerId: 'p2', sets: winSets() }),
        makeMatch({ id: 'm5', tournamentId: 't1', partnerId: 'p2', sets: winSets() }), // p2: 3/3 = 100%
      ],
    })
    expect(slideOf(deriveWrapped(data, FULL_YEAR), 'partner').headline).toBe('Luca')
  })

  it('ignora i compagni con meno di 2 partite', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' }), makePartner({ id: 'p2', name: 'Luca' })],
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: lossSets() }), // p1: 2 partite
        makeMatch({ id: 'm3', tournamentId: 't1', partnerId: 'p2', sets: winSets() }), // p2: 1 sola partita
      ],
    })
    expect(slideOf(deriveWrapped(data, FULL_YEAR), 'partner').headline).toBe('Marco')
  })

  it('con un compagno già filtrato non mostra la slide "miglior compagno"', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' })],
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01', partnerId: 'p1' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', partnerId: 'p1', sets: lossSets() }),
      ],
    })
    const w = deriveWrapped(data, FULL_YEAR, 'p1')
    expect(w.partnerName).toBe('Marco')
    expect(kinds(w)).not.toContain('partner')
  })
})

describe('deriveWrapped — rivale', () => {
  it('sceglie l’avversario più affrontato con il bilancio', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', opponents: 'Rossi/Neri', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', opponents: 'Rossi/Neri', sets: lossSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', opponents: 'Verdi/Blu', sets: winSets() }),
      ],
    })
    const rival = slideOf(deriveWrapped(data, FULL_YEAR), 'rival')
    expect(rival.headline).toBe('Rossi/Neri')
    expect(rival.title).toBe('2 sfide')
    expect(rival.caption).toBe('1 vinte · 1 perse')
  })

  it('non compare se nessuno è stato affrontato almeno 2 volte', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', opponents: 'A/B', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', opponents: 'C/D', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', opponents: 'E/F', sets: winSets() }),
      ],
    })
    expect(kinds(deriveWrapped(data, FULL_YEAR))).not.toContain('rival')
  })

  it('ignora gli avversari vuoti o solo spazi', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', opponents: '', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', opponents: '   ', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', opponents: '', sets: lossSets() }),
      ],
    })
    expect(kinds(deriveWrapped(data, FULL_YEAR))).not.toContain('rival')
  })
})

describe('deriveWrapped — miglior risultato', () => {
  it('mostra il piazzamento migliore con nome, città e data estesa', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', name: 'Rimini Cup', city: 'Rimini', date: '2026-03-10', placement: '1° 🏆' }),
        makeTournament({ id: 't2', name: 'Riccione Open', city: 'Riccione', date: '2026-05-20', placement: 'Quarti' }),
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't2', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't2', sets: lossSets() }),
      ],
    })
    const podium = slideOf(deriveWrapped(data, FULL_YEAR), 'podium')
    expect(podium.headline).toBe('CAMPIONI')
    expect(podium.title).toBe('Rimini Cup')
    expect(podium.caption).toBe('Rimini · 10 marzo 2026')
  })

  it('a parità di piazzamento sceglie il torneo più recente', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', name: 'Vecchio', date: '2026-03-10', placement: '1° 🏆' }),
        makeTournament({ id: 't2', name: 'Recente', date: '2026-06-10', placement: '1° 🏆' }),
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't2', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't2', sets: winSets() }),
      ],
    })
    expect(slideOf(deriveWrapped(data, FULL_YEAR), 'podium').title).toBe('Recente')
  })

  it('senza piazzamenti significativi (solo "In corso") non compare', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01', placement: 'In corso' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't1', sets: winSets() }),
      ],
    })
    expect(kinds(deriveWrapped(data, FULL_YEAR))).not.toContain('podium')
  })
})

describe('deriveWrapped — volume e curiosità', () => {
  it('volume: tornei, partite, set, podi e città diverse', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', city: 'Rimini', date: '2026-03-01', placement: '1° 🏆' }),
        makeTournament({ id: 't2', city: 'Riccione', date: '2026-05-01', placement: '3°' }),
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't2', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't2', sets: lossSets() }),
      ],
    })
    const volume = slideOf(deriveWrapped(data, FULL_YEAR), 'volume')
    expect(volume.headline).toBe('2') // tornei
    expect(volume.stats).toEqual([
      { value: '3', label: 'Partite' },
      { value: '6', label: 'Set giocati' }, // 3 partite × 2 set
      { value: '2', label: 'Podi' },
      { value: '2', label: 'Città diverse' },
    ])
  })

  it('curiosità: % set vinti, distribuzione e miglior scarto in vittoria', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01' })],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: [{ us: 21, them: 10 }, { us: 21, them: 12 }] }), // 2-0, scarto +20
        makeMatch({ id: 'm2', tournamentId: 't1', sets: [{ us: 15, them: 21 }, { us: 21, them: 18 }, { us: 15, them: 12 }] }), // rimonta 2-1
        makeMatch({ id: 'm3', tournamentId: 't1', sets: [{ us: 10, them: 21 }, { us: 12, them: 21 }] }), // 0-2
      ],
    })
    const fun = slideOf(deriveWrapped(data, FULL_YEAR), 'funfacts')
    expect(fun.headline).toBe('57%') // set vinti 4 su 7 → round(57.1)
    const byLabel = Object.fromEntries(fun.stats.map((s) => [s.label, s.value]))
    expect(byLabel['2-0 netti']).toBe('1')
    expect(byLabel['Rimonte 2-1']).toBe('1')
    expect(byLabel['Miglior scarto']).toBe('+20')
  })
})

describe('deriveWrapped — intervallo e composizione', () => {
  it('esclude partite e tornei fuori dall’intervallo', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'in', date: '2026-06-15' }),
        makeTournament({ id: 'out', date: '2025-06-15' }),
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 'in', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 'in', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 'in', sets: winSets() }),
        makeMatch({ id: 'mo', tournamentId: 'out', sets: lossSets() }), // 2025: esclusa
      ],
    })
    const w = deriveWrapped(data, FULL_YEAR)
    expect(w.played).toBe(3)
    expect(slideOf(w, 'wins').headline).toBe('3')
  })

  it('il filtro compagno restringe anche i tornei considerati', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Marco' }), makePartner({ id: 'p2', name: 'Luca' })],
      tournaments: [
        makeTournament({ id: 't1', date: '2026-03-01' }), // giocato con p1
        makeTournament({ id: 't2', date: '2026-05-01' }), // giocato con p2
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't2', partnerId: 'p2', sets: winSets() }),
      ],
    })
    const w = deriveWrapped(data, FULL_YEAR, 'p1')
    expect(w.played).toBe(2)
    expect(slideOf(w, 'volume').headline).toBe('1') // solo il torneo giocato con p1
  })

  it('un intervallo "Sempre" multi-anno include tutte le stagioni', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', date: '2024-06-01' }),
        makeTournament({ id: 't2', date: '2026-06-01' }),
      ],
      matches: [
        makeMatch({ id: 'm1', tournamentId: 't1', sets: winSets() }),
        makeMatch({ id: 'm2', tournamentId: 't2', sets: winSets() }),
        makeMatch({ id: 'm3', tournamentId: 't2', sets: lossSets() }),
      ],
    })
    const range = wrappedRangeForYear(data, 'Sempre', TODAY) // 2024-06-01 → 2026-07-22
    const w = deriveWrapped(data, range)
    expect(w.played).toBe(3)
    expect(w.range.label).toBe('Sempre')
  })

  it('genera il mazzo completo nell’ordine narrativo atteso', () => {
    expect(kinds(deriveWrapped(seasonRich(), FULL_YEAR))).toEqual([
      'intro', 'wins', 'streak', 'partner', 'points', 'podium', 'volume', 'rival', 'funfacts', 'outro',
    ])
  })

  it('apre sempre con intro e chiude sempre con outro', () => {
    const k = kinds(deriveWrapped(seasonWith([winSets(), winSets(), winSets()]), FULL_YEAR))
    expect(k[0]).toBe('intro')
    expect(k[k.length - 1]).toBe('outro')
  })

  it('ogni slide ha eyebrow e headline non vuoti', () => {
    for (const s of deriveWrapped(seasonRich(), FULL_YEAR).slides) {
      expect(s.eyebrow.length).toBeGreaterThan(0)
      expect(s.headline.length).toBeGreaterThan(0)
    }
  })

  it('deriva lo slug dall’etichetta dell’intervallo', () => {
    const w = deriveWrapped(seasonWith([winSets(), winSets(), winSets()]), FULL_YEAR)
    expect(w.slug).toBe('beach-wrapped-stagione-2026')
  })

  it('non muta i dati ricevuti', () => {
    const data = seasonRich()
    const snapshot = JSON.parse(JSON.stringify(data))
    deriveWrapped(data, FULL_YEAR)
    expect(data).toEqual(snapshot)
  })
})
