// ============================================================================
// Le rotte (UX §4.1, §14.2): andata e ritorno percorso ⇄ rotta per ognuna,
// parole riservate prima di :id, redirect di /tornei/timeline, hash ignorato,
// il resto "non trovato".
// ============================================================================
import { describe, it, expect } from 'vitest'
import { analyticsPath, parseLocation, routeFullscreen, routeHasTabBar, routeHref, routeParent, routeTab, routeTitle, isRedirect } from './routes'
import type { Route } from './routes'

const ID = '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b'

const TUTTE: [string, Route][] = [
  ['/', { name: 'home' }],
  ['/statistiche', { name: 'statistiche' }],
  ['/wrapped', { name: 'wrapped' }],
  ['/oggi', { name: 'oggi' }],
  ['/tornei', { name: 'tornei', vista: 'lista' }],
  ['/tornei/mappa', { name: 'tornei', vista: 'mappa' }],
  ['/diario', { name: 'diario' }],
  [`/tornei/${ID}`, { name: 'torneo', id: ID }],
  ['/compagni', { name: 'compagni' }],
  [`/compagni/${ID}`, { name: 'compagno', id: ID }],
  ['/profilo', { name: 'profilo' }],
  ['/profilo/segnala', { name: 'segnala' }],
  ['/profilo/segnalazioni', { name: 'segnalazioni' }],
  ['/crea', { name: 'crea' }],
  ['/live', { name: 'live' }],
]

describe('rotte — andata e ritorno', () => {
  it.each(TUTTE)('%s', (path, route) => {
    expect(parseLocation(path, '')).toEqual(route)
    expect(routeHref(route)).toBe(path)
  })

  it('la ricerca sta in ?q= e torna uguale', () => {
    const r = parseLocation('/tornei/mappa', '?q=rimini%20open')
    expect(r).toEqual({ name: 'tornei', vista: 'mappa', q: 'rimini open' })
    expect(routeHref(r)).toBe('/tornei/mappa?q=rimini%20open')
    const d = parseLocation('/diario', '?q=cervia')
    expect(d).toEqual({ name: 'diario', q: 'cervia' })
    expect(routeHref(d)).toBe('/diario?q=cervia')
  })

  it('una ricerca vuota non è una ricerca', () => {
    expect(parseLocation('/tornei', '?q=%20')).toEqual({ name: 'tornei', vista: 'lista' })
  })
})

describe('rotte — regole di parsing', () => {
  it('mappa è una parola riservata, non un id', () => {
    expect(parseLocation('/tornei/mappa', '').name).toBe('tornei')
  })

  it('un segmento che non è un UUID né una parola riservata è "non trovato"', () => {
    expect(parseLocation('/tornei/123', '')).toEqual({ name: 'nonTrovato' })
    expect(parseLocation('/compagni/abc', '')).toEqual({ name: 'nonTrovato' })
    expect(parseLocation('/qualcosa', '')).toEqual({ name: 'nonTrovato' })
    expect(parseLocation(`/tornei/${ID}/altro`, '')).toEqual({ name: 'nonTrovato' })
  })

  it('la barra finale si ignora', () => {
    expect(parseLocation('/tornei/', '')).toEqual({ name: 'tornei', vista: 'lista' })
    expect(parseLocation('/profilo/segnala/', '')).toEqual({ name: 'segnala' })
  })

  it('la vecchia Timeline di Tornei porta al Diario (redirect)', () => {
    expect(isRedirect('/tornei/timeline')).toBe(true)
    expect(isRedirect('/tornei/timeline/')).toBe(true)
    expect(parseLocation('/tornei/timeline', '')).toEqual({ name: 'diario' })
    expect(isRedirect('/diario')).toBe(false)
    expect(isRedirect('/tornei')).toBe(false)
  })
})

describe('rotte — tab, genitori, titoli', () => {
  it('la tab accesa', () => {
    expect(routeTab({ name: 'statistiche' })).toBe('home')
    expect(routeTab({ name: 'torneo', id: ID })).toBe('tornei')
    expect(routeTab({ name: 'compagno', id: ID })).toBe('compagni')
    expect(routeTab({ name: 'oggi' })).toBe('compagni')
    expect(routeTab({ name: 'diario' })).toBe('diario')
    // Il Profilo non è più una tab: ci si arriva dall'avatar in Home.
    expect(routeTab({ name: 'profilo' })).toBeNull()
    expect(routeTab({ name: 'segnalazioni' })).toBeNull()
    expect(routeTab({ name: 'crea' })).toBeNull()
    expect(routeTab({ name: 'live' })).toBeNull()
    expect(routeTab({ name: 'nonTrovato' })).toBeNull()
  })

  it('la TabBar c\'è solo sulle schermate di passaggio', () => {
    expect(routeHasTabBar({ name: 'home' })).toBe(true)
    expect(routeHasTabBar({ name: 'diario' })).toBe(true)
    expect(routeHasTabBar({ name: 'compagno', id: ID })).toBe(true)
    expect(routeHasTabBar({ name: 'torneo', id: ID })).toBe(false)
    expect(routeHasTabBar({ name: 'profilo' })).toBe(false)
    expect(routeHasTabBar({ name: 'oggi' })).toBe(false)
    expect(routeFullscreen({ name: 'live' })).toBe(true)
    expect(routeFullscreen({ name: 'crea' })).toBe(true)
    expect(routeFullscreen({ name: 'tornei', vista: 'lista' })).toBe(false)
  })

  it('il genitore del dettaglio torneo è Tornei alla vista ricordata', () => {
    expect(routeParent({ name: 'torneo', id: ID }, 'mappa')).toEqual({ name: 'tornei', vista: 'mappa' })
    expect(routeParent({ name: 'segnala' })).toEqual({ name: 'profilo' })
    expect(routeParent({ name: 'profilo' })).toEqual({ name: 'home' })
    expect(routeParent({ name: 'oggi' })).toEqual({ name: 'compagni' })
    expect(routeParent({ name: 'home' })).toBeNull()
  })

  it('il titolo della scheda', () => {
    expect(routeTitle({ name: 'tornei', vista: 'mappa' })).toBe('Mappa dei tornei · Beach Diary')
    expect(routeTitle({ name: 'torneo', id: ID }, 'Rimini Open')).toBe('Rimini Open · Beach Diary')
    expect(routeTitle({ name: 'nonTrovato' })).toBe('Pagina non trovata · Beach Diary')
  })
})

describe('analytics — percorsi normalizzati (Q11)', () => {
  it('gli UUID diventano [id]', () => {
    expect(analyticsPath(`https://x.it/tornei/${ID}`)).toBe('https://x.it/tornei/[id]')
    expect(analyticsPath(`/compagni/${ID}?a=1`)).toBe('/compagni/[id]?a=1')
    expect(analyticsPath('/tornei/mappa')).toBe('/tornei/mappa')
  })
})
