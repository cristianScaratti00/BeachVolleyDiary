import type {
  Tournament,
  Match,
  Partner,
  Photo,
  DiaryData,
  SetScore,
} from "../lib/models";
import type {
  TorneoCard,
  TorneiListData,
  DiaryEntry,
  DiaryMatchHit,
  DiarySearchFields,
} from "../lib/derive";
import { normalizeText } from "../lib/search";
import type { PresentUser } from "../lib/models";

// "Oggi" fisso per tutti i test: `deriveTorneiSections` accetta `today` come
// parametro proprio per questo. Nessun test deve dipendere dall'orologio, o a
// mezzanotte UTC la suite cambia colore da sola.
export const TODAY = "2026-07-22";

let seq = 0;

export function makeTorneo(over: Partial<TorneoCard> = {}): TorneoCard {
  seq += 1;
  const id = over.id ?? `t${seq}`;
  return {
    id,
    name: `Torneo ${id}`,
    category: "Open",
    format: "2vs2",
    date: "2026-01-15",
    dot: "#FF6B35",
    badge: "Gironi",
    badgeBg: "#F2F0EC",
    badgeColor: "rgba(27,42,74,.5)",
    meta: "15 gen 2026 · Rimini · 2vs2",
    record: "2-1",
    winPct: 67,
    matchCount: 3,
    shared: false,
    ...over,
  };
}

export function makeList(
  tornei: TorneoCard[],
  over: Partial<TorneiListData> = {},
): TorneiListData {
  return {
    tornei,
    tPlayed: tornei.length,
    podi: 0,
    bestPlacement: "Gironi",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Dominio grezzo (DiaryData): tornei, partite, compagni, foto. È l'input dei
// selettori del data layer. Le partite si costruiscono con winSets/lossSets per
// pilotare esito e punti senza scrivere i set a mano ad ogni test.
// ---------------------------------------------------------------------------

// Set che danno una vittoria 2-0 / una sconfitta 0-2, con punti per set
// controllabili (default 21-15). computeStats/res leggono solo i set: bastano
// questi due helper per pilotare record, punti, differenziale e distribuzione.
export const winSets = (us = 21, them = 15): SetScore[] => [
  { us, them },
  { us, them },
];
export const lossSets = (us = 15, them = 21): SetScore[] => [
  { us, them },
  { us, them },
];

export function makePartner(over: Partial<Partner> = {}): Partner {
  seq += 1;
  const id = over.id ?? `p${seq}`;
  return {
    id,
    name: `Compagno ${id}`,
    color: "#FF6B35",
    linkedUserId: null,
    shared: false,
    ...over,
  };
}

export function makeTournament(over: Partial<Tournament> = {}): Tournament {
  seq += 1;
  const id = over.id ?? `t${seq}`;
  return {
    id,
    name: `Torneo ${id}`,
    date: "2026-06-15",
    city: "Rimini",
    category: "Open",
    format: "2vs2",
    surface: "Sabbia outdoor",
    placement: "Gironi",
    color: "#FF6B35",
    emoji: "🏖️",
    partnerId: null,
    shared: false,
    ...over,
  };
}

export function makeMatch(over: Partial<Match> = {}): Match {
  seq += 1;
  const id = over.id ?? `m${seq}`;
  return {
    id,
    tournamentId: over.tournamentId ?? "t1",
    partnerId: null,
    opponents: "Rossi/Bianchi",
    phase: "Girone",
    note: "",
    sets: winSets(),
    ...over,
  };
}

export function makePhoto(over: Partial<Photo> = {}): Photo {
  seq += 1;
  const id = over.id ?? `f${seq}`;
  return {
    id,
    tournamentId: over.tournamentId ?? "t1",
    color: "#FF6B35",
    caption: "",
    url: "https://cdn.example/x.jpg",
    ...over,
  };
}

// DiaryData vuoto per default: ogni test aggiunge solo le collezioni che usa.
export function makeData(over: Partial<DiaryData> = {}): DiaryData {
  return { tournaments: [], matches: [], partners: [], photos: [], ...over };
}
// ---------------------------------------------------------------------------
// Diario (view-model): una voce già derivata, per i test dello screen. I campi
// `search` seguono di default i valori mostrati (normalizzati come fa
// `deriveDiary`), così una voce di fabbrica risponde alla ricerca sul proprio
// titolo/data senza doverli scrivere due volte; il resto si passa a mano.
// ---------------------------------------------------------------------------

export function makeDiaryMatchHit(over: Partial<DiaryMatchHit> = {}): DiaryMatchHit {
  seq += 1;
  const id = over.id ?? `m${seq}`;
  const phase = over.phase ?? "Girone";
  const opponents = over.opponents ?? "Rossi/Bianchi";
  const note = over.note ?? "";
  return {
    id,
    phase,
    opponents,
    note,
    esitoShort: "V",
    esitoColor: "#FF6B35",
    setChips: [
      { txt: "21-15", bg: "#FFF1EA", color: "#C4501E" },
      { txt: "21-15", bg: "#FFF1EA", color: "#C4501E" },
    ],
    search: [phase, opponents, note].map(normalizeText).filter(Boolean),
    ...over,
  };
}

// I campi `search` si possono sovrascrivere uno per volta (es. solo `place`):
// nel test si scrive il campo che conta, non tutti e sette.
type DiaryEntryOver = Partial<Omit<DiaryEntry, "search">> & {
  search?: Partial<DiarySearchFields>;
};

export function makeDiaryEntry(over: DiaryEntryOver = {}): DiaryEntry {
  seq += 1;
  const id = over.id ?? `t${seq}`;
  const title = over.title ?? `Torneo ${id}`;
  const day = over.day ?? "15";
  const month = over.month ?? "Giu";
  const year = over.year ?? "2026";
  const matches = over.matches ?? [];
  return {
    id,
    day,
    month,
    year,
    emoji: "🏖️",
    title,
    desc: "Tappa Open a Rimini · 2 vittorie su 3 — 67% W",
    accent: "rgba(27,42,74,.25)",
    badge: "Gironi",
    badgeBg: "#F2F0EC",
    badgeColor: "rgba(27,42,74,.5)",
    photos: [],
    morePhotos: 0,
    ...over,
    matches,
    search: {
      title: normalizeText(title),
      place: "",
      when: normalizeText(`${year} ${month} ${day}`),
      partner: "",
      opponents: normalizeText(matches.map((m) => m.opponents).join(" ")),
      notes: normalizeText(matches.map((m) => m.note).join(" ")),
      captions: "",
      ...over.search,
    },
  };
}

// Un utente presente nella stanza di "Chi c'è oggi" (già mappato/ordinato).
let presentSeq = 0;
export function makePresentUser(over: Partial<PresentUser> = {}): PresentUser {
  presentSeq += 1;
  const id = over.id ?? `u${presentSeq}`;
  return {
    id,
    name: `Utente ${id}`,
    avatarUrl: null,
    lookingForPartner: true,
    note: "",
    ...over,
  };
}
