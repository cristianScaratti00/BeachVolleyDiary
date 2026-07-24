// ============================================================================
// Diario: costruzione delle voci (`deriveDiary`) e ricerca su tutto il diario
// (`deriveDiarySearch`). Funzioni pure: nessun React, nessuna rete, nessun
// orologio — il Diario non ha il concetto di "imminente".
// ============================================================================
import { describe, it, expect } from 'vitest'
import { deriveDiary, deriveDiarySearch, DIARIO_SEARCH_MIN } from './derive'
import type { DiaryEntry } from './derive'
import {
  makeData,
  makeTournament,
  makeMatch,
  makePartner,
  makePhoto,
  winSets,
  lossSets,
} from '../test/factories'

const ids = (list: Array<{ id: string }>) => list.map((e) => e.id)
const resultIds = (list: Array<{ entry: DiaryEntry }>) => list.map((r) => r.entry.id)

// Un diario piccolo ma completo: due tornei, partite con avversari e note,
// compagni, foto con didascalia. È l'input di quasi tutti i test qui sotto.
const diario = makeData({
  tournaments: [
    makeTournament({ id: 't1', name: 'Riccione Cup', date: '2025-06-20', city: 'Riccione', category: 'Open', format: '2vs2', surface: 'Sabbia outdoor', placement: '2°', partnerId: 'p1' }),
    makeTournament({ id: 't2', name: 'Forlì Beach', date: '2024-08-05', city: 'Forlì', category: 'Amatoriale', format: '3vs3', surface: 'Indoor', placement: 'Gironi', partnerId: 'p2' }),
  ],
  partners: [
    makePartner({ id: 'p1', name: 'Luca Verdi' }),
    makePartner({ id: 'p2', name: 'Sara Neri' }),
  ],
  matches: [
    makeMatch({ id: 'm1', tournamentId: 't1', partnerId: 'p1', opponents: 'Rossi/Bianchi', phase: 'Finale', note: 'Rimonta pazzesca al terzo set', sets: winSets() }),
    makeMatch({ id: 'm2', tournamentId: 't1', partnerId: 'p1', opponents: 'Gialli/Blu', phase: 'Girone', note: '', sets: lossSets() }),
    makeMatch({ id: 'm3', tournamentId: 't2', partnerId: 'p2', opponents: 'Neri/Grigi', phase: 'Girone', note: 'Vento fortissimo', sets: winSets() }),
  ],
  photos: [makePhoto({ id: 'f1', tournamentId: 't1', caption: 'Tramonto in spiaggia' })],
})

const entries = () => deriveDiary(diario)
const entry = (id: string) => entries().find((e) => e.id === id) as DiaryEntry

// ---------------------------------------------------------------- deriveDiary
describe('deriveDiary — voci del diario', () => {
  it('ordina dal più recente, come il resto dell\'app', () => {
    expect(ids(entries())).toEqual(['t1', 't2'])
  })

  it('compone data, emoji, titolo e recap', () => {
    const e = entry('t1')
    expect(e.day).toBe('20')
    expect(e.month).toBe('Giu')
    expect(e.year).toBe('2025')
    expect(e.title).toBe('Riccione Cup')
    expect(e.desc).toBe('Chiuso al 2° a Riccione · 1 vittoria su 2 — 50% W')
  })

  it('mostra al massimo 4 foto e conta le altre', () => {
    const many = makeData({
      tournaments: [makeTournament({ id: 't1' })],
      photos: Array.from({ length: 6 }, (_, i) => makePhoto({ id: `f${i}`, tournamentId: 't1' })),
    })
    const e = deriveDiary(many)[0]
    expect(e.photos).toHaveLength(4)
    expect(e.morePhotos).toBe(2)
  })

  it('decora tutte le partite del torneo (esito, chip dei set, nota)', () => {
    const e = entry('t1')
    expect(ids(e.matches)).toEqual(['m1', 'm2'])
    expect(e.matches[0]).toMatchObject({ phase: 'Finale', opponents: 'Rossi/Bianchi', esitoShort: 'V' })
    expect(e.matches[0].setChips.map((c) => c.txt)).toEqual(['21-15', '21-15'])
    expect(e.matches[1].esitoShort).toBe('P')
    expect(e.matches[0].note).toBe('Rimonta pazzesca al terzo set')
  })

  it('un torneo senza partite ha una lista di partite vuota, non manca il campo', () => {
    const e = deriveDiary(makeData({ tournaments: [makeTournament({ id: 't9' })] }))[0]
    expect(e.matches).toEqual([])
  })

  it('popola i campi cercabili normalizzati (accenti e maiuscole via)', () => {
    expect(entry('t2').search).toEqual({
      title: 'forli beach',
      place: 'forli amatoriale 3vs3 indoor gironi',
      when: '2024 ago agosto 05 5',
      partner: 'sara neri sara neri',
      opponents: 'neri/grigi',
      notes: 'vento fortissimo',
      captions: '',
    })
  })

  it('non mette "Nessuno" fra i compagni cercabili: è un\'etichetta, non un dato', () => {
    // Altrimenti cercare "nessuno" troverebbe tutti i tornei senza compagno.
    const solo = makeData({
      tournaments: [makeTournament({ id: 't1', partnerId: null })],
      matches: [makeMatch({ id: 'm1', tournamentId: 't1', partnerId: null })],
    })
    const e = deriveDiary(solo)[0]
    expect(e.search.partner).toBe('')
    expect(e.matches[0].search).not.toContain('nessuno')
  })

  it('raccoglie avversari, note e didascalie di tutto il torneo', () => {
    const s = entry('t1').search
    expect(s.opponents).toBe('rossi/bianchi gialli/blu')
    expect(s.notes).toBe('rimonta pazzesca al terzo set')
    expect(s.captions).toBe('tramonto in spiaggia')
  })

  it('tiene i campi della partita separati, senza concatenarli', () => {
    // La subsequence si valuta un campo per volta: `search` è un array, non
    // una stringa sola.
    expect(entry('t1').matches[0].search).toEqual(['finale', 'rossi/bianchi', 'rimonta pazzesca al terzo set', 'luca verdi'])
  })

  it('include le didascalie oltre la quarta foto: identificano comunque il torneo', () => {
    const many = makeData({
      tournaments: [makeTournament({ id: 't1' })],
      photos: [
        ...Array.from({ length: 4 }, (_, i) => makePhoto({ id: `f${i}`, tournamentId: 't1', caption: '' })),
        makePhoto({ id: 'f5', tournamentId: 't1', caption: 'Podio finale' }),
      ],
    })
    expect(deriveDiary(many)[0].search.captions).toContain('podio finale')
  })
})

// ---------------------------------------------------------- deriveDiarySearch
describe('deriveDiarySearch — query vuota', () => {
  it('restituisce tutto il diario e si dichiara non attiva', () => {
    const r = deriveDiarySearch(entries(), '')
    expect(r.active).toBe(false)
    expect(resultIds(r.results)).toEqual(['t1', 't2'])
    expect(r.total).toBe(2)
    expect(r.results.every((x) => x.hits.length === 0)).toBe(true)
  })

  it('una query di soli spazi equivale a nessuna ricerca', () => {
    expect(deriveDiarySearch(entries(), '   ').active).toBe(false)
  })

  it('basta un carattere per attivarla', () => {
    expect(DIARIO_SEARCH_MIN).toBe(1)
    expect(deriveDiarySearch(entries(), 'r').active).toBe(true)
  })

  it('riporta la query digitata così com\'è, per l\'etichetta', () => {
    expect(deriveDiarySearch(entries(), '  Riccione ').query).toBe('  Riccione ')
  })
})

describe('deriveDiarySearch — cosa risponde', () => {
  const found = (q: string) => resultIds(deriveDiarySearch(entries(), q).results)

  it('trova per nome del torneo', () => {
    expect(found('riccione cup')).toEqual(['t1'])
  })

  it('trova per città', () => {
    expect(found('forli')).toEqual(['t2'])
  })

  it('trova per categoria, formato, superficie e piazzamento', () => {
    expect(found('amatori')).toEqual(['t2'])
    expect(found('3vs3')).toEqual(['t2'])
    expect(found('indoor')).toEqual(['t2'])
    expect(found('gironi')).toEqual(['t2'])
  })

  it('trova per compagno', () => {
    expect(found('sara')).toEqual(['t2'])
  })

  it('trova per avversario annotato in una partita', () => {
    expect(found('gialli')).toEqual(['t1'])
  })

  it('trova per nota di una partita — il dato oggi invisibile sul Diario', () => {
    expect(found('rimonta')).toEqual(['t1'])
    expect(found('vento')).toEqual(['t2'])
  })

  it('trova per didascalia di una foto', () => {
    expect(found('tramonto')).toEqual(['t1'])
  })

  it('trova per anno, mese abbreviato e mese per esteso', () => {
    expect(found('2025')).toEqual(['t1'])
    expect(found('ago')).toEqual(['t2'])
    expect(found('agosto')).toEqual(['t2'])
  })

  it('ignora accenti e maiuscole', () => {
    expect(found('Forlì')).toEqual(['t2'])
    expect(found('FORLI')).toEqual(['t2'])
    expect(found('forlì')).toEqual(['t2'])
  })

  it('tollera un refuso da 3 caratteri in su', () => {
    expect(found('rccione')).toEqual(['t1'])
  })

  it('AND fra i token: due termini chiedono entrambi', () => {
    expect(found('riccione 2025')).toEqual(['t1'])
    expect(found('riccione 2024')).toEqual([])
  })

  it('i token possono rispondere da campi diversi della stessa voce', () => {
    // 'rimonta' viene da una nota, 'luca' dal compagno.
    expect(found('rimonta luca')).toEqual(['t1'])
  })

  it('senza riscontri restituisce una lista vuota, non tutto il diario', () => {
    const r = deriveDiarySearch(entries(), 'pallanuoto')
    expect(r.results).toEqual([])
    expect(r.active).toBe(true)
    expect(r.total).toBe(2)
  })

  it('preserva l\'ordine cronologico, non riordina per rilevanza', () => {
    // 'i' risponde su entrambe: l'ordine resta quello del diario.
    expect(found('i')).toEqual(['t1', 't2'])
  })

  it('non muta le voci ricevute', () => {
    const list = entries()
    const snapshot = JSON.parse(JSON.stringify(list))
    deriveDiarySearch(list, 'rimonta')
    expect(list).toEqual(snapshot)
  })

  it('su un diario vuoto non trova niente e non esplode', () => {
    expect(deriveDiarySearch([], 'rimini')).toEqual({ query: 'rimini', active: true, results: [], total: 0 })
  })
})

describe('deriveDiarySearch — riscontri di partita', () => {
  const hitsFor = (q: string, id: string) =>
    deriveDiarySearch(entries(), q).results.find((r) => r.entry.id === id)?.hits ?? []

  it('mostra solo le partite che rispondono, non tutte quelle del torneo', () => {
    expect(ids(hitsFor('gialli', 't1'))).toEqual(['m2'])
  })

  it('il riscontro su una nota indica la partita giusta', () => {
    expect(ids(hitsFor('rimonta', 't1'))).toEqual(['m1'])
  })

  it('quando risponde solo il torneo non ci sono riscontri di partita', () => {
    expect(hitsFor('riccione', 't1')).toEqual([])
  })

  it('un termine presente in più partite le mostra tutte', () => {
    // 'girone' è la fase di m2 (t1) e di m3 (t2).
    const r = deriveDiarySearch(entries(), 'girone')
    expect(ids(r.results[0].hits)).toEqual(['m2'])
    expect(ids(r.results[1].hits)).toEqual(['m3'])
  })

  it('la partita risponde solo se soddisfa TUTTI i token', () => {
    // 'riccione' non sta in nessuna partita: la voce compare (risponde il
    // torneo) ma senza righe che promettano una spiegazione che non c'è.
    expect(hitsFor('riccione rossi', 't1')).toEqual([])
  })

  it('porta in pagina una voce che risponde solo da una partita', () => {
    // Il nome del torneo non contiene 'grigi': senza le partite t2 sparirebbe.
    const r = deriveDiarySearch(entries(), 'grigi')
    expect(resultIds(r.results)).toEqual(['t2'])
    expect(ids(r.results[0].hits)).toEqual(['m3'])
  })
})
