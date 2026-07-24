import { res, computeStats, streakOf, placementRank, fmtDate, yearOf, esitoStyle, setChips } from './stats'
import type { SetChip } from './stats'
import { MONTHS_SHORT, MONTHS_FULL } from './theme'
import { FORMATS, PHASES, PLACEMENTS } from './db.enums'
import type { DiaryData, Tournament, Partner, Match, Option, PresentUser, Venue } from './models'
import type { ServerDashboard, ServerPhaseRow } from './dashboard'
import type { SvTorneiList, SvCompagno, SvTorneoDetail, SvCompagnoDetail, SvPresentUser } from './serverviews'

// ---------------------------------------------------------------------------
// View-model types (le forme restituite dai selettori, consumate dagli screen)
// ---------------------------------------------------------------------------
export interface TrendPoint { x: number; y: number; label: string; pct: number }
export interface PartnerRow { id: string; name: string; initial: string; winPct: number; played: number; won: number; barW: string }
export interface PhaseRow { phase: string; winPct: number; played: number; won: number; barW: string }
export interface PlacementBar { label: string; count: number; barW: string; color: string }

export interface DashboardStats {
  periodLabel: string
  headline: string
  subline: string
  winPct: number
  won: number
  lost: number
  played: number
  setPct: number
  diffStr: string
  pf: number
  pa: number
  avgFor: number
  avgAg: number
  tWon: number
  tPlayed: number
  podi: number
  bestPlacement: string
  streak: number
  trendLine: string
  trendArea: string
  trendPts: TrendPoint[]
  trendHasData: boolean
  trendLabel: string
  trendColor: string
  donutDash: string
  barForW: string
  barAgW: string
  partnerRows: PartnerRow[]
  phaseRows: PhaseRow[]
  placementDist: PlacementBar[]
}

export interface TorneoCard {
  id: string
  name: string
  category: string
  // `format` e `date` restano `string` come `category`, che è la convenzione dei
  // view-model qui. Il path RPC li riceve già come `string`, e un cast alla union
  // mentirebbe se il CHECK a DB venisse allargato. Sono obbligatori di proposito:
  // dimenticare un punto di costruzione rompe il typecheck.
  format: string // '2vs2' | '3vs3' | '4vs4' — raggruppa e filtra la lista tornei
  date: string // ISO 'YYYY-MM-DD' — separa gli imminenti dai passati
  dot: string
  badge: string
  badgeBg: string
  badgeColor: string
  meta: string
  record: string
  winPct: number
  matchCount: number
  shared: boolean
}

export interface DashboardData { s: DashboardStats; recent: TorneoCard[] }
export interface TorneiListData { tornei: TorneoCard[]; tPlayed: number; podi: number; bestPlacement: string }
// Una sezione della lista tornei: `key` identifica il gruppo, `label` è ciò che
// si legge nell'intestazione.
export interface TorneoGroup { key: string; label: string; tornei: TorneoCard[] }
// Tutto ciò che serve a disegnare la lista tornei con filtro e sezioni. Lo
// screen si limita a renderizzarlo: le regole (quali chip mostrare, cosa fare di
// un filtro non più valido, dove finiscono gli imminenti) stanno in `derive`.
export interface TorneiSections {
  active: string // filtro in vigore: TORNEI_FILTER_ALL oppure uno di `options`
  options: string[] // formati selezionabili; vuoto quando filtrare non separerebbe nulla
  upcoming: TorneoCard[] // imminenti/futuri, non raggruppati
  groups: TorneoGroup[] // i passati, per formato
}

export interface TorneoMatchRow {
  id: string
  phase: string
  opponents: string
  partnerName: string
  esitoColor: string
  esitoShort: string
  setChips: SetChip[]
  hasNote: boolean
  note: string
}
export interface TorneoPhoto { id: string; color: string; caption: string; url: string | null }
export interface TorneoDetailData {
  id: string
  name: string
  category: string
  dot: string
  badge: string
  badgeBg: string
  badgeColor: string
  meta: string
  record: string
  winPct: number
  played: number
  setStr: string
  setPct: number
  diffStr: string
  noMatches: boolean
  hasPhotos: boolean
  shared: boolean
  photos: TorneoPhoto[]
  matches: TorneoMatchRow[]
  // ---- luogo ----
  venueName: string // '' = torneo senza luogo (né venue né città)
  venueCity: string
  venueLat: number | null // coordinate: presenti o assenti sempre in coppia
  venueLng: number | null
  venueMapUrl: string | null // link OpenStreetMap, null senza coordinate
  venueHistory: string | null // "3° torneo qui · 1 podio"
}

export interface CompagnoCard {
  id: string
  name: string
  initial: string
  played: number
  won: number
  lost: number
  winPct: number
}

export interface CompagnoMatchRow {
  id: string
  tournamentName: string
  phase: string
  opponents: string
  esitoColor: string
  esitoShort: string
  setChips: SetChip[]
}
export interface CompagnoDetailData {
  name: string
  initial: string
  played: number
  won: number
  winPct: number
  setPct: number
  diffStr: string
  streak: number
  matches: CompagnoMatchRow[]
}

export interface DiaryPhotoThumb { color: string; caption: string; url: string | null }

// Dati per l'immagine-storia Instagram (card stats 1080×1920). La palette è
// applicata lato componente (StoryModal), qui restano solo i valori.
export interface StoryData {
  year: string
  name: string
  resultLabel: string
  meta: string
  winPct: number
  record: string        // "3–1"
  setStr: string        // "6–2"
  diffStr: string       // "+14"
  diffPositive: boolean
  partner: string
  slug: string          // base del nome file scaricato
  coverUrl: string | null // foto di copertina (URL firmato) se il torneo ne ha una
  photoUrls: string[]     // fino a 3 foto del torneo, per la striscia in fondo
  emoji: string           // emoji del torneo, per il visual quando non c'è foto
}
export interface DiaryEntry {
  id: string
  day: string    // giorno del mese, es. '20'
  month: string  // mese abbreviato IT, es. 'Giu'
  year: string   // '2025'
  emoji: string
  title: string  // nome del torneo
  desc: string   // recap "da diario"
  accent: string // colore accento (piazzamento)
  badge: string
  badgeBg: string
  badgeColor: string
  photos: DiaryPhotoThumb[] // massimo 4 thumbnail
  morePhotos: number        // foto oltre le prime 4
}

type DatedMatch = Match & { date: string }

const PLACEMENT_LABELS: Record<number, string> = { 1: '1° 🏆', 2: '2°', 3: '3°', 4: 'Quarti', 6: 'Ottavi', 8: 'Gironi', 9: '—' }

const tournObj = (data: DiaryData, id: string): Tournament | undefined => data.tournaments.find((x) => x.id === id)
const partnerObj = (data: DiaryData, id: string): Partner | undefined => data.partners.find((x) => x.id === id)
const partnerName = (data: DiaryData, id: string | null): string => (id ? partnerObj(data, id)?.name || 'Nessuno' : 'Nessuno')

// Placement-driven accent dot (replaces the old emoji tile).
const dotForRank = (r: number): string => (r === 1 ? '#FF6B35' : r <= 3 ? '#F7A883' : 'rgba(27,42,74,.25)')
const dotFor = (t: Tournament): string => dotForRank(placementRank(t.placement))

// ---------------------------------------------------------------------------
// Luoghi (venues)
// Il luogo è un'entità (`Tournament.venueId`), ma `Tournament.city` resta come
// snapshot testuale: i tornei creati prima della migrazione — o da un client che
// non conosce i venue — hanno solo quello. Ogni selettore qui sotto degrada su
// `city`, così le due generazioni di dati convivono senza righe vuote.
// ---------------------------------------------------------------------------

// Il luogo collegato a un torneo (null se non collegato o non ancora caricato).
export function venueOf(data: DiaryData, t: Tournament): Venue | null {
  if (!t.venueId) return null
  return data.venues.find((v) => v.id === t.venueId) ?? null
}

// Etichetta completa: "Bagno 26 · Riccione". Quando nome e città coincidono
// (tipico dei luoghi nati dal backfill delle vecchie città) ne resta uno solo,
// altrimenti si leggerebbe "Riccione · Riccione".
export function venueLabel(v: Venue): string {
  const name = v.name.trim()
  const city = v.city.trim()
  if (!name) return city
  if (!city || normalizeCity(city) === normalizeCity(name)) return name
  return name + ' · ' + city
}

// Token breve per le righe `meta`, dove il luogo sta accanto a data e formato:
// il nome del posto, o lo snapshot testuale per i tornei senza venue.
export function venueDisplay(data: DiaryData, t: Tournament): string {
  return venueOf(data, t)?.name.trim() || t.city.trim()
}

// Il luogo "in prosa" (…«a Riccione»): si dice la città, non il nome del bagno.
export function venuePlace(data: DiaryData, t: Tournament): string {
  const v = venueOf(data, t)
  return v?.city.trim() || v?.name.trim() || t.city.trim()
}

// Chiave di raggruppamento per luogo — l'unico modo corretto di confrontare due
// tornei "sullo stesso posto" in una storia mista (righe con venue e righe con
// la sola città). Prefissata per non confondere un id con un nome di città.
// Stringa vuota = luogo sconosciuto: chi raggruppa deve scartarla.
export function venueKeyOf(data: DiaryData, t: Tournament): string {
  if (t.venueId) return 'v:' + t.venueId
  const key = normalizeCity(t.city)
  if (!key) return ''
  // Torneo senza venue (da mobile, o antecedente alla migrazione): se la sua
  // città identifica un solo luogo è quello, così la storia non si spezza in
  // due. Con più luoghi nella stessa città indovinare sarebbe peggio del non
  // fare: resta la chiave-città, comunque stabile e normalizzata come il DB.
  const sameCity = data.venues.filter((v) => normalizeCity(v.city) === key)
  return sameCity.length === 1 ? 'v:' + sameCity[0].id : 'c:' + key
}

export interface VenueHistory {
  played: number // tornei giocati in quel luogo
  podi: number // di cui finiti sul podio
  ordinal: number // posizione (per data) del torneo richiesto; 0 = non trovato
}

// Quante volte ho giocato qui. `tournamentId` fa calcolare anche "il quante-simo"
// è quel torneo, che è ciò che si legge nel dettaglio ("3° torneo qui").
export function venueHistory(data: DiaryData, key: string, tournamentId?: string): VenueHistory {
  if (!key) return { played: 0, podi: 0, ordinal: 0 }
  const here = data.tournaments
    .filter((t) => venueKeyOf(data, t) === key)
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1))
  const podi = here.filter((t) => placementRank(t.placement) <= 3).length
  const idx = tournamentId ? here.findIndex((t) => t.id === tournamentId) : -1
  return { played: here.length, podi, ordinal: idx + 1 }
}

// "3° torneo qui · 1 podio". Null quando non c'è nulla da raccontare.
export function venueHistoryLabel(h: VenueHistory): string | null {
  if (!h.ordinal) return null
  const parts = [h.ordinal + '° torneo qui']
  if (h.podi > 0) parts.push(h.podi === 1 ? '1 podio' : h.podi + ' podi')
  return parts.join(' · ')
}

export interface LatLng { lat: number; lng: number }

// Legge un "45.0678, 12.5432" incollato (virgola, punto e virgola o spazio;
// tollera parentesi e spazi di troppo). Null se non sono due numeri o se escono
// dai limiti geografici: meglio nessuna coordinata che un puntino nell'oceano.
export function parseLatLng(raw: string): LatLng | null {
  const parts = raw.replace(/[()[\]]/g, '').trim().split(/[,;\s]+/).filter(Boolean)
  if (parts.length !== 2) return null
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

// Coordinate come le scrive l'utente nel campo (5 decimali ≈ 1 m: più che
// abbastanza per una spiaggia, e non finge una precisione che il GPS non ha).
export function formatLatLng(lat: number, lng: number): string {
  return lat.toFixed(5) + ', ' + lng.toFixed(5)
}

// Link "apri nelle mappe": OpenStreetMap, coerente con le tile della mappa
// in-app e senza inviare nulla a un servizio di geocoding.
export function mapUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}

// Luoghi selezionabili nei form, in ordine alfabetico (l'ordine di creazione
// non dice niente a chi cerca un posto in una tendina).
export function venueOptions(data: DiaryData): Option[] {
  return data.venues
    .map((v) => ({ id: v.id, name: venueLabel(v) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }))
}

export function matchesWithDates(data: DiaryData): DatedMatch[] {
  return data.matches.map((m) => ({ ...m, date: tournObj(data, m.tournamentId)?.date || '2025-01-01' }))
}

export function filteredMatches(data: DiaryData, fPartner: string, fYear: string): DatedMatch[] {
  let ms = matchesWithDates(data)
  if (fPartner !== 'all') ms = ms.filter((m) => m.partnerId === fPartner)
  if (fYear && fYear !== 'Sempre') ms = ms.filter((m) => yearOf(m.date) === fYear)
  return ms
}

// Decorate a tournament with its aggregate record + dot/badge styling.
function decorateTournament(data: DiaryData, t: Tournament): TorneoCard {
  const tm = data.matches.filter((m) => m.tournamentId === t.id)
  const ts = computeStats(tm)
  const podium = placementRank(t.placement) <= 3
  return {
    id: t.id, name: t.name, category: t.category, format: t.format, date: t.date, dot: dotFor(t),
    badge: t.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    // Il formato resta anche qui: `meta` è condivisa con le card "Ultimi tornei"
    // della dashboard, dove non c'è raggruppamento, e il dettaglio torneo mostra
    // `surface` non `format`. Toglierlo lo farebbe sparire dal resto dell'app.
    // Il luogo è il nome del venue quando c'è; senza (torneo place-less) il
    // filtro evita il separatore doppio che si vedeva con `city` vuota.
    meta: [fmtDate(t.date), venueDisplay(data, t), t.format, t.partnerId ? 'con ' + partnerName(data, t.partnerId) : '']
      .filter(Boolean).join(' · '),
    record: ts.won + '-' + ts.lost, winPct: ts.winPct, matchCount: ts.played,
    shared: t.shared,
  }
}

// ---- Dashboard / Home ----
export function deriveDashboard(data: DiaryData, fPartner: string, fYear: string): DashboardData {
  const fm = filteredMatches(data, fPartner, fYear)
  const s = computeStats(fm)

  // tournament stats filtered by year
  const yearT = data.tournaments.filter((t) => !fYear || fYear === 'Sempre' || yearOf(t.date) === fYear)
  const ranks = yearT.map((t) => placementRank(t.placement))
  const tWon = ranks.filter((r) => r === 1).length
  const podi = ranks.filter((r) => r <= 3).length
  const best = ranks.length ? Math.min(...ranks) : 9
  const bestLabel = PLACEMENT_LABELS[best] || '—'

  // ---- Andamento: win rate per mese (chiave anno-mese, ordinato nel tempo) ----
  const byMonth: Record<string, DatedMatch[]> = {}
  fm.forEach((m) => { const k = m.date.slice(0, 7); (byMonth[k] = byMonth[k] || []).push(m) })
  const monthKeys = Object.keys(byMonth).sort()
  const trend = monthKeys.map((k) => {
    const arr = byMonth[k]
    const w = arr.filter((m) => res(m).won).length
    return { label: MONTHS_SHORT[+k.slice(5, 7) - 1], pct: Math.round(w / arr.length * 100) }
  })
  const left = 20, right = 320, top = 24, bot = 128
  const n = trend.length
  const trendHasData = n >= 2
  const pts: TrendPoint[] = trend.map((t, i) => {
    const x = n > 1 ? left + (right - left) * i / (n - 1) : (left + right) / 2
    const y = bot - (t.pct / 100) * (bot - top)
    return { x: Math.round(x), y: Math.round(y), label: t.label, pct: t.pct }
  })
  const trendLine = pts.map((p) => p.x + ',' + p.y).join(' ')
  const trendArea = pts.length ? pts[0].x + ',' + bot + ' ' + trendLine + ' ' + pts[pts.length - 1].x + ',' + bot : ''
  const last = pts[pts.length - 1], prev = pts[pts.length - 2]
  let trendLabel = '—', trendColor = 'rgba(27,42,74,.4)'
  if (last && prev) {
    const dlt = last.pct - prev.pct
    trendLabel = (dlt >= 0 ? '▲ +' : '▼ ') + Math.abs(dlt) + '% sul mese scorso'
    trendColor = dlt >= 0 ? '#FF6B35' : 'rgba(27,42,74,.45)'
  }

  // donut
  const circ = 2 * Math.PI * 50
  const arc = (s.winPct / 100) * circ
  const donutDash = arc.toFixed(1) + ' ' + (circ - arc).toFixed(1)

  // horizontal bars: points for/against
  const maxP = Math.max(s.pf, s.pa, 1)
  const barForW = Math.round(s.pf / maxP * 100) + '%'
  const barAgW = Math.round(s.pa / maxP * 100) + '%'

  // ---- Win rate per fase (Girone → Finale) ----
  const phaseRows: PhaseRow[] = PHASES.map((ph) => {
    const pm = fm.filter((m) => m.phase === ph)
    const ps = computeStats(pm)
    return { phase: ph, winPct: ps.winPct, played: ps.played, won: ps.won, barW: ps.winPct + '%' }
  }).filter((p) => p.played > 0)

  // ---- Distribuzione piazzamenti nei tornei (nel periodo selezionato) ----
  const plCount: Record<string, number> = {}
  yearT.forEach((t) => { plCount[t.placement] = (plCount[t.placement] || 0) + 1 })
  const plMax = Math.max(1, ...Object.values(plCount))
  const placementDist: PlacementBar[] = PLACEMENTS
    .filter((l) => plCount[l])
    .map((l) => {
      const rank = placementRank(l)
      return { label: l, count: plCount[l], barW: Math.round(plCount[l] / plMax * 100) + '%', color: rank === 1 ? '#FF6B35' : rank <= 3 ? '#F7A883' : 'rgba(27,42,74,.28)' }
    })

  // per-partner win rate (bar sempre arancio nel nuovo design)
  const partnerRows: PartnerRow[] = data.partners.map((p) => {
    const pm = fm.filter((m) => m.partnerId === p.id)
    const ps = computeStats(pm)
    return { id: p.id, name: p.name, initial: p.name[0].toUpperCase(), winPct: ps.winPct, played: ps.played, won: ps.won, barW: ps.winPct + '%' }
  }).filter((p) => p.played > 0).sort((a, b) => b.winPct - a.winPct)

  const headline = s.winPct >= 60 ? 'Stai vincendo più di prima.' : s.played ? 'La tua stagione, in numeri.' : 'Inizia il tuo diario.'
  const subline = s.played
    ? (s.winPct + '% delle partite' + (fPartner !== 'all' ? (' con ' + partnerName(data, fPartner)) : '') + ' — ' + s.won + ' vinte su ' + s.played + ', differenziale ' + (s.diff >= 0 ? '+' : '') + s.diff + '.')
    : 'Aggiungi il primo torneo e le prime partite per vedere le statistiche.'

  const tSorted = [...data.tournaments].sort((a, b) => (a.date < b.date ? 1 : -1))
  const recent = tSorted.slice(0, 4).map((t) => decorateTournament(data, t))

  return {
    s: {
      periodLabel: fYear === 'Sempre' ? 'Sempre' : ('Stagione ' + fYear),
      headline, subline,
      winPct: s.winPct, won: s.won, lost: s.lost, played: s.played, setPct: s.setPct,
      diffStr: (s.diff >= 0 ? '+' : '') + s.diff, pf: s.pf, pa: s.pa, avgFor: s.avgFor, avgAg: s.avgAg,
      tWon, tPlayed: yearT.length, podi, bestPlacement: bestLabel,
      streak: streakOf(fm),
      trendLine, trendArea, trendPts: pts, trendHasData, trendLabel, trendColor,
      donutDash, barForW, barAgW,
      partnerRows, phaseRows, placementDist,
    },
    recent,
  }
}

// ---- Dashboard da dati server (RPC gated per piano) ----
// Mappa il JSON di public.dashboard_stats sul view-model DashboardStats.
// Gli "ultimi tornei" (non filtrati) restano calcolati dai dati locali.
export function deriveDashboardServer(sv: ServerDashboard, data: DiaryData, fPartner: string, fYear: string): DashboardData {
  // trend (stessi calcoli di deriveDashboard)
  const left = 20, right = 320, top = 24, bot = 128
  const n = sv.trend.length
  const trendHasData = n >= 2
  const pts: TrendPoint[] = sv.trend.map((t, i) => {
    const x = n > 1 ? left + (right - left) * i / (n - 1) : (left + right) / 2
    const y = bot - (t.pct / 100) * (bot - top)
    return { x: Math.round(x), y: Math.round(y), label: MONTHS_SHORT[+t.ym.slice(5, 7) - 1], pct: t.pct }
  })
  const trendLine = pts.map((p) => p.x + ',' + p.y).join(' ')
  const trendArea = pts.length ? pts[0].x + ',' + bot + ' ' + trendLine + ' ' + pts[pts.length - 1].x + ',' + bot : ''
  const last = pts[pts.length - 1], prev = pts[pts.length - 2]
  let trendLabel = '—', trendColor = 'rgba(27,42,74,.4)'
  if (last && prev) {
    const dlt = last.pct - prev.pct
    trendLabel = (dlt >= 0 ? '▲ +' : '▼ ') + Math.abs(dlt) + '% sul mese scorso'
    trendColor = dlt >= 0 ? '#FF6B35' : 'rgba(27,42,74,.45)'
  }

  // donut + bars
  const circ = 2 * Math.PI * 50
  const arc = (sv.win_pct / 100) * circ
  const donutDash = arc.toFixed(1) + ' ' + (circ - arc).toFixed(1)
  const maxP = Math.max(sv.points_for, sv.points_against, 1)
  const barForW = Math.round(sv.points_for / maxP * 100) + '%'
  const barAgW = Math.round(sv.points_against / maxP * 100) + '%'

  const partnerRows: PartnerRow[] = sv.partners.map((p) => ({
    id: p.id, name: p.name, initial: (p.name[0] || '?').toUpperCase(),
    winPct: p.win_pct, played: p.played, won: p.won, barW: p.win_pct + '%',
  }))

  const phaseMap = new Map(sv.phases.map((ph) => [ph.phase, ph]))
  const phaseRows: PhaseRow[] = PHASES
    .map((ph) => phaseMap.get(ph))
    .filter((x): x is ServerPhaseRow => !!x)
    .map((ph) => ({ phase: ph.phase, winPct: ph.win_pct, played: ph.played, won: ph.won, barW: ph.win_pct + '%' }))

  const plMap = new Map(sv.placements.map((pl) => [pl.placement, pl.count]))
  const plMax = Math.max(1, ...sv.placements.map((pl) => pl.count))
  const placementDist: PlacementBar[] = PLACEMENTS
    .filter((l) => plMap.has(l))
    .map((l) => {
      const count = plMap.get(l) as number
      const rank = placementRank(l)
      return { label: l, count, barW: Math.round(count / plMax * 100) + '%', color: rank === 1 ? '#FF6B35' : rank <= 3 ? '#F7A883' : 'rgba(27,42,74,.28)' }
    })

  const bestPlacement = PLACEMENT_LABELS[sv.best_rank] || '—'
  const winPct = sv.win_pct, played = sv.played, won = sv.won, diff = sv.point_diff
  const headline = winPct >= 60 ? 'Stai vincendo più di prima.' : played ? 'La tua stagione, in numeri.' : 'Inizia il tuo diario.'
  const subline = played
    ? (winPct + '% delle partite' + (fPartner !== 'all' ? (' con ' + partnerName(data, fPartner)) : '') + ' — ' + won + ' vinte su ' + played + ', differenziale ' + (diff >= 0 ? '+' : '') + diff + '.')
    : 'Aggiungi il primo torneo e le prime partite per vedere le statistiche.'

  const tSorted = [...data.tournaments].sort((a, b) => (a.date < b.date ? 1 : -1))
  const recent = tSorted.slice(0, 4).map((t) => decorateTournament(data, t))

  return {
    s: {
      periodLabel: fYear === 'Sempre' ? 'Sempre' : ('Stagione ' + fYear),
      headline, subline,
      winPct, won, lost: sv.lost, played, setPct: sv.set_pct,
      diffStr: (diff >= 0 ? '+' : '') + diff, pf: sv.points_for, pa: sv.points_against, avgFor: sv.avg_for, avgAg: sv.avg_against,
      tWon: sv.t_won, tPlayed: sv.t_played, podi: sv.podi, bestPlacement,
      streak: sv.streak,
      trendLine, trendArea, trendPts: pts, trendHasData, trendLabel, trendColor,
      donutDash, barForW, barAgW,
      partnerRows, phaseRows, placementDist,
    },
    recent,
  }
}

// ---- Tornei list ----
// "Oggi" in ISO (UTC). Unica definizione del confine imminente/passato:
// l'ordinamento agenda, la sezione "Prossimi tornei" e il check-in di "Chi c'è
// oggi" non devono mai dissentire su dov'è "oggi". Esportata perché sia l'unica
// sorgente di "oggi" anche fuori da qui (es. useCheckIn).
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// Ordine "agenda" della lista tornei: prima gli imminenti/futuri (data >= oggi)
// dal più vicino, poi i passati dal più recente.
function byAgendaDate<T extends { date: string }>(list: T[]): T[] {
  const today = todayISO()
  return [...list].sort((a, b) => {
    const aUp = a.date >= today
    const bUp = b.date >= today
    if (aUp !== bUp) return aUp ? -1 : 1 // imminenti/futuri prima dei passati
    if (aUp) return a.date < b.date ? -1 : 1 // futuri: prima i più vicini
    return a.date < b.date ? 1 : -1 // passati: prima i più recenti
  })
}

// Separa gli imminenti/futuri dai passati preservando l'ordine in ingresso (già
// "agenda"). `today` è iniettabile per tenere gli helper puri e testabili.
export function splitUpcoming(tornei: TorneoCard[], today = todayISO()): { upcoming: TorneoCard[]; past: TorneoCard[] } {
  return {
    upcoming: tornei.filter((t) => t.date >= today),
    past: tornei.filter((t) => t.date < today),
  }
}

// Formati effettivamente presenti, nell'ordine fisso di FORMATS — non per
// conteggio né per recency: così la pagina non si rimescola ogni volta che si
// aggiunge un torneo. Alimenta sia i gruppi sia il filtro a chip, che non deve
// offrire scelte che non portano da nessuna parte.
// Un formato fuori da FORMATS (oggi impossibile: c'è un CHECK a DB) finisce in
// coda, nell'ordine in cui compare, invece di sparire dalla pagina.
export function torneiFormats(tornei: TorneoCard[]): string[] {
  const present = new Set(tornei.map((t) => t.format))
  const known: string[] = FORMATS.filter((f) => present.has(f))
  const unknown = [...present].filter((f) => !known.includes(f))
  return [...known, ...unknown]
}

// Raggruppa per formato. Dentro il gruppo resta l'ordine in ingresso (già
// "agenda"); i gruppi vuoti non esistono, perché le chiavi vengono dai dati.
export function groupTorneiByFormat(tornei: TorneoCard[]): TorneoGroup[] {
  return torneiFormats(tornei).map((key) => ({
    key, label: key, tornei: tornei.filter((t) => t.format === key),
  }))
}

// Valore del filtro "nessun filtro". Non è un formato, quindi non può collidere
// con quelli di FORMATS.
export const TORNEI_FILTER_ALL = 'all'

// Selettore unico della schermata Tornei: dal filtro scelto alle sezioni da
// renderizzare. Puro (`today` iniettabile) e senza dipendenze da React, così le
// regole restano verificabili senza montare nulla.
export function deriveTorneiSections(
  tornei: TorneoCard[],
  filter: string = TORNEI_FILTER_ALL,
  today = todayISO(),
): TorneiSections {
  const formats = torneiFormats(tornei)
  // Con un formato solo il filtro non separerebbe niente: nessuna opzione.
  const options = formats.length > 1 ? formats : []
  // Filtro non più valido (es. cancellato l'ultimo torneo di quel formato): si
  // ricade su "Tutti" invece di mostrare una pagina vuota.
  const active = options.includes(filter) ? filter : TORNEI_FILTER_ALL
  const visible = active === TORNEI_FILTER_ALL ? tornei : tornei.filter((t) => t.format === active)
  // Gli imminenti restano in cima e non raggruppati: raggruppando e basta, un
  // torneo di domani finirebbe sepolto sotto decine di passati del suo formato.
  const { upcoming, past } = splitUpcoming(visible, today)
  return { active, options, upcoming, groups: groupTorneiByFormat(past) }
}

export function deriveTorneiList(data: DiaryData, fYear: string): TorneiListData {
  const yearT = data.tournaments.filter((t) => !fYear || fYear === 'Sempre' || yearOf(t.date) === fYear)
  const ranks = yearT.map((t) => placementRank(t.placement))
  const podi = ranks.filter((r) => r <= 3).length
  const best = ranks.length ? Math.min(...ranks) : 9
  const bestPlacement = PLACEMENT_LABELS[best] || '—'
  const tSorted = byAgendaDate(data.tournaments)
  return {
    tornei: tSorted.map((t) => decorateTournament(data, t)),
    tPlayed: yearT.length, podi, bestPlacement,
  }
}

// ---- Torneo detail ----
export function deriveTorneoDetail(data: DiaryData, id: string): TorneoDetailData | null {
  const t = tournObj(data, id)
  if (!t) return null
  const tm = data.matches.filter((m) => m.tournamentId === t.id)
  const ts = computeStats(tm)
  const photos = data.photos.filter((p) => p.tournamentId === t.id)
  const podium = placementRank(t.placement) <= 3
  const v = venueOf(data, t)
  const lat = v?.lat ?? null
  const lng = v?.lng ?? null
  return {
    id: t.id, name: t.name, category: t.category, dot: dotFor(t),
    badge: t.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    meta: [fmtDate(t.date), venueDisplay(data, t), t.surface, t.partnerId ? 'con ' + partnerName(data, t.partnerId) : '']
      .filter(Boolean).join(' · '),
    record: ts.won + '-' + ts.lost, winPct: ts.winPct, played: ts.played, setStr: ts.sw + '-' + ts.sl, setPct: ts.setPct,
    diffStr: (ts.diff >= 0 ? '+' : '') + ts.diff,
    noMatches: tm.length === 0, hasPhotos: photos.length > 0, shared: t.shared,
    venueName: venueDisplay(data, t),
    venueCity: venuePlace(data, t),
    venueLat: lat, venueLng: lng,
    venueMapUrl: mapUrl(lat, lng),
    venueHistory: venueHistoryLabel(venueHistory(data, venueKeyOf(data, t), t.id)),
    photos: photos.map((p) => ({ id: p.id, color: p.color, caption: p.caption, url: p.url })),
    matches: tm.map((m) => {
      const r = res(m); const es = esitoStyle(r.won)
      return {
        id: m.id, phase: m.phase, opponents: m.opponents, partnerName: partnerName(data, m.partnerId),
        esitoColor: es.color, esitoShort: es.short,
        setChips: setChips(m), hasNote: !!m.note, note: m.note,
      }
    }),
  }
}

// ---- Compagni list ----
export function deriveCompagni(data: DiaryData): CompagnoCard[] {
  return data.partners.filter((p) => !p.shared).map((p) => {
    const pm = data.matches.filter((m) => m.partnerId === p.id)
    const ps = computeStats(pm)
    return { id: p.id, name: p.name, initial: p.name[0].toUpperCase(), played: ps.played, won: ps.won, lost: ps.lost, winPct: ps.winPct }
  })
}

// ---- Compagno detail ----
export function deriveCompagno(data: DiaryData, id: string): CompagnoDetailData | null {
  const p = partnerObj(data, id)
  if (!p) return null
  const pm = data.matches.filter((m) => m.partnerId === p.id)
  const ps = computeStats(pm)
  return {
    name: p.name, initial: p.name[0].toUpperCase(),
    played: ps.played, won: ps.won, winPct: ps.winPct, setPct: ps.setPct,
    diffStr: (ps.diff >= 0 ? '+' : '') + ps.diff, streak: streakOf(pm),
    matches: pm.map((m) => {
      const r = res(m); const es = esitoStyle(r.won)
      return {
        id: m.id, tournamentName: tournObj(data, m.tournamentId)?.name || '—',
        phase: m.phase, opponents: m.opponents,
        esitoColor: es.color, esitoShort: es.short, setChips: setChips(m),
      }
    }),
  }
}

// ---- Diario (Premium) ----
// Ogni torneo diventa una voce di diario: data + emoji + titolo + recap + foto.
// Ordinati dal più recente (come il resto dell'app).
export function deriveDiary(data: DiaryData): DiaryEntry[] {
  const tSorted = [...data.tournaments].sort((a, b) => (a.date < b.date ? 1 : -1))
  return tSorted.map((t) => {
    const tm = data.matches.filter((m) => m.tournamentId === t.id)
    const ts = computeStats(tm)
    const photos = data.photos.filter((p) => p.tournamentId === t.id)
    const rank = placementRank(t.placement)
    const podium = rank <= 3

    // recap in stile diario: piazzamento/luogo + esito partite. Il luogo qui è
    // "in prosa" (la città del venue), non il nome del bagno: «a Riccione».
    const place = venuePlace(data, t)
    const parts: string[] = []
    if (podium) parts.push(`Chiuso al ${t.placement}${place ? ' a ' + place : ''}`)
    else if (place) parts.push(`Tappa ${t.category} a ${place}`)
    else parts.push(t.category)
    parts.push(ts.played ? `${ts.won} ${ts.won === 1 ? 'vittoria' : 'vittorie'} su ${ts.played} — ${ts.winPct}% W` : 'Nessuna partita ancora')

    const d = t.date || '2025-01-01'
    return {
      id: t.id,
      day: d.slice(8, 10) || '—',
      month: MONTHS_SHORT[+d.slice(5, 7) - 1] || '',
      year: d.slice(0, 4),
      emoji: t.emoji || '🏖️',
      title: t.name,
      desc: parts.join(' · '),
      accent: dotForRank(rank),
      badge: t.placement,
      badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
      badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
      photos: photos.slice(0, 4).map((p) => ({ color: p.color, caption: p.caption, url: p.url })),
      morePhotos: Math.max(0, photos.length - 4),
    }
  })
}

// ---- Story Instagram (Premium) ----
function fmtDateFull(d: string): string {
  const [y, mo, da] = (d || '2025-01-01').split('-')
  return (+da) + ' ' + (MONTHS_FULL[(+mo) - 1] || '') + ' ' + y
}

// Mappa il piazzamento in un'etichetta "da story".
export function resultLabelOf(placement: string): string {
  if (!placement) return 'TORNEO'
  if (placement.startsWith('1°')) return 'CAMPIONI'
  if (placement.startsWith('2°')) return 'FINALISTI'
  if (placement.startsWith('3°')) return 'SUL PODIO'
  if (placement === 'Semifinale') return 'IN SEMIFINALE'
  if (placement === 'Quarti') return 'QUARTI DI FINALE'
  if (placement === 'Ottavi') return 'OTTAVI DI FINALE'
  if (placement === 'Gironi') return 'FASE A GIRONI'
  if (placement === 'In corso') return 'IN CORSO'
  return 'TORNEO'
}

export function deriveStory(data: DiaryData, id: string): StoryData | null {
  const t = tournObj(data, id)
  if (!t) return null
  const tm = data.matches.filter((m) => m.tournamentId === t.id)
  const ts = computeStats(tm)

  // Compagno principale: quello con più partite nel torneo, poi il compagno del torneo.
  const counts: Record<string, number> = {}
  tm.forEach((m) => { if (m.partnerId) counts[m.partnerId] = (counts[m.partnerId] || 0) + 1 })
  let bpId: string | null = null, bn = 0
  Object.keys(counts).forEach((k) => { if (counts[k] > bn) { bn = counts[k]; bpId = k } })
  bpId = bpId ?? t.partnerId
  const partner = bpId ? (partnerObj(data, bpId)?.name || '—') : '—'

  const d = t.date || '2025-01-01'
  const meta = [fmtDateFull(d), venueDisplay(data, t), t.category].filter(Boolean).join('  ·  ')
  const slug = (t.name || 'torneo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'torneo'
  const withUrl = data.photos.filter((p) => p.tournamentId === t.id && p.url)
  const cover = withUrl[0]

  return {
    year: yearOf(d),
    name: t.name,
    resultLabel: resultLabelOf(t.placement),
    meta,
    winPct: ts.winPct,
    record: ts.won + '–' + ts.lost,
    setStr: ts.sw + '–' + ts.sl,
    diffStr: (ts.diff >= 0 ? '+' : '') + ts.diff,
    diffPositive: ts.diff >= 0,
    partner,
    slug,
    coverUrl: cover?.url ?? null,
    photoUrls: withUrl.slice(0, 3).map((p) => p.url as string),
    emoji: t.emoji || '🏐',
  }
}

// ---- Beach Wrapped (recap di stagione, stile Spotify Wrapped) --------------
// Un mazzo di card 1080×1920 generate dai dati di stagione: vittorie, miglior
// compagno, striscia, punti, miglior risultato + volume/rivali/curiosità.
// Come deriveStory, è puro e client-side (nessuna nuova SQL): compone i selettori
// già esistenti (computeStats/streakOf/placementRank) su un intervallo di date.

// Intervallo del recap: [from, to] inclusi (ISO 'YYYY-MM-DD') + etichetta pronta.
export interface WrappedRange { from: string; to: string; label: string }

// Ogni slide ha la stessa forma: la varietà visiva (palette, accento, layout)
// la mette il componente card. `kind` sceglie solo piccole differenze di resa.
export type WrappedSlideKind =
  | 'intro' | 'wins' | 'streak' | 'partner' | 'points'
  | 'podium' | 'volume' | 'rival' | 'funfacts' | 'outro'

export interface WrappedStat { value: string; label: string }

export interface WrappedSlide {
  kind: WrappedSlideKind
  eyebrow: string      // etichetta maiuscola sopra l'hero
  headline: string     // il numero/parola grande
  title: string        // titolo secondario (nome torneo/compagno…)
  caption: string      // riga di supporto
  stats: WrappedStat[] // mini-griglia stat opzionale (0..4)
  emoji: string        // decorazione quando non c'è una foto
  photoUrl?: string | null // foto di copertina (URL firmato) per intro/podio
}

export interface WrappedData {
  range: WrappedRange
  partnerName: string | null // compagno selezionato (o null = tutti)
  hasEnoughData: boolean     // sotto soglia il recap non ha senso: mostra l'empty
  played: number
  slides: WrappedSlide[]
  slug: string               // base del nome file scaricato
}

// Soglia minima di partite perché il recap valga la pena di essere mostrato.
export const WRAPPED_MIN_MATCHES = 3

// "20 giu 2026" — data compatta per le etichette d'intervallo.
function wrappedDayLabel(d: string): string {
  return (+d.slice(8, 10)) + ' ' + (MONTHS_SHORT[(+d.slice(5, 7)) - 1] || '').toLowerCase() + ' ' + d.slice(0, 4)
}

// "Stagione 2026" se l'intervallo copre un anno solare intero, altrimenti
// "20 giu 2026 – 30 lug 2026". Usata sia dai preset sia dai range personalizzati.
export function wrappedRangeLabel(from: string, to: string): string {
  const y = from.slice(0, 4)
  const fullYear = from.slice(5) === '01-01' && to === y + '-12-31'
  return fullYear ? 'Stagione ' + y : wrappedDayLabel(from) + ' – ' + wrappedDayLabel(to)
}

// Costruisce un WrappedRange normalizzato: riordina from/to se invertiti (due
// input date scambiati non devono rompere il recap) e calcola l'etichetta.
export function makeWrappedRange(from: string, to: string): WrappedRange {
  const [a, b] = from <= to ? [from, to] : [to, from]
  return { from: a, to: b, label: wrappedRangeLabel(a, b) }
}

// Intervallo iniziale dal filtro stagione della Home: l'anno selezionato come
// anno solare, oppure "Sempre" = dal primo torneo a oggi. `today` iniettabile.
export function wrappedRangeForYear(data: DiaryData, fYear: string, today = todayISO()): WrappedRange {
  if (fYear && fYear !== 'Sempre') return { from: fYear + '-01-01', to: fYear + '-12-31', label: 'Stagione ' + fYear }
  const dates = data.tournaments.map((t) => t.date).filter(Boolean).sort()
  const from = dates[0] || (today.slice(0, 4) + '-01-01')
  return { from, to: today, label: 'Sempre' }
}

// Genera il mazzo di slide per l'intervallo [range.from, range.to]. Se `fPartner`
// è un id, tutte le statistiche sono ristrette alle partite con quel compagno.
export function deriveWrapped(data: DiaryData, range: WrappedRange, fPartner = 'all'): WrappedData {
  const inRange = (d: string) => d >= range.from && d <= range.to
  const ms = matchesWithDates(data).filter((m) => inRange(m.date) && (fPartner === 'all' || m.partnerId === fPartner))
  const s = computeStats(ms)
  const played = s.played
  const partnerName = fPartner !== 'all' ? (partnerObj(data, fPartner)?.name ?? null) : null

  // Tornei nell'intervallo. Con un compagno filtrato restano solo quelli in cui
  // ho effettivamente giocato con lui (coerente con le statistiche partite).
  const rangeTourns = data.tournaments.filter((t) => inRange(t.date))
  const tIdsPlayed = new Set(ms.map((m) => m.tournamentId))
  const tourns = fPartner === 'all' ? rangeTourns : rangeTourns.filter((t) => tIdsPlayed.has(t.id))

  const ranks = tourns.map((t) => placementRank(t.placement))
  const best = ranks.length ? Math.min(...ranks) : 9
  const podi = ranks.filter((r) => r <= 3).length
  // Miglior torneo: al piazzamento migliore, il più recente.
  const bestTourn = tourns
    .filter((t) => placementRank(t.placement) === best)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]

  // Miglior compagno (solo senza filtro compagno): win% più alto con ≥2 partite,
  // a parità di win% vince chi ne ha giocate di più.
  const partnerRows = data.partners
    .map((p) => {
      const ps = computeStats(ms.filter((m) => m.partnerId === p.id))
      return { name: p.name, played: ps.played, won: ps.won, winPct: ps.winPct }
    })
    .filter((p) => p.played >= 2)
    .sort((a, b) => b.winPct - a.winPct || b.played - a.played)
  const topPartner = fPartner === 'all' ? partnerRows[0] : undefined

  // Rivale più affrontato (avversari sono testo libero): per numero di sfide.
  const oppMap = new Map<string, { played: number; won: number }>()
  ms.forEach((m) => {
    const key = (m.opponents || '').trim()
    if (!key) return
    const cur = oppMap.get(key) || { played: 0, won: 0 }
    cur.played += 1
    if (res(m).won) cur.won += 1
    oppMap.set(key, cur)
  })
  const topRival = [...oppMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.played - a.played || b.won - a.won)[0]

  // Miglior scarto in una vittoria (differenza punti nel match).
  let bestMargin = 0
  ms.forEach((m) => { const r = res(m); if (r.won) { const mar = r.pf - r.pa; if (mar > bestMargin) bestMargin = mar } })

  // "Città diverse": si contano i LUOGHI, via `venueKeyOf`. Contando le stringhe
  // grezze, "Rimini" e "rimini " valevano due posti — e con i venue, due nomi
  // diversi per la stessa spiaggia ne varrebbero altrettanti.
  const cities = new Set(tourns.map((t) => venueKeyOf(data, t)).filter(Boolean)).size
  const setsPlayed = s.sw + s.sl
  const streak = streakOf(ms)
  const hasEnoughData = played >= WRAPPED_MIN_MATCHES

  // Prima foto disponibile di un torneo (URL firmato), per la copertina.
  const photoOf = (tid: string | undefined): string | null =>
    (tid ? data.photos.find((p) => p.tournamentId === tid && p.url)?.url ?? null : null)
  const coverTourn = tourns.find((t) => photoOf(t.id))

  const slides: WrappedSlide[] = []

  // 1) Intro — sempre. Copertina con il teaser dei numeri di stagione.
  slides.push({
    kind: 'intro', eyebrow: 'Beach Wrapped', headline: range.label,
    title: partnerName ? 'in coppia con ' + partnerName : 'Beach Volley Diary',
    caption: played + (played === 1 ? ' partita · ' : ' partite · ') + tourns.length + (tourns.length === 1 ? ' torneo' : ' tornei'),
    stats: [], emoji: '🏖️', photoUrl: photoOf(coverTourn?.id),
  })

  if (played > 0) {
    slides.push({
      kind: 'wins', eyebrow: 'Vittorie totali', headline: String(s.won),
      title: s.won === 1 ? 'partita vinta' : 'partite vinte', caption: 'su ' + played + ' giocate',
      stats: [{ value: s.winPct + '%', label: 'Win rate' }, { value: s.won + '–' + s.lost, label: 'Record' }],
      emoji: '🏐',
    })
  }

  if (streak >= 2) {
    slides.push({
      kind: 'streak', eyebrow: 'Striscia vincente', headline: String(streak),
      title: 'vittorie di fila', caption: 'il miglior filotto della stagione', stats: [], emoji: '🔥',
    })
  }

  if (topPartner) {
    slides.push({
      kind: 'partner', eyebrow: 'Miglior compagno', headline: topPartner.name,
      title: topPartner.winPct + '% insieme', caption: topPartner.won + ' vinte su ' + topPartner.played + ' partite',
      stats: [], emoji: '🤝',
    })
  }

  if (played > 0) {
    slides.push({
      kind: 'points', eyebrow: 'Punti realizzati', headline: String(s.pf),
      title: 'punti messi a terra', caption: 'differenziale ' + (s.diff >= 0 ? '+' : '') + s.diff,
      stats: [
        { value: String(s.pa), label: 'Subiti' },
        { value: (s.diff >= 0 ? '+' : '') + s.diff, label: 'Diff.' },
        { value: String(s.avgFor), label: 'Media a partita' },
      ],
      emoji: '💥',
    })
  }

  if (bestTourn && best <= 8) {
    slides.push({
      kind: 'podium', eyebrow: 'Miglior risultato', headline: resultLabelOf(bestTourn.placement),
      title: bestTourn.name, caption: [venueDisplay(data, bestTourn), fmtDateFull(bestTourn.date)].filter(Boolean).join(' · '),
      stats: [], emoji: bestTourn.emoji || '🏆', photoUrl: photoOf(bestTourn.id),
    })
  }

  if (tourns.length > 0) {
    slides.push({
      kind: 'volume', eyebrow: 'In numeri', headline: String(tourns.length),
      title: tourns.length === 1 ? 'torneo giocato' : 'tornei giocati',
      caption: 'la tua stagione a colpo d’occhio',
      stats: [
        { value: String(played), label: 'Partite' },
        { value: String(setsPlayed), label: 'Set giocati' },
        { value: String(podi), label: 'Podi' },
        { value: String(cities), label: cities === 1 ? 'Città' : 'Città diverse' },
      ],
      emoji: '📆',
    })
  }

  if (topRival && topRival.played >= 2) {
    slides.push({
      kind: 'rival', eyebrow: 'Il tuo rivale', headline: topRival.name,
      title: topRival.played + ' sfide', caption: topRival.won + ' vinte · ' + (topRival.played - topRival.won) + ' perse',
      stats: [], emoji: '⚔️',
    })
  }

  if (played > 0) {
    slides.push({
      kind: 'funfacts', eyebrow: 'Lo sapevi?', headline: s.setPct + '%',
      title: 'dei set vinti', caption: 'la stagione nei piccoli numeri',
      stats: [
        { value: String(s.dist['2-0']), label: '2-0 netti' },
        { value: String(s.dist['2-1']), label: 'Rimonte 2-1' },
        { value: '+' + bestMargin, label: 'Miglior scarto' },
        { value: String(s.avgAg), label: 'Media subiti' },
      ],
      emoji: '✨',
    })
  }

  // Outro — sempre. Chiusura + invito a condividere.
  slides.push({
    kind: 'outro', eyebrow: 'Alla prossima', headline: 'Grazie',
    title: 'Condividi il tuo Beach Wrapped', caption: 'Beach Volley Diary', stats: [], emoji: '🎉',
  })

  const slug = ('beach-wrapped-' + range.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'beach-wrapped'
  return { range, partnerName, hasEnoughData, played, slides, slug }
}

// ---- Mapper da RPC server → view-model (presentazione lato client) ----

export function deriveTorneiListServer(sv: SvTorneiList): TorneiListData {
  const tornei: TorneoCard[] = byAgendaDate(sv.tornei).map((c) => {
    const podium = c.rank <= 3
    return {
      id: c.id, name: c.name, category: c.category, format: c.format, date: c.date, dot: dotForRank(c.rank),
      badge: c.placement,
      badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
      badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
      meta: [fmtDate(c.date), c.venue?.name.trim() || c.city.trim(), c.format, c.partner ? 'con ' + c.partner : '']
        .filter(Boolean).join(' · '),
      record: c.won + '-' + c.lost, winPct: c.win_pct, matchCount: c.match_count,
      shared: false,
    }
  })
  return { tornei, tPlayed: sv.t_played, podi: sv.podi, bestPlacement: PLACEMENT_LABELS[sv.best_rank] || '—' }
}

export function deriveCompagniServer(sv: SvCompagno[]): CompagnoCard[] {
  return sv.map((c) => ({ id: c.id, name: c.name, initial: (c.name[0] || '?').toUpperCase(), played: c.played, won: c.won, lost: c.lost, winPct: c.win_pct }))
}

// Le foto vengono prese dai dati client (che hanno gli URL firmati), non dal
// payload RPC: le statistiche restano server-side, le immagini restano coerenti.
export function deriveTorneoDetailServer(sv: SvTorneoDetail, data: DiaryData): TorneoDetailData {
  const podium = sv.rank <= 3
  const photos = data.photos.filter((p) => p.tournamentId === sv.id)
  const venueName = sv.venue?.name.trim() || sv.city.trim()
  const lat = sv.venue?.lat ?? null
  const lng = sv.venue?.lng ?? null
  // "Quante volte ho giocato qui" resta un conteggio client: la RPC aggrega un
  // torneo alla volta e non sa nulla degli altri.
  const local = data.tournaments.find((t) => t.id === sv.id)
  return {
    id: sv.id, name: sv.name, category: sv.category, dot: dotForRank(sv.rank),
    badge: sv.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    meta: [fmtDate(sv.date), venueName, sv.surface, sv.partner ? 'con ' + sv.partner : '']
      .filter(Boolean).join(' · '),
    record: sv.won + '-' + sv.lost, winPct: sv.win_pct, played: sv.played, setStr: sv.sets_won + '-' + sv.sets_lost,
    setPct: sv.sets_won + sv.sets_lost > 0 ? Math.round((100 * sv.sets_won) / (sv.sets_won + sv.sets_lost)) : 0,
    diffStr: (sv.point_diff >= 0 ? '+' : '') + sv.point_diff,
    noMatches: sv.matches.length === 0, hasPhotos: photos.length > 0, shared: false,
    venueName,
    venueCity: sv.venue?.city.trim() || venueName,
    venueLat: lat, venueLng: lng,
    venueMapUrl: mapUrl(lat, lng),
    venueHistory: local ? venueHistoryLabel(venueHistory(data, venueKeyOf(data, local), local.id)) : null,
    photos: photos.map((p) => ({ id: p.id, color: p.color, caption: p.caption, url: p.url })),
    matches: sv.matches.map((m) => {
      const es = esitoStyle(m.won)
      return {
        id: m.id, phase: m.phase, opponents: m.opponents, partnerName: m.partner_name,
        esitoColor: es.color, esitoShort: es.short,
        setChips: setChips({ sets: m.sets }), hasNote: !!m.note, note: m.note,
      }
    }),
  }
}

export function deriveCompagnoDetailServer(sv: SvCompagnoDetail): CompagnoDetailData {
  return {
    name: sv.name, initial: (sv.name[0] || '?').toUpperCase(),
    played: sv.played, won: sv.won, winPct: sv.win_pct, setPct: sv.set_pct,
    diffStr: (sv.point_diff >= 0 ? '+' : '') + sv.point_diff, streak: sv.streak,
    matches: sv.matches.map((m) => {
      const es = esitoStyle(m.won)
      return {
        id: m.id, tournamentName: m.tournament_name, phase: m.phase, opponents: m.opponents,
        esitoColor: es.color, esitoShort: es.short, setChips: setChips({ sets: m.sets }),
      }
    }),
  }
}

export function tournamentOptions(data: DiaryData): Option[] {
  // Solo i propri tornei: non si possono aggiungere partite/foto a un condiviso.
  return data.tournaments.filter((t) => !t.shared).map((t) => ({ id: t.id, name: t.name }))
}
export function partnerOptions(data: DiaryData): Option[] {
  return data.partners.map((p) => ({ id: p.id, name: p.name }))
}

// Anni disponibili (dai tornei) + "Sempre", per il filtro della dashboard.
export function yearOptions(data: DiaryData): string[] {
  const years = Array.from(new Set(data.tournaments.map((t) => yearOf(t.date)))).sort((a, b) => (a < b ? 1 : -1))
  return [...years, 'Sempre']
}

// ---- "Chi c'è oggi?" ----
// Normalizza il nome di una città come fa il DB (`city_key = lower(btrim(city))`):
// così client e server concordano su quali check-in finiscono nella stessa
// stanza. Usata anche per non interrogare la stanza con una città vuota.
export function normalizeCity(city: string): string {
  return city.trim().toLowerCase()
}

// Mappa le righe grezze di `who_is_here` sul view-model della stanza e le ordina:
// prima chi cerca compagno, poi per nome (case-insensitive). Pura: non muta
// l'input, l'ordinamento non dipende da come arrivano le righe dal DB.
export function deriveWhoIsHere(rows: SvPresentUser[]): PresentUser[] {
  return rows
    .map((r) => ({
      id: r.id,
      name: (r.name ?? '').trim() || 'Utente',
      avatarUrl: r.avatar_url,
      lookingForPartner: r.looking_for_partner,
      note: (r.note ?? '').trim(),
    }))
    .sort((a, b) => {
      // "Cerca compagno" in cima: è il motivo per cui si apre questa schermata.
      if (a.lookingForPartner !== b.lookingForPartner) return a.lookingForPartner ? -1 : 1
      return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
    })
}
