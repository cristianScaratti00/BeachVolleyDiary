// ============================================================================
// Le schermate dei telefoni della landing (/presentazione), scattate
// dall'anteprima VERA (docs/preview) con i dati di prova: ART_DIRECTION §L5.
// Si rigenerano con un comando, dalla radice del repo:
//
//   node docs/qa/landing-shots.mjs
//
// Che cosa fa:
//   - avvia un suo server di sviluppo Vite (porta 5198, mai la 5173
//     dell'utente) e un suo Chrome headless (porta CDP 9341, mai la 9333);
//     li chiude a fine giro col PID catturato. Con BASE nell'ambiente usa
//     quel server e non ne avvia uno;
//   - FISSA LA DATA a OGGI_LANDING prima di ogni script della pagina: Wrapped
//     esiste solo a ottobre (`wrappedAOttobre`) e i tornei «di oggi» si
//     spostano col calendario. È lo stesso giorno di `OGGI_LANDING` in
//     `docs/preview/dati.ts`;
//   - 390×844 a dpr 2, telefono col tocco, movimento ridotto (ogni umore di
//     Pallo e ogni numero al suo fotogramma fermo: niente scatti a metà
//     salita). Nient'altro è nascosto: è l'app com'è;
//   - WebP qualità 82, 780×1688: la Home (l'hero) e i sei momenti del giro
//     di #schermate: la chat di Solby a metà, una partita live sul 15–10, il
//     torneo Cervia Beach Party, la sua Storia Instagram, i compagni e la
//     storia delle vittorie di Beach Wrapped;
//   - la Home una seconda volta SENZA le cifre del tabellone e la barra delle
//     vinte (`home-fondo.webp`): è lo schermo del telefono dell'hero, dove
//     cifre e barra le disegna la landing per rifare l'apertura della Home
//     (MOTION.md, Parte L). Nella stessa passata misura le fasce dei blocchi
//     che salgono, le colonne delle cifre e la barra, e scrive
//     `presentazione/styles/misure.css`. Se l'hero di presentazione/index.html
//     non ha le colonne che servono, si ferma e dice quali.
//
// Escono in public/presentazione/screens/. Per ognuna stampa misure e peso
// (obiettivo ≤ 120 KB).
// ============================================================================
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, page, sleep, SP } from './cdp.mjs'

/** Il giorno delle schermate. Uguale a `OGGI_LANDING` in docs/preview/dati.ts. */
const OGGI_LANDING = { anno: 2026, mese: 10, giorno: 17, ora: 10 }

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(RADICE, 'public', 'presentazione', 'screens')
const MISURE = join(RADICE, 'presentazione', 'styles', 'misure.css')
const MODELLO = join(RADICE, 'presentazione', 'index.html')
const PORTA_VITE = Number(process.env.PORTA_VITE ?? 5198)
const PORTA_CDP = Number(process.env.PORTA_CDP ?? 9341)
const QUALITA = 82
const PESO_MAX = 120 * 1024

// ------------------------------------------------------------- il server
let vite = null
let BASE = process.env.BASE
if (!BASE) {
  vite = spawn(process.execPath, [join(RADICE, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORTA_VITE), '--strictPort', '--host', '127.0.0.1'], {
    cwd: RADICE,
    env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'x' },
    stdio: 'ignore',
  })
  BASE = `http://127.0.0.1:${PORTA_VITE}/docs/preview/`
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) break
    } catch {}
    await sleep(200)
  }
}

const finisci = () => {
  if (vite && vite.exitCode === null) vite.kill('SIGTERM')
  try {
    const pid = Number(readFileSync(`${SP}/chrome-${PORTA_CDP}.pid`, 'utf8'))
    if (pid) process.kill(pid, 'SIGTERM')
  } catch {}
}
process.on('exit', finisci)
process.on('SIGINT', () => process.exit(130))

// ------------------------------------------------------------- la data
// `Date` sostituito prima di qualunque script: `new Date()` e `Date.now()`
// partono da OGGI_LANDING (ora locale della pagina) e poi scorrono.
const DATA_FISSA = `(() => {
  const D = Date
  const t0 = new D(${OGGI_LANDING.anno}, ${OGGI_LANDING.mese - 1}, ${OGGI_LANDING.giorno}, ${OGGI_LANDING.ora}, 0, 0).getTime()
  const r0 = D.now()
  const ora = () => t0 + (D.now() - r0)
  class DataFissa extends D {
    constructor(...a) { if (a.length === 0) super(ora()); else super(...a) }
    static now() { return ora() }
  }
  globalThis.Date = DataFissa
})()`

/** Le misure di un WebP (VP8, VP8L, VP8X), lette dall'intestazione. */
function misureWebp(buf) {
  const tipo = buf.toString('ascii', 12, 16)
  if (tipo === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]
  if (tipo === 'VP8L') {
    const b = buf.readUInt32LE(21)
    return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]
  }
  if (tipo === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)]
  return [0, 0]
}

// ------------------------------------------------------------- Chrome
await launch(PORTA_CDP)
const p = await page(PORTA_CDP)
await p.send('Network.enable')
await p.send('Network.setCacheDisabled', { cacheDisabled: true })
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: DATA_FISSA })
await p.viewport(390, 844, { mobile: true, dpr: 2, touch: true })
await p.media([{ name: 'prefers-reduced-motion', value: 'reduce' }])

// La rete è quieta da `ms`: si contano le richieste in volo dagli eventi CDP.
let inVolo = 0
let ultimaRete = Date.now()
p.on('Network.requestWillBeSent', () => { inVolo++; ultimaRete = Date.now() })
for (const ev of ['Network.loadingFinished', 'Network.loadingFailed']) p.on(ev, () => { inVolo = Math.max(0, inVolo - 1); ultimaRete = Date.now() })
async function reteQuieta(ms = 800, max = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    if (inVolo === 0 && Date.now() - ultimaRete >= ms) return
    await sleep(100)
  }
}

/** Aspetta che un'espressione nella pagina diventi vera. */
async function quando(expr, max = 15000, cosa = expr) {
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    if (await p.eval(`(() => { try { return !!(${expr}) } catch { return false } })()`)) return
    await sleep(120)
  }
  throw new Error('non arriva: ' + cosa)
}

/** Fermo: caratteri pronti, rete quieta, niente skeleton, niente toast. */
async function pronta() {
  await p.eval('document.fonts.ready.then(() => true)')
  await reteQuieta()
  await quando(`!document.querySelector('.splash, [class*="-skel"], [class*="skeleton"]')`, 15000, 'contenuto caricato')
  await sleep(700)
}

mkdirSync(OUT, { recursive: true })
const fatte = []
async function salva(nome, opts = {}) {
  const r = await p.send('Page.captureScreenshot', { format: 'webp', quality: QUALITA, ...opts })
  const buf = Buffer.from(r.data, 'base64')
  const f = join(OUT, nome)
  writeFileSync(f, buf)
  const [w, h] = misureWebp(buf)
  fatte.push({ nome, w, h, kb: +(statSync(f).size / 1024).toFixed(1) })
}

async function apri(rotta) {
  await p.go(`${BASE}?r=${rotta}`, 400)
  await pronta()
  // In cima: le schermate partono dal primo fotogramma della rotta.
  await p.eval('scrollTo(0, 0)')
  await sleep(300)
}

// ------------------------------------------- le misure dell'hero (misure.css)
// Le fasce della Home che salgono una dopo l'altra, come nell'app: ogni
// blocco `.rise` dalla metà dello spazio sopra di lui alla metà di quello
// sotto. L'ultimo blocco sta sotto la TabBar, che nell'app non sale: da lì in
// giù è una fascia ferma («fondo»).
const FASCE = [
  ['home-head', 'testa'],
  ['home-filtri', 'filtri'],
  ['home-pallo', 'pallo'],
  ['home-rend-wrap', 'rendimento'],
  ['dash-wrapped', 'wrapped'],
  ['home-coppia', 'coppia'],
  ['home-ultimi', 'fondo'],
]
const NUMERI = ['pct', 'scarto', 'vinti', 'serie']
const r2 = (n) => Math.round(n * 100) / 100
/** L'indice nella striscia [vuoto, 0–9, 0–9] (Odometro.ts). */
const IDX = (ch) => (ch === ' ' ? 0 : 1 + Number(ch))

function scriviMisure(m) {
  const errori = []
  const blocco = (cls) => m.blocchi.find((b) => b.cls.split(/\s+/).includes(cls))
  const fasce = FASCE.map(([cls, nome]) => ({ nome, b: blocco(cls) }))
  for (const f of fasce) if (!f.b) errori.push(`manca il blocco della fascia «${f.nome}»`)
  if (!m.tabbar) errori.push('manca la TabBar')
  if (errori.length) throw new Error('landing-shots: ' + errori.join('; '))

  const righe = []
  fasce.forEach((f, k) => {
    const y0 = k === 0 ? 0 : r2((fasce[k - 1].b.b + f.b.y) / 2)
    const y1 = f.nome === 'fondo' ? m.h : r2((f.b.b + fasce[k + 1].b.y) / 2)
    const i = f.nome === 'fondo' ? '' : ` --i: ${f.b.i || k};`
    righe.push(`  .banda[data-b="${f.nome}"] { --y0: ${y0}; --y1: ${y1};${i} }`)
  })
  if (m.tabbar.y < Number(/--y0: ([\d.]+)/.exec(righe[righe.length - 1])[1])) errori.push('la TabBar comincia sopra la fascia ferma')

  // Le cifre: la salita da zero di Tabellone.tsx (`rise`), cioè
  // Odometro.set('0' → valore). Le colonne nuove entrano dal vuoto; quelle
  // che c'erano rotolano e scivolano di una colonna a destra (il FLIP).
  // Un salto di uno è MOLLA, il resto RACCONTO.
  const modello = readFileSync(MODELLO, 'utf8')
  for (const nome of NUMERI) {
    const n = m.numeri.find((x) => x.dove === nome)
    if (!n) { errori.push(`manca il numero «${nome}» nella Home`); continue }
    const num = /\d+/.exec(n.valore)?.[0] ?? ''
    const voce = FASCE.find(([cls]) => n.blocco.split(/\s+/).includes(cls))
    const fascia = voce && fasce.find((f) => f.nome === voce[1])
    const c0 = n.cols[0]
    const tempo = Number(num) <= 1 ? 'molla' : 'racconto'
    righe.push(`  .odo[data-odo="${nome}"] { --x: ${c0.x}; --y: ${c0.y}; --cw: ${c0.w}; --lh: ${c0.h}; --fs: ${n.fs}; --ls: ${n.ls}; --i: ${fascia?.b.i ?? 0}; --dur: var(--dur-${tempo}); --ease: var(--ease-${tempo}); } /* ${n.valore} */`)
    const da = '0'.padStart(num.length, ' ')
    const guadagno = num.length - 1
    for (let k = 0; k < num.length; k++) {
      const stabile = da[k] !== ' '
      const from = IDX(da[k])
      let to = IDX(num[k])
      if (stabile && to < from) to += 10
      righe.push(`  .odo[data-odo="${nome}"] > :nth-child(${k + 1}) { --da: ${from}; --a: ${to}; --passi: ${to - from + 1}; --dx: ${stabile ? -guadagno : 0}; }`)
    }
    const nelModello = new RegExp(`data-odo="${nome}">((?:<span></span>)*)</span>`).exec(modello)
    const colonne = nelModello ? nelModello[1].split('<span></span>').length - 1 : 0
    if (colonne !== num.length) errori.push(`l'hero di presentazione/index.html ha ${colonne} colonne per «${nome}» (${n.valore}): ne servono ${num.length}`)
  }
  for (const [, nome] of FASCE) if (!modello.includes(`data-b="${nome}"`)) errori.push(`manca la fascia «${nome}» nell'hero di presentazione/index.html`)

  // La barra delle vinte: le due parti, ognuna dalla sua x dentro la barra.
  const barra = m.barra.find((b) => b.cls === 'home-barra')
  const v = m.barra.find((b) => b.cls.includes('home-barra-v'))
  const pp = m.barra.find((b) => b.cls.includes('home-barra-p'))
  if (!barra || !v || !pp) errori.push('manca la barra delle vinte')
  else {
    const i = blocco('home-rend-wrap')?.i || 3
    righe.push(`  .barra { --x: ${barra.x}; --y: ${barra.y}; --w: ${barra.w}; --h: ${barra.h}; --i: ${i}; }`)
    righe.push(`  .barra-v { --x: ${r2(v.x - barra.x)}; --w: ${v.w}; }`)
    righe.push(`  .barra-p { --x: ${r2(pp.x - barra.x)}; --w: ${pp.w}; }`)
  }
  if (errori.length) throw new Error('landing-shots: ' + errori.join('; '))

  const css = `/* ============================================================================
   GENERATO da docs/qa/landing-shots.mjs: non si modifica a mano, si rigenera.

   Le misure della Home (${m.w} × ${m.h}, in pixel dell'app) per il telefono
   dell'hero: le fasce dei blocchi che salgono, le colonne del tabellone e la
   barra delle vinte, prese dall'anteprima nella stessa passata che scatta
   home-fondo.webp. Le usa apertura.css (MOTION.md, Parte L).
   ============================================================================ */
@layer components {
${righe.join('\n')}
}
`
  writeFileSync(MISURE, css)
  fatte.push({ nome: 'misure.css', w: m.w, h: m.h, kb: +(Buffer.byteLength(css) / 1024).toFixed(1) })
}

// ------------------------------------------------- le tre schermate
await apri('/')
const home = await p.eval(`(() => {
  const t = (s) => document.querySelector(s)?.textContent?.trim() ?? null
  return { frase: t('h1'), testo: document.querySelector('main')?.innerText.slice(0, 800) ?? null }
})()`)
await salva('home.webp')

// ------------------------------- la Home dell'hero: lo schermo senza cifre
// Le colonne delle cifre e le due parti della barra spariscono senza toccare
// il layout (visibility): il «%», il «+» e «/ 7» restano dove sono.
const misure = await p.eval(`(() => {
  const r2 = (n) => Math.round(n * 100) / 100
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), b: r2(r.bottom) } }
  const blocchi = [...document.querySelectorAll('main .rise')].map((el) => ({ cls: el.className, i: getComputedStyle(el).getPropertyValue('--rise-i').trim(), ...R(el) }))
  const tabbar = document.querySelector('.ui-tabbar')
  const numeri = [...document.querySelectorAll('main .ui-tabellone')].map((el) => {
    const d = el.querySelector('.ui-odo-d')
    const cs = getComputedStyle(d)
    const mini = el.closest('.home-mini')
    const dove = el.closest('.home-pct') ? 'pct' : el.closest('.home-scarto-n') ? 'scarto' : mini ? (mini.previousElementSibling ? 'serie' : 'vinti') : null
    return {
      dove,
      valore: el.querySelector('.sr-only')?.textContent ?? '',
      blocco: el.closest('.rise')?.className ?? '',
      fs: parseFloat(cs.fontSize), ls: parseFloat(cs.letterSpacing), fw: cs.fontWeight,
      cols: [...el.querySelectorAll('.ui-odo-d')].map(R),
    }
  })
  const barra = [...document.querySelectorAll('.home-barra, .home-barra > span')].map((el) => ({ cls: el.className, ...R(el) }))
  const s = document.createElement('style')
  s.textContent = '.ui-tabellone .ui-odo-cols, .home-barra > span { visibility: hidden !important; }'
  document.head.append(s)
  return { blocchi, tabbar: tabbar && R(tabbar), numeri, barra, w: innerWidth, h: innerHeight }
})()`)
await sleep(300)
await salva('home-fondo.webp')
scriviMisure(misure)

// ------------------------------------------- il giro di #schermate
// Sei momenti dell'app, uno per passo del giro (MOTION.md, Parte L): la chat
// di Solby a metà, una partita live in corso, il torneo nel diario, i
// compagni, la Storia Instagram e Beach Wrapped (più sotto). Il fuoco va via
// prima dello scatto: un anello su una scelta sembrerebbe una selezione.
async function salvaFerma(nome) {
  await p.eval('document.activeElement?.blur?.()')
  await sleep(300)
  await salva(nome)
}
const clicca = (sel, testo) => p.eval(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => ${testo}.test(e.getAttribute('aria-label') || e.innerText)); if (!b) return false; b.click(); return true })()`)

// Raccontalo a Solby: il nome scritto, poi compagno, giorno e luogo scelti.
await apri('/crea')
await quando(`document.querySelector('input.crea-input:not(:disabled)')`, 8000, 'il campo della chat')
await p.eval(`document.querySelector('input.crea-input').focus()`)
await p.type('Rimini Open')
await p.key('Enter')
for (let k = 0; k < 3; k++) {
  await quando(`document.querySelector('.crea-dock button')`, 8000, 'le scelte della chat')
  await sleep(400)
  await p.eval(`document.querySelector('.crea-dock button').click()`)
}
await quando(`document.querySelectorAll('.crea-dock button').length > 3`, 8000, 'la domanda sulla categoria')
const solby = await p.eval(`document.querySelector('.crea-log')?.innerText.slice(0, 400) ?? ''`)
await salvaFerma('giro-solby.webp')

// Partita live al Rimini Open: 15–10, l'ultimo punto è nostro.
await apri('/live')
await p.eval(`document.querySelector('main input')?.focus()`)
await p.type('Bianchi / Verdi')
if (!(await clicca('button', '/^Inizia$/'))) throw new Error('landing-shots: manca «Inizia» nella partita live')
await quando(`document.querySelector('.live-punto')`, 8000, 'il segnapunti')
for (const c of 'NLNNLNLLNNLNNLNLNNLLNNLNN') {
  await clicca('.live-punto', c === 'N' ? '/^Punto per noi/' : '/^Punto per Bianchi/')
  await sleep(60)
}
await sleep(600)
const live = await p.eval(`document.querySelector('main')?.innerText.slice(0, 200) ?? ''`)
await salvaFerma('giro-live.webp')

// Il torneo nel diario: Cervia Beach Party, 1° nel tabellone Gold.
await apri('/tornei')
if (!(await clicca('a', '/Cervia Beach Party/'))) throw new Error('landing-shots: manca «Cervia Beach Party» in Tornei')
await quando(`/Cervia Beach Party/.test(document.querySelector('h1')?.textContent ?? '')`, 8000, 'il dettaglio del torneo')
await pronta()
await p.eval('scrollTo(0, 0)')
const torneo = await p.eval(`document.querySelector('main')?.innerText.slice(0, 300) ?? ''`)
await salvaFerma('giro-torneo.webp')

// La sua Storia Instagram: il foglio con l'anteprima, gli stili e i colori.
if (!(await clicca('button', '/^Condividi come storia Instagram$/'))) throw new Error('landing-shots: manca la Storia nel dettaglio')
await quando(`[...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Polaroid')`, 8000, 'il foglio della Storia')
await reteQuieta(600)
await sleep(900)
await salvaFerma('giro-storia.webp')

// I compagni: con chi giochi meglio, e chi è collegato all'app.
await apri('/compagni')
const compagni = await p.eval(`document.querySelector('main')?.innerText.slice(0, 300) ?? ''`)
await salvaFerma('giro-compagni.webp')

// Beach Wrapped: la seconda storia, le vittorie (la prima è la copertina,
// con la foto del diario di prova). Ferma: con reduced-motion la barra non
// avanza da sola; ci si arriva con la freccia, come dalla tastiera.
await apri('/wrapped')
await quando(`document.querySelector('.wrapped-head')`, 8000, 'Beach Wrapped')
await p.eval(`document.querySelector('[role="group"][tabindex="0"]')?.focus()`)
await p.key('ArrowRight')
await quando(`/slide 2 di/i.test(document.querySelector('[role="group"][tabindex="0"]')?.getAttribute('aria-label') ?? '')`, 5000, 'seconda slide')
await p.eval(`document.activeElement?.blur?.()`)
await p.eval(`Promise.all(['900 100px "Geist Variable"', '800 100px "Geist Variable"', '700 100px "Geist Variable"'].map((f) => document.fonts.load(f))).then(() => true)`)
await reteQuieta(600)
await sleep(900)
const wrapped = await p.eval(`(() => (document.querySelector('[class*="wrapped"]')?.innerText ?? document.body.innerText).slice(0, 400))()`)
await salva('wrapped.webp')

// ------------------------------------------------------------- resoconto
console.log(JSON.stringify({ oggi: OGGI_LANDING, home, solby, live, torneo, compagni, wrapped }, null, 2))
for (const f of fatte) {
  const fuori = f.kb * 1024 > PESO_MAX ? '  ⚠ oltre 120 KB' : ''
  console.log(`${f.nome.padEnd(24)} ${f.w}×${f.h}  ${f.kb} KB${fuori}`)
}
const errori = p.consoleMsgs.filter((m) => /exception|\[error\]/.test(m) && !/dashboard_stats|serverviews|127\.0\.0\.1:9|Failed to fetch|ERR_CONNECTION_REFUSED/.test(m))
if (errori.length) console.log('Console:\n' + errori.slice(0, 10).join('\n'))
await p.close()
process.exit(0)
