// ============================================================================
// Segnalazioni di problemi — l'app è in alpha e il banner in Home lo dice.
//
// Qui vive tutto ciò che tocca la rete (tabella `bug_reports` + RPC
// `bug_reports_list`) e la validazione. Le schermate restano presentazionali:
// `Segnala` riceve `onInvia`, la bacheca admin riceve i dati già mappati.
//
// La validazione è duplicata di proposito: i CHECK del DB sono l'autorità (un
// client vecchio o una chiamata diretta non li aggirano), questi sono lo stesso
// vincolo detto in italiano PRIMA di fare un giro di rete. Se cambiano i limiti,
// vanno cambiati insieme — come già succede per `enforce_plan_limits`/`limits.ts`.
// ============================================================================
import { track } from '@vercel/analytics'
import { supabase } from './supabase'

// Lo stato avanza solo per mano di un admin. 'nuovo' è il default del DB.
export type StatoSegnalazione = 'nuovo' | 'in_corso' | 'risolto' | 'chiuso'

// Schermata coinvolta. Slug lato DB (CHECK), etichetta italiana qui: cambiare
// una parola non richiede una migration.
export type AreaSegnalazione =
  | 'home'
  | 'tornei'
  | 'diario'
  | 'compagni'
  | 'oggi'
  | 'profilo'
  | 'accesso'
  | 'altro'

export const AREE: { value: AreaSegnalazione; label: string }[] = [
  { value: 'home', label: 'Home e statistiche' },
  { value: 'tornei', label: 'Tornei e partite' },
  { value: 'diario', label: 'Diario e storie' },
  { value: 'compagni', label: 'Compagni' },
  { value: 'oggi', label: "Chi c'è oggi" },
  { value: 'profilo', label: 'Profilo e foto' },
  { value: 'accesso', label: 'Accesso e registrazione' },
  { value: 'altro', label: 'Altro / non so dire' },
]

export const STATI: { value: StatoSegnalazione; label: string; color: string }[] = [
  { value: 'nuovo', label: 'Nuova', color: '#FF6B35' },
  { value: 'in_corso', label: 'In lavorazione', color: '#1B2A4A' },
  { value: 'risolto', label: 'Risolta', color: '#14B87A' },
  { value: 'chiuso', label: 'Chiusa', color: 'rgba(27,42,74,.55)' },
]

// Stessi numeri dei CHECK in 20260801120000_bug_reports_alpha.sql.
export const TITOLO_MIN = 3
export const TITOLO_MAX = 120
export const DESCRIZIONE_MIN = 10
export const DESCRIZIONE_MAX = 2000

export interface NuovaSegnalazione {
  titolo: string
  descrizione: string
  area: AreaSegnalazione
}

// Una segnalazione come la vede l'admin nella bacheca (righe della RPC).
export interface Segnalazione {
  id: string
  quando: string // ISO, formattata in fase di render
  titolo: string
  descrizione: string
  area: AreaSegnalazione
  stato: StatoSegnalazione
  browser: string // user agent grezzo di chi ha segnalato
  autore: string
  email: string
}

export interface EsitoInvio {
  ok: boolean
  error?: string
}

export function etichettaArea(a: AreaSegnalazione | string): string {
  return AREE.find((x) => x.value === a)?.label ?? 'Altro / non so dire'
}
export function etichettaStato(s: StatoSegnalazione | string): string {
  return STATI.find((x) => x.value === s)?.label ?? 'Nuova'
}
export function coloreStato(s: StatoSegnalazione | string): string {
  return STATI.find((x) => x.value === s)?.color ?? '#FF6B35'
}

/**
 * Il primo messaggio d'errore che il form deve mostrare, o `null` se la
 * segnalazione è spedibile. Funzione pura: è quella che i test interrogano.
 */
export function validaSegnalazione(s: NuovaSegnalazione): string | null {
  const titolo = s.titolo.trim()
  const descrizione = s.descrizione.trim()
  if (titolo.length < TITOLO_MIN) return 'Scrivi un titolo (almeno 3 caratteri).'
  if (titolo.length > TITOLO_MAX) return `Il titolo è troppo lungo (massimo ${TITOLO_MAX} caratteri).`
  if (descrizione.length < DESCRIZIONE_MIN) return 'Descrivi il problema: cosa stavi facendo e cosa è successo.'
  if (descrizione.length > DESCRIZIONE_MAX) return `La descrizione è troppo lunga (massimo ${DESCRIZIONE_MAX} caratteri).`
  return null
}

// Il browser di chi segnala, tagliato al limite del CHECK. Non è
// identificazione: è il minimo per capire se un bug è di Safari o di tutti.
function browserCorrente(): string {
  if (typeof navigator === 'undefined') return ''
  return (navigator.userAgent || '').slice(0, 400)
}

/**
 * Salva la segnalazione. Ritorna `{ok:false, error}` con un messaggio già
 * pronto da mostrare: il form non deve interpretare errori Postgres.
 */
export async function inviaSegnalazione(s: NuovaSegnalazione): Promise<EsitoInvio> {
  const errore = validaSegnalazione(s)
  if (errore) return { ok: false, error: errore }

  const { data: auth } = await supabase.auth.getSession()
  const uid = auth.session?.user?.id
  if (!uid) return { ok: false, error: 'Sessione non valida: esci e rientra, poi riprova.' }

  const { error } = await supabase.from('bug_reports').insert({
    user_id: uid,
    title: s.titolo.trim(),
    description: s.descrizione.trim(),
    area: s.area,
    user_agent: browserCorrente(),
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[segnalazioni] invia', error)
    return { ok: false, error: 'Non è stato possibile inviare la segnalazione. Riprova tra poco.' }
  }
  track('segnalazione_inviata', { area: s.area })
  return { ok: true }
}

// Forma grezza di una riga della RPC (snake_case, come la emette il DB).
interface RigaSegnalazione {
  id: string
  created_at: string
  title: string
  description: string
  area: string
  status: string
  user_agent: string
  reporter_name: string
  reporter_email: string
}

/** Riga della RPC → modello della bacheca. Esportata per i test. */
export function mapSegnalazione(r: RigaSegnalazione): Segnalazione {
  return {
    id: r.id,
    quando: r.created_at,
    titolo: r.title,
    descrizione: r.description,
    area: (AREE.some((a) => a.value === r.area) ? r.area : 'altro') as AreaSegnalazione,
    stato: (STATI.some((s) => s.value === r.status) ? r.status : 'nuovo') as StatoSegnalazione,
    browser: r.user_agent,
    autore: r.reporter_name,
    email: r.reporter_email,
  }
}

/**
 * Tutte le segnalazioni (solo admin: il cancello è lato DB). `null` = errore di
 * rete; una bacheca vuota è `[]`, che è un esito valido.
 */
export async function elencoSegnalazioni(): Promise<Segnalazione[] | null> {
  const { data, error } = await supabase.rpc('bug_reports_list')
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[segnalazioni] elenco', error)
    return null
  }
  return (data ?? []).map(mapSegnalazione)
}

/** Fa avanzare lo stato di una segnalazione (solo admin, per RLS). */
export async function aggiornaStato(id: string, stato: StatoSegnalazione): Promise<boolean> {
  const { error } = await supabase.from('bug_reports').update({ status: stato }).eq('id', id)
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[segnalazioni] aggiornaStato', error)
    return false
  }
  return true
}
