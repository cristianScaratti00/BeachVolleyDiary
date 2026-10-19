// ============================================================================
// L'anteprima social della landing (`og:image`, ART_DIRECTION §L10.8): un PNG
// 1200×630 con la composizione dell'hero da 900px. Il tramonto con la scena
// a destra, il velo di lato, «Ogni partita, nel tuo diario.» in Geist 800 da
// 76 su due righe a 88 dal bordo, il marchio nudo da 48 sopra il titolo, e
// Pallo `saluta` da 300 in piedi sulla sabbia. Nessun altro testo: le
// piattaforme ci scrivono già il titolo sotto.
//
// È la landing VERA (scena e Pallo dagli snapshot, Geist del sito), col
// movimento ridotto (il fotogramma fermo) e le sole regole di composizione
// qui sotto. Dalla radice del repo:
//
//   node docs/qa/landing-og.mjs
//
// Avvia un suo Vite (porta 5196, mai la 5173 dell'utente) e un suo Chrome
// (CDP 9343, mai la 9333), e li chiude col PID. Con BASE nell'ambiente usa
// quel server. Esce in public/presentazione/og.png.
// ============================================================================
import { spawn } from 'node:child_process'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, page, sleep, SP } from './cdp.mjs'

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(RADICE, 'public', 'presentazione', 'og.png')
const PORTA_VITE = Number(process.env.PORTA_VITE ?? 5196)
const PORTA_CDP = Number(process.env.PORTA_CDP ?? 9343)
const W = 1200
const H = 630

let vite = null
let BASE = process.env.BASE
if (!BASE) {
  vite = spawn(process.execPath, [join(RADICE, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORTA_VITE), '--strictPort', '--host', '127.0.0.1'], {
    cwd: RADICE,
    env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:9', VITE_SUPABASE_ANON_KEY: 'x' },
    stdio: 'ignore',
  })
  BASE = `http://127.0.0.1:${PORTA_VITE}/presentazione/`
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

// La composizione: solo l'hero, e dentro solo titolo, marchio, scena e Pallo.
const COMPOSIZIONE = `
  .barra, .avanza, .guida, .guida-bolla, .guida-menu, .skip-link,
  .eroe-frase, .eroe-cta, .eroe-riga, .eroe-comandi, .fermo-nota,
  main > section:not(#inizio), footer, .velo, .foglio { display: none !important; }
  .eroe { min-height: ${H}px !important; height: ${H}px; padding: 0 !important; justify-content: center !important; }
  .eroe-testo { position: static !important; padding: 0 0 0 88px !important; max-width: none !important; }
  .eroe h1 { font-size: 76px !important; line-height: 1 !important; letter-spacing: -0.045em !important; max-width: 540px; }
  .eroe-marchio { display: block !important; position: absolute !important; left: 88px !important; top: var(--og-marchio) !important; }
  .eroe-marchio > span { display: none !important; }
  .eroe-marchio .marchio { width: 48px !important; height: 48px !important; }
  .eroe-pallo { width: 300px !important; right: 15% !important; bottom: 6% !important; }
`

await launch(PORTA_CDP)
const p = await page(PORTA_CDP)
await p.viewport(W, H, { mobile: false, dpr: 1, touch: false })
await p.media([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.go(BASE + '?nuova', 1500)
await p.eval(`(async () => {
  const s = document.createElement('style')
  s.textContent = ${JSON.stringify(COMPOSIZIONE)}
  document.head.append(s)
  window.scrollTo(0, 0)
  await document.fonts.ready
  // Il marchio 24px sopra il titolo, comunque vada a capo.
  const h = document.querySelector('.eroe h1').getBoundingClientRect()
  document.documentElement.style.setProperty('--og-marchio', (h.top - 24 - 48) + 'px')
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
})()`)
await sleep(400)
const r = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } })
writeFileSync(OUT, Buffer.from(r.data, 'base64'))
console.log(`og.png ${W}×${H} · ${(statSync(OUT).size / 1024).toFixed(1)} KB → ${OUT}`)
const errori = p.consoleMsgs.filter((m) => m.startsWith('[error]') || m.startsWith('[exception]'))
if (errori.length) console.log(errori.join('\n'))
await p.close()
process.exit(0)
