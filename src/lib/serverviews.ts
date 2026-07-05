// ============================================================================
// Wrapper per le aggregazioni server-side degli screen (RPC gated/SECURITY INVOKER).
// La presentazione resta lato client (mapper in derive.ts): questi tipi sono la
// forma "grezza" restituita dalle RPC. Ogni wrapper ritorna null in caso di errore
// così App può ricadere sul calcolo client.
// ============================================================================
import { supabase } from './supabase'

export interface SvSet { us: number; them: number }

export interface SvTorneoCard {
  id: string; name: string; category: string; city: string; date: string; format: string
  placement: string; rank: number; partner: string | null
  match_count: number; won: number; lost: number; win_pct: number
}
export interface SvTorneiList { tornei: SvTorneoCard[]; t_played: number; podi: number; best_rank: number }

export interface SvCompagno { id: string; name: string; played: number; won: number; lost: number; win_pct: number }

export interface SvGalleryItem { color: string; caption: string; tag: string }

export interface SvTorneoMatch {
  id: string; phase: string; opponents: string; note: string
  partner_name: string; won: boolean; sets: SvSet[]
}
export interface SvTorneoDetail {
  id: string; name: string; category: string; city: string; date: string; surface: string
  placement: string; rank: number; partner: string | null
  played: number; won: number; lost: number; win_pct: number
  sets_won: number; sets_lost: number; point_diff: number
  matches: SvTorneoMatch[]; photos: { color: string; caption: string }[]
  error?: string
}

export interface SvCompagnoMatch { id: string; tournament_name: string; phase: string; opponents: string; won: boolean; sets: SvSet[] }
export interface SvCompagnoDetail {
  id: string; name: string; played: number; won: number; win_pct: number
  set_pct: number; point_diff: number; streak: number
  matches: SvCompagnoMatch[]; error?: string
}

function ok<T>(data: unknown, error: unknown): T | null {
  if (error || !data || (typeof data === 'object' && (data as { error?: string }).error)) {
    // eslint-disable-next-line no-console
    if (error) console.error('[serverviews]', error)
    return null
  }
  return data as T
}

export async function getTorneiList(): Promise<SvTorneiList | null> {
  const { data, error } = await supabase.rpc('tornei_list')
  return ok<SvTorneiList>(data, error)
}
export async function getCompagniList(): Promise<SvCompagno[] | null> {
  const { data, error } = await supabase.rpc('compagni_list')
  return ok<SvCompagno[]>(data, error)
}
export async function getGallery(): Promise<SvGalleryItem[] | null> {
  const { data, error } = await supabase.rpc('gallery')
  return ok<SvGalleryItem[]>(data, error)
}
export async function getTorneoDetail(id: string): Promise<SvTorneoDetail | null> {
  const { data, error } = await supabase.rpc('torneo_detail', { p_id: id })
  return ok<SvTorneoDetail>(data, error)
}
export async function getCompagnoDetail(id: string): Promise<SvCompagnoDetail | null> {
  const { data, error } = await supabase.rpc('compagno_detail', { p_id: id })
  return ok<SvCompagnoDetail>(data, error)
}
