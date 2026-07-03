import { useState, useCallback } from 'react'
import { loadData, saveData, uid } from '../lib/storage'
import { NEW_PARTNER_COLOR } from '../lib/theme'
import type { DiaryData, Tournament, Match, Photo, Partner, AnyForm, SetScore } from '../lib/models'

export interface UseDiary {
  data: DiaryData
  saveTorneo: (f: AnyForm, editId: string | null) => boolean
  deleteTorneo: (editId: string | null) => boolean
  savePartita: (f: AnyForm, editId: string | null) => boolean
  deletePartita: (editId: string | null) => boolean
  saveFoto: (f: AnyForm) => boolean
  saveCompagno: (f: AnyForm) => boolean
}

// Owns the persisted diary data and exposes mutations.
// Each mutation deep-clones, mutates, persists to localStorage, and returns
// whether it succeeded so callers can decide to close a modal.
export function useDiary(): UseDiary {
  const [data, setData] = useState<DiaryData>(loadData)

  const commit = useCallback((mut: (d: DiaryData) => void) => {
    setData((prev) => {
      const d: DiaryData = JSON.parse(JSON.stringify(prev))
      mut(d)
      saveData(d)
      return d
    })
  }, [])

  const saveTorneo = useCallback((f: AnyForm, editId: string | null) => {
    if (!f.name) return false
    commit((d) => {
      if (editId) {
        const t = d.tournaments.find((x) => x.id === editId)
        if (t) Object.assign(t, f)
      } else {
        d.tournaments.unshift({ ...f, id: uid() } as Tournament)
      }
    })
    return true
  }, [commit])

  const deleteTorneo = useCallback((editId: string | null) => {
    if (!editId) return false
    commit((d) => {
      d.tournaments = d.tournaments.filter((x) => x.id !== editId)
      d.matches = d.matches.filter((m) => m.tournamentId !== editId)
      d.photos = d.photos.filter((p) => p.tournamentId !== editId)
    })
    return true
  }, [commit])

  const savePartita = useCallback((f: AnyForm, editId: string | null) => {
    let pid = f.partnerId ?? ''
    commit((d) => {
      if (pid === 'new' && f.newPartnerName) {
        const np: Partner = { id: uid(), name: f.newPartnerName, color: NEW_PARTNER_COLOR }
        d.partners.push(np)
        pid = np.id
      }
      if (pid === 'new') pid = (d.partners[0]?.id) ?? ''
      const sets: SetScore[] = (f.sets || [])
        .filter((s) => s.us !== '' && s.them !== '')
        .map((s) => ({ us: +s.us, them: +s.them }))
      const rec: Omit<Match, 'id'> = {
        tournamentId: f.tournamentId ?? '',
        partnerId: pid,
        opponents: f.opponents || 'Avversari',
        phase: f.phase ?? 'Girone',
        sets,
        note: f.note || '',
      }
      if (editId) {
        const m = d.matches.find((x) => x.id === editId)
        if (m) Object.assign(m, rec)
      } else {
        d.matches.push({ ...rec, id: uid() })
      }
    })
    return true
  }, [commit])

  const deletePartita = useCallback((editId: string | null) => {
    if (!editId) return false
    commit((d) => { d.matches = d.matches.filter((x) => x.id !== editId) })
    return true
  }, [commit])

  const saveFoto = useCallback((f: AnyForm) => {
    if (!f.caption) return false
    commit((d) => {
      const photo: Photo = { id: uid(), tournamentId: f.tournamentId ?? '', color: f.color ?? '#FF6B35', caption: f.caption ?? '' }
      d.photos.unshift(photo)
    })
    return true
  }, [commit])

  // Add a standalone ("generic") partner, independent of any match.
  const saveCompagno = useCallback((f: AnyForm) => {
    const name = (f.name || '').trim()
    if (!name) return false
    commit((d) => {
      d.partners.push({ id: uid(), name, color: f.color || NEW_PARTNER_COLOR })
    })
    return true
  }, [commit])

  return { data, saveTorneo, deleteTorneo, savePartita, deletePartita, saveFoto, saveCompagno }
}
