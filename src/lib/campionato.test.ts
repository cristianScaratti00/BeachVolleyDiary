// ============================================================================
// Il Campionato per Società (lib/campionato.ts): stagione FIPAV, nome della
// tappa, punti proposti dalle tabelle, esito delle partite con il forfait, e
// i numeri della pagina e del dettaglio. Tutto a parte dalle statistiche.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  bilancio,
  campionatoIngresso,
  deriveCampionato,
  deriveTappa,
  iscrizioneDi,
  nomeTappa,
  numeroONull,
  puntiProposti,
  risultato,
  rigaTappa,
  setDelModulo,
  stagioneDi,
  ultimaTappa,
} from './campionato'
import type { CampionatoData, Iscrizione, PartitaTappa, Tappa, TappaForm } from './campionato'
import type { Partner } from './models'

const giulia: Partner = { id: 'p-giulia', name: 'Giulia', color: '#FF6B35', linkedUserId: null, shared: false }
const marta: Partner = { id: 'p-marta', name: 'Marta', color: '#00B4D8', linkedUserId: null, shared: false }

const isc = (o: Partial<Iscrizione> = {}): Iscrizione => ({ id: 'i-2627', season: '2026/27', club: 'Lido Nord Volley', gender: 'F', ...o })
const tappa = (o: Partial<Tappa> = {}): Tappa => ({
  id: 't1',
  seasonId: 'i-2627',
  kind: 'Tappa',
  category: 'Silver',
  date: '2026-11-15',
  city: 'Milano',
  organizer: '',
  partnerId: giulia.id,
  partnerOtherClub: false,
  setPoints: 15,
  placement: 3,
  teams: null,
  pairPoints: 56,
  countsForClub: true,
  clubPoints: 80,
  note: '',
  ...o,
})
const partita = (o: Partial<PartitaTappa> = {}): PartitaTappa => ({
  id: 'm1',
  stageId: 't1',
  phase: 'Pool',
  opponents: 'Conti / Gallo',
  opponentsClub: 'Riviera Sand Club',
  outcome: 'giocata',
  note: '',
  sets: [{ us: 15, them: 12 }, { us: 15, them: 13 }],
  ...o,
})

describe('stagione FIPAV (1° ottobre – 30 settembre)', () => {
  it('ottobre apre la stagione nuova, settembre chiude la vecchia', () => {
    expect(stagioneDi('2026-10-01')).toBe('2026/27')
    expect(stagioneDi('2026-11-15')).toBe('2026/27')
    expect(stagioneDi('2027-05-23')).toBe('2026/27')
    expect(stagioneDi('2026-09-30')).toBe('2025/26')
    expect(stagioneDi('2099-12-01')).toBe('2099/00')
  })
  it('una data che non si legge non ha stagione', () => {
    expect(stagioneDi('')).toBe('')
  })
  it("l'iscrizione di una stagione è l'ultima aperta (cambio di società a metà stagione)", () => {
    const data: CampionatoData = {
      iscrizioni: [isc({ id: 'a', club: 'Prima' }), isc({ id: 'b', club: 'Dopo' }), isc({ id: 'c', season: '2025/26' })],
      tappe: [],
      partite: [],
    }
    expect(iscrizioneDi(data, '2026/27')?.club).toBe('Dopo')
    expect(iscrizioneDi(data, '2024/25')).toBeUndefined()
  })
})

describe('nome della tappa', () => {
  it('tipo e categoria, poi la città', () => {
    expect(nomeTappa({ kind: 'Tappa', category: 'Silver', city: 'Milano' })).toBe('Tappa Silver · Milano')
    expect(nomeTappa({ kind: 'Finale', category: 'Gold', city: ' Bibione ' })).toBe('Finale Gold · Bibione')
    expect(nomeTappa({ kind: 'Coppa Italia', category: 'Bronze', city: '' })).toBe('Coppa Italia Bronze')
  })
  it('la Platinum è anche la sua categoria: non si ripete', () => {
    expect(nomeTappa({ kind: 'Platinum', category: 'Platinum', city: 'Albissola' })).toBe('Platinum · Albissola')
  })
})

describe('punti proposti dalle tabelle del regolamento', () => {
  it('2026/27: Silver 3° = 56 di coppia, 80 alla società', () => {
    expect(puntiProposti('2026/27', 'Silver', 3)).toEqual({ coppia: 56, societa: 80 })
  })
  it('2026/27: le Under danno alla società la scala giovanile', () => {
    expect(puntiProposti('2026/27', 'Under', 1)).toEqual({ coppia: 100, societa: 150 })
  })
  it('2025/26: Gold 5° = 68 e 50', () => {
    expect(puntiProposti('2025/26', 'Gold', 5)).toEqual({ coppia: 68, societa: 50 })
  })
  it('dove il regolamento non scrive il numero, nessuna proposta (niente numeri inventati)', () => {
    expect(puntiProposti('2026/27', 'Silver', 4).coppia).toBeNull()
    expect(puntiProposti('2026/27', 'Bronze', 1).coppia).toBeNull()
    expect(puntiProposti('2026/27', 'Gold', 9)).toEqual({ coppia: null, societa: null })
    expect(puntiProposti('2030/31', 'Gold', 1)).toEqual({ coppia: null, societa: null })
    expect(puntiProposti('2026/27', 'Gold', null)).toEqual({ coppia: null, societa: null })
  })
})

describe('esito delle partite', () => {
  it('giocata: vince chi ha più set; set e punti contano', () => {
    const r = risultato(partita({ sets: [{ us: 13, them: 15 }, { us: 15, them: 11 }, { us: 12, them: 15 }] }))
    expect(r).toMatchObject({ won: false, usS: 1, themS: 2, pf: 40, pa: 41, contaPunti: true })
  })
  it('senza set (o in parità) non si sa: fuori dal record', () => {
    expect(risultato(partita({ sets: [] })).won).toBeNull()
    expect(risultato(partita({ sets: [{ us: 15, them: 10 }, { us: 10, them: 15 }] })).won).toBeNull()
  })
  it('forfait: vinta o persa, ma set e punti restano fuori', () => {
    const b = bilancio([
      partita({ outcome: 'forfait_loro', sets: [{ us: 5, them: 3 }] }),
      partita({ outcome: 'forfait_noi', sets: [] }),
      partita(),
    ])
    expect(b).toEqual({ vinte: 2, perse: 1, setV: 2, setP: 0, pf: 30, pa: 25 })
  })
})

describe('dal modulo al database', () => {
  const form: TappaForm = {
    kind: 'Tappa', category: 'Silver', date: '2026-11-15', city: '  Milano   Due ', organizer: ' Duna Rossa ', partnerId: 'p', newPartnerName: '',
    partnerOtherClub: false, setPoints: 15, placement: 3, teams: '14', pairPoints: '56', countsForClub: true, clubPoints: 'x', note: ' ', club: '', gender: '',
  }
  it('i numeri scritti a mano: cifre o niente', () => {
    expect(numeroONull('56')).toBe(56)
    expect(numeroONull(' 7 ')).toBe(7)
    expect(numeroONull('')).toBeNull()
    expect(numeroONull('5a')).toBeNull()
    expect(numeroONull('1000', 999)).toBeNull()
  })
  it('la riga della tappa ripulisce i testi e i numeri', () => {
    expect(rigaTappa(form)).toMatchObject({ city: 'Milano Due', organizer: 'Duna Rossa', teams: 14, pair_points: 56, club_points: null, note: '' })
  })
  it('i set: solo quelli compilati, al massimo tre, numerati da 1', () => {
    expect(
      setDelModulo({ sets: [{ us: '15', them: '' }, { us: 15, them: 12 }, { us: '9', them: '15' }, { us: 15, them: 11 }, { us: 1, them: 2 }] }),
    ).toEqual([
      { set_number: 1, us: 15, them: 12 },
      { set_number: 2, us: 9, them: 15 },
      { set_number: 3, us: 15, them: 11 },
    ])
  })
})

// ---------------------------------------------------------------- pagina
const STAGIONE: CampionatoData = {
  iscrizioni: [isc({ id: 'i-2526', season: '2025/26' }), isc()],
  tappe: [
    tappa({ id: 't1', date: '2026-11-15', placement: 3, pairPoints: 56, clubPoints: 80 }),
    tappa({ id: 't2', date: '2026-11-08', city: 'Albissola', placement: 2, pairPoints: 63, clubPoints: 90 }),
    tappa({ id: 't3', date: '2026-10-25', city: 'Bologna', placement: 3, pairPoints: 56, clubPoints: 80, countsForClub: false, partnerId: marta.id }),
    tappa({ id: 't0', seasonId: 'i-2526', date: '2026-03-15', placement: 1, pairPoints: 60 }),
  ],
  partite: [
    partita({ id: 'a', stageId: 't1' }),
    partita({ id: 'b', stageId: 't1', phase: 'Semifinale', sets: [{ us: 11, them: 15 }, { us: 14, them: 16 }] }),
    partita({ id: 'c', stageId: 't2', outcome: 'forfait_loro', sets: [] }),
    partita({ id: 'd', stageId: 't0' }),
  ],
}

describe('pagina del Campionato', () => {
  it("si apre sulla stagione più recente e ne somma solo le tappe", () => {
    const v = deriveCampionato(STAGIONE, [giulia, marta])
    expect(v.scelta?.season).toBe('2026/27')
    expect(v.stagioni.map((s) => s.label)).toEqual(['2026/27', '2025/26'])
    // 56 + 63 + 56; alla società 80 + 90 (Bologna non conta per la società).
    expect(v.numeri).toEqual({ puntiCoppia: 175, puntiSocieta: 170, tappe: 3, migliore: '2°', record: '2–1', partite: 3 })
  })
  it('le tappe dalla più recente, con posto, meta e punti', () => {
    const v = deriveCampionato(STAGIONE, [giulia, marta])
    expect(v.tappe.map((r) => [r.nome, r.medaglia, r.meta, r.punti])).toEqual([
      ['Tappa Silver · Milano', '3°', '15 nov · con Giulia · 1–1', 56],
      ['Tappa Silver · Albissola', '2°', '8 nov · con Giulia · 1–0', 63],
      ['Tappa Silver · Bologna', '3°', '25 ott · con Marta', 56],
    ])
  })
  it('con chi: un compagno per riga, il più presente prima', () => {
    const v = deriveCampionato(STAGIONE, [giulia, marta])
    expect(v.compagni).toEqual([
      { id: giulia.id, nome: 'Giulia', tappe: 2, record: '2–1', punti: 119 },
      { id: marta.id, nome: 'Marta', tappe: 1, record: '0–0', punti: 56 },
    ])
  })
  it("si sceglie un'altra stagione per id", () => {
    const v = deriveCampionato(STAGIONE, [giulia], 'i-2526')
    expect(v.scelta?.season).toBe('2025/26')
    expect(v.numeri.puntiCoppia).toBe(60)
  })
  it('due società nella stessa stagione: il selettore le distingue', () => {
    const data: CampionatoData = { ...STAGIONE, iscrizioni: [...STAGIONE.iscrizioni, isc({ id: 'i-nuova', club: 'Duna Rossa BV' })] }
    expect(deriveCampionato(data, []).stagioni.map((s) => s.label)).toEqual(['2026/27 · Duna Rossa BV', '2026/27 · Lido Nord Volley', '2025/26'])
  })
  it('nessuna iscrizione: niente scelta e numeri a zero', () => {
    const v = deriveCampionato({ iscrizioni: [], tappe: [], partite: [] }, [])
    expect(v.scelta).toBeNull()
    expect(v.numeri.migliore).toBeNull()
    expect(v.finale).toBeNull()
  })
})

describe('verso la Finale', () => {
  it('2026/27: conta i tornei, ma la soglia non c’è perché il regolamento non la scrive ancora', () => {
    expect(deriveCampionato(STAGIONE, []).finale).toEqual({ dove: 'Bibione, 4–6 giugno 2027', testo: '3 tornei Silver giocati', soglia: null, fatti: 3, categoria: 'Silver' })
  })
  it('2025/26: la soglia del regolamento (3 tornei Silver)', () => {
    const f = deriveCampionato(STAGIONE, [], 'i-2526').finale
    expect(f).toMatchObject({ testo: '1 torneo Silver giocato', soglia: 3, fatti: 1 })
  })
  it('la Finale stessa non conta fra i tornei per arrivarci', () => {
    const data: CampionatoData = { iscrizioni: [isc()], tappe: [tappa({ kind: 'Finale' })], partite: [] }
    expect(deriveCampionato(data, []).finale).toBeNull()
  })
})

describe('dettaglio della tappa', () => {
  it('intestazione, tag e numeri', () => {
    const t = deriveTappa({ ...STAGIONE, tappe: [tappa({ teams: 14, organizer: 'Duna Rossa BV' })] }, [giulia], 't1')!
    expect(t.nome).toBe('Tappa Silver · Milano')
    expect(t.kicker).toBe('Tappa · Silver F · set a 15')
    expect(t.sottotitolo).toBe('Domenica 15 novembre 2026 · con Giulia')
    expect(t.tag).toEqual(['3° su 14 coppie', 'Organizza Duna Rossa BV', 'Lido Nord Volley'])
    expect(t.numeri).toEqual({ puntiCoppia: '+56', societa: '80', record: '1–1', partite: 2, set: '2–2', diff: '-1' })
  })
  it("le partite dall'ultima fase alla prima; il derby della stessa società si dice", () => {
    const data: CampionatoData = {
      ...STAGIONE,
      partite: [partita({ id: 'pool' }), partita({ id: 'derby', opponentsClub: 'lido nord volley' }), partita({ id: 'semi', phase: 'Semifinale' })],
    }
    const t = deriveTappa(data, [giulia], 't1')!
    expect(t.partite.map((p) => p.id)).toEqual(['semi', 'derby', 'pool'])
    expect(t.partite[1].dettaglio).toBe('lido nord volley · stessa società')
    expect(t.partite[0]).toMatchObject({ esitoShort: 'V', titolo: 'Semifinale · vs Conti / Gallo' })
  })
  it('in corso, senza punti e fuori dai 3 migliori della società', () => {
    const t = deriveTappa({ ...STAGIONE, tappe: [tappa({ placement: null, pairPoints: null, countsForClub: false })], partite: [] }, [], 't1')!
    expect(t.medaglia).toBe('In corso')
    expect(t.numeri).toMatchObject({ puntiCoppia: '—', societa: '—', record: '0–0', partite: 0 })
    expect(t.tag).toContain('Non conta per la società')
    expect(t.conPartite).toBe(false)
  })
  it('una tappa che non c’è è null', () => {
    expect(deriveTappa(STAGIONE, [], 'nessuna')).toBeNull()
  })
})

describe('ingressi da Tornei, Statistiche e dal ＋', () => {
  it("la card dice l'iscrizione più recente", () => {
    expect(campionatoIngresso(STAGIONE)).toEqual({ stagione: '2026/27', club: 'Lido Nord Volley', tappe: 3, punti: 175 })
    expect(campionatoIngresso({ iscrizioni: [], tappe: [], partite: [] })).toBeNull()
  })
  it('la tappa più recente fino a oggi (le future no)', () => {
    expect(ultimaTappa(STAGIONE, '2026-11-20')?.id).toBe('t1')
    expect(ultimaTappa(STAGIONE, '2026-11-10')?.id).toBe('t2')
    expect(ultimaTappa(STAGIONE, '2026-01-01')).toBeNull()
  })
})
