// ============================================================================
// Prestazioni sulla build di PRODUZIONE dell'anteprima (vedi POLISH.md per
// come compilarla), con la CPU rallentata (CPU=4 ≈ un Android di fascia media).
// Per ogni interazione: fotogrammi (p95, massimo, quanti sopra 25ms), durata
// dell'interazione (Event Timing, come INP) e costo di layout/stile/paint dal
// trace. In più FCP, LCP, CLS e TBT del primo caricamento.
//   PBASE=http://127.0.0.1:4173/docs/preview/index.html QS=estremo node docs/qa/perf.mjs
// ============================================================================
import { launch, page, sleep } from './cdp.mjs'

const BASE = process.env.PBASE ?? 'http://127.0.0.1:4173/docs/preview/index.html'
const CPU = Number(process.env.CPU ?? 4)
const QS = process.env.QS ? '&' + process.env.QS : ''
const [w, h] = (process.env.VP ?? '390,844').split(',').map(Number)

const INIT = `
window.__perf = { cls: 0, shifts: [], lcp: 0, lt: [], ev: [] };
new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { __perf.cls += e.value; __perf.shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map(s => (s.node && (s.node.className || s.node.nodeName)) + '').slice(0, 3) }) } } }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __perf.lcp = Math.round(e.startTime) }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __perf.lt.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) __perf.ev.push({ n: e.name, d: Math.round(e.duration), proc: Math.round(e.processingEnd - e.processingStart), t: Math.round(e.startTime) }) }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
window.__frames = (ms) => new Promise(res => { const ts = []; const t0 = performance.now(); const step = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(step); else { const d = ts.slice(1).map((x, i) => x - ts[i]); d.sort((a, b) => a - b); res({ frames: d.length, p50: +d[Math.floor(d.length * .5)]?.toFixed(1), p95: +d[Math.floor(d.length * .95)]?.toFixed(1), max: +d[d.length - 1]?.toFixed(1), long: d.filter(x => x > 25).length }) } }; requestAnimationFrame(step) });
`

await launch()
const p = await page()
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT })
await p.viewport(w, h)
await p.send('Emulation.setCPUThrottlingRate', { rate: CPU })

const traceEvents = []
p.on('Tracing.dataCollected', (d) => traceEvents.push(...d.value))
async function trace(fn) {
  traceEvents.length = 0
  await p.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' })
  const r = await fn()
  const done = p.once('Tracing.tracingComplete', 20000)
  await p.send('Tracing.end')
  await done
  const sum = {}
  for (const e of traceEvents) {
    if (e.ph !== 'X' || !e.dur) continue
    if (!['Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'Layerize', 'RasterTask', 'FunctionCall', 'EvaluateScript', 'ParseHTML', 'HitTest', 'IntersectionObserverController::computeIntersections'].includes(e.name)) continue
    sum[e.name] = (sum[e.name] ?? 0) + e.dur / 1000
  }
  const layouts = traceEvents.filter((e) => e.name === 'Layout' && e.ph === 'X').length
  const recalcs = traceEvents.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X').length
  return { ...r, cost: Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, +v.toFixed(1)])), layouts, recalcs }
}
const frames = (ms) => p.eval(`__frames(${ms})`)
const evs = async () => { const e = await p.eval('__perf.ev.splice(0)'); return e.length ? Math.max(...e.map((x) => x.d)) : 0 }
const center = (sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
const tap = async (sel) => { const c = await center(sel); if (!c) throw new Error('missing ' + sel); await p.click(c[0], c[1]) }

const out = {}
// 1. Cold load of Home
await p.go(`${BASE}?r=/${QS}`, 3000)
out.load = await p.eval(`(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: Math.round(fcp?.startTime ?? 0), lcp: __perf.lcp, cls: +__perf.cls.toFixed(4), shifts: __perf.shifts, tbt: __perf.lt.reduce((a, x) => a + Math.max(0, x.d - 50), 0), longtasks: __perf.lt, dcl: Math.round(n.domContentLoadedEventEnd) } })()`)
await p.eval('__perf.ev.length = 0')

// 2. ＋ menu open (spring) and close
out.menuOpen = await trace(async () => { const f = frames(700); await tap(w >= 900 ? 'button[aria-haspopup=menu]' : '.ui-tab-plus'); return { ...(await f), inp: await evs() } })
await sleep(300)
// 3. Nuovo torneo: menu → sheet swap
out.sheetOpen = await trace(async () => { const f = frames(800); await tap('[role=menuitem]'); return { ...(await f), inp: await evs() } })
await sleep(300)
// 4. Disclosure «Altri dettagli» (the only animated height)
out.disclosure = await trace(async () => { const f = frames(600); const sel = await p.eval(`(() => { const b = [...document.querySelectorAll('[role=dialog] button[aria-expanded]')].find(b => /dettagli/i.test(b.textContent)); if (!b) return null; b.id = b.id || 'qa-disc'; return '#' + CSS.escape(b.id) })()`); if (sel) await tap(sel); return { ...(await f), inp: await evs() } })
await sleep(300)
// 5. Close the sheet (Esc; it's clean)
out.sheetClose = await trace(async () => { const f = frames(600); await p.key('Escape'); return { ...(await f), inp: await evs() } })
await sleep(400)
// 6. Tab switch Home → Tornei (route change, no transition)
out.toTornei = await trace(async () => { const f = frames(800); await tap(w >= 900 ? '.ui-sidebar-item[href="/tornei"]' : '.ui-tab[href="/tornei"]'); return { ...(await f), inp: await evs() } })
await sleep(400)
// 7. Segmented: Lista → Timeline (lazy chunk)
out.toTimeline = await trace(async () => { const f = frames(900); await p.eval(`[...document.querySelectorAll('.ui-segment')][1].click()`); return { ...(await f), inp: await evs() } })
await sleep(400)
// 8. Segmented: → Mappa (Leaflet chunk + tiles)
out.toMappa = await trace(async () => { const f = frames(1500); await p.eval(`[...document.querySelectorAll('.ui-segment')][2].click()`); return { ...(await f), inp: await evs() } })
await sleep(600)
// 9. Back to Lista; scroll the long list under the glass TabBar
await p.eval(`[...document.querySelectorAll('.ui-segment')][0].click()`)
await sleep(800)
out.scroll = await trace(async () => {
  const f = frames(1800)
  await p.send('Input.synthesizeScrollGesture', { x: w / 2, y: h / 2, yDistance: -2400, speed: 2000, gestureSourceType: w >= 900 ? 'mouse' : 'touch' })
  return { ...(await f) }
})
// 10. Open a torneo detail from the list
await p.eval('scrollTo(0, 0); document.querySelector("main").scrollTop = 0')
await sleep(300)
out.toDetail = await trace(async () => { const f = frames(1000); await tap('a.ui-card-link'); return { ...(await f), inp: await evs() } })
out.clsTotal = await p.eval('({ cls: +__perf.cls.toFixed(4), shifts: __perf.shifts.slice(-12) })')
out.animations = await p.eval(`document.getAnimations().map(a => a.effect?.getKeyframes?.().flatMap(k => Object.keys(k).filter(x => !['offset','easing','composite','computedOffset'].includes(x)))).flat().filter((v, i, s) => s.indexOf(v) === i)`)
console.log(JSON.stringify(out, null, 1))
await p.close()
process.exit(0)
