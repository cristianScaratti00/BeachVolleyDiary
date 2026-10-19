// ============================================================================
// I selettori dell'app web (UX §5 F3, §6.1, F4): la destinazione di "Aggiungi
// partita" nei suoi 5 casi, la sezione *Adesso* della Home, il sottotitolo di
// Tornei che segue ciò che si vede (difetto #1), le date in italiano. In fondo
// la Home del redesign: la frase del titolo, i consigli di Pallo, gli ultimi
// tornei, le stagioni del segmented.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { lossSets, makeData, makeMatch, makePartner, makeTournament, makeVenue, winSets } from '../test/factories'
import type { Match, Tournament } from '../lib/models'
import {
  compagnoDefault,
  dataBreve,
  dataCorta,
  dataRelativa,
  deriveAdesso,
  deriveConsigli,
  deriveHome,
  etichettaStagione,
  formaRecente,
  fraseHome,
  iniziali,
  metaDiario,
  wrappedAOttobre,
  partitaDestinazione,
  postoMagico,
  serieInCorso,
  sottotitoloTornei,
  stagioniHome,
  ultimiTornei,
} from './selectors'

const OGGI = '2026-07-22'

describe('partitaDestinazione — i 5 casi di F3', () => {
  const vecchio = makeTournament({ id: 'vecchio', date: '2026-05-01', placement: '2°' })
  const recente = makeTournament({ id: 'recente', date: '2026-07-10', placement: '3°' })
  const inCorso = makeTournament({ id: 'incorso', date: '2026-07-12', placement: 'In corso' })
  const oggi = makeTournament({ id: 'oggi', date: OGGI, name: 'Rimini Open' })
  const altrui = makeTournament({ id: 'altrui', date: OGGI, shared: true })

  it('1. sul dettaglio di un torneo tuo → quello', () => {
    const data = makeData({ tournaments: [vecchio, oggi] })
    expect(partitaDestinazione(data, { name: 'torneo', id: 'vecchio' }, OGGI)?.id).toBe('vecchio')
  })

  it('1b. sul dettaglio di un torneo condiviso non vale: si scende ai casi dopo', () => {
    const data = makeData({ tournaments: [altrui, oggi] })
    expect(partitaDestinazione(data, { name: 'torneo', id: 'altrui' }, OGGI)?.id).toBe('oggi')
  })

  it('2. un tuo torneo di oggi', () => {
    const data = makeData({ tournaments: [vecchio, inCorso, oggi, altrui] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('oggi')
  })

  it('3. un tuo torneo «In corso» con data ≤ oggi, il più recente', () => {
    const data = makeData({ tournaments: [vecchio, recente, inCorso] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('incorso')
  })

  it('4. altrimenti il tuo torneo più recente', () => {
    const data = makeData({ tournaments: [vecchio, recente] })
    expect(partitaDestinazione(data, { name: 'home' }, OGGI)?.id).toBe('recente')
  })

  it('5. nessun torneo tuo → nessuna destinazione', () => {
    expect(partitaDestinazione(makeData({ tournaments: [altrui] }), { name: 'home' }, OGGI)).toBeNull()
    expect(partitaDestinazione(makeData(), { name: 'home' }, OGGI)).toBeNull()
  })
})

describe('compagnoDefault (Q21)', () => {
  it('il compagno del tuo torneo più recente', () => {
    const giulia = makePartner({ id: 'p1', name: 'Giulia' })
    const marco = makePartner({ id: 'p2', name: 'Marco' })
    const data = makeData({
      partners: [giulia, marco],
      tournaments: [
        makeTournament({ date: '2026-05-01', partnerId: 'p1' }),
        makeTournament({ date: '2026-07-01', partnerId: 'p2' }),
      ],
    })
    expect(compagnoDefault(data)).toBe('p2')
  })

  it('nessuno senza tornei con un compagno', () => {
    expect(compagnoDefault(makeData({ tournaments: [makeTournament()] }))).toBe('')
  })
})

describe('deriveAdesso — la Home dice cosa serve adesso (§6.1)', () => {
  it('«Oggi giochi» esclude «Prossimo torneo»', () => {
    const data = makeData({
      tournaments: [makeTournament({ id: 'a', date: OGGI }), makeTournament({ id: 'b', date: '2026-08-01' })],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.oggi?.id).toBe('a')
    expect(a.prossimo).toBeNull()
  })

  it('senza torneo oggi c\'è il prossimo (anche condiviso)', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 'b', date: '2026-08-01', shared: true })] })
    expect(deriveAdesso(data, OGGI).prossimo?.id).toBe('b')
  })

  it('l\'ultimo risultato è il passato più recente con un piazzamento', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'x', date: '2026-07-01', placement: '1° 🏆' }),
        makeTournament({ id: 'y', date: '2026-06-01', placement: 'Gironi' }),
      ],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.ultimo?.id).toBe('x')
    expect(a.ultimo?.podio).toBe(true)
    expect(a.daChiudere).toBeNull()
  })

  it('se il passato più recente è «In corso» diventa «Com\'è andata?»', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'aperto', date: '2026-07-20', placement: 'In corso' }),
        makeTournament({ id: 'chiuso', date: '2026-07-01', placement: '2°' }),
      ],
    })
    const a = deriveAdesso(data, OGGI)
    expect(a.daChiudere?.id).toBe('aperto')
    expect(a.ultimo?.id).toBe('chiuso')
  })

  it('il luogo viene dal venue quando c\'è', () => {
    const v = makeVenue({ id: 'v1', name: 'Bagno 26', city: 'Riccione' })
    const data = makeData({ venues: [v], tournaments: [makeTournament({ date: OGGI, venueId: 'v1' })] })
    expect(deriveAdesso(data, OGGI).oggi?.place).toBe('Bagno 26 · Riccione')
  })
})

describe('sottotitoloTornei — conta ciò che si vede (difetto #1)', () => {
  it('singolare e plurale, podi letti dal badge della lib', () => {
    expect(sottotitoloTornei([{ badgeBg: '#FFF1EA' }])).toBe('1 torneo · 1 podio')
    expect(sottotitoloTornei([{ badgeBg: '#FFF1EA' }, { badgeBg: '#F2F0EC' }, { badgeBg: '#FFF1EA' }])).toBe('3 tornei · 2 podi')
    expect(sottotitoloTornei([])).toBe('0 tornei · 0 podi')
  })
})

describe('date e stagione in italiano (UX §12)', () => {
  it('«sab 12 lug»', () => {
    expect(dataBreve('2025-07-12')).toBe('sab 12 lug')
  })

  it('le relative vicine, l\'assoluta oltre la settimana', () => {
    expect(dataRelativa(OGGI, OGGI)).toBe('oggi')
    expect(dataRelativa('2026-07-23', OGGI)).toBe('domani')
    expect(dataRelativa('2026-07-21', OGGI)).toBe('ieri')
    expect(dataRelativa('2026-07-25', OGGI)).toBe('tra 3 giorni')
    expect(dataRelativa('2026-08-20', OGGI)).toBe('gio 20 ago')
  })

  it('l\'etichetta della stagione', () => {
    expect(etichettaStagione('2026')).toBe('Stagione 2026')
    expect(etichettaStagione('Sempre')).toBe('Sempre')
  })
})

// ---------------------------------------------------------------------------
// Home del redesign
// ---------------------------------------------------------------------------

/**
 * Un diario con le partite in fila, una per torneo e un torneo al giorno:
 * `'VVP'` = vinta, vinta, persa, dalla più vecchia. Così l'ordine nel tempo
 * è quello della stringa.
 */
function diarioDi(esiti: string, over: Partial<Tournament> = {}) {
  const tournaments: Tournament[] = []
  const matches: Match[] = []
  esiti.split('').forEach((e, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
    const t = makeTournament({ id: `h${i}`, date: d, ...over })
    tournaments.push(t)
    matches.push(makeMatch({ tournamentId: t.id, sets: e === 'V' ? winSets() : lossSets() }))
  })
  return makeData({ tournaments, matches })
}

describe('formaRecente e la frase del titolo', () => {
  it('senza partite (o con poche) è il saluto, col solo primo nome', () => {
    expect(formaRecente(makeData()).forma).toBe('nessuna')
    expect(fraseHome(makeData(), 'Marta')).toBe('Ciao, Marta.')
    expect(fraseHome(makeData(), 'Cristian Scaratti')).toBe('Ciao, Cristian.')
    expect(fraseHome(makeData(), '  ')).toBe('Ciao.')
    expect(formaRecente(diarioDi('VVVVV')).forma).toBe('poche')
    expect(fraseHome(diarioDi('VVVVV'), 'Marta')).toBe('Ciao, Marta.')
  })

  it('le ultime meglio di prima: «Stai vincendo più di prima.»', () => {
    const f = formaRecente(diarioDi('PPPPVVVV'))
    expect(f).toEqual({ forma: 'meglio', recente: 100, prima: 0 })
    expect(fraseHome(diarioDi('PPPPVVVV'), 'Marta')).toBe('Stai vincendo più di prima.')
  })

  it('le ultime peggio: «Ultimamente è più dura.»', () => {
    expect(fraseHome(diarioDi('VVVVPPPP'), 'Marta')).toBe('Ultimamente è più dura.')
  })

  it('la stessa forma: il ritmo, o la crescita sotto il 50%', () => {
    expect(fraseHome(diarioDi('VVPVVP'), 'Marta')).toBe('Stai tenendo il ritmo.')
    expect(fraseHome(diarioDi('PPVPPV'), 'Marta')).toBe('Si cresce, partita dopo partita.')
  })

  it('confronta al massimo le ultime 10 con tutte quelle di prima', () => {
    const f = formaRecente(diarioDi('PPPPPPPPPPPP' + 'VVVVVVVVVV'))
    expect(f.recente).toBe(100)
    expect(f.prima).toBe(0)
  })
})

describe('serie in corso e posto magico', () => {
  it('le vittorie di fila dall\'ultima partita all\'indietro', () => {
    expect(serieInCorso(diarioDi('VVPVVV'))).toBe(3)
    expect(serieInCorso(diarioDi('VVVP'))).toBe(0)
  })

  it('la città con più tornei vinti, dal venue quando c\'è', () => {
    const v = makeVenue({ id: 'v1', name: 'Idroscalo', city: 'Segrate' })
    const data = makeData({
      venues: [v],
      tournaments: [
        makeTournament({ venueId: 'v1', city: '', placement: '1° 🏆' }),
        makeTournament({ city: 'segrate ', placement: '1° 🏆' }),
        makeTournament({ city: 'Rimini', placement: '1° 🏆' }),
        makeTournament({ city: 'Rimini', placement: 'Quarti' }),
      ],
    })
    expect(postoMagico(data)).toEqual({ citta: 'Segrate', vinti: 2, podi: 2 })
  })

  it('un risultato solo non fa un posto magico; due podi sì', () => {
    expect(postoMagico(makeData({ tournaments: [makeTournament({ city: 'Rimini', placement: '1° 🏆' })] }))).toBeNull()
    const podi = makeData({
      tournaments: [
        makeTournament({ city: 'Rimini', placement: '1° 🏆' }),
        makeTournament({ city: 'Cervia', placement: '2°' }),
        makeTournament({ city: 'Cervia', placement: '3°' }),
      ],
    })
    expect(postoMagico(podi)).toEqual({ citta: 'Cervia', vinti: 0, podi: 2 })
    expect(deriveConsigli(podi, { today: OGGI }).map((c) => c.testo)).toContain('Il tuo posto magico? Cervia: 2 volte sul podio.')
  })
})

describe('deriveConsigli — i consigli di Pallo', () => {
  it('diario vuoto: un consiglio solo, crea il primo torneo', () => {
    expect(deriveConsigli(makeData(), { today: OGGI })).toEqual([
      {
        id: 'primo-torneo',
        testo: 'Registra il primo torneo: bastano il nome e la data, il resto lo aggiungi dopo.',
        azione: { tipo: 'nuovoTorneo', label: 'Crea il primo torneo' },
      },
    ])
  })

  it('oggi giochi: viene prima di tutto, con «Aggiungi partita» per quel torneo', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 'oggi', name: 'Rimini Open', date: OGGI, placement: 'In corso' })] })
    const [primo] = deriveConsigli(data, { today: OGGI })
    expect(primo.testo).toMatch(/«Rimini Open»/)
    expect(primo.azione).toEqual({ tipo: 'partita', torneoId: 'oggi', label: 'Aggiungi partita' })
  })

  it('«Com\'è andata a «X»?» con «Aggiorna il piazzamento»', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't2', name: 'Lido Cup', date: '2026-07-20', placement: 'In corso' })] })
    const c = deriveConsigli(data, { today: OGGI }).find((x) => x.azione?.tipo === 'piazzamento')
    expect(c?.testo).toBe("Com'è andata a «Lido Cup»?")
    expect(c?.azione).toMatchObject({ torneoId: 't2', label: 'Aggiorna il piazzamento' })
  })

  it('tornei senza partite: aggiungi la prima, nel torneo giusto', () => {
    const data = makeData({ tournaments: [makeTournament({ id: 't5', date: '2026-07-01', placement: '3°' })] })
    const c = deriveConsigli(data, { today: OGGI })[0]
    expect(c.testo).toBe('Aggiungi la prima partita: i tuoi numeri partono da lì.')
    expect(c.azione).toEqual({ tipo: 'partita', torneoId: 't5', label: 'Aggiungi partita' })
  })

  it('la serie record in corso, il posto magico, Wrapped, la Storia e il prossimo torneo', () => {
    const data = diarioDi('PVVVVVV', { city: 'Segrate', placement: '1° 🏆' })
    data.tournaments.push(makeTournament({ id: 'dopo', name: 'Cervia Cup', date: '2026-07-25' }))
    const testi = deriveConsigli(data, { today: OGGI, wrapped: true }).map((c) => c.testo)
    expect(testi).toEqual([
      '6 vittorie di fila: è il tuo record. Non fermarti adesso!',
      'Il tuo posto magico? Segrate: 1° in 7 tornei.',
      "Beach Wrapped è pronto. Ci diamo un'occhiata?",
      'Hai vinto «Torneo h6»: lo racconti in una storia?',
      'Prossimo torneo: «Cervia Cup», tra 3 giorni.',
    ])
  })

  it('la serie in corso sotto il record, e il record da battere', () => {
    expect(deriveConsigli(diarioDi('VVVVPVVV'), { today: OGGI })[0].testo).toBe('3 vittorie di fila. Il record è 4: ci sei quasi.')
    expect(deriveConsigli(diarioDi('VVVVP'), { today: OGGI })[0].testo).toBe('Il tuo record è di 4 vittorie di fila. Si può battere.')
  })

  it('le azioni portano dove devono: Wrapped, la Storia, il torneo', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 'u', name: 'Riccione', date: '2026-07-10', placement: 'Quarti' }),
        makeTournament({ id: 'p', date: '2026-08-10' }),
      ],
      matches: [makeMatch({ tournamentId: 'u' })],
    })
    const azioni = deriveConsigli(data, { today: OGGI, wrapped: true }).map((c) => c.azione)
    expect(azioni).toEqual([
      { tipo: 'link', to: { name: 'wrapped' }, label: 'Apri Beach Wrapped' },
      { tipo: 'storia', torneoId: 'u', label: 'Storia Instagram' },
      { tipo: 'link', to: { name: 'torneo', id: 'p' }, label: 'Apri il torneo' },
    ])
  })

  it('niente da dire: l\'invito a registrare il prossimo torneo', () => {
    const data = makeData({ tournaments: [makeTournament({ date: '2026-07-01', shared: true, placement: 'In corso' })], matches: [makeMatch()] })
    const c = deriveConsigli(data, { today: OGGI })
    expect(c).toHaveLength(1)
    expect(c[0].azione).toEqual({ tipo: 'nuovoTorneo', label: 'Nuovo torneo' })
  })
})

describe('ultimiTornei — la card «Ultimi tornei»', () => {
  it('fino a oggi, dal più recente, con il compagno o la categoria e il record', () => {
    const data = makeData({
      partners: [makePartner({ id: 'p1', name: 'Luca' })],
      tournaments: [
        makeTournament({ id: 'a', name: 'Sunset Series', date: '2026-06-28', partnerId: 'p1', placement: '1° 🏆' }),
        makeTournament({ id: 'b', name: 'Summer Cup', date: '2026-08-14', category: 'Amatoriale' }),
        makeTournament({ id: 'c', name: 'Spring', date: '2026-04-05', category: 'Amatoriale' }),
        makeTournament({ id: 'd', name: 'Oggi', date: OGGI }),
      ],
      matches: [makeMatch({ tournamentId: 'a' }), makeMatch({ tournamentId: 'a', sets: lossSets() })],
    })
    expect(ultimiTornei(data, OGGI)).toEqual([
      { id: 'd', name: 'Oggi', placement: 'Gironi', meta: '22 lug · Open', record: null, shared: false },
      { id: 'a', name: 'Sunset Series', placement: '1° 🏆', meta: '28 giu · con Luca', record: { won: 1, lost: 1 }, shared: false },
      { id: 'c', name: 'Spring', placement: 'Gironi', meta: '5 apr · Amatoriale', record: null, shared: false },
    ])
  })

  it('«5 apr»: il giorno senza lo zero davanti', () => {
    expect(dataCorta('2026-04-05')).toBe('5 apr')
  })
})

describe('stagioniHome e iniziali', () => {
  it('«Sempre» e le ultime due; quella scelta altrove resta in vista', () => {
    const anni = ['2026', '2025', '2024', 'Sempre']
    expect(stagioniHome(anni, 'Sempre')).toEqual(['Sempre', '2026', '2025'])
    expect(stagioniHome(anni, '2024')).toEqual(['Sempre', '2026', '2024'])
    expect(stagioniHome(['2026', 'Sempre'], 'Sempre')).toEqual(['Sempre', '2026'])
  })

  it('le iniziali del nome', () => {
    expect(iniziali('Cristian Scaratti')).toBe('CS')
    expect(iniziali('marta')).toBe('M')
    expect(iniziali('Anna Maria Rossi')).toBe('AR')
    expect(iniziali('')).toBe('?')
  })
})

describe('deriveHome', () => {
  it('tutto ciò che la Home deriva, in una chiamata', () => {
    const h = deriveHome(makeData(), { nome: 'Marta', today: OGGI })
    expect(h).toMatchObject({ frase: 'Ciao, Marta.', hasTornei: false, haPartite: false, ultimi: [] })
    expect(h.consigli).toHaveLength(1)
  })
})

describe('metaDiario — la riga sotto il titolo nel Diario', () => {
  it('luogo · categoria · piazzamento col tabellone · compagno', () => {
    const p = makePartner({ name: 'Luca' })
    const t = makeTournament({ city: 'Rimini', category: 'Amatoriale', placement: '2°', bracket: 'Silver', partnerId: p.id })
    expect(metaDiario(makeData({ tournaments: [t], partners: [p] }), t.id)).toBe('Rimini · Amatoriale · 2° · Silver · con Luca')
  })

  it('il trofeo del 1° resta nel dato; in corso il piazzamento non c\'è; senza compagno non si dice', () => {
    const vinto = makeTournament({ city: 'Cervia', category: 'Open', placement: '1° 🏆', partnerId: null })
    const aperto = makeTournament({ city: 'Jesolo', category: 'Open', placement: 'In corso', partnerId: null })
    const data = makeData({ tournaments: [vinto, aperto] })
    expect(metaDiario(data, vinto.id)).toBe('Cervia · Open · 1°')
    expect(metaDiario(data, aperto.id)).toBe('Jesolo · Open')
    expect(metaDiario(data, 'nessuno')).toBeUndefined()
  })
})

describe('wrappedAOttobre — Beach Wrapped solo a ottobre', () => {
  it('dal 1° al 31 ottobre sì, fuori no', () => {
    for (const d of ['2026-10-01', '2026-10-19', '2026-10-31']) expect(wrappedAOttobre(d), d).toBe(true)
    for (const d of ['2026-09-30', '2026-11-01', '2027-01-15', '2026-07-22']) expect(wrappedAOttobre(d), d).toBe(false)
  })
})
