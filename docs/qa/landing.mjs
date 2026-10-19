// ============================================================================
// La rifinitura della landing /presentazione (POLISH.md, Parte L). Gli altri
// script di questa cartella navigano le ROTTE di docs/preview; la landing è
// una pagina sola, quindi qui si scorre per ancore, con scroll veri (gli
// observer e le timeline native devono vederli).
//
// Si misura la build di PRODUZIONE, servita su una porta propria:
//
//   npm run build && npx vite preview --port 5199 --strictPort --host 127.0.0.1
//   node docs/qa/landing.mjs <prova>       LBASE=http://127.0.0.1:5199/presentazione/
//
// Le prove (una o più, separate da virgola; `tutto` le fa tutte):
//   axe       axe nel browser a 390 e 1280, a ogni sezione e con menu, foglio,
//             tab di #registra, demo e chat in uso. FLAT=1 spegne i gradienti.
//   tab       solo tastiera dalla cima al fondo: anello, CLIP, coperto da barra
//             o guida, e QUANTO SI VEDE l'anello (pixel acceso contro spento,
//             sotto 3 è un difetto); Pallo e la tab corrente sul buio; poi il
//             ritorno del fuoco da menu e foglio (Esc). ALL=1 ogni fermata.
//   sweep     W=320,360,390,768,1024,1280,1440: viewport allargato, SPILL/CLIP,
//             immagini senza misure, superfici sfocate a schermo (budget 3),
//             anche col menu della guida e col foglio aperti.
//   targets   bersagli effettivi (44; ✗✗ sotto 24), scorrendo tutta la pagina.
//   cls       spostamenti dal caricamento al fondo, con Geist in ritardo di
//             DELAY ms (la riserva metrica deve assorbirlo).
//   reduced   prefers-reduced-motion e «Ferma le animazioni»: niente che si
//             muove, numeri già arrivati, demo senza autoplay.
//   perf      CPU 4×: FCP/LCP/TBT, fotogrammi lenti nello scroll di tutta la
//             pagina, e le interazioni (guida, foglio, tab, demo, chat).
//   numeri    prova di resistenza: numeri enormi e punteggi ai vantaggi.
//   rete      ogni richiesta dal caricamento al fondo (menu, foglio, chat,
//             demo compresi): nessun host diverso dal sito (UX §L12.8).
//   tocco     solo dito, come un iPhone (eventi touch veri): Pallo, il suo
//             menu, il tocco lungo, la demo, il foglio e il velo.
//
// H=390 forza l'altezza del viewport (il telefono in orizzontale: W=844 H=390).
// Chrome headless su una porta CDP propria (PORTA_CDP, 9343): mai la 9333.
// Sotto i 900px la pagina si apre come Safari 26 su iPhone (ANDROID=1: Chrome).
// CSS='…' aggiunge un foglio dopo il caricamento (provare una correzione, o
// rimettere un difetto e vedere che la prova lo trova).
// ============================================================================
import { readFileSync } from 'node:fs'
import { launch, page, sleep } from './cdp.mjs'

const LBASE = process.env.LBASE ?? 'http://127.0.0.1:5199/presentazione/'
const PORTA = Number(process.env.PORTA_CDP ?? 9343)
const PROVE = (process.argv[2] ?? 'tutto').split(',')
const fa = (k) => PROVE.includes(k) || PROVE.includes('tutto')
const SEZIONI = ['inizio', 'diario', 'registra', 'live', 'numeri', 'mappa', 'wrapped', 'dati', 'comincia']
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8')

await launch(PORTA)
const p = await page(PORTA)
await p.send('Network.enable')
await p.send('Network.setCacheDisabled', { cacheDisabled: true })

const alto = (w) => (process.env.H ? Number(process.env.H) : w >= 900 ? 800 : w <= 320 ? 568 : 844)
// Sotto i 900px la pagina si apre come Safari su iPhone (il telefono per cui
// è fatta): il pulsante d'installazione apre il foglio d'istruzioni. Da
// computer quel pulsante lancia il prompt nativo di Chrome, che headless non
// si vede: lì il foglio non si prova. ANDROID=1 tiene lo user agent di Chrome.
const UA_CHROME = (await p.send('Browser.getVersion')).userAgent.replace('HeadlessChrome', 'Chrome')
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const iphone = (w) => w < 900 && !process.env.ANDROID
// Safari non lancia `beforeinstallprompt`; Chrome headless sì, anche con lo
// user agent di un iPhone: il primo tocco aprirebbe il prompt nativo, invisibile.
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `if (navigator.platform === 'iPhone') addEventListener('beforeinstallprompt', (e) => e.stopImmediatePropagation(), true)` })
// Ogni caricamento è una prima visita: il profilo di Chrome resta fra un giro
// e l'altro, e un «Ferma le animazioni» rimasto in localStorage (o gli effetti
// già visti in sessione) falserebbe le prove. Gira prima di fermo.js.
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.removeItem('bvd_landing_fermo'); sessionStorage.removeItem('bvd_landing_visti') } catch {}` })
async function apri(w, { qs = '', settle = 1400, touch = w < 900 } = {}) {
  await p.send('Emulation.setUserAgentOverride', iphone(w) ? { userAgent: UA_IPHONE, platform: 'iPhone' } : { userAgent: UA_CHROME })
  await p.viewport(w, alto(w), { mobile: w < 900, dpr: 1, touch })
  await p.go(LBASE + qs, settle)
  // CSS=… aggiunge un foglio alla pagina: per provare una correzione (o
  // rimettere un difetto e vedere che la prova lo trova) senza ricompilare.
  if (process.env.CSS) await p.eval(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(process.env.CSS)}; document.head.append(s) })()`)
}
/** Scorre fino a `y` in passi, come un dito: gli observer vedono ogni tratto. */
async function scorri(y, passi = 8, pausa = 50) {
  const da = await p.eval('scrollY')
  for (let i = 1; i <= passi; i++) {
    await p.eval(`scrollTo(0, ${Math.round(da + ((y - da) * i) / passi)})`)
    await sleep(pausa)
  }
}
const cimaDi = (id, f = 0) => p.eval(`(() => { const e = document.getElementById(${JSON.stringify(id)}); return e ? Math.round(e.getBoundingClientRect().top + scrollY + e.offsetHeight * ${f}) : 0 })()`)
async function vai(id, f = 0, settle = 900) {
  await scorri(await cimaDi(id, f))
  await sleep(settle)
}
const centro = (sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
const titolo = (s) => console.log(`\n=== ${s}`)

// ------------------------------------------------------------------- axe
async function axe(w, scena) {
  if (process.env.FLAT) await p.eval(`(() => { if (document.getElementById('qa-flat')) return; const s = document.createElement('style'); s.id = 'qa-flat'; s.textContent = '[data-material]{background-image:none!important} .eroe-scena,.orizzonte{visibility:hidden!important}'; document.head.append(s) })()`)
  await p.eval(`void (window.axe || (0, eval)(${JSON.stringify(AXE)}))`)
  const r = await p.eval(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }).then(r => ({
    v: r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n').slice(1, 2).join(' ').slice(0, 150)) })),
    inc: r.incomplete.filter(v => v.id === 'color-contrast').reduce((a, v) => a + v.nodes.length, 0),
    incN: r.incomplete.filter(v => v.id === 'color-contrast').flatMap(v => v.nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0]?.message || '').slice(0, 90))),
  }))`)
  const k = r.v.map((v) => `${v.id}×${v.n}`).join(', ')
  console.log(`${String(w).padStart(4)} ${scena.padEnd(22)} ${r.v.length ? '✗ ' + k : '0 violazioni'}${r.inc ? `  (contrasto incompleto ×${r.inc})` : ''}`)
  if (process.env.V) for (const v of r.v) console.log('       ' + v.nodes.join('\n       '))
  if (process.env.INC) for (const n of r.incN) console.log('       ? ' + n)
  return r.v.length
}
if (fa('axe')) {
  titolo('axe' + (process.env.FLAT ? ' (FLAT)' : ''))
  let tot = 0
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    await apri(w)
    for (const s of SEZIONI) {
      await vai(s, 0.1)
      tot += await axe(w, '#' + s)
    }
    await vai('diario', 0.2)
    await p.eval(`document.querySelector('.guida').click()`)
    await sleep(500)
    if (await p.eval(`document.querySelector('.guida').getAttribute('aria-expanded')`) !== 'true') console.log('     (il menu della guida non si è aperto)')
    tot += await axe(w, 'menu della guida')
    await p.key('Escape')
    await sleep(300)
    if (iphone(w)) {
      await p.eval(`[...document.querySelectorAll('[data-installa]')].find(b => !b.hidden && b.offsetParent)?.click()`)
      await sleep(600)
      if (await p.eval(`document.getElementById('installa').hasAttribute('data-aperto')`)) tot += await axe(w, 'foglio installa')
      else console.log('     (il foglio d\'installazione non si è aperto)')
      await p.key('Escape')
      await sleep(400)
    }
    await vai('registra', 0.2)
    await p.eval(`document.querySelector('.voce[data-voce="torneo"]')?.click()`)
    await sleep(500)
    tot += await axe(w, '#registra torneo')
    await p.eval(`document.querySelector('.voce[data-voce="chat"]')?.click()`)
    await sleep(600)
    await p.eval(`document.querySelector('.chat-risposte button')?.click()`)
    await sleep(2500)
    tot += await axe(w, 'chat, una risposta')
    await vai('live', 0.4)
    for (let i = 0; i < 4; i++) {
      await p.eval(`document.querySelector('.pannello[data-chi="noi"]')?.click()`)
      await sleep(120)
    }
    await sleep(500)
    tot += await axe(w, 'demo, 4 punti')
    await p.eval(`document.querySelector('.comando-fermo')?.click()`)
    await sleep(300)
    tot += await axe(w, 'fermo premuto')
    await p.eval(`document.querySelector('.comando-fermo')?.click()`)
  }
  console.log(`totale violazioni: ${tot}`)
}

// ------------------------------------------------------------------- tab
const SONDA = `(() => {
  const el = document.activeElement
  if (!el || el === document.body) return { none: true }
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34)
  const ha = (x, ps) => { const c = getComputedStyle(x, ps); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 }
  let anello = ha(el) ? 'outline' : (cs.boxShadow !== 'none' ? 'shadow' : 'NESSUNO')
  if (anello === 'NESSUNO') for (let a = el.parentElement, i = 0; a && i < 4; a = a.parentElement, i++) if (ha(a) || ha(a, '::after')) { anello = 'su ' + String(a.className).split(' ')[0]; break }
  const ow = Math.max(0, parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset))
  const box = { l: r.left - ow, t: r.top - ow, r: r.right + ow, b: r.bottom + ow }
  let clip = null
  if (ha(el)) for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const s = getComputedStyle(a)
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
      const ar = a.getBoundingClientRect()
      if (box.l < ar.left - 0.5 || box.t < ar.top - 0.5 || box.r > ar.right + 0.5 || box.b > ar.bottom + 0.5) { clip = String(a.className || a.tagName).slice(0, 30); break }
    }
  }
  const ins = Math.min(r.height / 2, r.width / 4)
  const punti = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + ins, r.top + r.height / 2], [r.right - ins, r.top + r.height / 2]]
  let coperto = 0, da = ''
  for (const [x, y] of punti) {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { coperto++; da = 'fuori schermo'; continue }
    const t = document.elementFromPoint(x, y)
    if (t && t !== el && !el.contains(t) && !t.contains(el)) { coperto++; da = String(t.closest('[class]')?.className || t.tagName).split(' ')[0].slice(0, 24) }
  }
  return { tag: el.tagName.toLowerCase(), cls: String(el.className?.baseVal ?? el.className ?? '').split(' ')[0], nome, anello, clip, coperto, da, y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
})()`
// Quanto si vede l'anello: lo stesso riquadro con e senza fuoco, e lungo la
// normale a ogni lato (dal bordo fino a offset + spessore) il contrasto più
// alto fra il pixel acceso e quello spento. Conta anche un anello doppio
// (alone + inchiostro) e un fuoco che cambia il fondo. Mediana dei quattro
// lati; sotto 3 (WCAG 1.4.11, 2.4.13) è un anello che non si vede.
async function contrastoAnello() {
  const g = await p.eval(`(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, o: parseFloat(c.outlineOffset) || 0, ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth) || 0 } })()`)
  const fuori = Math.max(0, g.o + g.ow) + 2
  const dentro = Math.max(0, -g.o) + 2
  const pad = Math.ceil(fuori + 2)
  const clip = { x: Math.max(0, g.x - pad), y: Math.max(0, g.y - pad), width: Math.ceil(g.w + 2 * pad), height: Math.ceil(g.h + 2 * pad), scale: 1 }
  const acceso = (await p.send('Page.captureScreenshot', { format: 'png', clip })).data
  await p.eval(`window.__qaFuoco = document.activeElement; __qaFuoco.blur()`)
  await sleep(260)
  const spento = (await p.send('Page.captureScreenshot', { format: 'png', clip })).data
  await p.eval(`__qaFuoco.focus({ preventScroll: true })`)
  await sleep(120)
  return p.eval(`(async () => {
    const leggi = async (d) => { const i = new Image(); i.src = 'data:image/png;base64,' + d; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height) }
    const A = await leggi(${JSON.stringify(acceso)}), B = await leggi(${JSON.stringify(spento)})
    const lum = (d, x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= d.width || y >= d.height) return null; const k = (y * d.width + x) * 4; const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(d.data[k]) + 0.7152 * f(d.data[k + 1]) + 0.0722 * f(d.data[k + 2]) }
    const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    const ex = ${g.x} - ${clip.x}, ey = ${g.y} - ${clip.y}, w = ${g.w}, h = ${g.h}
    const lati = [[ex + w / 2, ey, 0, -1, 1, 0], [ex + w / 2, ey + h, 0, 1, 1, 0], [ex, ey + h / 2, -1, 0, 0, 1], [ex + w, ey + h / 2, 1, 0, 0, 1]]
    const mediana = (v) => { v = v.filter((n) => n != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null }
    const perLato = lati.map(([x0, y0, nx, ny, tx, ty]) => mediana([-3, -2, -1, 0, 1, 2, 3].map((k) => {
      let best = 1
      for (let d = -${dentro}; d <= ${fuori}; d += 0.5) {
        const x = x0 + nx * d + tx * k, y = y0 + ny * d + ty * k
        const a = lum(A, x, y), b = lum(B, x, y)
        if (a != null && b != null) best = Math.max(best, cr(a, b))
      }
      return best
    })))
    return +(mediana(perLato) ?? 0).toFixed(2)
  })()`)
}

if (fa('tab')) {
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    titolo(`tab @${w}`)
    await apri(w, { touch: false })
    let cattivi = 0
    const visti = new Set()
    for (let i = 0; i < 160; i++) {
      await p.key('Tab')
      await sleep(Number(process.env.PASSO ?? 140))
      const s = await p.eval(SONDA)
      if (s.none) { console.log('  (body)'); break }
      const k = s.tag + s.cls + s.nome
      if (visti.has(k) && s.cls === 'skip-link') { console.log('  (giro completo)'); break }
      visti.add(k)
      const vista = s.coperto >= 2 ? null : await contrastoAnello()
      const male = s.anello === 'NESSUNO' || s.clip || s.coperto >= 2 || (vista != null && vista < 3)
      if (male) cattivi++
      if (male || process.env.ALL) console.log(`${male ? ' ✗' : '  '} ${String(i).padStart(3)} ${s.tag}.${s.cls} «${s.nome}» ${s.anello} ${vista != null ? 'si vede ' + vista : ''}${s.clip ? ' CLIP:' + s.clip : ''}${s.coperto ? ` coperto${s.coperto}:${s.da}` : ''} y=${s.y} ${s.w}×${s.h}`)
    }
    console.log(`  fermate con un difetto: ${cattivi} su ${visti.size}`)

    // Gli anelli che il giro non incontra in quel punto: Pallo guida e la tab
    // corrente (sulla lente bianca) sopra l'inchiostro di #numeri e la carta
    // di #mappa, dove barra e guida cambiano fondo.
    for (const [sez, f] of [['numeri', 0.05], ['mappa', 0.3]]) {
      await apri(w, { touch: false })
      await vai(sez, f, 1500)
      for (const sel of ['.guida', '.tab[aria-current="true"]']) {
        // Un tasto prima del fuoco da script: così è `:focus-visible`, come da tastiera.
        await p.key('Shift')
        const c = await p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.hidden || !e.getClientRects().length || getComputedStyle(e).visibility === "hidden") return false; e.focus({ preventScroll: true }); return e.matches(':focus-visible') })()`)
        if (!c) { console.log(`  #${sez} ${sel}: assente o senza :focus-visible`); continue }
        await sleep(200)
        const fondo = await p.eval(`document.querySelector('.capsula').dataset.inchiostro`)
        const v = await contrastoAnello()
        if (v < 3) cattivi++
        console.log(`${v < 3 ? ' ✗' : '  '} #${sez} ${sel} (barra sul ${fondo}): si vede ${v}`)
      }
    }

    // Il ritorno del fuoco (solo tastiera).
    await apri(w, { touch: false })
    await vai('diario', 0.2, 1200)
    await p.eval(`document.querySelector('.guida').focus()`)
    await p.key('Enter')
    await sleep(200)
    const dentro = await p.eval(`document.activeElement?.closest('#guida-menu') ? document.activeElement.textContent.trim() : 'FUORI: ' + document.activeElement?.className`)
    await p.key('Escape')
    await sleep(200)
    const torna = await p.eval(`document.activeElement?.className`)
    console.log(`  menu della guida: Enter → «${dentro}», Esc → .${torna}`)
    const b = iphone(w) && (await p.eval(`(() => { const b = [...document.querySelectorAll('[data-installa]')].find(b => !b.hidden && b.offsetParent && !b.closest('#guida-menu')); if (!b) return null; b.focus(); return b.className })()`))
    if (b) {
      await p.key('Enter')
      await sleep(300)
      const f1 = await p.eval(`document.activeElement?.closest('[role=dialog]') ? 'nel foglio: ' + document.activeElement.textContent.trim().slice(0, 30) : 'FUORI: ' + document.activeElement?.className`)
      const giro = []
      for (let i = 0; i < 4; i++) { await p.key('Tab'); await sleep(60); giro.push(await p.eval(`document.activeElement?.closest('[role=dialog]') ? 'ok' : 'FUGA:' + document.activeElement?.className`)) }
      await p.key('Escape')
      await sleep(300)
      const f2 = await p.eval(`document.activeElement?.className`)
      console.log(`  foglio installa: Enter → ${f1}; Tab×4 → ${giro.join(',')}; Esc → .${f2}`)
    }
  }
}

// ----------------------------------------------------------------- sweep
// `W` è la larghezza emulata: sul telefono (emulazione mobile) un contenuto
// più largo ALLARGA il viewport (innerWidth 320 → 401, la pagina si rimpicciolisce)
// e il confronto con innerWidth non vedrebbe niente. Il body ha `overflow-x:
// clip`: lo scroll orizzontale non c'è comunque, conta chi esce da W.
const MISURA = (W) => `(() => {
  const de = document.documentElement
  const fuori = []
  if (innerWidth > ${W} + 0.5) fuori.push('VIEWPORT ALLARGATO a ' + innerWidth)
  for (const el of document.querySelectorAll('body *')) {
    const rc = el.getBoundingClientRect()
    if (!rc.width || !rc.height) continue
    if (rc.right > ${W} + 0.5 || rc.left < -0.5) {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden') continue
      let a = el.parentElement, tagliato = false
      while (a && a !== document.body) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { tagliato = true; break } a = a.parentElement }
      if (!tagliato && !el.closest('[aria-hidden=true], .sr-only')) fuori.push(String(el.className?.baseVal ?? el.className ?? el.tagName).split(' ')[0] + ' ' + Math.round(rc.left) + '..' + Math.round(rc.right))
    }
  }
  const testo = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only, .skip-link, svg, [aria-hidden=true], [hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'inline' || !el.clientWidth) continue
    // Le etichette nascoste agli occhi (il nome del ＋ sotto i 600px): clip a zero.
    if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || el.clientWidth <= 1) continue
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue
    if (el.scrollWidth > el.clientWidth + 1) {
      const testi = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
      if (!testi.length) continue
      // Conta il TESTO che esce, non un decoro trasformato (l'anello che
      // pulsa su «Chiudi il set» allarga lo scrollWidth di 2px).
      const box = el.getBoundingClientRect()
      const g = document.createRange()
      const esce = testi.some(n => { g.selectNodeContents(n); const t = g.getBoundingClientRect(); return t.right > box.right - parseFloat(cs.paddingRight) + 1 || t.left < box.left + parseFloat(cs.paddingLeft) - 1 })
      if (!esce) continue
      const tipo = cs.overflowX === 'visible' ? 'SPILL' : cs.textOverflow === 'ellipsis' ? 'ellipsis' : 'CLIP'
      testo.push(tipo + ' ' + String(el.className || el.tagName).split(' ')[0] + ' ' + el.clientWidth + '<' + el.scrollWidth + ': ' + el.textContent.trim().slice(0, 36))
    }
  }
  const sfocati = [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); const bf = s.backdropFilter || s.webkitBackdropFilter; if (!bf || bf === 'none') return false; const r = e.getBoundingClientRect(); return r.width && r.height && s.visibility !== 'hidden' && +s.opacity > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }).map(e => String(e.className).split(' ')[0])
  const img = [...document.images].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => i.src.slice(-30))
  return { docW: de.scrollWidth, vw: innerWidth, fuori: fuori.slice(0, 6), testo: testo.slice(0, 6), sfocati, img }
})()`
if (fa('sweep')) {
  titolo('sweep')
  for (const w of (process.env.W ?? '320,360,390,768,1024,1280,1440').split(',').map(Number)) {
    await apri(w)
    const H = await p.eval('document.documentElement.scrollHeight')
    const problemi = new Set()
    let maxSfocati = 0, dove = ''
    for (let y = 0; y < H; y += Math.round(alto(w) * 0.6)) {
      await scorri(y, 3, 40)
      await sleep(250)
      const m = await p.eval(MISURA(w))
      if (m.docW > m.vw) problemi.add(`SCROLL ORIZZONTALE ${m.docW}>${m.vw}`)
      for (const f of m.fuori) problemi.add('fuori ' + f)
      for (const t of m.testo) problemi.add(t)
      for (const i of m.img) problemi.add('img senza misure ' + i)
      if (m.sfocati.length > maxSfocati) { maxSfocati = m.sfocati.length; dove = `y=${y} [${m.sfocati.join(', ')}]` }
    }
    // Il budget del vetro anche coi sovrapposti aperti (MOTION: al più 3):
    // il menu della guida su #diario, il foglio d'installazione dall'hero.
    const conta = () => p.eval(`(${MISURA(w)}).sfocati`)
    await vai('diario', 0.2, 1200)
    await p.eval(`document.querySelector('.guida')?.click()`)
    await sleep(600)
    const conMenu = await conta()
    await p.key('Escape')
    await sleep(400)
    let conFoglio = null
    if (iphone(w)) {
      await scorri(0)
      await sleep(600)
      await p.eval(`[...document.querySelectorAll('[data-installa]')].find(b => !b.hidden && b.getClientRects().length)?.click()`)
      await sleep(600)
      conFoglio = await conta()
      await p.key('Escape')
      await sleep(400)
    }
    console.log(`${String(w).padStart(4)}: ${problemi.size ? [...problemi].join('\n      ') : 'pulito'}\n      sfocati max ${maxSfocati} ${dove}; col menu ${conMenu.length} [${conMenu.join(', ')}]${conFoglio ? `; col foglio ${conFoglio.length} [${conFoglio.join(', ')}]` : ''}`)
  }
}

// --------------------------------------------------------------- targets
const BERSAGLI = `(() => {
  const out = []
  for (const el of document.querySelectorAll('a[href], button, input, [role=button], [role=tab], [tabindex="0"]')) {
    if (el.closest('.sr-only, .skip-link, [inert], [aria-hidden=true], [hidden]')) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue
    if (getComputedStyle(el).visibility === 'hidden') continue
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const colpisce = (x, y) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t)) }
    if (!colpisce(cx, cy)) continue
    const fin = (dx, dy, d) => { while (d < 40 && colpisce(cx + dx * (d + 1), cy + dy * (d + 1))) d++; return d }
    const h = fin(0, -1, r.height / 2) + fin(0, 1, r.height / 2) + 1
    const w = fin(-1, 0, r.width / 2) + fin(1, 0, r.width / 2) + 1
    if (h < 44 || w < 44) {
      const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30)
      out.push((h < 24 || w < 24 ? '✗✗ ' : '✗ ') + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' «' + nome + '» ' + Math.round(r.width) + '×' + Math.round(r.height) + ' colpo ' + Math.round(w) + '×' + Math.round(h))
    }
  }
  return out
})()`
if (fa('targets')) {
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    titolo(`targets @${w}`)
    await apri(w)
    const H = await p.eval('document.documentElement.scrollHeight')
    const tutti = new Set()
    for (let y = 0; y < H; y += Math.round(alto(w) * 0.6)) {
      await scorri(y, 3, 40)
      await sleep(200)
      for (const t of await p.eval(BERSAGLI)) tutti.add(t)
    }
    console.log(tutti.size ? '  ' + [...tutti].join('\n  ') : '  nessuno sotto 44')
  }
}

// ------------------------------------------------------------------- cls
const OSSERVA = `window.__cls = 0; window.__spost = []; window.__lt = []; window.__lcp = 0;
new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; __cls += e.value; __spost.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), y: Math.round(scrollY), da: (e.sources || []).slice(0, 3).map(s => s.node ? String(s.node.className?.baseVal ?? s.node.className ?? s.node.nodeName).split(' ')[0] || s.node.nodeName : '?') }) } }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __lt.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __lcp = Math.round(e.startTime) }).observe({ type: 'largest-contentful-paint', buffered: true });`
if (fa('cls')) {
  const DELAY = Number(process.env.DELAY ?? 1500)
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: OSSERVA })
  await p.send('Fetch.enable', { patterns: [{ urlPattern: '*.woff2' }] })
  const attesa = (e) => sleep(DELAY).then(() => p.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}))
  p.on('Fetch.requestPaused', attesa)
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    titolo(`cls @${w} (Geist in ritardo di ${DELAY}ms)`)
    await apri(w, { settle: DELAY + 1200 })
    const caricamento = await p.eval(`({ cls: +__cls.toFixed(4), spost: __spost, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, s) => s.indexOf(v) === i) })`)
    console.log('  caricamento:', JSON.stringify(caricamento))
    const H = await p.eval('document.documentElement.scrollHeight')
    for (let y = 0; y <= H; y += 200) { await p.eval(`scrollTo(0, ${y})`); await sleep(70) }
    await sleep(800)
    await scorri(0, 6, 60)
    await sleep(600)
    console.log('  giù e su:', JSON.stringify(await p.eval(`({ cls: +__cls.toFixed(4), spost: __spost.slice(-8) })`)))
  }
  await p.send('Fetch.disable')
}

// --------------------------------------------------------------- reduced
const IN_MOTO = `document.getAnimations().filter(a => a.playState === 'running').map(a => { const k = a.effect?.getKeyframes?.() ?? []; const props = [...new Set(k.flatMap(f => Object.keys(f)).filter(x => !['offset','easing','composite','computedOffset'].includes(x)))]; const el = a.effect?.target; const t = a.effect?.getTiming?.() ?? {}; return String(el?.className?.baseVal ?? el?.className ?? '?').split(' ')[0] + ':' + props.join('+') + ':' + Math.round(+t.duration || 0) + 'ms' + (t.iterations === Infinity ? '∞' : '') + (a.timeline && !(a.timeline instanceof DocumentTimeline) ? '(scroll)' : '') })`
if (fa('reduced')) {
  for (const modo of ['media', 'comando']) {
    for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
      titolo(`reduced @${w} (${modo === 'media' ? 'prefers-reduced-motion' : '«Ferma le animazioni»'})`)
      await p.media(modo === 'media' ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [])
      await apri(w)
      if (modo === 'comando') {
        await p.eval(`(() => { const b = document.querySelector('.eroe .comando-fermo'); if (b.getAttribute('aria-pressed') !== 'true') b.click() })()`)
        await sleep(400)
        console.log('  comando:', await p.eval(`'data-movimento=' + document.documentElement.dataset.movimento + ', aria-pressed=' + document.querySelector('.eroe .comando-fermo').getAttribute('aria-pressed')`))
      }
      const visti = new Set()
      for (const s of SEZIONI) {
        await vai(s, 0.3, 700)
        for (const a of await p.eval(IN_MOTO)) visti.add(`#${s} ${a}`)
      }
      console.log('  in moto:', visti.size ? '\n    ' + [...visti].join('\n    ') : 'niente')
      console.log('  numeri:', await p.eval(`[...document.querySelectorAll('#numeri .odo')].map(e => e.textContent.replace(/\\s+/g, '')).join(' | ')`))
      console.log('  demo (senza tocchi):', await p.eval(`[...document.querySelectorAll('#live .live-num')].map(e => e.textContent).join('–')`))
      console.log('  wrapped:', await p.eval(`(() => { const s = document.querySelector('.slides'); const cs = getComputedStyle(s); return 'overflow-x ' + cs.overflowX + ', timeline ' + getComputedStyle(document.querySelector('.slides-fila')).animationName })()`))
      console.log('  guida:', await p.eval(`(() => { const g = document.querySelector('.guida'); return g.hidden ? 'nascosta' : 'c\\'è, ' + getComputedStyle(g).transform })()`))
    }
  }
  await p.media([])
}

// ------------------------------------------------------------------ perf
if (fa('perf')) {
  const CPU = Number(process.env.CPU ?? 4)
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: OSSERVA + `
    window.__ev = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) __ev.push({ n: e.name, d: Math.round(e.duration) }) }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    window.__frames = (ms) => new Promise(res => { const ts = []; const t0 = performance.now(); const step = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(step); else { const d = ts.slice(1).map((x, i) => x - ts[i]); const lunghi = d.map((x, i) => [x, i]).filter(([x]) => x > 25); d.sort((a, b) => a - b); res({ n: d.length, p50: +(d[Math.floor(d.length * .5)] ?? 0).toFixed(1), p95: +(d[Math.floor(d.length * .95)] ?? 0).toFixed(1), max: +(d[d.length - 1] ?? 0).toFixed(1), lenti: lunghi.length }) } }; requestAnimationFrame(step) });` })
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    titolo(`perf @${w}, CPU ${CPU}×`)
    await p.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await apri(w, { settle: 300 })
    await p.send('Emulation.setCPUThrottlingRate', { rate: CPU })
    await p.go(LBASE, 3500)
    console.log('  caricamento:', JSON.stringify(await p.eval(`(() => { const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: Math.round(fcp?.startTime ?? 0), lcp: __lcp, cls: +__cls.toFixed(4), tbt: __lt.reduce((a, x) => a + Math.max(0, x.d - 50), 0), lunghi: __lt.map(x => x.d) } })()`)))
    // Lo scroll di tutta la pagina, un tratto per sezione, con un gesto vero.
    const righe = []
    for (const s of SEZIONI) {
      const y0 = await cimaDi(s)
      await p.eval(`scrollTo(0, ${y0})`)
      await sleep(500)
      const alt = await p.eval(`document.getElementById(${JSON.stringify(s)}).offsetHeight`)
      const f = p.eval(`__frames(1600)`)
      await p.send('Input.synthesizeScrollGesture', { x: Math.round(w / 2), y: Math.round(alto(w) / 2), yDistance: -Math.min(alt, 2400), speed: 1600, gestureSourceType: w < 900 ? 'touch' : 'mouse' })
      const r = await f
      righe.push(`#${s.padEnd(9)} p50 ${r.p50} p95 ${r.p95} max ${r.max} lenti ${r.lenti}/${r.n}`)
    }
    console.log('  scroll:\n    ' + righe.join('\n    '))
    // Il tocco col mouse: `Input.dispatchTouchEvent` con la CPU rallentata
    // può restare in attesa dell'ack del renderer e bloccare il giro.
    const premi = async (sel) => { const c = await centro(sel); if (!c) throw new Error('manca ' + sel); await p.click(c[0], c[1]) }
    const interazione = async (nome, prima, fn) => {
      try {
        await prima()
        await sleep(600)
        await p.eval('__ev.length = 0')
        const f = p.eval(`__frames(900)`)
        await Promise.race([fn(), sleep(8000).then(() => { throw new Error('tempo scaduto') })])
        const r = await f
        await sleep(200)
        const ev = await p.eval('__ev.splice(0)')
        return `${nome.padEnd(18)} INP ${ev.length ? Math.max(...ev.map((e) => e.d)) : '<16'}ms · fotogrammi p95 ${r.p95} max ${r.max} lenti ${r.lenti}`
      } catch (e) {
        return `${nome.padEnd(18)} ERRORE ${String(e.message ?? e).slice(0, 80)}`
      }
    }
    const out = []
    out.push(await interazione('guida: apri menu', () => vai('diario', 0.3, 900), () => premi('.guida')))
    await p.key('Escape')
    // Il foglio solo come Safari su iPhone: da computer il pulsante lancia il
    // prompt nativo di Chrome, che headless non si vede e non è la pagina.
    if (iphone(w)) {
      out.push(await interazione('foglio installa', () => sleep(300), () => p.eval(`[...document.querySelectorAll('[data-installa]')].find(b => !b.hidden && b.getClientRects().length)?.click()`)))
      await p.key('Escape')
    }
    out.push(await interazione('#registra: Torneo', () => vai('registra', 0.2, 900), () => premi('.voce[data-voce="torneo"]')))
    out.push(await interazione('#registra: chat', () => sleep(100), () => premi('.voce[data-voce="chat"]')))
    out.push(await interazione('chat: risposta', () => sleep(1500), () => premi('.chat-risposte button')))
    out.push(await interazione('demo: +1', () => vai('live', 0.45, 900), () => premi('.pannello[data-chi="noi"]')))
    out.push(await interazione('demo: −1', () => sleep(200), () => premi('.meno[data-chi="noi"]')))
    console.log('  interazioni:\n    ' + out.join('\n    '))
    console.log('  proprietà animate:', JSON.stringify(await p.eval(`[...new Set(document.getAnimations().flatMap(a => (a.effect?.getKeyframes?.() ?? []).flatMap(k => Object.keys(k))).filter(x => !['offset','easing','composite','computedOffset'].includes(x)))]`)))
    console.log('  CLS a fine giro:', await p.eval(`+__cls.toFixed(4) + (__spost.length ? ' ' + JSON.stringify(__spost) : '')`))
  }
  await p.send('Emulation.setCPUThrottlingRate', { rate: 1 })
}

// ---------------------------------------------------------------- numeri
if (fa('numeri')) {
  // I numeri arrivano dalla build: si cambiano nell'HTML prima che partano i
  // moduli (`readystatechange` → interactive viene prima degli script
  // `type=module`), così l'Odometro li monta come monterebbe quelli veri.
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.search.includes('qa-numeri')) document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return
    const valori = ['100', '+1288', '144', '188', '96']
    document.querySelectorAll('#numeri .odo').forEach((e, i) => { e.textContent = valori[i] ?? e.textContent })
    const di = document.querySelector('#numeri .cella-di'); if (di) di.lastChild.textContent = ' 1440'
    const piede = document.querySelectorAll('#numeri .poster-piede span'); if (piede[0]) piede[0].innerHTML = '<strong>1288</strong> vinte'; if (piede[1]) piede[1].textContent = '0 perse · 1288 giocate'
  })` })
  for (const w of (process.env.W ?? '320,390,1280').split(',').map(Number)) {
    titolo(`numeri enormi @${w}`)
    await apri(w, { qs: '?qa-numeri' })
    await vai('numeri', 0.1, 2500)
    const m = await p.eval(MISURA(w))
    console.log('  #numeri:', m.docW > m.vw ? `SCROLL ${m.docW}>${m.vw}` : 'niente scroll', m.fuori.join(' ; ') || '', m.testo.join(' ; ') || '')
    await p.shot(`landing-numeri-${w}`)
    // La demo ai vantaggi: 27–26 e oltre.
    await vai('live', 0.4, 900)
    // Da zero (l'autoplay può aver già segnato), prima «loro» e poi «noi»:
    // lo scarto resta entro 1 e il set non si chiude mai.
    await p.eval(`document.querySelector('.ricomincia').click()`)
    await sleep(300)
    for (let i = 0; i < 26; i++) { await p.eval(`document.querySelector('.pannello[data-chi="loro"]').click(); document.querySelector('.pannello[data-chi="noi"]').click()`); await sleep(30) }
    await sleep(700)
    const m2 = await p.eval(MISURA(w))
    console.log('  demo:', await p.eval(`[...document.querySelectorAll('#live .live-num')].map(e => e.textContent).join('–')`), m2.docW > m2.vw ? `SCROLL ${m2.docW}>${m2.vw}` : 'niente scroll', m2.testo.join(' ; '))
    await p.shot(`landing-demo-${w}`)
  }
}

// ------------------------------------------------------------------ rete
// «Niente cookie né statistiche qui: caratteri e immagini arrivano da questo
// sito» (UX §L12.8): ogni richiesta, dal caricamento al fondo e coi
// sovrapposti aperti, va all'host della pagina (o è un data:/blob:).
if (fa('rete')) {
  const viste = []
  p.on('Network.requestWillBeSent', (e) => viste.push(e.request.url))
  for (const w of (process.env.W ?? '390,1280').split(',').map(Number)) {
    titolo(`rete @${w}`)
    viste.length = 0
    await apri(w)
    for (const s of SEZIONI) await vai(s, 0.3, 300)
    await vai('diario', 0.2, 900)
    await p.eval(`document.querySelector('.guida')?.click()`)
    await sleep(300)
    await p.key('Escape')
    await vai('registra', 0.2, 600)
    await p.eval(`document.querySelector('.chat-risposte button')?.click()`)
    await sleep(1200)
    if (iphone(w)) {
      await p.eval(`[...document.querySelectorAll('[data-installa]')].find(b => !b.hidden && b.getClientRects().length)?.click()`)
      await sleep(500)
      await p.key('Escape')
    }
    const casa = new URL(LBASE).host
    const altrove = [...new Set(viste.filter((u) => /^https?:/.test(u) && new URL(u).host !== casa))]
    const tipi = [...new Set(viste.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).pathname.split('.').pop()))]
    console.log(`  ${viste.length} richieste (${tipi.join(', ')}); verso altri host: ${altrove.length ? '\n    ✗ ' + altrove.join('\n    ✗ ') : 'nessuna'}`)
  }
}

// ----------------------------------------------------------------- tocco
// Solo dito, con gli eventi touch veri del telefono (Input.dispatchTouchEvent,
// CPU a 1×: col rallentamento la sessione CDP può bloccarsi).
if (fa('tocco')) {
  const w = 390
  titolo(`tocco @${w} (Safari su iPhone)`)
  await apri(w, { touch: true })
  const tocca = async (sel, tieni = 0) => {
    const c = await centro(sel)
    if (!c) return console.log(`  ✗ manca ${sel}`)
    await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c[0], y: c[1] }] })
    if (tieni) await sleep(tieni)
    await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(350)
  }
  const esito = (ok, cosa) => console.log(`  ${ok ? '✓' : '✗'} ${cosa}`)
  await vai('diario', 0, 1200)
  await sleep(4200)
  await tocca('.guida')
  esito(await p.eval(`document.querySelector('.guida').getAttribute('aria-expanded') === 'true'`), 'un tocco su Pallo apre «Dove vuoi andare?»')
  esito(await p.eval(`document.activeElement?.closest('#guida-menu') != null`), '  e il fuoco va alla prima voce')
  await tocca('#guida-menu a[href="#wrapped"]')
  esito(await p.eval(`document.activeElement?.id === 'wrapped-titolo' && document.querySelector('.guida').getAttribute('aria-expanded') === 'false'`), 'una voce chiude il menu e salta, col fuoco al titolo')
  await vai('dati', 0.2, 1500)
  await tocca('.guida', 750)
  esito(await p.eval(`document.querySelector('.guida svg').hasAttribute('data-sorpresa') && document.querySelector('.guida').getAttribute('aria-expanded') === 'false'`), 'il tocco lungo: la sorpresa, niente menu')
  await vai('live', 0.45, 900)
  const prima = await p.eval(`document.querySelector('.pannello[data-chi="noi"]').getAttribute('aria-label')`)
  await tocca('.pannello[data-chi="noi"]')
  const dopo = await p.eval(`document.querySelector('.pannello[data-chi="noi"]').getAttribute('aria-label')`)
  esito(prima !== dopo, `un tocco sul pannello segna: «${prima}» → «${dopo}»`)
  await tocca('.meno[data-chi="noi"]')
  esito((await p.eval(`document.querySelector('.pannello[data-chi="noi"]').getAttribute('aria-label')`)) === prima, 'il «−1» toglie il punto')
  await vai('comincia', 0.2, 900)
  await tocca('#comincia [data-installa]')
  esito(await p.eval(`document.getElementById('installa').hasAttribute('data-aperto') && document.activeElement?.id === 'installa-titolo'`), 'il foglio si apre, col fuoco al titolo')
  await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 40 }] })
  await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(500)
  esito(await p.eval(`!document.getElementById('installa').hasAttribute('data-aperto') && document.activeElement?.matches('#comincia [data-installa]')`), 'un tocco sul velo lo chiude, e il fuoco torna al pulsante')
}

if (p.consoleMsgs.some((m) => /exception|error/i.test(m))) console.log('\nconsole:\n  ' + p.consoleMsgs.filter((m) => /exception|error/i.test(m)).slice(0, 10).join('\n  '))
await p.close()
try {
  process.kill(Number(readFileSync(`${(await import('./cdp.mjs')).SP}/chrome-${PORTA}.pid`, 'utf8')), 'SIGTERM')
} catch {}
process.exit(0)
