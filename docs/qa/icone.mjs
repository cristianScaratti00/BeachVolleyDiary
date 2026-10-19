// ============================================================================
// Le icone dell'app installata e la favicon, col marchio della versione D
// (ART_DIRECTION §L10.2): il pallone bianco con la fascia arancio, NUDO su una
// tessera d'inchiostro. Le rasterizza Chrome headless (docs/qa/cdp.mjs):
// nessuna dipendenza in più. Dalla radice del repo:
//
//   node docs/qa/icone.mjs
//
// Il disegno è quello di BrandMark (src/components/Logo.tsx): viewBox
// -32 -32 64 64, pallone r 30, fascia ritagliata nel pallone, filo bianco da 3.
// I colori sono i letterali dei token (LIT in src/lib/theme.ts): --ink,
// --accent, --surface. Se cambia il marchio, si cambia qui e si rilancia.
//
// Le quote sono, come per la favicon di /index.html, il lato del riquadro del
// marchio (le 64 unità del suo viewBox) sul lato dell'icona:
//   icon.svg                     tessera col raggio 26%, marchio al 72%
//   apple-touch-icon.png  180    inchiostro a tutto campo (il sistema
//   icon-192.png / -512.png      arrotonda da sé), marchio al 62%
//   icon-maskable-512.png        a tutto campo, marchio al 56%: dentro la
//                                zona sicura (il cerchio dell'80%)
// Chrome e Porta CDP sono propri (9342, mai la 9333); Chrome si chiude col PID.
// ============================================================================
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, page, sleep, SP } from './cdp.mjs'

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(RADICE, 'public', 'icons')
const PORTA_CDP = Number(process.env.PORTA_CDP ?? 9342)

const INK = '#1C1C1E'
const ARANCIO = '#FF6B1A'
const BIANCO = '#FFFFFF'

/** Il marchio nudo, centrato in (0, 0), nelle unità del suo viewBox (64). */
const marchio = (id) =>
  `<clipPath id="${id}"><circle r="30"/></clipPath>` +
  `<circle r="30" fill="${BIANCO}"/>` +
  `<path d="M-34 -14 C-12 -30 16 -30 34 -12" clip-path="url(#${id})" stroke="${ARANCIO}" stroke-width="10" fill="none"/>` +
  `<circle r="30" fill="none" stroke="${BIANCO}" stroke-width="3"/>`

/** La tessera 64×64: `quota` è il lato del marchio sul lato, `raggio` l'arrotondamento (0 = a tutto campo). */
const icona = ({ quota, raggio = 0 }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64"${raggio ? ` rx="${+(64 * raggio).toFixed(2)}"` : ''} fill="${INK}"/>` +
  `<g transform="translate(32 32) scale(${quota})">${marchio('p')}</g>` +
  `</svg>`

const SVG = { file: 'icon.svg', svg: icona({ quota: 0.72, raggio: 0.26 }) }
const PNG = [
  { file: 'apple-touch-icon.png', lato: 180, svg: icona({ quota: 0.62 }) },
  { file: 'icon-192.png', lato: 192, svg: icona({ quota: 0.62 }) },
  { file: 'icon-512.png', lato: 512, svg: icona({ quota: 0.62 }) },
  { file: 'icon-maskable-512.png', lato: 512, svg: icona({ quota: 0.56 }) },
]

writeFileSync(join(OUT, SVG.file), SVG.svg + '\n')

await launch(PORTA_CDP)
const p = await page(PORTA_CDP)
const fatte = [{ file: SVG.file, kb: +(statSync(join(OUT, SVG.file)).size / 1024).toFixed(1) }]
try {
  for (const { file, lato, svg } of PNG) {
    await p.send('Emulation.setDeviceMetricsOverride', { width: lato, height: lato, deviceScaleFactor: 1, mobile: false })
    const src = 'data:image/svg+xml,' + encodeURIComponent(svg)
    await p.go('data:text/html,' + encodeURIComponent(`<!doctype html><html><body style="margin:0;background:${INK}"><img src="${src}" width="${lato}" height="${lato}" style="display:block"></body></html>`), 100)
    for (let i = 0; i < 50 && !(await p.eval(`document.images[0]?.complete && document.images[0].naturalWidth > 0`)); i++) await sleep(50)
    const r = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: lato, height: lato, scale: 1 } })
    writeFileSync(join(OUT, file), Buffer.from(r.data, 'base64'))
    fatte.push({ file, lato, kb: +(statSync(join(OUT, file)).size / 1024).toFixed(1) })
  }
} finally {
  await p.close()
  try {
    process.kill(Number(readFileSync(`${SP}/chrome-${PORTA_CDP}.pid`, 'utf8')), 'SIGTERM')
  } catch {}
}
for (const f of fatte) console.log(`${f.file.padEnd(24)} ${f.lato ? `${f.lato}×${f.lato}` : 'vettoriale'}  ${f.kb} KB`)
