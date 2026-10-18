// ============================================================================
// Solo tastiera: Tab su ogni rotta, e per ogni fermata se l'anello c'è, se un
// contenitore con `overflow` lo taglia (CLIP) e se una barra lo copre
// (covered: WCAG 2.4.11). ALL=1 stampa anche le fermate buone, SHOT=1 ritaglia
// uno screenshot di ognuna.
// Falsi positivi noti: `ui-card-link` e `ui-search-input` disegnano l'anello
// sul genitore (`:has`, `:focus-within`), la mappa su un livello sopra le tile.
//   VP=390,844 R=/,/tornei node docs/qa/tab.mjs
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'

const [w, h] = (process.env.VP ?? '390,844').split(',').map(Number)
const routes = (process.env.R ?? '/,/tornei,/tornei/timeline,/compagni,/profilo,/statistiche,/oggi,/profilo/segnala').split(',')
const MAX = Number(process.env.MAX ?? 80)

const PROBE = `(() => {
  const el = document.activeElement
  if (!el || el === document.body) return { none: true }
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 40)
  const has = (x, pseudo) => { const c = getComputedStyle(x, pseudo); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 }
  let ring = has(el) ? 'outline ' + cs.outlineWidth + ' ' + cs.outlineColor + ' off ' + cs.outlineOffset : (cs.boxShadow !== 'none' ? 'shadow' : 'NONE')
  // L'anello può stare su un antenato (card con :has, ricerca con :focus-within,
  // mappa su un ::after della cornice): conta anche quello.
  if (ring === 'NONE') for (let a = el.parentElement, i = 0; a && i < 4; a = a.parentElement, i++) {
    if (has(a) || has(a, '::after')) { ring = 'on ' + String(a.className).split(' ')[0] + (has(a) ? '' : '::after'); break }
  }
  // visible-ring clipping: walk ancestors with overflow != visible and check rect inflated by outline
  const ow = Math.max(0, parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset))
  const box = { l: r.left - ow, t: r.top - ow, r: r.right + ow, b: r.bottom + ow }
  let clip = null
  if (has(el)) for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const s = getComputedStyle(a)
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
      const ar = a.getBoundingClientRect()
      if (box.l < ar.left - 0.5 || box.t < ar.top - 0.5 || box.r > ar.right + 0.5 || box.b > ar.bottom + 0.5) {
        if (!(a.tagName === 'MAIN' && s.overflowY === 'auto')) { clip = (a.className || a.tagName).toString().slice(0, 40); break }
      }
    }
  }
  // obscured: sample points; is the topmost element at the centre part of el?
  // Centro e due punti sull'asse, rientrati di mezza altezza: gli angoli di
  // una capsula sono fuori dalla forma e colpirebbero chi sta sotto.
  const inset = Math.min(r.height / 2, r.width / 4)
  const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + inset, r.top + r.height / 2], [r.right - inset, r.top + r.height / 2]]
  let covered = 0, coveredBy = ''
  for (const [x, y] of pts) {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { covered++; coveredBy = 'offscreen'; continue }
    const top = document.elementFromPoint(x, y)
    if (top && top !== el && !el.contains(top) && !top.contains(el)) { covered++; coveredBy = (top.closest('[class]')?.className || top.tagName).toString().slice(0, 30) }
  }
  return { rx: r.left + scrollX, ry: r.top + scrollY, rw: r.width, rh: r.height, tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', cls: (el.className?.baseVal ?? el.className ?? '').toString().split(' ')[0], name, ring, clip, covered, coveredBy, y: Math.round(r.top), hgt: Math.round(r.height), wid: Math.round(r.width) }
})()`

await launch()
const p = await page()
await p.viewport(w, h, { mobile: w < 900, touch: false })
for (const route of routes) {
  await p.go(`${BASE}?r=${encodeURIComponent(route)}`, 1100)
  console.log(`\n=== ${route} @${w}`)
  const seen = new Set()
  for (let i = 0; i < MAX; i++) {
    await p.key('Tab')
    await sleep(60)
    const s = await p.eval(PROBE)
    if (s.none) { console.log('  (body)'); break }
    const key = s.tag + s.cls + s.name + s.y
    if (seen.has(key)) { console.log('  (cycled)'); break }
    seen.add(key)
    const bad = s.ring === 'NONE' || s.clip || s.covered >= 2
    if (process.env.SHOT && (bad || process.env.ALL)) {
      const x = Math.max(0, s.rx - 24), y = Math.max(0, s.ry - 24)
      const cw = Math.min(w - x, s.rw + 48), ch = s.rh + 48
      if (cw > 4 && ch > 4) await p.shot(`f-${w}-${route.replace(/\W+/g, '_')}-${String(i).padStart(2, '0')}`, { clip: { x, y, width: cw, height: ch, scale: 1 } })
    }
    if (bad || process.env.ALL) console.log(`${bad ? ' ✗' : '  '} ${s.tag}${s.role ? '[' + s.role + ']' : ''}.${s.cls} «${s.name}» ring=${s.ring}${s.clip ? ' CLIP:' + s.clip : ''}${s.covered ? ' covered' + s.covered + ':' + s.coveredBy : ''} y=${s.y} ${s.wid}x${s.hgt}`)
  }
}
await p.close()
process.exit(0)
