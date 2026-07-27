// ============================================================================
// `deriveMappa`: aggregazione per città, bucket, forma dei pin e stabilità
// delle posizioni. Puro — `today` è iniettato, come in `deriveTorneiSections`,
// così la suite non cambia colore a mezzanotte UTC.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { deriveMappa, mappaSubtitle } from './derive.mappa'
import { geoKey, geocodeCity } from './geo'
import { makeData, makeTournament, makeMatch, makeVenue, winSets, lossSets, TODAY } from '../test/factories'
import type { Tournament, Venue } from './models'

const mappa = (tornei: Partial<Tournament>[], fYear = 'Sempre', matches = [], today = TODAY) =>
  deriveMappa(makeData({ tournaments: tornei.map(makeTournament), matches }), fYear, today)

// Variante con catalogo dei luoghi: serve solo ai test sulle coordinate, quindi
// resta separata invece di appesantire la firma di `mappa`.
const mappaCon = (tornei: Partial<Tournament>[], venues: Venue[], fYear = 'Sempre') =>
  deriveMappa(makeData({ tournaments: tornei.map(makeTournament), venues }), fYear, TODAY)

const pinDi = (m: ReturnType<typeof deriveMappa>, city: string) =>
  m.pins.find((p) => p.key === geoKey(city))

// ---------------------------------------------------------------- aggregazione
describe('deriveMappa — aggregazione per città', () => {
  it('due tornei nella stessa città diventano un pin con count 2', () => {
    const m = mappa([
      { id: 'a', city: 'Rimini', date: '2026-06-01' },
      { id: 'b', city: 'Rimini', date: '2026-07-01' },
    ])
    expect(m.pins).toHaveLength(1)
    expect(m.pins[0].count).toBe(2)
    expect(m.pins[0].tornei.map((t) => t.id)).toEqual(['b', 'a']) // data desc
  })

  it('le varianti di grafia sono lo stesso pin', () => {
    const m = mappa([
      { city: 'Rimini', date: '2026-06-01' },
      { city: '  rimini  ', date: '2026-06-02' },
      { city: 'RIMINI', date: '2026-06-03' },
    ])
    expect(m.pins).toHaveLength(1)
    expect(m.pins[0].count).toBe(3)
  })

  it('"Forlì" e "Forli" sono lo stesso pin', () => {
    const m = mappa([
      { city: 'Forlì', date: '2026-06-01' },
      { city: 'Forli', date: '2026-06-02' },
    ])
    expect(m.pins).toHaveLength(1)
  })

  it('mostra la grafia del torneo più recente', () => {
    const m = mappa([
      { city: 'rimini', date: '2026-06-01' },
      { city: 'Rimini', date: '2026-07-01' },
    ])
    expect(m.pins[0].city).toBe('Rimini')
  })

  it('il miglior piazzamento della città vince il tier', () => {
    const m = mappa([
      { city: 'Cervia', date: '2026-06-01', placement: 'Gironi' },
      { city: 'Cervia', date: '2026-06-02', placement: '1° 🏆' },
    ])
    const p = pinDi(m, 'Cervia')!
    expect(p.rank).toBe(1)
    expect(p.tier).toBe('vinto')
    expect(p.best).toBe('1° 🏆')
    expect(p.fill).toBe('#FF6B35')
  })

  it('un podio dà il tier "podio", un’uscita ai gironi "giocato"', () => {
    const m = mappa([
      { city: 'Rimini', placement: '2°' },
      { city: 'Jesolo', placement: 'Gironi' },
    ])
    expect(pinDi(m, 'Rimini')!.tier).toBe('podio')
    expect(pinDi(m, 'Rimini')!.fill).toBe('#F7A883')
    expect(pinDi(m, 'Jesolo')!.tier).toBe('giocato')
    expect(pinDi(m, 'Jesolo')!.fill).toBe('rgba(27,42,74,.25)')
  })

  it('conta i podi e riusa dotForRank, non una regola nuova', () => {
    const m = mappa([
      { city: 'Rimini', date: '2026-06-01', placement: '3°' },
      { city: 'Rimini', date: '2026-06-02', placement: 'Gironi' },
      { city: 'Rimini', date: '2026-06-03', placement: '1° 🏆' },
    ])
    expect(pinDi(m, 'Rimini')!.podi).toBe(2)
  })

  it('porta record e win% delle partite giocate lì', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', city: 'Rimini' }),
        makeTournament({ id: 't2', city: 'Jesolo' }),
      ],
      matches: [
        makeMatch({ tournamentId: 't1', sets: winSets() }),
        makeMatch({ tournamentId: 't1', sets: winSets() }),
        makeMatch({ tournamentId: 't1', sets: lossSets() }),
        makeMatch({ tournamentId: 't2', sets: lossSets() }),
      ],
    })
    const m = deriveMappa(data, 'Sempre', TODAY)
    const rimini = pinDi(m, 'Rimini')!
    expect(rimini.played).toBe(3)
    expect(rimini.record).toBe('2-1')
    expect(rimini.winPct).toBe(67)
    expect(pinDi(m, 'Jesolo')!.winPct).toBe(0)
  })

  it('marca "condiviso" solo se TUTTI i tornei della città lo sono', () => {
    const m = mappa([
      { city: 'Rimini', date: '2026-06-01', shared: true },
      { city: 'Rimini', date: '2026-06-02', shared: false },
      { city: 'Jesolo', shared: true },
    ])
    expect(pinDi(m, 'Rimini')!.shared).toBe(false)
    expect(pinDi(m, 'Jesolo')!.shared).toBe(true)
  })

  it('i tornei condivisi da un socio contano sulla mappa', () => {
    // Scelta esplicita: erano eventi a cui c'eravate entrambi. La RPC
    // `tornei_list` li esclude, per questo il selettore parte da DiaryData.
    const m = mappa([{ city: 'Cervia', shared: true, placement: '1° 🏆' }])
    expect(m.citta).toBe(1)
    expect(m.cittaVinte).toBe(1)
  })
})

// ------------------------------------------------- piazzamenti sul filo mappa
describe('deriveMappa — come i piazzamenti arrivano sul pin', () => {
  it("'Semifinale' ranka 4, meglio di un'uscita ai gironi", () => {
    // Questo test nasce come tripwire del difetto opposto: `placementRank`
    // non riconosceva 'Semifinale' e la faceva cadere nel fallback 9, cioè
    // PEGGIO di 'Gironi' (8). La correzione è arrivata con
    // `20260724120100_placement_rank_semifinale.sql` (+ `stats.ts` e
    // `PLACEMENT_LABELS`), e il test ha fatto il suo mestiere: è fallito, così
    // la mappa è stata guardata insieme al resto.
    //
    // Resta 'giocato': `tierOf` promuove solo il podio (rank <= 3). Una
    // semifinale ora è ordinata al posto giusto, ma non è un podio.
    const m = mappa([{ city: 'Rimini', placement: 'Semifinale' }])
    expect(pinDi(m, 'Rimini')!.rank).toBe(4)
    expect(pinDi(m, 'Rimini')!.tier).toBe('giocato')
  })

  it("'best' porta la stringa grezza 'Semifinale', non il trattino", () => {
    // `best` non passa da `PLACEMENT_LABELS`: porta il testo scritto sul
    // torneo. Oggi la chiave 4 esiste e darebbe la stessa stringa, ma la
    // grezza resta più solida — non dipende dal fatto che la tabella delle
    // etichette copra ogni rank, e il fallback di quella tabella è '—'.
    const m = mappa([{ city: 'Rimini', placement: 'Semifinale' }])
    expect(pinDi(m, 'Rimini')!.best).toBe('Semifinale')
    expect(pinDi(m, 'Rimini')!.best).not.toBe('—')
  })

  it("'Quarti' e 'Ottavi' restano leggibili come sono scritti", () => {
    const m = mappa([{ city: 'Rimini', placement: 'Quarti' }])
    expect(pinDi(m, 'Rimini')!.best).toBe('Quarti')
  })
})

// ---------------------------------------------------------------- inclusione
describe('deriveMappa — solo tornei già giocati', () => {
  it('esclude i tornei "In corso" e li conta a parte', () => {
    const m = mappa([
      { city: 'Rimini', date: '2026-06-01', placement: 'Gironi' },
      { city: 'Jesolo', date: '2026-06-01', placement: 'In corso' },
    ])
    expect(m.pins).toHaveLength(1)
    expect(pinDi(m, 'Jesolo')).toBeUndefined()
    expect(m.nonGiocati).toBe(1)
  })

  it('esclude i tornei futuri', () => {
    const m = mappa([
      { city: 'Rimini', date: '2026-06-01' },
      { city: 'Cervia', date: '2026-09-01' }, // dopo TODAY
    ])
    expect(m.pins.map((p) => p.key)).toEqual(['rimini'])
    expect(m.nonGiocati).toBe(1)
  })

  it('un torneo di oggi con un piazzamento vero è già giocato', () => {
    const m = mappa([{ city: 'Rimini', date: TODAY, placement: '2°' }])
    expect(m.pins).toHaveLength(1)
    expect(m.nonGiocati).toBe(0)
  })

  it('il conteggio dei non giocati segue il filtro anno, come tutti gli altri', () => {
    // Contarli su tutto l'archivio faceva scrivere "1 torneo è ancora in
    // programma" mentre si guarda il 2025: vero, ma di un altro anno.
    const tornei: Partial<Tournament>[] = [
      { city: 'Rimini', date: '2025-06-01', placement: 'Gironi' },
      { city: 'Cervia', date: '2026-09-01' }, // futuro (dopo TODAY)
    ]
    expect(mappa(tornei, '2025').nonGiocati).toBe(0)
    expect(mappa(tornei, '2026').nonGiocati).toBe(1)
    expect(mappa(tornei, 'Sempre').nonGiocati).toBe(1)
  })

  it('un torneo "In corso" è contato nell’anno della sua data', () => {
    const tornei: Partial<Tournament>[] = [
      { city: 'Rimini', date: '2026-06-01', placement: 'In corso' },
      { city: 'Cervia', date: '2025-06-01', placement: 'In corso' },
    ]
    expect(mappa(tornei, '2026').nonGiocati).toBe(1)
    expect(mappa(tornei, 'Sempre').nonGiocati).toBe(2)
  })
})

// ---------------------------------------------------------------- bucket
describe('deriveMappa — i tre bucket, nessuno silenzioso', () => {
  it('una città sconosciuta non è un pin ma resta visibile', () => {
    const m = mappa([
      { city: 'Rimini' },
      { id: 'x', city: 'Fooburgo', date: '2026-06-02' },
    ])
    expect(m.pins).toHaveLength(1)
    expect(m.sconosciute).toHaveLength(1)
    expect(m.sconosciute[0].city).toBe('Fooburgo')
    expect(m.sconosciute[0].count).toBe(1)
    expect(m.sconosciute[0].tornei[0].id).toBe('x')
  })

  it('una città estera finisce in "fuori Italia" e non diventa un pin', () => {
    // La vista parte inquadrata sull'Italia: un viaggio all'estero non deve
    // allargarla fino a rimpicciolire la penisola per tutti.
    const m = mappa([{ city: 'Rimini' }, { city: 'Ibiza' }])
    expect(m.pins.map((p) => p.key)).toEqual(['rimini'])
    expect(m.fuoriItalia.map((c) => c.city)).toEqual(['Ibiza'])
  })

  it('una città vuota non è un pin: è contata in senzaCitta', () => {
    // `quickCreateTorneo` scrive sempre `city: ''`, e l'assistente permette di
    // saltare il passo: è un caso frequente, non un errore.
    const m = mappa([{ city: 'Rimini' }, { city: '' }, { city: '   ' }])
    expect(m.pins).toHaveLength(1)
    expect(m.senzaCitta).toBe(2)
    expect(m.sconosciute).toHaveLength(0)
  })

  it('senza tornei restituisce una mappa vuota ma completa', () => {
    const m = deriveMappa(makeData(), 'Sempre', TODAY)
    expect(m.pins).toEqual([])
    expect(m.migliore).toBeNull()
    expect(m.legenda).toHaveLength(3) // le tre righe ci sono sempre
    expect(m.legenda.every((r) => r.count === 0)).toBe(true)
    expect(m.srSummary).toContain('senza città')
  })
})

// ---------------------------------------------------------------- coordinate
describe('deriveMappa — dove cade il pin', () => {
  it('senza luogo geolocalizzato usa il centro città del gazetteer', () => {
    const m = mappa([{ city: 'Rimini' }])
    const vero = geocodeCity('Rimini')!
    expect(pinDi(m, 'Rimini')!.lat).toBe(vero.lat)
    expect(pinDi(m, 'Rimini')!.lng).toBe(vero.lng)
    // Dichiarato, non nascosto: la schermata avvisa che quel pin è approssimato.
    expect(pinDi(m, 'Rimini')!.preciso).toBe(false)
  })

  it('con un luogo geolocalizzato il pin cade sul campo, non sul centro', () => {
    const bagno = makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione', lat: 43.985, lng: 12.658 })
    const m = mappaCon([{ city: 'Riccione', venueId: 'v1' }], [bagno])
    const p = pinDi(m, 'Riccione')!
    expect(p.lat).toBe(43.985)
    expect(p.lng).toBe(12.658)
    expect(p.preciso).toBe(true)
    // E non è il centro città: è proprio il punto della feature.
    expect(p.lat).not.toBe(geocodeCity('Riccione')!.lat)
  })

  it('un luogo senza coordinate ricade sul centro città', () => {
    // Il venue esiste ma nessuno ha messo lat/lng: metà del catalogo nasce così
    // (backfill dalle città), e quei tornei devono restare sulla mappa.
    const senzaCoord = makeVenue({ id: 'v1', city: 'Rimini', lat: null, lng: null })
    const m = mappaCon([{ city: 'Rimini', venueId: 'v1' }], [senzaCoord])
    expect(pinDi(m, 'Rimini')!.preciso).toBe(false)
    expect(pinDi(m, 'Rimini')!.lat).toBe(geocodeCity('Rimini')!.lat)
  })

  it('fra più campi nella stessa città vince quello del torneo più recente', () => {
    const vecchio = makeVenue({ id: 'v1', city: 'Rimini', lat: 44.06, lng: 12.57 })
    const nuovo = makeVenue({ id: 'v2', city: 'Rimini', lat: 44.08, lng: 12.6 })
    const m = mappaCon(
      [
        { city: 'Rimini', venueId: 'v1', date: '2026-06-01' },
        { city: 'Rimini', venueId: 'v2', date: '2026-07-01' },
      ],
      [vecchio, nuovo],
    )
    expect(m.pins).toHaveLength(1) // sempre un pin per città
    expect(pinDi(m, 'Rimini')!.lat).toBe(44.08)
  })

  it('se il torneo più recente non ha coordinate le prende dal precedente', () => {
    // Nessuna media fra i campi: sarebbe un punto in mezzo al mare dove non ha
    // giocato nessuno. Si scorre indietro finché si trova un luogo vero.
    const conCoord = makeVenue({ id: 'v1', city: 'Rimini', lat: 44.06, lng: 12.57 })
    const senza = makeVenue({ id: 'v2', city: 'Rimini', lat: null, lng: null })
    const m = mappaCon(
      [
        { city: 'Rimini', venueId: 'v1', date: '2026-06-01' },
        { city: 'Rimini', venueId: 'v2', date: '2026-07-01' },
      ],
      [conCoord, senza],
    )
    expect(pinDi(m, 'Rimini')!.lat).toBe(44.06)
    expect(pinDi(m, 'Rimini')!.preciso).toBe(true)
  })

  it('un luogo fuori dall’Italia esce dai pin anche con coordinate proprie', () => {
    // Il controllo sui confini vale sulle coordinate FINALI, non sul nome della
    // città: un venue con GPS a Ibiza non deve trascinare la vista fuori.
    const estero = makeVenue({ id: 'v1', city: 'Rimini', lat: 38.91, lng: 1.44 })
    const m = mappaCon([{ city: 'Rimini', venueId: 'v1' }], [estero])
    expect(m.pins).toHaveLength(0)
    expect(m.fuoriItalia.map((c) => c.city)).toEqual(['Rimini'])
  })

  it('mescolare i tornei in ingresso dà le stesse coordinate', () => {
    const riviera = ['Cesenatico', 'Bellaria', 'Rimini', 'Riccione', 'Misano Adriatico', 'Cattolica']
    const tornei = riviera.map((city, i) => ({ city, date: `2026-06-0${i + 1}` }))
    const a = mappa(tornei)
    const b = mappa([...tornei].reverse())
    const coord = (m: typeof a) =>
      [...m.pins].sort((p, q) => (p.key < q.key ? -1 : 1)).map((p) => `${p.key}:${p.lat}:${p.lng}`)
    expect(coord(a)).toEqual(coord(b))
  })

  it('i pin oro si disegnano per ultimi', () => {
    const m = mappa([
      { city: 'Jesolo', placement: 'Gironi' },
      { city: 'Cervia', placement: '1° 🏆' },
      { city: 'Rimini', placement: '2°' },
    ])
    expect(m.pins.map((p) => p.key)).toEqual(['jesolo', 'rimini', 'cervia'])
  })
})

describe('deriveMappa — il filtro anno non muove i pin', () => {
  const tornei: Partial<Tournament>[] = [
    { city: 'Rimini', date: '2025-06-01', placement: 'Gironi' },
    { city: 'Riccione', date: '2026-06-01', placement: '1° 🏆' },
    { city: 'Cattolica', date: '2026-07-01', placement: '2°' },
  ]

  it('filtrando per anno i superstiti restano nelle stesse coordinate', () => {
    // Le coordinate vengono dai dati, non da un layout calcolato sull'insieme:
    // cambiare filtro nasconde righe e pin, non sposta quelli che restano.
    const tutte = mappa(tornei)
    const solo2026 = mappa(tornei, '2026')
    expect(solo2026.pins).toHaveLength(2)
    solo2026.pins.forEach((p) => {
      const prima = tutte.pins.find((q) => q.key === p.key)!
      expect(p.lat, p.key).toBe(prima.lat)
      expect(p.lng, p.key).toBe(prima.lng)
    })
  })

  it('il filtro anno riduce davvero i conteggi', () => {
    const solo2025 = mappa(tornei, '2025')
    expect(solo2025.citta).toBe(1)
    expect(solo2025.cittaVinte).toBe(0)
  })
})

// ---------------------------------------------------------------- forma
describe('deriveMappa — forma dei pin (il risultato non è solo colore)', () => {
  it('vinto = disco pieno con punto interno; giocato = solo contorno', () => {
    const m = mappa([
      { city: 'Cervia', placement: '1° 🏆' },
      { city: 'Rimini', placement: '2°' },
      { city: 'Jesolo', placement: 'Gironi' },
    ])
    expect(pinDi(m, 'Cervia')!.inner).toBeGreaterThan(0)
    expect(pinDi(m, 'Cervia')!.hollow).toBe(false)
    expect(pinDi(m, 'Rimini')!.inner).toBe(0)
    expect(pinDi(m, 'Rimini')!.hollow).toBe(false)
    expect(pinDi(m, 'Jesolo')!.hollow).toBe(true)
  })

  it('il raggio cresce col numero di tornei, ma si ferma', () => {
    const uno = mappa([{ city: 'Rimini', date: '2026-06-01' }])
    const molti = mappa(
      Array.from({ length: 9 }, (_, i) => ({ city: 'Rimini', date: `2026-06-0${i + 1}` })),
    )
    expect(molti.pins[0].radius).toBeGreaterThan(uno.pins[0].radius)
  })

  it('la crescita si ferma, il pin non diventa una macchia', () => {
    // Oltre il 4° torneo il raggio non cresce più: senza tetto una città
    // frequentata da anni coprirebbe le vicine invece di raccontarle.
    const quattro = mappa(
      Array.from({ length: 4 }, (_, i) => ({ city: 'Rimini', date: `2026-06-0${i + 1}` })),
    )
    const nove = mappa(
      Array.from({ length: 9 }, (_, i) => ({ city: 'Rimini', date: `2026-06-0${i + 1}` })),
    )
    expect(nove.pins[0].radius).toBe(quattro.pins[0].radius)
  })

  it('la dimensione dice solo quanti tornei, non il risultato', () => {
    // Un pin "vinto" con un torneo NON deve essere più grande di un pin
    // "giocato" con tre: i due assi resterebbero indistinguibili.
    const unaVittoria = mappa([{ city: 'Cervia', placement: '1° 🏆' }])
    const treGironi = mappa(
      Array.from({ length: 3 }, (_, i) => ({ city: 'Jesolo', date: `2026-06-0${i + 1}`, placement: 'Gironi' as const })),
    )
    expect(unaVittoria.pins[0].radius).toBeLessThan(treGironi.pins[0].radius)
  })
})

// ---------------------------------------------------------------- riepiloghi
describe('deriveMappa — riepiloghi e testi', () => {
  it('conta città, città vinte e con podio', () => {
    const m = mappa([
      { city: 'Cervia', placement: '1° 🏆' },
      { city: 'Rimini', placement: '3°' },
      { city: 'Jesolo', placement: 'Gironi' },
      { city: 'Bibione', placement: 'Quarti' },
    ])
    expect(m.citta).toBe(4)
    expect(m.cittaVinte).toBe(1)
    expect(m.cittaConPodio).toBe(1)
    expect(m.tornei).toBe(4)
  })

  it('"migliore" è la città col piazzamento migliore', () => {
    const m = mappa([
      { city: 'Jesolo', placement: 'Gironi' },
      { city: 'Cervia', placement: '1° 🏆' },
    ])
    expect(m.migliore!.key).toBe('cervia')
  })

  it('la legenda ha sempre tre righe con i conteggi giusti', () => {
    const m = mappa([
      { city: 'Cervia', placement: '1° 🏆' },
      { city: 'Rimini', placement: '2°' },
      { city: 'Jesolo', placement: 'Gironi' },
      { city: 'Bibione', placement: 'Gironi' },
    ])
    expect(m.legenda).toEqual([
      { tier: 'vinto', label: 'Vinto qui', count: 1 },
      { tier: 'podio', label: 'Podio', count: 1 },
      { tier: 'giocato', label: 'Giocato', count: 2 },
    ])
  })

  it('il riassunto per screen reader nomina il numero di città', () => {
    const m = mappa([{ city: 'Cervia', placement: '1° 🏆' }, { city: 'Rimini' }])
    expect(m.srSummary).toContain('2 città')
    expect(m.srSummary).toContain('1 con una vittoria')
  })

  it('ogni pin porta un’etichetta testuale con il risultato', () => {
    const m = mappa([{ city: 'Cervia', placement: '1° 🏆' }])
    expect(m.pins[0].label).toContain('miglior risultato 1° 🏆')
    expect(m.pins[0].srLabel).toContain('Cervia')
  })

  it('mappaSubtitle riassume la pagina', () => {
    expect(mappaSubtitle(deriveMappa(makeData(), 'Sempre', TODAY))).toBe('Nessuna città ancora sulla mappa')
    const m = mappa([{ city: 'Cervia', placement: '1° 🏆' }])
    expect(mappaSubtitle(m)).toBe('1 città · 1 conquistata · 1 torneo')
  })
})

// ---------------------------------------------------------------- purezza
describe('deriveMappa — purezza', () => {
  it('non muta i dati in ingresso', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ city: 'Rimini', date: '2026-06-01' }),
        makeTournament({ city: 'Riccione', date: '2026-06-02' }),
      ],
    })
    const copia = JSON.parse(JSON.stringify(data))
    deriveMappa(data, 'Sempre', TODAY)
    expect(data).toEqual(copia)
  })

  it('chiamarla due volte dà lo stesso risultato', () => {
    const data = makeData({
      tournaments: ['Rimini', 'Riccione', 'Cervia'].map((city) => makeTournament({ city })),
    })
    expect(JSON.stringify(deriveMappa(data, 'Sempre', TODAY))).toBe(
      JSON.stringify(deriveMappa(data, 'Sempre', TODAY)),
    )
  })
})
