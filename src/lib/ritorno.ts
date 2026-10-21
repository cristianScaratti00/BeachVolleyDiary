// ============================================================================
// Il ritorno dal link della mail di conferma. Supabase (flusso implicito)
// rimanda all'app con l'esito nell'indirizzo:
//   - riuscito: `#access_token=…&refresh_token=…&type=signup` (una sessione);
//   - fallito, cioè link scaduto o già usato:
//     `#error=access_denied&error_code=otp_expired&error_description=…`.
//
// Si legge UNA volta, al caricamento, prima che supabase-js ripulisca
// l'indirizzo: per questo `supabase.ts` importa questo modulo prima di creare
// il client. Per scelta dell'utente dopo la conferma si atterra su Accedi
// («Email confermata, ora accedi»): la sessione portata dal link si chiude
// (AuthProvider), e il Login apre Accedi con l'email già scritta.
// ============================================================================

export type Ritorno =
  | { tipo: 'confermata'; email: string }
  | { tipo: 'scaduto' }

/** I parametri della query e del frammento, come li legge supabase-js. */
function parametri(href: string): URLSearchParams {
  const url = new URL(href)
  const p = new URLSearchParams(url.search)
  new URLSearchParams(url.hash.replace(/^#/, '')).forEach((v, k) => p.set(k, v))
  return p
}

/** L'email dentro l'access token (un JWT), per scriverla già nel campo. Se non si legge, ''. */
function emailDelToken(token: string): string {
  try {
    const corpo = token.split('.')[1] ?? ''
    const json = JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.email === 'string' ? json.email : ''
  } catch {
    return ''
  }
}

/** Puro: che cosa dice l'indirizzo. Solo la conferma della registrazione conta. */
export function leggiRitorno(href: string): Ritorno | null {
  let p: URLSearchParams
  try {
    p = parametri(href)
  } catch {
    return null
  }
  if (p.has('error') || p.has('error_code')) return { tipo: 'scaduto' }
  const token = p.get('access_token')
  if (token && p.get('type') === 'signup') return { tipo: 'confermata', email: emailDelToken(token) }
  return null
}

const CHIAVI = ['error', 'error_code', 'error_description', 'sb']

/**
 * Toglie l'esito dall'indirizzo, lasciando il resto: un ricaricamento o un
 * «indietro» non lo rimostrano. Il frammento della conferma lo toglie
 * supabase-js (che lascia un `#` vuoto); qui va via anche quello.
 */
export function pulisciIndirizzo() {
  try {
    const url = new URL(window.location.href)
    CHIAVI.forEach((k) => url.searchParams.delete(k))
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
    const conEsito = CHIAVI.some((k) => hash.has(k)) || hash.has('access_token')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + (conEsito || url.hash === '#' ? '' : url.hash))
  } catch {
    /* niente history: l'indirizzo resta com'è, innocuo */
  }
}

const ALL_AVVIO: Ritorno | null = typeof window === 'undefined' ? null : leggiRitorno(window.location.href)

// Un link scaduto non porta una sessione: l'indirizzo si pulisce subito, così
// supabase-js non lo tratta come un accesso fallito.
if (ALL_AVVIO?.tipo === 'scaduto') pulisciIndirizzo()

/** Il link di conferma ha portato una sessione da chiudere (AuthProvider). */
export const SESSIONE_DEL_LINK = ALL_AVVIO?.tipo === 'confermata'

let daMostrare = ALL_AVVIO

/** L'esito da mostrare nel Login; dopo che l'ha mostrato, `ritornoMostrato()`. */
export const ritornoDaMostrare = (): Ritorno | null => daMostrare

/** Mostrato: un'uscita e un rientro più tardi non lo ripetono. */
export function ritornoMostrato() {
  daMostrare = null
}
