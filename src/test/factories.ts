// ============================================================================
// Fixture per i test del frontend: il view-model della schermata Tornei
// (TorneoCard) e il dominio grezzo (DiaryData) che alimenta i selettori del
// data layer (deriveWrapped e simili).
//
// Regola: ogni test dichiara solo i campi che gli interessano (id, format,
// date…). Tutto il resto arriva da qui, così quando una forma cresce di un
// campo si aggiorna un punto solo e i test restano leggibili.
// ============================================================================
import type { TorneoCard, TorneiListData } from '../lib/derive'
import type { Tournament, Match, Partner, Photo, DiaryData, SetScore } from '../lib/models'

// "Oggi" fisso per tutti i test: `deriveTorneiSections` accetta `today` come
// parametro proprio per questo. Nessun test deve dipendere dall'orologio, o a
// mezzanotte UTC la suite cambia colore da sola.
export const TODAY = '2026-07-22'

let seq = 0

export function makeTorneo(over: Partial<TorneoCard> = {}): TorneoCard {
  seq += 1
  const id = over.id ?? `t${seq}`
  return {
    id,
    name: `Torneo ${id}`,
    category: 'Open',
    format: '2vs2',
    date: '2026-01-15',
    dot: '#FF6B35',
    badge: 'Gironi',
    badgeBg: '#F2F0EC',
    badgeColor: 'rgba(27,42,74,.5)',
    meta: '15 gen 2026 · Rimini · 2vs2',
    record: '2-1',
    winPct: 67,
    matchCount: 3,
    shared: false,
    ...over,
  }
}

export function makeList(tornei: TorneoCard[], over: Partial<TorneiListData> = {}): TorneiListData {
  return {
    tornei,
    tPlayed: tornei.length,
    podi: 0,
    bestPlacement: 'Gironi',
    ...over,
  }
}

// ---------------------------------------------------------------------------
// Dominio grezzo (DiaryData): tornei, partite, compagni, foto. È l'input dei
// selettori del data layer. Le partite si costruiscono con winSets/lossSets per
// pilotare esito e punti senza scrivere i set a mano ad ogni test.
// ---------------------------------------------------------------------------

// Set che danno una vittoria 2-0 / una sconfitta 0-2, con punti per set
// controllabili (default 21-15). computeStats/res leggono solo i set: bastano
// questi due helper per pilotare record, punti, differenziale e distribuzione.
export const winSets = (us = 21, them = 15): SetScore[] => [{ us, them }, { us, them }]
export const lossSets = (us = 15, them = 21): SetScore[] => [{ us, them }, { us, them }]

export function makePartner(over: Partial<Partner> = {}): Partner {
  seq += 1
  const id = over.id ?? `p${seq}`
  return { id, name: `Compagno ${id}`, color: '#FF6B35', linkedUserId: null, shared: false, ...over }
}

export function makeTournament(over: Partial<Tournament> = {}): Tournament {
  seq += 1
  const id = over.id ?? `t${seq}`
  return {
    id,
    name: `Torneo ${id}`,
    date: '2026-06-15',
    city: 'Rimini',
    category: 'Open',
    format: '2vs2',
    surface: 'Sabbia outdoor',
    placement: 'Gironi',
    color: '#FF6B35',
    emoji: '🏖️',
    partnerId: null,
    shared: false,
    ...over,
  }
}

export function makeMatch(over: Partial<Match> = {}): Match {
  seq += 1
  const id = over.id ?? `m${seq}`
  return {
    id,
    tournamentId: over.tournamentId ?? 't1',
    partnerId: null,
    opponents: 'Rossi/Bianchi',
    phase: 'Girone',
    note: '',
    sets: winSets(),
    ...over,
  }
}

export function makePhoto(over: Partial<Photo> = {}): Photo {
  seq += 1
  const id = over.id ?? `f${seq}`
  return { id, tournamentId: over.tournamentId ?? 't1', color: '#FF6B35', caption: '', url: 'https://cdn.example/x.jpg', ...over }
}

// DiaryData vuoto per default: ogni test aggiunge solo le collezioni che usa.
export function makeData(over: Partial<DiaryData> = {}): DiaryData {
  return { tournaments: [], matches: [], partners: [], photos: [], ...over }
}
