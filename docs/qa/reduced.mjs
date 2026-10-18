// ============================================================================
// prefers-reduced-motion: ogni flusso arriva al suo stato finale, presto e
// senza spostamenti (restano solo dissolvenze). TRANSP=1 aggiunge
// prefers-reduced-transparency (il vetro diventa opaco, niente blur).
//   VP=390,844 node docs/qa/reduced.mjs
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'
const [w, h] = (process.env.VP ?? '390,844').split(',').map(Number)
await launch()
const p = await page()
await p.viewport(w, h)
await p.media([{ name: 'prefers-reduced-motion', value: 'reduce' }, ...(process.env.TRANSP ? [{ name: 'prefers-reduced-transparency', value: 'reduce' }] : [])])
const ANIMS = `document.getAnimations().filter(a => a.playState === 'running').map(a => { const k = a.effect?.getKeyframes?.() ?? []; const props = [...new Set(k.flatMap(f => Object.keys(f)).filter(x => !['offset','easing','composite','computedOffset'].includes(x)))]; const el = a.effect?.target; return (el?.className?.baseVal ?? el?.className ?? '?').toString().split(' ')[0] + ':' + props.join('+') + ':' + Math.round(a.effect?.getTiming?.().duration ?? 0) + 'ms' })`
const STATE = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'absent'; const cs = getComputedStyle(e); return 'opacity=' + cs.opacity + ' transform=' + cs.transform + ' vis=' + cs.visibility })()`
const step = async (label, sel, at = 60) => {
  await sleep(at)
  console.log(`${label.padEnd(28)} t+${at}ms ${sel ? await p.eval(STATE(sel)) : ''}  running=[${(await p.eval(ANIMS)).join(', ')}]`)
}
await p.go(`${BASE}?r=/`, 1200)
console.log('glass bg (TabBar):', await p.eval(`getComputedStyle(document.querySelector('.ui-tabbar') ?? document.querySelector('.ui-sidebar')).backgroundColor + ' / ' + getComputedStyle(document.querySelector('.ui-tabbar') ?? document.querySelector('.ui-sidebar')).backdropFilter`))
await p.clickSel(w >= 900 ? 'button[aria-haspopup=menu]' : '.ui-tab-plus')
await step('menu open', '.ui-menu')
await p.eval(`document.querySelector('[role=menuitem]').click()`)
await step('sheet open', '.ui-sheet')
await step('sheet open (settled)', '.ui-sheet', 400)
await p.eval(`[...document.querySelectorAll('[role=dialog] button[aria-expanded]')].find(b => /dettagli/i.test(b.textContent))?.click()`)
await step('altri dettagli', '.ui-grow-inner')
await p.key('Escape')
await step('sheet closed', '.ui-sheet', 400)
await p.clickSel(w >= 900 ? '.ui-sidebar-item[href="/tornei"]' : '.ui-tab[href="/tornei"]')
await step('tab → tornei', w >= 900 ? '.ui-sidebar-pill' : '.ui-tabbar-pill')
await p.eval(`[...document.querySelectorAll('.ui-segment')][1].click()`)
await step('segment → timeline', '.ui-segmented-pill')
await p.eval(`[...document.querySelectorAll('.ui-chip')][1]?.click()`)
await sleep(300)
await p.go(`${BASE}?r=/tornei`, 1200)
await p.eval(`[...document.querySelectorAll('.ui-chip')][1]?.click()`)
await step('chip → 2vs2', '.ui-chips-pill > i')
const href = await p.eval(`document.querySelector('a.ui-card-link').getAttribute('href')`)
await p.clickSel(`a[href="${href}"]`)
await step('detail', '.ui-stat-value', 120)
console.log('stat values:', await p.eval(`[...document.querySelectorAll('.ui-stat-value')].map(e => e.textContent).join(' | ')`))
await p.go(`${BASE}?r=/wrapped`, 1500)
await step('wrapped', '.wrapped-card-scale', 100)
await p.key('ArrowRight')
await step('wrapped → next', '.wrapped-card-scale', 100)
await p.close(); process.exit(0)
