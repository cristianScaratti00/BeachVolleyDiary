// ============================================================================
// Ricerca del luogo su Photon. `fetch` è sempre mockato: nessun test esce in
// rete, o la suite diventerebbe lenta e dipendente da un servizio di terzi.
//
// Il test che conta più di tutti è quello sull'ordine delle coordinate: GeoJSON
// scrive [lng, lat], noi ovunque [lat, lng]. Invertirle non rompe niente in
// modo visibile — sposta soltanto i pin dall'altra parte del mondo.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cercaLuoghi, mapPhotonFeature, GeoSearchError, MIN_QUERY } from './geosearch'

// Rete di sicurezza: un test che dimentica di mockare `fetch` deve fallire
// subito, non uscire davvero su photon.komoot.io. Scritta dopo averlo fatto —
// la suite era passata lo stesso, interrogando il servizio vero.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('fetch non mockato in questo test') }))
})

// Una feature Photon minima ma realistica: Bagno 26 a Riccione.
const bagno = {
  geometry: { type: 'Point', coordinates: [12.65611, 44.00194] }, // [lng, lat]
  properties: {
    osm_type: 'N', osm_id: 42, osm_key: 'leisure', osm_value: 'beach_resort', name: 'Bagno 26',
    city: 'Riccione', county: 'Rimini', state: 'Emilia-Romagna', country: 'Italia',
  },
}

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const spia = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  })
  vi.stubGlobal('fetch', spia)
  return spia
}

afterEach(() => vi.unstubAllGlobals())

// ---------------------------------------------------------------- coordinate
describe('mapPhotonFeature — le coordinate', () => {
  it('legge [lng, lat] di GeoJSON e non le inverte', () => {
    const l = mapPhotonFeature(bagno, 0)!
    expect(l.lat).toBe(44.00194) // Riccione è a 44°N…
    expect(l.lng).toBe(12.65611) // …e 12°E, non il contrario
  })

  it('scarta le coordinate fuori dai limiti geografici', () => {
    const rotto = { ...bagno, geometry: { coordinates: [12.6, 91] } }
    expect(mapPhotonFeature(rotto, 0)).toBeNull()
  })

  it('scarta una feature senza geometria', () => {
    expect(mapPhotonFeature({ properties: { name: 'Bagno 26' } }, 0)).toBeNull()
  })

  it('scarta una feature senza niente da mostrare', () => {
    expect(mapPhotonFeature({ geometry: { coordinates: [12, 44] }, properties: {} }, 0)).toBeNull()
  })
})

// ---------------------------------------------------------------- etichette
describe('mapPhotonFeature — nome, città e contesto', () => {
  it('porta il nome del posto, non quello del comune', () => {
    const l = mapPhotonFeature(bagno, 0)!
    expect(l.nome).toBe('Bagno 26')
    expect(l.citta).toBe('Riccione')
  })

  it('su un indirizzo puro compone via e civico', () => {
    // Photon lascia `name` vuoto sugli indirizzi: senza questo fallback la voce
    // verrebbe scartata e l'utente non troverebbe il suo campo.
    const indirizzo = {
      geometry: { coordinates: [12.6, 44.0] },
      properties: { street: 'Via Milano', housenumber: '12', city: 'Riccione' },
    }
    expect(mapPhotonFeature(indirizzo, 0)!.nome).toBe('Via Milano 12')
  })

  it('senza city ricade su district, poi county, poi state', () => {
    const frazione = {
      geometry: { coordinates: [12.6, 44.0] },
      properties: { name: 'Spiaggia di Levante', county: 'Rimini', state: 'Emilia-Romagna' },
    }
    expect(mapPhotonFeature(frazione, 0)!.citta).toBe('Rimini')
  })

  it('il contesto distingue gli omonimi senza ripetere il nome', () => {
    const l = mapPhotonFeature(bagno, 0)!
    expect(l.contesto).toBe('Riccione · Emilia-Romagna · Italia')
  })

  it('cercando un comune, il contesto non lo ripete', () => {
    const comune = {
      geometry: { coordinates: [12.65, 44.0] },
      properties: { name: 'Riccione', city: 'Riccione', state: 'Emilia-Romagna', country: 'Italia' },
    }
    const l = mapPhotonFeature(comune, 0)!
    expect(l.citta).toBe('Riccione')
    expect(l.contesto).toBe('Emilia-Romagna · Italia')
  })

  it('riconosce lo stabilimento balneare, che è il caso di casa', () => {
    expect(mapPhotonFeature(bagno, 0)!.tipo).toBe('Stabilimento balneare')
  })

  it('distingue una strada da un posto, che è il rumore tipico di queste ricerche', () => {
    // Cercando "bagno 26 riccione" Photon restituisce davvero anche "Viale
    // Bagno di Romagna": senza il tipo si sceglie a caso fra le due.
    const strada = {
      geometry: { coordinates: [12.64, 44.0] },
      properties: { name: 'Viale Bagno di Romagna', osm_key: 'highway', osm_value: 'residential', city: 'Riccione' },
    }
    expect(mapPhotonFeature(strada, 0)!.tipo).toBe('Strada')
  })

  it('una categoria che non conosciamo resta senza etichetta', () => {
    // Meglio niente che una parola generica: l'etichetta serve a distinguere,
    // e "Luogo" su ogni riga non distingue nulla.
    const ignoto = {
      geometry: { coordinates: [12.64, 44.0] },
      properties: { name: 'Qualcosa', osm_key: 'man_made', osm_value: 'pier' },
    }
    expect(mapPhotonFeature(ignoto, 0)!.tipo).toBe('')
  })

  it('senza osm_id l’id ricade sull’indice, così le righe restano distinte', () => {
    const anonimo = { geometry: { coordinates: [12, 44] }, properties: { name: 'Campo' } }
    expect(mapPhotonFeature(anonimo, 3)!.id).toBe('i3')
  })
})

// ---------------------------------------------------------------- la chiamata
describe('cercaLuoghi — la richiesta', () => {
  it('sotto la lunghezza minima non tocca la rete', async () => {
    const spia = mockFetch({ features: [] })
    expect(await cercaLuoghi('ri')).toEqual([])
    expect(spia).not.toHaveBeenCalled()
  })

  it('ignora le query fatte di soli spazi', async () => {
    const spia = mockFetch({ features: [] })
    expect(await cercaLuoghi('     ')).toEqual([])
    expect(spia).not.toHaveBeenCalled()
  })

  it('interroga Photon con query codificata e polarizzazione sull’Italia', async () => {
    const spia = mockFetch({ features: [bagno] })
    await cercaLuoghi('bagno 26')
    const url = String(spia.mock.calls[0][0])
    expect(url).toContain('photon.komoot.io')
    expect(url).toContain('q=bagno%2026') // la query è codificata
    expect(url).toContain('lat=42.5') // i risultati vicini all'Italia per primi
  })

  it('non manda il parametro lang', () => {
    // Photon accetta solo default/de/en/fr. Con `lang=it` risponde 400 a ogni
    // richiesta: la prima versione lo faceva, e il test lo asseriva pure —
    // la suite era verde e la ricerca non funzionava. Fissato a valore perché
    // un solo `lang=it` di troppo rompe tutto senza rumore.
    const spia = mockFetch({ features: [] })
    return cercaLuoghi('riccione').then(() => {
      expect(String(spia.mock.calls[0][0])).not.toContain('lang=')
    })
  })

  it('passa il segnale di annullamento a fetch', async () => {
    const spia = mockFetch({ features: [] })
    const ac = new AbortController()
    await cercaLuoghi('riccione', ac.signal)
    expect(spia.mock.calls[0][1]).toMatchObject({ signal: ac.signal })
  })

  it('MIN_QUERY è la soglia dichiarata, non un numero sparso nel codice', () => {
    expect(MIN_QUERY).toBe(3)
  })
})

// ---------------------------------------------------------------- risposte
describe('cercaLuoghi — cosa torna indietro', () => {
  it('mappa i risultati utili e scarta quelli inservibili', async () => {
    mockFetch({ features: [bagno, { properties: { name: 'Senza posto' } }] })
    const out = await cercaLuoghi('bagno')
    expect(out).toHaveLength(1)
    expect(out[0].nome).toBe('Bagno 26')
  })

  it('unisce i doppioni che Photon restituisce a più zoom', async () => {
    // Stesso posto come nodo e come poligono: in elenco sarebbero due righe
    // identiche fra cui scegliere a caso.
    const poligono = { ...bagno, properties: { ...bagno.properties, osm_type: 'W', osm_id: 99 } }
    mockFetch({ features: [bagno, poligono] })
    expect(await cercaLuoghi('bagno 26')).toHaveLength(1)
  })

  it('due posti diversi con lo stesso nome restano due righe', async () => {
    const altro = {
      geometry: { coordinates: [12.4, 44.2] },
      properties: { osm_type: 'N', osm_id: 7, name: 'Bagno 26', city: 'Cesenatico', country: 'Italia' },
    }
    mockFetch({ features: [bagno, altro] })
    const out = await cercaLuoghi('bagno 26')
    expect(out).toHaveLength(2)
    expect(out.map((l) => l.citta)).toEqual(['Riccione', 'Cesenatico'])
  })

  it('una risposta senza features non è un errore', async () => {
    mockFetch({})
    expect(await cercaLuoghi('riccione')).toEqual([])
  })
})

// ---------------------------------------------------------------- guasti
describe('cercaLuoghi — quando il servizio non collabora', () => {
  it('un errore HTTP diventa GeoSearchError', async () => {
    mockFetch({}, { ok: false, status: 429 }) // 429 = troppe richieste
    await expect(cercaLuoghi('riccione')).rejects.toBeInstanceOf(GeoSearchError)
  })

  it('la rete caduta diventa GeoSearchError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(cercaLuoghi('riccione')).rejects.toBeInstanceOf(GeoSearchError)
  })

  it('una risposta illeggibile diventa GeoSearchError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => { throw new SyntaxError('non è JSON') },
    }))
    await expect(cercaLuoghi('riccione')).rejects.toBeInstanceOf(GeoSearchError)
  })

  it('l’annullamento resta un AbortError, non un errore da mostrare', async () => {
    // Chi chiama distingue i due casi: una ricerca annullata è stata sostituita
    // da quella successiva, e mostrare "ricerca non disponibile" sarebbe falso.
    const abort = new DOMException('annullata', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort))
    await expect(cercaLuoghi('riccione')).rejects.toBe(abort)
  })
})
