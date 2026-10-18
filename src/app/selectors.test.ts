// ============================================================================
// I selettori dell'app web (UX §5 F3, §6.1, F4): la destinazione di "Aggiungi
// partita" nei suoi 5 casi, la sezione *Adesso* della Home, il sottotitolo di
// Tornei che segue ciò che si vede (difetto #1), le date in italiano.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { makeData, makePartner, makeTournament, makeVenue } from '../test/factories'
import {
  compagnoDefault,
  dataBreve,
  dataRelativa,
  deriveAdesso,
  etichettaStagione,
  partitaDestinazione,
  sottotitoloTornei,
} from './selectors'

const OGGI = '2026-07-22'

describe('partitaDestinazione — i 5 casi di F3', () => {
  const vecchio = makeTournament({ id: 'vecchio', date: '2026-05-01', placement: '2°' })
  const recente = makeTournament({ id: 'recente', date: '2026-07-10', placement: '3°' })
  const inCorso = makeTournament({ id: 'incorso', date: '2026-07-12', placement: 'In corso' })
  const oggi = makeTournament({ id: 'oggi', date: OGGI, name: 'Rimini Open' })
  const altrui = makeTournament({ id: 'altrui', date: OGGI, shared: true })

  it('1. sul dettaglio di un torneo tuo → quello', () => {
    const data = makeData({ tournaments: [vecchio, oggi] })
    expect(partitaDestinazione(data, { name: 'torneo', id: 'vecchio' }, OGGI)?.id).toBe('vecchio')
  })

  it('1b. sul dettaglio di un torneo condiviso non vale: si scende ai casi dopo', () => {
    const data = makeData({ tournaments: [altrui, oggi] })
    expect(partitaDestinazione(data, { name: 'torneo', id: 'altrui' }, OGGI)?.id).toBe('oggi')
  })

  it('2. un tuo torneo di oggi', () => {
    const data = makeData({ tournaments: [vecchio, inCorso, oggi, altrui] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('oggi')
  })

  it('3. un tuo torneo «In corso» con data ≤ oggi, il più recente', () => {
    const data = makeData({ tournaments: [vecchio, recente, inCorso] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('incorso')
  })

  it('4. altrimenti il tuo torneo più recente', () => {
    const data = makeData({ tournaments: [vecchio, recente] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('recente')
  })

  it('5. nessun torneo tuo → nessuna destinazione', () => {
    expect(partitaDestinazione(makeData({ tournaments: [altrui] }), { name: 'home' }, OGGI)).toBeNull()
    expect(partitaDestinazione(makeData(), { name: 'home' }, OGGI)).toBeNull()
  })
})

describe('compagnoDefault (Q21)', () => {
  it('il compagno del tuo torneo più recente', () => {
    const giulia = makePartner({ id: 'p1', name: 'Giulia' })
    const marco = makePartner({ id: 'p2', name: 'Marco' })
    const data = makeData({
      partners: [giulia, marco],
      tournaments: [
        makeTournament({ date: '2026-05-01', partnerId: 'p1' }),
        makeTournament({ date: '2026-07-01', partnerId: 'p2' }),
      ],
    })
    expect(compagnoDefault(data)).toBe('p2')
  })

  it('nessuno senza tornei con un compagno', () => {
    expect(compagnoDefault(makeData({ tournaments: [makeTournament()] }))).toBe('')
  })
})

describe('deriveAdesso — la Home dice cosa serve adesso (§6.1)', () => {
  it('«Oggi giochi» esclude «Prossimo torneo»', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 'a', date: OGGI }), makeTournament({ id: 'b', date: '2026-08-01' })],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.oggi?.id).toBe('a')
    expect(a.prossimo).toBeNull()
  })

  it('senza torneo oggi c\'è il prossimo (anche condiviso)', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 'b', date: '2026-08-01', shared: true })] })
    expect(deriveAdesso(data, OGGI).prossimo?.id).toBe('b')
  })

  it('l\'ultimo risultato è il passato più recente con un piazzamento', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'x', date: '2026-07-01', placement: '1° 🏆' }),
        makeTournament({ id: 'y', date: '2026-06-01', placement: 'Gironi' }),
      ],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.ultimo?.id).toBe('x')
    expect(a.ultimo?.podio).toBe(true)
    expect(a.daChiudere).toBeNull()
  })

  it('se il passato più recente è «In corso» diventa «Com\'è andata?»', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'aperto', date: '2026-07-20', placement: 'In corso' }),
        makeTournament({ id: 'chiuso', date: '2026-07-01', placement: '2°' }),
      ],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.daChiudere?.id).toBe('aperto')
    expect(a.ultimo?.id).toBe('chiuso')
  })

  it('il luogo viene dal venue quando c\'è', () => {
    const v = makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })
    const data = makeData({ venues: [v], tournaments: [makeTournament({ date: OGGI, venueId: 'v1' })] })
    expect(deriveAdesso(data, OGGI).oggi?.place).toBe('Bagno 26 · Riccione')
  })
})

describe('sottotitoloTornei — conta ciò che si vede (difetto #1)', () => {
  it('singolare e plurale, podi letti dal badge della lib', () => {
    expect(sottotitoloTornei([{ badgeBg: '#FFF1EA' }])).toBe('1 torneo · 1 podio')
    expect(sottotitoloTornei([{ badgeBg: '#FFF1EA' }, { badgeBg: '#F2F0EC' }, { badgeBg: '#FFF1EA' }])).toBe('3 tornei · 2 podi')
    expect(sottotitoloTornei([])).toBe('0 tornei · 0 podi')
  })
})

describe('date e stagione in italiano (UX §12)', () => {
  it('«sab 12 lug»', () => {
    expect(dataBreve('2025-07-12')).toBe('sab 12 lug')
  })

  it('le relative vicine, l\'assoluta oltre la settimana', () => {
    expect(dataRelativa(OGGI, OGGI)).toBe('oggi')
    expect(dataRelativa('2026-07-23', OGGI)).toBe('domani')
    expect(dataRelativa('2026-07-21', OGGI)).toBe('ieri')
    expect(dataRelativa('2026-07-25', OGGI)).toBe('tra 3 giorni')
    expect(dataRelativa('2026-08-20', OGGI)).toBe('gio 20 ago')
  })

  it('l\'etichetta della stagione', () => {
    expect(etichettaStagione('2026')).toBe('Stagione 2026')
    expect(etichettaStagione('Sempre')).toBe('Sempre')
  })
})
