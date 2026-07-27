// ============================================================================
// Selettore della "Mappa delle conquiste": da DiaryData grezzo al view-model
// che la schermata si limita a disegnare.
//
// Perché un file a parte e non dentro `derive.ts`: `derive.ts` è il selettore di
// TUTTE le schermate, e non deve dipendere dal gazetteer né dal tracciato
// dell'Italia. Qui la dipendenza è confinata a un modulo solo.
//
// ⚠️ Onestà sul peso: la mappa è la seconda vista di Tornei, non una schermata
// separata, quindi oggi App importa questo modulo **eagerly** e il chunk
// principale cresce di ~30 KB grezzi / ~12 KB gzippati (39,5 → 51,4 KB gz,
// misurato con `npm run build`). È il prezzo della scelta di interazione: dietro
// un toggle a un click, un chunk lazy comprerebbe soprattutto uno spinner.
// Se un domani la mappa diventasse una voce di navigazione a sé, questo file è
// già il punto di taglio: basta un `lazy()` sul suo unico consumatore.
//
// Lavora su `DiaryData` e non su `TorneoCard` per due motivi concreti:
// `TorneoCard` non espone `city` (è appiattita dentro la stringa `meta`, quattro
// punti di costruzione fra client e server), e i tornei CONDIVISI da un socio
// collegato esistono solo nei dati client — la RPC `tornei_list` filtra su
// `user_id = auth.uid()`.
// ============================================================================
import { computeStats, placementRank, fmtDate, yearOf } from './stats'
import { dotForRank, todayISO } from './derive'
import type { DiaryData, Tournament } from './models'
import { geoKey, geocodeCity, project, spreadPins, MAP_VIEW } from './geo'
import { ITALY_OUTLINE } from './italy'

// ---------------------------------------------------------------------------
// View-model
// ---------------------------------------------------------------------------

export type MappaTier = 'vinto' | 'podio' | 'giocato'

export interface MappaTorneoRow {
  id: string
  name: string
  date: string // ISO, per l'ordinamento
  dateLabel: string // "15 giu", già formattata
  badge: string // il piazzamento grezzo
  badgeBg: string
  badgeColor: string
  shared: boolean
}

export interface MappaPin {
  key: string // geoKey(city): chiave di aggregazione, stabile fra i render
  city: string // grafia da mostrare (quella del torneo più recente)
  x: number // posizione DISEGNATA nel viewBox (già distanziata)
  y: number
  ax: number // ancora geografica vera: capolinea del filo di richiamo
  ay: number
  displaced: boolean // true = spostato per leggibilità ⇒ disegna il filo
  rank: number // miglior placementRank della città
  fill: string // dotForRank(rank) — la regola esistente, non una nuova
  best: string // stringa GREZZA del piazzamento ('1° 🏆', 'Semifinale')
  tier: MappaTier
  // Forma, non solo colore: l'accessibilità della mappa dipende da questi tre.
  radius: number
  inner: number // raggio del punto bianco interno (solo 'vinto'), 0 altrimenti
  hollow: boolean // solo contorno (tier 'giocato')
  count: number // tornei giocati lì
  podi: number
  played: number // partite giocate lì
  winPct: number
  record: string // "6-2"
  shared: boolean // true = TUTTI i tornei di quella città sono condivisi
  tornei: MappaTorneoRow[] // data desc
  label: string // riga di riepilogo per la lista
  srLabel: string // testo completo per lo screen reader
}

export interface MappaCitta {
  key: string
  city: string
  count: number
  tornei: MappaTorneoRow[]
}

export interface MappaLegendaRow {
  tier: MappaTier
  label: string
  count: number
}

export interface MappaData {
  pins: MappaPin[] // ordinati peggiori→migliori: l'oro si disegna per ultimo
  fuoriItalia: MappaCitta[] // geocodabili ma fuori dal riquadro (Spalato, Ibiza)
  sconosciute: MappaCitta[] // città che il gazetteer non conosce
  senzaCitta: number // tornei giocati con city === ''
  nonGiocati: number // "In corso" e futuri: esclusi, ma non in silenzio
  citta: number
  cittaConPodio: number
  cittaVinte: number
  tornei: number // tornei che finiscono sulla mappa
  migliore: MappaPin | null
  legenda: MappaLegendaRow[]
  srSummary: string // nome accessibile dell'SVG
  outline: string // il tracciato: la schermata non importa `italy.ts`
  viewBox: string
}

// ---------------------------------------------------------------------------
// Forma dei pin
// ---------------------------------------------------------------------------
// Colore = miglior piazzamento (`dotForRank`), dimensione = quanti tornei.
// I due assi rispondono a due domande diverse: "dove ho vinto" e "dove torno".
const R_MIN = 5
const R_STEP = 0.5
const R_EXTRA_MAX = 3 // oltre il 4° torneo il pin non cresce più
// ⚠️ Invariante: `R_MIN + R_EXTRA_MAX * R_STEP` non deve superare `MIN_DIST / 2`,
// o due pin adiacenti al massimo della crescita si sovrapporrebbero nonostante il
// declustering. 5 + 3·0,5 = 6,5 = 13/2: al limite si sfiorano, mai si accavallano.
// C'è un test che lo tiene fermo.

function formaDelPin(tier: MappaTier, count: number): { radius: number; inner: number; hollow: boolean } {
  // La dimensione dice SOLO quanti tornei: il tier è già detto dalla forma e dal
  // colore. Un raggio minimo per il tier 'vinto' renderebbe una vittoria singola
  // più grande di tre uscite ai gironi, e i due assi si confonderebbero.
  const radius = R_MIN + Math.min(count - 1, R_EXTRA_MAX) * R_STEP
  return {
    radius: +radius.toFixed(2),
    // Il "timbro": disco pieno + punto bianco. Pieno-con-punto / pieno / vuoto
    // si distingue a 10 px, in bianco e nero e con qualsiasi deficit della
    // visione cromatica — cosa che tre tonalità di arancio non fanno.
    inner: tier === 'vinto' ? +(radius * 0.34).toFixed(2) : 0,
    hollow: tier === 'giocato',
  }
}

const tierOf = (rank: number): MappaTier => (rank === 1 ? 'vinto' : rank <= 3 ? 'podio' : 'giocato')

const TIER_LABEL: Record<MappaTier, string> = {
  vinto: 'Vinto qui',
  podio: 'Podio',
  giocato: 'Giocato',
}

// ---------------------------------------------------------------------------
// Regole di inclusione
// ---------------------------------------------------------------------------

// La mappa è delle **conquiste**: ci finisce solo ciò che è già stato giocato.
// Un torneo "In corso" non è un risultato, e uno di settembre non è ancora
// successo — includerli li dipingerebbe come un'uscita ai gironi, perché oggi
// `placementRank('In corso')` vale 9 come tutto ciò che non riconosce.
function giaGiocato(t: Tournament, today: string): boolean {
  return t.placement !== 'In corso' && t.date <= today
}

const nelPeriodo = (t: Tournament, fYear: string): boolean =>
  !fYear || fYear === 'Sempre' || yearOf(t.date) === fYear

function torneoRow(t: Tournament): MappaTorneoRow {
  const podium = placementRank(t.placement) <= 3
  return {
    id: t.id,
    name: t.name,
    date: t.date,
    dateLabel: fmtDate(t.date),
    badge: t.placement,
    badgeBg: podium ? '#FFF1EA' : '#F2F0EC',
    badgeColor: podium ? '#C4501E' : 'rgba(27,42,74,.5)',
    shared: t.shared,
  }
}

const perDataDesc = (a: MappaTorneoRow, b: MappaTorneoRow) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

interface Gruppo {
  key: string
  tornei: Tournament[]
}

// Raggruppa per `geoKey`: "Rimini", " rimini ", "RIMINI" e "Forlì"/"Forli" sono
// la stessa città. Le chiavi arrivano in ordine alfabetico, non nell'ordine in
// cui capitano i tornei: la mappa non deve dipendere da come il DB ordina.
function raggruppaPerCitta(tornei: Tournament[]): Gruppo[] {
  const per = new Map<string, Tournament[]>()
  tornei.forEach((t) => {
    const k = geoKey(t.city)
    if (!k) return
    const arr = per.get(k)
    if (arr) arr.push(t)
    else per.set(k, [t])
  })
  return [...per.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, list]) => ({ key, tornei: list }))
}

// Grafia da mostrare: quella del torneo più recente. Un utente che scrive
// "rimini" per anni e poi "Rimini" vede aggiornarsi l'etichetta, non nascere un
// secondo pin.
function grafiaPiuRecente(tornei: Tournament[]): string {
  return [...tornei].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0].city.trim()
}

function cittaFuoriMappa(g: Gruppo): MappaCitta {
  return {
    key: g.key,
    city: grafiaPiuRecente(g.tornei),
    count: g.tornei.length,
    tornei: g.tornei.map(torneoRow).sort(perDataDesc),
  }
}

// ---------------------------------------------------------------------------
// deriveMappa
// ---------------------------------------------------------------------------
// Puro: nessun `Date.now()` interno (l'"oggi" è iniettabile come in
// `deriveTorneiSections`), nessun `Math.random()`, l'input non viene mai mutato.
export function deriveMappa(data: DiaryData, fYear: string, today = todayISO()): MappaData {
  const giocati = data.tournaments.filter((t) => giaGiocato(t, today))
  // I "non giocati" sono quelli DELLA STAGIONE SELEZIONATA, come ogni altro
  // numero di questa mappa. Contarli su tutto l'archivio faceva scrivere in
  // fondo alla pagina "2 tornei sono ancora in programma" mentre si guarda il
  // 2025 — un conteggio vero ma di un altro anno, cioè un numero sbagliato.
  const nonGiocati = data.tournaments.filter((t) => !giaGiocato(t, today) && nelPeriodo(t, fYear)).length

  // ---- Posizioni: calcolate su TUTTE le città mai giocate, non solo quelle
  // dell'anno selezionato. È il motivo per cui cambiare filtro non fa saltare i
  // pin da una parte all'altra della mappa: il grappolo si scioglie una volta
  // sola, sull'insieme completo, e il filtro poi si limita a nascondere righe.
  const semi = raggruppaPerCitta(giocati)
    .map((g) => ({ key: g.key, punto: geocodeCity(g.tornei[0].city) }))
    .filter((s): s is { key: string; punto: { lat: number; lng: number } } => !!s.punto)
    .filter((s) => project(s.punto).inside)
    .map((s) => ({ key: s.key, lat: s.punto.lat, lng: s.punto.lng }))
  const posizioni = new Map(spreadPins(semi).map((p) => [p.key, p]))

  // ---- Bucket dell'anno selezionato. Tre bucket, nessuno silenzioso.
  const delPeriodo = giocati.filter((t) => nelPeriodo(t, fYear))
  const senzaCitta = delPeriodo.filter((t) => !geoKey(t.city)).length

  const pins: MappaPin[] = []
  const fuoriItalia: MappaCitta[] = []
  const sconosciute: MappaCitta[] = []

  for (const g of raggruppaPerCitta(delPeriodo)) {
    const punto = geocodeCity(g.tornei[0].city)
    if (!punto) {
      // Il gazetteer non la conosce. NON sparisce: la sezione "Non ancora sulla
      // mappa" la rende visibile, ed è così che si scopre cosa manca.
      sconosciute.push(cittaFuoriMappa(g))
      continue
    }
    const pos = posizioni.get(g.key)
    if (!pos) {
      // Geocodabile ma fuori dal riquadro (Spalato, Ibiza). Riga di lista, mai
      // un pin: il viewBox non si adatta ai dati, altrimenti un viaggio
      // all'estero rimpicciolisce l'Italia di tutti.
      fuoriItalia.push(cittaFuoriMappa(g))
      continue
    }

    const ranks = g.tornei.map((t) => placementRank(t.placement))
    const rank = Math.min(...ranks)
    const tier = tierOf(rank)
    // `best` porta la stringa GREZZA del piazzamento, non `PLACEMENT_LABELS[rank]`:
    // quella tabella non copre ogni rank (manca la chiave 7) e ricade su '—',
    // quindi un piazzamento fuori scala sparirebbe dietro un trattino. La stringa
    // grezza è anche quella che l'utente ha scritto sul torneo, ed è ciò che si
    // legge sul pin (vedi docs/QA-mappa-conquiste.md).
    const migliore = g.tornei.filter((t) => placementRank(t.placement) === rank).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const partite = data.matches.filter((m) => g.tornei.some((t) => t.id === m.tournamentId))
    const s = computeStats(partite)
    const count = g.tornei.length
    const podi = ranks.filter((r) => r <= 3).length
    const city = grafiaPiuRecente(g.tornei)
    const forma = formaDelPin(tier, count)
    const label = [
      count === 1 ? '1 torneo' : `${count} tornei`,
      `miglior risultato ${migliore.placement}`,
      s.played ? `${s.winPct}% vittorie` : 'nessuna partita',
    ].join(' · ')

    pins.push({
      key: g.key,
      city,
      x: pos.x,
      y: pos.y,
      ax: pos.ax,
      ay: pos.ay,
      displaced: pos.displaced,
      rank,
      fill: dotForRank(rank),
      best: migliore.placement,
      tier,
      ...forma,
      count,
      podi,
      played: s.played,
      winPct: s.winPct,
      record: s.won + '-' + s.lost,
      shared: g.tornei.every((t) => t.shared),
      tornei: g.tornei.map(torneoRow).sort(perDataDesc),
      label,
      srLabel: `${city}: ${label}`,
    })
  }

  // Ordine di disegno: peggiori prima, così i pin oro finiscono sopra a tutti
  // invece di sparire sotto un vicino neutro. Le liste della schermata usano lo
  // stesso array — il criterio secondario (più tornei, poi chiave) lo rende
  // stabile a parità di rank.
  pins.sort((a, b) => b.rank - a.rank || a.count - b.count || (a.key < b.key ? -1 : 1))

  const cittaVinte = pins.filter((p) => p.tier === 'vinto').length
  const cittaConPodio = pins.filter((p) => p.tier === 'podio').length
  const migliore =
    [...pins].sort((a, b) => a.rank - b.rank || b.count - a.count || (a.key < b.key ? -1 : 1))[0] ?? null

  // Le tre righe ci sono SEMPRE, anche a zero: il vocabolario della mappa si
  // impara prima di avere una vittoria, non dopo.
  const legenda: MappaLegendaRow[] = (['vinto', 'podio', 'giocato'] as MappaTier[]).map((tier) => ({
    tier,
    label: TIER_LABEL[tier],
    count: pins.filter((p) => p.tier === tier).length,
  }))

  const srSummary = pins.length
    ? `Mappa d'Italia con ${pins.length === 1 ? '1 città' : pins.length + ' città'} in cui hai giocato: ` +
      `${cittaVinte} con una vittoria, ${cittaConPodio} con un podio, ` +
      `${pins.length - cittaVinte - cittaConPodio} senza podio. ` +
      `L'elenco completo delle città è qui sotto.`
    : "Mappa d'Italia, ancora senza città."

  return {
    pins,
    fuoriItalia,
    sconosciute,
    senzaCitta,
    nonGiocati,
    citta: pins.length,
    cittaConPodio,
    cittaVinte,
    tornei: pins.reduce((n, p) => n + p.count, 0),
    migliore,
    legenda,
    srSummary,
    outline: ITALY_OUTLINE,
    viewBox: MAP_VIEW.viewBox,
  }
}

// Riepilogo per l'intestazione: quante città e quante conquistate. Tenuto qui e
// non nello screen perché è una regola sui dati, non una scelta di layout.
export function mappaSubtitle(m: MappaData): string {
  if (!m.citta) return 'Nessuna città ancora sulla mappa'
  const parti = [m.citta === 1 ? '1 città' : `${m.citta} città`]
  if (m.cittaVinte) parti.push(m.cittaVinte === 1 ? '1 conquistata' : `${m.cittaVinte} conquistate`)
  parti.push(m.tornei === 1 ? '1 torneo' : `${m.tornei} tornei`)
  return parti.join(' · ')
}
