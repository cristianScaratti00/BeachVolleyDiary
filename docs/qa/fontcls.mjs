// ============================================================================
// Quello che vede un telefono non Apple: la pila senza -apple-system e Inter
// che arriva in ritardo (display=swap, DELAY ms). Misura lo spostamento dello
// scambio di font.
//   PBASE=… DELAY=1500 node docs/qa/fontcls.mjs
// ============================================================================
import { launch, page, sleep } from './cdp.mjs'
const BASE = process.env.PBASE ?? 'http://127.0.0.1:4173/docs/preview/index.html'
const DELAY = Number(process.env.DELAY ?? 1500)
const [w, h] = (process.env.VP ?? '390,844').split(',').map(Number)
await launch()
const p = await page()
await p.viewport(w, h)
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__cls = 0; window.__shifts = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) { __cls += e.value; __shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).slice(0, 3).map(s => s.node ? (s.node.className || s.node.nodeName) + '' : '?') }) } }).observe({ type: 'layout-shift', buffered: true });
  document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = ':root{--font-ui:"Inter","Segoe UI",Roboto,system-ui,sans-serif !important}'; document.head.append(s) });
` })
await p.send('Fetch.enable', { patterns: [{ urlPattern: '*fonts.gstatic.com*' }] })
p.on('Fetch.requestPaused', async (e) => { await sleep(DELAY); await p.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}) })
for (const r of (process.env.R ?? '/,/tornei,/profilo').split(',')) {
  await p.go(`${BASE}?r=${encodeURIComponent(r)}`, DELAY + 1500)
  const res = await p.eval(`({ cls: +__cls.toFixed(4), fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).slice(0, 4), shifts: __shifts.slice(0, 6) })`)
  console.log(r, JSON.stringify(res))
}
await p.close(); process.exit(0)
