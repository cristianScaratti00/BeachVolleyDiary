// ============================================================================
// Le rotte dell'app (UX.md §4.1). File nuovo e non `lib/models.ts`, che è
// condiviso con l'app mobile: la navigazione web non le riguarda.
//
// Qui solo funzioni pure (percorso ⇄ rotta). La history, i listener e il
// `<Link>` stanno in `router.ts`.
// ============================================================================

export type TabKey = 'home' | 'tornei' | 'compagni' | 'profilo'
export type TorneiVista = 'lista' | 'timeline' | 'mappa'

export type Route =
  | { name: 'home' }
  | { name: 'statistiche' }
  | { name: 'wrapped' }
  | { name: 'oggi' }
  | { name: 'tornei'; vista: TorneiVista; q?: string }
  | { name: 'torneo'; id: string }
  | { name: 'compagni' }
  | { name: 'compagno'; id: string }
  | { name: 'profilo' }
  | { name: 'segnala' }
  | { name: 'segnalazioni' }
  | { name: 'crea' }
  | { name: 'nonTrovato' }

export type RouteName = Route['name']

/**
 * "Chi c'è oggi" (UX C1). Spento dal commit c4d2bd8 e riacceso dalla risposta 5
 * dell'utente, ma dietro un interruttore solo: con `false` spariscono insieme la
 * card in Home, la voce del ＋ e la rotta `/oggi` (che dà "non trovato").
 */
export const OGGI_ATTIVO = true

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Percorsi che esistevano prima e che portano altrove, in `replace`. */
const REDIRECT: Record<string, Route> = {
  '/diario': { name: 'tornei', vista: 'timeline' },
}

/** `/tornei/` = `/tornei`. La radice resta `/`. */
export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/+$/, '')
  return p === '' ? '/' : p
}

/**
 * Il percorso diventa una rotta. L'hash non entra mai: supabase-js lo usa per i
 * token di conferma e OAuth (`detectSessionInUrl`), quindi il router non lo
 * legge e non lo riscrive (UX §4.1).
 */
export function parseLocation(pathname: string, search: string): Route {
  const path = normalizePath(pathname)
  if (REDIRECT[path]) return REDIRECT[path]
  const seg = path.split('/').filter(Boolean)

  if (seg.length === 0) return { name: 'home' }
  const [a, b, ...rest] = seg
  if (rest.length > 0) return { name: 'nonTrovato' }

  switch (a) {
    case 'statistiche':
      return b ? { name: 'nonTrovato' } : { name: 'statistiche' }
    case 'wrapped':
      return b ? { name: 'nonTrovato' } : { name: 'wrapped' }
    case 'oggi':
      return b || !OGGI_ATTIVO ? { name: 'nonTrovato' } : { name: 'oggi' }
    case 'crea':
      return b ? { name: 'nonTrovato' } : { name: 'crea' }
    case 'tornei': {
      // `timeline` e `mappa` sono parole riservate: si confrontano prima di :id.
      const q = new URLSearchParams(search).get('q')?.trim() || undefined
      if (!b) return withQ({ name: 'tornei', vista: 'lista' }, q)
      if (b === 'timeline' || b === 'mappa') return withQ({ name: 'tornei', vista: b }, q)
      return UUID.test(b) ? { name: 'torneo', id: b.toLowerCase() } : { name: 'nonTrovato' }
    }
    case 'compagni':
      if (!b) return { name: 'compagni' }
      return UUID.test(b) ? { name: 'compagno', id: b.toLowerCase() } : { name: 'nonTrovato' }
    case 'profilo':
      if (!b) return { name: 'profilo' }
      if (b === 'segnala') return { name: 'segnala' }
      if (b === 'segnalazioni') return { name: 'segnalazioni' }
      return { name: 'nonTrovato' }
    default:
      return { name: 'nonTrovato' }
  }
}

function withQ(r: { name: 'tornei'; vista: TorneiVista }, q: string | undefined): Route {
  return q ? { ...r, q } : r
}

/** Il percorso canonico di una rotta. `nonTrovato` non ne ha uno: resta dov'è. */
export function routeHref(r: Route): string {
  switch (r.name) {
    case 'home':
      return '/'
    case 'tornei': {
      const base = r.vista === 'lista' ? '/tornei' : `/tornei/${r.vista}`
      return r.q ? `${base}?q=${encodeURIComponent(r.q)}` : base
    }
    case 'torneo':
      return `/tornei/${r.id}`
    case 'compagno':
      return `/compagni/${r.id}`
    case 'segnala':
      return '/profilo/segnala'
    case 'segnalazioni':
      return '/profilo/segnalazioni'
    case 'nonTrovato':
      return '/'
    default:
      return `/${r.name}`
  }
}

/** Il percorso è un redirect (oggi solo `/diario`): il router lo sostituisce. */
export function isRedirect(pathname: string): boolean {
  return normalizePath(pathname) in REDIRECT
}

/** Quale tab è accesa. `crea` e `nonTrovato` non ne accendono nessuna. */
export function routeTab(r: Route): TabKey | null {
  switch (r.name) {
    case 'home':
    case 'statistiche':
    case 'wrapped':
    case 'oggi':
      return 'home'
    case 'tornei':
    case 'torneo':
      return 'tornei'
    case 'compagni':
    case 'compagno':
      return 'compagni'
    case 'profilo':
    case 'segnala':
    case 'segnalazioni':
      return 'profilo'
    default:
      return null
  }
}

/**
 * Il genitore, per l'Indietro senza storia (deep link, refresh). Per il
 * dettaglio torneo è Tornei alla vista ricordata, che solo il chiamante sa.
 */
export function routeParent(r: Route, vista: TorneiVista = 'lista'): Route | null {
  switch (r.name) {
    case 'statistiche':
    case 'wrapped':
    case 'oggi':
    case 'nonTrovato':
      return { name: 'home' }
    case 'torneo':
    case 'crea':
      return { name: 'tornei', vista }
    case 'compagno':
      return { name: 'compagni' }
    case 'segnala':
    case 'segnalazioni':
      return { name: 'profilo' }
    default:
      return null
  }
}

/** La radice di una tab: è dove porta un tocco sulla tab. */
export function tabRoot(t: TabKey, vista: TorneiVista = 'lista'): Route {
  switch (t) {
    case 'home':
      return { name: 'home' }
    case 'tornei':
      return { name: 'tornei', vista }
    case 'compagni':
      return { name: 'compagni' }
    case 'profilo':
      return { name: 'profilo' }
  }
}

export const APP_NAME = 'Beach Diary'

/**
 * Il titolo della scheda (UX §4.1). Torneo e compagno hanno il nome dell'entità,
 * che solo la schermata conosce: `entity` lo passa.
 */
export function routeTitle(r: Route, entity?: string): string {
  const t = ((): string => {
    switch (r.name) {
      case 'home':
        return 'Home'
      case 'statistiche':
        return 'Statistiche'
      case 'wrapped':
        return 'Beach Wrapped'
      case 'oggi':
        return "Chi c'è oggi"
      case 'tornei':
        return r.vista === 'mappa' ? 'Mappa dei tornei' : 'Tornei'
      case 'torneo':
        return entity || 'Torneo'
      case 'compagni':
        return 'Compagni'
      case 'compagno':
        return entity || 'Compagno'
      case 'profilo':
        return 'Profilo'
      case 'segnala':
        return 'Segnala un problema'
      case 'segnalazioni':
        return 'Segnalazioni'
      case 'crea':
        return 'Assistente'
      case 'nonTrovato':
        return 'Pagina non trovata'
    }
  })()
  return `${t} · ${APP_NAME}`
}

/** Identità della rotta per gli effetti: cambia con la schermata, non con `?q=`. */
export function routeKey(r: Route): string {
  switch (r.name) {
    case 'tornei':
      return `tornei:${r.vista}`
    case 'torneo':
    case 'compagno':
      return `${r.name}:${r.id}`
    default:
      return r.name
  }
}

/** Percorsi con un UUID normalizzati per Vercel Analytics (UX §4.8, Q11). */
export function analyticsPath(url: string): string {
  return url.replace(
    /\/(tornei|compagni)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=$|[/?#])/gi,
    '/$1/[id]',
  )
}
