// ============================================================================
// Campionato per Società: le rotte (/campionato, /campionato/:id) e dove va
// «Partita» nel ＋ quando ci sono anche le tappe (destinazionePartita).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { analyticsPath, parseLocation, routeHasTabBar, routeHref, routeKey, routeParent, routeTab, routeTitle } from './routes'
import { destinazionePartita } from './selectors'
import type { CampionatoData, Tappa } from '../lib/campionato'
import { makeData, makeTournament } from '../test/factories'

const ID = '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b'

describe('rotte del Campionato', () => {
  it('andata e ritorno', () => {
    expect(parseLocation('/campionato', '')).toEqual({ name: 'campionato' })
    expect(parseLocation(`/campionato/${ID.toUpperCase()}`, '')).toEqual({ name: 'tappa', id: ID })
    expect(parseLocation('/campionato', `?s=${ID}`)).toEqual({ name: 'campionato', s: ID })
    expect(routeHref({ name: 'campionato' })).toBe('/campionato')
    expect(routeHref({ name: 'campionato', s: ID })).toBe(`/campionato?s=${ID}`)
    expect(routeHref({ name: 'tappa', id: ID })).toBe(`/campionato/${ID}`)
  })
  it('un id che non è un UUID è «non trovato»; una ?s= storta si ignora', () => {
    expect(parseLocation('/campionato/milano', '')).toEqual({ name: 'nonTrovato' })
    expect(parseLocation('/campionato', '?s=2026')).toEqual({ name: 'campionato' })
  })
  it('stanno nella tab Tornei; la pagina ha la TabBar, il dettaglio la sua barra', () => {
    expect(routeTab({ name: 'campionato' })).toBe('tornei')
    expect(routeTab({ name: 'tappa', id: ID })).toBe('tornei')
    expect(routeHasTabBar({ name: 'campionato' })).toBe(true)
    expect(routeHasTabBar({ name: 'tappa', id: ID })).toBe(false)
  })
  it('indietro senza storia: dalla tappa al Campionato, dal Campionato a Tornei', () => {
    expect(routeParent({ name: 'tappa', id: ID })).toEqual({ name: 'campionato' })
    expect(routeParent({ name: 'campionato' }, 'mappa')).toEqual({ name: 'tornei', vista: 'mappa' })
  })
  it('titoli, chiavi e analytics', () => {
    expect(routeTitle({ name: 'campionato' })).toBe('Campionato per Società · Beach Diary')
    expect(routeTitle({ name: 'tappa', id: ID }, 'Tappa Silver · Milano')).toBe('Tappa Silver · Milano · Beach Diary')
    expect(routeKey({ name: 'tappa', id: ID })).toBe(`tappa:${ID}`)
    expect(analyticsPath(`/campionato/${ID}`)).toBe('/campionato/[id]')
  })
})

// ------------------------------------------------- «Partita» nel ＋
const tappa = (o: Partial<Tappa>): Tappa => ({
  id: 't', seasonId: 'i', kind: 'Tappa', category: 'Silver', date: '2026-11-15', city: 'Milano', organizer: '', partnerId: null,
  partnerOtherClub: false, setPoints: 15, placement: 3, teams: null, pairPoints: null, countsForClub: true, clubPoints: null, note: '', ...o,
})
const camp = (...tappe: Tappa[]): CampionatoData => ({ iscrizioni: [], tappe, partite: [] })
const OGGI = '2026-11-21'

describe('dove va «Partita» con il Campionato', () => {
  const estate = makeTournament({ id: 'estate', name: 'Rimini Open', date: '2026-07-20', placement: '1° 🏆' })
  const diario = makeData({ tournaments: [estate] })

  it("d'inverno la tappa più recente vince sul torneo d'estate", () => {
    expect(destinazionePartita(diario, camp(tappa({ id: 'milano' })), { name: 'home' }, OGGI)).toEqual({ tipo: 'tappa', t: expect.objectContaining({ id: 'milano' }) })
  })
  it('sul dettaglio di una tappa: quella', () => {
    const c = camp(tappa({ id: 'vecchia', date: '2026-10-25' }), tappa({ id: 'nuova' }))
    expect(destinazionePartita(diario, c, { name: 'tappa', id: 'vecchia' }, OGGI)).toMatchObject({ tipo: 'tappa', t: { id: 'vecchia' } })
  })
  it('sul dettaglio di un torneo, o con un torneo di oggi: il torneo', () => {
    const c = camp(tappa({ id: 'milano', date: OGGI }))
    expect(destinazionePartita(diario, c, { name: 'torneo', id: 'estate' }, OGGI)).toMatchObject({ tipo: 'torneo', t: { id: 'estate' } })
    const oggi = makeData({ tournaments: [makeTournament({ id: 'oggi', date: OGGI })] })
    expect(destinazionePartita(oggi, c, { name: 'home' }, OGGI)).toMatchObject({ tipo: 'torneo', t: { id: 'oggi' } })
  })
  it('un torneo più recente della tappa resta la destinazione; uno nel futuro no', () => {
    const dopo = makeData({ tournaments: [makeTournament({ id: 'dopo', date: '2026-11-18' })] })
    expect(destinazionePartita(dopo, camp(tappa({})), { name: 'home' }, OGGI)).toMatchObject({ tipo: 'torneo', t: { id: 'dopo' } })
    const futuro = makeData({ tournaments: [makeTournament({ id: 'futuro', date: '2027-06-01' })] })
    expect(destinazionePartita(futuro, camp(tappa({ id: 'milano' })), { name: 'home' }, OGGI)).toMatchObject({ tipo: 'tappa', t: { id: 'milano' } })
  })
  it('senza tappe la regola dei tornei non cambia; senza niente, null', () => {
    expect(destinazionePartita(diario, camp(), { name: 'home' }, OGGI)).toMatchObject({ tipo: 'torneo', t: { id: 'estate' } })
    expect(destinazionePartita(makeData({ tournaments: [] }), camp(), { name: 'home' }, OGGI)).toBeNull()
  })
})
