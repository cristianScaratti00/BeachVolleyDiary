// ============================================================================
// Il contratto dei token della landing (ART_DIRECTION.md, Parte L).
//
// Come tokens.test.ts: legge i fogli COME TESTO e ricalcola ogni rapporto
// che il foglio della landing (presentazione/styles/tokens.css) dichiara nei
// commenti. Il foglio si somma a quello dell'app: dove non ridefinisce un
// nome, vale l'app. I fondi della landing sono tre, tutti piatti: la carta
// (--bg), il bianco delle carte (--surface) e la fascia grigia di #schermate
// (--fill); più la pesca della vetrina, che non porta testo.
// ============================================================================
import { describe, it, expect } from 'vitest'
import appCss from './tokens.css?raw'
import landingCss from '../../presentazione/styles/tokens.css?raw'
import { contrast, AA_TEXT, AA_NON_TEXT } from '../test/wcag'

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
const TUTTI = new Map([...APP, ...LANDING])

function risolvi(name: string, seen: string[] = []): string {
  const v = TUTTI.get(name)
  if (v === undefined) throw new Error(`Token mancante: --${name}`)
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/)
  if (!ref) return v
  if (seen.includes(name)) throw new Error(`Riferimento circolare: --${name}`)
  return risolvi(ref[1], [...seen, name])
}
const T = (name: string) => risolvi(name)
const cr = (fg: string, bg: string) => Math.round(contrast(T(fg), T(bg)) * 100) / 100

// ============================================================================
describe('landing — il foglio aggiunge, non cambia', () => {
  it('ridefinisce un solo nome dell\'app sul :root, ed è il carattere', () => {
    const comuni = [...LANDING.keys()].filter((k) => APP.has(k))
    expect(comuni).toEqual(['font-ui'])
    // Lo stesso Geist dell'app, con la riserva metrica prima del sistema.
    expect(T('font-ui').startsWith('"Geist Variable", "Geist", "Geist Fallback"')).toBe(true)
    expect(APP.get('font-ui')!.startsWith('"Geist Variable", "Geist",')).toBe(true)
  })

  it('i nomi nuovi hanno il prefisso --lp-', () => {
    const nuovi = [...LANDING.keys()].filter((k) => !APP.has(k))
    expect(nuovi.filter((k) => !k.startsWith('lp-'))).toEqual([])
  })

  it('niente sfocatura, niente tema di sistema, niente stile fuori dai livelli', () => {
    const src = senzaCommenti(landingCss)
    expect(src).not.toMatch(/backdrop-filter/)
    expect(src).not.toMatch(/prefers-color-scheme/)
    // Tutto il foglio sta dentro `@layer tokens { … }`.
    expect(src.trim().startsWith('@layer tokens {')).toBe(true)
    expect(src.trim().endsWith('}')).toBe(true)
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
  it('il testo lungo (--lp-testo) regge su carta, bianco e fascia grigia: i numeri del foglio', () => {
    expect(cr('lp-testo', 'bg')).toBe(8.22)
    expect(cr('lp-testo', 'surface')).toBe(8.89)
    expect(cr('lp-testo', 'fill')).toBe(7.58)
  })

  it('titoli e didascalie d\'inchiostro, voci della testata in --ink-label', () => {
    for (const bg of ['bg', 'surface', 'fill']) expect(cr('ink', bg)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(cr('ink-label', 'bg')).toBe(10.53)
  })

  it('l\'occhiello arancio: 4.79 sulla carta, e sulla fascia grigia il tono sotto (6.24)', () => {
    expect(cr('accent-text', 'bg')).toBe(4.79)
    expect(cr('accent-text-state', 'fill')).toBe(6.24)
  })

  it('PROVA NEGATIVA: l\'arancio-testo sulla fascia grigia non basta, per questo #schermate cambia tono', () => {
    expect(cr('accent-text', 'fill')).toBe(4.41)
    expect(cr('accent-text', 'fill')).toBeLessThan(AA_TEXT)
  })

  it('le icone delle carte (--accent-text sulla tessera di carta) passano il 3:1 dei grafici', () => {
    expect(cr('accent-text', 'bg')).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('landing — i pulsanti', () => {
  it('il pieno: etichetta d\'inchiostro sull\'arancio, 5.97 a riposo e 6.54 in hover', () => {
    expect(cr('on-accent', 'accent')).toBe(5.97)
    expect(cr('on-accent', 'lp-pieno-hover')).toBe(6.54)
  })

  it('il bianco: etichetta d\'inchiostro, e il filo che in hover si scurisce', () => {
    expect(cr('ink', 'surface')).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrast(T('lp-filo-hover'), T('bg'))).toBeGreaterThan(contrast(T('line-strong'), T('bg')))
  })

  it('l\'anello di focus (inchiostro) si vede su ogni fondo della pagina, la pesca compresa', () => {
    for (const bg of ['bg', 'surface', 'fill', 'lp-vetrina', 'accent']) expect(cr('focus-ring', bg)).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})
