/* ============================================================================
   Laboratorio del movimento: strumenti comuni alle demo di MOTION.md.

   RIFERIMENTO, NON CODICE DI PRODUZIONE. Nell'app le stesse cose le fa Motion
   (`motion/react`): molle con velocità iniziale, `layout`/`layoutId` per i
   FLIP, `AnimatePresence` per le uscite. Qui sono scritte a mano per due
   ragioni: le demo devono aprirsi senza build, e chi implementa deve vedere
   COSA viene animato (solo transform e opacità), non fidarsi di una libreria.

   Script classico, non modulo: funziona anche da file://.

   Parametri dell'URL (li usa anche docs/motion/index.html):
     ?reduce   simula prefers-reduced-motion   (classe .rm sull'<html>)
     ?slow     moviola ×5                       (classe .lab-slow)
     ?audit    badge con le proprietà animate e il conto del vetro
   ============================================================================ */
(function () {
  'use strict'

  const root = document.documentElement
  const params = new URLSearchParams(location.search)
  if (params.has('reduce')) root.classList.add('lab-reduce')
  if (params.has('slow')) root.classList.add('lab-slow')
  if (params.has('audit')) root.classList.add('lab-audit')

  // ------------------------------------------------------------------ .rm
  // Una sola fonte: la preferenza di sistema OPPURE la simulazione. Le demo
  // leggono `.rm` dal CSS e `Lab.reduced()` dal JS, mai la media query da sé.
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  function syncReduced() {
    root.classList.toggle('rm', mq.matches || root.classList.contains('lab-reduce'))
  }
  mq.addEventListener('change', syncReduced)
  new MutationObserver(syncReduced).observe(root, { attributes: true, attributeFilter: ['class'] })
  syncReduced()

  const reduced = () => root.classList.contains('rm')
  const slow = () => (root.classList.contains('lab-slow') ? 5 : 1)

  /** Legge un token di durata già risolto (moviola compresa), in ms. */
  function dur(name) {
    const v = getComputedStyle(root).getPropertyValue('--dur-' + name).trim()
    return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000
  }
  /** Legge una curva: `molla` restituisce il `linear(…)` campionato. */
  function ease(name) {
    return getComputedStyle(root).getPropertyValue('--ease-' + name).trim() || 'ease'
  }

  // --------------------------------------------------------------- Molla
  // La stessa molla di `MOLLA` in src/components/Motion.tsx (460/38/0.9),
  // risolta in forma chiusa e CAMPIONATA a 60 fotogrammi al secondo. I
  // campioni diventano i keyframe di una Web Animation lineare: così la molla
  // gira sul compositor come una transizione CSS, e a differenza di
  // `--ease-molla` può partire con la velocità del dito (`v0`).
  const MOLLA = { stiffness: 460, damping: 38, mass: 0.9 }

  function springSamples({ from, to, v0 = 0, restDelta = 0.1 }) {
    const { stiffness: k, damping: c, mass: m } = MOLLA
    const w0 = Math.sqrt(k / m)
    const zeta = c / (2 * Math.sqrt(k * m))
    const A = from - to
    const out = []
    const fps = 60
    for (let i = 0; i <= fps * 2; i++) {
      const t = i / fps
      let x
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta)
        const B = (v0 + zeta * w0 * A) / wd
        x = to + Math.exp(-zeta * w0 * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t))
      } else {
        // Smorzamento critico (non è il caso di MOLLA, ma resta corretto).
        x = to + (A + (v0 + w0 * A) * t) * Math.exp(-w0 * t)
      }
      out.push(x)
      if (i > 2 && Math.abs(x - to) < restDelta && Math.abs(out[i - 1] - to) < restDelta) break
    }
    out[out.length - 1] = to
    return { values: out, duration: ((out.length - 1) / fps) * 1000 }
  }

  const running = new WeakMap()

  /**
   * Anima `el` con la molla da `from` a `to`. `render(v)` restituisce i
   * keyframe (solo transform/opacity). Interrompibile: chi chiama di nuovo
   * sullo stesso elemento riparte dal valore corrente (`Lab.springValue`).
   */
  function spring(el, { from, to, v0 = 0, render, restDelta, onDone }) {
    stop(el)
    if (reduced()) {
      Object.assign(el.style, render(to))
      onDone && onDone()
      return null
    }
    const { values, duration } = springSamples({ from, to, v0, restDelta })
    const anim = el.animate(values.map(render), { duration: duration * slow(), easing: 'linear', fill: 'forwards' })
    running.set(el, { anim, values, render })
    anim.finished.then(() => {
      Object.assign(el.style, render(to))
      anim.cancel()
      running.delete(el)
      onDone && onDone()
    }, () => {})
    return anim
  }

  /** Valore corrente di una molla in corsa (per riprendere un gesto a metà). */
  function springValue(el) {
    const r = running.get(el)
    if (!r) return null
    const { anim, values } = r
    const p = Math.min(1, (anim.currentTime || 0) / anim.effect.getTiming().duration)
    const f = p * (values.length - 1)
    const i = Math.floor(f)
    return values[i] + (values[Math.min(i + 1, values.length - 1)] - values[i]) * (f - i)
  }

  /** Ferma una molla lasciando l'elemento dov'è. */
  function stop(el) {
    const r = running.get(el)
    if (!r) return
    const v = springValue(el)
    r.anim.cancel()
    running.delete(el)
    if (v != null) Object.assign(el.style, r.render(v))
  }

  // ---------------------------------------------------------------- FLIP
  // Un elemento cambia posto nel layout: lo si misura prima e dopo, si
  // applica la differenza come `translate` e la si porta a zero con la molla.
  // Il layout cambia UNA volta; ogni fotogramma dell'animazione è transform.
  //
  // Oltre `max` elementi in movimento non si anima: misurare e muovere 40
  // nodi su un Android economico costa più di quanto il movimento chiarisca
  // (MOTION.md §12). Il layout salta, ed è corretto così.
  const FLIP_MAX = 24

  function flip(elements, mutate, { max = FLIP_MAX } = {}) {
    const els = Array.from(elements)
    const first = new Map(els.map((e) => [e, e.getBoundingClientRect()]))
    mutate()
    if (reduced()) return 0
    const moving = []
    for (const e of els) {
      if (!e.isConnected) continue
      const a = first.get(e)
      const b = e.getBoundingClientRect()
      const dx = a.left - b.left
      const dy = a.top - b.top
      if (Math.abs(dx) + Math.abs(dy) >= 0.5) moving.push([e, dx, dy])
    }
    if (moving.length > max) return -moving.length
    for (const [e, dx, dy] of moving) {
      e.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: dur('molla'), easing: ease('molla') },
      )
    }
    return moving.length
  }

  // ---------------------------------------------------------- Toast
  // Riferimento completo della regione degli avvisi (UX §7.8, MOTION.md
  // §4.1): regione SEMPRE montata, due contenitori live, al massimo due
  // avvisi, gli identici si fondono con il contatore, info e successo si
  // chiudono a 4s con pausa su hover, focus e scheda nascosta.
  const TOAST_MS = 4000
  const ICONS = { success: 'check-circle', error: 'alert', offline: 'wifi-off', info: 'info' }
  let region = null

  function ensureRegion() {
    if (region) return region
    region = document.querySelector('.ui-toasts')
    if (!region) {
      region = document.createElement('div')
      region.className = 'ui-toasts'
      region.innerHTML = '<div role="alert"></div><div role="status" aria-live="polite"></div>'
      document.body.appendChild(region)
    }
    return region
  }

  function allToasts() {
    return Array.from(ensureRegion().querySelectorAll('.ui-toast:not(.is-leaving)'))
  }

  function toast({ type = 'info', text, key }) {
    const reg = ensureRegion()
    const k = key || type + '|' + text
    const same = allToasts().find((t) => t.dataset.key === k)
    if (same) {
      const n = Number(same.dataset.n || 1) + 1
      same.dataset.n = String(n)
      const c = same.querySelector('.count')
      c.textContent = '×' + n
      c.hidden = false
      c.classList.remove('bump')
      void c.offsetWidth // riavvia l'animazione del cenno
      c.classList.add('bump')
      arm(same)
      return same
    }
    // Al massimo due: esce il più vecchio di quelli che si chiudono da soli,
    // altrimenti il più vecchio in assoluto.
    const now = allToasts()
    if (now.length >= 2) {
      const auto = now.filter((t) => t.dataset.auto === '1')
      dismiss((auto[0] || now[0]))
    }
    const el = document.createElement('div')
    el.className = 'ui-toast'
    el.dataset.type = type
    el.dataset.key = k
    el.dataset.auto = type === 'info' || type === 'success' ? '1' : '0'
    el.innerHTML =
      `<svg class="i ic" data-size="20" aria-hidden="true"><use href="#i-${ICONS[type]}"/></svg>` +
      `<span class="txt"></span><span class="count" hidden></span>` +
      `<button type="button" class="x state" aria-label="Chiudi avviso"><svg class="i" data-size="20" aria-hidden="true"><use href="#i-close"/></svg></button>`
    el.querySelector('.txt').textContent = text
    el.querySelector('.x').addEventListener('click', () => dismiss(el))
    el.addEventListener('mouseenter', () => pause(el, true))
    el.addEventListener('mouseleave', () => pause(el, false))
    el.addEventListener('focusin', () => pause(el, true))
    el.addEventListener('focusout', () => pause(el, false))
    reg.querySelector(type === 'error' ? '[role="alert"]' : '[role="status"]').appendChild(el)
    arm(el)
    return el
  }

  function arm(el) {
    clearTimeout(el._t)
    if (el.dataset.auto !== '1') return
    el._left = TOAST_MS * slow()
    el._since = performance.now()
    if (!el._paused && !document.hidden) el._t = setTimeout(() => dismiss(el), el._left)
  }

  function pause(el, on) {
    if (el.dataset.auto !== '1') return
    if (on && !el._paused) {
      el._paused = true
      clearTimeout(el._t)
      el._left -= performance.now() - el._since
    } else if (!on && el._paused) {
      el._paused = false
      el._since = performance.now()
      el._t = setTimeout(() => dismiss(el), Math.max(600, el._left))
    }
  }

  document.addEventListener('visibilitychange', () => {
    for (const t of allToasts()) pause(t, document.hidden)
  })

  function dismiss(el) {
    if (!el || el.classList.contains('is-leaving')) return
    clearTimeout(el._t)
    el.classList.add('is-leaving')
    el.inert = true
    const done = () => {
      // Chi resta sale al suo posto con la molla: un solo FLIP, transform.
      flip(allToasts(), () => el.remove())
    }
    // Rete di sicurezza: se l'animazione non parte (scheda in background,
    // animazioni spente dal browser) l'avviso esce lo stesso.
    let fatto = false
    const once = () => { if (!fatto) { fatto = true; done() } }
    el.addEventListener('animationend', once, { once: true })
    setTimeout(once, dur('svelto') + 80)
  }

  function offline(on) {
    const cur = allToasts().find((t) => t.dataset.key === 'offline')
    if (on && !cur) toast({ type: 'offline', text: 'Sei offline', key: 'offline' })
    if (!on && cur) dismiss(cur)
  }

  // ------------------------------------------------------- Focus trap
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  function trap(container) {
    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const f = Array.from(container.querySelectorAll(FOCUSABLE)).filter((n) => !n.closest('[inert]') && n.getClientRects().length)
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    container.addEventListener('keydown', onKey)
    return () => container.removeEventListener('keydown', onKey)
  }

  /** Il primo tocco di un'apertura veniva da un dito? (MOTION.md §3.5, M3) */
  let lastPointer = 'keyboard'
  addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse' }, true)
  addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) lastPointer = 'keyboard' }, true)
  const openedByTouch = () => lastPointer === 'touch' || lastPointer === 'pen'

  // ---------------------------------------------------------- Icone
  const PATHS = {
    home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5A2.5 2.5 0 0 0 7.5 10H8M16 6h3v1.5a2.5 2.5 0 0 1-2.5 2.5H16M12 13v3.5M8.5 20h7M10 20l.4-3.5h3.2L14 20',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5M16 11a2.5 2.5 0 1 0 0-5M17.5 14.2c1.6.6 2.7 2.4 3 4.8',
    person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c.8-3.5 3.6-6 7-6s6.2 2.5 7 6',
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6 6 18',
    'chevron-left': 'M15 5l-7 7 7 7',
    'chevron-right': 'M9 5l7 7-7 7',
    'chevron-down': 'M5 9l7 7 7-7',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    ellipsis: 'M6 12h.01M12 12h.01M18 12h.01',
    trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
    share: 'M12 4v11M8 8l4-4 4 4M6 12v7h12v-7',
    download: 'M12 4v11M8 11l4 4 4-4M6 19h12',
    camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    refresh: 'M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4',
    'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 10',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5v5.5M12 16.5h.01',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5h.01',
    'wifi-off': 'M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5-2.7M14.5 10.3a10 10 0 0 1 4.5 2.6M2 9.3a15 15 0 0 1 4.5-2.8M11 5.6A15 15 0 0 1 22 9.3M12 20h.01',
    chat: 'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z',
    calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  }
  // Varianti piene delle tab (ART_DIRECTION §10.1): sagoma piena, dettagli
  // ritagliati. Qui semplificate: bastano a vedere il passaggio contorno→pieno.
  const FILLS = {
    'home-fill': 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
    'trophy-fill': 'M7.5 3.5h9V9a4.5 4.5 0 0 1-9 0zM10.4 16.5h3.2l.6 3.5H9.8zM11 12.8h2v4h-2zM7.5 5.5h-3V7.5A3 3 0 0 0 7.5 10.5zM16.5 5.5h3V7.5a3 3 0 0 1-3 3z',
    'people-fill': 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.8 19.5c.5-3.4 3-5.8 6.2-5.8s5.7 2.4 6.2 5.8zM16 11.5a3 3 0 1 0 0-6zM16.8 13.6c2.4.5 4 2.7 4.4 5.9h-4.3a8 8 0 0 0-2-5.6z',
    'person-fill': 'M12 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4.5 20.5c.7-4 3.8-6.8 7.5-6.8s6.8 2.8 7.5 6.8z',
  }
  function injectSprite() {
    if (document.getElementById('lab-sprite')) return
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.id = 'lab-sprite'
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
    const add = (id, d) => {
      const s = document.createElementNS(ns, 'symbol')
      s.id = 'i-' + id
      s.setAttribute('viewBox', '0 0 24 24')
      const p = document.createElementNS(ns, 'path')
      p.setAttribute('d', d)
      s.appendChild(p)
      svg.appendChild(s)
    }
    for (const [id, d] of Object.entries(PATHS)) add(id, d)
    for (const [id, d] of Object.entries(FILLS)) add(id, d)
    document.body.prepend(svg)
  }

  // ----------------------------------------------------------- Audit
  // Il badge in alto a destra (con ?audit) dice due cose:
  //   1. se qualcosa ha animato una proprietà che non è transform/opacità
  //      (rosso), o lo ha fatto dentro un'eccezione dichiarata con
  //      `data-motion-exception="nome"` (ambra);
  //   2. quante superfici con backdrop-filter sono visibili ADESSO, e il
  //      massimo visto da quando la pagina è aperta (il budget è 3).
  // Lo stesso resoconto finisce in `window.__labReport` e in console, così
  // lo si controlla anche da un Chrome headless.
  const OK = new Set(['transform', 'opacity', 'translate', 'scale', 'rotate', 'visibility'])
  const report = { ko: [], warn: [], glassNow: 0, glassMax: 0 }
  window.__labReport = report

  function describe(el) {
    if (!el || !el.tagName) return String(el)
    const id = el.id ? '#' + el.id : ''
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''
    return el.tagName.toLowerCase() + id + cls
  }

  function check(prop, target) {
    if (OK.has(prop)) return
    const el = target && target.nodeType === 1 ? target : target && target.parentElement
    const ex = el && el.closest && el.closest('[data-motion-exception]')
    const line = prop + ' su ' + describe(el)
    if (ex) {
      const tagged = line + ' (eccezione: ' + ex.dataset.motionException + ')'
      if (!report.warn.includes(tagged)) { report.warn.push(tagged); console.info('[lab] eccezione dichiarata:', tagged) }
    } else if (!report.ko.includes(line)) {
      report.ko.push(line)
      console.warn('[lab] fuori regola:', line)
    }
    paint()
  }

  document.addEventListener('transitionrun', (e) => check(e.propertyName, e.target), true)
  document.addEventListener('animationstart', (e) => {
    const a = e.target.getAnimations && e.target.getAnimations().find((x) => x.animationName === e.animationName)
    if (!a) return
    for (const kf of a.effect.getKeyframes()) for (const p of Object.keys(kf)) {
      if (!['offset', 'computedOffset', 'easing', 'composite'].includes(p)) check(p, e.target)
    }
  }, true)
  const nativeAnimate = Element.prototype.animate
  Element.prototype.animate = function (frames, opts) {
    const list = Array.isArray(frames) ? frames : [frames]
    for (const kf of list) for (const p of Object.keys(kf || {})) {
      if (!['offset', 'easing', 'composite'].includes(p)) check(p, this)
    }
    return nativeAnimate.call(this, frames, opts)
  }

  function effectiveOpacity(el) {
    let o = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity)
    return o
  }
  function countGlass() {
    let n = 0
    for (const el of document.querySelectorAll('[data-material]')) {
      const cs = getComputedStyle(el)
      const bf = cs.backdropFilter || cs.webkitBackdropFilter
      if (!bf || bf === 'none') continue
      if (cs.visibility !== 'visible' || !el.getClientRects().length) continue
      const r = el.getBoundingClientRect()
      if (r.bottom <= 0 || r.top >= innerHeight || r.width === 0 || r.height === 0) continue
      if (effectiveOpacity(el) <= 0.01) continue
      n++
    }
    report.glassNow = n
    if (n > report.glassMax) {
      report.glassMax = n
      if (n > 3) console.warn('[lab] vetro oltre il budget:', n)
    }
    paint()
  }

  let badge = null
  function paint() {
    if (!badge) return
    const ko = report.ko.length
    const warn = report.warn.length
    const g = `vetro ${report.glassNow}/3 · max ${report.glassMax}`
    badge.innerHTML =
      `<span class="${ko ? 'ko' : ''}">${ko ? '✗ ' + ko + ' fuori regola: ' + report.ko[ko - 1] : '✓ solo transform/opacità'}</span>` +
      (warn ? `<span class="warn">eccezioni: ${warn}</span>` : '') +
      `<span class="${report.glassMax > 3 ? 'ko' : ''}">${g}</span>`
  }

  function init() {
    injectSprite()
    ensureRegion()
    badge = document.createElement('div')
    badge.className = 'lab-badge'
    badge.setAttribute('aria-hidden', 'true')
    document.body.appendChild(badge)
    paint()
    setInterval(countGlass, 120)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()

  window.Lab = { reduced, slow, dur, ease, spring, springValue, stop, flip, FLIP_MAX, toast, dismiss, offline, trap, openedByTouch, report }
})()
