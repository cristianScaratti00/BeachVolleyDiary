// ============================================================================
// Il palleggio della scena dell'accesso: due giocatori, uno per lato della
// rete, che si passano il pallone senza fine (il disegno del redesign).
// Qui solo i numeri, puri: la posa di un giocatore a un istante e il volo
// del pallone. Login.scena.tsx li scrive nell'SVG a ogni fotogramma, senza
// passare da React.
//
// Un giocatore è un omino a tratti, con i piedi in (0, 0) e lo sguardo verso
// +x. Due colpi: il palleggio (mani sopra la testa) e il bagher (braccia
// tese davanti, ginocchia piegate). Chi colpisce spinge e poi si rilassa;
// chi riceve si mette in posizione mentre il pallone arriva. Ogni volo dura
// TEMPO_MS; il colpo di chi riceve e l'altezza del volo si scelgono a caso a
// ogni tocco. Le misure sono quelle del disegno (viewBox 390×844).
// ============================================================================

export type Colpo = 'palleggio' | 'bagher'
type P2 = readonly [number, number]

/** Un volo del pallone, da un giocatore all'altro. */
export const TEMPO_MS = 1350

// c: quanto si abbassano le anche; l: quanto si piega in avanti il busto
// (radianti); e, h: gomito e mani rispetto alla spalla.
const POSE = {
  riposo: { c: 5, l: 0.14, e: [5, 14], h: [14, 21] },
  palleggio: { c: 9, l: 0.04, e: [13, -11], h: [11, -28] },
  bagher: { c: 17, l: 0.5, e: [14, 9], h: [28, 13] },
} as const

const COSCIA = 23.5 // coscia e stinco sono lunghi uguali
const BUSTO = 31
const COLLO = 13
const PIEDE_DIETRO: P2 = [-9, 0]
const PIEDE_AVANTI: P2 = [11, 0]
// Il braccio lontano è lo stesso braccio, un po' indietro e più in basso.
const LONTANO: P2 = [-2.5, 1.5]

/** I piedi dei due giocatori sulla sabbia, e da che parte guardano. */
const PIEDI_X = [84, 306] as const
const VERSO = [1, -1] as const
const SUOLO = 336

export interface Posa {
  gambaDietro: string
  gambaAvanti: string
  busto: string
  braccioVicino: string
  braccioLontano: string
  /** La coda di cavallo (giocatrice a sinistra). */
  coda: string
  /** La visiera del cappellino (giocatore a destra). */
  visiera: string
  testa: P2
  /** Dove il pallone tocca le mani o le braccia. */
  pallone: P2
}

const n = (v: number) => v.toFixed(1)
const pt = (p: P2) => `${n(p[0])} ${n(p[1])}`
const piu = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]]

/**
 * La posa di un giocatore: `w` va dal riposo (0) al colpo (1), `spinta` è il
 * gesto che accompagna il pallone subito dopo il tocco.
 */
export function posa(colpo: Colpo, w: number, spinta: number): Posa {
  const A = POSE.riposo
  const B = POSE[colpo]
  const L = (a: number, b: number) => a + (b - a) * w
  let c = L(A.c, B.c)
  let l = L(A.l, B.l)
  const e = [L(A.e[0], B.e[0]), L(A.e[1], B.e[1])] as [number, number]
  const h = [L(A.h[0], B.h[0]), L(A.h[1], B.h[1])] as [number, number]
  if (colpo === 'palleggio') {
    c -= spinta * 11
    h[1] -= spinta * 8
    e[1] -= spinta * 7
  } else {
    c -= spinta * 10
    l -= spinta * 0.25
    h[1] -= spinta * 9
    e[1] -= spinta * 4
  }

  const anca: P2 = [0, -44 + c]
  const spalla: P2 = [anca[0] + Math.sin(l) * BUSTO, anca[1] - Math.cos(l) * BUSTO]
  const testa: P2 = [spalla[0] + Math.sin(l) * COLLO + 1.5, spalla[1] - Math.cos(l) * COLLO]
  // Il ginocchio piega sempre in avanti.
  const ginocchio = (piede: P2): P2 => {
    const dx = piede[0] - anca[0]
    const dy = piede[1] - anca[1]
    const d = Math.hypot(dx, dy)
    const k = d >= 2 * COSCIA ? 0 : Math.sqrt(COSCIA * COSCIA - (d * d) / 4)
    let px = -dy / d
    let py = dx / d
    if (px < 0) {
      px = -px
      py = -py
    }
    return [anca[0] + dx / 2 + px * k, anca[1] + dy / 2 + py * k]
  }
  const gomito = piu(spalla, e)
  const mani = piu(spalla, h)
  const pallone: P2 =
    colpo === 'palleggio'
      ? [mani[0] + 2, mani[1] - 10]
      : [gomito[0] + (mani[0] - gomito[0]) * 0.6, gomito[1] + (mani[1] - gomito[1]) * 0.6 - 9.5]
  const [tx, ty] = testa

  return {
    gambaDietro: `M${pt(anca)} L${pt(ginocchio(PIEDE_DIETRO))} L${pt(PIEDE_DIETRO)} l4 0`,
    gambaAvanti: `M${pt(anca)} L${pt(ginocchio(PIEDE_AVANTI))} L${pt(PIEDE_AVANTI)} l5 0`,
    busto: `M${pt(anca)} L${pt(spalla)}`,
    braccioVicino: `M${pt(spalla)} L${pt(gomito)} L${pt(mani)}`,
    braccioLontano: `M${pt(piu(spalla, LONTANO))} L${pt(piu(gomito, LONTANO))} L${pt(piu(mani, LONTANO))}`,
    coda: `M${pt([tx - 6, ty - 3])} Q${pt([tx - 15, ty - 1 - l * 6])} ${pt([tx - 14, ty + 8])}`,
    visiera: `M${pt([tx - 7, ty - 3])} Q${pt([tx, ty - 11])} ${pt([tx + 6, ty - 4])} L${pt([tx + 13, ty - 2])}`,
    testa,
    pallone,
  }
}

// Il punto di contatto a colpo pieno: è da lì che il pallone parte e arriva.
const CONTATTO = { palleggio: posa('palleggio', 1, 0).pallone, bagher: posa('bagher', 1, 0).pallone }

/** Lo stato del palleggio: chi colpisce, con che colpo, quando, quanto in alto. */
export interface Scambio {
  chi: 0 | 1
  /** Il colpo di chi tocca adesso. */
  a: Colpo
  /** Il colpo con cui risponderà l'altro. */
  b: Colpo
  t0: number
  /** L'altezza massima del volo (y nel disegno: più è piccola, più è alto). */
  apice: number
}

/**
 * Il fotogramma fermo: la giocatrice ha appena alzato il pallone, l'altro
 * aspetta. È il primo disegno e quello che resta con reduced-motion; il
 * palleggio vivo riparte esattamente da lì.
 */
export const FERMO_U = 0.2

export function primoScambio(ora: number): Scambio {
  return { chi: 0, a: 'palleggio', b: 'bagher', t0: ora - FERMO_U * TEMPO_MS, apice: 76 }
}

/**
 * Lo scambio all'istante `ora`: a ogni volo finito tocca all'altro, con un
 * colpo e un'altezza nuovi. Dopo una lunga pausa (la scheda nascosta)
 * ricomincia da capo invece di recuperare i voli persi.
 */
export function avanza(s: Scambio | null, ora: number, caso: () => number = Math.random): Scambio {
  if (!s || ora - s.t0 > 20 * TEMPO_MS) return primoScambio(ora)
  if (ora - s.t0 < TEMPO_MS) return s
  const x = { ...s }
  while (ora - x.t0 >= TEMPO_MS) {
    x.t0 += TEMPO_MS
    x.chi = x.chi === 0 ? 1 : 0
    x.a = x.b
    x.b = caso() < 0.5 ? 'palleggio' : 'bagher'
    x.apice = 62 + caso() * 38
  }
  return x
}

export interface Fotogramma {
  giocatori: readonly [Posa, Posa]
  pallone: { x: number; y: number; giro: number }
  /** L'ombra del pallone sulla sabbia: più è basso, più è grande e scura. */
  ombra: { x: number; scala: number; opacita: number }
}

const tra01 = (x: number) => Math.max(0, Math.min(1, x))
const liscia = (x: number) => {
  const t = tra01(x)
  return t * t * (3 - 2 * t)
}

export function fotogramma(s: Scambio, ora: number): Fotogramma {
  const u = (ora - s.t0) / TEMPO_MS
  // Chi colpisce: spinge nel primo 12% del volo, poi torna a riposo.
  let colpo = 1
  let spinta = 0
  if (u < 0.12) spinta = liscia(u / 0.12)
  else {
    colpo = 1 - liscia((u - 0.12) / 0.45)
    spinta = colpo
  }
  // Chi riceve: si prepara nella seconda metà del volo.
  const pronto = liscia((u - 0.4) / 0.55)
  const H = s.chi
  const R = H === 0 ? 1 : 0
  const g: Posa[] = []
  g[H] = posa(s.a, colpo, spinta)
  g[R] = posa(s.b, pronto, 0)

  const mondo = (lato: 0 | 1, c: Colpo): P2 => [PIEDI_X[lato] + VERSO[lato] * CONTATTO[c][0], SUOLO + CONTATTO[c][1]]
  const p0 = mondo(H, s.a)
  const p1 = mondo(R, s.b)
  // Una parabola da mano a mano che passa per l'apice a metà volo.
  const hh = (p0[1] + p1[1]) / 2 - s.apice
  const x = p0[0] + (p1[0] - p0[0]) * u
  const y = p0[1] + (p1[1] - p0[1]) * u - 4 * hh * u * (1 - u)
  const k = tra01((y - 60) / 230)
  // Il pallone gira nel verso del volo, contando dal tocco: il fotogramma
  // fermo e il primo del palleggio vivo sono lo stesso disegno.
  const giro = ((ora - s.t0) * 0.45 * (H ? -1 : 1)) % 360
  return {
    giocatori: [g[0], g[1]],
    pallone: { x, y, giro },
    ombra: { x, scala: 0.35 + 0.65 * k, opacita: 0.18 + 0.35 * k },
  }
}

export const FERMO: Fotogramma = fotogramma(primoScambio(0), 0)
