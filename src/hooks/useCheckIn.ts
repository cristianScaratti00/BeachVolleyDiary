// ============================================================================
// Stato di "Chi c'è oggi?" — check-in di giornata + stanza live.
//
// Tiene i dati transitori (per-giorno) FUORI dal diario persistente (useDiary):
//   • own    → il proprio check-in di oggi (una riga public.check_ins), scritto
//     lato client (upsert / delete) sotto le policy owner-only.
//   • room   → gli altri presenti nella stessa città+giorno, letti dalla RPC
//     `who_is_here` (reciprocità lato DB) e ordinati da `deriveWhoIsHere`.
//   • addAsPartner → riuso del plumbing socio: `saveCompagno({name})` restituisce
//     l'id del nuovo socio, poi `linkPartner(id, u.id)` lo collega all'utente
//     presente (Q2). La schermata `ChiCeOggi` è puramente presentazionale: qui
//     vive tutta la rete/stato.
//
// MVP (Q4): fetch-on-open + refresh manuale. Nessun realtime. La stanza si
// aggiorna al mount, dopo un check-in, e su `refresh()` (pulsante "Aggiorna" +
// effetto d'apertura schermata in App). Nessun utente finto: senza `who_is_here`
// la stanza resta vuota, non inventata.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getWhoIsHere } from '../lib/serverviews'
import { deriveWhoIsHere, normalizeCity, todayISO } from '../lib/derive'
import type { AnyForm, CheckIn, CheckInInput, PresentUser, Tournament, Venue } from '../lib/models'

// Dipendenze passate da App: la lista tornei e i luoghi (per il prefill città) e
// il plumbing di collegamento socio riusato da useDiary.
export interface UseCheckInDeps {
  tournaments: Tournament[]
  venues: Venue[]
  saveCompagno: (f: AnyForm) => Promise<string | null>
  linkPartner: (partnerId: string, userId: string) => Promise<{ ok: boolean; error?: string }>
}

export interface UseCheckIn {
  own: CheckIn | null // il proprio check-in di oggi (null = fuori)
  room: PresentUser[] // gli altri presenti oggi, già ordinati
  loading: boolean // fetch della stanza in corso
  cityPrefill: string // città suggerita nel form (torneo di oggi / più recente)
  checkIn: (input: CheckInInput) => Promise<boolean>
  checkOut: () => Promise<boolean>
  refresh: () => void
  addAsPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
}

// Colonne del proprio check-in (snake_case DB → camelCase modello).
const OWN_COLS = 'id, city, date, looking_for_partner, note, tournament_id'
type OwnRow = {
  id: string
  city: string
  date: string
  looking_for_partner: boolean
  note: string
  tournament_id: string | null
}
function mapOwn(r: OwnRow): CheckIn {
  return {
    id: r.id,
    city: r.city,
    date: r.date,
    lookingForPartner: r.looking_for_partner,
    note: r.note,
    tournamentId: r.tournament_id,
  }
}

// Id utente della sessione corrente (vuoto se non loggato).
async function currentUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? ''
}

// Il proprio check-in di oggi. La RLS espone solo le proprie righe; se ce ne
// fosse più d'una (es. due città oggi, scritte altrove) si prende la più
// recente: la schermata modella UNA presenza attiva alla volta.
async function fetchOwnCheckIn(): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .select(OWN_COLS)
    .eq('date', todayISO())
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = data?.[0]
  return row ? mapOwn(row) : null
}

export function useCheckIn(deps: UseCheckInDeps): UseCheckIn {
  const { tournaments, venues, saveCompagno, linkPartner } = deps
  const [own, setOwn] = useState<CheckIn | null>(null)
  const [room, setRoom] = useState<PresentUser[]>([])
  const [loading, setLoading] = useState(false)

  // Contatore di richieste: le risposte "stanza" superate (refresh rapidi,
  // check-in/out ravvicinati) vengono ignorate → niente race condition.
  const reqRef = useRef(0)

  // Città suggerita nel form: se hai un torneo OGGI, quella città; altrimenti la
  // città del torneo più recente (default di presentazione). La città viene dal
  // luogo collegato quando c'è — è quella normalizzata dal picker, quindi due
  // giocatori sulla stessa spiaggia finiscono nella stessa stanza anche se uno
  // scriveva "riccione" e l'altro "Riccione ".
  const cityPrefill = useMemo(() => {
    const cityOf = (t: Tournament): string => {
      const v = t.venueId ? venues.find((x) => x.id === t.venueId) : undefined
      return (v?.city.trim() || v?.name.trim() || t.city.trim())
    }
    const today = todayISO()
    const withCity = tournaments.filter((t) => cityOf(t))
    const todays = withCity.find((t) => t.date === today)
    if (todays) return cityOf(todays)
    const latest = [...withCity].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return latest ? cityOf(latest) : ''
  }, [tournaments, venues])

  // Carica la stanza per una città (oggi). Race-safe via reqRef.
  const loadRoom = useCallback(async (city: string) => {
    const myReq = ++reqRef.current
    if (!normalizeCity(city)) {
      setRoom([])
      setLoading(false)
      return
    }
    setLoading(true)
    const rows = await getWhoIsHere(city, todayISO())
    if (myReq !== reqRef.current) return // risposta superata: la ignoro
    setRoom(rows ? deriveWhoIsHere(rows) : [])
    setLoading(false)
  }, [])

  // Al mount: carica il proprio check-in e, se presente, la stanza.
  useEffect(() => {
    let alive = true
    fetchOwnCheckIn()
      .then((mine) => {
        if (!alive) return
        setOwn(mine)
        if (mine) void loadRoom(mine.city)
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[useCheckIn] load own', e)
      })
    return () => { alive = false }
  }, [loadRoom])

  // Check-in: upsert della propria riga di oggi (una per città/giorno), poi
  // rilettura di own + stanza. `date` esplicita = oggi (UTC), coerente con i
  // filtri di lettura e con il default DB.
  const checkIn = useCallback(async (input: CheckInInput): Promise<boolean> => {
    const city = input.city.trim()
    if (!city) return false
    const uid = await currentUid()
    if (!uid) return false
    const { data, error } = await supabase
      .from('check_ins')
      .upsert(
        {
          user_id: uid,
          city,
          date: todayISO(),
          looking_for_partner: input.lookingForPartner,
          note: input.note.trim(),
          tournament_id: input.tournamentId ?? null,
        },
        { onConflict: 'user_id,city_key,date' },
      )
      .select(OWN_COLS)
      .single()
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error('[useCheckIn] checkIn', error)
      return false
    }
    const mine = mapOwn(data)
    setOwn(mine)
    await loadRoom(mine.city)
    return true
  }, [loadRoom])

  // Check-out: elimina la propria presenza di oggi. La RLS delete_own limita alla
  // proprie righe, quindi `date = oggi` basta (e ripulisce anche eventuali doppi
  // check-in del giorno). Invalida i fetch stanza in volo così una risposta
  // tardiva non ripopola la stanza dopo l'uscita.
  const checkOut = useCallback(async (): Promise<boolean> => {
    const { error } = await supabase.from('check_ins').delete().eq('date', todayISO())
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[useCheckIn] checkOut', error)
      return false
    }
    reqRef.current++
    setOwn(null)
    setRoom([])
    return true
  }, [])

  // Re-fetch manuale della stanza (Q4: on-open + pulsante "Aggiorna").
  const refresh = useCallback(() => {
    if (own) void loadRoom(own.city)
  }, [own, loadRoom])

  // Q2: crea un socio col nome dell'utente presente e lo collega al suo account.
  // `saveCompagno` ora restituisce l'id del nuovo socio, quindi il collegamento
  // è possibile. NB: crea sempre un nuovo socio (nessuna deduplica per nome — è
  // il comportamento anche del resto dell'app).
  const addAsPartner = useCallback(async (u: PresentUser): Promise<{ ok: boolean; error?: string }> => {
    const newId = await saveCompagno({ name: u.name })
    if (!newId) return { ok: false, error: 'Impossibile creare il compagno.' }
    return linkPartner(newId, u.id)
  }, [saveCompagno, linkPartner])

  return { own, room, loading, cityPrefill, checkIn, checkOut, refresh, addAsPartner }
}
