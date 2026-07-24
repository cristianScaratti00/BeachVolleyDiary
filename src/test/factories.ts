// ============================================================================
// Fixture per i test delle schermate (Tornei, Chi c'è oggi).
//
// Regola: ogni test dichiara solo i campi che gli interessano (id, format,
// date…). Tutto il resto arriva da qui, così quando un view-model cresce di un
// campo si aggiorna un punto solo e i test restano leggibili.
// ============================================================================
import type { TorneoCard, TorneiListData } from '../lib/derive'
import type { PresentUser } from '../lib/models'

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

// Un utente presente nella stanza di "Chi c'è oggi" (già mappato/ordinato).
let presentSeq = 0
export function makePresentUser(over: Partial<PresentUser> = {}): PresentUser {
  presentSeq += 1
  const id = over.id ?? `u${presentSeq}`
  return {
    id,
    name: `Utente ${id}`,
    avatarUrl: null,
    lookingForPartner: true,
    note: '',
    ...over,
  }
}
