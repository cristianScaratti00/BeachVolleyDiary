// ============================================================================
// Selettori dell'app web (UX §5, §6). Stanno qui e non in `lib/derive.ts`, che
// è condiviso con l'app mobile e non si tocca: sono regole di questa
// interfaccia (cosa mostrare "adesso" in Home, dove va una partita nuova), non
// del dominio. Puri, con "oggi" iniettabile, testati in selectors.test.ts.
// ============================================================================
import { placementRank } from '../lib/stats'
import { todayISO } from '../lib/derive'
import type { DiaryData, Tournament } from '../lib/models'
import type { Route } from './routes'
import { dataTone } from '../lib/theme'

/** «In corso»: un torneo non ancora chiuso (Q12). */
const IN_CORSO = 'In corso'

const propri = (data: DiaryData) => data.tournaments.filter((t) => !t.shared)
const piuRecentePrima = (a: Tournament, b: Tournament) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

/**
 * Dove va una partita nuova (UX §5 F3), in quest'ordine:
 *   1. sei sul dettaglio di un torneo tuo → quello;
 *   2. un tuo torneo con data = oggi → quello (il primo in ordine agenda);
 *   3. un tuo torneo «In corso» con data ≤ oggi, il più recente;
 *   4. il tuo torneo più recente;
 *   5. nessun torneo tuo → null (la voce "Aggiungi partita" non compare).
 */
export function partitaDestinazione(data: DiaryData, route: Route, today = todayISO()): Tournament | null {
  const miei = propri(data)
  if (route.name === 'torneo') {
    const qui = miei.find((t) => t.id === route.id)
    if (qui) return qui
  }
  const oggi = miei.filter((t) => t.date === today).sort((a, b) => a.name.localeCompare(b.name))
  if (oggi.length) return oggi[0]
  const inCorso = miei.filter((t) => t.placement === IN_CORSO && t.date <= today).sort(piuRecentePrima)
  if (inCorso.length) return inCorso[0]
  const tutti = [...miei].sort(piuRecentePrima)
  return tutti[0] ?? null
}

/** Il compagno di default nello sheet (Q21): quello del tuo torneo più recente. */
export function compagnoDefault(data: DiaryData): string {
  const t = [...propri(data)].sort(piuRecentePrima).find((x) => x.partnerId)
  const id = t?.partnerId
  return id && data.partners.some((p) => p.id === id && !p.shared) ? id : ''
}

export interface AdessoTorneo {
  id: string
  name: string
  date: string
  /** Il luogo per la riga sotto il nome («Bagno 26 · Riccione» o la città). */
  place: string
  shared: boolean
}

export interface AdessoData {
  /** «Oggi giochi»: proprio, data = oggi. */
  oggi: AdessoTorneo | null
  /** «Prossimo torneo»: data futura più vicina (anche condiviso). Solo senza «oggi». */
  prossimo: AdessoTorneo | null
  /** «Ultimo risultato»: il passato più recente con un piazzamento. */
  ultimo: (AdessoTorneo & { placement: string; podio: boolean }) | null
  /** Il passato più recente è ancora «In corso»: «Com'è andata a «X»?». */
  daChiudere: AdessoTorneo | null
}

function vista(data: DiaryData, t: Tournament): AdessoTorneo {
  const v = t.venueId ? data.venues.find((x) => x.id === t.venueId) : undefined
  const place = v ? (v.city && v.city !== v.name ? `${v.name} · ${v.city}` : v.name) : t.city
  return { id: t.id, name: t.name, date: t.date, place, shared: t.shared }
}

/**
 * La sezione *Adesso* della Home (UX §6.1): ogni card compare solo se ha
 * qualcosa da dire, al massimo tre.
 */
export function deriveAdesso(data: DiaryData, today = todayISO()): AdessoData {
  const miei = propri(data)
  const oggiT = miei.filter((t) => t.date === today).sort((a, b) => a.name.localeCompare(b.name))[0]
  const futuri = data.tournaments.filter((t) => t.date > today).sort((a, b) => (a.date < b.date ? -1 : 1))
  const passati = data.tournaments.filter((t) => t.date < today).sort(piuRecentePrima)
  const ultimoPassato = passati[0]
  let ultimo: AdessoData['ultimo'] = null
  let daChiudere: AdessoTorneo | null = null
  if (ultimoPassato) {
    if (ultimoPassato.placement === IN_CORSO) {
      if (!ultimoPassato.shared) daChiudere = vista(data, ultimoPassato)
      const chiuso = passati.find((t) => t.placement !== IN_CORSO)
      if (chiuso) ultimo = { ...vista(data, chiuso), placement: chiuso.placement, podio: placementRank(chiuso.placement) <= 3 }
    } else {
      ultimo = { ...vista(data, ultimoPassato), placement: ultimoPassato.placement, podio: placementRank(ultimoPassato.placement) <= 3 }
    }
  }
  return {
    oggi: oggiT ? vista(data, oggiT) : null,
    prossimo: oggiT ? null : futuri[0] ? vista(data, futuri[0]) : null,
    ultimo,
    daChiudere,
  }
}

/** Il badge di una card della lista è da podio? (il sottotitolo conta i podi visibili) */
export function cardDaPodio(badgeBg: string): boolean {
  return dataTone(badgeBg) === 'win'
}

/** «1 torneo · 2 podi» sulle card che si vedono (difetto #1). */
export function sottotitoloTornei(cards: { badgeBg: string }[]): string {
  const n = cards.length
  const p = cards.filter((c) => cardDaPodio(c.badgeBg)).length
  return `${n} ${n === 1 ? 'torneo' : 'tornei'} · ${p} ${p === 1 ? 'podio' : 'podi'}`
}

/** «Stagione 2026» / «Sempre»: l'etichetta della stagione condivisa (Q7). */
export function etichettaStagione(fYear: string): string {
  return !fYear || fYear === 'Sempre' ? 'Sempre' : `Stagione ${fYear}`
}

const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

/** «sab 12 lug» (UX §12). Le date sono ISO senza ora: si leggono in UTC come `todayISO`. */
export function dataBreve(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return `${GIORNI[d.getUTCDay()]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`
}

/** «oggi», «domani», «ieri», «tra 3 giorni», «3 giorni fa», altrimenti «sab 12 lug». */
export function dataRelativa(iso: string, today = todayISO()): string {
  const a = Date.parse(`${iso}T00:00:00Z`)
  const b = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return iso
  const g = Math.round((a - b) / 86400000)
  if (g === 0) return 'oggi'
  if (g === 1) return 'domani'
  if (g === -1) return 'ieri'
  if (g > 1 && g <= 6) return `tra ${g} giorni`
  if (g < -1 && g >= -6) return `${-g} giorni fa`
  return dataBreve(iso)
}

/** La data di oggi per il sottotitolo della Home: «sabato 18 ottobre». */
export function oggiEsteso(today = todayISO()): string {
  const d = new Date(`${today}T00:00:00Z`)
  const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
  const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
  return `${giorni[d.getUTCDay()]} ${d.getUTCDate()} ${mesi[d.getUTCMonth()]}`
}
