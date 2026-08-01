import { useSyncExternalStore } from 'react'
import Clarity from '@microsoft/clarity'

// ============================================================================
// Consenso ai cookie / al tracciamento.
//
// Il principio che regge tutto il file: **niente parte prima della scelta**.
// Non si carica Clarity e poi lo si mette a tacere — non si carica proprio.
// È l'unica versione che non lascia zone grigie: se lo script non è mai stato
// iniettato, non c'è nulla da revocare.
//
// Cosa NON passa da qui, perché è tecnicamente necessario e senza non c'è app:
//   · la sessione Supabase in localStorage (sei loggato o non lo sei)
//   · il service worker della landing (installazione e pagina offline)
// Il resto — misurazione e registrazione delle sessioni — è opt-in.
//
// ⚠️ Questo file implementa la MECCANICA del consenso. L'informativa, le
// categorie che vuoi davvero offrire e la conformità sono decisioni tue.
// ============================================================================

export type Scelta = 'accettato' | 'rifiutato'

/**
 * Alza questo numero quando cambia COSA raccogli (un nuovo strumento, una
 * finalità in più): le scelte salvate con una versione precedente non valgono
 * più e il banner ricompare. Un consenso dato per Clarity non copre il
 * prossimo strumento che aggiungerai.
 */
export const CONSENSO_VERSIONE = 1

const CHIAVE = 'bvd_consenso_cookie'

// Id di progetto Clarity: pubblico per costruzione (finisce comunque nel
// bundle). Sta qui e non in main.tsx perché qui c'è l'unico punto che ha il
// diritto di accenderlo.
const CLARITY_PROJECT_ID = 'xup74f9x8b'

interface Registrato {
  v: number
  scelta: Scelta
  quando: string // ISO, utile se un domani devi dimostrare quando è stato dato
}

function leggiDaStorage(): Scelta | null {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (!raw) return null
    const r = JSON.parse(raw) as Registrato
    // Versione vecchia = scelta scaduta: si richiede.
    if (r?.v !== CONSENSO_VERSIONE) return null
    return r.scelta === 'accettato' || r.scelta === 'rifiutato' ? r.scelta : null
  } catch {
    // Safari in navigazione privata, storage pieno, JSON corrotto: in dubbio
    // si tratta come "non ha ancora scelto", che è lo stato che non traccia.
    return null
  }
}

let corrente: Scelta | null = typeof window === 'undefined' ? null : leggiDaStorage()

// Pub/sub minimo: serve a `useSyncExternalStore` per far reagire la UI senza
// montare un altro provider React attorno all'app.
const ascoltatori = new Set<() => void>()

export function sottoscrivi(fn: () => void): () => void {
  ascoltatori.add(fn)
  return () => { ascoltatori.delete(fn) }
}

/** La scelta corrente, o `null` se non è ancora stata fatta. */
export function sceltaCorrente(): Scelta | null {
  return corrente
}

/** `true` solo con un sì esplicito: l'assenza di scelta non è un consenso. */
export function analiticiAttivi(): boolean {
  return corrente === 'accettato'
}

// `window.clarity` esiste solo dopo che lo script remoto ha caricato. Il
// pacchetto npm lo chiama senza try/catch, quindi qui si controlla prima.
function clarityCaricato(): boolean {
  return typeof (window as { clarity?: unknown }).clarity === 'function'
}

function accendi(): void {
  // In sviluppo non si traccia mai: le registrazioni sarebbero quasi tutte
  // nostre e sporcherebbero le sessioni vere.
  if (!import.meta.env.PROD) return
  // `init` è idempotente: il pacchetto controlla se lo script c'è già.
  Clarity.init(CLARITY_PROJECT_ID)
  if (clarityCaricato()) Clarity.consent(true)
}

function spegni(): void {
  // Se lo script era già stato caricato in questa sessione (l'utente ha
  // accettato e poi cambiato idea) non lo si può disinstallare: gli si dice di
  // smettere di usare cookie. Dal caricamento successivo non partirà proprio.
  if (clarityCaricato()) Clarity.consent(false)
}

function scrivi(scelta: Scelta | null): void {
  try {
    if (scelta === null) localStorage.removeItem(CHIAVE)
    else localStorage.setItem(CHIAVE, JSON.stringify({ v: CONSENSO_VERSIONE, scelta, quando: new Date().toISOString() } satisfies Registrato))
  } catch {
    // Storage non disponibile: la scelta vale per questa sessione e basta.
    // Meglio un banner che ricompare che un consenso finto.
  }
}

function annuncia(): void {
  ascoltatori.forEach((fn) => fn())
}

/** Registra la scelta dell'utente e applica subito le conseguenze. */
export function decidi(scelta: Scelta): void {
  corrente = scelta
  scrivi(scelta)
  if (scelta === 'accettato') accendi()
  else spegni()
  annuncia()
}

/** Torna a "non ha ancora scelto": il banner ricompare. Usato dal Profilo. */
export function riapriScelta(): void {
  corrente = null
  scrivi(null)
  spegni()
  annuncia()
}

/**
 * Da chiamare una volta all'avvio: riaccende il tracciamento se l'utente aveva
 * già acconsentito in una visita precedente. Senza consenso non fa nulla —
 * ed è questa la ragione per cui il banner blocca davvero.
 */
export function avviaTracciamentoSeConsentito(): void {
  if (analiticiAttivi()) accendi()
}

/**
 * Lettura reattiva della scelta: `null` finché l'utente non ha deciso.
 * `useSyncExternalStore` invece di un provider React — lo stato è uno solo per
 * tutta l'app e non ha senso farlo scendere dall'albero.
 */
export function useScelta(): Scelta | null {
  return useSyncExternalStore(sottoscrivi, sceltaCorrente, () => null)
}
