// ============================================================================
// I numeri della landing (/presentazione) li fa l'app (UX §L15.2, Q-L3).
//
// Il diario di fabbrica dell'anteprima (`docs/preview/dati.ts`), alla data
// in cui vive la landing (`OGGI_LANDING`, a ottobre), passa dalle funzioni
// VERE dell'app: le stesse della Home, della Mappa, dei consigli di Pallo e di
// Beach Wrapped. Il risultato si scrive in `presentazione/js/generati/dati.ts`,
// che la landing legge al momento della build (i testi nell'HTML) e a pagina
// viva (le battute della guida, la chat). Le schermate del telefono vengono
// dallo stesso diario alla stessa data: numeri e schermate dicono la stessa
// cosa.
//
// Se una regola dell'app cambia (come si conta una serie, che cosa dice
// Pallo), questo test fallisce finché non si rigenera il file:
//   npx vitest run src/app/landing.dati.test.ts -u
// ============================================================================
import { describe, expect, it } from 'vitest'
import { OGGI_LANDING, datiDiProva } from '../../docs/preview/dati'
import { deriveDashboard, deriveWrapped, makeWrappedRange } from '../lib/derive'
import { deriveMappa } from '../lib/derive.mappa'
import type { MappaPin, MappaTier } from '../lib/derive.mappa'
import { MONTHS_FULL } from '../lib/theme'
import { placementText } from '../components/ui/Badge'
import { umoreSlide } from '../components/wrapped/slide'
import { deriveConsigli, deriveHome, wrappedAOttobre } from './selectors'
import { INTRO, bozza, domandaDi, riepilogo, scelte } from '../../presentazione/js/chat.passi'
import type { NomiChat, PassoChat } from '../../presentazione/js/chat.passi'

// Relativo a questo file, come vuole `toMatchFileSnapshot`.
const FILE = '../../presentazione/js/generati/dati.ts'

// Lo stesso diario a ogni giro: la data è fissa, gli id sono un contatore.
let n = 0
const data = datiDiProva(OGGI_LANDING, () => `id-${++n}`)
const NOME = 'Marta'

// ------------------------------------------------------------------ mappa
// La mappa della landing è un'illustrazione della costa romagnola (ART
// §L10.7): un riquadro 356 × 318, come la Mappa dell'app, in proiezione
// equirettangolare. 0.93° di longitudine e 0.6° di latitudine danno la stessa
// proporzione del riquadro a 44° di latitudine (cos 44° ≈ 0.72).
const BOX = { w: 356, h: 318, lng0: 12.0, lng1: 12.93, lat0: 44.52, lat1: 43.92 }
const x = (lng: number) => Math.round(((lng - BOX.lng0) / (BOX.lng1 - BOX.lng0)) * BOX.w * 10) / 10
const y = (lat: number) => Math.round(((BOX.lat0 - lat) / (BOX.lat0 - BOX.lat1)) * BOX.h * 10) / 10

// La linea di costa, da Marina di Ravenna a Gabicce: la terra è a sinistra.
// Punti presi dalla carta, semplificati (niente porti, niente foci).
const COSTA: [number, number][] = [
  [44.52, 12.29], [44.4, 12.31], [44.32, 12.345], [44.26, 12.37], [44.2, 12.405],
  [44.14, 12.47], [44.06, 12.585], [44.0, 12.665], [43.96, 12.75], [43.92, 12.82],
]
function costa(): string {
  const p = COSTA.map(([la, lo]) => `${x(lo)} ${y(la)}`)
  return `M0 0 H${x(COSTA[0][1])} L${p.slice(1).join(' L')} V${BOX.h} H0Z`
}

/** Quanto deve stare un pin dall'altro perché alone e filo non si tocchino. */
const DISTANZA_MIN = 24

/** I pin sul riquadro, da nord a sud, staccati lungo la costa quando si toccano. */
function pin(pins: MappaPin[]) {
  const posati = pins
    .map((p) => ({
      citta: p.city,
      esito: p.tier,
      piazzamento: placementText(p.best),
      // Il raggio della lib × 0.72, come la mappa vera (ART §L4.6).
      r: Math.round(p.radius * 0.72 * 10) / 10,
      x: x(p.lng),
      y: y(p.lat),
    }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < posati.length; i++) {
    const a = posati[i - 1]
    const b = posati[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (d < DISTANZA_MIN) {
      // Si scosta il più a sud, in giù: la costa scende verso sud-est.
      b.y = Math.round((a.y + Math.sqrt(Math.max(0, DISTANZA_MIN ** 2 - (b.x - a.x) ** 2))) * 10) / 10
    }
  }
  return posati
}

const ESITO: Record<MappaTier, string> = { vinto: 'vinta', podio: 'podio', giocato: 'giocata' }

// ------------------------------------------------------------------ chat
// La conversazione senza JavaScript (UX §L6.3): il copione scritto per
// intero, scegliendo sempre la prima risposta rapida, come una trascrizione.
function trascrizione(nomi: NomiChat) {
  const righe: { chi: 'pallo' | 'tu'; testo: string }[] = INTRO.map((testo) => ({ chi: 'pallo' as const, testo }))
  let passo: PassoChat = 'name'
  let d = bozza(nomi)
  let riassunto: [string, string][] = []
  for (let giri = 0; passo !== 'fine' && giri < 10; giri++) {
    const [prima] = scelte(passo, nomi)
    righe.push({ chi: 'tu', testo: prima.testo })
    d = prima.applica(d)
    passo = prima.prossimo
    righe.push({ chi: 'pallo', testo: domandaDi(passo, d, nomi) })
    if (passo === 'recap') riassunto = riepilogo(d, nomi)
  }
  return { righe, riepilogo: riassunto }
}

// ---------------------------------------------------------- composizione
function genera() {
  const home = deriveHome(data, { nome: NOME, today: OGGI_LANDING, wrapped: wrappedAOttobre(OGGI_LANDING) })
  const s = deriveDashboard(data, 'all', 'Sempre').s
  const consigli = deriveConsigli(data, { today: OGGI_LANDING, wrapped: wrappedAOttobre(OGGI_LANDING) })
  const consiglio = (prefisso: string) => consigli.find((c) => c.id.startsWith(prefisso))?.testo ?? null
  const mappa = deriveMappa(data, 'Sempre', OGGI_LANDING)
  const wrapped = deriveWrapped(data, makeWrappedRange(`${OGGI_LANDING.slice(0, 4)}-01-01`, `${OGGI_LANDING.slice(0, 4)}-12-31`))
  const slide = (k: string) => wrapped.slides.find((x) => x.kind === k)
  const compagni = s.partnerRows.slice().sort((a, b) => b.won - a.won)
  const tornei = data.tournaments.filter((t) => !t.shared).slice().sort((a, b) => (a.date < b.date ? 1 : -1))
  const passati = tornei.filter((t) => t.date <= OGGI_LANDING)
  const migliore = mappa.migliore
  const nomi: NomiChat = {
    tornei: passati.slice(0, 2).map((t) => t.name),
    compagni: data.partners.filter((p) => !p.shared).slice(0, 2).map((p) => p.name),
    oggi: OGGI_LANDING,
  }

  return {
    oggi: OGGI_LANDING,
    nome: NOME,
    /** Che cosa dice la Home del telefono (capitolo 1): la guida non lo ripete (UX §L12.4). */
    home: { frase: home.frase, consiglio: home.consigli[0]?.testo ?? '' },
    /** Le card della Home: «Partite vinte», «Tornei vinti», «Serie record». */
    numeri: {
      winPct: s.winPct,
      diff: s.diffStr,
      vinte: s.won,
      perse: s.lost,
      giocate: s.played,
      torneiVinti: s.tWon,
      tornei: s.tPlayed,
      podi: s.podi,
      serie: s.streak,
    },
    /** Le battute della guida che vengono dal diario (UX §L12.4), coi consigli veri di Pallo. */
    guida: {
      numeri: consiglio('serie:') ?? consiglio('record:') ?? `${s.streak} vittorie di fila: è il tuo record.`,
      mappa:
        consiglio('posto:') ??
        (migliore ? `Il tuo posto magico? ${migliore.city}: ${migliore.tier === 'vinto' ? 'lì hai vinto' : migliore.tier === 'podio' ? 'lì hai fatto podio' : 'lì hai giocato'}.` : 'Ogni città dove giochi diventa un pin.'),
      storia: consiglio('storia:') ?? 'Ogni torneo può diventare una storia.',
      compagno: compagni[0] && compagni[0].won > 0
        ? `Con ${compagni[0].name} avete vinto ${compagni[0].won} partite. Si vede che vi intendete.`
        : 'Trova con chi giochi meglio.',
    },
    /** Il mese che apre il Diario (l'alt della schermata del capitolo 3). */
    diario: { mese: MONTHS_FULL[Number((passati[0]?.date ?? OGGI_LANDING).slice(5, 7)) - 1] },
    mappa: {
      w: BOX.w,
      h: BOX.h,
      costa: costa(),
      citta: mappa.citta,
      legenda: Object.fromEntries(mappa.legenda.map((l) => [ESITO[l.tier], l.count])),
      pin: pin(mappa.pins).map((p) => ({ ...p, esito: ESITO[p.esito] })),
    },
    /** Tre slide di Beach Wrapped, nell'ordine e coi colori dell'app (arancio → inchiostro → sabbia). */
    wrapped: {
      anno: OGGI_LANDING.slice(0, 4),
      slide: ['wins', 'streak', 'partner']
        .map(slide)
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((x) => ({ tipo: x.kind, occhiello: x.eyebrow, titolo: x.headline, sotto: x.title, didascalia: x.caption, umore: umoreSlide(x.kind) })),
    },
    /** Le risposte rapide della chat: i nomi del diario (UX §L12.5). */
    chat: { ...nomi, trascrizione: trascrizione(nomi) },
  }
}

const dati = genera()

describe('i numeri della landing vengono dal diario di fabbrica', () => {
  it('ha tutto quello che la pagina scrive', () => {
    expect(dati.numeri.giocate).toBeGreaterThan(0)
    expect(dati.mappa.pin.length).toBeGreaterThan(0)
    // Al più 8 pin cadono uno alla volta (MOTION.md §L5.11): oltre, la mappa è un'altra.
    expect(dati.mappa.pin.length).toBeLessThanOrEqual(8)
    expect(dati.wrapped.slide.map((s) => s.tipo)).toEqual(['wins', 'streak', 'partner'])
    expect(dati.chat.tornei).toHaveLength(2)
    expect(dati.chat.compagni).toHaveLength(2)
    // La trascrizione arriva fino in fondo, riepilogo compreso.
    expect(dati.chat.trascrizione.righe[dati.chat.trascrizione.righe.length - 1]?.testo).toBe("Fatto. Nell'app adesso sarebbe nel tuo diario.")
    expect(dati.chat.trascrizione.riepilogo.length).toBeGreaterThan(0)
  })

  it('i pin stanno nel riquadro e non si toccano', () => {
    for (const p of dati.mappa.pin) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(dati.mappa.w)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(dati.mappa.h)
    }
    const ps = dati.mappa.pin
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        expect(Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y)).toBeGreaterThanOrEqual(DISTANZA_MIN - 0.2)
      }
    }
  })

  it('la guida non ripete il consiglio che la Home del telefono mostra già', () => {
    expect(Object.values(dati.guida)).not.toContain(dati.home.consiglio)
  })

  it('il file generato è aggiornato', async () => {
    const testo =
      '// ============================================================================\n' +
      '// GENERATO da src/app/landing.dati.test.ts: non modificare a mano.\n' +
      '// Il diario di fabbrica dell\'anteprima (docs/preview/dati.ts) alla data\n' +
      '// OGGI_LANDING, passato dalle funzioni vere dell\'app. Per rigenerarlo:\n' +
      '//   npx vitest run src/app/landing.dati.test.ts -u\n' +
      '// ============================================================================\n' +
      `export const DATI = ${JSON.stringify(dati, null, 2)} as const\n\n` +
      'export type Dati = typeof DATI\n'
    await expect(testo).toMatchFileSnapshot(FILE)
  })
})
