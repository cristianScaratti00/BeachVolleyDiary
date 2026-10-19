// ============================================================================
// Il contratto dei token (ART_DIRECTION.md §4 e §12).
//
// Legge tokens.css e materials.css COME TESTO e ricalcola ogni rapporto di
// contrasto che la direzione artistica dichiara. jsdom non applica i fogli
// importati e axe non misura il contrasto senza layout, quindi questo è l'unico
// posto in cui "il testo secondario regge il sole" è un fatto e non un'intenzione.
//
// Tre famiglie di asserzioni:
//   - soglie (≥ 4.5 / ≥ 3): il requisito;
//   - numeri fissati (`toBe`): quelli citati nella documentazione. Se un token
//     cambia, il test cade e ART_DIRECTION.md va aggiornato insieme;
//   - le PROVE NEGATIVE (`toBeLessThan`): i motivi per cui una regola esiste
//     ("niente testo sul vetro thin", "niente accento come testo sul vetro").
//     Se un giorno passano, la regola si può allentare — non prima.
// ============================================================================
import { describe, it, expect } from 'vitest'
import tokensCss from './tokens.css?raw'
import materialsCss from './materials.css?raw'
import { contrast, over, parseColor, AA_TEXT, AA_NON_TEXT } from '../test/wcag'
import { TOKEN, LIT, dataTone } from '../lib/theme'
import { ENTRATA, SVELTO, MOLLA } from '../components/Motion'

const WHITE = '#FFFFFF'

// ---------------------------------------------------------------- parsing
const senzaCommenti = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Corpo del primo blocco aperto da `selector {`. */
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

function dichiarazioni(body: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim())
  return out
}

const LIGHT = dichiarazioni(blocco(tokensCss, ':root'))
// Il tema scuro eredita dal chiaro tutto ciò che non ridefinisce.
const DARK = new Map([...LIGHT, ...dichiarazioni(blocco(tokensCss, ':root[data-theme="dark"]'))])

function risolvi(theme: Map<string, string>, name: string, seen: string[] = []): string {
  const v = theme.get(name)
  if (v === undefined) throw new Error(`Token mancante: --${name}`)
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (!ref) return v
  if (seen.includes(name)) throw new Error(`Riferimento circolare: --${name}`)
  return risolvi(theme, ref[1], [...seen, name])
}

const L = (name: string) => risolvi(LIGHT, name)
const D = (name: string) => risolvi(DARK, name)
const cr = (theme: (n: string) => string, fg: string, bg: string) => contrast(theme(fg), theme(bg))

// ============================================================================
describe('token — tema chiaro: testo', () => {
  it.each([
    // [inchiostro, fondo]
    ['ink', 'bg'], ['ink', 'bg-top'], ['ink', 'bg-glow'], ['ink', 'surface'], ['ink', 'fill'],
    ['ink', 'surface-pressed'], ['ink', 'accent-wash'],
    ['ink-2', 'bg'], ['ink-2', 'bg-top'], ['ink-2', 'bg-glow'], ['ink-2', 'surface'], ['ink-2', 'fill'],
    ['ink-2', 'surface-pressed'], ['ink-2', 'accent-wash'],
    ['accent-text', 'bg'], ['accent-text', 'bg-glow'], ['accent-text', 'surface'],
    ['accent-text', 'accent-wash'],
    ['ink-label', 'surface'], ['ink-label', 'bg'],
    ['on-accent', 'accent'], ['on-select', 'select'], ['ink-inverse', 'ink'], ['ink-inverse', 'surface-brand'],
    ['danger', 'surface'], ['danger', 'bg'], ['danger', 'fill'], ['danger', 'danger-wash'], ['on-danger', 'danger'],
    ['success', 'surface'], ['success', 'bg'], ['success', 'success-wash'],
    ['ink-placeholder', 'field'],
  ])('%s su %s ≥ 4.5', (fg, bg) => {
    expect(cr(L, fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('i numeri citati in tokens.css e ART_DIRECTION.md §0', () => {
    expect(cr(L, 'ink', 'surface')).toBe(17.01)
    expect(cr(L, 'ink', 'bg')).toBe(15.72)
    expect(cr(L, 'ink-2', 'surface')).toBe(5.35)
    expect(cr(L, 'ink-2', 'bg')).toBe(4.94)
    expect(cr(L, 'ink-2', 'fill')).toBe(4.56)
    expect(cr(L, 'ink-label', 'surface')).toBe(11.4)
    expect(cr(L, 'accent-text', 'surface')).toBe(5.18)
    expect(cr(L, 'accent-text', 'bg')).toBe(4.79)
    expect(cr(L, 'accent-text', 'accent-wash')).toBe(4.66)
    expect(cr(L, 'on-accent', 'accent')).toBe(5.97)
    expect(cr(L, 'danger', 'surface')).toBe(6.57)
    expect(cr(L, 'success', 'surface')).toBe(5.51)
    expect(cr(L, 'ink-placeholder', 'field')).toBe(4.56)
    expect(cr(L, 'ink-inverse', 'surface-brand')).toBe(19.11)
  })

  it('il bianco sull\'arancio del marchio NON basta: il CTA usa --on-accent', () => {
    // La ragione per cui il pulsante pieno ha l'etichetta d'inchiostro (UX C16).
    expect(contrast(WHITE, L('accent'))).toBe(2.85)
  })

  it('PROVA NEGATIVA: l\'arancio-testo sulla guida --fill non basta, e lì non ci va', () => {
    expect(cr(L, 'accent-text', 'fill')).toBeLessThan(AA_TEXT)
  })

  it('il grigio secondario di iOS NON basterebbe: --ink-2 è più scuro di proposito', () => {
    expect(contrast('rgb(60 60 67 / 0.6)', WHITE)).toBeLessThan(AA_TEXT)
  })
})

describe('token — tema chiaro: grafica e stati (≥ 3)', () => {
  it.each([
    ['ink-3', 'surface'], ['ink-3', 'bg'], ['ink-3', 'fill'],
    ['accent-strong', 'surface'], ['accent-strong', 'bg'], ['accent-strong', 'fill'],
    ['data-win', 'surface'], ['data-podium', 'surface'], ['data-rest', 'surface'],
    ['focus-ring', 'bg'], ['focus-ring', 'surface'], ['focus-ring', 'fill'],
    ['select', 'fill'], ['select', 'bg'],
  ])('%s su %s ≥ 3', (fg, bg) => {
    expect(cr(L, fg, bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('l\'arancio del marchio da solo non porta grafica significativa', () => {
    // 2.85 sul bianco: per linee, barre e anelli serve --accent-strong.
    expect(cr(L, 'accent', 'surface')).toBeLessThan(AA_NON_TEXT)
    expect(cr(L, 'accent-strong', 'surface')).toBe(3.72)
  })

  it('PROVA NEGATIVA: il filo leggero dei campi è una scelta del redesign', () => {
    // Il campo si riconosce dall'etichetta sopra, dal fondo bianco e, al
    // focus, dal filo arancio con l'anello d'inchiostro. Chi chiede più
    // contrasto al sistema (`prefers-contrast: more`) riceve un filo vero.
    expect(cr(L, 'field-border', 'field')).toBeLessThan(AA_NON_TEXT)
    const piu = dichiarazioni(blocco(tokensCss, ':root:not([data-theme="dark"])'))
    expect(contrast(piu.get('field-border')!, L('field'))).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('--ink-3 non è un colore da testo', () => {
    expect(cr(L, 'ink-3', 'bg')).toBeLessThan(AA_TEXT)
  })
})

// ============================================================================
// Lo strato di stato (MOTION.md §4.3) è `currentColor` a .08/.12 SOTTO
// l'etichetta: scurisce il fondo verso il testo. Il contrasto si misura col
// livello già composto, e l'etichetta colorata passa al suo tono «-state».
// ============================================================================
describe('token — lo strato di stato non porta il testo sotto AA', () => {
  const strato = (theme: (n: string) => string, ink: string, bg: string, alpha: string) => {
    const { rgb } = parseColor(theme(ink))
    return over(`rgb(${rgb.join(' ')} / ${theme(alpha)})`, theme(bg))
  }
  const casi = [
    // [etichetta in hover/premuto, fondo a riposo] — tinted, plain, destructive-plain, chip accento
    ['accent-text-state', 'accent-wash'], ['accent-text-state', 'bg'], ['accent-text-state', 'bg-top'],
    ['accent-text-state', 'surface'], ['accent-text-state', 'fill'],
    ['danger-state', 'bg'], ['danger-state', 'surface'], ['danger-state', 'fill'], ['danger-state', 'danger-wash'],
  ] as const

  it.each(casi.flatMap(([fg, bg]) => [[fg, bg, 'state-hover'], [fg, bg, 'state-press']]))(
    'chiaro: %s su %s con %s ≥ 4.5',
    (fg, bg, alpha) => {
      expect(contrast(L(fg), strato(L, fg, bg, alpha))).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it.each(casi.flatMap(([fg, bg]) => [[fg, bg, 'state-hover'], [fg, bg, 'state-press']]))(
    'scuro: %s su %s con %s ≥ 4.5',
    (fg, bg, alpha) => {
      expect(contrast(D(fg), strato(D, fg, bg, alpha))).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it('PROVA NEGATIVA: con l\'arancio di riposo il premuto scende sotto AA', () => {
    // Il motivo per cui esiste il tono «-state». Se un giorno passa, si toglie.
    expect(contrast(L('accent-text'), strato(L, 'accent-text', 'accent-wash', 'state-press'))).toBe(3.95)
    expect(contrast(L('accent-text'), strato(L, 'accent-text', 'bg', 'state-press'))).toBe(4.04)
  })

  it('i numeri citati in tokens.css (strato di stato)', () => {
    expect(cr(L, 'accent-text-state', 'surface')).toBe(7.32)
    expect(cr(L, 'accent-text-state', 'bg')).toBe(6.76)
    expect(cr(L, 'accent-text-state', 'accent-wash')).toBe(6.58)
    expect(cr(L, 'danger-state', 'surface')).toBe(8.66)
    expect(cr(L, 'danger-state', 'bg')).toBe(8.01)
    expect(contrast(L('accent-text-state'), strato(L, 'accent-text-state', 'fill', 'state-press'))).toBe(5.18)
    expect(contrast(L('danger-state'), strato(L, 'danger-state', 'fill', 'state-press'))).toBe(6.03)
  })

  it('a riposo il tono «-state» regge da solo (il passaggio non fa sparire niente)', () => {
    for (const bg of ['accent-wash', 'bg', 'surface', 'fill']) {
      expect(cr(L, 'accent-text-state', bg)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(cr(L, 'danger-state', bg)).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })
})

// ============================================================================
// Testo sul vetro: il vetro si compone sul fondo PEGGIORE che può davvero
// passarci sotto — il grigio medio di una foto in ombra (#8C8C8C), non il nero:
// sotto le barre di vetro del redesign scorrono card bianche, la mappa e le
// foto del torneo. Poi si misura l'inchiostro sopra il risultato.
// ============================================================================
const OMBRA = '#8C8C8C'

describe('token — vetro chiaro, caso peggiore', () => {
  const vetro = (name: string) => over(L(name), OMBRA)

  it.each(['glass-regular', 'glass-thick'])('su %s il testo regge AA', (g) => {
    expect(contrast(L('on-glass'), vetro(g))).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(L('on-glass-2'), vetro(g))).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(L('on-glass-3'), vetro(g))).toBeGreaterThanOrEqual(AA_NON_TEXT)
    expect(contrast(L('focus-ring'), vetro(g))).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('i numeri citati in tokens.css (vetro)', () => {
    expect(contrast(L('on-glass'), vetro('glass-regular'))).toBe(7.92)
    expect(contrast(L('on-glass-2'), vetro('glass-regular'))).toBe(5.07)
    expect(contrast(L('on-glass-3'), vetro('glass-regular'))).toBe(3.49)
    expect(contrast(L('on-glass'), vetro('glass-thick'))).toBe(14.58)
  })

  it('la tab accesa: arancio-testo sulla pillola tinta, sul vetro sopra la carta', () => {
    const pillola = over(L('accent-tint'), over(L('glass-regular'), WHITE))
    expect(contrast(L('accent-text'), pillola)).toBe(4.56)
  })

  it('PROVA NEGATIVA: lo stesso arancio-testo sopra un\'ombra non basta', () => {
    // Per questo l'arancio come testo sul vetro c'è solo nella tab accesa,
    // che galleggia su carta e mappa, e mai sopra le foto (dettaglio torneo:
    // lì la TabBar non c'è).
    const pillola = over(L('accent-tint'), over(L('glass-regular'), OMBRA))
    expect(contrast(L('accent-text'), pillola)).toBeLessThan(AA_TEXT)
  })

  it('--ink-2 PIENO sul vetro è più chiaro dell\'inchiostro al 78%: materials.css lo ridefinisce', () => {
    expect(contrast(L('ink-2'), vetro('glass-regular'))).toBeLessThan(contrast(L('on-glass-2'), vetro('glass-regular')))
    expect(materialsCss).toMatch(/--ink-2:\s*var\(--on-glass-2\)/)
  })

  it('il rosso di «Elimina» sul vetro sopra il fondo pagina regge AA', () => {
    expect(contrast(L('danger'), over(L('glass-regular'), L('bg')))).toBe(6.23)
  })

  it('vetro scuro dei visori: caso peggiore sul BIANCO', () => {
    const scuro = over(L('glass-dark'), WHITE)
    expect(contrast(L('on-glass-dark'), scuro)).toBe(6.1)
    expect(contrast(L('on-glass-dark-2'), scuro)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(L('on-glass-dark-3'), scuro)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('il fallback opaco è il bianco della carta', () => {
    expect(L('glass-solid')).toBe('#FFFFFF')
    for (const g of ['glass-thin', 'glass-regular']) expect(L(g)).toMatch(/^rgb\(255 255 255 \/ /)
  })
})

describe('materiali — coerenza con i token', () => {
  it.each([
    ['glass-thin', 'blur-thin'],
    ['glass-regular', 'blur-regular'],
    ['glass-thick', 'blur-thick'],
  ])('%s usa il raggio di --%s, scritto come letterale', (material, token) => {
    const body = blocco(materialsCss, `[data-material="${material}"]`)
    const raggio = L(token)
    // Entrambe le proprietà, col prefisso per Safari.
    expect(body).toContain(`-webkit-backdrop-filter: blur(${raggio}) saturate(${L('glass-saturate')})`)
    expect(body).toContain(`backdrop-filter: blur(${raggio}) saturate(${L('glass-saturate')})`)
    expect(body).not.toMatch(/backdrop-filter:[^;]*var\(/)
  })

  it('ogni preferenza di sistema spegne la sfocatura', () => {
    for (const q of ['prefers-reduced-transparency: reduce', 'prefers-contrast: more', 'forced-colors: active']) {
      expect(materialsCss).toContain(q)
    }
    expect(tokensCss).toContain('@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))')
  })
})

// ============================================================================
describe('token — tema scuro (predisposto, non attivo)', () => {
  it('nessuna media query lo accende da sola', () => {
    // Risposta 2 dell'utente: solo chiaro in questo giro.
    expect(senzaCommenti(tokensCss)).not.toContain('prefers-color-scheme')
  })

  it.each([
    ['ink', 'bg'], ['ink', 'surface'], ['ink', 'fill'],
    ['ink-2', 'bg'], ['ink-2', 'surface'], ['ink-2', 'fill'],
    ['accent-text', 'bg'], ['accent-text', 'surface'], ['accent-text', 'fill'],
    ['danger', 'surface'], ['success', 'surface'],
    ['on-accent', 'accent'], ['on-select', 'select'], ['on-danger', 'danger'],
    ['ink-placeholder', 'field'],
  ])('%s su %s ≥ 4.5', (fg, bg) => {
    expect(cr(D, fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each([
    ['ink-3', 'surface'], ['ink-3', 'fill'], ['accent-strong', 'surface'],
    ['data-win', 'surface'], ['data-podium', 'surface'], ['data-rest', 'surface'],
    ['focus-ring', 'bg'], ['field-border', 'field'],
  ])('%s su %s ≥ 3', (fg, bg) => {
    expect(cr(D, fg, bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })

  it('vetro scuro: caso peggiore sul BIANCO', () => {
    for (const g of ['glass-regular', 'glass-thick']) {
      const v = over(D(g), WHITE)
      expect(contrast(D('on-glass'), v)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(contrast(D('on-glass-2'), v)).toBeGreaterThanOrEqual(AA_TEXT)
      expect(contrast(D('on-glass-3'), v)).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })
})

// ============================================================================
describe('token — TS e CSS non divergono', () => {
  const nomeCss = (k: string) => k.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/([a-z])(\d)/g, '$1-$2')

  it.each(Object.entries(TOKEN))('TOKEN.%s punta a un token che esiste', (k, v) => {
    expect(v).toBe(`var(--${nomeCss(k)})`)
    expect(LIGHT.has(nomeCss(k))).toBe(true)
  })

  it.each(Object.entries(LIT))('LIT.%s è il valore chiaro di tokens.css', (k, v) => {
    expect(L(nomeCss(k)).toUpperCase()).toBe(v.toUpperCase())
  })

  it('dataTone legge i letterali dei file lib condivisi', () => {
    expect(dataTone('#FF6B35')).toBe('win') // dotForRank(1), esitoStyle(true)
    expect(dataTone('#f7a883')).toBe('podium') // dotForRank(2..3)
    expect(dataTone('#FFF1EA')).toBe('win') // setChips: fondo del set vinto
    expect(dataTone('#C4501E')).toBe('win') // setChips: testo del set vinto
    expect(dataTone('#F2F0EC')).toBe('rest') // setChips: set perso
    expect(dataTone('rgba(27,42,74,.25)')).toBe('rest')
    expect(dataTone('rgba(27,42,74,.4)')).toBe('rest') // esitoStyle(false)
  })
})

describe('token — un solo vocabolario di movimento', () => {
  const ms = (v: string) => Number(v.replace('ms', ''))
  const bezier = (v: string) => v.match(/cubic-bezier\(([^)]+)\)/)![1].split(',').map(Number)

  it('le durate CSS sono quelle di Motion.tsx', () => {
    expect(ms(L('dur-entrata'))).toBe(ENTRATA.duration * 1000)
    expect(ms(L('dur-svelto'))).toBe(SVELTO.duration * 1000)
    expect(bezier(L('ease-standard'))).toEqual([...ENTRATA.ease])
    expect(bezier(L('ease-standard'))).toEqual([...SVELTO.ease])
  })

  it('lo strato di stato dei pulsanti è .08 in hover e .12 premuto (MOTION.md §4.3)', () => {
    expect(Number(L('state-hover'))).toBe(0.08)
    expect(Number(L('state-press'))).toBe(0.12)
    // Il paio soft resta sotto, mai sopra: è lo stesso gesto su un fondo già tinto.
    expect(Number(L('state-hover-soft'))).toBeLessThan(Number(L('state-hover')))
    expect(Number(L('state-press-soft'))).toBeLessThan(Number(L('state-press')))
  })

  it('lo skeleton compare a 150ms e respira da 600ms (MOTION.md §2.3)', () => {
    expect(ms(L('delay-skeleton'))).toBe(150)
    expect(ms(L('delay-respiro'))).toBe(600)
  })

  it('--ease-molla è la molla MOLLA campionata', () => {
    // Soluzione esatta dell'oscillatore smorzato con velocità iniziale nulla.
    const { stiffness: k, damping: c, mass: m } = MOLLA
    const w0 = Math.sqrt(k / m)
    const z = c / (2 * Math.sqrt(k * m))
    const wd = w0 * Math.sqrt(1 - z * z)
    const x = (t: number) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))

    const durata = ms(L('dur-molla')) / 1000
    const punti = L('ease-molla').match(/linear\(([^)]+)\)/)![1].split(',').map(Number)
    const n = punti.length - 1
    punti.forEach((p, i) => expect(Math.abs(p - (i === n ? 1 : x((i / n) * durata)))).toBeLessThan(0.002))
    // A fine durata la molla è ferma al millesimo.
    expect(Math.abs(1 - x(durata))).toBeLessThan(0.001)
  })
})
