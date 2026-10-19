// ============================================================================
// axe nel browser vero (in jsdom il contrasto non si misura): ogni rotta più
// gli overlay principali, a 390 e 1280. FLAT=1 spegne i gradienti del fondo e
// il riflesso del vetro, che altrimenti lasciano il contrasto «incompleto».
//   node docs/qa/axe.mjs            W=390,1280  ONLY=<scena>  INC=1 (incompleti)
// ============================================================================
import { readFileSync } from 'node:fs'
import { launch, page, BASE, sleep } from './cdp.mjs'

const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8')

const widths = (process.env.W ?? '390,1280').split(',').map(Number)
const media = process.env.MEDIA ? JSON.parse(process.env.MEDIA) : []

async function runAxe(p) {
  if (process.env.FLAT) await p.eval(`(() => { const s = document.createElement('style'); s.textContent = 'body{background-image:none!important} [data-material]{background-image:none!important}'; document.head.append(s) })()`)
  await p.eval(`window.axe || (0, eval)(${JSON.stringify(AXE)})`)
  return p.eval(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }).then(r => ({
    v: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n').slice(1, 2).join(' ').slice(0, 160)) })),
    inc: r.incomplete.filter(v => v.id === 'color-contrast').map(v => ({ id: v.id, n: v.nodes.length, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.any[0]?.message || '').slice(0, 120)) })),
  }))`)
}

const firstHref = (base) => `[...document.querySelectorAll('a[href^="${base}/"]')].map(a => a.getAttribute('href')).find(h => /[0-9a-f]{8}-/.test(h))`

const SCENES = [
  ...['/', '/tornei', '/tornei/timeline', '/tornei/mappa', '/compagni', '/profilo', '/statistiche', '/oggi', '/profilo/segnala', '/profilo/segnalazioni', '/crea', '/nope', '/wrapped'].map((r) => ({ name: r, route: r })),
  { name: 'torneo-detail', route: '/tornei', act: async (p) => { await p.clickSel(`a[href="${await p.eval(firstHref('/tornei'))}"]`); await sleep(900) } },
  { name: 'torneo-cervia', route: '/tornei', act: async (p) => { const h = await p.eval(`[...document.querySelectorAll('a')].find(a => a.textContent.includes('Cervia'))?.getAttribute('href')`); await p.clickSel(`a[href="${h}"]`); await sleep(900) } },
  { name: 'compagno-detail', route: '/compagni', act: async (p) => { await p.clickSel(`a[href="${await p.eval(firstHref('/compagni'))}"]`); await sleep(900) } },
  { name: 'menu-plus', route: '/', act: async (p, w) => { await p.clickSel(w >= 900 ? '.ui-sidebar-new, .ui-sidebar [aria-haspopup]' : '.ui-tab-plus'); await sleep(700) } },
  { name: 'sheet-torneo', route: '/', act: async (p, w) => { await p.clickSel(w >= 900 ? '.ui-sidebar-new, .ui-sidebar [aria-haspopup]' : '.ui-tab-plus'); await sleep(600); await p.eval(`[...document.querySelectorAll('[role=menuitem]')][0].click()`); await sleep(900) } },
  { name: 'sheet-torneo-altri', route: '/', act: async (p, w) => { await p.clickSel(w >= 900 ? '.ui-sidebar-new, .ui-sidebar [aria-haspopup]' : '.ui-tab-plus'); await sleep(600); await p.eval(`[...document.querySelectorAll('[role=menuitem]')][0].click()`); await sleep(900); await p.eval(`[...document.querySelectorAll('button[aria-expanded]')].find(b => /dettagli/i.test(b.textContent))?.click()`); await sleep(700) } },
  { name: 'sheet-partita', route: '/', act: async (p, w) => { await p.clickSel(w >= 900 ? '.ui-sidebar-new, .ui-sidebar [aria-haspopup]' : '.ui-tab-plus'); await sleep(600); await p.eval(`[...document.querySelectorAll('[role=menuitem]')][1].click()`); await sleep(900) } },
  { name: 'sheet-checkin', route: '/', act: async (p, w) => { await p.clickSel(w >= 900 ? '.ui-sidebar-new, .ui-sidebar [aria-haspopup]' : '.ui-tab-plus'); await sleep(600); await p.eval(`[...document.querySelectorAll('[role=menuitem]')][2]?.click()`); await sleep(900) } },
]

await launch()
const p = await page()
if (media.length) await p.media(media)
const out = []
for (const w of widths) {
  await p.viewport(w, w >= 900 ? 800 : 844)
  for (const s of SCENES) {
    if (process.env.ONLY && !s.name.includes(process.env.ONLY)) continue
    await p.go(`${BASE}?r=${encodeURIComponent(s.route)}`, 1100)
    try {
      if (s.act) await s.act(p, w)
      const r = await runAxe(p)
      out.push({ w, scene: s.name, ...r })
    } catch (e) {
      out.push({ w, scene: s.name, err: String(e).slice(0, 200) })
    }
  }
}
for (const o of out) {
  if (o.err) { console.log(`${o.w} ${o.scene} ERR ${o.err}`); continue }
  console.log(`${o.w} ${o.scene}: ${o.v.length} violations, ${o.inc.reduce((a, b) => a + b.n, 0)} contrast-incomplete`)
  for (const v of o.v) console.log(`   ✗ ${v.id} (${v.impact}) ×${v.n}\n      ${v.nodes.join('\n      ')}`)
  if (process.env.INC) for (const v of o.inc) console.log(`   ? ${v.id} ×${v.n}\n      ${v.nodes.join('\n      ')}`)
}
await p.close()
process.exit(0)
