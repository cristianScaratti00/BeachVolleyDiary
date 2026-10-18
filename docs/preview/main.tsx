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
// fallito) · ?lento (le mutazioni impiegano 1,5s).
// ============================================================================
import { StrictMode, useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/tokens.css'
import '../../src/styles/materials.css'
import '../../src/styles/base.css'
import { MotionRoot } from '../../src/components/Motion'
import { AppView } from '../../src/App'
import type { UseDiary } from '../../src/hooks/useDiary'
import type { UseCheckIn } from '../../src/hooks/useCheckIn'
import type { AnyForm, CheckIn, DiaryData, GuidedMatch, Match, Partner, PresentUser, Tournament, Venue, Photo } from '../../src/lib/models'
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

const oggi = new Date().toISOString().slice(0, 10)
const giorni = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const swatch = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
const foto = (a: string, b: string) =>
  swatch(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="300" cy="80" r="46" fill="#FFE9DB"/></svg>`)

function datiDiProva(): DiaryData {
  const pGiulia: Partner = { id: uuid(), name: 'Giulia', color: '#FF6B35', linkedUserId: null, shared: false }
  const pMarco: Partner = { id: uuid(), name: 'Marco', color: '#00B4D8', linkedUserId: uuid(), shared: false }
  const pAltro: Partner = { id: uuid(), name: 'Sara (condivisa)', color: '#1B2A4A', linkedUserId: null, shared: true }
  const vRimini: Venue = { id: uuid(), name: 'Bagno 26', city: 'Rimini', lat: 44.0678, lng: 12.5695, surface: 'Sabbia outdoor', shared: false }
  const vRiccione: Venue = { id: uuid(), name: 'Beach Arena', city: 'Riccione', lat: null, lng: null, surface: 'Sabbia outdoor', shared: false }
  const t = (o: Partial<Tournament>): Tournament => ({
    id: uuid(), name: 'Torneo', date: oggi, city: 'Rimini', venueId: null, category: 'Open', format: '2vs2',
    surface: 'Sabbia outdoor', placement: 'Gironi', bracket: null, color: '#FF6B35', emoji: '🏖️', partnerId: pGiulia.id, shared: false, ...o,
  })
  const tornei = [
    t({ name: 'Rimini Open', date: oggi, venueId: vRimini.id, placement: 'In corso', category: 'Open' }),
    t({ name: 'Riccione Summer Cup', date: giorni(12), venueId: vRiccione.id, city: 'Riccione', placement: 'In corso', partnerId: pMarco.id }),
    t({ name: 'Cervia Beach Party', date: giorni(-9), city: 'Cervia', placement: '1° 🏆', category: 'Amatoriale', bracket: 'Gold' }),
    t({ name: 'Cesenatico 3vs3', date: giorni(-30), city: 'Cesenatico', placement: '3°', format: '3vs3', partnerId: pMarco.id }),
    t({ name: 'Ravenna King', date: giorni(-60), city: 'Ravenna', placement: 'Quarti', category: 'King', partnerId: null }),
    t({ name: 'Bellaria Night', date: giorni(-300), city: 'Bellaria Igea Marina', placement: '2°', category: 'Serie' }),
    t({ name: 'Torneo di Sara', date: giorni(-20), city: 'Milano Marittima', placement: 'Ottavi', shared: true, partnerId: null }),
  ]
  const m = (tid: string, opp: string, phase: Match['phase'], sets: [number, number][]): Match => ({
    id: uuid(), tournamentId: tid, partnerId: tornei.find((x) => x.id === tid)?.partnerId ?? null, opponents: opp, phase, note: '', sets: sets.map(([us, them]) => ({ us, them })),
  })
  const partite = [
    m(tornei[0].id, 'Bianchi / Verdi', 'Girone', [[21, 17], [21, 19]]),
    m(tornei[0].id, 'Rossi / Neri', 'Girone', [[18, 21], [21, 23]]),
    m(tornei[2].id, 'Conti / Gallo', 'Finale', [[21, 15], [21, 18]]),
    m(tornei[2].id, 'Ferri / Riva', 'Semifinale', [[21, 19], [17, 21], [15, 12]]),
    m(tornei[3].id, 'Sala / Moro', 'Quarti', [[21, 16], [21, 14]]),
    m(tornei[4].id, 'Testa / Villa', 'Ottavi', [[19, 21], [20, 22]]),
    m(tornei[5].id, 'Galli / Fabbri', 'Finale', [[18, 21], [21, 19], [13, 15]]),
    m(tornei[6].id, 'Mori / Bassi', 'Girone', [[21, 12], [21, 10]]),
  ]
  const foto3: Photo[] = [
    { id: uuid(), tournamentId: tornei[2].id, color: '#FF6B35', caption: 'La finale', url: foto('#F7C59F', '#FF8657') },
    { id: uuid(), tournamentId: tornei[2].id, color: '#00B4D8', caption: '', url: foto('#AAD3DF', '#1B2A4A') },
    { id: uuid(), tournamentId: tornei[2].id, color: '#FFD23F', caption: 'Vecchio segnaposto', url: null },
  ]
  return { tournaments: tornei, matches: partite, partners: [pGiulia, pMarco, pAltro], photos: foto3, venues: [vRimini, vRiccione] }
}

const VUOTO: DiaryData = { tournaments: [], matches: [], partners: [], photos: [], venues: [] }

function useDiarioFinto(): UseDiary {
  const [data, setData] = useState<DiaryData>(() => (qs.has('vuoto') ? VUOTO : datiDiProva()))
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

const SESSIONE: Session = { id: '00000000-0000-4000-8000-000000000001', email: 'marta@esempio.it', name: 'Marta', role: 'admin', plan: 'premium', avatarUrl: null, hasPassword: true }

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
