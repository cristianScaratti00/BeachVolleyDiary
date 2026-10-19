// ============================================================================
// L'app VERA (AppView: shell, router, ModalHost, schermate, azioni) montata in
// jsdom con un diario in memoria, come fa l'anteprima di docs/preview ma
// deterministica: dati di fabbrica fissi, "oggi" fisso, nessuna pausa finta.
//
// Ci si muove come un utente: ruoli, etichette e testo accessibile. Le cose
// che jsdom non sa (layout, CSS dei componenti, `inert`) le misurano gli
// script di docs/qa nel browser vero.
//
//   const app = renderApp({ path: '/tornei', width: 390 })
//   await app.user.click(screen.getByRole('button', { name: 'Crea' }))
//
// Chi lo usa deve mettere in testa al file i `vi.mock` di APP_MOCKS (la rete:
// RPC di dashboard e viste server, segnalazioni, analytics): vi.mock si alza
// in cima al modulo che lo chiama, non si può condividere da qui.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import { act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppView } from '../App'
import { MotionRoot } from '../components/Motion'
import { toast } from '../components/ui/Toast'
import { __resetRouterForTests } from '../app/router'
import type { UseDiary } from '../hooks/useDiary'
import type { UseCheckIn } from '../hooks/useCheckIn'
import type { Session } from '../lib/auth'
import type { AnyForm, CheckIn, DiaryData, Match, Partner, PresentUser, Tournament } from '../lib/models'
import { makeData } from './factories'

// --------------------------------------------------------------- viewport
// `matchMedia` finto ma vivo: la larghezza e le preferenze si cambiano a test
// in corso e chi ascolta riceve `change` (useMediaQuery, Motion).
interface Media {
  width: number
  reduce: boolean
  coarse: boolean
}
const media: Media = { width: 390, reduce: false, coarse: true }
type Listener = (e: MediaQueryListEvent) => void
const listeners = new Map<string, Set<Listener>>()

function matches(q: string): boolean {
  let ok = true
  for (const [, kind, px] of q.matchAll(/\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)) {
    const n = Number(px)
    ok &&= kind === 'min' ? media.width >= n : media.width <= n
  }
  // Motion chiede «(prefers-reduced-motion)», senza valore: vero con «reduce».
  if (/prefers-reduced-motion/.test(q)) ok &&= /no-preference/.test(q) ? !media.reduce : media.reduce
  if (/hover:\s*hover/.test(q)) ok &&= !media.coarse
  if (/pointer:\s*coarse/.test(q)) ok &&= media.coarse
  if (/pointer:\s*fine/.test(q)) ok &&= !media.coarse
  if (/prefers-reduced-transparency|prefers-contrast|forced-colors/.test(q)) ok = false
  return ok
}

function installMatchMedia() {
  window.matchMedia = (q: string) => {
    const set = listeners.get(q) ?? new Set<Listener>()
    listeners.set(q, set)
    const mql = {
      media: q,
      get matches() {
        return matches(q)
      },
      onchange: null,
      addEventListener: (_t: string, cb: Listener) => set.add(cb),
      removeEventListener: (_t: string, cb: Listener) => set.delete(cb),
      addListener: (cb: Listener) => set.add(cb),
      removeListener: (cb: Listener) => set.delete(cb),
      dispatchEvent: () => true,
    }
    return mql as unknown as MediaQueryList
  }
}

function emitMedia() {
  for (const [q, set] of listeners) {
    const e = { matches: matches(q), media: q } as MediaQueryListEvent
    set.forEach((cb) => cb(e))
  }
}

/** Cambia la finestra a test in corso (rotazione, finestra ridimensionata). */
export function setViewport(next: Partial<Media>) {
  act(() => {
    Object.assign(media, next)
    emitMedia()
  })
}

// --------------------------------------------------------------- rete
/** Rete giù o su, con l'evento che l'app ascolta. */
export function setOnline(on: boolean) {
  act(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on })
    window.dispatchEvent(new Event(on ? 'online' : 'offline'))
  })
}

// --------------------------------------------------------------- diario
export type Mutazione =
  | 'saveTorneo'
  | 'deleteTorneo'
  | 'savePartita'
  | 'deletePartita'
  | 'saveFoto'
  | 'deleteFoto'
  | 'saveCompagno'
  | 'deleteCompagno'
  | 'unlinkPartner'
  | 'unlinkMe'
  | 'checkIn'
  | 'checkOut'

export interface AppOptions {
  path?: string
  data?: DiaryData
  /** Sovrascrive i campi della sessione; `role: 'user'` per chi non è admin. */
  session?: Partial<Session>
  width?: number
  reduce?: boolean
  /** Dispositivo con il dito (default) o con il mouse: decide `(hover: hover)`. */
  coarse?: boolean
  /** Il primo caricamento finisce con un errore (UX §4.10). */
  fallito?: boolean
  /** Le mutazioni che falliscono (restituiscono false/null). */
  fail?: Mutazione[]
  /** Il proprio check-in di oggi, se c'è. */
  own?: CheckIn | null
  /**
   * Un refresh: l'app riparte sulla voce di history in cui si trova, con il
   * suo `state` (overlay compreso). Smontare prima quella vecchia (`cleanup`).
   */
  refresh?: boolean
}

export interface AppHandle {
  user: ReturnType<typeof userEvent.setup>
  /** I dati come sono adesso, dopo le mutazioni. */
  data: () => DiaryData
  /** Quante volte è stato chiamato `reload()`. */
  reloads: () => number
  /** Le chiamate alle mutazioni, nell'ordine. */
  calls: { name: string; args: unknown[] }[]
  logout: { n: number }
  /** Le mutazioni in `hold` restano in sospeso finché non si chiama `release()`. */
  hold: (name: Mutazione) => void
  release: () => Promise<void>
  /** La risposta del prossimo `reload()` (dopo un primo caricamento fallito). */
  failMore: (on: boolean) => void
}

export const SESSIONE: Session = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'marta@esempio.it',
  name: 'Marta',
  role: 'user',
  plan: 'base',
  avatarUrl: null,
  hasPassword: true,
}

let uuidN = 0
/** UUID veri (il router riconosce solo quelli come id) ma prevedibili. */
export function uuid(): string {
  uuidN += 1
  return `00000000-0000-4000-8000-${String(uuidN).padStart(12, '0')}`
}

export function renderApp(opts: AppOptions = {}): AppHandle {
  media.width = opts.width ?? 390
  media.reduce = !!opts.reduce
  media.coarse = opts.coarse ?? media.width < 900
  installMatchMedia()
  // Chi ha già una media query (Motion la legge una volta sola per modulo e
  // poi ascolta `change`) deve sapere che le preferenze sono cambiate.
  emitMedia()
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true })
  // pushState e non replaceState: la history di jsdom è una sola per file, e
  // un test che è tornato indietro lascia voci "avanti". Una voce nuova le
  // tronca e mette il cursore in fondo, così `history.length` cresce di uno a
  // ogni push di questo test, qualunque cosa abbia fatto il precedente.
  if (!opts.refresh) window.history.pushState(null, '', opts.path ?? '/')
  __resetRouterForTests()
  toast.__reset()
  // Un refresh tiene quello che il browser ha salvato (il banner chiuso).
  if (!opts.refresh) window.localStorage.clear()
  // Il consenso è già dato: il dialogo bloccante non è di questa suite.
  window.localStorage.setItem('bvd_consenso_cookie', JSON.stringify({ v: 1, scelta: 'rifiutato', quando: '2026-07-01T00:00:00.000Z' }))

  const fail = new Set(opts.fail ?? [])
  const held = new Set<Mutazione>()
  let pending: (() => void)[] = []
  let current: DiaryData = opts.data ?? makeData()
  let reloadN = 0
  let failReload = !!opts.fallito
  const calls: AppHandle['calls'] = []
  const logout = { n: 0 }

  function Harness() {
    const [data, setData] = useState<DiaryData>(current)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [session, setSession] = useState<Session | null>({ ...SESSIONE, ...opts.session })
    const [own, setOwn] = useState<CheckIn | null>(opts.own ?? null)
    current = data

    // Come useDiary: si monta in caricamento (lo splash) e il primo carico
    // decide, subito dopo il primo commit.
    useEffect(() => {
      if (opts.fallito) setError('rete')
      setLoading(false)
    }, [])

    const reload = useCallback(async () => {
      reloadN += 1
      if (failReload) {
        setError('rete')
        return
      }
      setError(null)
      setData((d) => ({ ...d }))
    }, [])

    const muta = async <T,>(name: Mutazione, args: unknown[], ko: T, fn: () => T): Promise<T> => {
      calls.push({ name, args })
      if (held.has(name)) await new Promise<void>((r) => pending.push(r))
      if (fail.has(name)) return ko
      return fn()
    }
    const set = (f: (d: DiaryData) => DiaryData) => setData((d) => f(d))

    const torneoDa = (f: AnyForm, base?: Tournament): Tournament => ({
      id: base?.id ?? uuid(),
      name: f.name ?? '',
      date: f.date ?? '2026-07-22',
      city: f.newVenueCity || base?.city || '',
      venueId: f.venueId && f.venueId !== 'new' ? f.venueId : null,
      category: f.category ?? 'Amatoriale',
      format: f.format ?? '2vs2',
      surface: f.surface ?? 'Sabbia outdoor',
      placement: f.placement ?? 'In corso',
      bracket: f.bracket || null,
      color: f.color ?? '#FF6B35',
      emoji: f.emoji ?? '🏖️',
      partnerId: f.partnerId && f.partnerId !== 'new' ? f.partnerId : null,
      shared: false,
    })

    const diary: UseDiary = {
      data,
      loading,
      error,
      clearError: useCallback(() => setError(null), []),
      reload,
      saveTorneo: (f, editId) =>
        muta('saveTorneo', [f, editId], false, () => {
          set((d) => ({
            ...d,
            tournaments: editId ? d.tournaments.map((t) => (t.id === editId ? torneoDa(f, t) : t)) : [...d.tournaments, torneoDa(f)],
          }))
          return true
        }),
      quickCreateTorneo: async (f) => {
        const t = torneoDa(f)
        set((d) => ({ ...d, tournaments: [...d.tournaments, t] }))
        return t.id
      },
      createGuidedTorneo: async (f) => {
        const t = torneoDa(f)
        set((d) => ({ ...d, tournaments: [...d.tournaments, t] }))
        return t.id
      },
      deleteTorneo: (id) =>
        muta('deleteTorneo', [id], false, () => {
          set((d) => ({ ...d, tournaments: d.tournaments.filter((t) => t.id !== id) }))
          return true
        }),
      savePartita: (f, editId) =>
        muta('savePartita', [f, editId], false, () => {
          const sets = (f.sets ?? []).filter((s) => s.us !== '' && s.them !== '').map((s) => ({ us: +s.us, them: +s.them }))
          set((d) => {
            const riga: Match = { id: editId ?? uuid(), tournamentId: f.tournamentId ?? '', partnerId: null, opponents: f.opponents || 'Avversari', phase: f.phase ?? 'Girone', note: f.note ?? '', sets }
            return { ...d, matches: editId ? d.matches.map((x) => (x.id === editId ? riga : x)) : [riga, ...d.matches] }
          })
          return true
        }),
      deletePartita: (id) =>
        muta('deletePartita', [id], false, () => {
          set((d) => ({ ...d, matches: d.matches.filter((x) => x.id !== id) }))
          return true
        }),
      saveFoto: (f, file) =>
        muta('saveFoto', [f, file], false, () => {
          set((d) => ({ ...d, photos: [...d.photos, { id: uuid(), tournamentId: f.tournamentId ?? '', color: f.color ?? '#FF6B35', caption: f.caption ?? '', url: 'https://cdn.example/nuova.jpg' }] }))
          return true
        }),
      deleteFoto: (id) =>
        muta('deleteFoto', [id], false, () => {
          set((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) }))
          return true
        }),
      saveCompagno: (f) =>
        muta<string | null>('saveCompagno', [f], null, () => {
          const p: Partner = { id: uuid(), name: f.name ?? '', color: '#FF6B35', linkedUserId: null, shared: false }
          set((d) => ({ ...d, partners: [...d.partners, p] }))
          return p.id
        }),
      deleteCompagno: (id) =>
        muta('deleteCompagno', [id], false, () => {
          set((d) => ({ ...d, partners: d.partners.filter((p) => p.id !== id) }))
          return true
        }),
      searchUsers: async (q) => [{ id: uuid(), name: `${q} Rossi`, email: `${q.toLowerCase()}@esempio.it` }],
      linkPartner: async (pid, uid) => {
        set((d) => ({ ...d, partners: d.partners.map((p) => (p.id === pid ? { ...p, linkedUserId: uid } : p)) }))
        return { ok: true }
      },
      unlinkPartner: (pid) =>
        muta('unlinkPartner', [pid], false, () => {
          set((d) => ({ ...d, partners: d.partners.map((p) => (p.id === pid ? { ...p, linkedUserId: null } : p)) }))
          return true
        }),
      unlinkMe: () =>
        muta('unlinkMe', [], 0, () => {
          let n = 0
          set((d) => {
            n = d.partners.filter((p) => p.shared).length
            return { ...d, partners: d.partners.filter((p) => !p.shared), tournaments: d.tournaments.filter((t) => !t.shared) }
          })
          return n || 1
        }),
      mergeVenues: async () => true,
    }

    const room: PresentUser[] = own ? [{ id: 'u-luca', name: 'Luca', avatarUrl: null, lookingForPartner: true, note: '' }] : []
    const check: UseCheckIn = {
      own,
      room,
      loading: false,
      cityPrefill: 'Rimini',
      checkIn: (input) =>
        muta('checkIn', [input], false, () => {
          setOwn({ id: 'c1', city: input.city, date: '2026-07-22', lookingForPartner: input.lookingForPartner, note: input.note, tournamentId: null })
          return true
        }),
      checkOut: () =>
        muta('checkOut', [], false, () => {
          setOwn(null)
          return true
        }),
      refresh: () => {},
      addAsPartner: async () => ({ ok: true }),
    }

    return (
      <AppView
        diary={diary}
        check={check}
        auth={{
          session,
          logout: async () => {
            logout.n += 1
            setSession(null)
          },
          refresh: async () => undefined,
        }}
      />
    )
  }

  const user = userEvent.setup()
  render(
    <MotionRoot>
      <Harness />
    </MotionRoot>,
  )

  return {
    user,
    data: () => current,
    reloads: () => reloadN,
    calls,
    logout,
    hold: (name) => held.add(name),
    release: async () => {
      held.clear()
      const p = pending
      pending = []
      await act(async () => {
        p.forEach((r) => r())
      })
    },
    failMore: (on) => {
      failReload = on
    },
  }
}
