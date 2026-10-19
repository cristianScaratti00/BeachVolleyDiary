// ============================================================================
// I diari di fabbrica dell'anteprima (fuori dalla build, come docs/motion).
// Stanno qui e non in main.tsx perché li usano in tre:
//   - l'anteprima (`main.tsx`), con la data vera;
//   - le schermate del telefono della landing (`docs/qa/landing-shots.mjs`),
//     che fissano la data a OGGI_LANDING;
//   - i numeri della landing: `src/app/landing.dati.test.ts` passa
//     `datiDiProva(OGGI_LANDING)` dalle funzioni vere dell'app e scrive
//     `presentazione/js/generati/dati.ts` (UX §L15.2, Q-L3). Così le schermate
//     e i numeri del sito dicono la stessa cosa.
//
// «Oggi» e gli id sono iniettabili: con la stessa data e lo stesso contatore
// di id il diario è sempre identico, e il file generato non cambia a ogni giro.
// ============================================================================
import type { DiaryData, Match, Partner, Photo, Tournament, Venue } from '../../src/lib/models'

/**
 * Il giorno in cui «vive» la landing: a ottobre, perché Beach Wrapped esiste
 * solo allora (`wrappedAOttobre`). Lo stesso giorno lo fissano le schermate
 * (`docs/qa/landing-shots.mjs`): se cambia qui, cambia anche là.
 */
export const OGGI_LANDING = '2026-10-17'

export const oggiVero = () => new Date().toISOString().slice(0, 10)
const uuidVero = () => crypto.randomUUID()

/** Il giorno `n` giorni dopo (o prima) di `oggi`, in ISO. */
const giorniDa = (oggi: string, n: number) => new Date(Date.parse(oggi) + n * 86400000).toISOString().slice(0, 10)

const swatch = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
const foto = (a: string, b: string) =>
  swatch(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="300" cy="80" r="46" fill="#FFE9DB"/></svg>`)

export function datiDiProva(oggi = oggiVero(), uuid: () => string = uuidVero): DiaryData {
  const giorni = (n: number) => giorniDa(oggi, n)
  const pGiulia: Partner = { id: uuid(), name: 'Giulia', color: '#FF6B35', linkedUserId: null, shared: false }
  const pMarco: Partner = { id: uuid(), name: 'Marco', color: '#00B4D8', linkedUserId: uuid(), shared: false }
  const pAltro: Partner = { id: uuid(), name: 'Sara (condivisa)', color: '#1B2A4A', linkedUserId: null, shared: true }
  const vRimini: Venue = { id: uuid(), name: 'Bagno 26', city: 'Rimini', lat: 44.0678, lng: 12.5695, surface: 'Sabbia outdoor', shared: false }
  const vRiccione: Venue = { id: uuid(), name: 'Beach Arena', city: 'Riccione', lat: null, lng: null, surface: 'Sabbia outdoor', shared: false }
  const t = (o: Partial<Tournament>): Tournament => ({
    id: uuid(), name: 'Torneo', date: oggi, city: 'Rimini', venueId: null, category: 'Open', format: '2vs2',
    surface: 'Sabbia outdoor', placement: 'Gironi', bracket: null, color: '#FF6B35', emoji: '🏖️', partnerId: pGiulia.id, shared: false, ...o,
  })
  const tornei = [
    t({ name: 'Rimini Open', date: oggi, venueId: vRimini.id, placement: 'In corso', category: 'Open' }),
    t({ name: 'Riccione Summer Cup', date: giorni(12), venueId: vRiccione.id, city: 'Riccione', placement: 'In corso', partnerId: pMarco.id }),
    t({ name: 'Cervia Beach Party', date: giorni(-9), city: 'Cervia', placement: '1° 🏆', category: 'Amatoriale', bracket: 'Gold' }),
    t({ name: 'Cesenatico 3vs3', date: giorni(-30), city: 'Cesenatico', placement: '3°', format: '3vs3', partnerId: pMarco.id }),
    t({ name: 'Ravenna King', date: giorni(-60), city: 'Ravenna', placement: 'Quarti', category: 'King', partnerId: null }),
    t({ name: 'Bellaria Night', date: giorni(-300), city: 'Bellaria Igea Marina', placement: '2°', category: 'Serie' }),
    t({ name: 'Torneo di Sara', date: giorni(-20), city: 'Milano Marittima', placement: 'Ottavi', shared: true, partnerId: null }),
  ]
  const m = (tid: string, opp: string, phase: Match['phase'], sets: [number, number][]): Match => ({
    id: uuid(), tournamentId: tid, partnerId: tornei.find((x) => x.id === tid)?.partnerId ?? null, opponents: opp, phase, note: '', sets: sets.map(([us, them]) => ({ us, them })),
  })
  const partite = [
    m(tornei[0].id, 'Bianchi / Verdi', 'Girone', [[21, 17], [21, 19]]),
    m(tornei[0].id, 'Rossi / Neri', 'Girone', [[18, 21], [21, 23]]),
    m(tornei[2].id, 'Conti / Gallo', 'Finale', [[21, 15], [21, 18]]),
    m(tornei[2].id, 'Ferri / Riva', 'Semifinale', [[21, 19], [17, 21], [15, 12]]),
    m(tornei[3].id, 'Sala / Moro', 'Quarti', [[21, 16], [21, 14]]),
    m(tornei[4].id, 'Testa / Villa', 'Ottavi', [[19, 21], [20, 22]]),
    m(tornei[5].id, 'Galli / Fabbri', 'Finale', [[18, 21], [21, 19], [13, 15]]),
    m(tornei[6].id, 'Mori / Bassi', 'Girone', [[21, 12], [21, 10]]),
  ]
  const foto3: Photo[] = [
    { id: uuid(), tournamentId: tornei[2].id, color: '#FF6B35', caption: 'La finale', url: foto('#F7C59F', '#FF8657') },
    { id: uuid(), tournamentId: tornei[2].id, color: '#00B4D8', caption: '', url: foto('#AAD3DF', '#1B2A4A') },
    { id: uuid(), tournamentId: tornei[2].id, color: '#FFD23F', caption: 'Vecchio segnaposto', url: null },
  ]
  return { tournaments: tornei, matches: partite, partners: [pGiulia, pMarco, pAltro], photos: foto3, venues: [vRimini, vRiccione] }
}

// ?estremo: i dati che rompono i layout. Nomi lunghissimi e parole senza
// spazi, stringhe vuote, emoji, numeri enormi (150 partite, set ai vantaggi
// infiniti), 40 tornei per le liste lunghe. Serve a cercare a occhio testo che
// trabocca, ellissi che mangiano l'informazione e righe che non vanno a capo.
export function datiEstremi(oggi = oggiVero(), uuid: () => string = uuidVero): DiaryData {
  const giorni = (n: number) => giorniDa(oggi, n)
  const lungo = 'Maria Antonietta Benedetta Dell’Acqua-Fontanarossa'
  const p1: Partner = { id: uuid(), name: lungo, color: '#FF6B35', linkedUserId: uuid(), shared: false }
  const p2: Partner = { id: uuid(), name: 'Superlunghissimonomesenzaspazi', color: '#00B4D8', linkedUserId: null, shared: false }
  const p3: Partner = { id: uuid(), name: '🏐🔥', color: '#FFD23F', linkedUserId: null, shared: true }
  const v1: Venue = { id: uuid(), name: 'Stabilimento Balneare Bagno Novantanove e Mezzo «Da Gigi»', city: 'San Giovanni in Marignano', lat: 43.94, lng: 12.71, surface: 'Sabbia outdoor', shared: false }
  const v2: Venue = { id: uuid(), name: '', city: '', lat: null, lng: null, surface: null, shared: false }
  const base = (o: Partial<Tournament>): Tournament => ({
    id: uuid(), name: 'Torneo', date: oggi, city: 'Castiglione della Pescaia', venueId: null, category: 'Open', format: '2vs2',
    surface: 'Sabbia outdoor', placement: 'Gironi', bracket: null, color: '#FF6B35', emoji: '🏖️', partnerId: p1.id, shared: false, ...o,
  })
  const posti = ['1° 🏆', '2°', '3°', 'Semifinale', 'Quarti', 'Ottavi', 'Gironi'] as const
  const tornei: Tournament[] = [
    base({ name: 'Campionato Regionale Open Misto di Beach Volley della Riviera Romagnola — Memorial Giovanni Battista Ferrari', venueId: v1.id, city: v1.city, placement: 'In corso', bracket: 'Girone unico' }),
    base({ name: 'Precisazionedellaprecisazionesenzaspazi2026', date: giorni(5), placement: 'In corso', partnerId: p2.id, city: '' }),
    base({ name: '', date: giorni(-3), venueId: v2.id, city: '', placement: '1° 🏆', partnerId: null }),
    base({ name: '🏐🏐🏐 Beach 🔥 Party 🎉', date: giorni(-7), placement: '2°', partnerId: p3.id, shared: true }),
  ]
  for (let i = 0; i < 40; i++) {
    tornei.push(base({ name: `Tappa ${i + 1} del circuito estivo`, date: giorni(-10 - i * 9), city: i % 3 ? 'Rimini' : 'Lido di Spina', placement: posti[i % posti.length], partnerId: [p1.id, p2.id, null][i % 3] }))
  }
  const partite: Match[] = []
  for (let i = 0; i < 150; i++) {
    const t = tornei[i % 3 === 0 ? 0 : 4 + (i % 40)]
    const vinta = i % 4 !== 0
    partite.push({
      id: uuid(), tournamentId: t.id, partnerId: t.partnerId,
      opponents: i % 7 === 0 ? '' : i % 5 === 0 ? 'Associazione Sportiva Dilettantistica Bianchi-Verdi / Rossi-Neri' : `Coppia ${i}`,
      phase: (['Girone', 'Ottavi', 'Quarti', 'Semifinale', 'Finale'] as const)[i % 5], note: '',
      sets: i % 9 === 0 ? [{ us: 38, them: 36 }, { us: 29, them: 31 }, { us: 21, them: 19 }] : [{ us: vinta ? 21 : 15, them: vinta ? 12 : 21 }, { us: vinta ? 21 : 19, them: vinta ? 19 : 21 }],
    })
  }
  const foto3: Photo[] = [
    { id: uuid(), tournamentId: tornei[0].id, color: '#FF6B35', caption: 'Una didascalia che continua e continua e non accenna a finire perché qualcuno ha incollato un intero racconto della giornata', url: foto('#F7C59F', '#FF8657') },
    { id: uuid(), tournamentId: tornei[0].id, color: '#00B4D8', caption: '', url: null },
  ]
  return { tournaments: tornei, matches: partite, partners: [p1, p2, p3], photos: foto3, venues: [v1, v2] }
}
