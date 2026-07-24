import type {
  Tournament,
  Match,
  Partner,
  Photo,
  DiaryData,
  SetScore,
} from "../lib/models";
import type { TorneoCard, TorneiListData } from "../lib/derive";
import type { PresentUser } from "../lib/models";
import type {
  MappaData,
  MappaPin,
  MappaTorneoRow,
} from "../lib/derive.mappa";

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

// ---------------------------------------------------------------------------
// Mappa delle conquiste. I pin arrivano allo screen già posizionati: qui le
// coordinate sono numeri qualsiasi ma plausibili — la correttezza geografica è
// verificata in geo.test.ts, non montando un componente.
// ---------------------------------------------------------------------------
let mappaSeq = 0;

export function makeMappaTorneoRow(
  over: Partial<MappaTorneoRow> = {},
): MappaTorneoRow {
  mappaSeq += 1;
  const id = over.id ?? `mt${mappaSeq}`;
  return {
    id,
    name: `Torneo ${id}`,
    date: "2026-06-15",
    dateLabel: "15 giu",
    badge: "Gironi",
    badgeBg: "#F2F0EC",
    badgeColor: "rgba(27,42,74,.5)",
    shared: false,
    ...over,
  };
}

export function makeMappaPin(over: Partial<MappaPin> = {}): MappaPin {
  const tier: MappaPin["tier"] = over.tier ?? "giocato";
  const city = over.city ?? "Rimini";
  const count = over.count ?? 1;
  const label = `${count === 1 ? "1 torneo" : `${count} tornei`} · miglior risultato ${over.best ?? "Gironi"} · 50% vittorie`;
  return {
    key: city.toLowerCase(),
    city,
    x: 172,
    y: 120,
    ax: 172,
    ay: 120,
    displaced: false,
    rank: tier === "vinto" ? 1 : tier === "podio" ? 2 : 8,
    fill:
      tier === "vinto"
        ? "#FF6B35"
        : tier === "podio"
          ? "#F7A883"
          : "rgba(27,42,74,.25)",
    best: "Gironi",
    tier,
    radius: 5,
    inner: tier === "vinto" ? 2 : 0,
    hollow: tier === "giocato",
    count,
    podi: tier === "giocato" ? 0 : 1,
    played: 2,
    winPct: 50,
    record: "1-1",
    shared: false,
    tornei: [makeMappaTorneoRow()],
    label,
    srLabel: `${city}: ${label}`,
    ...over,
  };
}

export function makeMappaData(over: Partial<MappaData> = {}): MappaData {
  const pins = over.pins ?? [];
  const conta = (t: MappaPin["tier"]) => pins.filter((p) => p.tier === t).length;
  return {
    pins,
    fuoriItalia: [],
    sconosciute: [],
    senzaCitta: 0,
    nonGiocati: 0,
    citta: pins.length,
    cittaConPodio: conta("podio"),
    cittaVinte: conta("vinto"),
    tornei: pins.reduce((n, p) => n + p.count, 0),
    migliore: pins[pins.length - 1] ?? null,
    legenda: [
      { tier: "vinto", label: "Vinto qui", count: conta("vinto") },
      { tier: "podio", label: "Podio", count: conta("podio") },
      { tier: "giocato", label: "Giocato", count: conta("giocato") },
    ],
    srSummary: pins.length
      ? `Mappa d'Italia con ${pins.length} città in cui hai giocato.`
      : "Mappa d'Italia, ancora senza città.",
    outline: "M10 10 L30 10 L30 30Z",
    viewBox: "0 0 340 408",
    ...over,
  };
}
