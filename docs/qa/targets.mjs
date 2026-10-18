// ============================================================================
// Bersagli al tocco (UX §8.6: 44 sempre; WCAG 2.5.8: 24). Misura l'area che
// risponde davvero con `elementFromPoint`, quindi conta anche le estensioni
// con `::after`. ✗ sotto 44, ✗✗ sotto 24.
//   VP=390,844 node docs/qa/targets.mjs
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'
const [w, h] = (process.env.VP ?? '390,844').split(',').map(Number)
const routes = (process.env.R ?? '/,/tornei,/tornei/timeline,/tornei/mappa,@torneo,/compagni,@compagno,/profilo,/statistiche,/oggi,/profilo/segnala').split(',')
const CHECK = `(() => {
  const out = []
  const els = [...document.querySelectorAll('a[href], button, input, select, textarea, [role=button], [tabindex="0"]')]
  for (const el of els) {
    if (el.closest('.sr-only, .skip-link, [inert], [aria-hidden=true]')) continue
    if (el.closest('.leaflet-container') && !el.classList.contains('leaflet-marker-icon')) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const hits = (x, y) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t)) }
    // grow outwards until the hit test fails
    const reach = (dx, dy, start) => { let d = start; while (d < 40 && hits(cx + dx * (d + 1), cy + dy * (d + 1))) d++; return d }
    // +1: il pixel del centro (le due semirette contano dall'ultimo pixel colpito).
    const effH = reach(0, -1, r.height / 2) + reach(0, 1, r.height / 2) + 1
    const effW = reach(-1, 0, r.width / 2) + reach(1, 0, r.width / 2) + 1
    if (!hits(cx, cy)) continue // covered (tab bar etc.)
    if (effH < 44 || effW < 44) {
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 28)
      out.push((effH < 24 || effW < 24 ? '✗✗ ' : '✗ ') + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' «' + name + '» box ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' hit ' + Math.round(effW) + 'x' + Math.round(effH))
    }
  }
  return [...new Set(out)]
})()`
await launch()
const p = await page()
await p.viewport(w, h)
for (const r0 of routes) {
  if (r0.startsWith('@')) {
    const base = r0 === '@torneo' ? '/tornei' : '/compagni'
    await p.go(`${BASE}?r=${base}`, 900)
    const href = await p.eval(`[...document.querySelectorAll('a[href^="${base}/"]')].map(a => a.getAttribute('href')).find(h => /[0-9a-f]{8}-/.test(h))`)
    await p.clickSel(`a[href="${href}"]`); await sleep(1000)
  } else await p.go(`${BASE}?r=${encodeURIComponent(r0)}`, 1100)
  const all = []
  const H = await p.eval('document.documentElement.scrollHeight')
  for (let y = 0; y < H; y += h - 200) {
    await p.eval(`scrollTo(0, ${y})`); await sleep(120)
    all.push(...(await p.eval(CHECK)))
  }
  const uniq = [...new Set(all)]
  console.log(`\n== ${r0}: ${uniq.length}`)
  for (const u of uniq) console.log('  ' + u)
}
await p.close(); process.exit(0)
