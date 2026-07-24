// ============================================================================
// Regole della lista tornei: split imminenti/passati, formati presenti,
// raggruppamento, filtro e riepilogo di testata (piazzamento migliore). Sono
// funzioni pure con `today` iniettabile, quindi si verificano senza montare
// React e senza toccare l'orologio.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  splitUpcoming,
  torneiFormats,
  groupTorneiByFormat,
  deriveTorneiSections,
  deriveTorneiList,
  deriveTorneiListServer,
  TORNEI_FILTER_ALL,
} from './derive'
import { placementRank } from './stats'
import { FORMATS, PLACEMENTS } from './db.enums'
import { makeTorneo, makeData, makeTournament, TODAY } from '../test/factories'

const ids = (list: Array<{ id: string }>) => list.map((t) => t.id)

describe('splitUpcoming', () => {
  it('mette il torneo di oggi tra gli imminenti, non tra i passati', () => {
    // Il confine è `date >= today`: giocare oggi non è "passato".
    const oggi = makeTorneo({ id: 'oggi', date: TODAY })
    const { upcoming, past } = splitUpcoming([oggi], TODAY)
    expect(ids(upcoming)).toEqual(['oggi'])
    expect(past).toEqual([])
  })

  it('separa futuri e passati preservando l\'ordine in ingresso', () => {
    const list = [
      makeTorneo({ id: 'f1', date: '2026-08-01' }),
      makeTorneo({ id: 'f2', date: '2026-09-01' }),
      makeTorneo({ id: 'p1', date: '2026-07-21' }),
      makeTorneo({ id: 'p2', date: '2025-05-10' }),
    ]
    const { upcoming, past } = splitUpcoming(list, TODAY)
    expect(ids(upcoming)).toEqual(['f1', 'f2'])
    expect(ids(past)).toEqual(['p1', 'p2'])
  })

  it('su lista vuota restituisce due liste vuote', () => {
    expect(splitUpcoming([], TODAY)).toEqual({ upcoming: [], past: [] })
  })

  it('non muta l\'array ricevuto', () => {
    const list = [makeTorneo({ date: '2026-08-01' }), makeTorneo({ date: '2025-01-01' })]
    const snapshot = [...list]
    splitUpcoming(list, TODAY)
    expect(list).toEqual(snapshot)
  })
})

describe('torneiFormats', () => {
  it('usa l\'ordine fisso di FORMATS, non quello dei dati', () => {
    // La pagina non deve rimescolarsi quando si aggiunge un torneo.
    const list = [
      makeTorneo({ format: '4vs4' }),
      makeTorneo({ format: '2vs2' }),
      makeTorneo({ format: '3vs3' }),
    ]
    expect(torneiFormats(list)).toEqual(['2vs2', '3vs3', '4vs4'])
  })

  it('omette i formati senza tornei', () => {
    const list = [makeTorneo({ format: '4vs4' }), makeTorneo({ format: '4vs4' })]
    expect(torneiFormats(list)).toEqual(['4vs4'])
  })

  it('non duplica un formato che compare più volte', () => {
    const list = [
      makeTorneo({ format: '2vs2' }),
      makeTorneo({ format: '2vs2' }),
      makeTorneo({ format: '2vs2' }),
    ]
    expect(torneiFormats(list)).toEqual(['2vs2'])
  })

  it('accoda i formati fuori da FORMATS invece di farli sparire', () => {
    // Oggi impossibile (c'è un CHECK a DB), ma se il vincolo venisse allargato
    // il torneo deve restare visibile, non evaporare dalla pagina.
    const list = [
      makeTorneo({ format: '1vs1' }),
      makeTorneo({ format: '2vs2' }),
      makeTorneo({ format: '6vs6' }),
    ]
    expect(torneiFormats(list)).toEqual(['2vs2', '1vs1', '6vs6'])
  })

  it('su lista vuota restituisce nessun formato', () => {
    expect(torneiFormats([])).toEqual([])
  })
})

describe('groupTorneiByFormat', () => {
  it('crea un gruppo per formato, con label uguale alla chiave', () => {
    const groups = groupTorneiByFormat([
      makeTorneo({ id: 'a', format: '3vs3' }),
      makeTorneo({ id: 'b', format: '2vs2' }),
      makeTorneo({ id: 'c', format: '3vs3' }),
    ])
    expect(groups.map((g) => g.key)).toEqual(['2vs2', '3vs3'])
    expect(groups.map((g) => g.label)).toEqual(['2vs2', '3vs3'])
    expect(ids(groups[1].tornei)).toEqual(['a', 'c'])
  })

  it('preserva dentro al gruppo l\'ordine in ingresso (già "agenda")', () => {
    const groups = groupTorneiByFormat([
      makeTorneo({ id: 'recente', format: '2vs2', date: '2026-07-01' }),
      makeTorneo({ id: 'vecchio', format: '2vs2', date: '2024-03-01' }),
    ])
    expect(ids(groups[0].tornei)).toEqual(['recente', 'vecchio'])
  })

  it('non produce gruppi vuoti', () => {
    const groups = groupTorneiByFormat([makeTorneo({ format: '2vs2' })])
    expect(groups).toHaveLength(1)
    expect(groups.every((g) => g.tornei.length > 0)).toBe(true)
  })

  it('su lista vuota restituisce nessun gruppo', () => {
    expect(groupTorneiByFormat([])).toEqual([])
  })

  it('non perde nessun torneo per strada', () => {
    const list = FORMATS.flatMap((f, i) => [
      makeTorneo({ id: `${f}-a`, format: f }),
      makeTorneo({ id: `${f}-b`, format: i === 0 ? f : '2vs2' }),
    ])
    const total = groupTorneiByFormat(list).reduce((n, g) => n + g.tornei.length, 0)
    expect(total).toBe(list.length)
  })
})

describe('deriveTorneiSections', () => {
  const passati = [
    makeTorneo({ id: 'p2a', format: '2vs2', date: '2026-07-01' }),
    makeTorneo({ id: 'p2b', format: '2vs2', date: '2026-06-01' }),
    makeTorneo({ id: 'p3a', format: '3vs3', date: '2026-05-01' }),
  ]
  const futuro = makeTorneo({ id: 'f4', format: '4vs4', date: '2026-08-15' })

  it('senza filtro: imminenti in cima, passati raggruppati per formato', () => {
    const s = deriveTorneiSections([futuro, ...passati], TORNEI_FILTER_ALL, TODAY)
    expect(s.active).toBe(TORNEI_FILTER_ALL)
    expect(ids(s.upcoming)).toEqual(['f4'])
    expect(s.groups.map((g) => g.key)).toEqual(['2vs2', '3vs3'])
    expect(ids(s.groups[0].tornei)).toEqual(['p2a', 'p2b'])
  })

  it('un torneo futuro sta solo tra gli imminenti, mai anche nel suo gruppo', () => {
    // È il punto del design: senza questo, un torneo di domani finisce sepolto.
    const s = deriveTorneiSections([futuro, ...passati], TORNEI_FILTER_ALL, TODAY)
    const nelleSezioni = s.groups.flatMap((g) => ids(g.tornei))
    expect(nelleSezioni).not.toContain('f4')
    expect(s.groups.map((g) => g.key)).not.toContain('4vs4')
  })

  it('offre un\'opzione per ogni formato presente, in ordine fisso', () => {
    const s = deriveTorneiSections([futuro, ...passati], TORNEI_FILTER_ALL, TODAY)
    expect(s.options).toEqual(['2vs2', '3vs3', '4vs4'])
  })

  it('con un solo formato non offre opzioni: filtrare non separerebbe nulla', () => {
    const s = deriveTorneiSections(
      [makeTorneo({ format: '2vs2', date: '2026-01-01' }), makeTorneo({ format: '2vs2', date: '2025-01-01' })],
      TORNEI_FILTER_ALL,
      TODAY,
    )
    expect(s.options).toEqual([])
    expect(s.groups).toHaveLength(1)
  })

  it('filtrando su un formato mostra solo quello, imminenti compresi', () => {
    const s = deriveTorneiSections([futuro, ...passati], '2vs2', TODAY)
    expect(s.active).toBe('2vs2')
    expect(s.upcoming).toEqual([])
    expect(s.groups.map((g) => g.key)).toEqual(['2vs2'])
    expect(ids(s.groups[0].tornei)).toEqual(['p2a', 'p2b'])
  })

  it('il filtro lascia invariata la lista delle opzioni', () => {
    // Le chip si calcolano su tutti i tornei, non su quelli visibili: altrimenti
    // dopo il primo click resterebbe selezionabile solo il filtro attivo.
    const s = deriveTorneiSections([futuro, ...passati], '2vs2', TODAY)
    expect(s.options).toEqual(['2vs2', '3vs3', '4vs4'])
  })

  it('un filtro non più valido ricade su "Tutti" invece di svuotare la pagina', () => {
    // Es. cancellato l'ultimo torneo 4vs4 mentre il filtro era 4vs4.
    const s = deriveTorneiSections(passati, '4vs4', TODAY)
    expect(s.active).toBe(TORNEI_FILTER_ALL)
    expect(s.groups.map((g) => g.key)).toEqual(['2vs2', '3vs3'])
  })

  it('un filtro inventato ricade su "Tutti"', () => {
    const s = deriveTorneiSections([futuro, ...passati], 'king', TODAY)
    expect(s.active).toBe(TORNEI_FILTER_ALL)
    expect(s.groups.map((g) => g.key)).toEqual(['2vs2', '3vs3'])
  })

  it('con un solo formato ignora anche un filtro che coinciderebbe', () => {
    // `options` è vuoto: nessuna chip è renderizzata, quindi nessun valore può
    // risultare attivo — la pagina non deve dirsi filtrata senza mostrarlo.
    const s = deriveTorneiSections([makeTorneo({ format: '2vs2', date: '2025-01-01' })], '2vs2', TODAY)
    expect(s.active).toBe(TORNEI_FILTER_ALL)
  })

  it('solo tornei futuri: nessun gruppo, tutto in "Prossimi tornei"', () => {
    const s = deriveTorneiSections(
      [makeTorneo({ id: 'a', format: '2vs2', date: '2026-08-01' }), makeTorneo({ id: 'b', format: '3vs3', date: '2026-09-01' })],
      TORNEI_FILTER_ALL,
      TODAY,
    )
    expect(ids(s.upcoming)).toEqual(['a', 'b'])
    expect(s.groups).toEqual([])
  })

  it('nessun torneo futuro: nessuna sezione imminenti', () => {
    const s = deriveTorneiSections(passati, TORNEI_FILTER_ALL, TODAY)
    expect(s.upcoming).toEqual([])
    expect(s.groups).toHaveLength(2)
  })

  it('lista vuota: tutto vuoto, nessun filtro', () => {
    const s = deriveTorneiSections([], TORNEI_FILTER_ALL, TODAY)
    expect(s).toEqual({ active: TORNEI_FILTER_ALL, options: [], upcoming: [], groups: [] })
  })

  it('senza argomenti opzionali non filtra (default = Tutti)', () => {
    // `today` reale: si verifica solo che tutti i tornei siano ancora presenti,
    // non dove finiscano — altrimenti il test scadrebbe con il tempo.
    const s = deriveTorneiSections([futuro, ...passati])
    const visti = [...ids(s.upcoming), ...s.groups.flatMap((g) => ids(g.tornei))].sort()
    expect(visti).toEqual(['f4', 'p2a', 'p2b', 'p3a'])
  })

  it('non muta la lista ricevuta', () => {
    const list = [futuro, ...passati]
    const snapshot = [...list]
    deriveTorneiSections(list, '2vs2', TODAY)
    expect(list).toEqual(snapshot)
  })

  it('senza filtro nessun torneo si perde tra imminenti e gruppi', () => {
    const list = [futuro, ...passati, makeTorneo({ id: 'f2', format: '2vs2', date: TODAY })]
    const s = deriveTorneiSections(list, TORNEI_FILTER_ALL, TODAY)
    const visti = [...ids(s.upcoming), ...s.groups.flatMap((g) => ids(g.tornei))]
    expect(visti.sort()).toEqual(ids(list).sort())
  })
})

describe('deriveTorneiList — riepilogo di testata', () => {
  it('una semifinale è un piazzamento, non un "—"', () => {
    // Regressione: 'Semifinale' non era nella scala e cadeva nel fallback,
    // così la testata leggeva "miglior piazzamento —" a chi era arrivato in
    // semifinale.
    const data = makeData({
      tournaments: [makeTournament({ id: 't1', date: '2026-05-01', placement: 'Semifinale' })],
    })
    expect(deriveTorneiList(data, 'Sempre').bestPlacement).toBe('Semifinale')
  })

  it('tra semifinale e gironi il migliore è la semifinale', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', date: '2026-05-01', placement: 'Gironi' }),
        makeTournament({ id: 't2', date: '2026-06-01', placement: 'Semifinale' }),
      ],
    })
    expect(deriveTorneiList(data, 'Sempre').bestPlacement).toBe('Semifinale')
  })

  it('una semifinale non conta come podio', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', date: '2026-05-01', placement: 'Semifinale' }),
        makeTournament({ id: 't2', date: '2026-06-01', placement: '3°' }),
      ],
    })
    const list = deriveTorneiList(data, 'Sempre')
    expect(list.podi).toBe(1)
    expect(list.bestPlacement).toBe('3°')
  })

  it('conta e valuta solo i tornei dell\'anno selezionato', () => {
    const data = makeData({
      tournaments: [
        makeTournament({ id: 't1', date: '2025-07-01', placement: '1° 🏆' }),
        makeTournament({ id: 't2', date: '2026-07-01', placement: 'Semifinale' }),
      ],
    })
    const list = deriveTorneiList(data, '2026')
    expect(list.tPlayed).toBe(1)
    expect(list.bestPlacement).toBe('Semifinale')
  })

  it('senza tornei nel periodo non c\'è miglior piazzamento', () => {
    expect(deriveTorneiList(makeData(), 'Sempre').bestPlacement).toBe('—')
  })
})

describe('deriveTorneiListServer — rank dalla RPC', () => {
  const svList = (best_rank: number) => ({ tornei: [], t_played: 0, podi: 0, best_rank })

  it('rimappa ogni rank della scala nella sua etichetta', () => {
    // Il `best_rank` arriva da public.placement_rank (SQL) e qui torna testo:
    // la mappa inversa deve chiudere il giro su tutta la scala, altrimenti un
    // piazzamento reale si presenta come "—" solo sul percorso server.
    PLACEMENTS.filter((l) => l !== 'In corso').forEach((l) => {
      expect(deriveTorneiListServer(svList(placementRank(l))).bestPlacement).toBe(l)
    })
  })

  it('un rank senza risultato resta "—"', () => {
    expect(deriveTorneiListServer(svList(9)).bestPlacement).toBe('—')
  })
})
