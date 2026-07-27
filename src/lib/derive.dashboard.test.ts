// ============================================================================
// Il riepilogo tornei della dashboard, sui DUE percorsi che lo alimentano:
// `deriveDashboard` (aggregazione client) e `deriveDashboardServer` (JSON di
// public.dashboard_stats). Le due strade devono dare lo stesso piazzamento
// migliore, altrimenti il valore cambia a seconda del piano dell'utente —
// la RPC è gated per piano, il fallback client no.
//
// Il rank è il punto di contatto fragile: la RPC restituisce un NUMERO
// (`best_rank`) e il client lo rimappa in etichetta con PLACEMENT_LABELS. Se le
// due scale divergono, un piazzamento reale si presenta come "—".
// ============================================================================
import { describe, it, expect } from 'vitest'
import { deriveDashboard, deriveDashboardServer } from './derive'
import type { ServerDashboard } from './dashboard'
import { placementRank } from './stats'
import { PLACEMENTS, type Placement } from './db.enums'
import { makeData, makeTournament } from '../test/factories'

// ServerDashboard minimo: qui contano solo i campi del riepilogo tornei, il
// resto è zero/vuoto per non legare il test a calcoli che non sta verificando.
const svDash = (over: Partial<ServerDashboard> = {}): ServerDashboard => ({
  plan: 'premium',
  is_premium: true,
  filter_applied: { partner: null, year: null },
  played: 0, won: 0, lost: 0, win_pct: 0,
  sets_won: 0, sets_lost: 0, set_pct: 0,
  points_for: 0, points_against: 0, point_diff: 0,
  avg_for: 0, avg_against: 0, streak: 0,
  trend: [], partners: [], phases: [], placements: [],
  t_played: 0, t_won: 0, podi: 0, best_rank: 9,
  ...over,
})

const dashServer = (over: Partial<ServerDashboard> = {}) =>
  deriveDashboardServer(svDash(over), makeData(), 'all', 'Sempre')

describe('dashboard — miglior piazzamento dalla RPC', () => {
  it('rimappa ogni rank della scala nella sua etichetta', () => {
    // Chiude il giro RPC → client su TUTTA la scala: se `placement_rank` (SQL)
    // e PLACEMENT_LABELS si disallineano su un solo valore, qui si vede.
    PLACEMENTS.filter((l) => l !== 'In corso').forEach((l) => {
      expect(dashServer({ best_rank: placementRank(l) }).s.bestPlacement).toBe(l)
    })
  })

  it('una semifinale è il miglior piazzamento, non un "—"', () => {
    // Regressione: 'Semifinale' cadeva nel fallback 9 e la testata leggeva "—".
    expect(dashServer({ best_rank: placementRank('Semifinale') }).s.bestPlacement).toBe('Semifinale')
  })

  it('un rank senza risultato resta "—"', () => {
    expect(dashServer({ best_rank: 9 }).s.bestPlacement).toBe('—')
  })
})

describe('dashboard — miglior piazzamento aggregato lato client', () => {
  const dashOf = (...placements: Placement[]) =>
    deriveDashboard(
      makeData({ tournaments: placements.map((placement, i) => makeTournament({ id: `t${i}`, placement })) }),
      'all',
      'Sempre',
    )

  it('la semifinale batte i gironi', () => {
    // Il cuore del bug: 'Semifinale' (4) valeva 9, cioè PEGGIO di 'Gironi' (8),
    // quindi in una stagione così vinceva il girone.
    expect(dashOf('Gironi', 'Semifinale').s.bestPlacement).toBe('Semifinale')
  })

  it('il podio batte comunque la semifinale', () => {
    expect(dashOf('Semifinale', '3°').s.bestPlacement).toBe('3°')
  })

  it('la semifinale batte i quarti', () => {
    expect(dashOf('Quarti', 'Semifinale').s.bestPlacement).toBe('Semifinale')
  })

  it('client e server concordano sulla stessa stagione', () => {
    // Stesso dato, due strade (piano base → client, premium → RPC): il valore
    // mostrato non deve dipendere da quale delle due ha risposto.
    const client = dashOf('Gironi', 'Semifinale', 'In corso').s.bestPlacement
    const server = dashServer({ best_rank: placementRank('Semifinale') }).s.bestPlacement
    expect(client).toBe(server)
  })
})

describe('dashboard — la semifinale non è un podio', () => {
  it('non finisce nei podi né nei tornei vinti', () => {
    // La soglia podio è `rank <= 3` e la semifinale è 4: deve restare fuori.
    // È il motivo per cui vale 4 e non 3.
    const { s } = deriveDashboard(
      makeData({ tournaments: [makeTournament({ id: 't1', placement: 'Semifinale' })] }),
      'all',
      'Sempre',
    )
    expect(s.tPlayed).toBe(1)
    expect(s.podi).toBe(0)
    expect(s.tWon).toBe(0)
    expect(s.bestPlacement).toBe('Semifinale')
  })

  it('nella distribuzione non prende il colore del podio', () => {
    const bars = deriveDashboard(
      makeData({
        tournaments: [
          makeTournament({ id: 't1', placement: 'Semifinale' }),
          makeTournament({ id: 't2', placement: '3°' }),
        ],
      }),
      'all',
      'Sempre',
    ).s.placementDist
    const semi = bars.find((b) => b.label === 'Semifinale')
    const podio = bars.find((b) => b.label === '3°')
    expect(semi?.color).toBe('rgba(27,42,74,.28)')
    expect(podio?.color).toBe('#F7A883')
  })
})
