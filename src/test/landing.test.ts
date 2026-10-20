// ============================================================================
// La landing /presentazione letta come testo (UX.md, Parte L): l'HTML
// modello, l'HTML finito che esce da `componiLanding` e i fogli dei
// componenti.
//
// La pagina è solo HTML e CSS: quello che si legge qui è tutta la pagina.
// Si fissano la CSP (niente script né stili in linea), la struttura della
// tavola «Landing page» (le quattro sezioni, la testata, gli id), le porte
// verso l'app (la registrazione resta lì) e le regole del colore e del
// movimento che i fogli non devono rompere. Layout, anello di focus e
// bersagli li misura docs/qa/landing.mjs nel browser.
// ============================================================================
import { describe, it, expect } from 'vitest'
import fonte from '../../presentazione/index.html?raw'
import { componiLanding } from '../../presentazione/build/componi'
import { PATHS } from '../components/ui/Icon.paths'
import { PARAM_ACCESSO } from '../screens/Login'
import { expectNoA11yViolations } from './axe'

// I fogli come testo (vitest.config.ts li legge, `css.include`). Il foglio dei
// token è il solo con i colori letterali: ha il suo test,
// src/styles/landing.tokens.test.ts.
const FOGLI = import.meta.glob<string>('../../presentazione/styles/*.css', { query: '?raw', import: 'default', eager: true })
const nome = (k: string) => k.split('/').pop() as string
const INGRESSO = FOGLI['../../presentazione/styles/landing.css'] ?? ''
const IMPORTATI = [...INGRESSO.matchAll(/@import '\.\/([a-z]+\.css)'/g)].map((m) => m[1])
const COMPONENTI = IMPORTATI.filter((n) => n !== 'tokens.css').map((n) => [n, FOGLI[`../../presentazione/styles/${n}`] ?? ''] as const)

// Le schermate servite da public/ (solo i nomi: niente si importa da lì).
const SCHERMATE = Object.keys(import.meta.glob('../../public/presentazione/screens/*.webp')).map((k) => `/presentazione/screens/${nome(k)}`)

const SITO = 'https://bv-diary.vercel.app/'
const SEZIONI = ['inizio', 'funzionalita', 'schermate', 'iscriviti']
const REGISTRATI = `/?${PARAM_ACCESSO}=registrati`
const ACCEDI = `/?${PARAM_ACCESSO}=accedi`

const leggi = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const modello = leggi(fonte)
const finito = leggi(componiLanding(fonte))
const ultimo = <T,>(a: T[]) => a[a.length - 1]

describe('CSP: niente script né stili in linea (`script-src \'self\'`)', () => {
  it.each([
    ['modello', modello],
    ['finito', finito],
  ])('%s: nessuno script (la pagina non ha JavaScript) e nessun attributo on*', (_, d) => {
    expect(d.querySelectorAll('script')).toHaveLength(0)
    const conOn = [...d.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => `${el.tagName}[${a.name}]`))
    expect(conOn).toEqual([])
  })

  it.each([
    ['modello', modello],
    ['finito', finito],
  ])('%s: niente attributi style né blocchi <style>', (_, d) => {
    expect(d.querySelectorAll('style')).toHaveLength(0)
    expect([...d.querySelectorAll('[style]')].map((e) => e.outerHTML.slice(0, 60))).toEqual([])
  })

  it('caratteri, fogli e immagini arrivano da questo sito (niente Google Fonts né CDN)', () => {
    const esterni = [...finito.querySelectorAll('link[href], img[src], source[srcset]')]
      .filter((e) => e.getAttribute('rel') !== 'canonical')
      .map((e) => e.getAttribute('href') ?? e.getAttribute('src') ?? e.getAttribute('srcset') ?? '')
      .filter((u) => /^(https?:)?\/\//i.test(u))
    expect(esterni).toEqual([])
  })
})

describe('documento e meta', () => {
  it('lang="it" e un solo h1, quello dell\'hero', () => {
    expect(finito.documentElement.lang).toBe('it')
    const h1 = finito.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('Il diario delle tue partite di beach volley.')
    expect(h1[0].closest('section')?.id).toBe('inizio')
  })

  it('il viewport copre le aree sicure e non blocca lo zoom', () => {
    const v = finito.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    expect(v).toContain('width=device-width')
    expect(v).toContain('viewport-fit=cover')
    expect(v).not.toMatch(/maximum-scale/)
    expect(v).not.toMatch(/user-scalable\s*=\s*(no|0)/)
  })

  it('titolo, description, canonical e og:* con URL assoluti sul dominio di produzione', () => {
    expect(finito.title).toBe('Beach Diary · Il diario delle tue partite di beach volley')
    expect(finito.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/beach volley/)
    const meta = (p: string) => finito.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? ''
    expect(finito.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITO}presentazione/`)
    expect(meta('og:url')).toBe(`${SITO}presentazione/`)
    expect(meta('og:image')).toBe(`${SITO}presentazione/og.png`)
    expect(meta('og:image:width')).toBe('1200')
    expect(meta('og:image:height')).toBe('630')
    expect(meta('og:image:alt')).toBeTruthy()
    expect(finito.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
  })

  it('theme-color è la carta della pagina (#F6F6F4)', () => {
    expect(finito.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#F6F6F4')
  })
})

describe('struttura: la tavola «Landing page»', () => {
  it('le quattro sezioni, in quest\'ordine, dentro <main id="contenuto">', () => {
    const ids = [...finito.querySelectorAll('main#contenuto > section')].map((s) => s.id)
    expect(ids).toEqual(SEZIONI)
  })

  it.each(SEZIONI)('#%s: aria-labelledby punta al suo titolo, unico', (id) => {
    const s = finito.getElementById(id) as HTMLElement
    const titoli = s.querySelectorAll(id === 'inizio' ? 'h1' : 'h2')
    expect(titoli).toHaveLength(1)
    expect(s.getAttribute('aria-labelledby')).toBe(titoli[0].id)
  })

  it('la testata sta fuori da <main>: il marchio torna in cima, la navigazione ha un nome', () => {
    const testata = finito.querySelector('body > header') as HTMLElement
    expect(testata).toBeTruthy()
    expect(testata.querySelector('a.testata-marchio')?.getAttribute('href')).toBe('#inizio')
    expect(testata.querySelector('a.testata-marchio')?.textContent?.trim()).toBe('Beach Diary')
    expect(testata.querySelector('nav')?.getAttribute('aria-label')).toBe('Sezioni')
    const voci = [...testata.querySelectorAll('.testata-voce')].map((a) => [a.textContent, a.getAttribute('href')])
    expect(voci).toEqual([
      ['Funzionalità', '#funzionalita'],
      ['Schermate', '#schermate'],
      ['Accedi', ACCEDI],
    ])
  })

  it('«Salta al contenuto» è il primo link della pagina e porta a <main>', () => {
    const primo = finito.querySelector('a[href]')
    expect(primo?.className).toBe('skip-link')
    expect(primo?.getAttribute('href')).toBe('#contenuto')
  })

  it('le nove carte delle funzionalità, ognuna col suo titolo e una riga', () => {
    const carte = [...finito.querySelectorAll('#funzionalita .carta')]
    expect(carte.map((c) => c.querySelector('h3')?.textContent)).toEqual([
      'Diario', 'Partita live', 'Solby, l’assistente',
      'Statistiche', 'Compagni', 'Mappa delle conquiste',
      'Chi c’è oggi', 'Storia Instagram', 'Beach Wrapped',
    ])
    for (const c of carte) expect(c.querySelectorAll('p')).toHaveLength(1)
  })

  it('gli id del documento finito sono unici (i ritagli del marchio compresi)', () => {
    const visti = new Map<string, number>()
    for (const el of finito.querySelectorAll('[id]')) visti.set(el.id, (visti.get(el.id) ?? 0) + 1)
    expect([...visti].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([])
  })

  it('ogni riferimento ARIA e ogni ancora interna puntano a un id che esiste', () => {
    const manca: string[] = []
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const el of finito.querySelectorAll(`[${a}]`)) {
        for (const id of (el.getAttribute(a) ?? '').split(/\s+/)) if (!finito.getElementById(id)) manca.push(`${a}=${id}`)
      }
    }
    for (const a of finito.querySelectorAll('a[href^="#"]')) {
      const id = (a.getAttribute('href') ?? '').slice(1)
      if (!finito.getElementById(id)) manca.push(`href=#${id}`)
    }
    expect(manca).toEqual([])
  })
})

describe('le porte dell\'app: la registrazione resta lì', () => {
  it('nessun modulo né campo nella landing', () => {
    expect(finito.querySelectorAll('form, input, select, textarea, button')).toHaveLength(0)
  })

  it('ogni link verso l\'app apre l\'accesso nella vista giusta (Login.tsx, `?accesso=`)', () => {
    const versoApp = [...finito.querySelectorAll('a[href^="/"]')].map((a) => [a.textContent?.trim(), a.getAttribute('href')])
    expect(versoApp).toEqual([
      ['Accedi', ACCEDI],
      ['Iscriviti', REGISTRATI],
      ['Crea il tuo diario', REGISTRATI],
      ['Ho già un account', ACCEDI],
      ['Crea il tuo diario', REGISTRATI],
      ['Ho già un account', ACCEDI],
    ])
  })

  it('l\'hero e il finale hanno le stesse due porte: il pieno per registrarsi, il bianco per entrare', () => {
    for (const id of ['inizio', 'iscriviti']) {
      const cta = [...finito.querySelectorAll(`#${id} .cta`)].map((a) => [a.getAttribute('data-variant'), a.getAttribute('href')])
      expect(cta).toEqual([
        ['pieno', REGISTRATI],
        ['bianco', ACCEDI],
      ])
    }
  })
})

describe('le schermate dei telefoni', () => {
  const img = [...finito.querySelectorAll('img')]

  it('ogni immagine è una schermata vera di public/presentazione/screens, 390 × 844, con un testo alternativo', () => {
    expect(img.map((i) => i.getAttribute('src'))).toEqual([
      '/presentazione/screens/home.webp',
      '/presentazione/screens/giro-solby.webp',
      '/presentazione/screens/giro-live.webp',
      '/presentazione/screens/giro-torneo.webp',
      '/presentazione/screens/giro-compagni.webp',
      '/presentazione/screens/giro-storia.webp',
      '/presentazione/screens/wrapped.webp',
    ])
    for (const i of img) {
      expect(SCHERMATE).toContain(i.getAttribute('src'))
      expect([i.getAttribute('width'), i.getAttribute('height')]).toEqual(['390', '844'])
      expect((i.getAttribute('alt') ?? '').length).toBeGreaterThan(20)
    }
  })

  it('il telefono dell\'hero si carica subito; quelli più in basso quando servono', () => {
    const [eroe, ...resto] = img
    expect(eroe.closest('#inizio')).toBeTruthy()
    expect(eroe.getAttribute('loading')).toBeNull()
    expect(eroe.getAttribute('fetchpriority')).toBe('high')
    for (const i of resto) expect(i.getAttribute('loading')).toBe('lazy')
  })

})

// Il giro di #schermate (MOTION.md, Parte L): sei momenti in ordine. Fermo è
// un elenco; col movimento una scena che si ferma. In tutti e due i casi il
// contenuto è lo stesso, e la barra delle storie è solo decorazione.
describe('il giro di #schermate', () => {
  const giro = finito.querySelector('#schermate .giro') as HTMLElement
  const passi = [...giro.querySelectorAll('ol.giro-passi > li.passo')]

  it('sei momenti in un elenco ordinato: prima il titolo, poi la frase, poi la schermata', () => {
    expect(passi.map((p) => p.querySelector('h3')?.textContent)).toEqual([
      'Prima del torneo, lo racconti a Solby.',
      'In campo, un tocco per ogni punto.',
      'Dopo, il torneo resta nel diario.',
      'Scopri con chi giochi meglio.',
      'La Storia del torneo, pronta da pubblicare.',
      'A ottobre, la stagione in storie.',
    ])
    for (const p of passi) {
      expect([...p.children].map((c) => c.className)).toEqual(['passo-testo', 'telefono'])
      expect(p.querySelectorAll('.passo-testo p')).toHaveLength(1)
      expect(p.querySelectorAll('img')).toHaveLength(1)
    }
  })

  it('la barra delle storie è decorativa e ha un segmento per momento', () => {
    const barra = giro.querySelector('.giro-barra') as HTMLElement
    expect(barra.getAttribute('aria-hidden')).toBe('true')
    expect(barra.children).toHaveLength(passi.length)
    expect(barra.textContent?.trim()).toBe('')
  })

  it('il foglio conosce tanti momenti quanti ne ha il modello', () => {
    const css = FOGLI['../../presentazione/styles/schermate.css'] ?? ''
    expect(css).toMatch(new RegExp(`--passi:\\s*${passi.length};`))
    for (let k = 1; k <= passi.length; k++) expect(css).toContain(`.passo:nth-child(${k}),`)
    expect(css).not.toContain(`.passo:nth-child(${passi.length + 1})`)
  })
})

// L'apertura della Home nel telefono dell'hero (MOTION.md, Parte L): fasce e
// tabellone sono decorativi, e le loro misure le scrive docs/qa/landing-shots.mjs
// in misure.css. Qui si fissa che modello e misure parlino delle stesse cose.
describe('l\'apertura della Home nel telefono dell\'hero', () => {
  const MISURE = FOGLI['../../presentazione/styles/misure.css'] ?? ''
  const APERTURA = FOGLI['../../presentazione/styles/apertura.css'] ?? ''
  const schermo = finito.querySelector('#inizio .telefono > .schermo') as HTMLElement

  it('ferma, la schermata è la Home vera; sopra, due strati decorativi senza testo', () => {
    expect(schermo.querySelector(':scope > img')?.getAttribute('src')).toBe('/presentazione/screens/home.webp')
    for (const strato of ['.bande', '.tabellone']) {
      const el = schermo.querySelector(`:scope > ${strato}`) as HTMLElement
      expect(el.getAttribute('aria-hidden'), strato).toBe('true')
      expect(el.textContent?.trim(), strato).toBe('')
    }
  })

  it('misure.css è generato, e ha una fascia per ogni fascia del modello (e nessuna in più)', () => {
    expect(MISURE).toMatch(/GENERATO da docs\/qa\/landing-shots\.mjs/)
    const nelModello = [...schermo.querySelectorAll('.banda')].map((b) => b.getAttribute('data-b'))
    const nelleMisure = [...MISURE.matchAll(/\.banda\[data-b="([a-z]+)"\]/g)].map((m) => m[1])
    expect(nelModello).toEqual(nelleMisure)
  })

  it('ogni numero del tabellone ha tante colonne quante ne misura misure.css', () => {
    const numeri = [...schermo.querySelectorAll('.odo')]
    expect(numeri.map((n) => n.getAttribute('data-odo'))).toEqual(['pct', 'scarto', 'vinti', 'serie'])
    for (const n of numeri) {
      const nome = n.getAttribute('data-odo')
      const colonne = [...MISURE.matchAll(new RegExp(`\\.odo\\[data-odo="${nome}"\\] > :nth-child\\((\\d+)\\)`, 'g'))].map((m) => Number(m[1]))
      expect(n.children.length, nome ?? '').toBe(colonne.length)
      expect(colonne).toEqual(colonne.map((_, i) => i + 1))
    }
  })

  it('le fasce sono la Home senza cifre, chiesta subito ma solo a chi vede il movimento', () => {
    const fondo = '/presentazione/screens/home-fondo.webp'
    expect(SCHERMATE).toContain(fondo)
    expect(APERTURA).toContain(`url("${fondo}")`)
    const preload = finito.querySelector(`link[rel="preload"][href="${fondo}"]`)
    expect(preload?.getAttribute('as')).toBe('image')
    expect(preload?.getAttribute('media')).toBe('(prefers-reduced-motion: no-preference)')
  })
})

describe('componiLanding', () => {
  it('lo sprite ha una e una sola icona per ogni `#i-nome` usato, coi tracciati di Icon.paths.ts', () => {
    const usate = [...new Set([...fonte.matchAll(/href="#i-([a-z-]+)"/g)].map((m) => m[1]))].sort()
    const simboli = [...finito.querySelectorAll('.sprite symbol')]
    expect(simboli.map((s) => s.id.slice(2))).toEqual(usate)
    for (const s of simboli) expect(s.querySelector('path')?.getAttribute('d')).toBe(PATHS[s.id.slice(2) as keyof typeof PATHS])
  })

  it('il marchio è il disegno di BrandMark, decorativo, col suo ritaglio', () => {
    const m = finito.querySelector('.testata-marchio svg.marchio') as SVGElement
    expect(m.getAttribute('aria-hidden')).toBe('true')
    expect(m.querySelector('clipPath')?.id).toMatch(/^marchio-l\d+$/)
    expect(m.querySelector('.marchio-fascia')?.getAttribute('d')).toBe('M-34 -14 C-12 -30 16 -30 34 -12')
  })

  it('nel documento finito non resta nessuna direttiva', () => {
    expect(componiLanding(fonte)).not.toMatch(/<!--@/)
  })

  it('una direttiva sconosciuta o un\'icona che l\'app non ha fermano la build', () => {
    expect(() => componiLanding('<!--@scena-->')).toThrow(/direttiva sconosciuta/)
    expect(() => componiLanding('<!--@pallo saluta-->')).toThrow(/direttiva sconosciuta/)
    expect(() => componiLanding('<!--@icone--><svg><use href="#i-non-esiste"/></svg>')).toThrow(/icona sconosciuta/)
  })
})

// ---------------------------------------------------------------- CSS
// Un parser minimo: commenti e stringhe via, poi regole annidate e
// dichiarazioni. Basta per le regole di MOTION R2/R6 e dei token.
type Nodo = { prelude: string; corpo: Nodo[] } | { prop: string; valore: string }
function analizza(css: string): Nodo[] {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
  let i = 0
  const blocco = (): Nodo[] => {
    const out: Nodo[] = []
    let buf = ''
    const dichiara = () => {
      const k = buf.indexOf(':')
      if (buf.trim() && k > 0) out.push({ prop: buf.slice(0, k).trim().toLowerCase(), valore: buf.slice(k + 1).trim() })
      buf = ''
    }
    while (i < s.length) {
      const c = s[i++]
      if (c === '{') {
        out.push({ prelude: buf.trim(), corpo: blocco() })
        buf = ''
      } else if (c === '}') break
      else if (c === ';') dichiara()
      else buf += c
    }
    dichiara()
    return out
  }
  return blocco()
}
/** Ogni dichiarazione, col percorso dei blocchi che la contengono. */
function dichiarazioni(nodi: Nodo[], dentro: string[] = []): { prop: string; valore: string; dentro: string[] }[] {
  return nodi.flatMap((n) => ('prop' in n ? [{ ...n, dentro }] : dichiarazioni(n.corpo, [...dentro, n.prelude])))
}
/** Divide alle virgole di primo livello (non dentro `var(…, …)`). */
function virgole(v: string): string[] {
  const out: string[] = []
  let p = 0
  let buf = ''
  for (const c of v) {
    if (c === '(') p++
    if (c === ')') p--
    if (c === ',' && p === 0) {
      out.push(buf.trim())
      buf = ''
    } else buf += c
  }
  return [...out, buf.trim()]
}
const ANIMABILI = new Set(['transform', 'opacity', 'visibility'])

describe('CSS della landing', () => {
  it('landing.css importa i token dell\'app, Geist, la base, le icone, poi i token e i componenti della landing', () => {
    const tutti = [...INGRESSO.matchAll(/@import '([^']+)'/g)].map((m) => m[1])
    expect(tutti.slice(0, 5)).toEqual([
      '../../src/styles/tokens.css',
      '@fontsource-variable/geist/wght.css',
      '../../src/styles/base.css',
      '../../src/components/ui/Icon.css',
      './tokens.css',
    ])
    // Niente vetro né primitive React: la landing non ne ha.
    expect(tutti.filter((i) => /materials|Button|Pallo|Login/.test(i))).toEqual([])
  })

  it('ogni foglio importato esiste e nessun foglio della cartella resta fuori', () => {
    for (const [n, css] of COMPONENTI) expect(css.length, n).toBeGreaterThan(0)
    const presenti = Object.keys(FOGLI).map(nome).filter((n) => n !== 'landing.css')
    expect(presenti.sort()).toEqual([...IMPORTATI].sort())
  })

  it.each(COMPONENTI)('%s: tutto dentro un solo @layer components', (_, css) => {
    const cima = analizza(css)
    expect(cima.map((n) => ('prelude' in n ? n.prelude : `${n.prop}: …`))).toEqual(['@layer components'])
  })

  it.each(COMPONENTI)('%s: niente colori letterali (solo var(--…) dei token)', (_, css) => {
    const letterali = dichiarazioni(analizza(css))
      .filter((x) => !x.prop.startsWith('--'))
      .filter((x) => /#[0-9a-f]{3,8}\b/i.test(x.valore) || /\b(rgba?|hsla?|oklch|lab|lch)\(/i.test(x.valore))
      .map((x) => `${ultimo(x.dentro)} { ${x.prop}: ${x.valore} }`)
    expect(letterali).toEqual([])
  })

  it.each(COMPONENTI)('%s: le transizioni muovono solo transform, opacity e visibility; mai `all`', (_, css) => {
    const fuori = dichiarazioni(analizza(css))
      .filter((x) => x.prop === 'transition' || x.prop === 'transition-property')
      .flatMap((x) => virgole(x.valore).map((t) => ({ sel: ultimo(x.dentro), p: t.split(/\s+/)[0] })))
      .filter((t) => !ANIMABILI.has(t.p))
      .map((t) => `${t.sel}: ${t.p}`)
    expect(fuori).toEqual([])
  })

  // MOTION.md ML2–ML3: ogni animazione vive dentro `prefers-reduced-motion:
  // no-preference` (con reduced-motion non si muove niente), e i fotogrammi
  // muovono solo ciò che non costa (R2).
  it.each(COMPONENTI)('%s: ogni animazione sta dentro prefers-reduced-motion: no-preference', (_, css) => {
    const fuori = dichiarazioni(analizza(css))
      .filter((x) => x.prop.startsWith('animation'))
      .filter((x) => !x.dentro.some((s) => s.includes('prefers-reduced-motion: no-preference')))
      .map((x) => `${ultimo(x.dentro)}: ${x.prop}`)
    expect(fuori).toEqual([])
  })

  it.each(COMPONENTI)('%s: i fotogrammi muovono solo transform, opacity e visibility', (_, css) => {
    const fuori = dichiarazioni(analizza(css))
      .filter((x) => x.dentro.some((s) => s.startsWith('@keyframes')))
      .filter((x) => !ANIMABILI.has(x.prop))
      .map((x) => `${x.dentro.find((s) => s.startsWith('@keyframes'))}: ${x.prop}`)
    expect(fuori).toEqual([])
  })

  it.each(COMPONENTI)('%s: niente backdrop-filter, niente will-change, niente scroll-behavior', (_, css) => {
    const d = dichiarazioni(analizza(css))
    expect(d.filter((x) => /backdrop-filter$|^will-change$|^scroll-behavior$/.test(x.prop)).map((x) => `${ultimo(x.dentro)}: ${x.prop}`)).toEqual([])
  })

  it('l\'hover dei pulsanti vale solo con un puntatore vero (sul telefono non resta acceso)', () => {
    const hover = dichiarazioni(analizza(COMPONENTI.map(([, css]) => css).join('\n'))).filter((x) => x.dentro.some((s) => s.includes(':hover')))
    expect(hover.length).toBeGreaterThan(0)
    for (const x of hover) expect(x.dentro.join(' '), ultimo(x.dentro)).toContain('(hover: hover) and (pointer: fine)')
  })
})

describe('axe sul documento finito (WCAG 2.1 A/AA)', () => {
  it('nessuna violazione', async () => {
    document.documentElement.lang = 'it'
    document.body.innerHTML = finito.body.innerHTML
    await expectNoA11yViolations(document.body)
  })
})
