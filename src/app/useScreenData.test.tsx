// ============================================================================
// useScreenData (UX §4.9, §4.10, §14.2): il primo caricamento fallito si
// riconosce senza toccare useDiary e resta 'fallito' finché un reload non
// porta dati; il reload scatta al cambio di ROTTA, non su `?q=`; il dettaglio
// di un torneo che non c'è è `null` (non trovato), mai la lista.
// ============================================================================
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { makeData, makeTournament } from '../test/factories'
import type { DiaryData } from '../lib/models'
import type { Route } from './routes'

// Funzioni semplici e non `vi.fn()`: `restoreMocks` le svuoterebbe fra un test e l'altro.
vi.mock('../lib/dashboard', () => ({ getDashboardStats: () => Promise.resolve(null) }))
vi.mock('../lib/serverviews', () => ({
  getTorneiList: () => Promise.resolve(null),
  getCompagniList: () => Promise.resolve(null),
  getTorneoDetail: () => Promise.resolve(null),
  getCompagnoDetail: () => Promise.resolve(null),
}))

import { useScreenData } from './useScreenData'

interface P {
  data: DiaryData
  loading: boolean
  error: string | null
  route: Route
}

function setup(initial: P) {
  const reload = vi.fn().mockResolvedValue(undefined)
  const view = renderHook((p: P) => useScreenData({ ...p, reload, canFilter: true, onOggi: () => {} }), { initialProps: initial })
  return { ...view, reload }
}

describe('useScreenData — primo caricamento (§4.10)', () => {
  it('se loading finisce con un errore lo stato è «fallito», non un diario vuoto', () => {
    const vuoto = makeData()
    const { result, rerender } = setup({ data: vuoto, loading: true, error: null, route: { name: 'home' } })
    expect(result.current.caricamento).toBe('attesa')
    rerender({ data: vuoto, loading: false, error: 'rete', route: { name: 'home' } })
    expect(result.current.caricamento).toBe('fallito')
  })

  it('un reload che porta dati nuovi lo riporta a «pronto»', () => {
    const vuoto = makeData()
    const { result, rerender } = setup({ data: vuoto, loading: true, error: null, route: { name: 'home' } })
    rerender({ data: vuoto, loading: false, error: 'rete', route: { name: 'home' } })
    // Un errore tolto senza dati nuovi non basta.
    rerender({ data: vuoto, loading: false, error: null, route: { name: 'home' } })
    expect(result.current.caricamento).toBe('fallito')
    rerender({ data: makeData({ tournaments: [makeTournament()] }), loading: false, error: null, route: { name: 'home' } })
    expect(result.current.caricamento).toBe('pronto')
  })

  it('montato già fallito, il primo reload con dati nuovi lo riporta a «pronto»', () => {
    const vuoto = makeData()
    const { result, rerender } = setup({ data: vuoto, loading: false, error: 'rete', route: { name: 'home' } })
    expect(result.current.caricamento).toBe('fallito')
    rerender({ data: makeData({ tournaments: [makeTournament()] }), loading: false, error: null, route: { name: 'home' } })
    expect(result.current.caricamento).toBe('pronto')
  })

  it('gli errori dopo il primo carico non cambiano lo stato (sono Toast)', () => {
    const d = makeData()
    const { result, rerender } = setup({ data: d, loading: false, error: null, route: { name: 'home' } })
    expect(result.current.caricamento).toBe('pronto')
    rerender({ data: d, loading: false, error: 'mutazione', route: { name: 'home' } })
    expect(result.current.caricamento).toBe('pronto')
  })
})

describe('useScreenData — quando si ricarica (§4.9)', () => {
  it('a ogni cambio di rotta, non sui cambi di ?q=', () => {
    const d = makeData()
    const { reload, rerender } = setup({ data: d, loading: false, error: null, route: { name: 'tornei', vista: 'lista' } })
    expect(reload).toHaveBeenCalledTimes(1)
    rerender({ data: d, loading: false, error: null, route: { name: 'tornei', vista: 'lista', q: 'rimini' } })
    expect(reload).toHaveBeenCalledTimes(1)
    rerender({ data: d, loading: false, error: null, route: { name: 'tornei', vista: 'mappa' } })
    expect(reload).toHaveBeenCalledTimes(2)
  })
})

describe('useScreenData — non trovato (C9)', () => {
  it('un torneo che non c\'è dà null, non la lista', () => {
    const d = makeData({ tournaments: [makeTournament({ id: 'c1b6f6a4-3f6b-4b2a-9a51-1c2d3e4f5a6b' })] })
    const { result } = setup({ data: d, loading: false, error: null, route: { name: 'torneo', id: '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b' } })
    expect(result.current.torneo).toBeNull()
  })

  it('un torneo che c\'è dà il dettaglio', () => {
    const id = '0b6f6a4e-3f6b-4b2a-9a51-1c2d3e4f5a6b'
    const d = makeData({ tournaments: [makeTournament({ id, name: 'Rimini Open' })] })
    const { result } = setup({ data: d, loading: false, error: null, route: { name: 'torneo', id } })
    expect(result.current.torneo?.name).toBe('Rimini Open')
  })
})
