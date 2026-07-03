import { MONTHS_SHORT } from './theme'
import type { SetScore } from './models'

export interface MatchResult {
  usS: number
  themS: number
  pf: number
  pa: number
  won: boolean
  score: string
}

export interface SetChip {
  txt: string
  bg: string
  color: string
}

export interface EsitoStyle {
  color: string
  short: string
}

export type ResultKey = '2-0' | '2-1' | '1-2' | '0-2'

export interface Stats {
  played: number
  won: number
  lost: number
  winPct: number
  sw: number
  sl: number
  setPct: number
  pf: number
  pa: number
  diff: number
  avgFor: number
  avgAg: number
  dist: Record<ResultKey, number>
  marginWin: number
  marginLoss: number
}

// Un oggetto con almeno l'array dei set (le funzioni accettano Match e derivati).
type WithSets = { sets?: SetScore[] }

// Result of a single match — sets won/lost, points for/against, win flag.
export function res(m: WithSets): MatchResult {
  let usS = 0, themS = 0, pf = 0, pa = 0
  ;(m.sets || []).forEach((s) => {
    const u = +s.us || 0, t = +s.them || 0
    pf += u; pa += t
    if (u > t) usS++
    else if (t > u) themS++
  })
  return { usS, themS, pf, pa, won: usS > themS, score: (m.sets || []).map((s) => s.us + '-' + s.them).join('  ') }
}

// Rank a placement string so tournaments can be compared (lower = better).
export function placementRank(l: string): number {
  if (!l) return 9
  if (l.indexOf('1°') === 0) return 1
  if (l.indexOf('2°') === 0) return 2
  if (l.indexOf('3°') === 0) return 3
  if (l === 'Quarti') return 4
  if (l === 'Ottavi') return 6
  if (l === 'Gironi') return 8
  return 9
}

export function esitoStyle(won: boolean): EsitoStyle {
  return won
    ? { color: '#FF6B35', short: 'V' }
    : { color: 'rgba(27,42,74,.4)', short: 'P' }
}

// Coloured per-set score chips.
export function setChips(m: WithSets): SetChip[] {
  return (m.sets || []).map((s) => {
    const u = +s.us || 0, t = +s.them || 0
    const win = u > t
    return { txt: u + '-' + t, bg: win ? '#FFF1EA' : '#F2F0EC', color: win ? '#C4501E' : 'rgba(27,42,74,.45)' }
  })
}

export function fmtDate(d: string): string {
  const [, mo, da] = d.split('-')
  return da + ' ' + MONTHS_SHORT[(+mo) - 1]
}

export function monthIdx(d: string): number { return +d.split('-')[1] }
export function yearOf(d: string): string { return d.split('-')[0] }

// Aggregate stats over a list of matches.
export function computeStats(matches: WithSets[]): Stats {
  const played = matches.length
  let won = 0, sw = 0, sl = 0, pf = 0, pa = 0
  const dist: Record<ResultKey, number> = { '2-0': 0, '2-1': 0, '1-2': 0, '0-2': 0 }
  const distRec = dist as Record<string, number>
  let wm = 0, wn = 0, lm = 0, ln = 0
  matches.forEach((m) => {
    const r = res(m)
    if (r.won) won++
    sw += r.usS; sl += r.themS; pf += r.pf; pa += r.pa
    const k = r.usS + '-' + r.themS
    if (distRec[k] !== undefined) distRec[k]++
    const mar = r.pf - r.pa
    if (r.won) { wm += mar; wn++ } else { lm += mar; ln++ }
  })
  const lost = played - won
  return {
    played, won, lost,
    winPct: played ? Math.round(won / played * 100) : 0,
    sw, sl, setPct: (sw + sl) ? Math.round(sw / (sw + sl) * 100) : 0,
    pf, pa, diff: pf - pa,
    avgFor: played ? Math.round(pf / played) : 0,
    avgAg: played ? Math.round(pa / played) : 0,
    dist,
    marginWin: wn ? Math.round(wm / wn) : 0,
    marginLoss: ln ? Math.round(Math.abs(lm / ln)) : 0,
  }
}

// Longest consecutive win streak (chronological).
export function streakOf(matches: Array<WithSets & { date?: string }>): number {
  const sorted = [...matches].sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))
  let best = 0, cur = 0
  sorted.forEach((m) => {
    if (res(m).won) { cur++; if (cur > best) best = cur }
    else cur = 0
  })
  return best
}
