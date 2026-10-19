// ============================================================================
// Selettori dell'app web (UX §5, §6). Stanno qui e non in `lib/derive.ts`, che
// è condiviso con l'app mobile e non si tocca: sono regole di questa
// interfaccia (cosa mostrare "adesso" in Home, dove va una partita nuova), non
// del dominio. Puri, con "oggi" iniettabile, testati in selectors.test.ts.
// ============================================================================
import { computeStats, placementRank, res, streakOf } from '../lib/stats'
import { matchesWithDates, normalizeCity, todayISO, venueOf } from '../lib/derive'
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

// ============================================================================
// Home del redesign: il titolo-frase, i consigli di Pallo, gli ultimi tornei,
// le stagioni del segmented, le iniziali dell'avatar. Tutto su `data` intero:
// i filtri (stagione, compagno) muovono i NUMERI della Home, non la voce di
// Pallo né la frase, che parlano di come stai andando adesso.
// ============================================================================

/** Le partite in ordine di tempo: data del torneo, a parità l'ordine del diario. */
function partiteNelTempo(data: DiaryData) {
  // `sort` è stabile: le partite dello stesso torneo restano nell'ordine in cui
  // sono state registrate (lo stesso di `streakOf`).
  return matchesWithDates(data).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export type Forma = 'nessuna' | 'poche' | 'meglio' | 'peggio' | 'pari'

/** Sotto queste partite il confronto «adesso contro prima» non dice niente. */
export const FORMA_MIN = 6
/** Lo scarto di win rate (punti percentuali) che fa dire «meglio» o «peggio». */
export const FORMA_SOGLIA = 10

/**
 * La forma recente: le ultime partite (metà del diario, al massimo 10) contro
 * tutte quelle di prima. `recente` e `prima` sono win rate in %.
 */
export function formaRecente(data: DiaryData): { forma: Forma; recente: number; prima: number } {
  const ms = partiteNelTempo(data)
  const n = ms.length
  if (n === 0) return { forma: 'nessuna', recente: 0, prima: 0 }
  if (n < FORMA_MIN) return { forma: 'poche', recente: 0, prima: 0 }
  const k = Math.min(10, Math.floor(n / 2))
  const pct = (xs: typeof ms) => Math.round((xs.filter((m) => res(m).won).length / xs.length) * 100)
  const recente = pct(ms.slice(n - k))
  const prima = pct(ms.slice(0, n - k))
  const d = recente - prima
  const forma: Forma = d >= FORMA_SOGLIA ? 'meglio' : d <= -FORMA_SOGLIA ? 'peggio' : 'pari'
  return { forma, recente, prima }
}

/** «Ciao, Marta.»: solo il primo nome, il titolo è una frase e non un'intestazione. */
export function saluto(nome: string): string {
  const primo = nome.trim().split(/\s+/)[0]
  return primo ? `Ciao, ${primo}.` : 'Ciao.'
}

/**
 * Il titolo della Home: una frase su come stai andando. Senza partite (o con
 * troppo poche per un confronto) è il saluto.
 */
export function fraseHome(data: DiaryData, nome: string): string {
  const { forma } = formaRecente(data)
  switch (forma) {
    case 'meglio':
      return 'Stai vincendo più di prima.'
    case 'peggio':
      return 'Ultimamente è più dura.'
    case 'pari': {
      const s = computeStats(data.matches)
      return s.winPct >= 50 ? 'Stai tenendo il ritmo.' : 'Si cresce, partita dopo partita.'
    }
    default:
      return saluto(nome)
  }
}

/** Le vittorie di fila in corso (dall'ultima partita all'indietro). */
export function serieInCorso(data: DiaryData): number {
  const ms = partiteNelTempo(data)
  let n = 0
  for (let i = ms.length - 1; i >= 0 && res(ms[i]).won; i--) n++
  return n
}

/**
 * Dove sei andato meglio: fra le città dove sei salito sul podio almeno due
 * volte, quella con più tornei vinti, poi con più podi. Un risultato solo non
 * fa un «posto magico».
 */
export function postoMagico(data: DiaryData): { citta: string; vinti: number; podi: number } | null {
  const posti = new Map<string, { citta: string; vinti: number; podi: number }>()
  for (const t of data.tournaments) {
    const v = venueOf(data, t)
    const citta = (v?.city || t.city || v?.name || '').trim()
    if (!citta) continue
    const r = placementRank(t.placement)
    if (r > 3) continue
    const key = normalizeCity(citta)
    const p = posti.get(key) ?? { citta, vinti: 0, podi: 0 }
    if (r === 1) p.vinti++
    p.podi++
    posti.set(key, p)
  }
  return [...posti.values()]
    .filter((p) => p.podi >= 2)
    .sort((a, b) => b.vinti - a.vinti || b.podi - a.podi || a.citta.localeCompare(b.citta, 'it'))[0] ?? null
}

/** Cosa si fa dalla nuvoletta di Pallo. La schermata decide come (callback o link). */
export type AzioneConsiglio =
  | { tipo: 'partita' | 'piazzamento' | 'storia'; torneoId: string; label: string }
  | { tipo: 'nuovoTorneo'; label: string }
  | { tipo: 'link'; to: Route; label: string }

export interface Consiglio {
  /** Stabile finché il consiglio dice la stessa cosa: la chiave della nuvoletta. */
  id: string
  testo: string
  azione?: AzioneConsiglio
}

const vittorie = (n: number) => (n === 1 ? '1 vittoria' : `${n} vittorie`)

/**
 * I consigli di Pallo, dal più urgente: cosa fare oggi, cosa manca nel
 * diario, poi i numeri da festeggiare e i promemoria. Un tocco su Pallo passa
 * al successivo. Ce n'è sempre almeno uno.
 */
export function deriveConsigli(data: DiaryData, opts: { today?: string; adesso?: AdessoData; wrapped?: boolean } = {}): Consiglio[] {
  const today = opts.today ?? todayISO()
  if (data.tournaments.length === 0) {
    return [{
      id: 'primo-torneo',
      testo: 'Registra il primo torneo: bastano il nome e la data, il resto lo aggiungi dopo.',
      azione: { tipo: 'nuovoTorneo', label: 'Crea il primo torneo' },
    }]
  }
  const adesso = opts.adesso ?? deriveAdesso(data, today)
  const out: Consiglio[] = []

  if (adesso.oggi) {
    out.push({
      id: `oggi:${adesso.oggi.id}`,
      testo: `Oggi si gioca: «${adesso.oggi.name}». Segna le partite man mano, ai numeri ci penso io.`,
      azione: { tipo: 'partita', torneoId: adesso.oggi.id, label: 'Aggiungi partita' },
    })
  }
  if (adesso.daChiudere) {
    out.push({
      id: `chiudi:${adesso.daChiudere.id}`,
      testo: `Com'è andata a «${adesso.daChiudere.name}»?`,
      azione: { tipo: 'piazzamento', torneoId: adesso.daChiudere.id, label: 'Aggiorna il piazzamento' },
    })
  }
  if (data.matches.length === 0 && !adesso.oggi) {
    const dest = partitaDestinazione(data, { name: 'home' }, today)
    if (dest) {
      out.push({
        id: `prima-partita:${dest.id}`,
        testo: 'Aggiungi la prima partita: i tuoi numeri partono da lì.',
        azione: { tipo: 'partita', torneoId: dest.id, label: 'Aggiungi partita' },
      })
    }
  }

  const record = streakOf(matchesWithDates(data))
  const inCorso = serieInCorso(data)
  if (record >= 3 && inCorso === record) {
    out.push({ id: `serie:${record}`, testo: `${vittorie(record)} di fila: è il tuo record. Non fermarti adesso!` })
  } else if (inCorso >= 3) {
    out.push({ id: `serie:${inCorso}/${record}`, testo: `${vittorie(inCorso)} di fila. Il record è ${record}: ci sei quasi.` })
  } else if (record >= 3) {
    out.push({ id: `record:${record}`, testo: `Il tuo record è di ${vittorie(record)} di fila. Si può battere.` })
  }

  const posto = postoMagico(data)
  if (posto) {
    const quanto = posto.vinti >= 2 ? `1° in ${posto.vinti} tornei` : `${posto.podi} volte sul podio`
    out.push({ id: `posto:${normalizeCity(posto.citta)}`, testo: `Il tuo posto magico? ${posto.citta}: ${quanto}.` })
  }

  if (opts.wrapped) {
    out.push({
      id: 'wrapped',
      testo: "Beach Wrapped è pronto. Ci diamo un'occhiata?",
      azione: { tipo: 'link', to: { name: 'wrapped' }, label: 'Apri Beach Wrapped' },
    })
  }

  if (adesso.ultimo) {
    const r = placementRank(adesso.ultimo.placement)
    const come = r === 1 ? 'Hai vinto' : r === 2 ? 'Secondo posto a' : r === 3 ? 'Terzo posto a' : null
    out.push({
      id: `storia:${adesso.ultimo.id}`,
      testo: come
        ? `${come} «${adesso.ultimo.name}»: lo racconti in una storia?`
        : `«${adesso.ultimo.name}» è nel diario: ne fai una storia?`,
      azione: { tipo: 'storia', torneoId: adesso.ultimo.id, label: 'Storia Instagram' },
    })
  }

  if (adesso.prossimo) {
    out.push({
      id: `prossimo:${adesso.prossimo.id}`,
      testo: `Prossimo torneo: «${adesso.prossimo.name}», ${dataRelativa(adesso.prossimo.date, today)}.`,
      azione: { tipo: 'link', to: { name: 'torneo', id: adesso.prossimo.id }, label: 'Apri il torneo' },
    })
  }

  if (out.length === 0) {
    out.push({
      id: 'nuovo',
      testo: 'Il prossimo torneo lo registriamo insieme? Il diario cresce con te.',
      azione: { tipo: 'nuovoTorneo', label: 'Nuovo torneo' },
    })
  }
  return out
}

export interface UltimoTorneo {
  id: string
  name: string
  /** Il valore del DB: lo legge la medaglia. */
  placement: string
  /** «28 giu · con Luca», senza compagno «14 ago · Amatoriale». */
  meta: string
  /** Vinte e perse nel torneo; null senza partite. */
  record: { won: number; lost: number } | null
  shared: boolean
}

/** «28 giu»: il giorno senza lo zero davanti, il mese corto. */
export function dataCorta(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`
}

/** Gli ultimi tornei giocati (fino a oggi compreso), dal più recente. */
export function ultimiTornei(data: DiaryData, today = todayISO(), n = 3): UltimoTorneo[] {
  return data.tournaments
    .filter((t) => t.date <= today)
    .sort((a, b) => piuRecentePrima(a, b) || a.name.localeCompare(b.name, 'it'))
    .slice(0, n)
    .map((t) => {
      const compagno = t.partnerId ? data.partners.find((p) => p.id === t.partnerId)?.name : undefined
      const s = computeStats(data.matches.filter((m) => m.tournamentId === t.id))
      return {
        id: t.id,
        name: t.name,
        placement: t.placement,
        meta: [dataCorta(t.date), compagno ? `con ${compagno}` : t.category].filter(Boolean).join(' · '),
        record: s.played > 0 ? { won: s.won, lost: s.lost } : null,
        shared: t.shared,
      }
    })
}

/**
 * Le stagioni del segmented della Home: «Sempre» e le ultime `max`. Quella
 * scelta altrove (Statistiche) resta visibile al posto dell'ultima: il
 * segmented non deve mai avere la selezione fuori vista.
 */
export function stagioniHome(yearOptions: string[], fYear: string, max = 2): string[] {
  const anni = yearOptions.filter((y) => y !== 'Sempre')
  const visibili = anni.slice(0, max)
  if (fYear !== 'Sempre' && anni.includes(fYear) && !visibili.includes(fYear)) visibili[visibili.length - 1] = fYear
  return ['Sempre', ...visibili]
}

/** «CS» da «Cristian Scaratti», «M» da «Marta», «?» senza nome. */
export function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean)
  const prima = (s: string) => Array.from(s)[0]?.toUpperCase() ?? ''
  if (parole.length === 0) return '?'
  if (parole.length === 1) return prima(parole[0])
  return prima(parole[0]) + prima(parole[parole.length - 1])
}

/** Tutto ciò che la Home deriva dal diario, in una chiamata (App, anteprima, test). */
export interface HomeVista {
  frase: string
  consigli: Consiglio[]
  ultimi: UltimoTorneo[]
  hasTornei: boolean
  /** Il diario ha almeno una partita, in qualunque periodo. */
  haPartite: boolean
}

export function deriveHome(data: DiaryData, opts: { nome: string; today?: string; wrapped?: boolean }): HomeVista {
  const today = opts.today ?? todayISO()
  return {
    frase: fraseHome(data, opts.nome),
    consigli: deriveConsigli(data, { today, wrapped: opts.wrapped }),
    ultimi: ultimiTornei(data, today),
    hasTornei: data.tournaments.length > 0,
    haPartite: data.matches.length > 0,
  }
}

/**
 * La riga sotto il titolo di una voce del Diario, come nel redesign:
 * «Rimini · Amatoriale · 2° · Silver · con Luca». Il piazzamento manca finché
 * il torneo è in corso; il trofeo del «1° 🏆» è del dato, non del testo.
 */
export function metaDiario(data: DiaryData, tournamentId: string): string | undefined {
  const t = data.tournaments.find((x) => x.id === tournamentId)
  if (!t) return undefined
  const luogo = data.venues.find((v) => v.id === t.venueId)
  const posto = t.placement.replace(/\s*🏆\s*/u, ' ').trim()
  const compagno = t.partnerId ? data.partners.find((p) => p.id === t.partnerId)?.name : undefined
  return [
    luogo?.city || t.city,
    t.category,
    posto && posto !== 'In corso' ? (t.bracket ? `${posto} · ${t.bracket}` : posto) : '',
    compagno ? `con ${compagno}` : '',
  ]
    .filter((x) => x && x.trim())
    .join(' · ')
}

/**
 * Beach Wrapped si apre SOLO a ottobre: a stagione chiusa, un mese per
 * riguardarla e condividerla (scelta di prodotto). La regola della lib
 * condivisa col mobile (`wrappedDisponibile`, settembre–aprile) resta com'è:
 * questa la restringe per il web. `today` è iniettabile per i test.
 */
export function wrappedAOttobre(today = todayISO()): boolean {
  return today.slice(5, 7) === '10'
}
