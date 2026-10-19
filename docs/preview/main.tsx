// ============================================================================
// Anteprima dell'app VERA con dati di fabbrica, senza Supabase (fuori dalla
// build, come docs/motion). Monta `AppView` — la stessa composizione di App —
// con un diario e un check-in in memoria: si naviga, si aprono sheet e menu,
// si salva e si elimina, e tutto quello che si vede è il CSS di produzione.
//
// Come aprirla, dalla radice del repo:
//   VITE_SUPABASE_URL=http://127.0.0.1:9 VITE_SUPABASE_ANON_KEY=x npx vite
//   → http://localhost:5173/docs/preview/  (o /docs/preview/?r=/tornei/mappa)
// La rete verso Supabase fallisce subito (porta 9): le RPC ricadono sul calcolo
// client, che è il percorso di ripiego normale.
//
// Parametri: ?vuoto (account senza dati) · ?fallito (primo caricamento
// fallito) · ?lento (le mutazioni impiegano 1,5s) · ?estremo (nomi lunghissimi,
// stringhe vuote, numeri enormi: la prova di resistenza dei layout).
// ============================================================================
import { StrictMode, useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/tokens.css'
import '@fontsource-variable/geist'
import '../../src/styles/materials.css'
import '../../src/styles/base.css'
import { MotionRoot } from '../../src/components/Motion'
import { AppView } from '../../src/App'
import type { UseDiary } from '../../src/hooks/useDiary'
import type { UseCheckIn } from '../../src/hooks/useCheckIn'
import type { AnyForm, CheckIn, DiaryData, GuidedMatch, Match, Partner, PresentUser, Tournament } from '../../src/lib/models'
import { datiDiProva, datiEstremi, oggiVero } from './dati'
import type { Session } from '../../src/lib/auth'

const qs = new URLSearchParams(location.search)
const RITARDO = qs.has('lento') ? 1500 : 450
const pausa = () => new Promise((r) => setTimeout(r, RITARDO))
const uuid = () => crypto.randomUUID()

// Il consenso è già dato: l'anteprima non deve aprirsi con il dialogo.
try {
  localStorage.setItem('bvd_consenso_cookie', JSON.stringify({ v: 1, scelta: 'rifiutato', quando: new Date().toISOString() }))
} catch {
  /* niente */
}

const oggi = oggiVero()

const VUOTO: DiaryData = { tournaments: [], matches: [], partners: [], photos: [], venues: [] }

function useDiarioFinto(): UseDiary {
  const [data, setData] = useState<DiaryData>(() => (qs.has('vuoto') ? VUOTO : qs.has('estremo') ? datiEstremi() : datiDiProva()))
  const [error, setError] = useState<string | null>(qs.has('fallito') ? 'rete' : null)
  const [primo, setPrimo] = useState(qs.has('fallito'))
  // Stabile come quello vero (useCallback): useScreenData ricarica quando cambia.
  const reload = useCallback(async () => {
    if (primo) {
      // ?fallito: il primo «Riprova» va a buon fine.
      await pausa()
      setPrimo(false)
      setError(null)
      setData(datiDiProva())
      return
    }
    setData((d) => ({ ...d }))
  }, [primo])
  const ok = async <T,>(fn: () => T): Promise<T> => {
    await pausa()
    return fn()
  }
  const torneoDa = (f: AnyForm, base?: Tournament): Tournament => ({
    id: base?.id ?? uuid(), name: f.name ?? '', date: f.date ?? oggi, city: f.newVenueCity || base?.city || '', venueId: f.venueId && f.venueId !== 'new' ? f.venueId : null,
    category: f.category ?? 'Amatoriale', format: f.format ?? '2vs2', surface: f.surface ?? 'Sabbia outdoor', placement: f.placement ?? 'In corso',
    bracket: f.bracket || null, color: f.color ?? '#FF6B35', emoji: f.emoji ?? '🏖️', partnerId: f.partnerId && f.partnerId !== 'new' ? f.partnerId : null, shared: false,
  })
  return {
    data,
    loading: false,
    error,
    clearError: useCallback(() => setError(null), []),
    reload,
    saveTorneo: (f, editId) =>
      ok(() => {
        setData((d) => ({
          ...d,
          tournaments: editId ? d.tournaments.map((t) => (t.id === editId ? torneoDa(f, t) : t)) : [...d.tournaments, torneoDa(f)],
        }))
        return true
      }),
    quickCreateTorneo: (f) => ok(() => { const t = torneoDa(f); setData((d) => ({ ...d, tournaments: [...d.tournaments, t] })); return t.id }),
    createGuidedTorneo: (f: AnyForm, matches: GuidedMatch[]) =>
      ok(() => {
        const t = torneoDa(f)
        setData((d) => ({ ...d, tournaments: [...d.tournaments, t], matches: [...d.matches, ...matches.map((x) => ({ id: uuid(), tournamentId: t.id, partnerId: t.partnerId, opponents: x.opponents || 'Avversari', phase: x.phase, note: '', sets: x.sets }))] }))
        return t.id
      }),
    deleteTorneo: (id) => ok(() => { setData((d) => ({ ...d, tournaments: d.tournaments.filter((t) => t.id !== id) })); return true }),
    savePartita: (f, editId) =>
      ok(() => {
        const sets = (f.sets ?? []).filter((s) => s.us !== '' && s.them !== '').map((s) => ({ us: +s.us, them: +s.them }))
        setData((d) => {
          const t = d.tournaments.find((x) => x.id === f.tournamentId)
          const riga: Match = { id: editId ?? uuid(), tournamentId: f.tournamentId ?? '', partnerId: t?.partnerId ?? null, opponents: f.opponents || 'Avversari', phase: f.phase ?? 'Girone', note: f.note ?? '', sets }
          return { ...d, matches: editId ? d.matches.map((x) => (x.id === editId ? riga : x)) : [riga, ...d.matches] }
        })
        return true
      }),
    deletePartita: (id) => ok(() => { setData((d) => ({ ...d, matches: d.matches.filter((x) => x.id !== id) })); return true }),
    saveFoto: (f, file) =>
      ok(() => {
        const url = file ? URL.createObjectURL(file) : null
        setData((d) => ({ ...d, photos: [...d.photos, { id: uuid(), tournamentId: f.tournamentId ?? '', color: f.color ?? '#FF6B35', caption: f.caption ?? '', url }] }))
        return true
      }),
    deleteFoto: (id) => ok(() => { setData((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) })); return true }),
    saveCompagno: (f) => ok(() => { const p: Partner = { id: uuid(), name: f.name ?? '', color: '#FF6B35', linkedUserId: null, shared: false }; setData((d) => ({ ...d, partners: [...d.partners, p] })); return p.id }),
    deleteCompagno: (id) => ok(() => { setData((d) => ({ ...d, partners: d.partners.filter((p) => p.id !== id) })); return true }),
    searchUsers: async (q) => { await pausa(); return [{ id: uuid(), name: `${q} Rossi`, email: `${q.toLowerCase()}@esempio.it` }, { id: uuid(), name: `${q} Bianchi`, email: `${q.toLowerCase()}.b@esempio.it` }] },
    linkPartner: (pid, uid) => ok(() => { setData((d) => ({ ...d, partners: d.partners.map((p) => (p.id === pid ? { ...p, linkedUserId: uid } : p)) })); return { ok: true } }),
    unlinkPartner: (pid) => ok(() => { setData((d) => ({ ...d, partners: d.partners.map((p) => (p.id === pid ? { ...p, linkedUserId: null } : p)) })); return true }),
    unlinkMe: () => ok(() => { setData((d) => ({ ...d, partners: d.partners.filter((p) => !p.shared), tournaments: d.tournaments.filter((t) => !t.shared) })); return 1 }),
    mergeVenues: () => ok(() => true),
  }
}

function useCheckInFinto(): UseCheckIn {
  const [own, setOwn] = useState<CheckIn | null>(null)
  const [loading, setLoading] = useState(false)
  const room = useMemo<PresentUser[]>(
    () => (own ? [
      { id: uuid(), name: 'Luca', avatarUrl: null, lookingForPartner: true, note: 'Cerco un 2vs2 nel pomeriggio' },
      { id: uuid(), name: 'Elena', avatarUrl: null, lookingForPartner: false, note: '' },
    ] : []),
    [own],
  )
  return {
    own,
    room,
    loading,
    cityPrefill: 'Rimini',
    checkIn: async (input) => { await pausa(); setOwn({ id: uuid(), city: input.city, date: oggi, lookingForPartner: input.lookingForPartner, note: input.note, tournamentId: null }); return true },
    checkOut: async () => { await pausa(); setOwn(null); return true },
    refresh: () => { setLoading(true); setTimeout(() => setLoading(false), RITARDO) },
    addAsPartner: async () => { await pausa(); return { ok: true } },
  }
}

const SESSIONE: Session = qs.has('estremo')
  ? { id: '00000000-0000-4000-8000-000000000001', email: 'bartolomeo.alessandro.giovanbattista.rossi@esempio-lunghissimo.it', name: 'Bartolomeo Alessandro Giovanbattista', role: 'admin', plan: 'premium', avatarUrl: null, hasPassword: true }
  : { id: '00000000-0000-4000-8000-000000000001', email: 'marta@esempio.it', name: 'Marta', role: 'admin', plan: 'premium', avatarUrl: null, hasPassword: true }

function Anteprima() {
  const diary = useDiarioFinto()
  const check = useCheckInFinto()
  const [session, setSession] = useState<Session | null>(SESSIONE)
  return (
    <AppView
      diary={diary}
      check={check}
      auth={{ session, logout: async () => setSession(null), refresh: async () => undefined }}
    />
  )
}

// L'anteprima vive in /docs/preview/: la rotta di partenza arriva da `?r=`
// (es. `?r=/tornei/mappa`), perché il server di sviluppo serve l'app vera per
// qualunque altro percorso. Il router legge poi `location.pathname`.
{
  const r = qs.get('r') ?? '/'
  qs.delete('r')
  const resto = qs.toString()
  history.replaceState(null, '', r + (resto ? `?${resto}` : ''))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionRoot>
      <Anteprima />
    </MotionRoot>
  </StrictMode>,
)
