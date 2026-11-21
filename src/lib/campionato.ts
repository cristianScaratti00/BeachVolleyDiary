// ============================================================================
// Campionato Italiano per Società (CIPS, FIPAV): il dominio e i suoi numeri.
//
// Nel CIPS non ci sono incontri fra società: è un circuito di tornei 2vs2 (le
// «tappe») in cui ogni coppia gioca per la sua società, e la società somma i
// 3 migliori piazzamenti delle sue coppie in ogni tappa. Qui la tappa è un
// torneo con i campi della FIPAV: tipo, categoria, set a 15 o a 21,
// piazzamento in numero, punti di coppia e punti portati alla società.
//
// SEPARATO dalle statistiche (scelta dell'utente, 21/11/2026): niente di
// questo file entra in `derive.ts`, `stats.ts` o nelle RPC. Le tappe stanno in
// tabelle loro (supabase/migrations/20261121120000_campionato_societa.sql) e
// i loro numeri si calcolano solo qui. File nuovo e non `models.ts`, che è
// condiviso con l'app Expo.
//
// Puro: niente React, niente rete.
// ============================================================================
import { esitoStyle, setChips } from './stats'
import type { SetChip } from './stats'
import { MONTHS_FULL } from './theme'
import type { FormSet, Partner, SetScore } from './models'

// ------------------------------------------------------------ valori ammessi
// Gli stessi CHECK della migration: si cambiano insieme.
export const CIPS_TIPI = ['Tappa', 'Platinum', 'Coppa Italia', 'Finale'] as const
export const CIPS_CATEGORIE = ['Gold', 'Silver', 'Bronze', 'Beginners', 'Under', 'Master', 'Platinum'] as const
export const CIPS_FASI = ['Pool', 'Vincenti', 'Perdenti', 'Quarti', 'Semifinale', 'Finale', '3° posto', 'Classificazione'] as const
export const CIPS_ESITI = ['giocata', 'forfait_noi', 'forfait_loro'] as const
export const CIPS_GENERI = ['F', 'M'] as const
export const CIPS_SET = [15, 21] as const

export type TipoTappa = (typeof CIPS_TIPI)[number]
export type CategoriaCips = (typeof CIPS_CATEGORIE)[number]
export type FaseCips = (typeof CIPS_FASI)[number]
export type EsitoCips = (typeof CIPS_ESITI)[number]
export type Genere = (typeof CIPS_GENERI)[number]
export type PuntiSet = (typeof CIPS_SET)[number]

export const GENERE: Record<Genere, string> = { F: 'Femminile', M: 'Maschile' }
export const ESITO: Record<EsitoCips, string> = {
  giocata: 'Giocata',
  forfait_noi: 'Forfait nostro',
  forfait_loro: 'Forfait loro',
}

// ------------------------------------------------------------------ modello
/** L'iscrizione: la società per cui si gioca in una stagione FIPAV, e la classifica. */
export interface Iscrizione {
  id: string
  /** «2026/27»: la stagione FIPAV va dal 1° ottobre al 30 settembre. */
  season: string
  club: string
  gender: Genere
}

/** Una tappa giocata (o in corso). */
export interface Tappa {
  id: string
  seasonId: string
  kind: TipoTappa
  category: CategoriaCips
  date: string
  city: string
  organizer: string
  partnerId: string | null
  /** Il compagno gioca per un'altra società (coppia mista, punti divisi). */
  partnerOtherClub: boolean
  setPoints: PuntiSet
  /** null = in corso. */
  placement: number | null
  teams: number | null
  pairPoints: number | null
  countsForClub: boolean
  clubPoints: number | null
  note: string
}

export interface PartitaTappa {
  id: string
  stageId: string
  phase: FaseCips
  opponents: string
  opponentsClub: string
  outcome: EsitoCips
  note: string
  sets: SetScore[]
}

export interface CampionatoData {
  iscrizioni: Iscrizione[]
  tappe: Tappa[]
  partite: PartitaTappa[]
}

export const CAMPIONATO_VUOTO: CampionatoData = { iscrizioni: [], tappe: [], partite: [] }

// -------------------------------------------------------------------- form
/** «Nuova tappa» / «Modifica tappa». I numeri restano testo mentre si scrivono. */
export interface TappaForm {
  kind: TipoTappa
  category: CategoriaCips
  date: string
  city: string
  organizer: string
  /** '' = nessuno, 'new' = crealo da `newPartnerName`, altrimenti un id. */
  partnerId: string
  newPartnerName: string
  partnerOtherClub: boolean
  setPoints: PuntiSet
  placement: number | null
  teams: string
  pairPoints: string
  countsForClub: boolean
  clubPoints: string
  note: string
  /**
   * La società e la classifica, solo quando la stagione della data non ha
   * ancora un'iscrizione (la prima tappa, o una di una stagione passata).
   */
  club: string
  gender: Genere | ''
}

export interface PartitaTappaForm {
  stageId: string
  phase: FaseCips
  opponents: string
  opponentsClub: string
  outcome: EsitoCips
  note: string
  sets: FormSet[]
}

export interface IscrizioneForm {
  club: string
  gender: Genere
}

// ------------------------------------------------------- dal modulo al DB
/** Un numero scritto a mano: '' o non valido → null. */
export function numeroONull(s: string, max = 100000): number | null {
  const t = s.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n <= max ? n : null
}

/** La riga di `club_stages` di un modulo (senza iscrizione né compagno, che risolve chi salva). */
export function rigaTappa(f: TappaForm) {
  return {
    kind: f.kind,
    category: f.category,
    date: f.date,
    city: f.city.trim().replace(/\s+/g, ' '),
    organizer: f.organizer.trim(),
    partner_other_club: f.partnerOtherClub,
    set_points: f.setPoints,
    placement: f.placement,
    teams: numeroONull(f.teams, 999),
    pair_points: numeroONull(f.pairPoints),
    counts_for_club: f.countsForClub,
    club_points: numeroONull(f.clubPoints),
    note: f.note.trim(),
  }
}

/** I set compilati di un modulo, numerati da 1. */
export function setDelModulo(f: Pick<PartitaTappaForm, 'sets'>) {
  return f.sets
    .filter((s) => s.us !== '' && s.them !== '')
    .slice(0, 3)
    .map((s, i) => ({ set_number: i + 1, us: +s.us, them: +s.them }))
}

// --------------------------------------------------------------- stagione
/** La stagione FIPAV di una data: dal 1° ottobre al 30 settembre («2026-11-15» → «2026/27»). */
export function stagioneDi(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return ''
  const inizio = m >= 10 ? y : y - 1
  return `${inizio}/${String((inizio + 1) % 100).padStart(2, '0')}`
}

/** L'iscrizione di una stagione (la più recente, se a metà stagione si è cambiata società). */
export function iscrizioneDi(data: CampionatoData, season: string): Iscrizione | undefined {
  const tutte = data.iscrizioni.filter((i) => i.season === season)
  return tutte[tutte.length - 1]
}

/** Le iscrizioni dalla stagione più recente. A pari stagione, l'ultima aperta prima. */
export function iscrizioniOrdinate(data: CampionatoData): Iscrizione[] {
  return data.iscrizioni
    .map((x, i) => ({ x, i }))
    .sort((a, b) => b.x.season.localeCompare(a.x.season) || b.i - a.i)
    .map((o) => o.x)
}

// ------------------------------------------------------------- punti FIPAV
// Le tabelle dei regolamenti, solo dove i numeri sono scritti posizione per
// posizione (1°–5°): oltre, o per le categorie che il regolamento della
// stagione non riporta, la proposta non c'è e il campo resta da scrivere a
// mano (dal portale BVL). Fonti:
//   2025/26: Regolamento CIPS 2025/26 (05.10.2025)
//   2026/27: Indizione e Regolamento CIPS 2026/27 (agg. 09.11.2026)
const PUNTI_COPPIA: Record<string, Partial<Record<CategoriaCips, number[]>>> = {
  '2025/26': {
    Platinum: [300, 270, 240, 210, 135],
    Gold: [150, 135, 120, 105, 68],
    Silver: [60, 54, 48, 42, 27],
    Bronze: [20, 18, 16, 14, 9],
    Master: [20, 18, 16, 14, 9],
    Under: [100, 90, 80, 70, 55],
  },
  '2026/27': {
    Gold: [200, 180, 160, 140, 90],
    Silver: [70, 63, 56],
    Under: [100],
  },
}

/** I punti alla società per il piazzamento della coppia (contano i 3 migliori della società). */
const PUNTI_SOCIETA: Record<string, { senior: number[]; under?: number[] }> = {
  '2025/26': { senior: [100, 90, 80, 70, 50] },
  '2026/27': { senior: [100, 90, 80, 70, 45], under: [150, 135, 120, 105, 70] },
}

export interface PuntiProposti {
  coppia: number | null
  societa: number | null
}

/** I punti che il regolamento della stagione dà a quel piazzamento, se li scrive. */
export function puntiProposti(season: string, category: CategoriaCips, placement: number | null): PuntiProposti {
  if (!placement || placement < 1) return { coppia: null, societa: null }
  const i = placement - 1
  const coppia = PUNTI_COPPIA[season]?.[category]?.[i] ?? null
  const tab = PUNTI_SOCIETA[season]
  const scala = tab ? (category === 'Under' ? tab.under : tab.senior) : undefined
  return { coppia, societa: scala?.[i] ?? null }
}

// ---------------------------------------------------------------- Finale
/** La Finale di ogni stagione, dove il regolamento la dice. */
export const FINALI: Record<string, string> = {
  '2025/26': 'Bibione, 22–24 maggio 2026',
  '2026/27': 'Bibione, 4–6 giugno 2027',
}

/**
 * Quanti tornei di una categoria servono a un'atleta per giocare la Finale.
 * Solo le stagioni il cui regolamento lo scrive: il 2026/27 non l'ha ancora
 * pubblicato, e un numero inventato qui sarebbe un numero falso.
 */
export const SOGLIE_FINALE: Record<string, Partial<Record<CategoriaCips, number>>> = {
  '2025/26': { Gold: 4, Silver: 3, Bronze: 2 },
}

// ---------------------------------------------------------------- partite
export interface RisultatoTappa {
  /** null = non si sa (nessun set, o in parità): non entra nel record. */
  won: boolean | null
  usS: number
  themS: number
  pf: number
  pa: number
  /** Set e punti contano solo nelle partite giocate fino in fondo. */
  contaPunti: boolean
}

export function risultato(p: Pick<PartitaTappa, 'outcome' | 'sets'>): RisultatoTappa {
  let usS = 0
  let themS = 0
  let pf = 0
  let pa = 0
  for (const s of p.sets) {
    const u = +s.us || 0
    const t = +s.them || 0
    pf += u
    pa += t
    if (u > t) usS++
    else if (t > u) themS++
  }
  if (p.outcome === 'forfait_noi') return { won: false, usS, themS, pf, pa, contaPunti: false }
  if (p.outcome === 'forfait_loro') return { won: true, usS, themS, pf, pa, contaPunti: false }
  return { won: usS === themS ? null : usS > themS, usS, themS, pf, pa, contaPunti: true }
}

export interface Bilancio {
  vinte: number
  perse: number
  setV: number
  setP: number
  pf: number
  pa: number
}

export function bilancio(partite: Pick<PartitaTappa, 'outcome' | 'sets'>[]): Bilancio {
  const b: Bilancio = { vinte: 0, perse: 0, setV: 0, setP: 0, pf: 0, pa: 0 }
  for (const p of partite) {
    const r = risultato(p)
    if (r.won === true) b.vinte++
    if (r.won === false) b.perse++
    if (!r.contaPunti) continue
    b.setV += r.usS
    b.setP += r.themS
    b.pf += r.pf
    b.pa += r.pa
  }
  return b
}

// ------------------------------------------------------------------ testi
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** «2026-11-15» → «15 nov». */
export function dataCortaTappa(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MESI[m - 1]}`
}

/** «2026-11-15» → «Domenica 15 novembre 2026». */
export function dataLungaTappa(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  const s = `${GIORNI[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_FULL[m - 1]} ${y}`
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Il nome della tappa, composto dai suoi campi: «Tappa Silver · Milano», «Platinum · Albissola». */
export function nomeTappa(t: Pick<Tappa, 'kind' | 'category' | 'city'>): string {
  const testa = t.kind === 'Platinum' || t.category === 'Platinum' ? 'Platinum' : `${t.kind} ${t.category}`
  const city = t.city.trim()
  return city ? `${testa} · ${city}` : testa
}

/** «3°», «In corso». È anche il valore che legge la medaglia. */
export const posto = (placement: number | null) => (placement ? `${placement}°` : 'In corso')

/** «3–2»: il trattino del tabellone. */
const record = (b: Bilancio) => `${b.vinte}–${b.perse}`

/** «+9», «+0», «-3»: come il differenziale dei tornei. */
const piu = (n: number) => (n >= 0 ? `+${n}` : String(n))

const compagnoNome = (partners: Partner[], id: string | null) => (id ? partners.find((p) => p.id === id)?.name ?? '' : '')

// -------------------------------------------------------- pagina Campionato
export interface CampionatoRiga {
  id: string
  nome: string
  medaglia: string
  meta: string
  punti: number | null
}

export interface CampionatoCompagno {
  id: string
  nome: string
  tappe: number
  record: string
  punti: number
}

export interface CampionatoFinale {
  dove: string
  /** «3 tornei Silver giocati». */
  testo: string
  /** Quanti ne servono per la categoria più giocata; null = il regolamento non lo dice. */
  soglia: number | null
  fatti: number
  categoria: CategoriaCips
}

export interface CampionatoVista {
  /** Le iscrizioni per il selettore: «2026/27», o «2026/27 · Lido Nord» se due nella stessa stagione. */
  stagioni: { id: string; label: string }[]
  scelta: Iscrizione | null
  numeri: {
    puntiCoppia: number
    puntiSocieta: number
    tappe: number
    migliore: string | null
    record: string
    partite: number
  }
  finale: CampionatoFinale | null
  tappe: CampionatoRiga[]
  compagni: CampionatoCompagno[]
}

/** Le tappe di un'iscrizione, dalla più recente. */
function tappeDi(data: CampionatoData, seasonId: string): Tappa[] {
  return data.tappe.filter((t) => t.seasonId === seasonId).sort((a, b) => b.date.localeCompare(a.date))
}

const partiteDi = (data: CampionatoData, stageId: string) => data.partite.filter((p) => p.stageId === stageId)

/** I punti alla società di una tappa: solo se conta per la società. */
const puntiSocieta = (t: Tappa) => (t.countsForClub ? t.clubPoints ?? 0 : 0)

export function deriveCampionato(data: CampionatoData, partners: Partner[], iscrizioneId?: string | null): CampionatoVista {
  const ordinate = iscrizioniOrdinate(data)
  const perStagione = new Map<string, number>()
  ordinate.forEach((i) => perStagione.set(i.season, (perStagione.get(i.season) ?? 0) + 1))
  const stagioni = ordinate.map((i) => ({ id: i.id, label: (perStagione.get(i.season) ?? 0) > 1 ? `${i.season} · ${i.club}` : i.season }))
  const scelta = ordinate.find((i) => i.id === iscrizioneId) ?? ordinate[0] ?? null

  const tappe = scelta ? tappeDi(data, scelta.id) : []
  const tutte = tappe.flatMap((t) => partiteDi(data, t.id))
  const tot = bilancio(tutte)
  const piazzate = tappe.filter((t) => t.placement != null).map((t) => t.placement as number)

  const righe: CampionatoRiga[] = tappe.map((t) => {
    const b = bilancio(partiteDi(data, t.id))
    const con = compagnoNome(partners, t.partnerId)
    return {
      id: t.id,
      nome: nomeTappa(t),
      medaglia: posto(t.placement),
      meta: [dataCortaTappa(t.date), con && `con ${con}`, b.vinte + b.perse > 0 && record(b)].filter(Boolean).join(' · '),
      punti: t.pairPoints,
    }
  })

  // Con chi: un compagno per riga, con le tappe giocate insieme in questa iscrizione.
  const perCompagno = new Map<string, Tappa[]>()
  for (const t of tappe) {
    if (!t.partnerId) continue
    perCompagno.set(t.partnerId, [...(perCompagno.get(t.partnerId) ?? []), t])
  }
  const compagni: CampionatoCompagno[] = [...perCompagno.entries()]
    .map(([id, ts]) => {
      const b = bilancio(ts.flatMap((t) => partiteDi(data, t.id)))
      return {
        id,
        nome: compagnoNome(partners, id) || 'Compagno',
        tappe: ts.length,
        record: record(b),
        punti: ts.reduce((n, t) => n + (t.pairPoints ?? 0), 0),
      }
    })
    .sort((a, b) => b.tappe - a.tappe || b.punti - a.punti)

  return {
    stagioni,
    scelta,
    numeri: {
      puntiCoppia: tappe.reduce((n, t) => n + (t.pairPoints ?? 0), 0),
      puntiSocieta: tappe.reduce((n, t) => n + puntiSocieta(t), 0),
      tappe: tappe.length,
      migliore: piazzate.length ? posto(Math.min(...piazzate)) : null,
      record: record(tot),
      partite: tot.vinte + tot.perse,
    },
    finale: scelta ? finale(scelta.season, tappe) : null,
    tappe: righe,
    compagni,
  }
}

/** «Verso la Finale»: la categoria più giocata nelle tappe (non Finale) della stagione. */
function finale(season: string, tappe: Tappa[]): CampionatoFinale | null {
  const dove = FINALI[season]
  if (!dove) return null
  const conteggio = new Map<CategoriaCips, number>()
  for (const t of tappe) {
    if (t.kind === 'Finale') continue
    conteggio.set(t.category, (conteggio.get(t.category) ?? 0) + 1)
  }
  const [categoria, fatti] = [...conteggio.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!categoria || !fatti) return null
  return {
    dove,
    testo: `${fatti === 1 ? '1 torneo' : `${fatti} tornei`} ${categoria} ${fatti === 1 ? 'giocato' : 'giocati'}`,
    soglia: SOGLIE_FINALE[season]?.[categoria] ?? null,
    fatti,
    categoria,
  }
}

// ------------------------------------------------------- dettaglio tappa
export interface TappaPartitaVista {
  id: string
  esitoShort: string
  esitoColor: string
  titolo: string
  dettaglio: string
  sets: SetChip[]
  note: string
}

export interface TappaVista {
  id: string
  nome: string
  medaglia: string
  kicker: string
  sottotitolo: string
  tag: string[]
  numeri: {
    puntiCoppia: string
    societa: string
    record: string
    partite: number
    set: string
    diff: string
  }
  conPartite: boolean
  partite: TappaPartitaVista[]
}

const ORDINE_FASI: Record<FaseCips, number> = {
  Finale: 0,
  '3° posto': 1,
  Semifinale: 2,
  Quarti: 3,
  Classificazione: 4,
  Perdenti: 5,
  Vincenti: 6,
  Pool: 7,
}

export function deriveTappa(data: CampionatoData, partners: Partner[], id: string): TappaVista | null {
  const t = data.tappe.find((x) => x.id === id)
  if (!t) return null
  const isc = data.iscrizioni.find((i) => i.id === t.seasonId)
  const club = isc?.club.trim() ?? ''
  // Dall'ultima fase alla prima (come nel dettaglio dei tornei); a pari fase
  // l'ultima aggiunta in cima.
  const partite = partiteDi(data, t.id)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => ORDINE_FASI[a.p.phase] - ORDINE_FASI[b.p.phase] || b.i - a.i)
    .map((o) => o.p)
  const b = bilancio(partite)
  const con = compagnoNome(partners, t.partnerId)
  const genere = isc ? ` ${isc.gender}` : ''

  const tag = [
    t.placement && t.teams ? `${posto(t.placement)} su ${t.teams} coppie` : null,
    t.organizer.trim() ? `Organizza ${t.organizer.trim()}` : null,
    club || null,
    t.countsForClub ? null : 'Non conta per la società',
  ].filter((x): x is string => !!x)

  return {
    id: t.id,
    nome: nomeTappa(t),
    medaglia: posto(t.placement),
    kicker: `${t.kind} · ${t.category}${genere} · set a ${t.setPoints}`,
    sottotitolo: [dataLungaTappa(t.date), con && `con ${con}`].filter(Boolean).join(' · '),
    tag,
    numeri: {
      puntiCoppia: t.pairPoints != null ? `+${t.pairPoints}` : '—',
      societa: t.countsForClub && t.clubPoints != null ? String(t.clubPoints) : '—',
      record: record(b),
      partite: partite.length,
      set: `${b.setV}–${b.setP}`,
      diff: piu(b.pf - b.pa),
    },
    conPartite: partite.length > 0,
    partite: partite.map((p) => {
      const r = risultato(p)
      const es = r.won == null ? { short: '–', color: 'rgba(27,42,74,.4)' } : esitoStyle(r.won)
      const loro = p.opponentsClub.trim()
      const stessa = !!club && !!loro && loro.toLowerCase() === club.toLowerCase()
      const forfait = p.outcome === 'forfait_noi' ? 'forfait nostro' : p.outcome === 'forfait_loro' ? 'forfait loro' : ''
      return {
        id: p.id,
        esitoShort: es.short,
        esitoColor: es.color,
        titolo: `${p.phase} · vs ${p.opponents.trim() || 'Avversarie'}`,
        dettaglio: [loro, stessa && 'stessa società', forfait].filter(Boolean).join(' · '),
        sets: setChips(p),
        note: p.note,
      }
    }),
  }
}

// ----------------------------------------------- ingressi da altre schermate
/** La card in Tornei e la riga in Statistiche: l'iscrizione più recente. */
export interface CampionatoIngresso {
  stagione: string
  club: string
  tappe: number
  punti: number
}

export function campionatoIngresso(data: CampionatoData): CampionatoIngresso | null {
  const isc = iscrizioniOrdinate(data)[0]
  if (!isc) return null
  const tappe = data.tappe.filter((t) => t.seasonId === isc.id)
  return { stagione: isc.season, club: isc.club, tappe: tappe.length, punti: tappe.reduce((n, t) => n + (t.pairPoints ?? 0), 0) }
}

/** La tappa più recente fino a oggi: la destinazione di «Partita» nel ＋, se è più recente dei tornei. */
export function ultimaTappa(data: CampionatoData, today: string): Tappa | null {
  return data.tappe.filter((t) => t.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
}
