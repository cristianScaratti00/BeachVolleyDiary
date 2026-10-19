// ============================================================================
// La TabBar ferma. Cambia tab e scorre col dito su ogni radice, e a OGNI
// fotogramma legge la cima della barra e la larghezza della finestra: se
// qualcosa sborda a destra anche solo per un'animazione, Chrome su Android
// rimpicciolisce la pagina e la barra fissa scende e torna su. sweep.mjs
// guarda a pagina ferma e non lo vede.
//   node docs/qa/barra.mjs        (exit 1 se la barra si è mossa)
// ============================================================================
import { launch, page, BASE, sleep } from './cdp.mjs'

const W = 393, H = 852
await launch()
const p = await page()
await p.viewport(W, H)

async function trascina(y0, y1, passi = 14) {
  await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: W / 2, y: y0 }] })
  for (let k = 1; k <= passi; k++) {
    await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: W / 2, y: y0 + ((y1 - y0) * k) / passi }] })
    await sleep(12)
  }
  await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

await p.go(`${BASE}?r=/`, 1500)
await p.eval(`(() => {
  window.__barra = { cime: new Set(), larghezze: new Set() }
  const giro = () => {
    const n = document.querySelector('.ui-tabbar')
    if (n) __barra.cime.add(Math.round(n.getBoundingClientRect().top))
    __barra.larghezze.add(innerWidth)
    requestAnimationFrame(giro)
  }
  giro()
})()`)

const tab = async (i) => {
  const c = await p.eval(`(() => { const r = document.querySelectorAll('.ui-tab')[${i}].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
  await p.tap(c[0], c[1])
  await sleep(900)
}
for (const i of [1, 2, 3, 0, 3, 1]) {
  await tab(i)
  for (let k = 0; k < 3; k++) { await trascina(650, 150); await sleep(350) }
}

const esito = await p.eval(`({ cime: [...__barra.cime], larghezze: [...__barra.larghezze] })`)
const ferma = esito.cime.length === 1 && esito.larghezze.length === 1 && esito.larghezze[0] === W
console.log(JSON.stringify({ ferma, ...esito }))
await p.close()
process.exit(ferma ? 0 : 1)
