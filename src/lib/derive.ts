import { res, computeStats, streakOf, placementRank, fmtDate, yearOf, esitoStyle, setChips } from './stats'
import type { SetChip } from './stats'
import { MONTHS_SHORT } from './theme'
import { PHASES, PLACEMENTS } from './db.enums'
import type { DiaryData, Tournament, Partner, Match, Option } from './models'

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
  dot: string
  badge: string
  badgeBg: string
  badgeColor: string
  meta: string
  record: string
  winPct: number
  matchCount: number
}

export interface DashboardData { s: DashboardStats; recent: TorneoCard[] }
export interface TorneiListData { tornei: TorneoCard[]; tPlayed: number; podi: number; bestPlacement: string }

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
export interface TorneoPhoto { color: string; caption: string }
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
  setStr: string
  diffStr: string
  noMatches: boolean
  hasPhotos: boolean
  photos: TorneoPhoto[]
  matches: TorneoMatchRow[]
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

export interface GalleryItem { color: string; caption: string; tag: string }

type DatedMatch = Match & { date: string }

const PLACEMENT_LABELS: Record<number, string> = { 1: '1° 🏆', 2: '2°', 3: '3°', 4: 'Quarti', 6: 'Ottavi', 8: 'Gironi', 9: '—' }

const tournObj = (data: DiaryData, id: string): Tournament | undefined => data.tournaments.find((x) => x.id === id)
const partnerObj = (data: DiaryData, id: string): Partner | undefined => data.partners.find((x) => x.id === id)
const partnerName = (data: DiaryData, id: string): string => partnerObj(data, id)?.name || '—'

// Placement-driven accent dot (replaces the old emoji tile).
const dotFor = (t: Tournament): string => {
  const r = placementRank(t.placement)
  return r === 1 ? '#FF6B35' : r <= 3 ? '#F7A883' : 'rgba(27,42,74,.25)'
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
    id: t.id, name: t.name, category: t.category, dot: dotFor(t),
    badge: t.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    meta: fmtDate(t.date) + ' · ' + t.city + ' · ' + t.format + (t.partnerId ? ' · con ' + partnerName(data, t.partnerId) : ''),
    record: ts.won + '-' + ts.lost, winPct: ts.winPct, matchCount: ts.played,
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

// ---- Tornei list ----
export function deriveTorneiList(data: DiaryData, fYear: string): TorneiListData {
  const yearT = data.tournaments.filter((t) => !fYear || fYear === 'Sempre' || yearOf(t.date) === fYear)
  const ranks = yearT.map((t) => placementRank(t.placement))
  const podi = ranks.filter((r) => r <= 3).length
  const best = ranks.length ? Math.min(...ranks) : 9
  const bestPlacement = PLACEMENT_LABELS[best] || '—'
  const tSorted = [...data.tournaments].sort((a, b) => (a.date < b.date ? 1 : -1))
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
  return {
    id: t.id, name: t.name, category: t.category, dot: dotFor(t),
    badge: t.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    meta: fmtDate(t.date) + ' · ' + t.city + ' · ' + t.surface + (t.partnerId ? ' · con ' + partnerName(data, t.partnerId) : ''),
    record: ts.won + '-' + ts.lost, winPct: ts.winPct, setStr: ts.sw + '-' + ts.sl,
    diffStr: (ts.diff >= 0 ? '+' : '') + ts.diff,
    noMatches: tm.length === 0, hasPhotos: photos.length > 0,
    photos: photos.map((p) => ({ color: p.color, caption: p.caption })),
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
  return data.partners.map((p) => {
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

// ---- Galleria ----
export function deriveGallery(data: DiaryData): GalleryItem[] {
  return data.photos.map((p) => ({ color: p.color, caption: p.caption, tag: tournObj(data, p.tournamentId)?.name || '' }))
}

export function tournamentOptions(data: DiaryData): Option[] {
  return data.tournaments.map((t) => ({ id: t.id, name: t.name }))
}
export function partnerOptions(data: DiaryData): Option[] {
  return data.partners.map((p) => ({ id: p.id, name: p.name }))
}

// Anni disponibili (dai tornei) + "Sempre", per il filtro della dashboard.
export function yearOptions(data: DiaryData): string[] {
  const years = Array.from(new Set(data.tournaments.map((t) => yearOf(t.date)))).sort((a, b) => (a < b ? 1 : -1))
  return [...years, 'Sempre']
}
