// ============================================================================
// Ricerca del luogo su Photon (photon.komoot.io), il geocoder OpenStreetMap.
//
// È l'UNICO punto dell'app che manda del testo scritto dall'utente a un
// servizio esterno, ed è una scelta deliberata: il campo "Città" a testo libero
// non riusciva a produrre coordinate, quindi ogni luogo nasceva senza posizione
// e restava fuori dalla mappa. Cercando invece si ottengono le coordinate del
// POSTO — «Bagno 26», non il centro di Riccione, che è a due chilometri.
//
// Perché Photon e non Nominatim: la usage policy di Nominatim vieta
// esplicitamente le ricerche a ogni tasto premuto. Photon è costruito per
// quello, non chiede una chiave API e legge gli stessi dati OSM delle tile che
// la mappa già scarica.
//
// Cosa esce dall'app: solo la stringa digitata. Nessun id utente, nessun dato
// del diario. La ricerca è facoltativa — GPS e coordinate incollate a mano
// restano, e se il servizio non risponde il form continua a funzionare.
//
// Modulo puro: nessun React. La rete si mocka con `fetch`, i test non escono.
// ============================================================================

export interface LuogoTrovato {
  id: string // stabile fra i render della stessa risposta
  nome: string // "Bagno 26" — quello che finisce nel nome del luogo
  citta: string // "Riccione" — comune, con fallback su provincia/regione
  contesto: string // riga di dettaglio: "Riccione · Emilia-Romagna · Italia"
  tipo: string // "Stabilimento balneare", "Ristorante"… '' se non riconosciuto
  lat: number
  lng: number
}

const ENDPOINT = 'https://photon.komoot.io/api'

// Sotto le 3 lettere i risultati sono rumore e la richiesta è sprecata.
export const MIN_QUERY = 3

// Quanti risultati chiedere. Otto stanno in un elenco che non fa scorrere il
// modale: oltre, si scrive una parola in più invece di scorrere.
const LIMIT = 8

// Centro dell'Italia: Photon lo usa per ordinare i risultati vicini prima.
// Non è un filtro — un torneo a Ibiza si trova lo stesso, esce solo più sotto.
const BIAS = { lat: 42.5, lon: 12.5 }

// Le proprietà di Photon che ci servono. Il resto della risposta si ignora:
// dichiarare solo ciò che si legge evita di dipendere da campi che il servizio
// può cambiare.
interface PhotonProps {
  osm_key?: string
  osm_value?: string
  name?: string
  street?: string
  housenumber?: string
  city?: string
  district?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
  osm_id?: number
  osm_type?: string
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown }
  properties?: PhotonProps
}

// Il comune, con la scala di fallback che serve davvero: `city` manca spesso
// sulle località costiere mappate come frazione, e in quel caso `district` o
// `county` sono la cosa più vicina a "dove si trova".
function comuneDi(p: PhotonProps): string {
  return (p.city || p.district || p.county || p.state || '').trim()
}

// Riga di contesto: serve a distinguere due omonimi nell'elenco ("Marina di
// Ravenna · Ravenna · Italia" vs una Marina qualunque). Niente duplicati: se il
// nome è già il comune, non lo ripete.
function contestoDi(p: PhotonProps, nome: string): string {
  const parti = [comuneDi(p), p.state, p.country]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .filter((s) => s !== nome)
  return [...new Set(parti)].join(' · ')
}

// Nome da mostrare. Photon lascia `name` vuoto sugli indirizzi puri (una via
// con civico), e lì il nome utile è "Via Milano 12".
function nomeDi(p: PhotonProps): string {
  const n = (p.name || '').trim()
  if (n) return n
  const via = [p.street, p.housenumber].filter(Boolean).join(' ').trim()
  return via
}

// ⚠️ GeoJSON ordina le coordinate [longitudine, latitudine] — l'INVERSO di come
// si scrivono e di come le vuole Leaflet. Invertirle è l'errore classico, e non
// fallisce in modo rumoroso: sposta soltanto i pin dall'altra parte del mondo.
// C'è un test che lo tiene fermo.
function coordinateDi(geometry: PhotonFeature['geometry']): { lat: number; lng: number } | null {
  const c = geometry?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const lng = Number(c[0])
  const lat = Number(c[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

// Che cosa è questo risultato, in una parola.
//
// Non è decorazione: cercando "bagno 26" Photon mescola stabilimenti, strade,
// un tatuatore e una colonnina di ricarica, tutti a Riccione e tutti chiamati
// «26». Senza il tipo si sceglie a caso e il pin finisce sul ristorante.
// Filtrare via le categorie sbagliate sarebbe peggio — nasconderebbe risultati
// legittimi — mentre dire cosa sono lascia decidere a chi c'era.
//
// Coperte le categorie che capitano davvero a chi cerca un campo da beach; per
// tutto il resto meglio niente che un'etichetta generica che non aiuta.
const TIPI: Record<string, string> = {
  'leisure/beach_resort': 'Stabilimento balneare',
  'leisure/sports_centre': 'Centro sportivo',
  'leisure/pitch': 'Campo sportivo',
  'leisure/park': 'Parco',
  'natural/beach': 'Spiaggia',
  'amenity/restaurant': 'Ristorante',
  'amenity/bar': 'Bar',
  'amenity/cafe': 'Bar',
  'tourism/hotel': 'Hotel',
  'tourism/camp_site': 'Campeggio',
}

function tipoDi(p: PhotonProps): string {
  const key = `${p.osm_key ?? ''}/${p.osm_value ?? ''}`
  const noto = TIPI[key]
  if (noto) return noto
  // Le famiglie larghe: qualunque `place/*` è una località abitata, qualunque
  // `highway/*` è una strada. Sono i due casi più frequenti dopo i precedenti.
  if (p.osm_key === 'place') return 'Località'
  if (p.osm_key === 'highway') return 'Strada'
  return ''
}

export function mapPhotonFeature(f: PhotonFeature, i: number): LuogoTrovato | null {
  const p = f.properties ?? {}
  const nome = nomeDi(p)
  const punto = coordinateDi(f.geometry)
  // Senza nome o senza coordinate la voce non serve a niente: il form deve
  // uscirne con entrambi.
  if (!nome || !punto) return null
  return {
    id: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `i${i}`,
    nome,
    citta: comuneDi(p) || nome,
    contesto: contestoDi(p, nome),
    tipo: tipoDi(p),
    ...punto,
  }
}

export class GeoSearchError extends Error {}

/**
 * Cerca un luogo. Ritorna [] per le query troppo corte, senza toccare la rete.
 * Lancia `GeoSearchError` se il servizio non risponde — chi chiama lo mostra e
 * lascia comunque disponibili GPS e coordinate a mano.
 * `signal` serve a buttare via la richiesta di un tasto già superato.
 */
export async function cercaLuoghi(query: string, signal?: AbortSignal): Promise<LuogoTrovato[]> {
  const q = query.trim()
  if (q.length < MIN_QUERY) return []

  // ⚠️ NIENTE `lang`. Photon accetta solo default/de/en/fr: passargli `it` fa
  // rispondere 400 a OGNI richiesta, e la ricerca sembra semplicemente rotta.
  // Omesso vale "default", cioè il nome come sta nei dati OSM. Non garantisce
  // l'italiano — lo stesso posto può tornare "Italia" o "Italy" a seconda del
  // server che risponde — ma è l'opzione più vicina, e il paese è solo contesto.
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=${LIMIT}&lat=${BIAS.lat}&lon=${BIAS.lon}`

  let res: Response
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    // L'annullamento non è un errore: è una richiesta che non interessa più.
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new GeoSearchError('rete')
  }
  if (!res.ok) throw new GeoSearchError(`http ${res.status}`)

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new GeoSearchError('risposta illeggibile')
  }

  const features = (body as { features?: unknown })?.features
  if (!Array.isArray(features)) return []

  const luoghi = features
    .map((f, i) => mapPhotonFeature(f as PhotonFeature, i))
    .filter((l): l is LuogoTrovato => l !== null)

  // Photon può restituire la stessa cosa a più zoom (il nodo e il poligono):
  // in elenco sarebbero due righe identiche da scegliere a caso.
  const visti = new Set<string>()
  return luoghi.filter((l) => {
    const k = `${l.nome}|${l.citta}|${l.lat.toFixed(4)},${l.lng.toFixed(4)}`
    if (visti.has(k)) return false
    visti.add(k)
    return true
  })
}
