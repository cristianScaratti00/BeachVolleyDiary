// ============================================================================
// La landing /presentazione letta come testo (UX.md §L14.1): l'HTML modello,
// l'HTML finito che esce da `componiLanding` e i fogli dei componenti.
//
// È la versione FERMA della pagina, quella che vede chi non ha JavaScript
// (UX §L6.0): qui si fissano la CSP (niente script né stili in linea), la
// struttura che gli altri test e gli script di docs/qa danno per scontata
// (gli id delle sezioni, la barra, il foglio), i ruoli di §L8.3 e le regole
// del movimento e del colore che il CSS non deve rompere (MOTION §L11.2,
// ART §L1). Il comportamento della pagina viva sta in landing.vivo.test.ts.
// ============================================================================
import { describe, it, expect } from 'vitest'
import fonte from '../../presentazione/index.html?raw'
import { componiLanding } from '../../presentazione/build/componi'
import { ultimo } from './landing'
import { PLANS_ENABLED } from '../lib/limits'
import { wrappedAOttobre } from '../app/selectors'
import { MAX_STORICO } from '../screens/PartitaLive.storico'
import { FORMATO_BEACH, cambioOgni, obiettivo } from '../screens/PartitaLive.regole'

// I fogli dei componenti come testo (vitest.config.ts li legge, `css.include`).
// Il foglio dei token è il solo con i colori letterali: ha il suo test,
// src/styles/landing.tokens.test.ts, e qui resta fuori dalla regola.
const FOGLI = import.meta.glob<string>('../../presentazione/styles/*.css', { query: '?raw', import: 'default', eager: true })
const COMPONENTI = Object.entries(FOGLI)
  .map(([k, css]) => [k.split('/').pop() as string, css] as const)
  .filter(([nome]) => nome !== 'tokens.css' && nome !== 'landing.css')

const SITO = 'https://bv-diary.vercel.app/'
const SEZIONI = ['inizio', 'diario', 'registra', 'live', 'numeri', 'mappa', 'wrapped', 'dati', 'comincia']

const leggi = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const modello = leggi(fonte)
const finito = leggi(componiLanding(fonte))
const testoVisibile = (d: Document) => {
  const b = d.body.cloneNode(true) as HTMLElement
  b.querySelectorAll('[aria-hidden="true"], svg, script').forEach((n) => n.remove())
  return (b.textContent ?? '').replace(/\s+/g, ' ')
}

describe('CSP: niente script né stili in linea (`script-src \'self\'`)', () => {
  it.each([
    ['modello', modello],
    ['finito', finito],
  ])('%s: ogni <script> ha un src, e nessun attributo on*', (_, d) => {
    for (const s of d.querySelectorAll('script')) expect(s.getAttribute('src'), s.outerHTML.slice(0, 80)).toBeTruthy()
    const conOn = [...d.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)).map((a) => `${el.tagName}[${a.name}]`))
    expect(conOn).toEqual([])
  })

  it('il modello non ha attributi style né blocchi <style>', () => {
    expect(modello.querySelectorAll('style')).toHaveLength(0)
    expect([...modello.querySelectorAll('[style]')].map((e) => e.outerHTML.slice(0, 60))).toEqual([])
  })

  it('l\'HTML finito scrive in linea solo le proprietà --i (Pallo, pin) e --v (la barra vinte/perse)', () => {
    expect(finito.querySelectorAll('style')).toHaveLength(0)
    const altre = [...finito.querySelectorAll('[style]')]
      .flatMap((e) => (e.getAttribute('style') ?? '').split(';').map((d) => d.split(':')[0].trim()).filter(Boolean))
      .filter((p) => p !== '--i' && p !== '--v')
    expect(altre).toEqual([])
  })

  it('caratteri, fogli e script arrivano da questo sito (niente Google Fonts né CDN)', () => {
    const esterni = [...finito.querySelectorAll('link[href], script[src], img[src], source[srcset]')]
      .filter((e) => e.getAttribute('rel') !== 'canonical')
      .map((e) => e.getAttribute('href') ?? e.getAttribute('src') ?? e.getAttribute('srcset') ?? '')
      .filter((u) => /^(https?:)?\/\//i.test(u))
    expect(esterni).toEqual([])
  })
})

describe('documento e meta (UX §L8.8, §L12.1)', () => {
  it('lang="it" e un solo h1, quello dell\'hero', () => {
    expect(finito.documentElement.lang).toBe('it')
    const h1 = finito.querySelectorAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].textContent).toBe('Ogni partita, nel tuo diario.')
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
    expect(finito.title).toBe('Beach Diary · Ogni partita, nel tuo diario')
    expect(finito.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(/beach volley/)
    const meta = (p: string) => finito.querySelector(`meta[property="${p}"]`)?.getAttribute('content') ?? ''
    expect(finito.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITO}presentazione/`)
    expect(meta('og:url')).toBe(`${SITO}presentazione/`)
    expect(meta('og:image')).toMatch(new RegExp(`^${SITO}`))
    expect(meta('og:image:width')).toBe('1200')
    expect(meta('og:image:height')).toBe('630')
    expect(meta('og:image:alt')).toBeTruthy()
    expect(finito.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
  })

  it('theme-color parte dal tramonto dell\'hero (#120E14, UX LC13)', () => {
    expect(finito.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#120E14')
  })
})

describe('struttura: le sezioni sono contratto (UX §L3.1, §L8.3)', () => {
  it('le nove sezioni, in quest\'ordine, dentro <main id="contenuto">', () => {
    const ids = [...finito.querySelectorAll('main#contenuto > section')].map((s) => s.id)
    expect(ids).toEqual(SEZIONI)
  })

  it.each(SEZIONI)('#%s: aria-labelledby punta al suo titolo, unico e raggiungibile dai salti (tabindex="-1")', (id) => {
    const s = finito.getElementById(id) as HTMLElement
    const titoli = s.querySelectorAll(id === 'inizio' ? 'h1' : 'h2')
    expect(titoli).toHaveLength(1)
    expect(s.getAttribute('aria-labelledby')).toBe(titoli[0].id)
    expect(titoli[0].getAttribute('tabindex')).toBe('-1')
  })

  it('gli id del documento finito sono unici (i ritagli di Pallo e della scena compresi)', () => {
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

  it('il salto al contenuto è il primo elemento che si raggiunge, e porta a <main>', () => {
    const primo = finito.body.querySelector('a[href], button')
    expect(primo?.textContent).toBe('Salta al contenuto')
    expect(primo?.getAttribute('href')).toBe('#contenuto')
  })
})

describe('la barra (UX §L4.1, §L7.1)', () => {
  const nav = finito.querySelector('nav[aria-label="Sezioni"]') as HTMLElement

  it('sta prima di <main>, dopo il salto al contenuto', () => {
    expect(nav).toBeTruthy()
    const main = finito.querySelector('main') as HTMLElement
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const skip = finito.querySelector('.skip-link') as HTMLElement
    expect(skip.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('quattro tab verso sezioni che esistono, con etichetta visibile e senza aria-current nell\'HTML', () => {
    const tabs = [...nav.querySelectorAll<HTMLAnchorElement>('ul a')]
    expect(tabs.map((a) => a.getAttribute('href'))).toEqual(['#diario', '#live', '#numeri', '#wrapped'])
    expect(tabs.map((a) => a.querySelector('[data-liv="spento"]')?.textContent?.trim())).toEqual(['Diario', 'Live', 'Numeri', 'Wrapped'])
    // Il secondo livello (acceso) è una copia per gli occhi: non si legge due volte.
    for (const a of tabs) expect(a.querySelector('[data-liv="acceso"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(nav.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('il ＋ «Apri il diario» è un link a / fuori dall\'elenco delle tab, dentro il nav', () => {
    const piu = nav.querySelector<HTMLAnchorElement>('a.piu')
    expect(piu?.getAttribute('href')).toBe('/')
    expect(piu?.textContent?.trim()).toBe('Apri il diario')
    expect(piu?.closest('ul')).toBeNull()
  })

  it('i vetri della capsula, la lente e l\'avanzamento sono decorativi', () => {
    for (const el of finito.querySelectorAll('.capsula-vetro, .lente, .avanza')) expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Pallo guida e il suo menu (UX §L7.2)', () => {
  const guida = finito.querySelector<HTMLButtonElement>('button.guida') as HTMLButtonElement

  it('un <button> vero, nascosto senza JavaScript, subito dopo la barra', () => {
    expect(guida.getAttribute('type')).toBe('button')
    expect(guida.getAttribute('aria-label')).toBe('Pallo: dove vuoi andare?')
    expect(guida.hasAttribute('hidden')).toBe(true)
    expect(guida.getAttribute('aria-expanded')).toBe('false')
    expect(finito.querySelector('nav.barra')?.nextElementSibling).toBe(guida)
  })

  it('la nuvoletta è la descrizione del pulsante, nascosta, mai una live region', () => {
    const bolla = finito.getElementById(guida.getAttribute('aria-describedby') ?? '') as HTMLElement
    expect(bolla.getAttribute('aria-hidden')).toBe('true')
    expect(bolla.hasAttribute('aria-live')).toBe(false)
    expect(bolla.getAttribute('role')).toBeNull()
  })

  it('il menu è una disclosure di navigazione, non un role="menu"', () => {
    const menu = finito.getElementById(guida.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(menu.hasAttribute('hidden')).toBe(true)
    expect(menu.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
    const nav = menu.querySelector('nav') as HTMLElement
    expect(finito.getElementById(nav.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Dove vuoi andare?')
    expect([...menu.querySelectorAll('.guida-menu-voci a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Il diario in tasca', '#diario'],
      ['Raccontalo a Pallo', '#registra'],
      ['Partita live', '#live'],
      ['I numeri e la mappa', '#numeri'],
      ['Beach Wrapped', '#wrapped'],
      ['I tuoi dati', '#dati'],
      ['Torna su', '#inizio'],
    ])
  })
})

describe('«Ferma le animazioni» (UX §L7.13)', () => {
  const comandi = [...finito.querySelectorAll<HTMLElement>('[data-comando="fermo"]')]

  it('tre istanze (hero, menu di Pallo, footer), <button aria-pressed="false"> con lo stesso nome', () => {
    expect(comandi.map((b) => (b.closest('#inizio') ? 'hero' : b.closest('#guida-menu') ? 'menu' : b.closest('footer') ? 'footer' : '?'))).toEqual(['menu', 'hero', 'footer'])
    for (const b of comandi) {
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('aria-pressed')).toBe('false')
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '').trim()).toBe('Ferma le animazioni')
    }
  })

  it('ognuna è descritta dalla nota «già ridotte» (che il CSS mostra solo col movimento ridotto)', () => {
    for (const b of comandi) expect(finito.getElementById(b.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Animazioni già ridotte dalle impostazioni del telefono.')
  })
})

describe('le sezioni senza JavaScript (UX §L6.0)', () => {
  it('l\'hero: i due CTA sono link a / col parametro del Login (Q-L2); «Installa» è hidden', () => {
    const eroe = finito.getElementById('inizio') as HTMLElement
    expect([...eroe.querySelectorAll('a.ui-button')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Crea il tuo diario', '/?accesso=registrati'],
      ['Ho già un account', '/?accesso=accedi'],
    ])
  })

  it('ogni pulsante d\'installazione è hidden, e il suo status anche', () => {
    const pulsanti = finito.querySelectorAll('[data-installa]')
    expect(pulsanti).toHaveLength(3)
    for (const b of pulsanti) expect(b.hasAttribute('hidden')).toBe(true)
    for (const f of finito.querySelectorAll('.installa-fatto')) expect(f.hasAttribute('hidden')).toBe(true)
  })

  it('#diario: quattro capitoli, ognuno con h3, testo e la SUA schermata; la cornice sticky è una copia nascosta', () => {
    const capitoli = finito.querySelectorAll('#diario .capitolo')
    expect(capitoli).toHaveLength(4)
    for (const c of capitoli) {
      expect(c.querySelector('h3')?.textContent).toBeTruthy()
      expect(c.querySelector('img')?.getAttribute('alt')).toBeTruthy()
    }
    expect(finito.querySelector('#diario .telefono-fascia')?.getAttribute('aria-hidden')).toBe('true')
    for (const img of finito.querySelectorAll('#diario .telefono img')) expect(img.getAttribute('alt')).toBe('')
  })

  it('#registra: le voci sono un elenco e la chat un copione già scritto, dentro un log', () => {
    const voci = finito.querySelectorAll('#registra ul.voci > li')
    expect([...voci].map((v) => v.querySelector('.voce-nome')?.textContent)).toEqual(['Partita live', 'Torneo', 'Torneo rapido', 'Raccontalo a Pallo'])
    const log = finito.querySelector('#registra [role="log"]') as HTMLElement
    expect(log.getAttribute('aria-label')).toBe('Conversazione con Pallo')
    expect(log.tagName).not.toBe('OL') // il ruolo sul contenitore, la lista resta una lista
    expect(log.querySelector('ol')?.children.length).toBeGreaterThan(2)
  })

  it('#live: un tabellone fermo che si legge come immagine, coi pulsanti nascosti', () => {
    const campo = finito.querySelector('#live .demo-campo') as HTMLElement
    expect(campo.getAttribute('role')).toBe('img')
    expect(campo.getAttribute('aria-label')).toBe('Esempio: Noi 20, Loro 18, set point per voi')
    expect(campo.querySelector('button')).toBeNull()
    // Pallo e la nuvoletta: per gli occhi, come `.live-pallo` nell'app (§L7.6).
    expect(campo.querySelector('.demo-mezzo')?.getAttribute('aria-hidden')).toBe('true')
    for (const b of finito.querySelectorAll('#live .demo-azioni button')) expect(b.hasAttribute('hidden')).toBe(true)
    const stato = finito.querySelector('#live [role="status"]') as HTMLElement
    expect(stato.getAttribute('aria-live')).toBe('polite')
    expect(stato.textContent).toBe('')
  })

  it('#numeri: i valori finali sono già nel testo, e «2/14» si legge «2 su 14»', () => {
    const odo = [...finito.querySelectorAll('#numeri [data-odo]')].map((e) => e.textContent)
    expect(odo.every((t) => /^[+-]?\d+$/.test(t ?? ''))).toBe(true)
    const di = finito.querySelector('#numeri .cella-di') as HTMLElement
    expect(di.querySelector('[aria-hidden="true"]')?.textContent).toBe('/')
    expect(di.querySelector('.sr-only')?.textContent).toBe('su')
  })

  it('#mappa: l\'illustrazione è un\'immagine con la didascalia per nome, e l\'esito sta anche in testo', () => {
    const svg = finito.querySelector('#mappa svg[role="img"]') as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-labelledby')).toBe('mappa-didascalia')
    expect(finito.getElementById('mappa-didascalia')?.textContent).toMatch(/^Illustrazione/)
    const citta = [...finito.querySelectorAll('#mappa .mappa-citta li')].map((li) => li.textContent ?? '')
    expect(citta.length).toBeGreaterThan(0)
    for (const c of citta) expect(c).toMatch(/vinta|podio|giocata/i)
  })

  it('#wrapped: la riga di slide si scorre a mano da tastiera (regione focalizzabile, <ol>)', () => {
    const r = finito.querySelector('#wrapped .slides') as HTMLElement
    expect(r.getAttribute('role')).toBe('region')
    expect(r.getAttribute('tabindex')).toBe('0')
    expect(r.getAttribute('aria-label')).toBe('Slide di Beach Wrapped')
    expect(r.querySelector('ol')?.children.length).toBeGreaterThanOrEqual(3)
  })

  it('#dati: righe con titolo e testo, nessuna è un link', () => {
    const righe = finito.querySelectorAll('#dati .righe > li')
    expect(righe.length).toBe(7)
    for (const r of righe) {
      expect(r.querySelector('h3')).toBeTruthy()
      expect(r.querySelector('a')).toBeNull()
    }
  })

  it('le illustrazioni non si leggono: ogni <svg> è aria-hidden (o dentro un nascosto), tranne la mappa', () => {
    const parlano = [...finito.querySelectorAll('svg')].filter((s) => !s.closest('[aria-hidden="true"]') && s.getAttribute('role') !== 'img')
    expect(parlano.map((s) => s.outerHTML.slice(0, 60))).toEqual([])
  })

  it('ogni <img> ha alt, width e height (CLS 0)', () => {
    const imgs = [...finito.querySelectorAll('img')]
    expect(imgs.length).toBeGreaterThan(0)
    for (const i of imgs) {
      expect(i.hasAttribute('alt'), i.getAttribute('src') ?? '').toBe(true)
      expect(Number(i.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(i.getAttribute('height'))).toBeGreaterThan(0)
    }
  })
})

describe('il foglio d\'installazione (UX §L7.12)', () => {
  const foglio = finito.getElementById('installa') as HTMLElement

  it('un dialogo modale nascosto, fuori da <main>, col titolo e il testo per nome', () => {
    expect(foglio.getAttribute('role')).toBe('dialog')
    expect(foglio.getAttribute('aria-modal')).toBe('true')
    expect(foglio.hasAttribute('hidden')).toBe(true)
    expect(foglio.closest('main')).toBeNull()
    const titolo = finito.getElementById(foglio.getAttribute('aria-labelledby') ?? '') as HTMLElement
    expect(titolo.tagName).toBe('H2')
    expect(titolo.getAttribute('tabindex')).toBe('-1')
    expect(finito.getElementById(foglio.getAttribute('aria-describedby') ?? '')?.textContent).toBe("Beach Diary si apre a tutto schermo, come un'app.")
  })

  it('le quattro varianti dei passi, e i due modi di chiudere con un nome', () => {
    expect([...foglio.querySelectorAll('[data-passi]')].map((o) => o.getAttribute('data-passi'))).toEqual(['ios26', 'ios', 'ios-altro', 'altro'])
    expect(foglio.querySelector('button[aria-label="Chiudi"]')).toBeTruthy()
    expect([...foglio.querySelectorAll('button')].map((b) => b.textContent?.trim() || b.getAttribute('aria-label'))).toEqual(['Chiudi', 'Ho capito'])
  })
})

describe('i testi dicono il vero (UX §L12): legati al codice dell\'app', () => {
  const testo = testoVisibile(finito)

  it('«Gratis» solo finché i piani sono spenti (Q-L13)', () => {
    expect(PLANS_ENABLED && /Gratis/.test(testo)).toBe(false)
  })

  it('le regole della partita sono quelle di PartitaLive.regole.ts', () => {
    expect(obiettivo(0)).toBe(21)
    expect(obiettivo(FORMATO_BEACH.set - 1)).toBe(15)
    expect(testo).toContain(`Set a ${obiettivo(0)}, il terzo a ${obiettivo(2)}, sempre due punti di scarto. Cambio campo ogni ${cambioOgni(21)} punti, ogni ${cambioOgni(15)} nei set a 15.`)
    expect(testo).toContain(`le ultime ${MAX_STORICO} restano sul telefono`)
  })

  it('Beach Wrapped «a ottobre», come `wrappedAOttobre`', () => {
    expect(wrappedAOttobre('2026-10-01')).toBe(true)
    expect(wrappedAOttobre('2026-09-30')).toBe(false)
    expect(testo).toContain('A ottobre la tua stagione diventa una storia')
  })

  it('niente promesse che il prodotto non mantiene (§L12.8, «da non scrivere»)', () => {
    expect(testo).not.toMatch(/un solo servizio esterno/i)
    expect(testo).not.toMatch(/cancell\w* (il tuo |l')?account/i)
    expect(testo).not.toMatch(/esport\w* (i tuoi )?dati/i)
    expect(testo).not.toMatch(/Europa|\bUE\b/)
    // Il bucket `avatars` è pubblico: «private» vale solo per le foto dei tornei.
    expect(testo).not.toMatch(/foto(?! dei tornei)[^.]{0,20}privat/i)
    expect(testo).toContain('Le foto dei tornei sono private')
  })

  it('nel testo a schermo il «+» è ASCII: Geist non ha il «＋» a tutta larghezza (POLISH Parte L)', () => {
    const conNomi = testo + [...finito.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ')
    expect(conNomi).not.toContain('＋')
  })
})

// -------------------------------------------- niente framework (UX §L13)
// Chi apre la landing non scarica l'app: dal suo ingresso, seguendo gli import
// veri (non quelli di solo tipo), non si arriva mai a React, Supabase, Motion
// per React o a un componente .tsx. Lo stesso controllo che la build fa sui
// chunk, ma senza build e col nome del file colpevole.
const SORGENTI = import.meta.glob<string>(
  ['../../presentazione/js/**/*.ts', '../components/**/*.{ts,tsx}', '../screens/**/*.{ts,tsx}', '../lib/**/*.{ts,tsx}', '../app/**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
)
const VIETATI = /^(react|react-dom|react\/.*|@supabase\/.*|motion\/react|liquid-glass-react|leaflet.*|html-to-image)$/

describe('la landing non tira dentro l\'app (UX §L13)', () => {
  it('dagli import di presentazione/js/main.ts non si arriva a un framework né a un .tsx', () => {
    const base = 'file:///r/src/test/'
    const testi = new Map(Object.entries(SORGENTI).map(([k, v]) => [new URL(k, base).pathname, v]))
    const risolvi = (da: string, spec: string) => {
      const p = new URL(spec, 'file://' + da).pathname
      return [p, p + '.ts', p + '.tsx', p + '/index.ts'].find((c) => testi.has(c))
    }
    const visti = new Set<string>()
    const colpe: string[] = []
    const coda = [new URL('../../presentazione/js/main.ts', base).pathname]
    while (coda.length) {
      const f = coda.pop() as string
      if (visti.has(f)) continue
      visti.add(f)
      if (f.endsWith('.tsx')) colpe.push(`${f}: componente React`)
      const src = (testi.get(f) ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      for (const m of src.matchAll(/^\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
        const [, tipo, spec] = m
        if (tipo) continue
        if (VIETATI.test(spec)) colpe.push(`${f}: import da «${spec}»`)
        else if (spec.startsWith('.')) {
          const r = risolvi(f, spec)
          if (r) coda.push(r)
          else colpe.push(`${f}: «${spec}» non trovato`)
        }
      }
    }
    expect(colpe).toEqual([])
    // Il grafo è quello che conosce tsconfig.landing.json: i moduli dell'app senza framework.
    expect([...visti].filter((f) => f.startsWith('/r/src/')).map((f) => f.slice(3)).sort()).toEqual(
      expect.arrayContaining(['src/components/Pallo.vita.ts', 'src/components/ui/Odometro.ts', 'src/screens/PartitaLive.regole.ts']),
    )
  })
})

// ---------------------------------------------------------------- CSS
// Un parser minimo: commenti e stringhe via, poi regole annidate e
// dichiarazioni. Basta per le regole di MOTION §L11.2 e ART §L1.
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
const ANIMABILI = new Set(['transform', 'opacity', 'visibility', 'translate', 'rotate', 'scale'])

describe('CSS della landing (UX §L14.1, MOTION §L11.2)', () => {
  it('landing.css importa ogni foglio dei componenti, e solo quelli che esistono', () => {
    const importati = [...(FOGLI['../../presentazione/styles/landing.css'] ?? '').matchAll(/@import '\.\/([a-z]+\.css)'/g)].map((m) => m[1])
    expect(importati.filter((n) => n !== 'tokens.css').sort()).toEqual(COMPONENTI.map(([n]) => n).sort())
    for (const [, css] of COMPONENTI) expect(css.length).toBeGreaterThan(0)
  })

  it.each(COMPONENTI)('%s: tutto dentro un solo @layer components', (_, css) => {
    const cima = analizza(css)
    expect(cima.map((n) => ('prelude' in n ? n.prelude : `${n.prop}: …`))).toEqual(['@layer components'])
  })

  it.each(COMPONENTI)('%s: niente backdrop-filter (il vetro passa da data-material), niente will-change fisso', (_, css) => {
    const d = dichiarazioni(analizza(css))
    expect(d.filter((x) => /backdrop-filter$/.test(x.prop)).map((x) => ultimo(x.dentro))).toEqual([])
    expect(d.filter((x) => x.prop === 'will-change').map((x) => ultimo(x.dentro))).toEqual([])
  })

  it.each(COMPONENTI)('%s: niente colori letterali (solo var(--…) dei token)', (_, css) => {
    const letterali = dichiarazioni(analizza(css))
      .filter((x) => !x.prop.startsWith('--'))
      .filter((x) => {
        const v = x.valore.replace(/url\([^)]*\)/g, '')
        return /#[0-9a-f]{3,8}\b/i.test(v) || /\b(rgba?|hsla?|oklch|lab|lch)\(/i.test(v)
      })
      .map((x) => `${ultimo(x.dentro)} { ${x.prop}: ${x.valore} }`)
    expect(letterali).toEqual([])
  })

  it.each(COMPONENTI)('%s: le transizioni muovono solo transform, opacity e visibility; mai `all`', (_, css) => {
    const fuori = dichiarazioni(analizza(css))
      .filter((x) => x.prop === 'transition' || x.prop === 'transition-property')
      .flatMap((x) => virgole(x.valore).map((t) => ({ sel: ultimo(x.dentro), p: t.split(/\s+/)[0] })))
      .filter(({ p }) => p !== 'none' && !ANIMABILI.has(p))
      .map(({ sel, p }) => `${sel}: ${p}`)
    expect(fuori).toEqual([])
  })

  it.each(COMPONENTI)('%s: i fotogrammi chiave animano solo transform e opacity', (_, css) => {
    const fuori = dichiarazioni(analizza(css))
      .filter((x) => x.dentro.some((d) => d.startsWith('@keyframes')))
      .filter((x) => !ANIMABILI.has(x.prop) && x.prop !== 'animation-timing-function')
      .map((x) => `${x.dentro.find((d) => d.startsWith('@keyframes'))}: ${x.prop}`)
    expect(fuori).toEqual([])
  })

  it.each(COMPONENTI)('%s: nessuno `scroll-behavior: smooth` sulla pagina', (_, css) => {
    const lisci = dichiarazioni(analizza(css)).filter(
      (x) => x.prop === 'scroll-behavior' && /smooth/.test(x.valore) && x.dentro.some((d) => /(^|[\s,])(html|:root)\b/.test(d)),
    )
    expect(lisci).toEqual([])
  })
})
