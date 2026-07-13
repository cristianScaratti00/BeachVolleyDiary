import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { NEW_PARTNER_COLOR } from '../lib/theme'
import type {
  DiaryData, Tournament, Match, Photo, Partner, AnyForm, GuidedMatch, AppUser,
  Category, Format, Surface, Phase, Placement,
} from '../lib/models'

export interface UseDiary {
  data: DiaryData
  loading: boolean
  error: string | null
  clearError: () => void
  reload: () => Promise<void>
  saveTorneo: (f: AnyForm, editId: string | null) => Promise<boolean>
  quickCreateTorneo: (f: AnyForm) => Promise<string | null>
  createGuidedTorneo: (f: AnyForm, matches: GuidedMatch[]) => Promise<string | null>
  deleteTorneo: (editId: string | null) => Promise<boolean>
  savePartita: (f: AnyForm, editId: string | null) => Promise<boolean>
  deletePartita: (editId: string | null) => Promise<boolean>
  saveFoto: (f: AnyForm, file: File | null) => Promise<boolean>
  deleteFoto: (photoId: string) => Promise<boolean>
  saveCompagno: (f: AnyForm) => Promise<boolean>
  searchUsers: (query: string) => Promise<AppUser[]>
  linkPartner: (partnerId: string, userId: string) => Promise<{ ok: boolean; error?: string }>
  unlinkPartner: (partnerId: string) => Promise<boolean>
}

const EMPTY: DiaryData = { tournaments: [], matches: [], partners: [], photos: [] }

// Bucket privato delle foto dei tornei (vedi migration tournament_photos_storage).
const PHOTO_BUCKET = 'tournament-photos'
const SIGNED_URL_TTL = 60 * 60 * 8 // 8h

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Errore di comunicazione con il database.'
}

// Scarica tutto il diario dell'utente loggato e lo rimappa nel modello di dominio
// (snake_case → camelCase; righe match_sets → array `sets` inline).
async function fetchAll(): Promise<DiaryData> {
  // Utente corrente: serve a distinguere dati propri da quelli condivisi (di altri
  // utenti, resi leggibili dalla RLS quando un socio è collegato al mio account).
  const { data: authData } = await supabase.auth.getSession()
  const uid = authData.session?.user?.id ?? ''
  const [pRes, tRes, mRes, fRes] = await Promise.all([
    supabase.from('partners')
      .select('id, name, color, user_id, linked_user_id')
      .order('created_at', { ascending: true }),
    supabase.from('tournaments')
      .select('id, name, date, city, category, format, surface, placement, color, emoji, partner_id, user_id')
      .order('date', { ascending: false }),
    supabase.from('matches')
      .select('id, tournament_id, partner_id, opponents, phase, note, match_sets(set_number, us, them)')
      .order('created_at', { ascending: true }),
    supabase.from('photos')
      .select('id, tournament_id, color, caption, storage_path')
      .order('created_at', { ascending: false }),
  ])
  const failed = pRes.error || tRes.error || mRes.error || fRes.error
  if (failed) throw failed

  const partners: Partner[] = (pRes.data ?? []).map((p) => ({
    id: p.id, name: p.name, color: p.color,
    linkedUserId: p.linked_user_id ?? null,
    shared: p.user_id !== uid,
  }))

  const tournaments: Tournament[] = (tRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    date: t.date,
    city: t.city,
    category: t.category as Category,
    format: t.format as Format,
    surface: t.surface as Surface,
    placement: t.placement as Placement,
    color: t.color,
    emoji: t.emoji,
    partnerId: t.partner_id,
    shared: t.user_id !== uid,
  }))

  const matches: Match[] = (mRes.data ?? []).map((m) => ({
    id: m.id,
    tournamentId: m.tournament_id,
    partnerId: m.partner_id,
    opponents: m.opponents,
    phase: m.phase as Phase,
    note: m.note,
    sets: [...(m.match_sets ?? [])]
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({ us: s.us, them: s.them })),
  }))

  // Firma gli URL delle foto reali (bucket privato) in un'unica chiamata batch.
  const photoRows = fRes.data ?? []
  const paths = photoRows.map((f) => f.storage_path).filter((p): p is string => !!p)
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data: urls } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    urls?.forEach((u) => { if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl) })
  }

  const photos: Photo[] = photoRows.map((f) => ({
    id: f.id,
    tournamentId: f.tournament_id ?? '',
    color: f.color,
    caption: f.caption,
    url: f.storage_path ? (signed.get(f.storage_path) ?? null) : null,
  }))

  return { tournaments, matches, partners, photos }
}

// Owns the persisted diary data (Supabase) and exposes async mutations.
// Ogni mutazione scrive sul DB e poi ricarica lo stato dal server (dataset
// piccolo e per-utente): stato sempre coerente col DB, niente merge a mano.
export function useDiary(): UseDiary {
  const [data, setData] = useState<DiaryData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const d = await fetchAll()
      setData(d)
      setError(null)
    } catch (e) {
      setError(errMsg(e))
      // eslint-disable-next-line no-console
      console.error('[useDiary] reload', e)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchAll()
      .then((d) => { if (alive) { setData(d); setError(null) } })
      .catch((e) => { if (alive) { setError(errMsg(e)); console.error('[useDiary] load', e) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Helper: registra l'errore e ritorna false (per far restare aperto il modale).
  const fail = (e: unknown): false => {
    setError(errMsg(e))
    // eslint-disable-next-line no-console
    console.error('[useDiary] mutation', e)
    return false
  }

  const saveTorneo = useCallback(async (f: AnyForm, editId: string | null) => {
    if (!f.name) return false

    // "Con chi": '' → nessuno (null); 'new' + nome → crea il compagno; un id → quel compagno.
    let partnerId: string | null = null
    const sel = f.partnerId
    if (sel === 'new') {
      const name = (f.newPartnerName ?? '').trim()
      if (name) {
        const { data: ins, error } = await supabase
          .from('partners').insert({ name, color: NEW_PARTNER_COLOR }).select('id').single()
        if (error || !ins) return fail(error)
        partnerId = ins.id
      }
    } else if (sel && sel !== 'all') {
      partnerId = sel
    }

    const row = {
      name: f.name,
      date: f.date ?? '',
      city: f.city ?? '',
      category: f.category ?? 'Amatoriale',
      format: f.format ?? '2vs2',
      surface: f.surface ?? 'Sabbia outdoor',
      placement: f.placement ?? 'Gironi',
      color: f.color ?? '#FF6B35',
      emoji: f.emoji ?? '🏖️',
      partner_id: partnerId,
    }

    if (editId) {
      const prev = data.tournaments.find((t) => t.id === editId)?.partnerId ?? null
      const { error } = await supabase.from('tournaments').update(row).eq('id', editId)
      if (error) return fail(error)
      // Compagno del torneo cambiato (e valorizzato) → allinea tutte le sue partite.
      if (partnerId && partnerId !== prev) {
        const { error: mErr } = await supabase.from('matches').update({ partner_id: partnerId }).eq('tournament_id', editId)
        if (mErr) return fail(mErr)
      }
    } else {
      const { error } = await supabase.from('tournaments').insert(row)
      if (error) return fail(error)
    }

    await reload()
    return true
  }, [reload, data.tournaments])

  // Creazione rapida: nome + compagno + data + categoria + piazzamento.
  // Formato/superficie fissi. Ritorna l'id del nuovo torneo (o null se fallisce).
  const quickCreateTorneo = useCallback(async (f: AnyForm): Promise<string | null> => {
    if (!f.name) return null

    // Compagno: 'new' + nome → crealo; un id → usalo; altrimenti nessuno.
    let partnerId: string | null = null
    const sel = f.partnerId
    if (sel === 'new') {
      const name = (f.newPartnerName ?? '').trim()
      if (name) {
        const { data: ins, error } = await supabase
          .from('partners').insert({ name, color: NEW_PARTNER_COLOR }).select('id').single()
        if (error || !ins) { fail(error); return null }
        partnerId = ins.id
      }
    } else if (sel && sel !== 'all') {
      partnerId = sel
    }

    const row = {
      name: f.name,
      date: f.date ?? '',
      city: '',
      category: f.category ?? 'Amatoriale',
      format: '2vs2',
      surface: 'Sabbia outdoor',
      placement: f.placement ?? 'In corso',
      color: '#FF6B35',
      emoji: '🏖️',
      partner_id: partnerId,
    }
    const { data: ins, error } = await supabase.from('tournaments').insert(row).select('id').single()
    if (error || !ins) { fail(error); return null }
    await reload()
    return ins.id
  }, [reload])

  // Creazione guidata (assistente chat): crea il torneo con tutti i campi e, in
  // un'unica passata, le partite raccolte durante la conversazione. Il compagno
  // delle partite è quello del torneo (fallback: primo socio esistente).
  // Ritorna l'id del torneo creato (il torneo resta creato anche se una partita
  // fallisce: l'errore viene segnalato e l'utente completa a mano dal dettaglio).
  const createGuidedTorneo = useCallback(async (f: AnyForm, matches: GuidedMatch[]): Promise<string | null> => {
    if (!f.name) return null

    // Compagno del torneo: 'new' + nome → crealo; un id → usalo; altrimenti nessuno.
    let partnerId: string | null = null
    const sel = f.partnerId
    if (sel === 'new') {
      const name = (f.newPartnerName ?? '').trim()
      if (name) {
        const { data: ins, error } = await supabase
          .from('partners').insert({ name, color: NEW_PARTNER_COLOR }).select('id').single()
        if (error || !ins) { fail(error); return null }
        partnerId = ins.id
      }
    } else if (sel && sel !== 'all') {
      partnerId = sel
    }

    const row = {
      name: f.name,
      date: f.date ?? '',
      city: f.city ?? '',
      category: f.category ?? 'Amatoriale',
      format: f.format ?? '2vs2',
      surface: f.surface ?? 'Sabbia outdoor',
      placement: f.placement ?? 'In corso',
      color: f.color ?? '#FF6B35',
      emoji: f.emoji ?? '🏖️',
      partner_id: partnerId,
    }
    const { data: tIns, error: tErr } = await supabase.from('tournaments').insert(row).select('id').single()
    if (tErr || !tIns) { fail(tErr); return null }
    const tournamentId: string = tIns.id

    // Le partite ereditano il compagno del torneo (o il primo socio disponibile).
    const matchPartner = partnerId ?? data.partners[0]?.id ?? null
    if (matches.length && matchPartner) {
      for (const m of matches) {
        const { data: mIns, error: mErr } = await supabase.from('matches').insert({
          tournament_id: tournamentId,
          partner_id: matchPartner,
          opponents: m.opponents || 'Avversari',
          phase: m.phase ?? 'Girone',
          note: '',
        }).select('id').single()
        if (mErr || !mIns) { fail(mErr); break } // torneo già creato: interrompi ma non annullare
        const sets = m.sets
          .filter((s) => Number.isFinite(s.us) && Number.isFinite(s.them))
          .map((s, i) => ({ match_id: mIns.id as string, set_number: i + 1, us: s.us, them: s.them }))
        if (sets.length) {
          const { error: sErr } = await supabase.from('match_sets').insert(sets)
          if (sErr) { fail(sErr); break }
        }
      }
    }

    await reload()
    return tournamentId
  }, [reload, data.partners])

  const deleteTorneo = useCallback(async (editId: string | null) => {
    if (!editId) return false
    // Cascata DB: elimina anche partite, set e foto collegate.
    const { error } = await supabase.from('tournaments').delete().eq('id', editId)
    if (error) return fail(error)
    await reload()
    return true
  }, [reload])

  const savePartita = useCallback(async (f: AnyForm, editId: string | null) => {
    // Risolvi il compagno: 'new' + nome → crealo; altrimenti usa l'id scelto.
    let pid = f.partnerId ?? ''
    if (pid === 'new') {
      const name = (f.newPartnerName ?? '').trim()
      if (name) {
        const { data: ins, error } = await supabase
          .from('partners').insert({ name, color: NEW_PARTNER_COLOR }).select('id').single()
        if (error || !ins) return fail(error)
        pid = ins.id
      } else {
        pid = data.partners[0]?.id ?? '' // nessun nome: ripiega sul primo socio
      }
    }
    if (!pid) return false

    const tournamentId = f.tournamentId ?? ''
    if (!tournamentId) return false

    const sets = (f.sets ?? [])
      .filter((s) => s.us !== '' && s.them !== '')
      .map((s, i) => ({ set_number: i + 1, us: +s.us, them: +s.them }))

    const matchRow = {
      tournament_id: tournamentId,
      partner_id: pid,
      opponents: f.opponents || 'Avversari',
      phase: f.phase ?? 'Girone',
      note: f.note || '',
    }

    let matchId = editId
    if (editId) {
      const { error } = await supabase.from('matches').update(matchRow).eq('id', editId)
      if (error) return fail(error)
      // Sostituisci integralmente i set della partita.
      const { error: delErr } = await supabase.from('match_sets').delete().eq('match_id', editId)
      if (delErr) return fail(delErr)
    } else {
      const { data: ins, error } = await supabase.from('matches').insert(matchRow).select('id').single()
      if (error || !ins) return fail(error)
      matchId = ins.id
    }

    if (matchId && sets.length) {
      const rows = sets.map((s) => ({ ...s, match_id: matchId as string }))
      const { error } = await supabase.from('match_sets').insert(rows)
      if (error) return fail(error)
    }

    await reload()
    return true
  }, [reload, data.partners])

  const deletePartita = useCallback(async (editId: string | null) => {
    if (!editId) return false
    // Cascata DB: elimina anche i set collegati.
    const { error } = await supabase.from('matches').delete().eq('id', editId)
    if (error) return fail(error)
    await reload()
    return true
  }, [reload])

  // Carica un'immagine dal dispositivo su Storage e la collega a un torneo.
  const saveFoto = useCallback(async (f: AnyForm, file: File | null) => {
    const tournamentId = f.tournamentId
    if (!tournamentId) return false
    if (!file) return false // serve un'immagine dal dispositivo

    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id
    if (!uid) return fail(new Error('Sessione non valida.'))

    // Path RLS: {uid}/{torneo}/{uuid}.{ext} — la policy consente solo la propria cartella.
    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${uid}/${tournamentId}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
    if (upErr) return fail(upErr)

    const { error } = await supabase.from('photos').insert({
      tournament_id: tournamentId,
      color: f.color ?? '#FF6B35',
      caption: f.caption ?? '',
      storage_path: path,
    })
    if (error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]) // rollback best-effort del file
      return fail(error)
    }
    await reload()
    return true
  }, [reload])

  // Elimina una foto: rimuove la riga e (best-effort) il file dallo Storage.
  const deleteFoto = useCallback(async (photoId: string) => {
    if (!photoId) return false
    // Recupera il path prima di cancellare la riga, così posso ripulire il file.
    const { data: row } = await supabase.from('photos').select('storage_path').eq('id', photoId).single()
    const { error } = await supabase.from('photos').delete().eq('id', photoId)
    if (error) return fail(error)
    const path = row?.storage_path
    if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]) // best-effort
    await reload()
    return true
  }, [reload])

  // Elenco/ricerca degli utenti dell'app a cui collegare un socio (per nome).
  const searchUsers = useCallback(async (query: string): Promise<AppUser[]> => {
    const { data, error } = await supabase.rpc('search_users', { p_query: query })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[useDiary] searchUsers', error)
      return []
    }
    return (data ?? []).map((u) => ({ id: u.id, name: u.name, email: u.email }))
  }, [])

  // Collega un socio all'utente scelto: da quel momento quell'utente vede in sola
  // lettura i tornei giocati con questo socio.
  const linkPartner = useCallback(async (partnerId: string, userId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!userId) return { ok: false, error: 'Seleziona un utente.' }
    const { error } = await supabase.from('partners').update({ linked_user_id: userId }).eq('id', partnerId)
    if (error) { fail(error); return { ok: false, error: 'Impossibile collegare il socio.' } }
    await reload()
    return { ok: true }
  }, [reload])

  // Scollega il socio dall'account: la condivisione dei tornei si interrompe.
  const unlinkPartner = useCallback(async (partnerId: string) => {
    const { error } = await supabase.from('partners').update({ linked_user_id: null }).eq('id', partnerId)
    if (error) return fail(error)
    await reload()
    return true
  }, [reload])

  // Aggiunge un compagno "generico", indipendente da qualsiasi partita.
  const saveCompagno = useCallback(async (f: AnyForm) => {
    const name = (f.name ?? '').trim()
    if (!name) return false
    const { error } = await supabase.from('partners').insert({ name, color: f.color || NEW_PARTNER_COLOR })
    if (error) return fail(error)
    await reload()
    return true
  }, [reload])

  return { data, loading, error, clearError, reload, saveTorneo, quickCreateTorneo, createGuidedTorneo, deleteTorneo, savePartita, deletePartita, saveFoto, deleteFoto, saveCompagno, searchUsers, linkPartner, unlinkPartner }
}
