// ============================================================================
// La rifinitura della landing /presentazione (POLISH.md, Parte L). Gli altri
// script di questa cartella navigano le ROTTE di docs/preview; la landing è
// una pagina sola, quindi qui si scorre per ancore, con scroll veri.
//
// Si misura la build di PRODUZIONE, servita su una porta propria:
//
//   npm run build && npx vite preview --port 5199 --strictPort --host 127.0.0.1
//   node docs/qa/landing.mjs <prova>       LBASE=http://127.0.0.1:5199/presentazione/
//
// Le prove (una o più, separate da virgola; `tutto` le fa tutte):
//   axe       axe nel browser (WCAG 2.0/2.1/2.2 AA e best practice), a ogni
//             sezione.
//   tab       solo tastiera dalla cima al fondo: anello, CLIP, coperto, e
//             QUANTO SI VEDE l'anello (pixel acceso contro spento, sotto 3 è
//             un difetto). ALL=1 stampa ogni fermata.
//   giro      il giro di #schermate (MOTION.md, Parte L): scorrendo la sua
//             traccia la scena resta ferma e a ogni tratto si vede un momento
//             solo, quello giusto; con reduced-motion è un elenco fermo, tutto
//             visibile.
//   sweep     W=320,360,390,768,820,1024,1280,1440: viewport allargato,
//             SPILL/CLIP, immagini senza misure, superfici sfocate.
//   targets   bersagli effettivi (44; ✗✗ sotto 24), scorrendo tutta la pagina.
//   cls       spostamenti dal caricamento al fondo, con Geist in ritardo di
//             DELAY ms (la riserva metrica deve assorbirlo).
//   reduced   prefers-reduced-motion: niente che si muove, la pressione a 1.
//   apertura  l'apertura della Home nel telefono dell'hero (MOTION.md, Parte
//             L): su desktop parte al caricamento e a fine corsa lascia la
//             Home vera; sul telefono gli strati restano finché il telefono
//             non è entrato in vista, poi se ne vanno.
//   perf      CPU 4×: FCP/LCP/TBT e fotogrammi lenti nello scroll.
//   rete      ogni richiesta dal caricamento al fondo: nessun host diverso
//             dal sito.
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
const SEZIONI = ['inizio', 'funzionalita', 'schermate', 'iscriviti']
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8')

await launch(PORTA)
const p = await page(PORTA)
await p.send('Network.enable')
await p.send('Network.setCacheDisabled', { cacheDisabled: true })

const alto = (w) => (process.env.H ? Number(process.env.H) : w >= 900 ? 800 : w <= 320 ? 568 : 844)
const UA_CHROME = (await p.send('Browser.getVersion')).userAgent.replace('HeadlessChrome', 'Chrome')
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const iphone = (w) => w < 900 && !process.env.ANDROID
async function apri(w, { qs = '', settle = 1200, touch = w < 900 } = {}) {
  await p.send('Emulation.setUserAgentOverride', iphone(w) ? { userAgent: UA_IPHONE, platform: 'iPhone' } : { userAgent: UA_CHROME })
  await p.viewport(w, alto(w), { mobile: w < 900, dpr: 1, touch })
  await p.go(LBASE + qs, settle)
  if (process.env.CSS) await p.eval(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(process.env.CSS)}; document.head.append(s) })()`)
}
/** Scorre fino a `y` in passi, come un dito. */
async function scorri(y, passi = 8, pausa = 50) {
  const da = await p.eval('scrollY')
  for (let i = 1; i <= passi; i++) {
    await p.eval(`scrollTo(0, ${Math.round(da + ((y - da) * i) / passi)})`)
    await sleep(pausa)
  }
}
const cimaDi = (id, f = 0) => p.eval(`(() => { const e = document.getElementById(${JSON.stringify(id)}); return e ? Math.round(e.getBoundingClientRect().top + scrollY + e.offsetHeight * ${f}) : 0 })()`)
async function vai(id, f = 0, settle = 600) {
  await scorri(await cimaDi(id, f))
  await sleep(settle)
}
const titolo = (s) => console.log(`\n=== ${s}`)
const larghezze = (d) => (process.env.W ?? d).split(',').map(Number)

// ------------------------------------------------------------------- axe
async function axe(w, scena) {
  await p.eval(`void (window.axe || (0, eval)(${JSON.stringify(AXE)}))`)
  const r = await p.eval(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }).then(r => ({
    v: r.violations.map(v => ({ id: v.id, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n').slice(1, 2).join(' ').slice(0, 150)) })),
    inc: r.incomplete.filter(v => v.id === 'color-contrast').reduce((a, v) => a + v.nodes.length, 0),
  }))`)
  const k = r.v.map((v) => `${v.id}×${v.n}`).join(', ')
  console.log(`${String(w).padStart(4)} ${scena.padEnd(16)} ${r.v.length ? '✗ ' + k : '0 violazioni'}${r.inc ? `  (contrasto incompleto ×${r.inc})` : ''}`)
  if (process.env.V) for (const v of r.v) console.log('       ' + v.nodes.join('\n       '))
  return r.v.length
}
if (fa('axe')) {
  titolo('axe')
  let tot = 0
  for (const w of larghezze('390,1280')) {
    await apri(w)
    for (const s of SEZIONI) {
      await vai(s, 0.1)
      tot += await axe(w, '#' + s)
    }
  }
  console.log(`  totale violazioni: ${tot}`)
}

// ------------------------------------------------------------------- tab
const SONDA = `(() => {
  const el = document.activeElement
  if (!el || el === document.body) return { none: true }
  // Due fermate con lo stesso nome (le porte dell'hero e del finale) sono due
  // fermate: il giro è completo quando il fuoco torna su un elemento già visto.
  if (el.hasAttribute('data-qa-visto')) return { giro: true }
  el.setAttribute('data-qa-visto', '')
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const nome = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 34)
  const ha = (x) => { const c = getComputedStyle(x); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 }
  const anello = ha(el) ? 'outline' : 'NESSUNO'
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
// alto fra il pixel acceso e quello spento. Mediana dei quattro lati; sotto 3
// (WCAG 1.4.11, 2.4.13) è un anello che non si vede.
async function contrastoAnello() {
  const g = await p.eval(`(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, o: parseFloat(c.outlineOffset) || 0, ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth) || 0 } })()`)
  const fuori = Math.max(0, g.o + g.ow) + 2
  const dentro = Math.max(0, -g.o) + 2
  const pad = Math.ceil(fuori + 2)
  const clip = { x: Math.max(0, g.x - pad), y: Math.max(0, g.y - pad), width: Math.ceil(g.w + 2 * pad), height: Math.ceil(g.h + 2 * pad), scale: 1 }
  const acceso = (await p.send('Page.captureScreenshot', { format: 'png', clip })).data
  await p.eval(`window.__qaFuoco = document.activeElement; __qaFuoco.blur()`)
  await sleep(200)
  const spento = (await p.send('Page.captureScreenshot', { format: 'png', clip })).data
  await p.eval(`__qaFuoco.focus({ preventScroll: true })`)
  await sleep(100)
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
  for (const w of larghezze('390,1280')) {
    titolo(`tab @${w}`)
    await apri(w, { touch: false })
    let cattivi = 0
    const visti = new Set()
    const ordine = []
    for (let i = 0; i < 60; i++) {
      await p.key('Tab')
      await sleep(Number(process.env.PASSO ?? 120))
      const s = await p.eval(SONDA)
      if (s.none || s.giro) break
      visti.add(i)
      ordine.push(s.nome || s.cls)
      const vista = s.coperto >= 2 ? null : await contrastoAnello()
      const male = s.anello === 'NESSUNO' || s.clip || s.coperto >= 2 || (vista != null && vista < 3)
      if (male) cattivi++
      if (male || process.env.ALL) console.log(`${male ? ' ✗' : '  '} ${String(i).padStart(3)} ${s.tag}.${s.cls} «${s.nome}» ${s.anello} ${vista != null ? 'si vede ' + vista : ''}${s.clip ? ' CLIP:' + s.clip : ''}${s.coperto ? ` coperto${s.coperto}:${s.da}` : ''} y=${s.y} ${s.w}×${s.h}`)
    }
    console.log(`  ordine: ${ordine.join(' → ')}`)
    console.log(`  fermate con un difetto: ${cattivi} su ${visti.size}`)
  }
}

// ------------------------------------------------------------------ giro
const GIRO = `(() => {
  const g = document.querySelector('#schermate .giro'), sc = g.querySelector('.giro-scena')
  const testi = [...g.querySelectorAll('.passo-testo')].map((t) => +getComputedStyle(t).opacity)
  return { top: Math.round(g.getBoundingClientRect().top + scrollY), alto: g.offsetHeight, scena: Math.round(sc.getBoundingClientRect().top), sticky: getComputedStyle(sc).position === 'sticky', testi }
})()`
if (fa('giro')) {
  for (const ridotto of [false, true]) {
    for (const w of larghezze('390,1280')) {
      titolo(`giro @${w}${ridotto ? ' (reduced-motion)' : ''}`)
      await p.media(ridotto ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [])
      await apri(w)
      const g0 = await p.eval(GIRO)
      const n = g0.testi.length
      if (ridotto || !g0.sticky) {
        const nascosti = g0.testi.filter((o) => o < 0.99).length
        console.log(`  elenco fermo: ${g0.sticky ? '✗ la scena è ancora incollata' : 'nessuna scena incollata'}; momenti visibili ${n - nascosti} su ${n}`)
        continue
      }
      // A metà di ogni tratto: la scena è in cima e si vede solo il suo momento.
      const tratto = (g0.alto - alto(w)) / n
      let male = 0
      for (let k = 0; k < n; k++) {
        await scorri(Math.round(g0.top + tratto * (k + 0.5)), 4, 40)
        await sleep(300)
        const g = await p.eval(GIRO)
        const visti = g.testi.map((o, i) => (o > 0.99 ? i : -1)).filter((i) => i >= 0)
        const ok = Math.abs(g.scena) <= 1 && visti.length === 1 && visti[0] === k
        if (!ok) male++
        console.log(`  ${ok ? ' ' : '✗'} momento ${k + 1}: scena a ${g.scena}px, visibili [${visti.map((i) => i + 1).join(', ')}]`)
      }
      console.log(`  ${male ? `✗ ${male} tratti sbagliati` : 'ogni tratto mostra il suo momento'} (traccia ${g0.alto}px, ${Math.round(tratto)}px per momento)`)
    }
  }
  await p.media([])
}

// ----------------------------------------------------------------- sweep
// `W` è la larghezza emulata: sul telefono un contenuto più largo ALLARGA il
// viewport (innerWidth 320 → 401, la pagina si rimpicciolisce) e il confronto
// con innerWidth non vedrebbe niente. Conta chi esce da W.
const MISURA = (W) => `(() => {
  const de = document.documentElement
  const fuori = []
  if (innerWidth > ${W} + 0.5) fuori.push('VIEWPORT ALLARGATO a ' + innerWidth)
  for (const el of document.querySelectorAll('body *')) {
    const rc = el.getBoundingClientRect()
    if (!rc.width || !rc.height) continue
    if (rc.right > ${W} + 0.5 || rc.left < -0.5) {
      if (getComputedStyle(el).visibility === 'hidden') continue
      let a = el.parentElement, tagliato = false
      while (a && a !== document.body) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { tagliato = true; break } a = a.parentElement }
      if (!tagliato && !el.closest('[aria-hidden=true], .sr-only, .skip-link')) fuori.push(String(el.className?.baseVal ?? el.className ?? el.tagName).split(' ')[0] + ' ' + Math.round(rc.left) + '..' + Math.round(rc.right))
    }
  }
  const testo = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only, .skip-link, svg, [aria-hidden=true], [hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'inline' || el.clientWidth <= 1) continue
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue
    if (el.scrollWidth > el.clientWidth + 1) {
      const testi = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
      if (!testi.length) continue
      const g = document.createRange()
      const esce = testi.some(n => { g.selectNodeContents(n); const t = g.getBoundingClientRect(); return t.right > r.right - parseFloat(cs.paddingRight) + 1 || t.left < r.left + parseFloat(cs.paddingLeft) - 1 })
      if (!esce) continue
      const tipo = cs.overflowX === 'visible' ? 'SPILL' : cs.textOverflow === 'ellipsis' ? 'ellipsis' : 'CLIP'
      testo.push(tipo + ' ' + String(el.className || el.tagName).split(' ')[0] + ' ' + el.clientWidth + '<' + el.scrollWidth + ': ' + el.textContent.trim().slice(0, 36))
    }
  }
  const sfocati = [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); const bf = s.backdropFilter || s.webkitBackdropFilter; return bf && bf !== 'none' }).length
  const img = [...document.images].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => i.src.slice(-30))
  return { docW: de.scrollWidth, vw: innerWidth, fuori: fuori.slice(0, 6), testo: testo.slice(0, 6), sfocati, img }
})()`
if (fa('sweep')) {
  titolo('sweep')
  for (const w of larghezze('320,360,390,768,820,1024,1280,1440')) {
    await apri(w)
    const H = await p.eval('document.documentElement.scrollHeight')
    const problemi = new Set()
    let sfocati = 0
    for (let y = 0; y < H; y += Math.round(alto(w) * 0.6)) {
      await scorri(y, 3, 40)
      await sleep(200)
      const m = await p.eval(MISURA(w))
      if (m.docW > m.vw) problemi.add(`SCROLL ORIZZONTALE ${m.docW}>${m.vw}`)
      for (const f of m.fuori) problemi.add('fuori ' + f)
      for (const t of m.testo) problemi.add(t)
      for (const i of m.img) problemi.add('img senza misure ' + i)
      sfocati = Math.max(sfocati, m.sfocati)
    }
    console.log(`${String(w).padStart(4)}: ${problemi.size ? [...problemi].join('\n      ') : 'pulito'} · alta ${H} · sfocati ${sfocati}`)
  }
}

// --------------------------------------------------------------- targets
const BERSAGLI = `(() => {
  const out = []
  for (const el of document.querySelectorAll('a[href], button, input, [tabindex="0"]')) {
    if (el.closest('.sr-only, .skip-link, [inert], [aria-hidden=true], [hidden]')) continue
    if (el.matches('[role=region]')) continue
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
  for (const w of larghezze('390,1280')) {
    titolo(`targets @${w}`)
    await apri(w)
    const H = await p.eval('document.documentElement.scrollHeight')
    const tutti = new Set()
    for (let y = 0; y < H; y += Math.round(alto(w) * 0.6)) {
      await scorri(y, 3, 40)
      await sleep(150)
      for (const t of await p.eval(BERSAGLI)) tutti.add(t)
    }
    console.log(tutti.size ? '  ' + [...tutti].join('\n  ') : '  nessuno sotto 44')
  }
}

// ------------------------------------------------------------------- cls
const OSSERVA = `window.__cls = 0; window.__spost = []; window.__lt = []; window.__lcp = 0; window.__lcpEl = '';
new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; __cls += e.value; __spost.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), y: Math.round(scrollY), da: (e.sources || []).slice(0, 3).map(s => s.node ? String(s.node.className?.baseVal ?? s.node.className ?? s.node.nodeName).split(' ')[0] || s.node.nodeName : '?') }) } }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __lt.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) { __lcp = Math.round(e.startTime); __lcpEl = e.element ? (e.element.tagName + '.' + String(e.element.className).split(' ')[0]) : '' } }).observe({ type: 'largest-contentful-paint', buffered: true });`
if (fa('cls')) {
  const DELAY = Number(process.env.DELAY ?? 1500)
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: OSSERVA })
  await p.send('Fetch.enable', { patterns: [{ urlPattern: '*.woff2' }] })
  const attesa = (e) => sleep(DELAY).then(() => p.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}))
  p.on('Fetch.requestPaused', attesa)
  for (const w of larghezze('390,1280')) {
    titolo(`cls @${w} (Geist in ritardo di ${DELAY}ms)`)
    await apri(w, { settle: DELAY + 1200 })
    console.log('  caricamento:', JSON.stringify(await p.eval(`({ cls: +__cls.toFixed(4), spost: __spost, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, s) => s.indexOf(v) === i) })`)))
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
const IN_MOTO = `document.getAnimations().filter(a => a.playState === 'running').map(a => String(a.effect?.target?.className ?? '?').split(' ')[0])`
if (fa('reduced')) {
  for (const w of larghezze('390,1280')) {
    titolo(`reduced @${w}`)
    await p.media([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await apri(w)
    const visti = new Set()
    for (const s of SEZIONI) {
      await vai(s, 0.3, 400)
      for (const a of await p.eval(IN_MOTO)) visti.add(`#${s} ${a}`)
    }
    console.log('  in moto:', visti.size ? [...visti].join(', ') : 'niente')
    console.log('  pressione:', await p.eval(`getComputedStyle(document.documentElement).getPropertyValue('--press-scale').trim()`))
  }
  await p.media([])
}

// -------------------------------------------------------------- apertura
// Gli strati (fasce e tabellone) ci sono solo mentre l'apertura scorre: a
// fine corsa la schermata è l'<img> della Home vera.
const STRATI = `(() => {
  const v = (s) => { const e = document.querySelector('#inizio ' + s); const c = getComputedStyle(e); return c.display === 'none' ? 'spento' : c.visibility === 'visible' ? 'visibile' : 'nascosto' }
  const anim = document.getAnimations().filter((a) => a.effect?.target?.closest?.('#inizio'))
  return { bande: v('.bande'), tabellone: v('.tabellone'), animazioni: anim.length, scroll: anim.filter((a) => a.timeline && !(a.timeline instanceof DocumentTimeline)).length, top: Math.round(document.querySelector('#inizio .telefono').getBoundingClientRect().top) }
})()`
if (fa('apertura')) {
  for (const w of larghezze('390,1280')) {
    titolo(`apertura @${w}`)
    await apri(w, { settle: 150 })
    const subito = await p.eval(STRATI)
    console.log('  al caricamento:', JSON.stringify(subito))
    if (subito.scroll) {
      // Sul telefono: gli strati restano finché il telefono non è dentro
      // (`contain 70%`, qui si va al 75%). Nella fase `contain` la cima del
      // telefono va da innerHeight − h a 0 se il telefono sta nella vista, e
      // da 0 a innerHeight − h se è più alto di lei (telefono in orizzontale).
      const fine = await p.eval(`(() => { const t = document.querySelector('#inizio .telefono'); const d = innerHeight - t.offsetHeight; return Math.round(t.getBoundingClientRect().top + scrollY - (d >= 0 ? d * 0.25 : d * 0.75)) })()`)
      for (const y of [0, Math.round(fine / 2), fine]) {
        await scorri(y, 4, 40)
        await sleep(250)
        console.log(`  scroll ${String(y).padStart(4)}:`, JSON.stringify(await p.eval(STRATI)))
      }
      const s = await p.eval(STRATI)
      if (s.bande !== 'nascosto' || s.tabellone !== 'nascosto') console.log('  ✗ col telefono in vista gli strati sono ancora lì')
    } else {
      await sleep(2200)
      const dopo = await p.eval(STRATI)
      console.log('  dopo 2.4s:', JSON.stringify(dopo))
      if (dopo.bande !== 'nascosto' || dopo.tabellone !== 'nascosto') console.log('  ✗ a fine apertura gli strati sono ancora lì')
      if (!subito.animazioni) console.log('  ✗ l\'apertura non è partita')
    }
  }
}

// ------------------------------------------------------------------ perf
if (fa('perf')) {
  const CPU = Number(process.env.CPU ?? 4)
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: OSSERVA + `
    window.__frames = (ms) => new Promise(res => { const ts = []; const t0 = performance.now(); const step = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(step); else { const d = ts.slice(1).map((x, i) => x - ts[i]); const lenti = d.filter((x) => x > 25).length; d.sort((a, b) => a - b); res({ n: d.length, p95: +(d[Math.floor(d.length * .95)] ?? 0).toFixed(1), max: +(d[d.length - 1] ?? 0).toFixed(1), lenti }) } }; requestAnimationFrame(step) });` })
  for (const w of larghezze('390,1280')) {
    titolo(`perf @${w}, CPU ${CPU}×`)
    await p.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await apri(w, { settle: 300 })
    await p.send('Emulation.setCPUThrottlingRate', { rate: CPU })
    await p.go(LBASE, 3500)
    console.log('  caricamento:', JSON.stringify(await p.eval(`(() => { const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: Math.round(fcp?.startTime ?? 0), lcp: __lcp, lcpEl: __lcpEl, cls: +__cls.toFixed(4), tbt: __lt.reduce((a, x) => a + Math.max(0, x.d - 50), 0), byte: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) + ' KB' } })()`)))
    const righe = []
    for (const s of SEZIONI) {
      await p.eval(`scrollTo(0, ${await cimaDi(s)})`)
      await sleep(500)
      const alt = await p.eval(`document.getElementById(${JSON.stringify(s)}).offsetHeight`)
      const f = p.eval(`__frames(1400)`)
      await p.send('Input.synthesizeScrollGesture', { x: Math.round(w / 2), y: Math.round(alto(w) / 2), yDistance: -Math.min(alt, 2400), speed: 1600, gestureSourceType: w < 900 ? 'touch' : 'mouse' })
      const r = await f
      righe.push(`#${s.padEnd(13)} p95 ${r.p95} max ${r.max} lenti ${r.lenti}/${r.n}`)
    }
    console.log('  scroll:\n    ' + righe.join('\n    '))
  }
  await p.send('Emulation.setCPUThrottlingRate', { rate: 1 })
}

// ------------------------------------------------------------------ rete
if (fa('rete')) {
  const viste = []
  p.on('Network.requestWillBeSent', (e) => viste.push(e.request.url))
  for (const w of larghezze('390,1280')) {
    titolo(`rete @${w}`)
    viste.length = 0
    await apri(w)
    for (const s of SEZIONI) await vai(s, 0.5, 400)
    const casa = new URL(LBASE).host
    const altrove = [...new Set(viste.filter((u) => /^https?:/.test(u) && new URL(u).host !== casa))]
    const tipi = [...new Set(viste.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).pathname.split('.').pop() || 'html'))]
    console.log(`  ${viste.length} richieste (${tipi.join(', ')}); verso altri host: ${altrove.length ? '\n    ✗ ' + altrove.join('\n    ✗ ') : 'nessuna'}`)
  }
}

await p.close()
process.exit(0)
