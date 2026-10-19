// ============================================================================
// Le schermate del telefono della landing (/presentazione), scattate
// dall'anteprima VERA (docs/preview) con i dati di prova: UX §L6.2, LC10, ART
// §L10.5–§L10.6. Si rigenerano con un comando, dalla radice del repo:
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
//     spostano col calendario. DEVE coincidere con `OGGI_LANDING` di
//     `docs/preview/dati.ts`, da cui `presentazione/js/generati/dati.ts`
//     prende i numeri del sito: schermate e numeri dicono la stessa cosa;
//   - 390×844 a dpr 2, telefono col tocco, movimento ridotto (ogni umore di
//     Pallo e ogni numero al suo fotogramma fermo: niente scatti a metà
//     salita). Nient'altro è nascosto: è l'app com'è;
//   - WebP qualità 82: le quattro schermate dei capitoli (780×1688), il
//     foglio «Nuovo torneo», e le tre impaginazioni della Storia di un
//     torneo vinto, ritagliate sulla tela (540×960).
//
// Escono in public/presentazione/screens/. Per ognuna stampa misure e peso
// (obiettivo ≤ 120 KB, UX §L13).
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

/** Clic sull'elemento (il primo che corrisponde, o quello col testo). */
async function tocca(sel, testo) {
  const c = await p.eval(`(() => {
    const tutti = [...document.querySelectorAll(${JSON.stringify(sel)})]
    const e = ${testo ? `tutti.find((x) => x.textContent.includes(${JSON.stringify(testo)}))` : 'tutti[0]'}
    if (!e) return null
    e.scrollIntoView({ block: 'center' })
    const r = e.getBoundingClientRect()
    return [r.x + r.width / 2, r.y + r.height / 2]
  })()`)
  if (!c) throw new Error(`manca ${sel}${testo ? ` «${testo}»` : ''}`)
  await p.click(c[0], c[1])
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

// ------------------------------------------------- i quattro capitoli
await apri('/')
const home = await p.eval(`(() => {
  const t = (s) => document.querySelector(s)?.textContent?.trim() ?? null
  return {
    frase: t('h1'),
    bolla: [...document.querySelectorAll('.home-pallo-bolla, [class*="consiglio"], [class*="bolla"]')].map((e) => e.textContent.trim()).filter(Boolean)[0] ?? null,
    testo: document.querySelector('main')?.innerText.slice(0, 1200) ?? null,
  }
})()`)
await salva('home.webp')

await apri('/tornei/mappa')
// Le tile di OpenStreetMap: tutte caricate, e l'attribuzione in vista.
await quando(`document.querySelectorAll('.leaflet-tile').length > 0 && [...document.querySelectorAll('.leaflet-tile')].every((i) => i.complete && i.naturalWidth > 0)`, 25000, 'tile OSM')
await quando(`/OpenStreetMap/.test(document.querySelector('.leaflet-control-attribution')?.textContent ?? '')`, 5000, 'attribuzione OSM')
await reteQuieta(1000)
await sleep(600)
const mappa = await p.eval(`({ pin: document.querySelectorAll('.leaflet-marker-icon').length, attribuzione: document.querySelector('.leaflet-control-attribution')?.textContent.trim(), testo: document.querySelector('main')?.innerText.slice(0, 600) })`)
await salva('mappa.webp')

await apri('/diario')
const diario = await p.eval(`(() => { const t = document.querySelector('main')?.innerText ?? ''; return t.slice(0, 400) })()`)
await salva('diario.webp')

await apri('/compagni')
await salva('compagni.webp')

// ------------------------------------------------- il foglio «Nuovo torneo»
await apri('/')
await tocca('.ui-tab-plus')
await quando(`document.querySelector('[role="menuitem"]')`, 5000, 'menu ＋')
await tocca('[role="menuitem"]', 'Torneo')
await quando(`[...document.querySelectorAll('[role="dialog"]')].some((d) => /Nuovo torneo/.test(d.textContent))`, 5000, 'foglio Nuovo torneo')
await sleep(900)
await p.eval('document.activeElement?.blur?.()')
await sleep(200)
await salva('torneo.webp')

// ------------------------------------------------- la Storia, tre impaginazioni
await apri('/tornei')
await tocca('main a, main button, main [role="link"]', 'Cervia Beach Party')
await quando(`/Cervia Beach Party/.test(document.querySelector('h1')?.textContent ?? '')`, 8000, 'dettaglio del torneo')
await pronta()
await tocca('[aria-label="Storia Instagram"]')
await quando(`document.querySelector('.storia-canvas')`, 8000, 'Storia')
await p.eval(`Promise.all(['900 100px "Geist Variable"', '800 100px "Geist Variable"', '700 100px "Geist Variable"', '600 100px "Geist Variable"', '500 100px "Geist Variable"'].map((f) => document.fonts.load(f))).then(() => true)`)
const STORIE = [
  { nome: 'storia-tabellone.webp', layout: 'Tabellone', colore: 'Inchiostro' },
  { nome: 'storia-foto.webp', layout: 'Foto', colore: 'Sabbia' },
  { nome: 'storia-polaroid.webp', layout: 'Polaroid', colore: 'Arancio' },
]
for (const s of STORIE) {
  await tocca('[role="radiogroup"][aria-label="Layout della storia"] [role="radio"]', s.layout)
  await tocca(`[role="radiogroup"][aria-label="Colore della storia"] [role="radio"][aria-label="${s.colore}"]`)
  await reteQuieta(600)
  await sleep(700)
  // La tela 1080×1920 portata a 270×480 px CSS (× dpr 2 = 540×960): la stessa
  // tela del PNG, a una scala tonda. Il PNG della Storia è un rettangolo: gli
  // angoli tondi sono della cornice d'anteprima, non della tela.
  const r = await p.eval(`(() => {
    const box = document.querySelector('.storia-preview')
    const tela = document.querySelector('.storia-canvas')
    Object.assign(box.style, { width: '270px', height: '480px', borderRadius: '0' })
    tela.style.transform = 'scale(0.25)'
    const r = tela.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })()`)
  await sleep(300)
  await salva(s.nome, { clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } })
}

// ------------------------------------------------------------- resoconto
console.log(JSON.stringify({ oggi: OGGI_LANDING, home, mappa, diario }, null, 2))
for (const f of fatte) {
  const fuori = f.kb * 1024 > PESO_MAX ? '  ⚠ oltre 120 KB' : ''
  console.log(`${f.nome.padEnd(24)} ${f.w}×${f.h}  ${f.kb} KB${fuori}`)
}
const errori = p.consoleMsgs.filter((m) => /exception|\[error\]/.test(m) && !/dashboard_stats|serverviews|127\.0\.0\.1:9|Failed to fetch|ERR_CONNECTION_REFUSED/.test(m))
if (errori.length) console.log('Console:\n' + errori.slice(0, 10).join('\n'))
await p.close()
process.exit(0)
