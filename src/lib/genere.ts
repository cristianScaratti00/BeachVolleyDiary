// ============================================================================
// Il genere dei tornei (maschile, femminile, misto) e le statistiche separate
// (proposta A + B, 22/11/2026).
//
// - Il filtro non tocca le derivate condivise con l'app mobile (derive.ts):
//   `perGenere` restringe i DATI a un genere, e deriveDashboard, la Mappa e
//   Wrapped lavorano su quelli. Un torneo «non indicato» (null) conta solo in
//   «Tutti».
// - La proposta non si indovina dal nome del compagno: King → maschile, Queen
//   → femminile, poi il genere dei tuoi tornei già segnati con quel compagno,
//   poi l'unico genere che giochi (se ne giochi uno solo). Altrimenti niente.
//
// Puro: niente React, niente rete. "Oggi" è iniettabile.
// ============================================================================
import { GENDERS } from './db.enums'
import type { Gender } from './db.enums'
import type { DiaryData, Tournament } from './models'
import { matchesWithDates, todayISO } from './derive'
import { placementRank, res, yearOf } from './stats'

export type { Gender }

/** Il valore del filtro: un genere, o tutti insieme. */
export const TUTTI = 'Tutti'
export type FiltroGenere = Gender | typeof TUTTI

/** «maschile», «femminile», «misto»: il genere dentro una frase. */
export const GENERE_MINUSCOLO: Record<Gender, string> = { Maschile: 'maschile', Femminile: 'femminile', Misto: 'misto' }

const propri = (data: DiaryData) => data.tournaments.filter((t) => !t.shared)
const piuRecentePrima = (a: Tournament, b: Tournament) => b.date.localeCompare(a.date)

/** I generi dei tuoi tornei, nell'ordine fisso Maschile · Femminile · Misto. */
export function generiGiocati(data: DiaryData): Gender[] {
  const visti = new Set(propri(data).map((t) => t.gender).filter((g): g is Gender => !!g))
  return GENDERS.filter((g) => visti.has(g))
}

/** Il genere del tuo torneo più recente fino a oggi (o, se tutti futuri, del più vicino). */
export function genereRecente(data: DiaryData, today = todayISO()): Gender | null {
  const segnati = propri(data).filter((t) => t.gender)
  const passati = segnati.filter((t) => t.date <= today).sort(piuRecentePrima)
  const t = passati[0] ?? segnati.sort((a, b) => a.date.localeCompare(b.date))[0]
  return t?.gender ?? null
}

/** Il filtro in vigore: solo con almeno due generi; un valore non più valido ricade sul più recente. */
export function filtroGenere(data: DiaryData, scelto: string | null, today = todayISO()): FiltroGenere {
  const generi = generiGiocati(data)
  if (generi.length < 2) return TUTTI
  if (scelto === TUTTI) return TUTTI
  if (scelto && (generi as string[]).includes(scelto)) return scelto as Gender
  return genereRecente(data, today) ?? TUTTI
}

/** I dati di un solo genere: tornei, e le loro partite e foto. «Tutti» li lascia come sono. */
export function perGenere(data: DiaryData, g: FiltroGenere): DiaryData {
  if (g === TUTTI) return data
  const tournaments = data.tournaments.filter((t) => t.gender === g)
  const ids = new Set(tournaments.map((t) => t.id))
  return {
    ...data,
    tournaments,
    matches: data.matches.filter((m) => ids.has(m.tournamentId)),
    photos: data.photos.filter((p) => ids.has(p.tournamentId)),
  }
}

// ------------------------------------------------------------ la proposta
export interface Proposta {
  genere: Gender
  /** Il perché, da dire accanto: «come i tuoi tornei con Luca». */
  motivo: string
}

/** Il genere dei tuoi tornei già segnati con un compagno, se sono tutti uguali. */
function genereConCompagno(data: DiaryData, partnerId: string): Gender | null {
  const generi = new Set(propri(data).filter((t) => t.partnerId === partnerId && t.gender).map((t) => t.gender))
  return generi.size === 1 ? ([...generi][0] as Gender) : null
}

/**
 * Il genere da proporre a un torneo, con il perché; null se non c'è un motivo
 * vero. `ancheGenereUnico: false` toglie l'ultimo motivo («giochi un genere
 * solo»): nel riordino quasi niente è ancora segnato, e un torneo misto
 * segnato non dice niente dei tornei con un altro compagno.
 */
export function genereProposto(
  data: DiaryData,
  t: { partnerId?: string | null; category?: string | null },
  { ancheGenereUnico = true }: { ancheGenereUnico?: boolean } = {},
): Proposta | null {
  if (t.category === 'King') return { genere: 'Maschile', motivo: 'È un King.' }
  if (t.category === 'Queen') return { genere: 'Femminile', motivo: 'È un Queen.' }
  const pid = t.partnerId && t.partnerId !== 'new' && t.partnerId !== 'all' ? t.partnerId : null
  if (pid) {
    const g = genereConCompagno(data, pid)
    const nome = data.partners.find((p) => p.id === pid)?.name
    if (g) return { genere: g, motivo: nome ? `Come i tuoi tornei con ${nome}.` : 'Come i tuoi tornei con questo compagno.' }
  }
  const generi = ancheGenereUnico ? generiGiocati(data) : []
  if (generi.length === 1) return { genere: generi[0], motivo: `Giochi solo tornei di genere ${GENERE_MINUSCOLO[generi[0]]}.` }
  return null
}

// --------------------------------------------------------------- riordino
export interface TorneoDaRiordinare {
  id: string
  nome: string
  meta: string
  category: string
}

export interface GruppoRiordino {
  /** L'id del compagno, o «solo» per i tornei senza compagno. */
  key: string
  titolo: string
  sub: string
  tornei: TorneoDaRiordinare[]
  proposta: Proposta | null
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const dataCorta = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? `${d} ${MESI[m - 1]} ${y}` : iso
}
const anni = (ts: Tournament[]) => {
  const ys = [...new Set(ts.map((t) => yearOf(t.date)))].sort()
  return ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : ys[0] ?? ''
}

/** I tuoi tornei senza genere, raggruppati per compagno (di solito stesso compagno, stesso genere). */
export function gruppiRiordino(data: DiaryData): GruppoRiordino[] {
  const senza = propri(data).filter((t) => !t.gender).sort(piuRecentePrima)
  const perChiave = new Map<string, Tournament[]>()
  for (const t of senza) {
    const k = t.partnerId && data.partners.some((p) => p.id === t.partnerId) ? t.partnerId : 'solo'
    perChiave.set(k, [...(perChiave.get(k) ?? []), t])
  }
  const gruppi = [...perChiave.entries()].map(([key, ts]): GruppoRiordino => {
    const nome = key === 'solo' ? null : data.partners.find((p) => p.id === key)?.name ?? null
    // Un gruppo di soli King (o soli Queen) ha la sua proposta anche senza compagno.
    const cat = new Set(ts.map((t) => t.category))
    const proposta =
      cat.size === 1 && (cat.has('King') || cat.has('Queen'))
        ? genereProposto(data, { category: [...cat][0] })
        : key !== 'solo'
          ? genereProposto(data, { partnerId: key }, { ancheGenereUnico: false })
          : null
    return {
      key,
      titolo: nome ? `Con ${nome}` : 'Senza compagno',
      sub: `${ts.length === 1 ? '1 torneo' : `${ts.length} tornei`} · ${anni(ts)}`,
      tornei: ts.map((t) => ({ id: t.id, nome: t.name, meta: [dataCorta(t.date), t.category].join(' · '), category: t.category })),
      proposta,
    }
  })
  // Prima i gruppi più grandi: lì un tocco sistema più tornei.
  return gruppi.sort((a, b) => b.tornei.length - a.tornei.length || a.titolo.localeCompare(b.titolo))
}

/** Quanti dei tuoi tornei non hanno ancora un genere. */
export const senzaGenere = (data: DiaryData) => propri(data).filter((t) => !t.gender).length

// ------------------------------------------------------------ per categoria
export interface RigaCategoria {
  categoria: string
  winPct: number
  partite: number
  tornei: number
  podi: number
}

/**
 * Le categorie (Amatoriale, Open, Serie…) nei dati già ristretti al genere:
 * vittorie con gli stessi filtri di stagione e compagno di deriveDashboard,
 * tornei e podi per stagione. Solo le categorie con almeno una partita, dalla
 * più giocata.
 */
export function perCategoria(data: DiaryData, fPartner: string, fYear: string): RigaCategoria[] {
  const anno = (d: string) => !fYear || fYear === 'Sempre' || yearOf(d) === fYear
  const categorie = new Map<string, Tournament[]>()
  for (const t of data.tournaments) {
    if (!anno(t.date)) continue
    categorie.set(t.category, [...(categorie.get(t.category) ?? []), t])
  }
  const partite = matchesWithDates(data).filter((m) => anno(m.date) && (fPartner === 'all' || m.partnerId === fPartner))
  return [...categorie.entries()]
    .map(([categoria, ts]) => {
      const ids = new Set(ts.map((t) => t.id))
      const mm = partite.filter((m) => ids.has(m.tournamentId))
      const vinte = mm.filter((m) => res(m).won).length
      return {
        categoria,
        winPct: mm.length ? Math.round((vinte / mm.length) * 100) : 0,
        partite: mm.length,
        tornei: ts.length,
        podi: ts.filter((t) => placementRank(t.placement) <= 3).length,
      }
    })
    .filter((r) => r.partite > 0)
    .sort((a, b) => b.partite - a.partite || a.categoria.localeCompare(b.categoria))
}
