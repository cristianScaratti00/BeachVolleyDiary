// ============================================================================
// Stato di "Chi c'è oggi?" — check-in di giornata + stanza live.
//
// ⚠️ HANDOFF PIPELINE (ruolo 1 → ruolo 2)
// Questo file è il CONTRATTO tra la schermata presentazionale `ChiCeOggi` e il
// data layer. Il ruolo "frontend business logic" implementa i corpi marcati
// TODO, senza toccare `ChiCeOggi.tsx` né la forma di ritorno qui sotto:
//   • checkIn / checkOut → upsert / delete client-side su `public.check_ins`
//     (unique user_id + city_key + date), poi `refresh()`.
//   • refresh / room     → RPC `who_is_here` via `serverviews.getWhoIsHere`,
//     riga ordinata con `derive.deriveWhoIsHere` (cerca-compagno prima, poi nome).
//   • addAsPartner       → riuso plumbing socio (Q2): `saveCompagno({ name })`
//     poi `linkPartner(nuovoId, u.id)`. NB: oggi `saveCompagno` ritorna un
//     booleano — va esteso per restituire l'id del socio creato, altrimenti il
//     collegamento non è possibile.
//   • estendere `src/lib/database.types.ts` (tabella check_ins + RPC who_is_here).
//
// Per ora tiene uno stato locale ottimistico del proprio check-in, così la
// schermata è navigabile e verificabile end-to-end anche prima del backend.
// Nessuna tabella/RPC nuova è ancora letta o scritta qui: la stanza resta vuota
// (non inventiamo utenti finti) finché `who_is_here` non è collegata.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { AnyForm, CheckIn, CheckInInput, PresentUser, Tournament } from '../lib/models'

// Dipendenze passate da App: la lista tornei (per il prefill città) e il
// plumbing di collegamento socio riusato da useDiary.
export interface UseCheckInDeps {
  tournaments: Tournament[]
  saveCompagno: (f: AnyForm) => Promise<boolean>
  linkPartner: (partnerId: string, userId: string) => Promise<{ ok: boolean; error?: string }>
}

export interface UseCheckIn {
  own: CheckIn | null // il proprio check-in di oggi (null = fuori)
  room: PresentUser[] // gli altri presenti oggi, già ordinati
  loading: boolean // fetch della stanza in corso
  cityPrefill: string // città suggerita nel form (torneo più recente)
  checkIn: (input: CheckInInput) => Promise<boolean>
  checkOut: () => Promise<boolean>
  refresh: () => void
  addAsPartner: (u: PresentUser) => Promise<{ ok: boolean; error?: string }>
}

// "Oggi" in ISO — stesso confine usato altrove (derive.ts).
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useCheckIn(deps: UseCheckInDeps): UseCheckIn {
  const [own, setOwn] = useState<CheckIn | null>(null)
  // TODO(business-logic): popolare da `getWhoIsHere` + `deriveWhoIsHere`.
  const [room] = useState<PresentUser[]>([])
  // TODO(business-logic): true durante il fetch della stanza.
  const [loading] = useState(false)

  // Città suggerita: quella del torneo più recente (default di presentazione).
  const cityPrefill = useMemo(() => {
    const latest = [...deps.tournaments].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return latest?.city ?? ''
  }, [deps.tournaments])

  const checkIn = useCallback(async (input: CheckInInput): Promise<boolean> => {
    const city = input.city.trim()
    if (!city) return false
    // TODO(business-logic): upsert su `check_ins`, poi refresh della stanza.
    setOwn({
      id: 'local',
      city,
      date: todayISO(),
      lookingForPartner: input.lookingForPartner,
      note: input.note.trim(),
      tournamentId: input.tournamentId ?? null,
    })
    return true
  }, [])

  const checkOut = useCallback(async (): Promise<boolean> => {
    // TODO(business-logic): delete della propria riga `check_ins` di oggi.
    setOwn(null)
    return true
  }, [])

  const refresh = useCallback(() => {
    // TODO(business-logic): re-fetch di `who_is_here` (Q4: on-open + manuale).
  }, [])

  const addAsPartner = useCallback(async (u: PresentUser): Promise<{ ok: boolean; error?: string }> => {
    // Q2: crea un socio e (TODO) lo collega all'utente presente.
    const created = await deps.saveCompagno({ name: u.name })
    if (!created) return { ok: false, error: 'Impossibile creare il compagno.' }
    // TODO(business-logic): recuperare l'id del socio creato e collegarlo con
    //   await deps.linkPartner(nuovoId, u.id)
    return { ok: true }
  }, [deps])

  return { own, room, loading, cityPrefill, checkIn, checkOut, refresh, addAsPartner }
}
