// ============================================================================
// I dati del Campionato per Società (Supabase), a parte da `useDiary`: tabelle
// loro (club_seasons, club_stages, club_matches, club_match_sets), che nessuna
// statistica dei tornei legge. Stesso schema di useDiary: ogni mutazione
// scrive e poi ricarica tutto (pochi dati, per utente).
//
// Il compagno è una riga di `partners`: se lo sheet ne chiede uno nuovo lo
// crea useDiary (l'azione lo fa prima), qui arriva già l'id.
//
// Un caricamento fallito non ferma l'app: il diario si apre lo stesso, e la
// pagina del Campionato dice che non si è caricata (anche quando le tabelle
// non ci sono ancora, prima della migration).
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAMPIONATO_VUOTO, iscrizioneDi, rigaTappa, setDelModulo, stagioneDi } from '../lib/campionato'
import type {
  CampionatoData,
  CategoriaCips,
  EsitoCips,
  FaseCips,
  Genere,
  Iscrizione,
  IscrizioneForm,
  PartitaTappa,
  PartitaTappaForm,
  PuntiSet,
  Tappa,
  TappaForm,
  TipoTappa,
} from '../lib/campionato'

export interface UseCampionato {
  data: CampionatoData
  loading: boolean
  /** Il caricamento è fallito: la pagina lo dice e offre «Riprova». */
  error: string | null
  reload: () => Promise<void>
  /** Crea o salva una tappa (e, se manca, l'iscrizione della sua stagione). L'id, o null. */
  saveTappa: (f: TappaForm, editId: string | null) => Promise<string | null>
  deleteTappa: (id: string) => Promise<boolean>
  /** Crea o salva una partita di una tappa. L'id, o null. */
  savePartita: (f: PartitaTappaForm, editId: string | null) => Promise<string | null>
  deletePartita: (id: string) => Promise<boolean>
  saveIscrizione: (f: IscrizioneForm, id: string) => Promise<boolean>
}

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Errore di comunicazione con il database.'
}

async function fetchAll(): Promise<CampionatoData> {
  const [iRes, tRes, pRes] = await Promise.all([
    supabase.from('club_seasons').select('id, season, club, gender').order('created_at', { ascending: true }),
    supabase
      .from('club_stages')
      .select('id, season_id, kind, category, date, city, organizer, partner_id, partner_other_club, set_points, placement, teams, pair_points, counts_for_club, club_points, note')
      .order('date', { ascending: false }),
    supabase
      .from('club_matches')
      .select('id, stage_id, phase, opponents, opponents_club, outcome, note, club_match_sets(set_number, us, them)')
      .order('created_at', { ascending: true }),
  ])
  const failed = iRes.error || tRes.error || pRes.error
  if (failed) throw failed

  const iscrizioni: Iscrizione[] = (iRes.data ?? []).map((i) => ({
    id: i.id,
    season: i.season,
    club: i.club,
    gender: i.gender as Genere,
  }))
  const tappe: Tappa[] = (tRes.data ?? []).map((t) => ({
    id: t.id,
    seasonId: t.season_id,
    kind: t.kind as TipoTappa,
    category: t.category as CategoriaCips,
    date: t.date,
    city: t.city,
    organizer: t.organizer,
    partnerId: t.partner_id,
    partnerOtherClub: t.partner_other_club,
    setPoints: t.set_points as PuntiSet,
    placement: t.placement,
    teams: t.teams,
    pairPoints: t.pair_points,
    countsForClub: t.counts_for_club,
    clubPoints: t.club_points,
    note: t.note,
  }))
  const partite: PartitaTappa[] = (pRes.data ?? []).map((p) => ({
    id: p.id,
    stageId: p.stage_id,
    phase: p.phase as FaseCips,
    opponents: p.opponents,
    opponentsClub: p.opponents_club,
    outcome: p.outcome as EsitoCips,
    note: p.note,
    sets: (p.club_match_sets ?? [])
      .slice()
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({ us: s.us, them: s.them })),
  }))
  return { iscrizioni, tappe, partite }
}

export function useCampionato(): UseCampionato {
  const [data, setData] = useState<CampionatoData>(CAMPIONATO_VUOTO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  const reload = useCallback(async () => {
    try {
      const d = await fetchAll()
      setData(d)
      setError(null)
    } catch (e) {
      setError(errMsg(e))
      // eslint-disable-next-line no-console
      console.error('[useCampionato] reload', e)
    }
  }, [])

  useEffect(() => {
    let vivo = true
    fetchAll()
      .then((d) => {
        if (vivo) {
          setData(d)
          setError(null)
        }
      })
      .catch((e) => {
        if (!vivo) return
        setError(errMsg(e))
        // eslint-disable-next-line no-console
        console.error('[useCampionato] load', e)
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  const fail = (e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[useCampionato] mutation', e)
  }

  /** L'iscrizione della stagione di `date`: quella che c'è, o una nuova da club e classifica. */
  const iscrizionePer = async (f: TappaForm): Promise<string | null> => {
    const season = stagioneDi(f.date)
    if (!season) return null
    const c = iscrizioneDi(dataRef.current, season)
    if (c) return c.id
    const club = f.club.trim().replace(/\s+/g, ' ')
    if (!club || !f.gender) return null
    const { data: ins, error } = await supabase.from('club_seasons').insert({ season, club, gender: f.gender }).select('id').single()
    if (error || !ins) {
      fail(error)
      return null
    }
    return ins.id
  }

  const saveTappa = useCallback(async (f: TappaForm, editId: string | null): Promise<string | null> => {
    const seasonId = await iscrizionePer(f)
    if (!seasonId) return null
    const row = {
      ...rigaTappa(f),
      season_id: seasonId,
      partner_id: f.partnerId && f.partnerId !== 'new' ? f.partnerId : null,
    }
    let id = editId
    if (editId) {
      const { error } = await supabase.from('club_stages').update(row).eq('id', editId)
      if (error) {
        fail(error)
        return null
      }
    } else {
      const { data: ins, error } = await supabase.from('club_stages').insert(row).select('id').single()
      if (error || !ins) {
        fail(error)
        return null
      }
      id = ins.id
    }
    await reload()
    return id
  }, [reload]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteTappa = useCallback(async (id: string) => {
    // Cascata DB: se ne vanno anche le partite e i loro set.
    const { error } = await supabase.from('club_stages').delete().eq('id', id)
    if (error) {
      fail(error)
      return false
    }
    await reload()
    return true
  }, [reload])

  const savePartita = useCallback(async (f: PartitaTappaForm, editId: string | null): Promise<string | null> => {
    if (!f.stageId) return null
    const row = {
      stage_id: f.stageId,
      phase: f.phase,
      opponents: f.opponents.trim(),
      opponents_club: f.opponentsClub.trim(),
      outcome: f.outcome,
      note: f.note.trim(),
    }
    let id = editId
    if (editId) {
      const { error } = await supabase.from('club_matches').update(row).eq('id', editId)
      if (error) {
        fail(error)
        return null
      }
      // I set si sostituiscono per intero.
      const { error: delErr } = await supabase.from('club_match_sets').delete().eq('match_id', editId)
      if (delErr) {
        fail(delErr)
        return null
      }
    } else {
      const { data: ins, error } = await supabase.from('club_matches').insert(row).select('id').single()
      if (error || !ins) {
        fail(error)
        return null
      }
      id = ins.id
    }
    const sets = setDelModulo(f)
    if (id && sets.length) {
      const { error } = await supabase.from('club_match_sets').insert(sets.map((s) => ({ ...s, match_id: id as string })))
      if (error) {
        fail(error)
        return null
      }
    }
    await reload()
    return id
  }, [reload])

  const deletePartita = useCallback(async (id: string) => {
    const { error } = await supabase.from('club_matches').delete().eq('id', id)
    if (error) {
      fail(error)
      return false
    }
    await reload()
    return true
  }, [reload])

  const saveIscrizione = useCallback(async (f: IscrizioneForm, id: string) => {
    const club = f.club.trim().replace(/\s+/g, ' ')
    if (!club) return false
    const { error } = await supabase.from('club_seasons').update({ club, gender: f.gender }).eq('id', id)
    if (error) {
      fail(error)
      return false
    }
    await reload()
    return true
  }, [reload])

  return { data, loading, error, reload, saveTappa, deleteTappa, savePartita, deletePartita, saveIscrizione }
}
