// ============================================================================
// Il contratto dei token della landing (ART_DIRECTION.md, Parte L «Controluce»).
//
// Come tokens.test.ts: legge i fogli COME TESTO e ricalcola ogni rapporto che
// la Parte L dichiara. Il foglio della landing (presentazione/styles/tokens.css)
// si somma a quello dell'app: dove non ridefinisce un nome, vale l'app.
//
// I casi peggiori della landing non sono quelli dell'app, ed è per questo che
// questo file esiste:
//   - il testo dell'hero sta sopra una scena col sole e un pallone quasi
//     bianchi, non sopra un fondo piatto;
//   - sotto la capsula di vetro passano numeri da 112px (la demo live), e sui
//     fondi scuri slide e numeri bianchi;
//   - le slide di Wrapped sono le stesse dei PNG, e non devono divergere.
//
// Le COPERTURE qui sotto sono una misura, non un calcolo: in Chrome, un numero
// d'inchiostro disegnato su bianco e sfocato con lo stesso `blur(10px)` del
// vetro (canvas `filter`), letto nel pixel più scuro. 1 = inchiostro pieno.
// ============================================================================
import { describe, it, expect } from 'vitest'
import appCss from './tokens.css?raw'
import materialsCss from './materials.css?raw'
import landingCss from '../../presentazione/styles/tokens.css?raw'
import { contrast, over, parseColor, AA_TEXT, AA_NON_TEXT } from '../test/wcag'
import { LIT } from '../lib/theme'
import { PALETTES } from '../components/wrapped/palette'

const WHITE = '#FFFFFF'

// ---------------------------------------------------------------- parsing
const senzaCommenti = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Corpo del primo blocco aperto da `selector {` dentro `css`. */
function blocco(css: string, selector: string): string {
  const src = senzaCommenti(css)
  const start = src.indexOf(selector + ' {')
  if (start < 0) throw new Error(`Blocco non trovato: ${selector}`)
  let i = src.indexOf('{', start) + 1
  let depth = 1
  const from = i
  while (depth > 0 && i < src.length) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') depth--
    i++
  }
  return src.slice(from, i - 1)
}

/** Le dichiarazioni `--nome: valore;` di un blocco (anche su più righe). */
function dichiarazioni(body: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].replace(/\s+/g, ' ').trim())
  return out
}

const APP = dichiarazioni(blocco(appCss, ':root'))
const LANDING = dichiarazioni(blocco(landingCss, ':root'))
const SCURO = dichiarazioni(blocco(landingCss, '[data-surface="dark"]'))
// La landing si somma all'app: chi non è ridefinito vale com'è nell'app.
const TUTTI = new Map([...APP, ...LANDING])

function risolvi(theme: Map<string, string>, name: string, seen: string[] = []): string {
  const v = theme.get(name)
  if (v === undefined) throw new Error(`Token mancante: --${name}`)
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (!ref) return v
  if (seen.includes(name)) throw new Error(`Riferimento circolare: --${name}`)
  return risolvi(theme, ref[1], [...seen, name])
}
const T = (name: string) => risolvi(TUTTI, name)
/** Un ruolo sul fondo scuro: prima il blocco scuro, poi il resto. */
const S = (name: string) => risolvi(new Map([...TUTTI, ...SCURO]), name)

/** `color` che copre `amount` (0–1) di `bg`: un numero sfocato visto da sotto. */
const copre = (color: string, bg: string, amount: number) => {
  const { rgb } = parseColor(color)
  return over(`rgb(${rgb.join(' ')} / ${amount})`, bg)
}
/** `--surface-brand` steso al `pct` per cento (il velo dell'hero). */
const velo = (pct: number, sotto: string) => copre(T('surface-brand'), sotto, pct / 100)

// I pixel più chiari della scena del Login (Login.scena.tsx): il pallone, il
// nucleo del sole, il riflesso sull'acqua, il fondo del cielo. Il testo
// dell'hero deve reggere su tutti, a qualunque altezza vada a capo.
const SCENA_CHIARA = {
  pallone: '#FFF7EE',
  sole: '#FFE1B8',
  riflesso: '#FFC48A',
  cielo: '#FFB46A',
}

// Misurate in Chrome (vedi l'intestazione): copertura del pixel più scuro.
const COPERTURA = {
  numeroLive: 0.796, // 112px a peso 800: il numero della demo Partita live
  titoloSezione: 0.655, // 60px a peso 800: il titolo di sezione più grande
  manifesto160: 0.937, // 160px a peso 900: il numero da manifesto su desktop
  manifesto128: 0.875, // 128px a peso 900: il numero da manifesto da 600px
  manifesto96: 0.784, // 96px a peso 900: il numero da manifesto sul telefono
}

// ============================================================================
describe('landing — il foglio aggiunge, non cambia', () => {
  it('ridefinisce un solo nome dell\'app sul :root, ed è il carattere', () => {
    const comuni = [...LANDING.keys()].filter((k) => APP.has(k))
    expect(comuni).toEqual(['font-ui'])
    // Lo stesso Geist dell'app, con la riserva metrica prima del sistema.
    expect(T('font-ui').startsWith('"Geist Variable", "Geist", "Geist Fallback"')).toBe(true)
    expect(APP.get('font-ui')!.startsWith('"Geist Variable", "Geist",')).toBe(true)
  })

  it('«Ferma le animazioni» vale quanto prefers-reduced-motion', () => {
    const fermo = dichiarazioni(blocco(landingCss, ':root[data-movimento="fermo"]'))
    const ridotto = dichiarazioni(blocco(blocco(appCss, '@media (prefers-reduced-motion: reduce)'), ':root'))
    expect([...fermo]).toEqual([...ridotto])
  })

  it('niente sfocatura, niente tema di sistema, niente stile fuori dai livelli', () => {
    const src = senzaCommenti(landingCss)
    expect(src).not.toMatch(/backdrop-filter/)
    expect(src).not.toMatch(/prefers-color-scheme/)
    // Tutto il foglio sta dentro `@layer tokens { … }`.
    expect(src.trim().startsWith('@layer tokens {')).toBe(true)
    expect(src.trim().endsWith('}')).toBe(true)
  })

  it('i colori letterali stanno solo nei token che li dichiarano come tali', () => {
    // Mappa (OSM), slide (palette.ts), la luce del finale (la scena), le
    // ombre e i fili sul buio. Ogni altro colore è un riferimento all'app.
    const ammessi = /^(map-|slide-|sole-|riflesso|horizon|lente-|rule)/
    for (const [k, v] of [...LANDING, ...SCURO]) {
      if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(v)) expect(k, `--${k}: ${v}`).toMatch(ammessi)
    }
  })
})

// ============================================================================
describe('landing — la riserva metrica di Geist', () => {
  const facce = [...senzaCommenti(landingCss).matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
    const d = (p: string) => m[1].match(new RegExp(`${p}:\\s*([^;]+);`))?.[1].trim() ?? ''
    const [da, a] = d('font-weight').split(/\s+/).map(Number)
    return { famiglia: d('font-family'), da, a, size: parseFloat(d('size-adjust')), asc: parseFloat(d('ascent-override')), desc: parseFloat(d('descent-override')) }
  })

  it('copre i pesi da 100 a 900 senza buchi', () => {
    expect(facce.every((f) => f.famiglia === '"Geist Fallback"')).toBe(true)
    expect(facce[0].da).toBe(100)
    expect(facce[facce.length - 1].a).toBe(900)
    facce.slice(1).forEach((f, i) => expect(f.da).toBe(facce[i].a + 1))
  })

  it('ogni faccia riporta l\'ascendente e il discendente di Geist (1.005 e 0.295 dell\'em)', () => {
    for (const f of facce) {
      expect(Math.abs((f.asc * f.size) / 100 - 100.5)).toBeLessThan(0.1)
      expect(Math.abs((f.desc * f.size) / 100 - 29.5)).toBeLessThan(0.1)
    }
  })
})

// ============================================================================
describe('landing — testo sui fondi', () => {
  it.each([
    ['text-strong', 'field-paper'], ['text', 'field-paper'], ['text-muted', 'field-paper'], ['text-accent', 'field-paper'],
    ['text-strong', 'surface'], ['text', 'surface'], ['text-muted', 'surface'], ['text-accent', 'surface'],
  ])('chiaro: %s su %s ≥ 4.5', (fg, bg) => {
    expect(contrast(T(fg), T(bg))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each([
    ['text-strong', 'field-dusk'], ['text', 'field-dusk'], ['text-muted', 'field-dusk'], ['text-accent', 'field-dusk'],
    ['text-strong', 'field-ink'], ['text', 'field-ink'], ['text-muted', 'field-ink'], ['text-accent', 'field-ink'],
  ])('scuro: %s su %s ≥ 4.5', (fg, bg) => {
    expect(contrast(S(fg), T(bg))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('i numeri citati nella Parte L (§L4.3)', () => {
    expect(contrast(T('text-strong'), T('field-paper'))).toBe(15.72)
    expect(contrast(T('text'), T('field-paper'))).toBe(10.53)
    expect(contrast(T('text-muted'), T('field-paper'))).toBe(4.94)
    expect(contrast(T('text-accent'), T('field-paper'))).toBe(4.79)
    expect(contrast(T('text'), T('surface'))).toBe(11.4)
    expect(contrast(S('text-strong'), T('field-dusk'))).toBe(19.11)
    expect(contrast(S('text'), T('field-dusk'))).toBe(12.88)
    expect(contrast(S('text-muted'), T('field-dusk'))).toBe(8.57)
    expect(contrast(S('text-accent'), T('field-dusk'))).toBe(6.71)
    expect(contrast(S('text-strong'), T('field-ink'))).toBe(17.01)
    expect(contrast(S('text'), T('field-ink'))).toBe(11.73)
    expect(contrast(S('text-muted'), T('field-ink'))).toBe(8.01)
    expect(contrast(S('text-accent'), T('field-ink'))).toBe(5.97)
  })

  it('PROVA NEGATIVA: l\'arancio-testo dell\'app sul buio non basta, per questo il ruolo cambia', () => {
    expect(contrast(T('accent-text'), T('field-ink'))).toBeLessThan(AA_TEXT)
    expect(contrast(T('accent-text'), T('field-dusk'))).toBeLessThan(AA_TEXT)
  })

  it('l\'anello di focus si vede su ogni fondo (inchiostro sul chiaro, bianco sul buio)', () => {
    expect(contrast(T('focus-ring'), T('field-paper'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    const bianco = dichiarazioni(blocco(materialsCss, '[data-surface="dark"]')).get('focus-ring')
    // materials.css lo scrive letterale: `--focus-ring: #FFFFFF;`
    expect(blocco(materialsCss, '[data-surface="dark"]')).toMatch(/--focus-ring:\s*#FFFFFF/)
    expect(bianco).toBe('#FFFFFF')
    expect(contrast(WHITE, T('field-dusk'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrast(WHITE, T('field-ink'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

// ============================================================================
describe('landing — il velo dell\'hero', () => {
  // Le fermate del gradiente: `color-mix(… --surface-brand NN%, transparent) Mpx`.
  const fermate = [...T('hero-velo').matchAll(/(\d+)%, transparent\) (\d+)px/g)].map((m) => ({ pct: +m[1], px: +m[2] }))
  const a = (px: number) => fermate.find((f) => f.px === px)!.pct

  it('le soglie del velo: 50% dove comincia il titolo, 72% dove comincia la frase', () => {
    expect(T('hero-velo-rise')).toBe('96px')
    expect(a(96)).toBe(50)
    expect(a(244)).toBe(72)
    // Il velo cresce verso il basso: mai un gradino che torna indietro.
    fermate.slice(1).forEach((f, i) => expect(f.pct).toBeGreaterThan(fermate[i].pct))
  })

  it.each(Object.entries(SCENA_CHIARA))('sopra il %s: il titolo regge (testo grande ≥ 3), il resto ≥ 4.5', (_, pixel) => {
    expect(contrast(WHITE, velo(a(96), pixel))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    const sotto = velo(a(244), pixel)
    expect(contrast(WHITE, sotto)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(S('text'), sotto)).toBeGreaterThanOrEqual(AA_TEXT)
    // «Ho già un account»: il vetro chiaro del Benvenuto sopra il velo.
    expect(contrast(WHITE, over(T('glass-clear'), sotto))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('i numeri citati nella Parte L (sul pallone, il pixel più chiaro)', () => {
    expect(contrast(WHITE, velo(50, SCENA_CHIARA.pallone))).toBe(3.76)
    expect(contrast(S('text'), velo(72, SCENA_CHIARA.pallone))).toBe(6.04)
    expect(contrast(WHITE, over(T('glass-clear'), velo(72, SCENA_CHIARA.pallone)))).toBe(5.5)
  })

  it('la frase comincia almeno a 200px (titolo di due righe): lì il velo è già al 65%', () => {
    // Fra due fermate il gradiente è lineare: a 200px vale 50 + 22 × 104/148.
    const a200 = a(96) + ((a(244) - a(96)) * (200 - 96)) / (244 - 96)
    expect(Math.round(a200 * 10) / 10).toBe(65.5)
    expect(contrast(S('text'), velo(a200, SCENA_CHIARA.pallone))).toBe(4.89)
    for (const pixel of Object.values(SCENA_CHIARA)) {
      expect(contrast(S('text'), velo(a200, pixel))).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('PROVA NEGATIVA: al 50% la frase non reggerebbe, per questo c\'è la seconda soglia', () => {
    expect(contrast(S('text'), velo(50, SCENA_CHIARA.pallone))).toBeLessThan(AA_TEXT)
  })

  it('da 900px, di lato: la colonna del testo sta tutta sopra il 78%', () => {
    const lato = [...T('hero-velo-lato').matchAll(/(\d+)%, transparent\)/g)].map((m) => +m[1])
    expect(lato).toEqual([94, 78])
    expect(contrast(S('text'), velo(78, SCENA_CHIARA.pallone))).toBe(7.34)
    expect(contrast(WHITE, over(T('glass-clear'), velo(78, SCENA_CHIARA.pallone)))).toBe(6.59)
    for (const pixel of Object.values(SCENA_CHIARA)) {
      expect(contrast(S('text'), velo(78, pixel))).toBeGreaterThanOrEqual(AA_TEXT)
      expect(contrast(WHITE, over(T('glass-clear'), velo(78, pixel)))).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })
})

// ============================================================================
describe('landing — la capsula di vetro', () => {
  // Il vetro chiaro dell'app (.32) sopra il numero della demo sfocato.
  const sottoChiaro = (amount: number) => over(T('glass-regular'), copre(T('ink'), WHITE, amount))
  // Il vetro scuro dell'app (.66) sopra una cosa bianca o chiara sfocata.
  const sottoScuro = (color: string, amount: number) => over(T('glass-dark'), copre(color, T('field-ink'), amount))

  it('i materiali sono quelli dell\'app, senza ritocchi', () => {
    expect(T('glass-regular')).toBe(APP.get('glass-regular'))
    expect(T('glass-dark')).toBe(APP.get('glass-dark'))
    expect(LANDING.has('glass-regular')).toBe(false)
    expect(LANDING.has('glass-dark')).toBe(false)
  })

  it('sul chiaro, tab spente d\'inchiostro pieno: reggono il numero della demo che ci passa sotto', () => {
    expect(contrast(T('on-glass'), sottoChiaro(COPERTURA.numeroLive))).toBe(4.56)
    expect(contrast(T('on-glass'), sottoChiaro(COPERTURA.titoloSezione))).toBe(6.04)
    // Il riferimento dell'app (una foto in ombra) resta quello.
    expect(contrast(T('on-glass'), over(T('glass-regular'), '#8C8C8C'))).toBe(7.92)
  })

  it('PROVA NEGATIVA: l\'inchiostro al 78% dell\'app lì scende sotto AA', () => {
    // Il motivo per cui sulla landing le tab spente sono d'inchiostro pieno.
    expect(contrast(T('on-glass-2'), sottoChiaro(COPERTURA.numeroLive))).toBeLessThan(AA_TEXT)
  })

  it('PROVA NEGATIVA: il numero da manifesto (da 600px) non passa sotto il vetro chiaro', () => {
    // Per questo #numeri sta sull'inchiostro (capsula scura) e sulla carta
    // nessun testo copre più dell'80%: al più 112px a peso 800 o 96 a peso 900.
    expect(contrast(T('on-glass'), sottoChiaro(COPERTURA.manifesto160))).toBeLessThan(AA_TEXT)
    expect(contrast(T('on-glass'), sottoChiaro(COPERTURA.manifesto128))).toBeLessThan(AA_TEXT)
    // Il 96 del telefono passerebbe: il limite è la copertura, non la taglia.
    expect(contrast(T('on-glass'), sottoChiaro(COPERTURA.manifesto96))).toBe(4.68)
  })

  it('sul buio, il vetro scuro regge anche il bianco pieno, il sole e l\'arancio', () => {
    expect(contrast(WHITE, sottoScuro(WHITE, 1))).toBe(6.1)
    expect(contrast(WHITE, sottoScuro(WHITE, COPERTURA.manifesto160))).toBe(6.57)
    expect(contrast(WHITE, sottoScuro(T('sole-core'), 1))).toBe(6.98)
    expect(contrast(WHITE, sottoScuro(T('accent'), 1))).toBe(10.79)
  })

  it('la lente è una pillola bianca piena: l\'etichetta accesa regge su ogni fondo', () => {
    expect(contrast(T('lente-label'), T('lente-bg'))).toBe(5.18)
    // Accesa e spenta si distinguono anche senza vedere il colore: 3.29 fra loro.
    expect(contrast(T('lente-label'), T('on-glass'))).toBe(3.29)
    // Sul buio la lente si stacca dalla capsula come forma.
    expect(contrast(T('lente-bg'), over(T('glass-dark'), T('field-ink')))).toBe(18.28)
  })

  it('il ＋ arancio: etichetta d\'inchiostro, il filo lo stacca dalla carta', () => {
    expect(contrast(T('on-accent'), T('accent'))).toBe(5.97)
    expect(contrast(T('accent-strong'), T('field-paper'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrast(T('accent'), T('field-dusk'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

// ============================================================================
describe('landing — le slide di Wrapped sono quelle dei PNG', () => {
  const chiavi = ['bg', 'fg', 'accent', 'muted', 'line'] as const
  const nomi = { orange: 'orange', ink: 'ink', sand: 'sand' } as const

  it.each(Object.keys(nomi) as (keyof typeof nomi)[])('palette %s = palette.ts', (k) => {
    for (const c of chiavi) expect(T(`slide-${k}-${c}`).toUpperCase(), `${k}.${c}`).toBe(PALETTES[k][c].toUpperCase())
  })

  it.each(Object.keys(nomi) as (keyof typeof nomi)[])('palette %s: testo e secondario ≥ 4.5, accento ≥ 3', (k) => {
    const bg = T(`slide-${k}-bg`)
    expect(contrast(T(`slide-${k}-fg`), bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(T(`slide-${k}-muted`), bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(T(`slide-${k}-accent`), bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('i numeri citati nella Parte L (§L4.5)', () => {
    expect(contrast(T('slide-orange-muted'), T('slide-orange-bg'))).toBe(4.83)
    expect(contrast(T('slide-ink-muted'), T('slide-ink-bg'))).toBe(11.25)
    expect(contrast(T('slide-sand-muted'), T('slide-sand-bg'))).toBe(8.44)
    expect(contrast(T('slide-ink-accent'), T('slide-ink-bg'))).toBe(5.97)
    expect(contrast(T('slide-sand-accent'), T('slide-sand-bg'))).toBe(4.79)
  })

  it('mai bianco sull\'arancio', () => {
    expect(contrast(WHITE, T('slide-orange-bg'))).toBeLessThan(AA_NON_TEXT)
    expect(T('slide-orange-fg')).toBe(LIT.ink)
  })
})

// ============================================================================
describe('landing — i dettagli dell\'hero e del finale', () => {
  it('«Ferma le animazioni»: l\'anello bianco .38 si vede sul tramonto (≥ 3)', () => {
    expect(contrast(over(T('glass-clear-border'), T('field-dusk')), T('field-dusk'))).toBe(3.55)
  })

  it('il marchio in cima all\'hero sta sul cielo scuro della scena (#1B1626)', () => {
    expect(contrast(WHITE, '#1B1626')).toBe(17.66)
  })

  it('il sole basso è un disegno: non porta testo, e il testo non entra nell\'alone', () => {
    expect(T('sole-core')).toBe('#FFE1B8')
    expect(parseFloat(T('sole-halo-r'))).toBeGreaterThan(parseFloat(T('sole-r')))
  })
})

// ============================================================================
describe('landing — la mappa disegnata', () => {
  it('le etichette d\'inchiostro reggono sulla terra e sul mare di OSM', () => {
    expect(contrast(T('ink'), T('map-land'))).toBe(14.83)
    expect(contrast(T('ink'), T('map-sea'))).toBe(10.61)
  })

  it('i pin sono quelli di ConquisteMap: doppio bordo, uno dei due regge su ogni fondo', () => {
    expect(T('pin-win')).toBe(LIT.accent)
    expect(T('pin-podium')).toBe(LIT.surface)
    expect(T('pin-rest')).toBe(LIT.lineStrong)
    for (const fondo of [T('map-land'), T('map-sea')]) {
      expect(Math.max(contrast(T('pin-halo'), fondo), contrast(T('pin-line'), fondo))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
    expect(contrast(T('pin-line'), T('pin-halo'))).toBe(17.01)
  })
})

// ============================================================================
describe('landing — la scala da manifesto', () => {
  const misura = (v: string) => parseFloat(v.match(/\/?\s*([\d.]+)rem/)![1])
  const nelBlocco = (media: string, name: string) => dichiarazioni(blocco(blocco(landingCss, media), ':root')).get(name)
  const gradini = (name: string) =>
    [nelBlocco('@media (max-width: 359px)', name), LANDING.get(name), nelBlocco('@media (min-width: 600px)', name),
      nelBlocco('@media (min-width: 900px)', name), nelBlocco('@media (min-width: 1280px)', name)]
      .filter((v): v is string => !!v)
      .map((v) => misura(v.split(' ').find((p) => p.includes('rem'))!))

  it.each(['type-display-hero', 'type-display-section', 'type-num-poster'])('%s cresce a ogni gradino', (name) => {
    const g = gradini(name)
    g.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(g[i]))
  })

  it('il titolo dell\'hero: 44 · 48 · 64 · 72 · 84', () => {
    expect(gradini('type-display-hero')).toEqual([2.75, 3, 4, 4.5, 5.25])
  })

  it('il titolo dell\'hero sta sempre sopra il titolo grande dell\'app', () => {
    expect(misura(LANDING.get('type-display-hero')!)).toBeGreaterThan(misura(APP.get('type-large-title')!))
  })
})

// ============================================================================
// MOTION.md, Parte L §L2: SALTO e CADUTA non sono curve disegnate a occhio ma
// molle (rigidità k, smorzamento c, massa m) campionate in `linear()`. Qui si
// ricalcolano dalla forma chiusa: se qualcuno ritocca un campione o la durata,
// la curva smette di essere quella molla e il test cade.
describe('landing — le molle SALTO e CADUTA', () => {
  /** Posizione (0 → 1) di una molla sottosmorzata partita da ferma, e quando si ferma entro `eps`. */
  const molla = (k: number, c: number, m: number) => {
    const w0 = Math.sqrt(k / m)
    const z = c / (2 * Math.sqrt(k * m))
    const wd = w0 * Math.sqrt(1 - z * z)
    const x = (t: number) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))
    const inviluppo = Math.sqrt(1 + ((z * w0) / wd) ** 2)
    return { z, wd, w0, x, ferma: (eps: number) => Math.log(inviluppo / eps) / (z * w0) }
  }
  /** I punti di `linear(…)` con la loro posizione (0–1); quelli senza posizione si distribuiscono come dice CSS. */
  const punti = (v: string) => {
    const corpo = v.match(/^linear\((.*)\)$/)![1]
    const pts = corpo.split(',').map((s) => {
      const [val, pct] = s.trim().split(/\s+/)
      return { v: Number(val), p: pct === undefined ? NaN : parseFloat(pct) / 100 }
    })
    pts[0].p = Number.isNaN(pts[0].p) ? 0 : pts[0].p
    pts[pts.length - 1].p = Number.isNaN(pts[pts.length - 1].p) ? 1 : pts[pts.length - 1].p
    for (let i = 1; i < pts.length; i++) {
      if (!Number.isNaN(pts[i].p)) continue
      let j = i
      while (Number.isNaN(pts[j].p)) j++
      const a = pts[i - 1].p
      const b = pts[j].p
      for (let q = i; q < j; q++) pts[q].p = a + ((b - a) * (q - i + 1)) / (j - i + 1)
    }
    return pts
  }
  const ms = (v: string) => parseFloat(v)

  it('SALTO è la molla 300/26/1 (ζ 0.75), ferma entro il 2‰ in --dur-salto', () => {
    const s = molla(300, 26, 1)
    expect(s.z).toBeCloseTo(0.75, 2)
    const durata = s.ferma(0.002)
    expect(Math.abs(ms(T('dur-salto')) - durata * 1000)).toBeLessThanOrEqual(5)
    for (const { v, p } of punti(T('ease-salto'))) expect(Math.abs(v - (p === 1 ? 1 : s.x(p * durata)))).toBeLessThanOrEqual(0.002)
    // Il superamento che fa «atterrare» Pallo: 2.8% oltre il segno, non di più.
    expect(Math.max(...punti(T('ease-salto')).map((q) => q.v))).toBe(1.028)
  })

  it('CADUTA è la molla 500/24/1 (ζ 0.54) riflessa: rimbalza, non affonda', () => {
    const c = molla(500, 24, 1)
    expect(c.z).toBeCloseTo(0.54, 2)
    const durata = c.ferma(0.01)
    expect(Math.abs(ms(T('dur-caduta')) - durata * 1000)).toBeLessThanOrEqual(5)
    const rimbalzo = (t: number) => (c.x(t) > 1 ? 2 - c.x(t) : c.x(t))
    const pts = punti(T('ease-caduta'))
    for (const { v, p } of pts) expect(Math.abs(v - (p === 1 ? 1 : rimbalzo(p * durata)))).toBeLessThanOrEqual(0.002)
    // Mai oltre il punto d'arrivo: il pin non scende sotto la sua città.
    expect(Math.max(...pts.map((q) => q.v))).toBe(1)
    // I due contatti con la mappa sono punti della curva, non cadono fra due campioni.
    const primo = (Math.PI - Math.atan(c.wd / (c.z * c.w0))) / c.wd
    for (const t of [primo, primo + Math.PI / c.wd]) {
      expect(pts.some((q) => q.v === 1 && Math.abs(q.p * durata - t) < 0.0005)).toBe(true)
    }
  })

  it('senza linear() le due molle ripiegano sulla curva standard, come MOLLA nell\'app', () => {
    const ripiego = dichiarazioni(blocco(blocco(landingCss, '@supports not (transition-timing-function: linear(0, 1))'), ':root'))
    expect(ripiego.get('ease-salto')).toBe('var(--ease-standard)')
    expect(ripiego.get('ease-caduta')).toBe('var(--ease-standard)')
  })
})
