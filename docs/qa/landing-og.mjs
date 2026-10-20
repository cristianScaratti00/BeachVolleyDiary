// ============================================================================
// L'anteprima social della landing (`og:image`, ART_DIRECTION §L5): un PNG
// 1200×630 con la composizione dell'hero. A sinistra il marchio e il titolo
// «Il diario delle tue partite di beach volley.»; a destra la vetrina color
// pesca con la Home vera nel telefono, tagliata dal bordo in basso. Nessun
// altro testo: le piattaforme ci scrivono già il titolo sotto.
//
// È la landing VERA (marchio dell'app, Geist del sito, la schermata di
// public/presentazione/screens), con le sole regole di composizione qui
// sotto. Dalla radice del repo:
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

// La composizione: solo l'hero, e dentro solo marchio, titolo e vetrina.
const COMPOSIZIONE = `
  .skip-link, .testata-nav, .occhiello, .eroe-frase, .eroe-azioni,
  main > section:not(#inizio) { display: none !important; }
  .testata { position: absolute; left: 0; top: 0; width: 640px; z-index: 1; }
  .testata .dentro { max-width: none; padding: 0 0 0 80px !important; }
  .testata-riga { border: 0 !important; padding: 64px 0 0 !important; }
  .testata-marchio { font-size: 26px !important; gap: 14px !important; }
  .testata-marchio .marchio { width: 44px !important; height: 44px !important; }
  .eroe-dentro { max-width: none !important; height: ${H}px; padding: 0 0 0 80px !important; flex-wrap: nowrap !important; align-items: center !important; gap: 48px !important; }
  .eroe-testo h1 { font-size: 66px !important; max-width: 560px; }
  .eroe-vetrina { flex: 0 0 440px !important; align-self: flex-end; height: 566px; margin-right: 72px; padding: 44px 0 0 !important; border-bottom: 0 !important; border-radius: 32px 32px 0 0 !important; overflow: hidden; align-items: flex-start; }
  .eroe-vetrina .telefono { width: 320px !important; }
`

await launch(PORTA_CDP)
const p = await page(PORTA_CDP)
await p.viewport(W, H, { mobile: false, dpr: 1, touch: false })
await p.media([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.go(BASE, 1500)
await p.eval(`(async () => {
  const s = document.createElement('style')
  s.textContent = ${JSON.stringify(COMPOSIZIONE)}
  document.head.append(s)
  window.scrollTo(0, 0)
  await document.fonts.ready
  await Promise.all([...document.images].filter((i) => i.closest('#inizio')).map((i) => i.decode().catch(() => {})))
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
