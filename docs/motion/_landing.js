/* ============================================================================
   Laboratorio della landing: strumenti comuni alle demo L1–L5 (MOTION.md,
   Parte L). Si carica DOPO `_lab.js`.

   RIFERIMENTO ESEGUIBILE di `presentazione/js/movimento.ts` (⟂ C), non
   codice di produzione. Ci sono, con gli stessi nomi della specifica:
     - movimentoFermo(), alCambioDelMovimento(fn), impostaFermo(on)   §L3
     - la memoria di sessione `bvd_landing_visti`                      §L2.2
     - arma(): gli effetti «una volta» che si armano solo fuori vista  RL3, RL4
     - arbitro(): le notizie degli observer decise in un fotogramma    §L9.1
     - lo scroll: velocità e quiete senza leggere il layout            RL2
     - salta(): il salto istantaneo con il focus all'h2                §L9.2

   Parametri dell'URL, oltre a quelli di `_lab.js` (?reduce ?slow ?audit):
     ?fermo   accende «Ferma le animazioni» all'apertura
     ?nuova   svuota la memoria di sessione (rivedere gli effetti «una volta»)
              e la scelta «Ferma le animazioni» salvata nel dispositivo
   ============================================================================ */
(function () {
  'use strict'

  const root = document.documentElement
  const params = new URLSearchParams(location.search)
  const CHIAVE_FERMO = 'bvd_landing_fermo'
  const CHIAVE_VISTI = 'bvd_landing_visti'

  // -------------------------------------------------------------- Il fermo
  // Una funzione, un evento. `.rm` la mette `_lab.js` (prefers-reduced-motion
  // o ?reduce); `data-movimento="fermo"` è il comando della pagina. Nella
  // landing vera `.rm` è `matchMedia('(prefers-reduced-motion: reduce)')`.
  const movimentoFermo = () => root.classList.contains('rm') || root.dataset.movimento === 'fermo'
  const ascoltatori = new Set()
  let ultimo = null
  const avvisa = () => {
    const ora = movimentoFermo()
    if (ora === ultimo) return
    ultimo = ora
    for (const fn of ascoltatori) {
      try { fn(ora) } catch (e) { console.error(e) }
    }
  }
  new MutationObserver(avvisa).observe(root, { attributes: true, attributeFilter: ['class', 'data-movimento'] })
  function alCambioDelMovimento(fn) {
    ascoltatori.add(fn)
    return () => ascoltatori.delete(fn)
  }

  function leggi(store, k) { try { return window[store].getItem(k) } catch { return null } }
  function scrivi(store, k, v) { try { v == null ? window[store].removeItem(k) : window[store].setItem(k, v) } catch { /* in memoria */ } }

  /** Le tre istanze del comando cambiano insieme; lo stato vive sull'<html>. */
  function impostaFermo(on) {
    if (on) root.dataset.movimento = 'fermo'
    else delete root.dataset.movimento
    scrivi('localStorage', CHIAVE_FERMO, on ? '1' : null)
    sincronizzaComandi()
  }
  function sincronizzaComandi() {
    const sistema = root.classList.contains('rm') && root.dataset.movimento !== 'fermo'
    for (const b of document.querySelectorAll('[data-comando="fermo"]')) {
      b.setAttribute('aria-pressed', String(root.dataset.movimento === 'fermo'))
      // Movimento già ridotto dal sistema: il comando lo dice (UX §L7.13).
      if (sistema) b.setAttribute('aria-disabled', 'true')
      else b.removeAttribute('aria-disabled')
    }
  }
  // Nella landing vera questo lo fa `fermo.js`, classico e bloccante nel
  // <head>, PRIMA del primo disegno (ML15).
  if (params.has('nuova')) scrivi('localStorage', CHIAVE_FERMO, null)
  if (params.has('fermo') || leggi('localStorage', CHIAVE_FERMO) === '1') root.dataset.movimento = 'fermo'
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-comando="fermo"]')
    if (!b || b.getAttribute('aria-disabled') === 'true') return
    impostaFermo(root.dataset.movimento !== 'fermo')
  })
  alCambioDelMovimento(sincronizzaComandi)

  // ------------------------------------------------------------- Sessione
  if (params.has('nuova')) scrivi('sessionStorage', CHIAVE_VISTI, null)
  let visti = new Set()
  try { visti = new Set(JSON.parse(leggi('sessionStorage', CHIAVE_VISTI) || '[]')) } catch { /* prima visita */ }
  const visto = (k) => visti.has(k)
  function segna(k) {
    visti.add(k)
    scrivi('sessionStorage', CHIAVE_VISTI, JSON.stringify([...visti]))
  }

  // -------------------------------------------- Effetti «una volta» (RL3)
  // All'avvio l'elemento è nello stato FINALE (è l'HTML). Se la prima notizia
  // dell'observer dice «fuori vista» lo si ARMA (prepara): il cambio avviene
  // dove nessuno guarda. Poi scatta alla soglia. Un focus dentro un effetto
  // armato lo porta subito allo stato finale (RL4). «Chi arma, arma per
  // ultimo» (§L8): `prepara` si chiama solo con l'observer già in piedi.
  function arma(el, { chiave, soglia = 0.5, prepara, scatta, finale }) {
    const chiudi = () => { finale && finale() }
    if (!('IntersectionObserver' in window) || movimentoFermo() || visto(chiave)) return chiudi()
    let armato = false
    let primo = true
    const fine = (anima) => {
      io.disconnect()
      el.removeEventListener('focusin', alFocus)
      segna(chiave)
      el.removeAttribute('data-armato')
      if (anima && !movimentoFermo()) scatta()
      else chiudi()
    }
    const alFocus = () => { if (armato) fine(false) }
    const io = new IntersectionObserver((voci) => {
      const v = voci[voci.length - 1]
      if (primo) {
        primo = false
        if (v.isIntersecting) return fine(false)
        armato = true
        el.setAttribute('data-armato', '')
        el.addEventListener('focusin', alFocus)
        prepara && prepara()
        return
      }
      if (armato && v.intersectionRatio >= soglia) fine(true)
    }, { threshold: [0, soglia] })
    io.observe(el)
  }

  // ------------------------------------------------------------- Arbitro
  // Le notizie degli observer arrivano in callback separate: si raccolgono e
  // si decide UNA volta, nel fotogramma dopo, con lo stato di tutte (§L9.1).
  function arbitro(decidi) {
    let raf = 0
    return () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; decidi() })
    }
  }

  // --------------------------------------------------------------- Scroll
  // L'unico listener di scroll: passivo, legge scrollY e il timeStamp
  // dell'evento. Niente getBoundingClientRect (RL2).
  const scroll = { ultimo: -Infinity, y: scrollY, t: performance.now(), veloceDa: 0, programmatico: -Infinity, velocita: 0 }
  const allaVelocita = new Set()
  addEventListener('scroll', (e) => {
    const t = e.timeStamp || performance.now()
    const dy = Math.abs(scrollY - scroll.y)
    const dt = Math.max(1, t - scroll.t)
    scroll.velocita = (dy / dt) * 1000
    scroll.y = scrollY
    scroll.t = t
    if (t - scroll.programmatico < 300) { scroll.veloceDa = 0; return } // PROGRAMMATICO_MS
    scroll.ultimo = t
    if (scroll.velocita > 3000) { // VELOCE_PX_S
      if (!scroll.veloceDa) scroll.veloceDa = t
      else if (t - scroll.veloceDa >= 150) { scroll.veloceDa = 0; for (const fn of allaVelocita) fn() } // VELOCE_MS
    } else scroll.veloceDa = 0
  }, { passive: true })
  const quieto = (ms = 250) => performance.now() - scroll.ultimo >= ms // QUIETE_MS

  /** Salto istantaneo a una sezione, focus all'h2 a t0, history sostituita (§L9.2). */
  function salta(id) {
    const s = document.getElementById(id)
    if (!s) return
    scroll.programmatico = performance.now()
    s.scrollIntoView({ block: 'start', behavior: 'auto' })
    const h = s.querySelector('h1, h2')
    if (h) h.focus({ preventScroll: true })
    history.replaceState(null, '', '#' + id)
  }

  // ---------------------------------------------------- Pallo segnaposto
  // Due cerchi, la fascia arancio, occhi e bocca per umore. NON è Pallo: è
  // quanto basta per vedere il movimento (il disegno vero è lo snapshot).
  const OCCHI = {
    aperti: '<ellipse cx="46" cy="56" rx="5" ry="7"/><ellipse cx="74" cy="56" rx="5" ry="7"/>',
    occhiolino: '<ellipse cx="46" cy="56" rx="5" ry="7"/><path d="M68 57 Q74 51 80 57" fill="none" stroke-width="3.4" stroke-linecap="round"/>',
    chiusi: '<path d="M40 58 Q46 63 52 58M68 58 Q74 63 80 58" fill="none" stroke-width="3.4" stroke-linecap="round"/>',
    grandi: '<circle cx="46" cy="55" r="8"/><circle cx="74" cy="55" r="8"/>',
    occhiali: '<rect x="34" y="48" width="22" height="13" rx="5"/><rect x="64" y="48" width="22" height="13" rx="5"/><path d="M56 53h8" stroke-width="3"/>',
    su: '<ellipse cx="47" cy="51" rx="5" ry="6"/><ellipse cx="75" cy="51" rx="5" ry="6"/>',
  }
  const BOCCA = {
    sorriso: '<path d="M46 74 Q60 86 74 74" fill="none" stroke-width="3.6" stroke-linecap="round"/>',
    grande: '<path d="M44 72 Q60 92 76 72Z"/>',
    o: '<ellipse cx="60" cy="78" rx="6" ry="7"/>',
    piatta: '<path d="M50 78h20" stroke-width="3.6" stroke-linecap="round"/>',
    giu: '<path d="M48 82 Q60 72 72 82" fill="none" stroke-width="3.6" stroke-linecap="round"/>',
  }
  const UMORI = {
    saluta: ['aperti', 'sorriso'], contento: ['aperti', 'sorriso'], occhiolino: ['occhiolino', 'sorriso'],
    sorpreso: ['grandi', 'o'], dorme: ['chiusi', 'piatta'], cool: ['occhiali', 'sorriso'], festa: ['chiusi', 'grande'],
    esulta: ['aperti', 'grande'], pensa: ['su', 'piatta'], cuori: ['aperti', 'grande'], sbircia: ['su', 'sorriso'],
    triste: ['aperti', 'giu'], preoccupato: ['grandi', 'giu'],
  }
  function disegno(umore) {
    const [o, b] = UMORI[umore] || UMORI.saluta
    const zeta = umore === 'dorme'
      ? '<g fill="#1C1C1E"><text class="p-zeta" x="92" y="30" style="--i:0" font-size="14" font-weight="800">z</text><text class="p-zeta" x="100" y="22" style="--i:1" font-size="11" font-weight="800">z</text></g>'
      : ''
    return (
      '<ellipse cx="60" cy="122" rx="28" ry="4" fill="#1C1C1E" opacity=".12"/>' +
      '<g class="p-salta"><g class="p-tocco"><g class="p-corpo">' +
      '<circle cx="60" cy="62" r="50" fill="#FFFFFF" stroke="#1C1C1E" stroke-width="4"/>' +
      '<path d="M14 46 C38 30 84 30 106 46" fill="none" stroke="#FF6B1A" stroke-width="12"/>' +
      `<g fill="#1C1C1E" stroke="#1C1C1E">${OCCHI[o]}${BOCCA[b]}</g>` +
      '</g></g></g>' + zeta
    )
  }
  /** Un Pallo segnaposto: `<svg class="ls-pallo">`, largo `size` (alto × 130/120). */
  function pallo(umore = 'saluta', size = 64) {
    return `<svg class="ls-pallo" data-umore="${umore}" viewBox="0 0 120 130" width="${size}" height="${Math.round(size * 130 / 120)}" aria-hidden="true" focusable="false">${disegno(umore)}</svg>`
  }
  /** Cambio d'umore: il disegno si sostituisce nello stesso fotogramma, senza dissolvenza. */
  function umore(svg, u) {
    if (!svg || svg.dataset.umore === u) return
    svg.dataset.umore = u
    svg.innerHTML = disegno(u)
  }
  /** Il tocco: «boing», con i due nomi alternati che lo fanno ripartire. */
  function boing(svg) {
    if (!svg) return
    svg.dataset.tocco = svg.dataset.tocco === '0' ? '1' : '0'
  }

  // ---------------------------------------------------------- Icone in più
  const ICONE = {
    book: 'M5 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17zM5 17a2.5 2.5 0 0 1 2.5-2.5H17',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
    chart: 'M5 19V11M10 19V5M15 19v-6M20 19V8',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
    pause: 'M9 6v12M15 6v12',
    play: 'M8 5.5v13l10.5-6.5z',
    'arrow-up': 'M12 19V5M6 11l6-6 6 6',
    'chat-dots': 'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8zM9 10h.01M12 10h.01M15 10h.01',
    bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
    volley: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3c-2 3-2 6 0 9s2 6 0 9M3.5 9c3 .5 6 2 8.5 3s5.5 1.5 8.5 1',
  }
  function icone() {
    const sprite = document.getElementById('lab-sprite')
    if (!sprite) return
    const ns = 'http://www.w3.org/2000/svg'
    for (const [id, d] of Object.entries(ICONE)) {
      if (document.getElementById('i-' + id)) continue
      const s = document.createElementNS(ns, 'symbol')
      s.id = 'i-' + id
      s.setAttribute('viewBox', '0 0 24 24')
      const p = document.createElementNS(ns, 'path')
      p.setAttribute('d', d)
      s.appendChild(p)
      sprite.appendChild(s)
    }
  }

  function pronto(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn)
    else fn()
  }
  pronto(() => {
    icone()
    sincronizzaComandi()
    ultimo = movimentoFermo()
  })

  window.Landing = {
    movimentoFermo, alCambioDelMovimento, impostaFermo,
    visto, segna, arma, arbitro,
    scroll, quieto, allaVelocita, salta,
    pallo, umore, boing, pronto,
  }
})()
