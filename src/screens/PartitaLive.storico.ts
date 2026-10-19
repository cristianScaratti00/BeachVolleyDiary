// ============================================================================
// Lo storico delle partite TRA AMICI: le ultime 20 finite, su questo telefono.
//
// Una partita tra amici non ha un torneo, e nel database una partita senza
// torneo non può stare. Ma chi gioca con gli amici e si dimentica i punti
// vuole ritrovarli: restano qui, in localStorage, finché non li cancella.
//
// Regole:
//   - ci sta una partita FINITA (il riepilogo); se la si riapre esce, e torna
//     quando finisce di nuovo: la chiave è l'id, quindi niente doppioni;
//   - dalla più recente, al massimo 20: la ventunesima spinge fuori la più
//     vecchia;
//   - una chiave per account (`utente`): su un browser condiviso le partite
//     di uno non le vede l'altro;
//   - ogni lettura e scrittura in try/catch (navigazione privata, memoria
//     piena): lo storico è una comodità, la partita non si blocca mai per lui;
//   - in lettura si scarta la voce rotta, non tutto lo storico.
// ============================================================================
import { dataRelativa } from '../app/selectors'

export const CHIAVE_STORICO = 'bvd_partite_amici'
export const MAX_STORICO = 20

export interface SetGiocato {
  us: number
  them: number
}

export interface PartitaAmici {
  id: string
  /** Quando è finita (ISO, istante). */
  quando: string
  /** Il compagno scritto a mano; '' = la coppia è «Noi». */
  compagno: string
  /** Gli avversari; '' = «Loro». */
  avversari: string
  set: SetGiocato[]
}

export type EsitoAmici = 'vinta' | 'persa' | 'pari'

const chiave = (utente?: string | null) => (utente ? `${CHIAVE_STORICO}:${utente}` : CHIAVE_STORICO)

const intero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 1000
const testo = (x: unknown) => (typeof x === 'string' ? x.slice(0, 80) : '')

/** Una voce letta dalla memoria, se è sana. */
function voce(x: unknown): PartitaAmici | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Partial<PartitaAmici>
  if (typeof p.id !== 'string' || !p.id || typeof p.quando !== 'string' || Number.isNaN(Date.parse(p.quando))) return null
  if (!Array.isArray(p.set) || p.set.length < 1 || p.set.length > 3) return null
  if (!p.set.every((s) => intero(s?.us) && intero(s?.them))) return null
  return { id: p.id, quando: p.quando, compagno: testo(p.compagno), avversari: testo(p.avversari), set: p.set.map((s) => ({ us: s.us, them: s.them })) }
}

const perData = (a: PartitaAmici, b: PartitaAmici) => Date.parse(b.quando) - Date.parse(a.quando)

// ------------------------------------------------------------------- puri
/** Lo storico con questa partita: al suo posto se c'era, dalla più recente, massimo 20. */
export function conPartita(lista: PartitaAmici[], p: PartitaAmici): PartitaAmici[] {
  return [p, ...lista.filter((x) => x.id !== p.id)].sort(perData).slice(0, MAX_STORICO)
}

/** Chi ha vinto: per set vinti, e una partita pari se nessuno ne ha di più. */
export function esitoAmici(set: SetGiocato[]): EsitoAmici {
  const noi = set.filter((s) => s.us > s.them).length
  const loro = set.filter((s) => s.them > s.us).length
  return noi > loro ? 'vinta' : loro > noi ? 'persa' : 'pari'
}

/** «Tu e Luca» se c'è il compagno, altrimenti «Noi». */
export const nomeNoi = (compagno: string) => (compagno.trim() ? `Tu e ${compagno.trim()}` : 'Noi')
/** Gli avversari scritti, altrimenti «Loro». */
export const nomeLoro = (avversari: string) => avversari.trim() || 'Loro'

const due = (n: number) => String(n).padStart(2, '0')
/** La data del calendario di qui (non UTC): una partita alle 00:30 è di oggi. */
const giornoLocale = (d: Date) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`

/** «Oggi, 18:40», «Ieri, 19:05», «3 giorni fa, 18:40», «Sab 11 ott, 18:40». */
export function quandoDetto(quando: string, ora = new Date()): string {
  const d = new Date(quando)
  if (Number.isNaN(d.getTime())) return ''
  const giorno = dataRelativa(giornoLocale(d), giornoLocale(ora))
  return `${giorno.charAt(0).toUpperCase()}${giorno.slice(1)}, ${due(d.getHours())}:${due(d.getMinutes())}`
}

// ---------------------------------------------------------------- memoria
export function leggiStorico(utente?: string | null): PartitaAmici[] {
  try {
    const raw = window.localStorage.getItem(chiave(utente))
    if (!raw) return []
    const lista: unknown = JSON.parse(raw)
    if (!Array.isArray(lista)) return []
    return lista
      .map(voce)
      .filter((p): p is PartitaAmici => !!p)
      .sort(perData)
      .slice(0, MAX_STORICO)
  } catch {
    return []
  }
}

function scrivi(lista: PartitaAmici[], utente?: string | null) {
  try {
    if (lista.length) window.localStorage.setItem(chiave(utente), JSON.stringify(lista))
    else window.localStorage.removeItem(chiave(utente))
  } catch {
    /* navigazione privata o memoria piena: lo storico resta in pagina */
  }
}

/** Mette (o rimette) una partita finita nello storico; restituisce lo storico nuovo. */
export function registraPartita(p: PartitaAmici, utente?: string | null): PartitaAmici[] {
  const lista = conPartita(leggiStorico(utente), p)
  scrivi(lista, utente)
  return lista
}

/** Toglie una partita (eliminata, riaperta o salvata in un torneo). */
export function togliPartita(id: string, utente?: string | null): PartitaAmici[] {
  const lista = leggiStorico(utente).filter((p) => p.id !== id)
  scrivi(lista, utente)
  return lista
}

export function svuotaStorico(utente?: string | null) {
  scrivi([], utente)
}

/** Un id che non si ripete fra le partite di questo telefono. */
export function nuovoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
