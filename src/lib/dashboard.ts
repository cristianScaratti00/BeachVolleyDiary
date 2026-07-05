// ============================================================================
// Wrapper per l'aggregazione dashboard server-side (RPC public.dashboard_stats).
// Il gating per piano è applicato DAL SERVER: per gli utenti base i filtri
// compagno/anno vengono ignorati (lo riflette `filter_applied`).
// Endpoint autoritativo pronto da collegare alla Home per rendere "hard" il
// gating dei filtri (oggi la Home aggrega ancora lato client per il rendering).
// ============================================================================
import { supabase } from './supabase'

export interface ServerTrendPoint { ym: string; pct: number }
export interface ServerPartnerRow { id: string; name: string; played: number; won: number; win_pct: number }
export interface ServerPhaseRow { phase: string; played: number; won: number; win_pct: number }
export interface ServerPlacement { placement: string; count: number }

export interface ServerDashboard {
  plan: string
  is_premium: boolean
  filter_applied: { partner: string | null; year: string | null }
  played: number
  won: number
  lost: number
  win_pct: number
  sets_won: number
  sets_lost: number
  set_pct: number
  points_for: number
  points_against: number
  point_diff: number
  avg_for: number
  avg_against: number
  streak: number
  trend: ServerTrendPoint[]
  partners: ServerPartnerRow[]
  phases: ServerPhaseRow[]
  placements: ServerPlacement[]
  t_played: number
  t_won: number
  podi: number
  best_rank: number
}

// Normalizza i valori "tutti"/"Sempre" → null (nessun filtro) e chiama la RPC.
// Ritorna null in caso di errore (loggato in console).
export async function getDashboardStats(partner: string | null, year: string | null): Promise<ServerDashboard | null> {
  const p_partner = partner && partner !== 'all' ? partner : null
  const p_year = year && year !== 'Sempre' ? year : null
  const { data, error } = await supabase.rpc('dashboard_stats', { p_partner, p_year })
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[dashboard_stats]', error)
    return null
  }
  return data as unknown as ServerDashboard
}
