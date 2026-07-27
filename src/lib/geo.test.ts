// ============================================================================
// Confini dell'inquadratura, gazetteer e risoluzione città→coordinate. Tutto
// puro: nessuna rete, nessun orologio, nessun DOM.
//
// Il test che conta davvero è il ciclo su TUTTO il gazetteer: una lat/lng
// sbagliata mette Cattolica in Svizzera e nient'altro fallisce. Verificarne il
// bounding box non basta (uno scambio lat/lng fra due città vicine ci passa
// dentro), quindi ogni voce viene confrontata con la sagoma vera dell'Italia.
//
// La sagoma e la proiezione che la accompagna vivono in `src/test/`: da quando
// la mappa è Leaflet non servono più all'app, ma restano l'unico modo di dire
// se queste ~270 coordinate scritte a mano cadono dove dicono di cadere.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  geoKey,
  geocodeCity,
  inItaly,
  GAZETTEER,
  ALIASES,
  ITALY_BOUNDS,
  CITTA_SUGGERITE,
} from './geo'
import { ITALY_OUTLINE, MAP_VIEW, project } from '../test/italia-sagoma'
import { normalizeCity } from './derive'

// ---------------------------------------------------------------- helper sagoma
// Anelli del tracciato, già in unità di viewBox: 'M x y L x y … Z' per anello.
const RINGS: Array<Array<[number, number]>> = ITALY_OUTLINE.split('M')
  .filter(Boolean)
  .map((part) =>
    part
      .replace('Z', '')
      .split('L')
      .map((p) => p.trim().split(/\s+/).map(Number) as [number, number]),
  )

function inRing(x: number, y: number, ring: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function distSeg(x: number, y: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len)) : 0
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
}

// Distanza dalla terraferma disegnata: 0 se il punto è dentro la sagoma,
// altrimenti la distanza dalla costa più vicina, in unità di viewBox.
function distanzaDallaSagoma(x: number, y: number): number {
  if (RINGS.some((r) => inRing(x, y, r))) return 0
  return Math.min(
    ...RINGS.flatMap((r) => r.map((_, i) => distSeg(x, y, r[i], r[(i + 1) % r.length]))),
  )
}

// Città che NON devono cadere sulla terraferma disegnata. Non sono eccezioni di
// comodo: sono i due casi in cui "fuori dalla sagoma" è la risposta giusta.
//  1) isole minori, escluse dal tracciato (min-area=1000km2): il pin cade al
//     largo, dove l'isola effettivamente sta;
//  2) località estere, che stanno nel gazetteer apposta per finire in
//     "Fuori dall'Italia" invece che fra le città sconosciute.
const ISOLE_MINORI = [
  'portoferraio', // Elba
  'ischia', 'forio', 'procida', 'capri',
  'lipari', 'ustica', 'favignana', 'pantelleria',
  'carloforte', // isola di San Pietro (51 km²) — Sant'Antioco invece è collegata da un istmo
]
const ESTERE = [
  'spalato', 'zara', 'rovigno', 'parenzo', 'umago', 'pola',
  'ibiza', 'barcellona', 'valencia', 'nizza', 'cannes', 'montecarlo', 'lugano',
  'vienna', 'amburgo', 'amsterdam', 'parigi', 'vilnius', 'doha', 'rio de janeiro',
]
const FUORI_SAGOMA = new Set([...ISOLE_MINORI, ...ESTERE])

// ---------------------------------------------------------------- geoKey
describe('geoKey — la chiave del gazetteer', () => {
  it('normalizza maiuscole e spazi ai bordi', () => {
    expect(geoKey('  RIMINI  ')).toBe('rimini')
    expect(geoKey('Rimini')).toBe('rimini')
  })

  it('toglie i segni diacritici', () => {
    expect(geoKey('Forlì')).toBe('forli')
    expect(geoKey('Cefalù')).toBe('cefalu')
    expect(geoKey('Nardò')).toBe('nardo')
  })

  it('riduce trattini, apostrofi e punteggiatura a spazi', () => {
    expect(geoKey('Bellaria-Igea Marina')).toBe('bellaria igea marina')
    expect(geoKey("Sant'Agata di Militello")).toBe('sant agata di militello')
    expect(geoKey('Reggio nell’Emilia')).toBe('reggio nell emilia')
  })

  it('collassa le sequenze di spazi', () => {
    expect(geoKey('San   Benedetto   del  Tronto')).toBe('san benedetto del tronto')
  })

  it('una città fatta di sola punteggiatura diventa vuota', () => {
    expect(geoKey('  --  ')).toBe('')
    expect(geoKey('')).toBe('')
  })
})

describe('normalizeCity resta quello che era', () => {
  // Guardia di regressione, non un doppione: `normalizeCity` deve continuare a
  // rispecchiare `check_ins.city_key` del DB (`lower(btrim(city))`). Se qualcuno
  // "uniformasse" le due funzioni togliendo gli accenti anche lì, le stanze di
  // "Chi c'è oggi" si spaccherebbero in silenzio — chi scrive "Forlì" e chi
  // scrive "Forli" finirebbero in stanze diverse lato DB e nella stessa lato client.
  it('non tocca gli accenti (a differenza di geoKey)', () => {
    expect(normalizeCity('Forlì ')).toBe('forlì')
    expect(geoKey('Forlì ')).toBe('forli')
  })

  it('non tocca la punteggiatura interna', () => {
    expect(normalizeCity('Bellaria-Igea Marina')).toBe('bellaria-igea marina')
  })
})

// ---------------------------------------------------------------- geocodeCity
describe('geocodeCity', () => {
  it('risolve una città esatta', () => {
    expect(geocodeCity('Rimini')).toEqual({ lat: 44.06, lng: 12.57 })
  })

  it('ignora maiuscole e spazi', () => {
    expect(geocodeCity('  RICCIONE  ')).toEqual(geocodeCity('Riccione'))
  })

  it('risolve una città accentata scritta senza accento e viceversa', () => {
    expect(geocodeCity('Forlì')).toEqual(geocodeCity('Forli'))
    expect(geocodeCity('Cefalù')).toEqual(geocodeCity('Cefalu'))
  })

  it('"Lido di Jesolo" e "Jesolo" danno lo stesso punto', () => {
    expect(geocodeCity('Lido di Jesolo')).toEqual(geocodeCity('Jesolo'))
  })

  it('il fallback sui prefissi copre "Marina di …" e "Lido di …"', () => {
    expect(geocodeCity('Marina di Pisa')).toEqual({ lat: 43.67, lng: 10.27 }) // voce propria
    expect(geocodeCity('Marina di Sperlonga')).toEqual(geocodeCity('Sperlonga')) // via prefisso
    expect(geocodeCity('Lido di Fano')).toEqual(geocodeCity('Fano'))
  })

  it('una voce con coordinate proprie batte il fallback sul comune', () => {
    // Marina di Ravenna è 12 km da Ravenna: appiattirla sul comune metterebbe
    // il pin nell'entroterra.
    expect(geocodeCity('Marina di Ravenna')).not.toEqual(geocodeCity('Ravenna'))
  })

  it('gli alias risolvono le grafie doppie', () => {
    expect(geocodeCity('Bellaria-Igea Marina')).toEqual(geocodeCity('Bellaria'))
    expect(geocodeCity("Reggio nell'Emilia")).toEqual(geocodeCity('Reggio Emilia'))
    expect(geocodeCity('Lido di Ostia')).toEqual(geocodeCity('Ostia'))
  })

  it('una città sconosciuta è null, mai un pin approssimato', () => {
    expect(geocodeCity('Foo')).toBeNull()
    expect(geocodeCity('Riminii')).toBeNull() // nessun fuzzy match, di proposito
  })

  it('una città vuota è null', () => {
    expect(geocodeCity('')).toBeNull()
    expect(geocodeCity('   ')).toBeNull()
  })
})

// ---------------------------------------------------------------- inItaly
describe('inItaly — chi entra nell’inquadratura', () => {
  it('tiene dentro l’Italia e fuori il resto', () => {
    expect(inItaly({ lat: 44.06, lng: 12.57 })).toBe(true) // Rimini
    expect(inItaly({ lat: 38.91, lng: 1.44 })).toBe(false) // Ibiza
    expect(inItaly({ lat: 60.17, lng: 24.94 })).toBe(false) // Helsinki
  })

  it('comprende il margine di mare, quindi la sponda adriatica opposta', () => {
    // Spalato è dentro il riquadro, e va bene così: la vista parte sull'Italia
    // ma il rettangolo la eccede di qualche grado. Fissato a valore perché è
    // esattamente il punto su cui un vecchio commento diceva il falso.
    expect(inItaly({ lat: 43.51, lng: 16.44 })).toBe(true)
  })

  it('i bordi sono inclusivi', () => {
    const { latMin, latMax, lngMin, lngMax } = ITALY_BOUNDS
    expect(inItaly({ lat: latMin, lng: lngMin })).toBe(true)
    expect(inItaly({ lat: latMax, lng: lngMax })).toBe(true)
    expect(inItaly({ lat: latMin - 0.001, lng: lngMin })).toBe(false)
    expect(inItaly({ lat: latMax, lng: lngMax + 0.001 })).toBe(false)
  })

  it('classifica ogni voce del gazetteer come faceva il vecchio riquadro SVG', () => {
    // Il contratto del passaggio a Leaflet: `ITALY_BOUNDS` (lat/lng) deve dare
    // la STESSA risposta di `project().inside` (viewBox) su tutte le voci, o
    // qualche città avrebbe cambiato in silenzio sezione nella schermata.
    const diverse = Object.entries(GAZETTEER)
      .filter(([, [lat, lng]]) => inItaly({ lat, lng }) !== project({ lat, lng }).inside)
      .map(([k]) => k)
    expect(diverse).toEqual([])
  })
})

// ---------------------------------------------------------------- proiezione (fixture)
// `project` non è più codice di produzione: serve a proiettare le coordinate
// sulla sagoma per validarle. Questi test tengono onesto l'oracolo — se la
// proiezione sbaglia, tutti i controlli sul gazetteer diventano rumore.
describe('project — l’oracolo dei test resta tarato', () => {
  it('è monotona in latitudine (più a nord = più in alto)', () => {
    expect(project({ lat: 46, lng: 12 }).y).toBeLessThan(project({ lat: 41, lng: 12 }).y)
  })

  it('è monotona in longitudine (più a est = più a destra)', () => {
    expect(project({ lat: 43, lng: 10 }).x).toBeLessThan(project({ lat: 43, lng: 16 }).x)
  })

  it('il meridiano centrale cade al centro del riquadro', () => {
    expect(project({ lat: 42, lng: 12.5 }).x).toBe(MAP_VIEW.w / 2)
  })

  it('mette i punti di riferimento nel quadrante giusto', () => {
    // Se qualcuno tocca LAT_TOP/LNG0/SCALE senza rigenerare il tracciato,
    // questi quattro numeri sono l'unica cosa che se ne accorge.
    const trieste = project({ lat: 45.65, lng: 13.77 })
    const lecce = project({ lat: 40.35, lng: 18.17 })
    const cagliari = project({ lat: 39.22, lng: 9.12 })
    expect(trieste.x).toBeGreaterThan(MAP_VIEW.w / 2) // nord-est
    expect(trieste.y).toBeLessThan(MAP_VIEW.h / 3)
    expect(lecce.x).toBeGreaterThan(MAP_VIEW.w * 0.85) // tacco, in basso a destra
    expect(lecce.y).toBeGreaterThan(MAP_VIEW.h / 2)
    expect(cagliari.x).toBeLessThan(MAP_VIEW.w / 3) // isola, a sinistra
    expect(cagliari.y).toBeGreaterThan(MAP_VIEW.h / 2)
  })
})

// ---------------------------------------------------------------- gazetteer
describe('gazetteer — igiene delle chiavi', () => {
  it('ogni chiave è già passata da geoKey', () => {
    const storte = Object.keys(GAZETTEER).filter((k) => k !== geoKey(k))
    expect(storte).toEqual([])
  })

  it('ogni chiave di ALIASES è già passata da geoKey', () => {
    const storte = Object.keys(ALIASES).filter((k) => k !== geoKey(k))
    expect(storte).toEqual([])
  })

  it('ogni alias punta a una voce che esiste', () => {
    const rotti = Object.entries(ALIASES).filter(([, target]) => !GAZETTEER[target])
    expect(rotti).toEqual([])
  })

  it('nessun alias ombreggia una voce vera del gazetteer', () => {
    const ombre = Object.keys(ALIASES).filter((k) => GAZETTEER[k])
    expect(ombre).toEqual([])
  })

  it('copre almeno i 107 capoluoghi più le località di mare', () => {
    expect(Object.keys(GAZETTEER).length).toBeGreaterThan(280)
  })
})

describe('gazetteer — ogni coordinata è plausibile', () => {
  // I modi realistici in cui 300 coordinate scritte a mano si rompono: segno
  // invertito, lat/lng scambiate, un errore di 10 gradi.
  it('le città italiane stanno nel riquadro geografico dell’Italia', () => {
    const fuori = Object.entries(GAZETTEER)
      .filter(([k]) => !ESTERE.includes(k))
      .filter(([, [lat, lng]]) => lat < 36.5 || lat > 47.2 || lng < 6.5 || lng > 18.6)
      .map(([k, v]) => `${k} ${v.join('/')}`)
    expect(fuori).toEqual([])
  })

  it('le città italiane si proiettano dentro il riquadro disegnato', () => {
    const fuori = Object.entries(GAZETTEER)
      .filter(([k]) => !ESTERE.includes(k))
      .filter(([, [lat, lng]]) => !project({ lat, lng }).inside)
      .map(([k]) => k)
    expect(fuori).toEqual([])
  })

  it('le città italiane cadono sulla terraferma, non in mare', () => {
    // Tolleranza 2 unità (≈ 6 km): le località costiere stanno *sulla* costa e
    // la semplificazione del tracciato taglia gli angoli di qualche decimo di
    // unità. Oltre le 2 unità non è più semplificazione, è un refuso.
    const inMare = Object.entries(GAZETTEER)
      .filter(([k]) => !FUORI_SAGOMA.has(k))
      .map(([k, [lat, lng]]) => {
        const p = project({ lat, lng })
        return [k, distanzaDallaSagoma(p.x, p.y)] as const
      })
      .filter(([, d]) => d > 2)
      .map(([k, d]) => `${k} a ${d.toFixed(1)} unità dalla costa`)
    expect(inMare).toEqual([])
  })

  it('le località estere NON cadono sulla terraferma italiana', () => {
    // Se una città estera finisse dentro la sagoma sarebbe un refuso al contrario.
    const dentro = ESTERE.filter((k) => {
      const v = GAZETTEER[k]
      if (!v) return false
      const p = project({ lat: v[0], lng: v[1] })
      return distanzaDallaSagoma(p.x, p.y) === 0
    })
    expect(dentro).toEqual([])
  })

  it('le città seed dei dati demo stanno sulla costa adriatica', () => {
    // Cervia, Rimini e Jesolo: se queste tre sbagliano, la feature è rotta e si
    // vede a occhio nudo al primo avvio.
    for (const city of ['Cervia', 'Rimini', 'Jesolo']) {
      const g = geocodeCity(city)
      expect(g, city).not.toBeNull()
      const p = project(g!)
      expect(distanzaDallaSagoma(p.x, p.y), city).toBeLessThanOrEqual(2)
      expect(p.x, city).toBeGreaterThan(MAP_VIEW.w / 2 - 20) // versante adriatico
    }
  })
})

describe('CITTA_SUGGERITE — i suggerimenti del form', () => {
  it('ogni suggerimento si geocodifica davvero', () => {
    // Un suggerimento che il gazetteer non risolve sarebbe il peggiore dei
    // mondi: l'app propone una grafia e poi non sa dove metterla.
    const rotti = CITTA_SUGGERITE.filter((c) => !geocodeCity(c))
    expect(rotti).toEqual([])
  })

  it('ogni suggerimento cade dentro il riquadro', () => {
    const fuori = CITTA_SUGGERITE.filter((c) => !project(geocodeCity(c)!).inside)
    expect(fuori).toEqual([])
  })

  it('non ci sono doppioni né grafie equivalenti ripetute', () => {
    expect(new Set(CITTA_SUGGERITE).size).toBe(CITTA_SUGGERITE.length)
    expect(new Set(CITTA_SUGGERITE.map(geoKey)).size).toBe(CITTA_SUGGERITE.length)
  })

  it('le grafie sono quelle da mostrare, con accenti e maiuscole', () => {
    expect(CITTA_SUGGERITE).toContain('Cefalù')
    expect(CITTA_SUGGERITE).toContain('Bellaria-Igea Marina')
    expect(CITTA_SUGGERITE.every((c) => c === c.trim() && c[0] === c[0].toUpperCase())).toBe(true)
  })
})

// ---------------------------------------------------------------- outline
describe('ITALY_OUTLINE', () => {
  it('comincia con un moveto e chiude ogni anello', () => {
    expect(ITALY_OUTLINE.startsWith('M')).toBe(true)
    expect(ITALY_OUTLINE.endsWith('Z')).toBe(true)
  })

  it('ha esattamente tre anelli: penisola, Sicilia, Sardegna', () => {
    expect((ITALY_OUTLINE.match(/M/g) || []).length).toBe(3)
    expect((ITALY_OUTLINE.match(/Z/g) || []).length).toBe(3)
  })

  it('non contiene NaN né coordinate malformate', () => {
    expect(ITALY_OUTLINE).not.toContain('NaN')
    expect(ITALY_OUTLINE).not.toContain('undefined')
    expect(RINGS.flat().every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true)
  })

  it('sta dentro il riquadro', () => {
    const pts = RINGS.flat()
    expect(Math.min(...pts.map((p) => p[0]))).toBeGreaterThanOrEqual(0)
    expect(Math.max(...pts.map((p) => p[0]))).toBeLessThanOrEqual(MAP_VIEW.w)
    expect(Math.min(...pts.map((p) => p[1]))).toBeGreaterThanOrEqual(0)
    expect(Math.max(...pts.map((p) => p[1]))).toBeLessThanOrEqual(MAP_VIEW.h)
  })

  it('resta dentro il budget di payload', () => {
    // Tetto fissato a numero come i rapporti di contrasto: se qualcuno
    // rigenera il tracciato senza semplificarlo, qui se ne accorge.
    expect(ITALY_OUTLINE.length).toBeLessThan(8000)
  })
})
