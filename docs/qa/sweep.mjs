// ============================================================================
// Ogni rotta a più larghezze: screenshot, scroll orizzontale, testo che esce
// dal suo riquadro (SPILL) o tagliato senza «…» (CLIP), superfici con
// backdrop-filter visibili (budget 3), immagini senza misure, errori in
// console. Con QS=estremo usa i dati della prova di resistenza.
//   W=320,390,768,1280 QS=estremo node docs/qa/sweep.mjs <etichetta> > out.json
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'

const tag = process.argv[2] ?? 'before'
const widths = (process.env.W ?? '390,1280').split(',').map(Number)
const ROUTES = (process.env.R ?? '/,/tornei,/tornei/timeline,/tornei/mappa,@torneo,/compagni,@compagno,/profilo,/statistiche,/oggi,/profilo/segnala,/profilo/segnalazioni,/crea,/nope').split(',')

await launch()
const p = await page()
const report = []
for (const w of widths) {
  const h = w >= 900 ? 800 : w === 320 ? 568 : 844
  await p.viewport(w, h)
  for (const r0 of ROUTES) {
    let r = r0
    if (r === '@torneo' || r === '@compagno') {
      const base = r === '@torneo' ? '/tornei' : '/compagni'
      await p.go(`${BASE}?r=${base}${process.env.QS ? '&' + process.env.QS : ''}`, 800)
      const href = await p.eval(`(() => { const a = [...document.querySelectorAll('a[href^="${base}/"]')].map(a => a.getAttribute('href')).find(h => /[0-9a-f]{8}-/.test(h)); return a })()`)
      if (!href) { report.push({ w, r, err: 'no link' }); continue }
      await p.clickSel(`a[href="${href}"]`)
      await sleep(1200)
    } else {
      p.consoleMsgs.length = 0
      await p.go(`${BASE}?r=${encodeURIComponent(r)}${process.env.QS ? '&' + process.env.QS : ''}`, 1200)
    }
    const info = await p.eval(`(() => {
      const de = document.documentElement
      const over = []
      for (const el of document.querySelectorAll('body *')) {
        const rc = el.getBoundingClientRect()
        if (rc.width === 0 || rc.height === 0) continue
        if (rc.right > innerWidth + 0.5 || rc.left < -0.5) {
          const cs = getComputedStyle(el)
          if (cs.position === 'fixed' && cs.visibility === 'hidden') continue
          // skip things inside a horizontally scrolling or clipping ancestor
          let a = el.parentElement, clipped = false
          while (a && a !== document.body) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break } a = a.parentElement }
          if (!clipped) over.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : el.tagName) + ' ' + Math.round(rc.left) + '..' + Math.round(rc.right))
        }
      }
      // text that spills out of its box, or is clipped without an ellipsis
      const clippedText = []
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('.sr-only, .skip-link, svg, .leaflet-container, [aria-hidden=true]')) continue
        const cs = getComputedStyle(el)
        if (cs.display === 'inline' || el.clientWidth === 0) continue
        if (el.scrollWidth > el.clientWidth + 1) {
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
          if (!own) continue
          const kind = cs.overflowX === 'visible' ? 'SPILL' : cs.textOverflow === 'ellipsis' ? 'ellipsis' : 'CLIP'
          if (kind !== "ellipsis" || ${!!process.env.ELL}) clippedText.push(kind + ' ' + String(el.className || el.tagName).split(' ')[0] + ' ' + el.clientWidth + '<' + el.scrollWidth + ': ' + el.textContent.trim().slice(0, 40))
        }
      }
      const blurred = [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); const bf = s.backdropFilter || s.webkitBackdropFilter; if (!bf || bf === 'none') return false; const r = e.getBoundingClientRect(); return r.width && r.height && s.visibility !== 'hidden' && +s.opacity > 0 && r.bottom > 0 && r.top < innerHeight }).map(e => e.className)
      const imgs = [...document.images].filter(i => !i.getAttribute('width') && !i.getAttribute('height') && !i.style.aspectRatio && getComputedStyle(i).aspectRatio === 'auto').map(i => i.className || i.src.slice(0, 40))
      return { docW: de.scrollWidth, vw: innerWidth, docH: de.scrollHeight, over: over.slice(0, 8), clippedText: clippedText.slice(0, 8), blurred, imgsNoDims: imgs, title: document.title, h1: document.querySelector('h1')?.textContent }
    })()`)
    const name = `${tag}-${w}-${r0.replace(/[^a-z0-9@]+/gi, '_') || 'root'}`
    await p.shot(name)
    report.push({ w, r: r0, ...info, console: p.consoleMsgs.filter((m) => !/dashboard_stats|serverviews|Download the React DevTools|vite/.test(m)).slice(0, 5) })
  }
}
console.log(JSON.stringify(report, null, 1))
await p.close()
process.exit(0)
