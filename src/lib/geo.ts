// ============================================================================
// Geografia della "Mappa delle conquiste": proiezione, gazetteer statico,
// risoluzione città→coordinate e scioglimento dei grappoli di pin.
//
// Puro: zero React, zero rete, zero orologio. Il geocoding è una tabella
// committata, non una chiamata HTTP — è ciò che tiene i test deterministici
// (vitest.config.ts lo dichiara) e la mappa utilizzabile offline.
// ============================================================================

export interface GeoPoint {
  lat: number
  lng: number
}

export interface ProjectedPoint {
  x: number
  y: number
  inside: boolean // dentro il riquadro disegnato (un torneo all'estero non lo è)
}

// ---------------------------------------------------------------------------
// Proiezione
// ---------------------------------------------------------------------------
// Equirettangolare con parallelo standard a 42°N.
// NON Mercator: su un arco di latitudine di ~11° non guadagna nulla e complica
// le costanti. NON equirettangolare pura: a queste latitudini cos(42°) ≈ 0,743,
// quindi con `x = lng` l'Italia verrebbe circa un terzo troppo larga.
//
// ⚠️ Queste quattro costanti sono condivise con `italy.ts`: il tracciato è già
// proiettato con esse. Cambiarle senza rigenerare il path (comando in
// `docs/QA-mappa-conquiste.md`) scollega i pin dalla costa e **nessun test di
// tipo se ne accorge** — quelli sui quadranti sì, ed è il motivo per cui ci sono.
export const MAP_VIEW = { w: 340, h: 408, viewBox: '0 0 340 408' } as const

const LAT_TOP = 47.45 // latitudine del bordo superiore del riquadro
const LNG0 = 12.5 // meridiano centrale: cade esattamente a x = 170
const K = 0.7431448254773942 // cos(42°): comprime le longitudini alla scala giusta
const SCALE = 36 // unità di viewBox per grado di latitudine (1 unità ≈ 3,1 km)

// Quanto vale un'unità di viewBox in chilometri: serve solo alle etichette e ai
// commenti, non ai calcoli.
export const KM_PER_UNIT = 111.32 / SCALE // ≈ 3,09

export function project(p: GeoPoint): ProjectedPoint {
  const x = MAP_VIEW.w / 2 + (p.lng - LNG0) * K * SCALE
  const y = (LAT_TOP - p.lat) * SCALE
  return { x, y, inside: x >= 0 && x <= MAP_VIEW.w && y >= 0 && y <= MAP_VIEW.h }
}

// ---------------------------------------------------------------------------
// Chiave del gazetteer
// ---------------------------------------------------------------------------
// ⚠️ NON è `normalizeCity` (derive.ts). Quella deve continuare a rispecchiare
// esattamente `check_ins.city_key` del DB (`lower(btrim(city))`), o le stanze di
// "Chi c'è oggi" si spaccano in silenzio. Qui possiamo essere più aggressivi
// perché il risultato non finisce mai in una query: serve solo a far combaciare
// quello che ha scritto l'utente con una riga di GAZETTEER.
//   'Forlì '              → 'forli'
//   'Bellaria-Igea Marina' → 'bellaria igea marina'
//   "Sant'Agata"          → 'sant agata'
export function geoKey(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // via i segni diacritici
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Gazetteer
// ---------------------------------------------------------------------------
// I 107 capoluoghi di provincia (così qualsiasi città vera si risolve) più le
// località dove si gioca davvero a beach. Le frazioni costiere hanno coordinate
// proprie dove conta: Ostia sta a 41,73/12,28, non a Roma 41,90/12,50, altrimenti
// un torneo in spiaggia atterra 25 km nell'entroterra.
//
// Le chiavi sono già passate da `geoKey` (c'è un test che lo verifica) e i valori
// sono `[lat, lng]` — l'ordine dei tuple è il primo modo in cui 300 coordinate
// scritte a mano si rompono, quindi un test cicla su tutte e verifica che
// cadano dentro la sagoma dell'Italia.
export const GAZETTEER: Readonly<Record<string, readonly [number, number]>> = {
  // ---- Piemonte / Valle d'Aosta / Liguria ----
  torino: [45.07, 7.69],
  alessandria: [44.91, 8.62],
  asti: [44.9, 8.21],
  biella: [45.56, 8.05],
  cuneo: [44.39, 7.55],
  novara: [45.45, 8.62],
  verbania: [45.92, 8.55],
  vercelli: [45.32, 8.42],
  aosta: [45.74, 7.32],
  genova: [44.41, 8.93],
  imperia: [43.89, 8.03],
  'la spezia': [44.1, 9.82],
  savona: [44.31, 8.48],
  sanremo: [43.82, 7.78],
  bordighera: [43.78, 7.67],
  ventimiglia: [43.79, 7.61],
  alassio: [44.01, 8.17],
  albenga: [44.05, 8.21],
  loano: [44.13, 8.26],
  'finale ligure': [44.17, 8.34],
  varazze: [44.36, 8.58],
  arenzano: [44.4, 8.68],
  chiavari: [44.32, 9.32],
  'sestri levante': [44.27, 9.4],
  lerici: [44.08, 9.91],
  'levanto': [44.17, 9.61],

  // ---- Lombardia ----
  milano: [45.46, 9.19],
  bergamo: [45.7, 9.67],
  brescia: [45.54, 10.22],
  como: [45.81, 9.09],
  cremona: [45.13, 10.02],
  lecco: [45.86, 9.39],
  lodi: [45.31, 9.5],
  mantova: [45.16, 10.79],
  monza: [45.58, 9.27],
  pavia: [45.19, 9.16],
  sondrio: [46.17, 9.87],
  varese: [45.82, 8.83],
  'desenzano del garda': [45.47, 10.53],
  sirmione: [45.49, 10.61],

  // ---- Trentino-Alto Adige ----
  trento: [46.07, 11.12],
  bolzano: [46.5, 11.35],
  rovereto: [45.89, 11.04],
  'riva del garda': [45.89, 10.84],

  // ---- Veneto ----
  venezia: [45.44, 12.32],
  belluno: [46.14, 12.22],
  padova: [45.41, 11.88],
  rovigo: [45.07, 11.79],
  treviso: [45.67, 12.24],
  verona: [45.44, 10.99],
  vicenza: [45.55, 11.55],
  jesolo: [45.5, 12.64],
  caorle: [45.6, 12.88],
  bibione: [45.63, 13.05],
  'eraclea mare': [45.55, 12.78],
  'cavallino treporti': [45.46, 12.47],
  chioggia: [45.22, 12.28],
  'sottomarina': [45.2, 12.29],
  'rosolina mare': [45.06, 12.32],
  'porto tolle': [44.95, 12.32],
  'peschiera del garda': [45.44, 10.69],
  bardolino: [45.55, 10.72],
  lazise: [45.5, 10.73],

  // ---- Friuli-Venezia Giulia ----
  trieste: [45.65, 13.77],
  gorizia: [45.94, 13.62],
  pordenone: [45.96, 12.66],
  udine: [46.06, 13.24],
  'lignano sabbiadoro': [45.68, 13.13],
  grado: [45.68, 13.39],
  monfalcone: [45.8, 13.53],
  muggia: [45.6, 13.77],

  // ---- Emilia-Romagna ----
  bologna: [44.49, 11.34],
  ferrara: [44.84, 11.62],
  forli: [44.22, 12.04],
  cesena: [44.14, 12.24],
  modena: [44.65, 10.93],
  parma: [44.8, 10.33],
  piacenza: [45.05, 9.69],
  ravenna: [44.42, 12.2],
  'reggio emilia': [44.7, 10.63],
  rimini: [44.06, 12.57],
  cervia: [44.26, 12.35],
  'milano marittima': [44.28, 12.34],
  'lido di savio': [44.31, 12.34],
  'lido di classe': [44.33, 12.33],
  'lido adriano': [44.42, 12.3],
  'punta marina': [44.45, 12.29],
  'marina di ravenna': [44.49, 12.28],
  'marina romea': [44.51, 12.27],
  'casalborsetti': [44.55, 12.27],
  cesenatico: [44.2, 12.4],
  'gatteo a mare': [44.18, 12.44],
  'san mauro mare': [44.17, 12.45],
  bellaria: [44.14, 12.47],
  'igea marina': [44.15, 12.46],
  'torre pedrera': [44.11, 12.53],
  viserba: [44.09, 12.54],
  riccione: [43.99, 12.65],
  'misano adriatico': [43.97, 12.69],
  cattolica: [43.96, 12.74],
  comacchio: [44.69, 12.18],
  'porto garibaldi': [44.68, 12.23],
  'lido degli estensi': [44.66, 12.24],
  'lido di spina': [44.64, 12.25],
  'lido delle nazioni': [44.75, 12.22],
  'lido di volano': [44.78, 12.25],

  // ---- Toscana ----
  firenze: [43.77, 11.26],
  arezzo: [43.46, 11.88],
  grosseto: [42.76, 11.11],
  livorno: [43.55, 10.31],
  lucca: [43.84, 10.5],
  'massa': [44.03, 10.14],
  carrara: [44.08, 10.1],
  pisa: [43.72, 10.4],
  pistoia: [43.93, 10.92],
  prato: [43.88, 11.1],
  siena: [43.32, 11.33],
  viareggio: [43.87, 10.25],
  'lido di camaiore': [43.9, 10.21],
  'forte dei marmi': [43.96, 10.17],
  'marina di massa': [44.02, 10.09],
  'marina di carrara': [44.04, 10.04],
  'marina di pisa': [43.67, 10.27],
  tirrenia: [43.61, 10.28],
  castiglioncello: [43.4, 10.41],
  cecina: [43.3, 10.52],
  'marina di cecina': [43.3, 10.49],
  'san vincenzo': [43.1, 10.54],
  'marina di bibbona': [43.24, 10.51],
  follonica: [42.92, 10.76],
  'punta ala': [42.81, 10.73],
  'castiglione della pescaia': [42.76, 10.88],
  'marina di grosseto': [42.72, 10.97],
  talamone: [42.55, 11.13],
  orbetello: [42.44, 11.22],
  'porto santo stefano': [42.43, 11.12],
  'porto ercole': [42.4, 11.21],
  portoferraio: [42.81, 10.32], // Elba: isola non disegnata, il pin cade al largo

  // ---- Umbria ----
  perugia: [43.11, 12.39],
  terni: [42.56, 12.65],
  foligno: [42.96, 12.7],
  'citta di castello': [43.55, 12.24],

  // ---- Marche ----
  ancona: [43.62, 13.51],
  'ascoli piceno': [42.85, 13.58],
  fermo: [43.16, 13.72],
  macerata: [43.3, 13.45],
  pesaro: [43.91, 12.9],
  urbino: [43.73, 12.64],
  'gabicce mare': [43.96, 12.76],
  fano: [43.84, 13.02],
  marotta: [43.75, 13.16],
  senigallia: [43.71, 13.22],
  'falconara marittima': [43.63, 13.39],
  numana: [43.51, 13.62],
  sirolo: [43.53, 13.62],
  'porto recanati': [43.43, 13.66],
  'civitanova marche': [43.31, 13.73],
  'porto sant elpidio': [43.25, 13.76],
  'porto san giorgio': [43.18, 13.8],
  'cupra marittima': [43.02, 13.86],
  grottammare: [42.99, 13.87],
  'san benedetto del tronto': [42.94, 13.88],

  // ---- Lazio ----
  roma: [41.9, 12.5],
  frosinone: [41.64, 13.34],
  latina: [41.47, 12.9],
  rieti: [42.4, 12.86],
  viterbo: [42.42, 12.1],
  ostia: [41.73, 12.28],
  fregene: [41.86, 12.2],
  ladispoli: [41.95, 12.08],
  'santa marinella': [42.03, 11.85],
  civitavecchia: [42.09, 11.8],
  tarquinia: [42.25, 11.76],
  'montalto di castro': [42.35, 11.61],
  torvaianica: [41.62, 12.46],
  anzio: [41.45, 12.63],
  nettuno: [41.46, 12.66],
  sabaudia: [41.3, 13.03],
  'san felice circeo': [41.24, 13.09],
  terracina: [41.29, 13.24],
  sperlonga: [41.26, 13.43],
  gaeta: [41.21, 13.57],
  formia: [41.26, 13.61],

  // ---- Abruzzo / Molise ----
  'l aquila': [42.35, 13.4],
  chieti: [42.35, 14.17],
  pescara: [42.46, 14.21],
  teramo: [42.66, 13.7],
  'alba adriatica': [42.83, 13.92],
  tortoreto: [42.8, 13.92],
  giulianova: [42.75, 13.96],
  'roseto degli abruzzi': [42.68, 14.02],
  pineto: [42.61, 14.07],
  'silvi marina': [42.56, 14.12],
  montesilvano: [42.51, 14.15],
  'francavilla al mare': [42.42, 14.29],
  ortona: [42.36, 14.4],
  fossacesia: [42.25, 14.48],
  vasto: [42.11, 14.71],
  'san salvo': [42.05, 14.79],
  campobasso: [41.56, 14.66],
  isernia: [41.59, 14.23],
  termoli: [41.99, 14.99],
  campomarino: [41.95, 15.05],

  // ---- Campania ----
  napoli: [40.85, 14.27],
  avellino: [40.91, 14.79],
  benevento: [41.13, 14.78],
  caserta: [41.07, 14.33],
  salerno: [40.68, 14.76],
  'castel volturno': [41.03, 13.94],
  mondragone: [41.11, 13.89],
  'baia domizia': [41.2, 13.79],
  pozzuoli: [40.82, 14.12],
  bacoli: [40.8, 14.08],
  'vico equense': [40.66, 14.43],
  sorrento: [40.63, 14.37],
  positano: [40.63, 14.48],
  amalfi: [40.63, 14.6],
  maiori: [40.65, 14.64],
  'vietri sul mare': [40.67, 14.73],
  paestum: [40.42, 15.0],
  agropoli: [40.35, 14.99],
  castellabate: [40.28, 14.94],
  acciaroli: [40.18, 15.02],
  palinuro: [40.03, 15.28],
  'marina di camerota': [40.0, 15.37],
  sapri: [40.07, 15.63],
  ischia: [40.73, 13.95], // isola non disegnata: il pin cade al largo, non è un errore
  forio: [40.74, 13.86],
  procida: [40.76, 14.01],
  capri: [40.55, 14.24],

  // ---- Puglia ----
  bari: [41.12, 16.87],
  barletta: [41.32, 16.28],
  andria: [41.23, 16.3],
  trani: [41.28, 16.42],
  brindisi: [40.63, 17.94],
  foggia: [41.46, 15.55],
  lecce: [40.35, 18.17],
  taranto: [40.47, 17.24],
  'rodi garganico': [41.93, 15.88],
  peschici: [41.95, 16.01],
  vieste: [41.88, 16.18],
  mattinata: [41.71, 16.05],
  manfredonia: [41.63, 15.92],
  'margherita di savoia': [41.37, 16.15],
  bisceglie: [41.24, 16.51],
  molfetta: [41.2, 16.6],
  giovinazzo: [41.19, 16.67],
  'mola di bari': [41.06, 17.09],
  'polignano a mare': [40.99, 17.22],
  monopoli: [40.95, 17.3],
  fasano: [40.83, 17.36],
  savelletri: [40.85, 17.44],
  'torre canne': [40.83, 17.47],
  ostuni: [40.73, 17.58],
  'torre santa sabina': [40.72, 17.72],
  otranto: [40.15, 18.49],
  'santa maria di leuca': [39.8, 18.36],
  'marina di pescoluse': [39.83, 18.3],
  gallipoli: [40.06, 17.98],
  nardo: [40.18, 18.03],
  'porto cesareo': [40.26, 17.89],
  'torre lapillo': [40.28, 17.86],
  'castellaneta marina': [40.51, 16.94],
  'marina di ginosa': [40.44, 16.87],

  // ---- Basilicata / Calabria ----
  potenza: [40.64, 15.81],
  matera: [40.67, 16.6],
  metaponto: [40.38, 16.81],
  policoro: [40.21, 16.68],
  'scanzano jonico': [40.25, 16.7],
  maratea: [39.99, 15.72],
  catanzaro: [38.91, 16.59],
  cosenza: [39.3, 16.25],
  crotone: [39.08, 17.13],
  'reggio calabria': [38.11, 15.65],
  'vibo valentia': [38.68, 16.1],
  'praia a mare': [39.9, 15.79],
  scalea: [39.81, 15.79],
  diamante: [39.68, 15.82],
  paola: [39.36, 16.04],
  amantea: [39.13, 16.07],
  pizzo: [38.73, 16.16],
  tropea: [38.68, 15.9],
  'capo vaticano': [38.62, 15.83],
  nicotera: [38.55, 15.93],
  scilla: [38.25, 15.72],
  soverato: [38.69, 16.55],
  'roccella ionica': [38.32, 16.4],
  siderno: [38.27, 16.3],
  locri: [38.24, 16.26],
  'isola di capo rizzuto': [38.96, 17.09],
  'le castella': [38.91, 17.02],

  // ---- Sicilia ----
  palermo: [38.12, 13.36],
  agrigento: [37.31, 13.58],
  caltanissetta: [37.49, 14.06],
  catania: [37.51, 15.09],
  enna: [37.57, 14.28],
  messina: [38.19, 15.55],
  ragusa: [36.93, 14.72],
  siracusa: [37.08, 15.28],
  trapani: [38.02, 12.53],
  mondello: [38.2, 13.32],
  terrasini: [38.15, 13.09],
  'san vito lo capo': [38.17, 12.74],
  'castellammare del golfo': [38.03, 12.88],
  marsala: [37.8, 12.44],
  'mazara del vallo': [37.65, 12.59],
  selinunte: [37.58, 12.83],
  sciacca: [37.51, 13.08],
  licata: [37.1, 13.94],
  gela: [37.07, 14.25],
  scoglitti: [36.89, 14.43],
  'marina di ragusa': [36.78, 14.55],
  pozzallo: [36.73, 14.85],
  'portopalo di capo passero': [36.68, 15.13],
  marzamemi: [36.74, 15.12],
  noto: [36.89, 15.07],
  avola: [36.91, 15.14],
  'fontane bianche': [36.96, 15.24],
  'aci trezza': [37.56, 15.16],
  acireale: [37.61, 15.17],
  'giardini naxos': [37.83, 15.27],
  taormina: [37.85, 15.29],
  letojanni: [37.88, 15.31],
  milazzo: [38.22, 15.24],
  'capo d orlando': [38.16, 14.74],
  'sant agata di militello': [38.07, 14.63],
  cefalu: [38.04, 14.02],
  lipari: [38.47, 14.95], // Eolie: isola non disegnata, il pin cade al largo
  ustica: [38.71, 13.19],
  favignana: [37.93, 12.33],
  pantelleria: [36.83, 11.99],

  // ---- Sardegna ----
  cagliari: [39.22, 9.12],
  nuoro: [40.32, 9.33],
  oristano: [39.9, 8.59],
  sassari: [40.73, 8.56],
  alghero: [40.56, 8.32],
  stintino: [40.94, 8.22],
  castelsardo: [40.92, 8.71],
  'santa teresa gallura': [41.24, 9.19],
  palau: [41.18, 9.38],
  'porto cervo': [41.13, 9.53],
  olbia: [40.92, 9.5],
  'golfo aranci': [40.99, 9.62],
  'san teodoro': [40.78, 9.67],
  budoni: [40.7, 9.71],
  posada: [40.63, 9.72],
  siniscola: [40.57, 9.7],
  orosei: [40.38, 9.7],
  'cala gonone': [40.28, 9.63],
  arbatax: [39.94, 9.7],
  tortoli: [39.93, 9.66],
  'bari sardo': [39.83, 9.64],
  villasimius: [39.14, 9.52],
  pula: [38.99, 8.99],
  chia: [38.89, 8.88],
  'sant antioco': [39.06, 8.46],
  carloforte: [39.15, 8.3],
  bosa: [40.3, 8.5],
  cabras: [39.93, 8.53],
  'la maddalena': [41.21, 9.41],

  // ---- Fuori Italia: geocodabili ma fuori dal riquadro ----
  // Ci sono di proposito. Un torneo a Spalato o a Ibiza non deve finire tra le
  // "città sconosciute" (sembrerebbe un buco del gazetteer): finisce in
  // "Fuori dall'Italia", con il suo nome, e il riquadro non si allarga per
  // accoglierlo — altrimenti un viaggio all'estero rimpicciolisce l'Italia di tutti.
  spalato: [43.51, 16.44],
  montecarlo: [43.74, 7.42],
  zara: [44.12, 15.23],
  rovigno: [45.08, 13.64],
  parenzo: [45.23, 13.59],
  umago: [45.43, 13.52],
  pola: [44.87, 13.85],
  ibiza: [38.91, 1.44],
  barcellona: [41.39, 2.17],
  valencia: [39.47, -0.38],
  vienna: [48.21, 16.37],
  nizza: [43.71, 7.26],
  cannes: [43.55, 7.02],
  lugano: [46.0, 8.95],
  amburgo: [53.55, 9.99],
  amsterdam: [52.37, 4.9],
  parigi: [48.86, 2.35],
  vilnius: [54.69, 25.28],
  doha: [25.29, 51.53],
  'rio de janeiro': [-22.91, -43.17],
} as const

// Grafie alternative → chiave canonica del gazetteer. Solo casi che i prefissi
// generici (`lido di `, `marina di `…) non coprono: nomi doppi, esonimi,
// frazioni che non contengono il nome del comune.
export const ALIASES: Readonly<Record<string, string>> = {
  'bellaria igea marina': 'bellaria',
  'igea marina bellaria': 'bellaria',
  'roma capitale': 'roma',
  'ostia lido': 'ostia',
  'lido di ostia': 'ostia',
  'lido di venezia': 'venezia',
  'venezia lido': 'venezia',
  'reggio nell emilia': 'reggio emilia',
  'reggio di calabria': 'reggio calabria',
  'forli cesena': 'forli',
  aquila: 'l aquila',
  'monte argentario': 'porto santo stefano',
  'costa smeralda': 'porto cervo',
  'santa teresa di gallura': 'santa teresa gallura',
  'san benedetto': 'san benedetto del tronto',
  'porto d ascoli': 'san benedetto del tronto',
  'catanzaro lido': 'catanzaro',
  lignano: 'lignano sabbiadoro',
  'punta sabbioni': 'cavallino treporti',
  cavallino: 'cavallino treporti',
  'chioggia sottomarina': 'sottomarina',
  pinarella: 'cervia',
  tagliata: 'cervia',
  valverde: 'cesenatico',
  villamarina: 'cesenatico',
  zadina: 'cesenatico',
  viserbella: 'viserba',
  rivazzurra: 'rimini',
  marebello: 'rimini',
  miramare: 'rimini',
  'san giuliano mare': 'rimini',
  'rimini marina centro': 'rimini',
  'gatteo mare': 'gatteo a mare',
  'san mauro a mare': 'san mauro mare',
  'santa maria di castellabate': 'castellabate',
  elba: 'portoferraio',
  "isola d elba": 'portoferraio',
  'isola di capri': 'capri',
  'isola d ischia': 'ischia',
  'eolie': 'lipari',
  'isole eolie': 'lipari',
  'egadi': 'favignana',
  'jesolo lido': 'jesolo',
  'jesolo paese': 'jesolo',
  split: 'spalato',
  'monte carlo': 'montecarlo',
  porec: 'parenzo',
  umag: 'umago',
  rovinj: 'rovigno',
  zadar: 'zara',
}

// Prefissi tipici delle frazioni balneari italiane: "Lido di Jesolo" è Jesolo,
// "Marina di Pietrasanta" è Pietrasanta. Provati SOLO dopo il match esatto, così
// una località con coordinate proprie (Marina di Ravenna, 12 km da Ravenna) non
// viene appiattita sul comune.
const PREFISSI = ['lido di ', 'marina di ', 'lido ', 'marina ', 'porto di ', 'spiaggia di ']

// città → coordinate. `geoKey` → GAZETTEER → ALIASES → prefissi → null.
// **Mai un fuzzy match**: un pin nella città sbagliata è peggio di nessun pin —
// una città che non si risolve resta visibile in "Non ancora sulla mappa", ed è
// così che si scopre cosa manca al gazetteer.
export function geocodeCity(city: string): GeoPoint | null {
  const k = geoKey(city)
  if (!k) return null

  const hit = GAZETTEER[k]
  if (hit) return { lat: hit[0], lng: hit[1] }

  const alias = ALIASES[k]
  if (alias) {
    const target = GAZETTEER[alias]
    if (target) return { lat: target[0], lng: target[1] }
  }

  for (const p of PREFISSI) {
    if (!k.startsWith(p)) continue
    const base = k.slice(p.length)
    const viaPrefisso = GAZETTEER[base] ?? GAZETTEER[ALIASES[base] ?? '']
    if (viaPrefisso) return { lat: viaPrefisso[0], lng: viaPrefisso[1] }
  }

  return null
}

// ---------------------------------------------------------------------------
// Scioglimento dei grappoli
// ---------------------------------------------------------------------------
// Il problema è grave, non teorico: Rimini e Riccione distano ~9 km, cioè 2,9
// unità di viewBox. Da Cesenatico a Cattolica ci sono 6 comuni in ~50 km, cioè
// 17 unità: sei pin in una manciata di pixel. Nessuno scaling lo risolve, la
// geografia è densa davvero. La risposta cartografica standard è spostare il pin
// e lasciare un filo di richiamo verso il punto vero.

// Distanza minima fra due pin disegnati, in unità di viewBox (≈ 40 km).
// Tarata sul raggio massimo di un pin (7,4): 13 lascia ~5,6 unità di aria fra due
// dischi grandi — abbastanza per contarli, poco abbastanza da tenere il grappolo
// vicino alla sua costa. A 16 la riviera romagnola finiva a galleggiare in mezzo
// all'Emilia: ogni unità in più è un chilometro in più di bugia.
export const MIN_DIST = 13
const RING_SLOTS = [
  { r: 1, n: 6, start: -90, step: 60 },
  { r: 2, n: 12, start: -90, step: 30 },
  { r: 3, n: 18, start: -90, step: 20 },
]
// Margine dal bordo entro cui può finire un pin SPOSTATO (l'ancora vera resta
// dov'è, anche a ridosso del bordo): tiene dentro il cerchio più grande.
const BORDO = 10

export interface PinSeed {
  key: string
  lat: number
  lng: number
}

export interface PlacedPin {
  key: string
  x: number // posizione DISEGNATA
  y: number
  ax: number // ancora geografica vera: capolinea del filo di richiamo
  ay: number
  displaced: boolean
}

const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2

// Restituisce le posizioni disegnate, una per seme, nell'ordine in cui sono
// state piazzate (geografico: y, poi x, poi key).
//
// L'ordinamento è GEOGRAFICO e non "miglior risultato per primo" di proposito:
// così i pin si muovono solo quando aggiungi una città **nuova**, mai quando
// migliori un piazzamento in una città che non c'entra. È la proprietà che tiene
// la mappa stabile nel tempo, ed è anche ciò che rende `spreadPins` deterministica
// a prescindere dall'ordine in ingresso.
export function spreadPins(seeds: PinSeed[]): PlacedPin[] {
  const ordinati = seeds
    .map((s) => {
      const p = project(s)
      return { key: s.key, ax: p.x, ay: p.y }
    })
    .sort((a, b) => a.ay - b.ay || a.ax - b.ax || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))

  const piazzati: PlacedPin[] = []
  const libero = (x: number, y: number) =>
    piazzati.every((p) => dist2(p.x, p.y, x, y) >= MIN_DIST * MIN_DIST)
  const dentro = (x: number, y: number) =>
    x >= BORDO && x <= MAP_VIEW.w - BORDO && y >= BORDO && y <= MAP_VIEW.h - BORDO

  for (const s of ordinati) {
    let x = s.ax
    let y = s.ay
    let displaced = false

    if (!libero(x, y)) {
      // Spirale fissa di 36 slot attorno all'ancora: vince il primo libero e
      // dentro il riquadro. Nessun valore casuale, nessun ciclo che può non
      // terminare — se nessuno slot va bene si tiene l'ancora e si accetta la
      // sovrapposizione (in pratica impossibile con 36 slot).
      for (const anello of RING_SLOTS) {
        let trovato = false
        for (let i = 0; i < anello.n; i++) {
          const a = ((anello.start + i * anello.step) * Math.PI) / 180
          const cx = s.ax + Math.cos(a) * MIN_DIST * anello.r
          const cy = s.ay + Math.sin(a) * MIN_DIST * anello.r
          if (!dentro(cx, cy) || !libero(cx, cy)) continue
          x = cx
          y = cy
          displaced = true
          trovato = true
          break
        }
        if (trovato) break
      }
    }

    piazzati.push({ key: s.key, x, y, ax: s.ax, ay: s.ay, displaced })
  }

  return piazzati
}

// ---------------------------------------------------------------------------
// Suggerimenti per il form
// ---------------------------------------------------------------------------
// La città di un luogo è testo libero (`venues.city` e `tournaments.city` sono
// `text` senza CHECK): questa lista alimenta un `<datalist>`, che suggerisce
// senza vincolare. È il vero rimedio ai refusi — una città scritta bene si
// geocodifica, e chi gioca altrove continua a scrivere quello che vuole.
//
// Consumatori: `CityInput` (dentro il `VenuePicker` dei due form torneo) e gli
// step "dove" dell'assistente. Da quando i luoghi sono entità, questo campo si
// compila UNA volta per posto e non a ogni torneo: il suggerimento pesa di più,
// perché quella grafia resta in catalogo per tutti.
//
// Le grafie sono quelle da mostrare (accenti e maiuscole veri), non le chiavi:
// un test verifica che ognuna si risolva davvero con `geocodeCity`.
export const CITTA_SUGGERITE: readonly string[] = [
  // Riviera romagnola e adriatica settentrionale
  'Rimini', 'Riccione', 'Misano Adriatico', 'Cattolica', 'Bellaria-Igea Marina',
  'Cesenatico', 'Cervia', 'Milano Marittima', 'Marina di Ravenna', 'Lido degli Estensi',
  'Jesolo', 'Caorle', 'Bibione', 'Lignano Sabbiadoro', 'Grado', 'Chioggia',
  // Marche e Abruzzo
  'Gabicce Mare', 'Pesaro', 'Fano', 'Senigallia', 'Numana', 'Civitanova Marche',
  'Porto San Giorgio', 'San Benedetto del Tronto', 'Alba Adriatica', 'Giulianova',
  'Roseto degli Abruzzi', 'Pescara', 'Montesilvano', 'Francavilla al Mare', 'Vasto',
  // Molise, Puglia, Basilicata
  'Termoli', 'Vieste', 'Peschici', 'Manfredonia', 'Bari', 'Polignano a Mare',
  'Monopoli', 'Ostuni', 'Brindisi', 'Otranto', 'Gallipoli', 'Porto Cesareo',
  'Taranto', 'Policoro',
  // Calabria e Sicilia
  'Tropea', 'Soverato', 'Reggio Calabria', 'Catania', 'Siracusa', 'Palermo',
  'Mondello', 'Cefalù', 'Marina di Ragusa', 'Taormina',
  // Sardegna
  'Cagliari', 'Villasimius', 'Alghero', 'Olbia', 'San Teodoro', 'Stintino',
  // Tirreno
  'Ostia', 'Anzio', 'Terracina', 'Sperlonga', 'Gaeta', 'Napoli', 'Sorrento',
  'Salerno', 'Viareggio', 'Forte dei Marmi', 'Livorno', 'Follonica', 'Genova', 'Sanremo',
  // Città grandi (tornei indoor e cittadini)
  'Milano', 'Torino', 'Roma', 'Firenze', 'Bologna', 'Verona', 'Padova', 'Trieste',
]
