// ============================================================================
// Contrasto vero in hover e premuto: forza :hover/:active via CDP e compone lo
// strato di stato (`::before`, opacità) sul fondo prima di misurare.
//   node docs/qa/hover.mjs
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'
await launch()
const p = await page()
await p.viewport(1280, 800, { mobile: false, touch: false })
await p.send('DOM.enable'); await p.send('CSS.enable')
const lum = `const L = (c) => { const m = c.match(/[\\d.]+/g).map(Number); const [r,g,b] = m.slice(0,3).map(v => { v/=255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4 }); return 0.2126*r+0.7152*g+0.0722*b }; const mix = (fg, a, bg) => { const f = fg.match(/[\\d.]+/g).map(Number), b = bg.match(/[\\d.]+/g).map(Number); return 'rgb(' + [0,1,2].map(i => f[i]*a + b[i]*(1-a)).join(',') + ')' }; const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return ((x + .05) / (y + .05)).toFixed(2) };`
async function measure(route, sel, label) {
  await p.go(`${BASE}?r=${encodeURIComponent(route)}`, 1100)
  const { root } = await p.send('DOM.getDocument', { depth: -1 })
  const { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })
  if (!nodeId) { console.log(label, 'missing', sel); return }
  const read = () => p.eval(`(() => { ${lum} const e = document.querySelector(${JSON.stringify(sel)}); const cs = getComputedStyle(e); const be = getComputedStyle(e, '::before'); let bg = cs.backgroundColor; let a = e; while (/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg) && a.parentElement) { a = a.parentElement; bg = getComputedStyle(a).backgroundColor } const layer = mix(be.backgroundColor, +be.opacity, bg); return cs.color + ' on ' + bg + ' + layer ' + (+be.opacity).toFixed(2) + ' → ' + cr(cs.color, layer) })()`)
  const rest = await read()
  await p.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); await sleep(300)
  const hov = await read()
  await p.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover', 'active'] }); await sleep(300)
  const act = await read()
  await p.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })
  console.log(`${label}\n   rest  ${rest}\n   hover ${hov}\n   press ${act}`)
}
await measure('/', '.ui-button[data-variant="tinted"]', 'tinted (Storia Instagram / Fai check-in)')
await measure('/profilo', '.ui-row[data-tone="danger"]', 'riga danger (Esci)')
await p.close(); process.exit(0)
