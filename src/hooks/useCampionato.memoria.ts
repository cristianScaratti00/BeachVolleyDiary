// ============================================================================
// `useCampionato` in memoria: la stessa interfaccia senza Supabase, per
// l'anteprima (docs/preview) e per i test che montano l'app vera (src/test).
// Le regole sono quelle dell'hook vero: l'iscrizione si crea con la prima
// tappa della sua stagione, eliminare una tappa toglie anche le sue partite.
// ============================================================================
import { useCallback, useRef, useState } from 'react'
import { iscrizioneDi, numeroONull, setDelModulo, stagioneDi } from '../lib/campionato'
import type { CampionatoData, PartitaTappa, Tappa, TappaForm } from '../lib/campionato'
import type { UseCampionato } from './useCampionato'

export type MutazioneCampionato = 'saveTappa' | 'deleteTappa' | 'savePartitaTappa' | 'deletePartitaTappa' | 'saveIscrizione'

export interface OpzioniMemoria {
  /** Gli id nuovi (i test li vogliono prevedibili). */
  nuovoId?: () => string
  /**
   * Prima di ogni mutazione: `false` la fa fallire. Può attendere (il «lento»
   * dell'anteprima, le mutazioni trattenute dei test).
   */
  prima?: (nome: MutazioneCampionato, args: unknown[]) => Promise<boolean> | boolean
  /** Il primo caricamento fallisce. */
  fallito?: boolean
}

export function useCampionatoInMemoria(iniziale: CampionatoData, opts: OpzioniMemoria = {}): UseCampionato {
  const [data, setData] = useState<CampionatoData>(iniziale)
  const [error, setError] = useState<string | null>(opts.fallito ? 'rete' : null)
  const dataRef = useRef(data)
  dataRef.current = data
  const optsRef = useRef(opts)
  optsRef.current = opts
  const id = () => optsRef.current.nuovoId?.() ?? crypto.randomUUID()

  const ok = async (nome: MutazioneCampionato, args: unknown[]) => (optsRef.current.prima ? await optsRef.current.prima(nome, args) : true)

  /** Applica e restituisce il nuovo stato subito (dataRef), come dopo un reload. */
  const applica = (f: (d: CampionatoData) => CampionatoData) => {
    const nuovo = f(dataRef.current)
    dataRef.current = nuovo
    setData(nuovo)
  }

  const reload = useCallback(async () => {
    setError(null)
    setData((d) => ({ ...d }))
  }, [])

  const tappaDa = (f: TappaForm, seasonId: string, base?: Tappa): Tappa => ({
    id: base?.id ?? id(),
    seasonId,
    kind: f.kind,
    category: f.category,
    date: f.date,
    city: f.city.trim(),
    organizer: f.organizer.trim(),
    partnerId: f.partnerId && f.partnerId !== 'new' ? f.partnerId : null,
    partnerOtherClub: f.partnerOtherClub,
    setPoints: f.setPoints,
    placement: f.placement,
    teams: numeroONull(f.teams, 999),
    pairPoints: numeroONull(f.pairPoints),
    countsForClub: f.countsForClub,
    clubPoints: numeroONull(f.clubPoints),
    note: f.note.trim(),
  })

  return {
    data,
    loading: false,
    error,
    reload,
    saveTappa: async (f, editId) => {
      if (!(await ok('saveTappa', [f, editId]))) return null
      const season = stagioneDi(f.date)
      let seasonId = iscrizioneDi(dataRef.current, season)?.id
      if (!seasonId) {
        if (!f.club.trim() || !f.gender) return null
        seasonId = id()
        const nuova = { id: seasonId, season, club: f.club.trim(), gender: f.gender }
        applica((d) => ({ ...d, iscrizioni: [...d.iscrizioni, nuova] }))
      }
      const base = editId ? dataRef.current.tappe.find((t) => t.id === editId) : undefined
      const t = tappaDa(f, seasonId, base)
      applica((d) => ({ ...d, tappe: editId ? d.tappe.map((x) => (x.id === editId ? t : x)) : [t, ...d.tappe] }))
      return t.id
    },
    deleteTappa: async (tid) => {
      if (!(await ok('deleteTappa', [tid]))) return false
      applica((d) => ({ ...d, tappe: d.tappe.filter((t) => t.id !== tid), partite: d.partite.filter((p) => p.stageId !== tid) }))
      return true
    },
    savePartita: async (f, editId) => {
      if (!(await ok('savePartitaTappa', [f, editId]))) return null
      if (!f.stageId) return null
      const p: PartitaTappa = {
        id: editId ?? id(),
        stageId: f.stageId,
        phase: f.phase,
        opponents: f.opponents.trim(),
        opponentsClub: f.opponentsClub.trim(),
        outcome: f.outcome,
        note: f.note.trim(),
        sets: setDelModulo(f).map((s) => ({ us: s.us, them: s.them })),
      }
      applica((d) => ({ ...d, partite: editId ? d.partite.map((x) => (x.id === editId ? p : x)) : [...d.partite, p] }))
      return p.id
    },
    deletePartita: async (pid) => {
      if (!(await ok('deletePartitaTappa', [pid]))) return false
      applica((d) => ({ ...d, partite: d.partite.filter((p) => p.id !== pid) }))
      return true
    },
    saveIscrizione: async (f, iid) => {
      if (!(await ok('saveIscrizione', [f, iid]))) return false
      if (!f.club.trim()) return false
      applica((d) => ({ ...d, iscrizioni: d.iscrizioni.map((i) => (i.id === iid ? { ...i, club: f.club.trim(), gender: f.gender } : i)) }))
      return true
    },
  }
}
